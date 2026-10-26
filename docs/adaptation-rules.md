# Next-Day Adaptive Feedback Loop

The system operates on an overnight batch job (or first daily login) that evaluates yesterday's delta between targets and actual logs.

## Input Metrics
- `Calories_Target` vs. `Calories_Actual`
- `Burn_Target` (NEAT + Exercise) vs. `Burn_Actual`
- `Net_Balance` = `Calories_Actual - Burn_Actual`

## Adjustment Policies

### Case A: Missed Activity Target (Desk Job Sedentary Over-run)
- **Condition:** Exercise burn was <70% of target; daily steps <4,000.
- **Adjustment:**
  - Do **not** trigger extreme caloric cuts (prevents binge-restrict cycles).
  - Reduce next day's carbohydrate allowance by 5–10% (max 100–150 kcal).
  - Add micro-movement assignments: prompt three 10-minute post-meal walks.

### Case B: Substantial Energy Expenditure Surplus
- **Condition:** Workout burn exceeded target by >300 kcal.
- **Adjustment:**
  - Increase next day's breakfast or pre-workout carbohydrates by 20–30 g to replenish glycogen and prevent fatigue.
  - Keep protein target stable.

### Case C: Calorie Under-Eating (Dangerous Deficit)
- **Condition:** User ate <80% of daily target floor.
- **Adjustment:**
  - Rebalance next day's meals with higher nutrient density (e.g., avocados, nuts, seed oils) rather than larger food volume.
  - Warn against excessive deficits.

### Case D: Consistent Compliance (On-Track)
- **Condition:** Variance within $\pm 10\%$ of energy targets.
- **Adjustment:** Maintain current plan structure; introduce meal variety recommendations.