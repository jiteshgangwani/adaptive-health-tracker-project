# Application Architecture

```mermaid
flowchart LR
    subgraph Browser["Browser modules"]
        Timeline["MealPlanTimeline component"]
        LocalStorage[("localStorage<br/>meal completion by user and date")]
        IntakeHook["useSyncMealIntake hook"]
        PlanHook["useAdaptPlan hook"]
        SwaggerUI["Swagger UI<br/>/api-docs"]
        Timeline --> LocalStorage
    end

    sub    

    subgraph Domain["Validation and domain logic"]
        UserSchemas["userProfileSchema.ts<br/>request validation"]
        WebhookSchemas["healthWebhookSchema.ts<br/>provider payload validation"]
        Nutrition["nutritionEngine.ts<br/>BMR, TDEE, nutrition plan"]
        Adaptation["adaptationRules.ts<br/>next-day plan and feedback"]
    end

    subgraph Persistence["Persistence"]
        NoDatabase["No server-side database configured"]
        IndexedDB["IndexedDB persister helper<br/>defined but not wired"]
    end

    IntakeHook -. "PATCH request when mounted" .-> ActivityRoute
    PlanHook -. "POST request when mounted" .-> AdaptRoute
    PlanHook -. "query URL has no handler" .-> MissingPlans
    SwaggerUI --> OpenAPIRoute

    ActivityRoute --> UserSchemas
    ActivityRoute --> ActivityResponse["Returns validated intake data<br/>without saving it"]
    AdaptRoute --> UserSchemas
    AdaptRoute --> Adaptation
    Nutrition --> Adaptation
    Adaptation --> AdaptResponse["Returns adapted plan and feedback"]
    WebhookRoute -->|"Production HMAC check"| WebhookSchemas
    WebhookSchemas --> Normalize["Normalize vendor activity data"]
    Normalize --> WebhookResponse["Returns canonical record<br/>without saving it"]

    ActivityResponse -.-> NoDatabase
    AdaptResponse -.-> NoDatabase
    WebhookResponse -.-> NoDatabase
```

## Current State

- The API validates and computes responses, but no route writes customer profiles, plans, intake, or wearable activity to a server-side database.
- Meal completion checkboxes are stored in browser `localStorage`, keyed by user ID and date. This is device- and browser-local.
- An IndexedDB persister helper exists in `lib/queryClient.ts`, but it has no call sites. The TanStack Query hooks and `MealPlanTimeline` also have no page or provider currently mounting them.
- `useAdaptPlan` requests `GET /api/plans`, but no such route exists. Its `POST /api/adapt-plan` path is implemented.
- The nutrition and adaptation engines are pure calculation modules. The health-sync webhook validates and normalizes vendor payloads; it does not persist them.