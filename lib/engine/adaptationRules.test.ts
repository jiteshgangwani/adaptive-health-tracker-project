import { describe, it, expect } from 'vitest';
import {
  computeNextDayPlan,
  DailyMealPlan,
  DailyActivityLog,
  AdaptationContextUser,
} from './adaptationRules';
import { CALORIC_FLOORS } from './nutritionEngine';

describe('adaptationRules - computeNextDayPlan', () => {
  const baseMaleUser: AdaptationContextUser = {
    userId: 'user_123',
    sex: 'male',
    weightKg: 85,
    occupationType: 'desk_sedentary',
  };

  const baseFemaleUser: AdaptationContextUser = {
    userId: 'user_456',
    sex: 'female',
    weightKg: 58,
    occupationType: 'desk_sedentary',
  };

  const basePlan: DailyMealPlan = {
    planId: 'plan_day_1',
    userId: 'user_123',
    date: '2026-10-25',
    targetCalories: 2000,
    targetProteinGrams: 170,
    targetCarbsGrams: 200,
    targetFatGrams: 58,
    expectedBurnKcal: 400,
    meals: [],
  };

  it('triggers MISSED_ACTIVITY and reduces carbs when a desk worker logs <4,000 steps', () => {
    const activityLog: DailyActivityLog = {
      logId: 'log_1',
      userId: 'user_123',
      date: '2026-10-25',
      stepsLogged: 2400,
      sedentaryHours: 9.5,
      activeWorkouts: [],
      totalBurnKcal: 150,
      actualCaloriesConsumed: 1980,
    };

    const result = computeNextDayPlan(basePlan, activityLog, baseMaleUser, '2026-10-26');

    expect(result.feedback.appliedRules).toContain('MISSED_ACTIVITY');
    expect(result.plan.targetCarbsGrams).toBe(184);
    expect(result.plan.targetCalories).toBeLessThan(basePlan.targetCalories);
    expect(result.feedback.actionablePrompts.some((p) => p.includes('10-minute brisk walks'))).toBe(true);
    expect(result.feedback.actionablePrompts.some((p) => p.includes('desk timer'))).toBe(true);
  });

  it('caps the carb reduction at 120 kcal (30g) when prior carb baseline is very high', () => {
    const highCarbPlan: DailyMealPlan = {
      ...basePlan,
      targetCarbsGrams: 450,
    };

    const activityLog: DailyActivityLog = {
      logId: 'log_2',
      userId: 'user_123',
      date: '2026-10-25',
      stepsLogged: 1500,
      sedentaryHours: 10,
      activeWorkouts: [],
      totalBurnKcal: 100,
      actualCaloriesConsumed: 2100,
    };

    const result = computeNextDayPlan(highCarbPlan, activityLog, baseMaleUser, '2026-10-26');

    expect(result.feedback.appliedRules).toContain('MISSED_ACTIVITY');
    expect(result.plan.targetCarbsGrams).toBe(420);
  });

  it('triggers WORKOUT_SURPLUS and adds 25g carbs after high-burn days', () => {
    const activityLog: DailyActivityLog = {
      logId: 'log_3',
      userId: 'user_123',
      date: '2026-10-25',
      stepsLogged: 12000,
      sedentaryHours: 5,
      activeWorkouts: [
        { type: 'running', durationMinutes: 60, estimatedBurnKcal: 750 },
      ],
      totalBurnKcal: 750,
      actualCaloriesConsumed: 2050,
    };

    const result = computeNextDayPlan(basePlan, activityLog, baseMaleUser, '2026-10-26');

    expect(result.feedback.appliedRules).toContain('WORKOUT_SURPLUS');
    expect(result.plan.targetCarbsGrams).toBe(basePlan.targetCarbsGrams + 25);
    expect(result.plan.targetProteinGrams).toBe(basePlan.targetProteinGrams);
  });

  it('detects SEVERE_UNDEREATING below 80% of floor and flags nutrient-dense snack recommendations', () => {
    const activityLog: DailyActivityLog = {
      logId: 'log_4',
      userId: 'user_123',
      date: '2026-10-25',
      stepsLogged: 6000,
      sedentaryHours: 7,
      activeWorkouts: [],
      totalBurnKcal: 350,
      actualCaloriesConsumed: 950,
    };

    const result = computeNextDayPlan(basePlan, activityLog, baseMaleUser, '2026-10-26');

    expect(result.feedback.appliedRules).toContain('SEVERE_UNDEREATING');
    expect(result.feedback.warnings.some((w) => w.includes('Extreme deficit detected'))).toBe(true);

    const snackMeal = result.plan.meals.find((m) => m.slot === 'snack');
    expect(snackMeal?.suggestedItems.some((item) => item.includes('Almonds') || item.includes('Avocado'))).toBe(true);
  });

  it('never permits next-day plan to drop below sex caloric floor (1,200 kcal female)', () => {
    const tightFemalePlan: DailyMealPlan = {
      planId: 'plan_female_1',
      userId: 'user_456',
      date: '2026-10-25',
      targetCalories: 1220,
      targetProteinGrams: 116,
      targetCarbsGrams: 90,
      targetFatGrams: 44,
      expectedBurnKcal: 300,
      meals: [],
    };

    const activityLog: DailyActivityLog = {
      logId: 'log_5',
      userId: 'user_456',
      date: '2026-10-25',
      stepsLogged: 2000,
      sedentaryHours: 11,
      activeWorkouts: [],
      totalBurnKcal: 100,
      actualCaloriesConsumed: 1200,
    };

    const result = computeNextDayPlan(tightFemalePlan, activityLog, baseFemaleUser, '2026-10-26');

    expect(result.feedback.appliedRules).toContain('MISSED_ACTIVITY');
    expect(result.plan.targetCalories).toBe(CALORIC_FLOORS.female);
    expect(result.feedback.warnings.some((w) => w.includes('1200 kcal floor for female'))).toBe(true);
  });

  it('marks state as ON_TRACK when variance is normal and targets are satisfied', () => {
    const activityLog: DailyActivityLog = {
      logId: 'log_6',
      userId: 'user_123',
      date: '2026-10-25',
      stepsLogged: 7500,
      sedentaryHours: 7,
      activeWorkouts: [
        { type: 'walking', durationMinutes: 40, estimatedBurnKcal: 380 },
      ],
      totalBurnKcal: 380,
      actualCaloriesConsumed: 1950,
    };

    const result = computeNextDayPlan(basePlan, activityLog, baseMaleUser, '2026-10-26');

    expect(result.feedback.appliedRules).toEqual(['ON_TRACK']);
    expect(result.feedback.warnings).toHaveLength(0);
    expect(result.plan.targetCalories).toBe(basePlan.targetCalories);
  });
});