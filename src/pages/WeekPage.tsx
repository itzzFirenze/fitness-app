import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoutines } from '../hooks/useRoutines';
import { useAuth } from '../context/AuthContext';
import DayCard from '../components/DayCard';
import WeekStrip from '../components/WeekStrip';
import { MuscleIcon, muscleConfig } from '../components/MuscleGroupBadge';
import { parseMuscleGroups, isRestRoutine } from '../types';
import './WeekPage.css';

function getTodayIndex() {
   const d = new Date().getDay(); // 0=Sun
   return d === 0 ? 6 : d - 1;   // Mon=0 … Sun=6
}

export default function WeekPage() {
   const navigate = useNavigate();
   const { routines, loading, error } = useRoutines();
   const { user, signOut } = useAuth();
   const todayIndex = useMemo(() => getTodayIndex(), []);

   const userInitial = (user?.user_metadata?.full_name ?? user?.email ?? '?')[0].toUpperCase();

   const done = routines.filter(r => !isRestRoutine(r.muscle_group) && r.completed).length;
   const total = routines.filter(r => !isRestRoutine(r.muscle_group)).length;
   const pct = total > 0 ? Math.round((done / total) * 100) : 0;

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
                  <div className="wp__user">
                     <div className="wp__avatar" title={user?.email ?? ''}>{userInitial}</div>
                     <button id="signout-btn" className="wp__signout" onClick={signOut} title="Sign out">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                           <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                           <polyline points="16 17 21 12 16 7" />
                           <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Sign out
                     </button>
                  </div>
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
                                 strokeDashoffset={`${2 * Math.PI * 18 * (1 - pct / 100)}`} />
                           </svg>
                           <div className="ring-label">
                              <span className="ring-pct">{pct}%</span>
                              <span className="ring-sub">done</span>
                           </div>
                        </div>
                     </div>
                  );
               })()}

               <div className="wp__progress-row">
                  <div className="wp__bar">
                     <div className="wp__bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="wp__progress-text">{done}/{total} this week</span>
               </div>
            </header>

            {/* Week strip */}
            {routines.length > 0 && (
               <WeekStrip plan={routines} todayIndex={todayIndex} />
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
                  />
               ))}
            </main>
         </div>
      </div>
   );
}
