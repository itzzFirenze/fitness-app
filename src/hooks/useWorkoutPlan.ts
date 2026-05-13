import { useState, useEffect } from 'react';
import type { WeeklyPlan, WorkoutDay, Exercise } from '../types';
import { defaultWeeklyPlan } from '../data/defaultPlan';

const STORAGE_KEY = 'fitness-app-weekly-plan';

export function useWorkoutPlan() {
  const [plan, setPlan] = useState<WeeklyPlan>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : defaultWeeklyPlan;
    } catch {
      return defaultWeeklyPlan;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  }, [plan]);

  const updateDay = (dayIndex: number, updatedDay: WorkoutDay) => {
    setPlan(prev => prev.map((d, i) => (i === dayIndex ? updatedDay : d)));
  };

  const toggleDayComplete = (dayIndex: number) => {
    setPlan(prev =>
      prev.map((d, i) =>
        i === dayIndex ? { ...d, completed: !d.completed } : d
      )
    );
  };

  const addExercise = (dayIndex: number, exercise: Exercise) => {
    setPlan(prev =>
      prev.map((d, i) =>
        i === dayIndex
          ? { ...d, exercises: [...d.exercises, exercise] }
          : d
      )
    );
  };

  const removeExercise = (dayIndex: number, exerciseId: string) => {
    setPlan(prev =>
      prev.map((d, i) =>
        i === dayIndex
          ? { ...d, exercises: d.exercises.filter(e => e.id !== exerciseId) }
          : d
      )
    );
  };

  const updateExercise = (dayIndex: number, updatedExercise: Exercise) => {
    setPlan(prev =>
      prev.map((d, i) =>
        i === dayIndex
          ? {
              ...d,
              exercises: d.exercises.map(e =>
                e.id === updatedExercise.id ? updatedExercise : e
              ),
            }
          : d
      )
    );
  };

  const resetPlan = () => {
    setPlan(defaultWeeklyPlan);
  };

  const weeklyProgress = plan.filter(
    d => d.muscleGroup !== 'Rest' && d.completed
  ).length;
  const totalWorkoutDays = plan.filter(d => d.muscleGroup !== 'Rest').length;

  return {
    plan,
    updateDay,
    toggleDayComplete,
    addExercise,
    removeExercise,
    updateExercise,
    resetPlan,
    weeklyProgress,
    totalWorkoutDays,
  };
}
