import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Layers,
  Flame,
  Clock,
  Check,
  CheckCircle2,
  CalendarDays,
} from 'lucide-react';
import { useWorkoutHistory } from '../hooks/useWorkoutHistory';
import type { WorkoutDaySummary } from '../hooks/useWorkoutHistory';
import { MuscleGroupBadges } from '../components/MuscleGroupBadge';
import { muscleConfig } from '../components/MuscleGroupBadge';
import { getExerciseMuscleGroup } from '../types';
import type { MuscleGroup } from '../types';
import './CalendarPage.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatCalories(cal: number): string {
  if (cal >= 1000) return `~${(cal / 1000).toFixed(1)}k`;
  if (cal > 0) return `~${cal}`;
  return '0';
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<WorkoutDaySummary | null>(null);

  const { history, loading } = useWorkoutHistory(viewYear, viewMonth);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);

    // Monday = 0, Sunday = 6
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const days: { date: number; inMonth: boolean; dateStr: string }[] = [];

    // Previous month padding
    const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = startDow - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      days.push({
        date: d,
        inMonth: false,
        dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      });
    }

    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({
        date: d,
        inMonth: true,
        dateStr: `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      });
    }

    // Next month padding (fill to complete rows)
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const m = viewMonth === 11 ? 0 : viewMonth + 1;
        const y = viewMonth === 11 ? viewYear + 1 : viewYear;
        days.push({
          date: d,
          inMonth: false,
          dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        });
      }
    }

    return days;
  }, [viewYear, viewMonth]);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
    setSelectedDay(null);
  };

  const goToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDay(null);
  };

  // Count workout days this month
  const workoutDaysCount = Array.from(history.values()).filter(d => d.completed).length;

  return (
    <div className="app">
      <div className="cal">
        {/* Navigation */}
        <div className="cal__nav">
          <button className="cal__back" onClick={() => navigate('/')}>
            <ChevronLeft size={18} strokeWidth={2.2} />
            Back
          </button>
          <button className="cal__today-btn" onClick={goToToday}>Today</button>
        </div>

        {/* Month header */}
        <header className="cal__header">
          <button className="cal__arrow" onClick={goToPrevMonth} aria-label="Previous month">
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>
          <div className="cal__month-info">
            <h1 className="cal__month-name">{MONTH_NAMES[viewMonth]}</h1>
            <span className="cal__year">{viewYear}</span>
          </div>
          <button className="cal__arrow" onClick={goToNextMonth} aria-label="Next month">
            <ChevronRight size={20} strokeWidth={2.5} />
          </button>
        </header>

        {/* Stats bar */}
        <div className="cal__stats">
          <div className="cal__stat">
            <span className="cal__stat-value">{workoutDaysCount}</span>
            <span className="cal__stat-label">Workouts</span>
          </div>
          <div className="cal__stat-divider" />
          <div className="cal__stat">
            <span className="cal__stat-value">
              {formatCalories(Array.from(history.values()).reduce((s, d) => s + d.estimatedCalories, 0))}
            </span>
            <span className="cal__stat-label">Calories Burned</span>
          </div>
          <div className="cal__stat-divider" />
          <div className="cal__stat">
            <span className="cal__stat-value">
              {Array.from(history.values()).reduce((s, d) => s + d.totalSets, 0)}
            </span>
            <span className="cal__stat-label">Total Sets</span>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="cal__grid-container">
          {loading && (
            <div className="cal__loading-overlay">
              <div className="spinner" />
            </div>
          )}

          {/* Day headers */}
          <div className="cal__day-headers">
            {DAY_LABELS.map(d => (
              <div key={d} className="cal__day-header">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="cal__grid">
            {calendarDays.map((day, i) => {
              const workout = history.get(day.dateStr);
              const isToday = day.dateStr === todayStr;
              const isSelected = selectedDay?.date === day.dateStr;
              const hasWorkout = !!workout;

              return (
                <button
                  key={i}
                  className={[
                    'cal__cell',
                    !day.inMonth && 'cal__cell--outside',
                    isToday && 'cal__cell--today',
                    isSelected && 'cal__cell--selected',
                    hasWorkout && 'cal__cell--workout',
                    hasWorkout && workout.completed && 'cal__cell--completed',
                  ].filter(Boolean).join(' ')}
                  onClick={() => {
                    if (workout) {
                      setSelectedDay(isSelected ? null : workout);
                    } else {
                      setSelectedDay(null);
                    }
                  }}
                >
                  <span className="cal__cell-date">{day.date}</span>
                  {hasWorkout && (
                    <div className="cal__cell-dots">
                      {workout.muscleGroups.slice(0, 3).map((g, gi) => (
                        <span
                          key={gi}
                          className="cal__cell-dot"
                          style={{ background: muscleConfig[g]?.color ?? 'var(--accent)' }}
                        />
                      ))}
                    </div>
                  )}
                  {hasWorkout && workout.completed && (
                    <div className="cal__cell-check">
                      <Check size={9} strokeWidth={3.5} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected day details */}
        {selectedDay && (
          <div className="cal__details" key={selectedDay.date}>
            <div className="cal__details-header">
              <div>
                <h2 className="cal__details-day">{selectedDay.day}</h2>
                <p className="cal__details-date">{formatDisplayDate(selectedDay.date)}</p>
              </div>
              <div className="cal__details-badges">
                <MuscleGroupBadges groups={selectedDay.muscleGroups} size="sm" />
              </div>
            </div>

            {/* Stats row */}
            <div className="cal__details-stats">
              <div className="cal__details-stat">
                <span className="cal__details-stat-icon cal__details-stat-icon--exercises">
                  <Dumbbell size={16} strokeWidth={2.2} />
                </span>
                <div>
                  <span className="cal__details-stat-value">{selectedDay.totalExercises}</span>
                  <span className="cal__details-stat-label">Exercises</span>
                </div>
              </div>
              <div className="cal__details-stat">
                <span className="cal__details-stat-icon cal__details-stat-icon--sets">
                  <Layers size={16} strokeWidth={2.2} />
                </span>
                <div>
                  <span className="cal__details-stat-value">{selectedDay.totalSets}</span>
                  <span className="cal__details-stat-label">Sets Done</span>
                </div>
              </div>
              <div className="cal__details-stat">
                <span className="cal__details-stat-icon cal__details-stat-icon--calories">
                  <Flame size={16} strokeWidth={2.2} />
                </span>
                <div>
                  <span className="cal__details-stat-value">~{selectedDay.estimatedCalories}</span>
                  <span className="cal__details-stat-label">Calories Burned</span>
                </div>
              </div>
              {selectedDay.durationEstimate > 0 && (
                <div className="cal__details-stat">
                  <span className="cal__details-stat-icon cal__details-stat-icon--duration">
                    <Clock size={16} strokeWidth={2.2} />
                  </span>
                  <div>
                    <span className="cal__details-stat-value">~{selectedDay.durationEstimate}</span>
                    <span className="cal__details-stat-label">Minutes</span>
                  </div>
                </div>
              )}
            </div>

            {/* Exercise list */}
            {selectedDay.exercises.length > 0 && (
              <div className="cal__exercise-list">
                <h3 className="cal__exercise-list-title">Exercises</h3>
                {selectedDay.exercises.map((ex, i) => (
                  <div key={i} className="cal__exercise-item">
                    <div className="cal__exercise-info">
                      <span className="cal__exercise-name">{ex.name}</span>
                      <div className="cal__exercise-meta">
                        <ExerciseTypeDot name={ex.name} type={ex.exerciseType} />
                        {ex.category === 'cardio_time' ? (
                          <>
                            <span>{ex.totalMinutes > 0 ? `${ex.totalMinutes} min` : `${ex.completedSets}/${ex.sets} sessions`}</span>
                            {ex.enteredCalories > 0 && <span>·</span>}
                            {ex.enteredCalories > 0 && <span>{ex.enteredCalories} kcal</span>}
                          </>
                        ) : ex.category === 'reps_only' ? (
                          <>
                            <span>{ex.completedSets}/{ex.sets} sets</span>
                            {ex.totalReps > 0 && <span>·</span>}
                            {ex.totalReps > 0 && <span>{ex.totalReps} reps</span>}
                          </>
                        ) : (
                          <>
                            <span>{ex.completedSets}/{ex.sets} sets</span>
                            {ex.totalReps > 0 && <span>·</span>}
                            {ex.totalReps > 0 && <span>{ex.totalReps} reps</span>}
                            {ex.totalWeight > 0 && <span>·</span>}
                            {ex.totalWeight > 0 && <span>{Math.round(ex.totalWeight)} kg</span>}
                          </>
                        )}
                      </div>
                    </div>
                    {ex.estimatedCalories > 0 && (
                      <span className="cal__exercise-calories">
                        ~{ex.estimatedCalories} kcal
                      </span>
                    )}
                    <div className="cal__exercise-bar">
                      <div
                        className="cal__exercise-bar-fill"
                        style={{ width: `${ex.sets > 0 ? (ex.completedSets / ex.sets) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedDay.completed && (
              <div className="cal__completed-badge">
                <CheckCircle2 size={16} strokeWidth={2.5} />
                Workout Completed
              </div>
            )}
          </div>
        )}

        {/* Empty state for selected day */}
        {!selectedDay && !loading && (
          <div className="cal__empty-hint">
            <CalendarDays size={20} strokeWidth={1.8} />
            <span>Tap a highlighted day to see workout details</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ExerciseTypeDot({ name, type }: { name: string; type: string }) {
  const group = getExerciseMuscleGroup(
    { exercise_type: type, name },
  ) as MuscleGroup;
  const config = muscleConfig[group];
  if (!config) return null;
  return (
    <span
      className="cal__exercise-type-dot"
      style={{ background: config.color }}
      title={group}
    />
  );
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
