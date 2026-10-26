# User Profile & Activity Schemas

## User Profile Entity
```json
{
  "userId": "string (uuid)",
  "sex": "male | female",
  "age": "integer",
  "heightCm": "number",
  "weightKg": "number",
  "targetWeightKg": "number",
  "occupationType": "desk_sedentary | standing | active_labor",
  "healthConditions": ["string"],
  "dietaryRestrictions": ["vegetarian", "vegan", "keto", "gluten_free", "none"],
  "bmr": "number",
  "tdee": "number"
}
```

## Daily Activity Log Entity
```json
{
  "logId": "string (uuid)",
  "userId": "string (uuid)",
  "date": "YYYY-MM-DD",
  "stepsLogged": "integer",
  "sedentaryHours": "number",
  "activeWorkouts": [
    {
      "type": "walking | running | resistance_training | cycling | other",
      "durationMinutes": "integer",
      "estimatedBurnKcal": "number"
    }
  ],
  "totalBurnKcal": "number"
}
```

## Daily Meal Log & Plan Entity
```json
{
  "planId": "string (uuid)",
  "userId": "string (uuid)",
  "date": "YYYY-MM-DD",
  "targetCalories": "number",
  "targetProteinGrams": "number",
  "targetCarbsGrams": "number",
  "targetFatGrams": "number",
  "meals": [
    {
      "slot": "breakfast | lunch | dinner | snack",
      "suggestedItems": ["string"],
      "calories": "number",
      "macros": { "protein": "number", "carbs": "number", "fat": "number" },
      "isDeskJobOptimized": "boolean"
    }
  ]
}
```