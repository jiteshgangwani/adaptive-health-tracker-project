import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { IsoDateStringSchema } from '@/lib/schemas/userProfileSchema';

const PatchActivityLogSchema = z.object({
  userId: z.string().uuid({ message: 'userId must be a valid UUID' }),
  date: IsoDateStringSchema,
  actualCaloriesConsumed: z
    .number()
    .min(0, 'Consumed calories cannot be negative')
    .max(10000, 'Consumed calories cannot exceed 10,000 kcal'),
  completedSlots: z.array(z.enum(['breakfast', 'lunch', 'dinner', 'snack'])),
});

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const result = PatchActivityLogSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid payload', issues: result.error.flatten() },
        { status: 422 }
      );
    }

    const { userId, date, actualCaloriesConsumed, completedSlots } = result.data;

    return NextResponse.json(
      {
        success: true,
        data: {
          userId,
          date,
          actualCaloriesConsumed,
          completedSlots,
          updatedAt: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error updating intake' },
      { status: 500 }
    );
  }
}