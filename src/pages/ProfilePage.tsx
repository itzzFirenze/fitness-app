import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Scale,
  Ruler,
  Activity,
  Flame,
  Target,
  Check,
  Sparkles,
  Info,
} from 'lucide-react';
import { useBodyMetrics, computeBodyStats } from '../hooks/useBodyMetrics';
import type { BodyMetrics } from '../hooks/useBodyMetrics';
import './ProfilePage.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { metrics, saveMetrics, saving } = useBodyMetrics();

  // Local form state
  const [weight, setWeight] = useState<string>('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft_in'>('cm');
  const [heightCm, setHeightCm] = useState<string>('');
  const [heightFeet, setHeightFeet] = useState<string>('');
  const [heightInches, setHeightInches] = useState<string>('');
  const [targetWeight, setTargetWeight] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [activityLevel, setActivityLevel] = useState<
    'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  >('moderate');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Initialize form with stored metrics
  useEffect(() => {
    if (metrics.weight) setWeight(String(metrics.weight));
    setWeightUnit(metrics.weightUnit || 'kg');
    setHeightUnit(metrics.heightUnit || 'cm');
    if (metrics.height) setHeightCm(String(metrics.height));
    if (metrics.heightFeet) setHeightFeet(String(metrics.heightFeet));
    if (metrics.heightInches) setHeightInches(String(metrics.heightInches));
    if (metrics.targetWeight) setTargetWeight(String(metrics.targetWeight));
    if (metrics.age) setAge(String(metrics.age));
    if (metrics.gender) setGender(metrics.gender);
    if (metrics.activityLevel) setActivityLevel(metrics.activityLevel);
  }, [metrics]);

  // Compute preview stats in real-time from the active inputs
  const previewMetrics: BodyMetrics = {
    weight: weight ? parseFloat(weight) : null,
    weightUnit,
    height: heightCm ? parseFloat(heightCm) : null,
    heightUnit,
    heightFeet: heightFeet ? parseInt(heightFeet) : null,
    heightInches: heightInches ? parseInt(heightInches) : null,
    targetWeight: targetWeight ? parseFloat(targetWeight) : null,
    age: age ? parseInt(age) : null,
    gender,
    activityLevel,
  };

  const previewStats = computeBodyStats(previewMetrics);

  const handleWeightUnitToggle = (unit: 'kg' | 'lbs') => {
    if (unit === weightUnit) return;
    if (weight) {
      const val = parseFloat(weight);
      if (!isNaN(val)) {
        if (unit === 'lbs') {
          // kg to lbs
          setWeight((val * 2.20462).toFixed(1));
        } else {
          // lbs to kg
          setWeight((val / 2.20462).toFixed(1));
        }
      }
    }
    if (targetWeight) {
      const tVal = parseFloat(targetWeight);
      if (!isNaN(tVal)) {
        if (unit === 'lbs') {
          setTargetWeight((tVal * 2.20462).toFixed(1));
        } else {
          setTargetWeight((tVal / 2.20462).toFixed(1));
        }
      }
    }
    setWeightUnit(unit);
  };

  const handleHeightUnitToggle = (unit: 'cm' | 'ft_in') => {
    if (unit === heightUnit) return;
    if (unit === 'ft_in' && heightCm) {
      const cm = parseFloat(heightCm);
      if (!isNaN(cm) && cm > 0) {
        const totalInches = cm / 2.54;
        const ft = Math.floor(totalInches / 12);
        const inch = Math.round(totalInches % 12);
        setHeightFeet(String(ft));
        setHeightInches(String(inch));
      }
    } else if (unit === 'cm' && (heightFeet || heightInches)) {
      const ft = parseInt(heightFeet) || 0;
      const inch = parseInt(heightInches) || 0;
      const totalInches = ft * 12 + inch;
      if (totalInches > 0) {
        setHeightCm(String(Math.round(totalInches * 2.54)));
      }
    }
    setHeightUnit(unit);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveMetrics(previewMetrics);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="app">
      <div className="profile-page">
        {/* Navigation */}
        <div className="profile-page__nav">
          <button className="profile-page__back" onClick={() => navigate('/')}>
            <ChevronLeft size={18} strokeWidth={2.2} />
            Back
          </button>
          <span className="profile-page__badge">Athlete Stats</span>
        </div>

        {/* Header */}
        <header className="profile-page__header">
          <h1 className="profile-page__title">Body Profile & Metrics</h1>
          <p className="profile-page__subtitle">
            Enter your weight, height, and body details to calculate your BMI,
            metabolism, and calorie targets.
          </p>
        </header>

        {/* 2x2 Overview cards (shows computed live stats) */}
        <div className="profile-stats-grid">
          <div className="profile-stat-card">
            <div className="profile-stat-card__icon profile-stat-card__icon--weight">
              <Scale size={18} strokeWidth={2.2} />
            </div>
            <div>
              <span className="profile-stat-card__value">
                {weight ? `${weight} ${weightUnit}` : '—'}
              </span>
              <span className="profile-stat-card__label">Current Weight</span>
            </div>
          </div>

          <div className="profile-stat-card">
            <div className="profile-stat-card__icon profile-stat-card__icon--height">
              <Ruler size={18} strokeWidth={2.2} />
            </div>
            <div>
              <span className="profile-stat-card__value">
                {heightUnit === 'cm'
                  ? heightCm
                    ? `${heightCm} cm`
                    : '—'
                  : heightFeet
                  ? `${heightFeet}'${heightInches || '0'}"`
                  : '—'}
              </span>
              <span className="profile-stat-card__label">Height</span>
            </div>
          </div>

          <div className="profile-stat-card">
            <div className="profile-stat-card__icon profile-stat-card__icon--bmi">
              <Activity size={18} strokeWidth={2.2} />
            </div>
            <div>
              <div className="profile-stat-card__bmi-row">
                <span className="profile-stat-card__value">
                  {previewStats.bmi ? previewStats.bmi : '—'}
                </span>
                {previewStats.bmiCategory && (
                  <span
                    className="profile-stat-card__tag"
                    style={{
                      color: previewStats.bmiColor,
                      borderColor: previewStats.bmiColor,
                    }}
                  >
                    {previewStats.bmiCategory}
                  </span>
                )}
              </div>
              <span className="profile-stat-card__label">Body Mass Index</span>
            </div>
          </div>

          <div className="profile-stat-card">
            <div className="profile-stat-card__icon profile-stat-card__icon--tdee">
              <Flame size={18} strokeWidth={2.2} />
            </div>
            <div>
              <span className="profile-stat-card__value">
                {previewStats.tdee ? `~${previewStats.tdee.toLocaleString()}` : '—'}
              </span>
              <span className="profile-stat-card__label">Daily TDEE (kcal)</span>
            </div>
          </div>
        </div>

        {/* Form container */}
        <form onSubmit={handleSave} className="profile-form">
          {/* Section: Weight & Target */}
          <div className="profile-section">
            <div className="profile-section__header">
              <Scale size={16} className="profile-section__icon" />
              <h2 className="profile-section__title">Weight Information</h2>
            </div>

            <div className="profile-field-group">
              <div className="profile-field">
                <div className="profile-field__top">
                  <label htmlFor="user-weight">Current Weight</label>
                  <div className="profile-unit-toggle">
                    <button
                      type="button"
                      className={`profile-unit-btn ${weightUnit === 'kg' ? 'active' : ''}`}
                      onClick={() => handleWeightUnitToggle('kg')}
                    >
                      kg
                    </button>
                    <button
                      type="button"
                      className={`profile-unit-btn ${weightUnit === 'lbs' ? 'active' : ''}`}
                      onClick={() => handleWeightUnitToggle('lbs')}
                    >
                      lbs
                    </button>
                  </div>
                </div>
                <div className="profile-input-wrapper">
                  <input
                    id="user-weight"
                    type="number"
                    step="0.1"
                    min="20"
                    max="500"
                    placeholder="e.g. 75.0"
                    value={weight}
                    onChange={e => setWeight(e.target.value)}
                    required
                  />
                  <span className="profile-input-affix">{weightUnit}</span>
                </div>
              </div>

              <div className="profile-field">
                <div className="profile-field__top">
                  <label htmlFor="user-target-weight">Goal Target Weight (Optional)</label>
                </div>
                <div className="profile-input-wrapper">
                  <input
                    id="user-target-weight"
                    type="number"
                    step="0.1"
                    min="20"
                    max="500"
                    placeholder="e.g. 70.0"
                    value={targetWeight}
                    onChange={e => setTargetWeight(e.target.value)}
                  />
                  <span className="profile-input-affix">{weightUnit}</span>
                </div>
                {previewStats.targetDiff !== null && (
                  <p className="profile-field__hint">
                    {previewStats.targetDiff < 0
                      ? `${Math.abs(previewStats.targetDiff)} ${weightUnit} to lose`
                      : previewStats.targetDiff > 0
                      ? `${previewStats.targetDiff} ${weightUnit} to gain`
                      : 'Target reached! 🎉'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section: Height & Body Details */}
          <div className="profile-section">
            <div className="profile-section__header">
              <Ruler size={16} className="profile-section__icon" />
              <h2 className="profile-section__title">Height & Body Stats</h2>
            </div>

            <div className="profile-field-group">
              <div className="profile-field">
                <div className="profile-field__top">
                  <label>Height</label>
                  <div className="profile-unit-toggle">
                    <button
                      type="button"
                      className={`profile-unit-btn ${heightUnit === 'cm' ? 'active' : ''}`}
                      onClick={() => handleHeightUnitToggle('cm')}
                    >
                      cm
                    </button>
                    <button
                      type="button"
                      className={`profile-unit-btn ${heightUnit === 'ft_in' ? 'active' : ''}`}
                      onClick={() => handleHeightUnitToggle('ft_in')}
                    >
                      ft / in
                    </button>
                  </div>
                </div>

                {heightUnit === 'cm' ? (
                  <div className="profile-input-wrapper">
                    <input
                      type="number"
                      step="0.5"
                      min="50"
                      max="280"
                      placeholder="e.g. 178"
                      value={heightCm}
                      onChange={e => setHeightCm(e.target.value)}
                      required
                    />
                    <span className="profile-input-affix">cm</span>
                  </div>
                ) : (
                  <div className="profile-dual-inputs">
                    <div className="profile-input-wrapper">
                      <input
                        type="number"
                        min="2"
                        max="8"
                        placeholder="5"
                        value={heightFeet}
                        onChange={e => setHeightFeet(e.target.value)}
                        required
                      />
                      <span className="profile-input-affix">ft</span>
                    </div>
                    <div className="profile-input-wrapper">
                      <input
                        type="number"
                        min="0"
                        max="11"
                        placeholder="10"
                        value={heightInches}
                        onChange={e => setHeightInches(e.target.value)}
                      />
                      <span className="profile-input-affix">in</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="profile-field-row">
                <div className="profile-field">
                  <label htmlFor="user-age">Age</label>
                  <div className="profile-input-wrapper">
                    <input
                      id="user-age"
                      type="number"
                      min="10"
                      max="110"
                      placeholder="e.g. 25"
                      value={age}
                      onChange={e => setAge(e.target.value)}
                    />
                    <span className="profile-input-affix">yrs</span>
                  </div>
                </div>

                <div className="profile-field">
                  <label htmlFor="user-gender">Biological Sex</label>
                  <select
                    id="user-gender"
                    className="profile-select"
                    value={gender}
                    onChange={e => setGender(e.target.value as any)}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Activity Level */}
          <div className="profile-section">
            <div className="profile-section__header">
              <Activity size={16} className="profile-section__icon" />
              <h2 className="profile-section__title">Activity & Lifestyle</h2>
            </div>

            <div className="profile-activity-list">
              {[
                {
                  id: 'sedentary',
                  label: 'Sedentary',
                  desc: 'Desk job, little to no workout',
                },
                {
                  id: 'light',
                  label: 'Lightly Active',
                  desc: 'Workouts 1–3 days / week',
                },
                {
                  id: 'moderate',
                  label: 'Moderately Active',
                  desc: 'Workouts 3–5 days / week',
                },
                {
                  id: 'active',
                  label: 'Very Active',
                  desc: 'Hard workouts 6–7 days / week',
                },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  className={`profile-activity-item ${
                    activityLevel === opt.id ? 'active' : ''
                  }`}
                  onClick={() => setActivityLevel(opt.id as any)}
                >
                  <div className="profile-activity-radio">
                    {activityLevel === opt.id && <div className="profile-activity-dot" />}
                  </div>
                  <div className="profile-activity-text">
                    <span className="profile-activity-title">{opt.label}</span>
                    <span className="profile-activity-desc">{opt.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Live Insights / Advice card */}
          {previewStats.bmi !== null && (
            <div className="profile-insights-card">
              <div className="profile-insights-header">
                <Sparkles size={16} className="profile-insights-sparkle" />
                <span>Personalized Nutrition Guidance</span>
              </div>
              <div className="profile-insights-body">
                <div className="profile-insight-item">
                  <span className="profile-insight-label">Maintenance (TDEE)</span>
                  <span className="profile-insight-val">
                    ~{previewStats.tdee?.toLocaleString()} kcal/day
                  </span>
                </div>
                <div className="profile-insight-item">
                  <span className="profile-insight-label">Mild Deficit (Fat Loss)</span>
                  <span className="profile-insight-val profile-insight-val--loss">
                    ~{previewStats.tdee ? (previewStats.tdee - 400).toLocaleString() : '—'} kcal
                  </span>
                </div>
                <div className="profile-insight-item">
                  <span className="profile-insight-label">Lean Surplus (Muscle Gain)</span>
                  <span className="profile-insight-val profile-insight-val--gain">
                    ~{previewStats.tdee ? (previewStats.tdee + 300).toLocaleString() : '—'} kcal
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Submit button */}
          <div className="profile-actions">
            <button
              type="submit"
              className="profile-save-btn"
              disabled={saving}
            >
              {saving ? (
                'Saving...'
              ) : savedSuccess ? (
                <>
                  <Check size={18} strokeWidth={2.5} />
                  Metrics Saved!
                </>
              ) : (
                'Save Body Profile'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
