'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { useMutation, useQueryClient, useMutationState } from '@tanstack/react-query';
import type { MealSlotInput } from '@/lib/schemas/userProfileSchema';

export interface SyncIntakePayload {
  userId: string;
  date: string;
  actualCaloriesConsumed: number;
  completedSlots: MealSlotInput['slot'][];
}

export async function patchMealIntakeRequest(payload: SyncIntakePayload): Promise<SyncIntakePayload> {
  const res = await fetch('/api/activity-log', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to sync caloric intake');
  }

  const json = await res.json();
  return json.data;
}

export function useSyncMealIntake(userId: string, date: string, allMeals: MealSlotInput[]) {
  const queryClient = useQueryClient();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      queryClient.resumePausedMutations();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queryClient]);

  const mutation = useMutation<SyncIntakePayload, Error, SyncIntakePayload>({
    mutationKey: ['syncMealIntake', userId, date],
    mutationFn: patchMealIntakeRequest,
    onMutate: async (newPayload) => {
      await queryClient.cancelQueries({ queryKey: ['dailyActivityLog', userId, date] });

      const previousLog = queryClient.getQueryData(['dailyActivityLog', userId, date]);

      queryClient.setQueryData(['dailyActivityLog', userId, date], (old: any) => ({
        ...old,
        actualCaloriesConsumed: newPayload.actualCaloriesConsumed,
        completedSlots: newPayload.completedSlots,
      }));

      return { previousLog };
    },
    onError: (_err, _variables, context: any) => {
      if (context?.previousLog) {
        queryClient.setQueryData(['dailyActivityLog', userId, date], context.previousLog);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyActivityLog', userId, date] });
    },
  });

  const pendingMutations = useMutationState({
    filters: { mutationKey: ['syncMealIntake', userId, date], status: 'pending' },
    select: (mut) => mut.state.isPaused,
  });
  const isQueuedOffline = pendingMutations.some(Boolean) || (!isOnline && mutation.isPending);

  const handleMealCompletionChange = useCallback(
    (completedSlots: MealSlotInput['slot'][]) => {
      const completedMeals = allMeals.filter((m) => completedSlots.includes(m.slot));
      const totalCalories = completedMeals.reduce((acc, m) => acc + m.calories, 0);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        mutation.mutate({
          userId,
          date,
          actualCaloriesConsumed: totalCalories,
          completedSlots,
        });
      }, 500);
    },
    [userId, date, allMeals, mutation]
  );

  return {
    handleMealCompletionChange,
    isSyncing: mutation.isPending && isOnline,
    isQueuedOffline,
    isOnline,
    error: mutation.error,
  };
}