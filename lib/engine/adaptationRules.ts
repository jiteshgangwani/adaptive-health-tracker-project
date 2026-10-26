import {
  Sex,
  OccupationType,
  CALORIC_FLOORS,
  MACRO_ENERGY,
} from './nutritionEngine';

export interface ActiveWorkout {
  type: 'walking' | 'running' | 'resistance_training' | 'cycling' | 'other';
  durationMinutes: number;
  estimatedBurnKcal: number;
}

export interface DailyActivityLog {
  logId: string;
  userId: string;
  date: string;
  stepsLogged: number;
  sedentaryHours: number;
  activeWorkouts: ActiveWorkout[];
  totalBurnKcal: number;
  actualCaloriesConsumed: number;
}

export interface MealSlot {
  slot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  suggestedItems: string[];
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  isDeskJobOptimized: boolean;
}

export interface DailyMealPlan {
  planId: string;
  userId: string;
  date: string;
  targetCalories: number;
  targetProteinGrams: number;
  targetCarbsGrams: number;
  targetFatGrams: number;
  expectedBurnKcal: number;
  meals: MealSlot[];
}

export interface AdaptationContextUser {
  userId: string;
  sex: Sex;
  weightKg: number;
  occupationType: OccupationType;
}

export interface AdaptationFeedback {
  appliedRules: Array<'MISSED_ACTIVITY' | 'WORKOUT_SURPLUS' | 'SEVERE_UNDEREATING' | 'ON_TRACK'>;
  warnings: string[];
  actionablePrompts: string[];
}

export interface AdaptedNextDayPlan {
  plan: DailyMealPlan;
  feedback: AdaptationFeedback;
}

function distributeMeals(
  totalCalories: number,
  protein: number,
  carbs: number,
  fat: number,
  isDeskJob: boolean,
  highDensitySnack: boolean = false
): MealSlot[] {
  const proportions: Record<'breakfast' | 'lunch' | 'dinner' | 'snack', number> = {
    breakfast: 0.25,
    lunch: 0.35,
    dinner: 0.3,
    snack: 0.1,
  };

  const slots: Array<'breakfast' | 'lunch' | 'dinner' | 'snack'> = ['breakfast', 'lunch', 'dinner', 'snack'];

  return slots.map((slot) => {
    const ratio = proportions[slot];
    const slotCalories = Math.round(totalCalories * ratio);
    const slotProtein = Math.round(protein * ratio);
    const slotCarbs = Math.round(carbs * ratio);
    const slotFat = Math.round(fat * ratio);

    let suggestedItems: string[];
    if (slot === 'snack' && highDensitySnack) {
      suggestedItems = ['Almonds / Walnuts (25g)', 'Avocado slices with sea salt', 'Flaxseed Greek yogurt'];
    } else if (slot === 'lunch' && isDeskJob) {
      suggestedItems = ['Leafy green salad with grilled chicken & olive oil', 'Low-GI quinoa bowl with steamed salmon'];
    } else if (slot === 'breakfast') {
      suggestedItems = ['Egg white & whole egg scramble with spinach', 'Rolled oats with chia seeds'];
    } else if (slot === 'lunch') {
      suggestedItems = ['Turkey breast wrap with leafy greens', 'Lentil soup with mixed vegetables'];
    } else if (slot === 'dinner') {
      suggestedItems = ['Baked cod or tofu with roasted broccoli', 'Lean beef stir-fry with zucchini'];
    } else {
      suggestedItems = ['Cottage cheese with berries', 'Raw almonds and sliced cucumber'];
    }

    return {
      slot,
      suggestedItems,
      calories: slotCalories,
      macros: {
        protein: slotProtein,
        carbs: slotCarbs,
        fat: slotFat,
      },
      isDeskJobOptimized: isDeskJob && (slot === 'lunch' || slot === 'snack'),
    };
  });
}

export function computeNextDayPlan(
  currentPlan: DailyMealPlan,
  actualLog: DailyActivityLog,
  user: AdaptationContextUser,
  nextDayDate: string
): AdaptedNextDayPlan {
  const warnings: string[] = [];
  const prompts: string[] = [];
  const appliedRules: AdaptationFeedback['appliedRules'] = [];

  let nextCalories = currentPlan.targetCalories;
  let nextProtein = currentPlan.targetProteinGrams;
  let nextCarbs = currentPlan.targetCarbsGrams;
  let nextFat = currentPlan.targetFatGrams;

  let highDensitySnackRequired = false;

  const burnTarget = currentPlan.expectedBurnKcal > 0 ? currentPlan.expectedBurnKcal : 300;
  const isDeskWorker = user.occupationType === 'desk_sedentary';
  const missedActivity = actualLog.totalBurnKcal < burnTarget * 0.7 || (isDeskWorker && actualLog.stepsLogged < 4000);
  const workoutSurplus = actualLog.totalBurnKcal > burnTarget + 300;

  if (missedActivity) {
    appliedRules.push('MISSED_ACTIVITY');

    const rawCarbCutGrams = Math.round(nextCarbs * 0.08);
    const maxCarbCutGrams = Math.floor(120 / MACRO_ENERGY.CARBS_KCAL_PER_G);
    const effectiveCarbCut = Math.min(rawCarbCutGrams, maxCarbCutGrams);

    nextCarbs -= effectiveCarbCut;
    prompts.push('Inactivity detected: Take three 10-minute brisk walks after meals today.');
    if (isDeskWorker) {
      prompts.push('Set a recurring 60-minute desk timer for a 2-minute standing/stretch break.');
    }
  } else if (workoutSurplus) {
    appliedRules.push('WORKOUT_SURPLUS');
    nextCarbs += 25;
    prompts.push('High expenditure yesterday: Added 25g complex carbs to replenish glycogen and support recovery.');
  }

  const safeFloor = CALORIC_FLOORS[user.sex];
  const severeUnderEatingThreshold = safeFloor * 0.8;

  if (actualLog.actualCaloriesConsumed < severeUnderEatingThreshold) {
    appliedRules.push('SEVERE_UNDEREATING');
    highDensitySnackRequired = true;
    warnings.push(
      `Extreme deficit detected (${actualLog.actualCaloriesConsumed} kcal logged). Calorie restriction below safety limits suppresses metabolic rate and causes lean mass loss.`
    );
    prompts.push('Shifted snacks to calorie-dense sources (avocado, nuts) to hit your nutritional floor comfortably.');
  }

  if (appliedRules.length === 0) {
    appliedRules.push('ON_TRACK');
    prompts.push('Nutrition and activity were well-balanced yesterday. Maintaining current protocol.');
  }

  const recalculatedCalories =
    currentPlan.targetCalories +
    (nextProtein - currentPlan.targetProteinGrams) * MACRO_ENERGY.PROTEIN_KCAL_PER_G +
    (nextCarbs - currentPlan.targetCarbsGrams) * MACRO_ENERGY.CARBS_KCAL_PER_G +
    (nextFat - currentPlan.targetFatGrams) * MACRO_ENERGY.FAT_KCAL_PER_G;

  if (recalculatedCalories < safeFloor) {
    const deficitKcal = safeFloor - recalculatedCalories;
    const additionalCarbs = Math.ceil(deficitKcal / MACRO_ENERGY.CARBS_KCAL_PER_G);
    nextCarbs += additionalCarbs;
    nextCalories = safeFloor;
    warnings.push(`Plan adjusted to prevent dropping below the ${safeFloor} kcal floor for ${user.sex}.`);
  } else {
    nextCalories = recalculatedCalories;
  }

  const meals = distributeMeals(
    nextCalories,
    nextProtein,
    nextCarbs,
    nextFat,
    isDeskWorker,
    highDensitySnackRequired
  );

  return {
    plan: {
      planId: `plan_${nextDayDate}_${user.userId}`,
      userId: user.userId,
      date: nextDayDate,
      targetCalories: nextCalories,
      targetProteinGrams: nextProtein,
      targetCarbsGrams: nextCarbs,
      targetFatGrams: nextFat,
      expectedBurnKcal: currentPlan.expectedBurnKcal,
      meals,
    },
    feedback: {
      appliedRules,
      warnings,
      actionablePrompts: prompts,
    },
  };
}