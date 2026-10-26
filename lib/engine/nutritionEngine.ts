export type Sex = 'male' | 'female';

export type OccupationType = 'desk_sedentary' | 'standing' | 'active_labor';

export type StructuredActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';

export interface UserBiometrics {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg?: number;
  occupationType: OccupationType;
  activityLevel?: StructuredActivityLevel;
}

export interface MacroBreakdown {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

export interface NutritionPlan {
  bmr: number;
  tdee: number;
  deficitCalories: number;
  targetCalories: number;
  isFloored: boolean;
  macros: MacroBreakdown;
  deskJobGuidance?: {
    hourlyStepPrompt: number;
    recommendedMealDistribution: string;
  };
}

export const CALORIC_FLOORS: Record<Sex, number> = {
  male: 1500,
  female: 1200,
};

export const MACRO_ENERGY = {
  PROTEIN_KCAL_PER_G: 4,
  CARBS_KCAL_PER_G: 4,
  FAT_KCAL_PER_G: 9,
} as const;

/**
 * Calculates Basal Metabolic Rate (BMR) via the Mifflin-St Jeor equation.
 */
export function calculateBMR(biometrics: Pick<UserBiometrics, 'sex' | 'age' | 'heightCm' | 'weightKg'>): number {
  const { sex, age, heightCm, weightKg } = biometrics;

  if (age <= 0 || heightCm <= 0 || weightKg <= 0) {
    throw new Error('Biometric inputs (age, height, weight) must be positive values.');
  }

  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const bmr = sex === 'male' ? base + 5 : base - 161;
  return Math.round(bmr);
}

/**
 * Determines Total Daily Energy Expenditure (TDEE).
 */
export function calculateTDEE(bmr: number, occupation: OccupationType, activity: StructuredActivityLevel = 'sedentary'): number {
  let multiplier = 1.2;

  if (occupation === 'active_labor') {
    multiplier = 1.5;
  } else if (occupation === 'standing') {
    multiplier = 1.35;
  }

  if (activity === 'lightly_active') multiplier = Math.max(multiplier, 1.375);
  else if (activity === 'moderately_active') multiplier = Math.max(multiplier, 1.55);
  else if (activity === 'very_active') multiplier = Math.max(multiplier, 1.725);

  return Math.round(bmr * multiplier);
}

/**
 * Calculates a complete weight loss nutrition plan with macros and desk worker protections.
 */
export function generateNutritionPlan(user: UserBiometrics, targetDeficitRate: number = 0.20): NutritionPlan {
  const bmr = calculateBMR(user);
  const tdee = calculateTDEE(bmr, user.occupationType, user.activityLevel);

  const rawTarget = Math.round(tdee * (1 - targetDeficitRate));
  const floor = CALORIC_FLOORS[user.sex];
  const isFloored = rawTarget < floor;
  const targetCalories = Math.max(rawTarget, floor);
  const deficitCalories = tdee - targetCalories;

  const proteinGrams = Math.round(user.weightKg * 2.0);
  const proteinKcal = proteinGrams * MACRO_ENERGY.PROTEIN_KCAL_PER_G;

  const fatKcal = targetCalories * 0.25;
  const fatGrams = Math.round(fatKcal / MACRO_ENERGY.FAT_KCAL_PER_G);

  const remainingKcal = targetCalories - (proteinKcal + (fatGrams * MACRO_ENERGY.FAT_KCAL_PER_G));
  const carbsGrams = Math.max(0, Math.round(remainingKcal / MACRO_ENERGY.CARBS_KCAL_PER_G));

  const plan: NutritionPlan = {
    bmr,
    tdee,
    deficitCalories,
    targetCalories,
    isFloored,
    macros: {
      calories: targetCalories,
      proteinGrams,
      carbsGrams,
      fatGrams,
    },
  };

  if (user.occupationType === 'desk_sedentary') {
    plan.deskJobGuidance = {
      hourlyStepPrompt: 250,
      recommendedMealDistribution: 'Lower-glycemic lunch with protein emphasis to prevent postprandial desk lethargy.',
    };
  }

  return plan;
}