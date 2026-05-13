import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoutines } from '../hooks/useRoutines';
import DayCard from '../components/DayCard';
import WeekStrip from '../components/WeekStrip';
import './WeekPage.css';

function getTodayIndex() {
  const d = new Date().getDay(); // 0=Sun
  return d === 0 ? 6 : d - 1;   // Mon=0 … Sun=6
}

export default function WeekPage() {
  const navigate = useNavigate();
  const { routines, loading, error, toggleComplete } = useRoutines();
  const todayIndex = useMemo(() => getTodayIndex(), []);

  const done  = routines.filter(r => r.muscle_group !== 'Rest' && r.completed).length;
  const total = routines.filter(r => r.muscle_group !== 'Rest').length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

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
      <div className="bg-blob bg-blob--1" />
      <div className="bg-blob bg-blob--2" />

      <div className="wp">
        {/* Header */}
        <header className="wp__header">
          <div className="wp__logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">FitTrack</span>
          </div>
          <p className="wp__sub">Your weekly workout planner</p>

          {today && (
            <div
              className="wp__today-card"
              onClick={() => navigate(`/routine/${today.day.toLowerCase()}`)}
            >
              <div>
                <p className="wp__today-label">Today — {today.day}</p>
                <p className="wp__today-workout">
                  {today.muscle_group === 'Rest' ? 'Rest Day 😴' : `${today.muscle_group} Day 💪`}
                </p>
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
          )}

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
              onToggle={() => toggleComplete(r)}
            />
          ))}
        </main>

        <footer className="wp__footer">
          <p>Stay consistent · Stay strong ⚡</p>
        </footer>
      </div>
    </div>
  );
}
