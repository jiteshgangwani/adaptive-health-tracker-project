# Adaptive Health & Nutrition Tracker

Adaptive Health & Nutrition Tracker is a Next.js and TypeScript project for calculating evidence-based nutrition targets and adjusting a meal plan based on recent activity. It uses the Mifflin-St Jeor equation for BMR, supports activity and occupation profiles, and includes server routes for plan adaptation, meal-intake updates, and health-platform webhooks.

> **Project status:** The homepage provides a responsive nutrition and movement dashboard with editable profile inputs and local meal/step tracking. Nutrition targets use the calculation engine; activity-driven plan adaptation is available through the API but is not yet connected to the dashboard. There is no server-side database, so dashboard data stays in browser storage and API requests are not saved.

## Features

- **Metabolic calculations:** Calculate basal metabolic rate (BMR) using Mifflin-St Jeor, then estimate total daily energy expenditure (TDEE) from occupation and activity level.
- **Nutrition targets:** Generate a calorie target and protein, carbohydrate, and fat targets. The nutrition engine defaults to a 20% deficit and applies minimum calorie floors of 1,500 kcal for men and 1,200 kcal for women.
- **Adaptive plans:** Adjust next-day carbohydrate targets based on activity. Low activity can reduce carbohydrates; a high-burn day can add carbohydrates. The engine flags severe under-eating, suggests calorie-dense snacks, and preserves the minimum calorie floor.
- **Desk-job guidance:** Distinguish intentional workouts from low daily movement, with step and standing-break prompts for sedentary desk workers.
- **Runtime validation:** Validate user profiles, activity logs, adaptation requests, and webhook payloads with Zod schemas.
- **Health-platform normalization:** Accept Apple HealthKit or Health Connect payloads and map provider workout names into the app's canonical workout types.
- **API explorer:** Browse and try the REST endpoints through Swagger UI at `/api-docs`; the OpenAPI 3 document is served from `/api/openapi`.

## Example Calculation

For a 35-year-old man who is 180 cm tall and weighs 85 kg, the nutrition engine calculates a BMR of 1,805 kcal/day using Mifflin-St Jeor. For a sedentary desk-job profile, the baseline TDEE is 2,166 kcal/day. With the default 20% deficit, the example calorie target is 1,733 kcal/day, above the 1,500 kcal minimum floor.

The core functions are in [`lib/engine/nutritionEngine.ts`](lib/engine/nutritionEngine.ts) and can be used independently of the API routes.

## Run Locally

Requirements: Node.js and npm. Install dependencies and start the development server:

```bash
npm install --legacy-peer-deps
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the dashboard, or [http://localhost:3000/api-docs](http://localhost:3000/api-docs) to explore the API.

Useful commands:

```bash
npm test -- --run  # run the Vitest suite once
npm run build      # create a production build
npm start          # serve a production build
```

## REST API

All routes accept and return JSON unless noted. Interactive schemas and example requests are available in Swagger UI.

| Method | Path | Purpose |
| --- | --- | --- |
| `PATCH` | `/api/activity-log` | Validate and return meal-intake progress. This route currently does not persist it. |
| `POST` | `/api/adapt-plan` | Validate current plan, activity log, and user context, then calculate the next-day plan. |
| `POST` | `/api/webhooks/health-sync` | Validate and normalize an Apple HealthKit or Health Connect activity payload. |
| `GET` | `/api/openapi` | Return the OpenAPI 3 specification used by Swagger UI. |

### Adapt a Plan

The `currentPlan`, `actualLog`, and `user` objects must all refer to the same UUID. The response contains the adapted plan and feedback describing applied rules, warnings, and suggested actions.

```bash
curl -X POST http://localhost:3000/api/adapt-plan \
	-H "Content-Type: application/json" \
	-d '{
		"currentPlan": {
			"planId": "plan_2026-10-26_user",
			"userId": "123e4567-e89b-12d3-a456-426614174000",
			"date": "2026-10-26",
			"targetCalories": 2000,
			"targetProteinGrams": 150,
			"targetCarbsGrams": 200,
			"targetFatGrams": 67,
			"expectedBurnKcal": 400,
			"meals": []
		},
		"actualLog": {
			"logId": "223e4567-e89b-12d3-a456-426614174000",
			"userId": "123e4567-e89b-12d3-a456-426614174000",
			"date": "2026-10-26",
			"stepsLogged": 7500,
			"sedentaryHours": 7,
			"activeWorkouts": [],
			"totalBurnKcal": 380,
			"actualCaloriesConsumed": 1950
		},
		"user": {
			"userId": "123e4567-e89b-12d3-a456-426614174000",
			"sex": "male",
			"weightKg": 85,
			"occupationType": "desk_sedentary"
		},
		"nextDayDate": "2026-10-27"
	}'
```

### Update Meal Intake

This endpoint accepts a user UUID, date, consumed calories, and completed meal slots. It responds with the validated values and an `updatedAt` timestamp; it does not write them to a database.

```bash
curl -X PATCH http://localhost:3000/api/activity-log \
	-H "Content-Type: application/json" \
	-d '{
		"userId": "123e4567-e89b-12d3-a456-426614174000",
		"date": "2026-10-26",
		"actualCaloriesConsumed": 1980,
		"completedSlots": ["breakfast", "lunch", "dinner"]
	}'
```

### Sync Health Activity

The webhook accepts either `apple_healthkit` fields (`stepCount`, `activeEnergyBurnedKcal`, `workouts`) or `health_connect` fields (`steps`, `totalCaloriesBurned`, `sessions`). For example:

```bash
curl -X POST http://localhost:3000/api/webhooks/health-sync \
	-H "Content-Type: application/json" \
	-d '{
		"provider": "health_connect",
		"userId": "123e4567-e89b-12d3-a456-426614174000",
		"date": "2026-10-26",
		"steps": 7500,
		"totalCaloriesBurned": 380,
		"sedentaryDurationHours": 7,
		"sessions": []
	}'
```

In production, set `HEALTH_SYNC_WEBHOOK_SECRET` and send an `x-health-signature` header containing the lowercase hexadecimal HMAC-SHA256 signature of the raw request body. The local development handler does not enforce this signature.

### Validation and Errors

- `400`: malformed JSON on the adaptation and health-sync routes.
- `401`: missing or invalid health webhook signature in production.
- `422`: request does not match its Zod schema.
- `500`: unexpected server error.

## Adaptation Rules

The adaptation engine compares the activity log with the plan's expected burn and considers desk-worker step counts:

- **Low activity:** Burn below 70% of expected, or fewer than 4,000 steps for a desk worker, reduces next-day carbohydrates by 8%, capped at 30 g. It also suggests three 10-minute post-meal walks and, for desk workers, hourly standing breaks.
- **High expenditure:** Burn more than 300 kcal above expected adds 25 g of carbohydrates for recovery.
- **Severe under-eating:** Intake below 80% of the sex-specific calorie floor triggers a warning and calorie-dense snack recommendations.
- **Safety floor:** Adapted plans do not go below 1,500 kcal for men or 1,200 kcal for women.

These are software calculations, not medical advice. Nutrition targets should be reviewed with a qualified health professional, particularly for people with health conditions or other individual needs.

## Data and Persistence

- The dashboard stores the editable profile and daily checked meal slots and step count in browser `localStorage`. This is local to that browser and device.
- API handlers currently validate, calculate, normalize, and return data; they do not save profiles, meal plans, intake, or activity records to a server database.
- An IndexedDB persister helper exists in `lib/queryClient.ts`, but it is not currently wired into a provider or app page.
- `useAdaptPlan` includes a request to `GET /api/plans`, but that API route has not been implemented.

## Project Structure

```text
app/
	page.tsx                 responsive nutrition and movement dashboard
	globals.css              dashboard styles
	api/
		activity-log/         PATCH meal-intake endpoint
		adapt-plan/           next-day plan calculation endpoint
		openapi/               OpenAPI JSON endpoint
		webhooks/health-sync/  health-provider webhook
	api-docs/                Swagger UI page
components/
	MealPlanTimeline.tsx     meal-completion timeline component
hooks/
	useAdaptPlan.ts          adaptation API/query hook
	useSyncMealIntake.ts     debounced intake-sync hook
lib/
	engine/                  nutrition and adaptation calculations
	schemas/                 Zod validation schemas
docs/                      domain and architecture notes
```

## Tests

Vitest tests cover nutrition calculations, caloric floors, and adaptation edge cases:

```bash
npm test -- --run
```