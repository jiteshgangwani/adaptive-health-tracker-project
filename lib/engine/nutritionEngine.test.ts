import { describe, it, expect } from 'vitest';
import {
  calculateBMR,
  calculateTDEE,
  generateNutritionPlan,
  CALORIC_FLOORS,
  UserBiometrics,
} from './nutritionEngine';

describe('nutritionEngine', () => {
  describe('calculateBMR', () => {
    it('calculates BMR accurately for an adult male', () => {
      const bmr = calculateBMR({
        sex: 'male',
        weightKg: 80,
        heightCm: 180,
        age: 30,
      });
      expect(bmr).toBe(1780);
    });

    it('calculates BMR accurately for an adult female', () => {
      const bmr = calculateBMR({
        sex: 'female',
        weightKg: 60,
        heightCm: 165,
        age: 28,
      });
      expect(bmr).toBe(1330);
    });

    it('throws when invalid zero or negative measurements are supplied', () => {
      expect(() =>
        calculateBMR({ sex: 'female', weightKg: -50, heightCm: 160, age: 25 })
      ).toThrow();
    });
  });

  describe('calculateTDEE', () => {
    it('applies the 1.2x sedentary multiplier for desk workers without extra activity', () => {
      const bmr = 1500;
      const tdee = calculateTDEE(bmr, 'desk_sedentary', 'sedentary');
      expect(tdee).toBe(1800);
    });

    it('scales appropriately when a desk worker supplements with moderate workouts', () => {
      const bmr = 1500;
      const tdee = calculateTDEE(bmr, 'desk_sedentary', 'moderately_active');
      expect(tdee).toBe(2325);
    });
  });

  describe('generateNutritionPlan', () => {
    it('correctly creates an unconstrained 20% deficit plan for a moderate-weight male', () => {
      const user: UserBiometrics = {
        sex: 'male',
        age: 32,
        heightCm: 182,
        weightKg: 85,
        occupationType: 'standing',
      };

      const plan = generateNutritionPlan(user, 0.20);
      expect(plan.isFloored).toBe(false);
      expect(plan.targetCalories).toBeGreaterThan(CALORIC_FLOORS.male);
      expect(plan.macros.proteinGrams).toBe(170);
      expect(plan.macros.calories).toBe(plan.targetCalories);
    });

    it('enforces the 1,200 kcal floor on a petite sedentary female desk worker', () => {
      const user: UserBiometrics = {
        sex: 'female',
        age: 45,
        heightCm: 152,
        weightKg: 50,
        occupationType: 'desk_sedentary',
      };

      const plan = generateNutritionPlan(user, 0.20);
      expect(plan.isFloored).toBe(true);
      expect(plan.targetCalories).toBe(1200);
      expect(plan.deskJobGuidance).toBeDefined();
      expect(plan.deskJobGuidance?.hourlyStepPrompt).toBe(250);
    });

    it('enforces the 1,500 kcal floor on a sedentary male edge case', () => {
      const user: UserBiometrics = {
        sex: 'male',
        age: 55,
        heightCm: 160,
        weightKg: 58,
        occupationType: 'desk_sedentary',
      };

      const plan = generateNutritionPlan(user, 0.20);
      expect(plan.isFloored).toBe(true);
      expect(plan.targetCalories).toBe(CALORIC_FLOORS.male);
      expect(plan.macros.proteinGrams).toBe(116);
    });
  });
});