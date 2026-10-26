'use client';

import React, { useState, useEffect } from 'react';
import type { MealSlotInput } from '@/lib/schemas/userProfileSchema';

interface MealPlanTimelineProps {
  userId: string;
  date: string;
  meals: MealSlotInput[];
  onCompletionChange?: (completedSlots: MealSlotInput['slot'][]) => void;
}

interface SlotMeta {
  label: string;
  timeWindow: string;
  iconBg: string;
  iconText: string;
  accentBorder: string;
}

const SLOT_CONFIG: Record<MealSlotInput['slot'], SlotMeta> = {
  breakfast: {
    label: 'Breakfast',
    timeWindow: '7:30 AM – 8:30 AM',
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-700',
    accentBorder: 'border-amber-200',
  },
  lunch: {
    label: 'Lunch',
    timeWindow: '12:30 PM – 1:30 PM',
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-700',
    accentBorder: 'border-emerald-200',
  },
  snack: {
    label: 'Afternoon Snack',
    timeWindow: '4:00 PM – 4:30 PM',
    iconBg: 'bg-sky-100',
    iconText: 'text-sky-700',
    accentBorder: 'border-sky-200',
  },
  dinner: {
    label: 'Dinner',
    timeWindow: '7:00 PM – 8:00 PM',
    iconBg: 'bg-indigo-100',
    iconText: 'text-indigo-700',
    accentBorder: 'border-indigo-200',
  },
};

const ORDERED_SLOTS: MealSlotInput['slot'][] = ['breakfast', 'lunch', 'snack', 'dinner'];

export function MealPlanTimeline({
  userId,
  date,
  meals,
  onCompletionChange,
}: MealPlanTimelineProps) {
  const storageKey = `meal_completion_${userId}_${date}`;

  const [completedSlots, setCompletedSlots] = useState<Record<string, boolean>>({});
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setCompletedSlots(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to read meal plan completion from localStorage:', e);
    }
    setIsHydrated(true);
  }, [storageKey]);

  const toggleSlot = (slot: MealSlotInput['slot']) => {
    const updated = {
      ...completedSlots,
      [slot]: !completedSlots[slot],
    };

    setCompletedSlots(updated);

    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist meal plan completion to localStorage:', e);
    }

    if (onCompletionChange) {
      const finished = Object.entries(updated)
        .filter(([_, isDone]) => isDone)
        .map(([key]) => key as MealSlotInput['slot']);
      onCompletionChange(finished);
    }
  };

  const sortedMeals = [...meals].sort(
    (a, b) => ORDERED_SLOTS.indexOf(a.slot) - ORDERED_SLOTS.indexOf(b.slot)
  );

  const completedCount = sortedMeals.filter((m) => completedSlots[m.slot]).length;
  const progressPercent = sortedMeals.length > 0 
    ? Math.round((completedCount / sortedMeals.length) * 100) 
    : 0;

  return (
    <section aria-label="Daily Meal Plan Schedule" className="w-full max-w-4xl mx-auto py-6">
      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Today's Intake Progress</h3>
            <p className="text-xs text-slate-500">
              {completedCount} of {sortedMeals.length} meals logged ({date})
            </p>
          </div>
          <span className="text-sm font-bold text-slate-800">{progressPercent}%</span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-emerald-500 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="relative pl-6 md:pl-10 space-y-6 before:absolute before:left-3 md:before:left-5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
        {sortedMeals.map((meal) => {
          const isDone = isHydrated && Boolean(completedSlots[meal.slot]);
          const meta = SLOT_CONFIG[meal.slot] ?? {
            label: meal.slot,
            timeWindow: 'Flexible',
            iconBg: 'bg-slate-100',
            iconText: 'text-slate-700',
            accentBorder: 'border-slate-200',
          };

          return (
            <article
              key={meal.slot}
              className={`relative rounded-xl border p-5 shadow-sm transition-all duration-200 ${
                isDone
                  ? 'border-slate-200 bg-slate-50/70 opacity-80'
                  : `bg-white hover:shadow-md ${meta.accentBorder}`
              }`}
            >
              <span
                className={`absolute -left-[31px] md:-left-[47px] top-6 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white ring-2 ring-slate-200 transition-colors ${
                  isDone ? 'bg-emerald-600 text-white' : `${meta.iconBg} ${meta.iconText}`
                }`}
                aria-hidden="true"
              >
                {isDone ? (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <span className="h-2 w-2 rounded-full bg-current" />
                )}
              </span>

              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <label className="relative flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={() => toggleSlot(meal.slot)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 transition cursor-pointer"
                      aria-label={`Mark ${meta.label} as consumed`}
                    />
                  </label>
                  <span
                    className={`rounded-md px-2.5 py-0.5 text-xs font-semibold ${
                      isDone ? 'bg-slate-200 text-slate-600 line-through' : `${meta.iconBg} ${meta.iconText}`
                    }`}
                  >
                    {meta.label}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    {meta.timeWindow}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {meal.isDeskJobOptimized && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-800">
                      Desk-Job Optimized
                    </span>
                  )}
                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold tracking-tight transition-colors ${
                      isDone ? 'bg-slate-400 text-white' : 'bg-slate-900 text-white'
                    }`}
                  >
                    {meal.calories} kcal
                  </span>
                </div>
              </div>

              <div className="mt-3.5">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Recommended Options
                </p>
                <ul className="mt-2 space-y-1.5">
                  {meal.suggestedItems.map((item, idx) => (
                    <li
                      key={idx}
                      className={`flex items-start text-sm transition-colors ${
                        isDone ? 'text-slate-400 line-through' : 'text-slate-700'
                      }`}
                    >
                      <span className={`mr-2 font-bold ${isDone ? 'text-slate-300' : 'text-emerald-600'}`}>✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <footer className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                <div className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium ${isDone ? 'bg-slate-100 text-slate-500 opacity-70' : 'bg-blue-50 text-blue-800'}`}>
                  Protein: <span className="font-bold">{meal.macros.protein}g</span>
                </div>
                <div className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium ${isDone ? 'bg-slate-100 text-slate-500 opacity-70' : 'bg-amber-50 text-amber-800'}`}>
                  Carbs: <span className="font-bold">{meal.macros.carbs}g</span>
                </div>
                <div className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium ${isDone ? 'bg-slate-100 text-slate-500 opacity-70' : 'bg-purple-50 text-purple-800'}`}>
                  Fat: <span className="font-bold">{meal.macros.fat}g</span>
                </div>
              </footer>
            </article>
          );
        })}
      </div>
    </section>
  );
}