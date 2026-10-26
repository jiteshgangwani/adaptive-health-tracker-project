import { z } from 'zod';
import { IsoDateStringSchema, WorkoutTypeSchema } from '@/lib/schemas/userProfileSchema';

export function mapVendorWorkoutType(vendorType: string): z.infer<typeof WorkoutTypeSchema> {
  const normalized = vendorType.toLowerCase();

  if (normalized.includes('walk') || normalized.includes('hiking')) return 'walking';
  if (normalized.includes('run') || normalized.includes('jogging')) return 'running';
  if (normalized.includes('cycle') || normalized.includes('biking')) return 'cycling';
  if (
    normalized.includes('traditionalstrengthtraining') ||
    normalized.includes('functionalstrengthtraining') ||
    normalized.includes('weightlifting') ||
    normalized.includes('strength')
  ) {
    return 'resistance_training';
  }
  return 'other';
}

const AppleWorkoutRecordSchema = z.object({
  uuid: z.string(),
  workoutActivityType: z.string(),
  duration: z.number().min(0),
  totalEnergyBurned: z.number().min(0).optional(),
  startDate: z.string(),
  endDate: z.string(),
});

const HealthConnectSessionSchema = z.object({
  id: z.string(),
  exerciseType: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  durationMinutes: z.number().min(0).optional(),
  caloriesBurned: z.number().min(0).optional(),
});

export const HealthSyncWebhookPayloadSchema = z.discriminatedUnion('provider', [
  z.object({
    provider: z.literal('apple_healthkit'),
    userId: z.string().uuid(),
    date: IsoDateStringSchema,
    stepCount: z.number().int().min(0).max(100_000),
    activeEnergyBurnedKcal: z.number().min(0).max(10_000),
    sedentaryHours: z.number().min(0).max(24).optional().default(8),
    workouts: z.array(AppleWorkoutRecordSchema).default([]),
  }),
  z.object({
    provider: z.literal('health_connect'),
    userId: z.string().uuid(),
    date: IsoDateStringSchema,
    steps: z.number().int().min(0).max(100_000),
    totalCaloriesBurned: z.number().min(0).max(10_000),
    sedentaryDurationHours: z.number().min(0).max(24).optional().default(8),
    sessions: z.array(HealthConnectSessionSchema).default([]),
  }),
]);

export type HealthSyncWebhookPayload = z.infer<typeof HealthSyncWebhookPayloadSchema>;