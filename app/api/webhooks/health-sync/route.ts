import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  HealthSyncWebhookPayloadSchema,
  mapVendorWorkoutType,
} from '@/lib/schemas/healthWebhookSchema';
import type { ActiveWorkoutInput, DailyActivityLogInput } from '@/lib/schemas/userProfileSchema';

const WEBHOOK_SECRET = process.env.HEALTH_SYNC_WEBHOOK_SECRET || 'dev-webhook-secret-key-32chars';

function verifyHmacSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;

  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signatureHeader),
    Buffer.from(expectedSignature)
  );
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('x-health-signature');

    if (process.env.NODE_ENV === 'production' && !verifyHmacSignature(rawBody, signatureHeader)) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid webhook signature' },
        { status: 401 }
      );
    }

    let jsonBody: unknown;
    try {
      jsonBody = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
    }

    const parseResult = HealthSyncWebhookPayloadSchema.safeParse(jsonBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parseResult.error.flatten() },
        { status: 422 }
      );
    }

    const data = parseResult.data;
    let normalizedWorkouts: ActiveWorkoutInput[] = [];
    let stepsLogged = 0;
    let totalBurnKcal = 0;
    let sedentaryHours = 8;

    if (data.provider === 'apple_healthkit') {
      stepsLogged = data.stepCount;
      totalBurnKcal = Math.round(data.activeEnergyBurnedKcal);
      sedentaryHours = data.sedentaryHours;

      normalizedWorkouts = data.workouts.map((w) => ({
        type: mapVendorWorkoutType(w.workoutActivityType),
        durationMinutes: Math.round(w.duration / 60),
        estimatedBurnKcal: Math.round(w.totalEnergyBurned ?? 0),
      }));
    } else {
      stepsLogged = data.steps;
      totalBurnKcal = Math.round(data.totalCaloriesBurned);
      sedentaryHours = data.sedentaryDurationHours;

      normalizedWorkouts = data.sessions.map((s) => {
        const durationFromTimes = s.startTime && s.endTime
          ? Math.round((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000)
          : 0;

        return {
          type: mapVendorWorkoutType(s.exerciseType),
          durationMinutes: s.durationMinutes ?? durationFromTimes,
          estimatedBurnKcal: Math.round(s.caloriesBurned ?? 0),
        };
      });
    }

    const canonicalActivityLog: Partial<DailyActivityLogInput> = {
      userId: data.userId,
      date: data.date,
      stepsLogged,
      sedentaryHours,
      activeWorkouts: normalizedWorkouts,
      totalBurnKcal,
    };

    return NextResponse.json(
      {
        success: true,
        message: `Successfully synchronized ${data.provider} data`,
        record: canonicalActivityLog,
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error processing health webhook' },
      { status: 500 }
    );
  }
}