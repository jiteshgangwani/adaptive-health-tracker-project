# Health & Adaptive Nutrition Tracker (Claude Instructions)

## Project Overview
An adaptive diet and activity tracking app designed for weight loss in men and women, featuring specific adaptations for desk-job sedentary workers and an automated closed-loop adjustment cycle that tunes daily meals based on the prior day's logged activity.

## Key Technical & Domain Rules
- **Evidence-Based Metrics Only:** Use the Mifflin-St Jeor formula for basal metabolic rate (BMR). Do not invent baseline caloric calculations.
- **Minimum Safe Floor:** Never output meal plans below 1,500 kcal/day for adult men or 1,200 kcal/day for adult women under any adaptation scenario.
- **Desk-Job Baseline:** Differentiate intentional exercise from Non-Exercise Activity Thermogenesis (NEAT). Desk-worker presets must include micro-movement targets (step goals, standing breaks) separate from gym/cardio logs.
- **Safety Disclaimers:** All diet suggestions must carry medical disclaimers; flag extreme weight loss requests (>1 kg/week) as unsafe.

## Development & Testing Conventions
- Keep business logic (calories, macros, adaptation algorithms) decoupled from presentation components.
- Unit test all edge cases in `adaptation-rules.md` (e.g., severe under-eating, double-workout days, desk-job inactivity plateaus).
- Validate all incoming user payloads against schemas defined in `docs/user-profile-schema.md`.