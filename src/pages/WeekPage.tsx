import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, ChevronRight } from 'lucide-react';
import { useRoutines } from '../hooks/useRoutines';
import { useBodyMetrics } from '../hooks/useBodyMetrics';
import DayCard from '../components/DayCard';
import WeekStrip from '../components/WeekStrip';
import ProfileDropdown from '../components/ProfileDropdown';
import { MuscleIcon, muscleConfig } from '../components/MuscleGroupBadge';
import { parseMuscleGroups, isRestRoutine } from '../types';
import './WeekPage.css';

function getTodayIndex() {
   const d = new Date().getDay(); // 0=Sun
   return d === 0 ? 6 : d - 1;   // Mon=0 … Sun=6
}

export default function WeekPage() {
   const navigate = useNavigate();
   const { routines, routineProgress, loading, error, toggleComplete } = useRoutines();
   const { metrics, stats } = useBodyMetrics();
   const todayIndex = useMemo(() => getTodayIndex(), []);

   const workoutRoutines = useMemo(
      () => routines.filter(r => !isRestRoutine(r.muscle_group)),
      [routines]
   );

   const progressMap = useMemo(() => {
      const map = new Map<string, number>();
      for (const r of routines) {
         if (isRestRoutine(r.muscle_group)) {
            map.set(r.id, 1);
         } else if (r.completed) {
            map.set(r.id, 1);
         } else {
            map.set(r.id, routineProgress[r.id]?.progress ?? 0);
         }
      }
      return map;
   }, [routines, routineProgress]);

   const totalWorkoutDays = workoutRoutines.length;

   // Fully completed days
   const done = workoutRoutines.filter(r => r.completed || (progressMap.get(r.id) ?? 0) >= 1).length;

   // Total week progress percentage (average of workout routines progress)
   const weekPct = useMemo(() => {
      if (totalWorkoutDays === 0) return 0;
      const sum = workoutRoutines.reduce((acc, r) => acc + (progressMap.get(r.id) ?? 0), 0);
      return Math.round((sum / totalWorkoutDays) * 100);
   }, [workoutRoutines, progressMap, totalWorkoutDays]);

   if (loading) return (
      <div className="wp-loading">
         <div className="spinner" />
         <p>Loading your plan…</p>
      </div>
   );

   if (error) {
      const isMissingTable = error.includes("schema cache") || error.includes("routines");
      return (
         <div className="wp-error">
            <p>⚠️ {isMissingTable ? 'Database tables not set up yet' : 'Could not connect to Supabase'}</p>
            <p className="wp-error__sub">{error}</p>
            {isMissingTable ? (
               <p className="wp-error__hint">
                  Your Supabase credentials are correct ✅<br />
                  You just need to create the tables. Open <strong>supabase.com → your project → SQL Editor</strong>,
                  paste the contents of <code>SUPABASE_SETUP.sql</code> and click <strong>Run</strong>.
               </p>
            ) : (
               <p className="wp-error__hint">
                  Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your <code>.env</code> file, then restart the dev server.
               </p>
            )}
         </div>
      );
   }

   const today = routines[todayIndex];
   const todayProgress = today ? (progressMap.get(today.id) ?? 0) : 0;
   const todayPct = Math.round(todayProgress * 100);
   const isTodayDone = today ? (today.completed || todayProgress >= 1) : false;

   return (
      <div className="app">
         <div className="wp">
            {/* Header */}
            <header className="wp__header">
               <div className="wp__topbar">
                  <div className="wp__logo">
                     <img src="/apex_fitness.png" alt="Logo" height={40} width={40} />
                     <span className="logo-text">Apex Fitness</span>
                  </div>
                  <ProfileDropdown />
               </div>
               <p className="wp__sub">Your weekly workout planner</p>

               {today && (() => {
                  const isTodayRest = isRestRoutine(today.muscle_group);
                  const todayGroups = parseMuscleGroups(today.muscle_group);
                  const todayTitle = isTodayRest
                     ? 'Rest Day'
                     : `${todayGroups.join(' & ')} Day`;

                  return (
                     <div
                        className="wp__today-card"
                        onClick={() => navigate(`/routine/${today.day.toLowerCase()}`)}
                     >
                        <div>
                           <p className="wp__today-label">Today — {today.day}</p>
                           <div className="wp__today-workout" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span>{todayTitle}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                 {todayGroups.map(g => (
                                    <MuscleIcon key={g} group={g} px={22} emoji={muscleConfig[g]?.emoji ?? '💪'} />
                                 ))}
                              </div>
                           </div>
                        </div>
                        <div className="wp__ring-wrap">
                           <svg viewBox="0 0 44 44" className="wp__ring">
                              <circle cx="22" cy="22" r="18" className="ring-track" />
                              <circle cx="22" cy="22" r="18" className="ring-fill"
                                 strokeDasharray={`${2 * Math.PI * 18}`}
                                 strokeDashoffset={`${2 * Math.PI * 18 * (1 - todayPct / 100)}`}
                                 style={{
                                    stroke: isTodayDone ? 'var(--green)' : 'var(--accent)',
                                    transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease'
                                 }}
                              />
                           </svg>
                           <div className="ring-label">
                              {isTodayDone ? (
                                 <span className="ring-pct" style={{ color: 'var(--green)', fontSize: '0.95rem' }}>✓</span>
                              ) : (
                                 <>
                                    <span className="ring-pct">{todayPct}%</span>
                                    <span className="ring-sub">done</span>
                                 </>
                              )}
                           </div>
                        </div>
                     </div>
                  );
               })()}

               <div className="wp__progress-row">
                  <div className="wp__bar">
                     <div className="wp__bar-fill" style={{ width: `${weekPct}%` }} />
                  </div>
                  <span className="wp__progress-text">
                     {weekPct}% this week · {done}/{totalWorkoutDays} done
                  </span>
               </div>

               {/* Body Metrics Quick Bar */}
               <div className="wp__metrics-bar" onClick={() => navigate('/profile')}>
                  <div className="wp__metrics-bar-left">
                     <div className="wp__metrics-bar-icon">
                        <Scale size={16} strokeWidth={2.2} />
                     </div>
                     <div className="wp__metrics-bar-text">
                        <span className="wp__metrics-bar-title">Body Profile & Metrics</span>
                        <span className="wp__metrics-bar-desc">
                           {metrics.weight
                              ? `${metrics.weight} ${metrics.weightUnit}${stats.heightCm ? ` · ${Math.round(stats.heightCm)} cm` : ''}${stats.bmi ? ` · BMI ${stats.bmi}` : ''}`
                              : 'Enter your weight & height to calculate BMI & calorie burn'}
                        </span>
                     </div>
                  </div>
                  <ChevronRight size={16} strokeWidth={2.2} className="wp__metrics-bar-arrow" />
               </div>
            </header>

            {/* Week strip */}
            {routines.length > 0 && (
               <WeekStrip plan={routines} todayIndex={todayIndex} progressMap={progressMap} />
            )}

            {/* Day list */}
            <main className="wp__list">
               {routines.length === 0 ? (
                  <div className="wp__empty">
                     <p>No routines found.</p>
                     <p>Run the Supabase SQL setup to create your 7-day plan.</p>
                  </div>
               ) : routines.map((r, i) => (
                  <DayCard
                     key={r.id}
                     routine={r}
                     isToday={i === todayIndex}
                     progress={progressMap.get(r.id) ?? 0}
                     onToggleComplete={toggleComplete}
                  />
               ))}
            </main>
         </div>
      </div>
   );
}
