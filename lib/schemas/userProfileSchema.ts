import { z } from 'zod';

export const SexSchema = z.enum(['male', 'female'], {
  message: "Sex must be either 'male' or 'female'",
});

export const OccupationTypeSchema = z.enum(['desk_sedentary', 'standing', 'active_labor'], {
  message: "Occupation must be 'desk_sedentary', 'standing', or 'active_labor'",
});

export const StructuredActivityLevelSchema = z.enum([
  'sedentary',
  'lightly_active',
  'moderately_active',
  'very_active',
]);

export const WorkoutTypeSchema = z.enum([
  'walking',
  'running',
  'resistance_training',
  'cycling',
  'other',
]);

export const MealSlotNameSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);

export const DietaryRestrictionSchema = z.enum([
  'vegetarian',
  'vegan',
  'keto',
  'gluten_free',
  'none',
]);

export const IsoDateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must strictly follow YYYY-MM-DD format')
  .refine((dateStr) => {
    const parsed = new Date(dateStr);
    return !isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === dateStr;
  }, { message: 'Date value must represent a valid calendar date' });

const UserProfileBaseSchema = z.object({
    userId: z.string().uuid({ message: 'userId must be a valid UUID' }),
    sex: SexSchema,
    age: z
      .number()
      .int('Age must be an integer')
      .min(18, 'Age must be at least 18 years')
      .max(100, 'Age cannot exceed 100 years'),
    heightCm: z
      .number()
      .min(120, 'Height must be at least 120 cm')
      .max(250, 'Height cannot exceed 250 cm'),
    weightKg: z
      .number()
      .min(35, 'Weight must be at least 35 kg')
      .max(300, 'Weight cannot exceed 300 kg'),
    targetWeightKg: z
      .number()
      .min(35, 'Target weight must be at least 35 kg')
      .max(300, 'Target weight cannot exceed 300 kg')
      .optional(),
    occupationType: OccupationTypeSchema,
    activityLevel: StructuredActivityLevelSchema.default('sedentary'),
    healthConditions: z.array(z.string().trim().min(1)).default([]),
    dietaryRestrictions: z.array(DietaryRestrictionSchema).default(['none']),
    bmr: z.number().positive('BMR must be positive').optional(),
    tdee: z.number().positive('TDEE must be positive').optional(),
  });

export const UserProfileSchema = UserProfileBaseSchema.refine(
    (data) => {
      if (data.targetWeightKg !== undefined) {
        return data.targetWeightKg <= data.weightKg;
      }
      return true;
    },
    {
      message: 'targetWeightKg should be less than or equal to current weight for weight-loss plans',
      path: ['targetWeightKg'],
    }
  );

export const AdaptationContextUserSchema = UserProfileBaseSchema.pick({
  userId: true,
  sex: true,
  weightKg: true,
  occupationType: true,
});

export const ActiveWorkoutSchema = z.object({
  type: WorkoutTypeSchema,
  durationMinutes: z
    .number()
    .int('Duration must be an integer')
    .min(1, 'Duration must be at least 1 minute')
    .max(360, 'Single workout duration cannot exceed 360 minutes (6 hours)'),
  estimatedBurnKcal: z
    .number()
    .min(0, 'Burn cannot be negative')
    .max(3000, 'Workout burn cannot exceed 3,000 kcal'),
});

export const DailyActivityLogSchema = z.object({
  logId: z.string().uuid({ message: 'logId must be a valid UUID' }),
  userId: z.string().uuid({ message: 'userId must be a valid UUID' }),
  date: IsoDateStringSchema,
  stepsLogged: z
    .number()
    .int('Steps must be an integer')
    .min(0, 'Steps cannot be negative')
    .max(100_000, 'Steps cannot exceed 100,000 in a single day'),
  sedentaryHours: z
    .number()
    .min(0, 'Sedentary hours cannot be negative')
    .max(24, 'Sedentary hours cannot exceed 24 hours per day'),
  activeWorkouts: z.array(ActiveWorkoutSchema).default([]),
  totalBurnKcal: z
    .number()
    .min(0, 'Burn cannot be negative')
    .max(6000, 'Total daily exercise burn cannot exceed 6,000 kcal'),
  actualCaloriesConsumed: z
    .number()
    .min(0, 'Consumed calories cannot be negative')
    .max(10000, 'Daily consumed calories cannot exceed 10,000 kcal'),
});

export const MealSlotSchema = z.object({
  slot: MealSlotNameSchema,
  suggestedItems: z
    .array(z.string().trim().min(1, 'Item description cannot be empty'))
    .min(1, 'At least one suggested item must be present'),
  calories: z.number().int().min(0, 'Calories cannot be negative'),
  macros: z.object({
    protein: z.number().min(0, 'Protein cannot be negative'),
    carbs: z.number().min(0, 'Carbs cannot be negative'),
    fat: z.number().min(0, 'Fat cannot be negative'),
  }),
  isDeskJobOptimized: z.boolean(),
});

export const DailyMealPlanSchema = z.object({
  planId: z.string().min(1, 'planId is required'),
  userId: z.string().uuid({ message: 'userId must be a valid UUID' }),
  date: IsoDateStringSchema,
  targetCalories: z.number().int().min(1000, 'Target calories cannot be under 1,000 kcal'),
  targetProteinGrams: z.number().min(40, 'Target protein must be at least 40g'),
  targetCarbsGrams: z.number().min(0, 'Target carbs cannot be negative'),
  targetFatGrams: z.number().min(15, 'Target fat must be at least 15g'),
  expectedBurnKcal: z.number().min(0, 'Expected burn cannot be negative'),
  meals: z.array(MealSlotSchema),
});

export const ComputeNextDayPlanInputSchema = z.object({
  currentPlan: DailyMealPlanSchema,
  actualLog: DailyActivityLogSchema,
  user: AdaptationContextUserSchema,
  nextDayDate: IsoDateStringSchema,
}).refine(
  (data) => data.currentPlan.userId === data.actualLog.userId && data.actualLog.userId === data.user.userId,
  {
    message: 'userId must match across currentPlan, actualLog, and user parameters',
    path: ['actualLog', 'userId'],
  }
);

export type UserProfileInput = z.infer<typeof UserProfileSchema>;
export type AdaptationContextUserInput = z.infer<typeof AdaptationContextUserSchema>;
export type ActiveWorkoutInput = z.infer<typeof ActiveWorkoutSchema>;
export type DailyActivityLogInput = z.infer<typeof DailyActivityLogSchema>;
export type MealSlotInput = z.infer<typeof MealSlotSchema>;
export type DailyMealPlanInput = z.infer<typeof DailyMealPlanSchema>;
export type ComputeNextDayPlanInput = z.infer<typeof ComputeNextDayPlanInputSchema>;