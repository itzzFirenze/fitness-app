import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface BodyMetrics {
  weight: number | null;
  weightUnit: 'kg' | 'lbs';
  height: number | null; // In cm
  heightUnit: 'cm' | 'ft_in';
  heightFeet?: number | null;
  heightInches?: number | null;
  targetWeight?: number | null;
  age?: number | null;
  gender?: 'male' | 'female' | 'other';
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  lastUpdated?: string;
}

const DEFAULT_METRICS: BodyMetrics = {
  weight: null,
  weightUnit: 'kg',
  height: null,
  heightUnit: 'cm',
  heightFeet: null,
  heightInches: null,
  targetWeight: null,
  age: null,
  gender: 'male',
  activityLevel: 'moderate',
};

const STORAGE_KEY = 'apex_body_metrics';

export function useBodyMetrics() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<BodyMetrics>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {
      // fallback
    }
    return DEFAULT_METRICS;
  });
  const loading = false;
  const [saving, setSaving] = useState(false);

  // Sync from Supabase user_metadata if available
  useEffect(() => {
    if (!user) return;
    const remote = user.user_metadata?.body_metrics as BodyMetrics | undefined;
    if (remote) {
      setMetrics(remote);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
    }
  }, [user]);

  const saveMetrics = useCallback(async (updated: BodyMetrics) => {
    setSaving(true);
    const dataWithTime = {
      ...updated,
      lastUpdated: new Date().toISOString(),
    };

    setMetrics(dataWithTime);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataWithTime));

    try {
      await supabase.auth.updateUser({
        data: { body_metrics: dataWithTime },
      });
    } catch (err) {
      console.warn('Could not sync body metrics to Supabase:', err);
    } finally {
      setSaving(false);
    }
  }, []);

  // Compute stats helper
  const stats = computeBodyStats(metrics);

  return {
    metrics,
    stats,
    loading,
    saving,
    saveMetrics,
  };
}

export function computeBodyStats(m: BodyMetrics) {
  // Normalize weight to kg
  let weightKg: number | null = null;
  if (m.weight && m.weight > 0) {
    weightKg = m.weightUnit === 'lbs' ? m.weight * 0.45359237 : m.weight;
  }

  // Normalize height to cm
  let heightCm: number | null = null;
  if (m.heightUnit === 'cm' && m.height && m.height > 0) {
    heightCm = m.height;
  } else if (m.heightUnit === 'ft_in') {
    const feet = m.heightFeet || 0;
    const inches = m.heightInches || 0;
    const totalInches = feet * 12 + inches;
    if (totalInches > 0) {
      heightCm = totalInches * 2.54;
    }
  }

  // BMI
  let bmi: number | null = null;
  let bmiCategory: 'Underweight' | 'Normal' | 'Overweight' | 'Obese' | null = null;
  let bmiColor = 'var(--text-3)';

  if (weightKg && heightCm) {
    const heightM = heightCm / 100;
    bmi = Number((weightKg / (heightM * heightM)).toFixed(1));

    if (bmi < 18.5) {
      bmiCategory = 'Underweight';
      bmiColor = '#38bdf8'; // sky blue
    } else if (bmi < 25) {
      bmiCategory = 'Normal';
      bmiColor = '#4ade80'; // green
    } else if (bmi < 30) {
      bmiCategory = 'Overweight';
      bmiColor = '#fb923c'; // orange
    } else {
      bmiCategory = 'Obese';
      bmiColor = '#f87171'; // red
    }
  }

  // BMR (Mifflin-St Jeor formula)
  let bmr: number | null = null;
  if (weightKg && heightCm) {
    const age = m.age && m.age > 0 ? m.age : 25; // default 25
    if (m.gender === 'female') {
      bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
    } else {
      bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
    }
  }

  // TDEE (Maintenance Calories)
  let tdee: number | null = null;
  if (bmr) {
    const multipliers: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };
    const mult = multipliers[m.activityLevel || 'moderate'] || 1.55;
    tdee = Math.round(bmr * mult);
  }

  // Target difference
  let targetDiff: number | null = null;
  if (m.weight && m.targetWeight) {
    targetDiff = Number((m.targetWeight - m.weight).toFixed(1));
  }

  return {
    weightKg,
    heightCm,
    bmi,
    bmiCategory,
    bmiColor,
    bmr,
    tdee,
    targetDiff,
  };
}
