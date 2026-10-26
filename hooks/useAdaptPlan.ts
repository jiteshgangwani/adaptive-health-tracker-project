'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ComputeNextDayPlanInput,
} from '@/lib/schemas/userProfileSchema';
import type { AdaptedNextDayPlan } from '@/lib/engine/adaptationRules';

interface ApiResponseSuccess {
  success: true;
  data: AdaptedNextDayPlan;
}

interface ApiResponseError {
  error: string;
  issues?: {
    formErrors: string[];
    fieldErrors: Record<string, string[]>;
  };
}

async function postAdaptPlan(payload: ComputeNextDayPlanInput): Promise<AdaptedNextDayPlan> {
  const response = await fetch('/api/adapt-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const json: ApiResponseSuccess | ApiResponseError = await response.json();

  if (!response.ok || !('success' in json)) {
    const errorDetails = 'issues' in json && json.issues
      ? Object.entries(json.issues.fieldErrors)
          .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
          .join('; ')
      : ('error' in json ? json.error : 'Failed to adapt plan');
    throw new Error(errorDetails);
  }

  return json.data;
}

export function useAdaptPlan(userId: string, targetDate: string) {
  const queryClient = useQueryClient();
  const queryKey = ['dailyMealPlan', userId, targetDate];

  const planQuery = useQuery<AdaptedNextDayPlan | null, Error>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/plans?userId=${encodeURIComponent(userId)}&date=${encodeURIComponent(targetDate)}`);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Could not fetch existing plan');
      }
      return res.json();
    },
    enabled: Boolean(userId && targetDate),
    staleTime: 1000 * 60 * 15,
  });

  const adaptationMutation = useMutation<
    AdaptedNextDayPlan,
    Error,
    ComputeNextDayPlanInput,
    { previousPlan?: AdaptedNextDayPlan | null }
  >({
    mutationFn: postAdaptPlan,
    onMutate: async (newPayload) => {
      await queryClient.cancelQueries({ queryKey });

      const previousPlan = queryClient.getQueryData<AdaptedNextDayPlan | null>(queryKey);

      const optimisticPlan: AdaptedNextDayPlan = {
        plan: {
          ...newPayload.currentPlan,
          planId: `optimistic_${newPayload.nextDayDate}`,
          date: newPayload.nextDayDate,
          targetCalories: newPayload.currentPlan.targetCalories,
          targetProteinGrams: newPayload.currentPlan.targetProteinGrams,
          targetCarbsGrams: newPayload.currentPlan.targetCarbsGrams,
          targetFatGrams: newPayload.currentPlan.targetFatGrams,
        },
        feedback: {
          appliedRules: ['ON_TRACK'],
          warnings: [],
          actionablePrompts: ['Recalculating plan based on latest activity...'],
        },
      };

      queryClient.setQueryData(queryKey, optimisticPlan);
      return { previousPlan };
    },
    onError: (_err, _newPayload, context) => {
      if (context?.previousPlan !== undefined) {
        queryClient.setQueryData(queryKey, context.previousPlan);
      }
    },
    onSuccess: (serverResult) => {
      queryClient.setQueryData(queryKey, serverResult);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyMealPlan', userId] });
    },
  });

  return {
    plan: planQuery.data?.plan ?? null,
    feedback: planQuery.data?.feedback ?? null,
    isLoading: planQuery.isLoading,
    isAdapting: adaptationMutation.isPending,
    error: adaptationMutation.error ?? planQuery.error,
    adaptPlan: adaptationMutation.mutate,
    adaptPlanAsync: adaptationMutation.mutateAsync,
  };
}