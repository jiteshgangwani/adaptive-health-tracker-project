import { NextRequest, NextResponse } from 'next/server';
import { ComputeNextDayPlanInputSchema } from '@/lib/schemas/userProfileSchema';
import { computeNextDayPlan } from '@/lib/engine/adaptationRules';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const validationResult = ComputeNextDayPlanInputSchema.safeParse(rawBody);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          issues: validationResult.error.flatten(),
        },
        { status: 422 }
      );
    }

    const { currentPlan, actualLog, user, nextDayDate } = validationResult.data;
    const adaptedResult = computeNextDayPlan(currentPlan, actualLog, user, nextDayDate);

    return NextResponse.json(
      {
        success: true,
        data: adaptedResult,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
    }

    return NextResponse.json(
      {
        error: 'Internal server error processing adaptation plan',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}