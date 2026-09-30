import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, LogOut, ChevronDown, Scale } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBodyMetrics } from '../hooks/useBodyMetrics';
import './ProfileDropdown.css';

export default function ProfileDropdown() {
  const { user, signOut } = useAuth();
  const { metrics, stats } = useBodyMetrics();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userInitial = (user?.user_metadata?.full_name ?? user?.email ?? '?')[0].toUpperCase();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('keydown', handleKey);
      return () => document.removeEventListener('keydown', handleKey);
    }
  }, [open]);

  return (
    <div className="profile-dropdown" ref={dropdownRef}>
      <button
        className="profile-dropdown__trigger"
        onClick={() => setOpen(o => !o)}
        title={user?.email ?? 'Profile'}
        aria-label="Profile menu"
      >
        <div className="profile-dropdown__avatar">{userInitial}</div>
        <ChevronDown
          size={13}
          strokeWidth={2.5}
          className={`profile-dropdown__chevron ${open ? 'open' : ''}`}
        />
      </button>

      {open && (
        <div className="profile-dropdown__menu">
          {/* User info */}
          <div className="profile-dropdown__user-info">
            <div className="profile-dropdown__user-avatar">{userInitial}</div>
            <div className="profile-dropdown__user-details">
              <span className="profile-dropdown__user-name">
                {user?.user_metadata?.full_name || 'Athlete'}
              </span>
              <span className="profile-dropdown__user-email">{user?.email}</span>
              {metrics.weight && (
                <span className="profile-dropdown__user-metrics">
                  {metrics.weight} {metrics.weightUnit}
                  {stats.heightCm ? ` · ${Math.round(stats.heightCm)} cm` : ''}
                  {stats.bmi ? ` · BMI ${stats.bmi}` : ''}
                </span>
              )}
            </div>
          </div>

          <div className="profile-dropdown__divider" />

          {/* Body Metrics */}
          <button
            className="profile-dropdown__item"
            onClick={() => {
              setOpen(false);
              navigate('/profile');
            }}
          >
            <Scale size={16} strokeWidth={2} />
            <span>Body Profile & Metrics</span>
            <span className="profile-dropdown__item-hint">
              {metrics.weight ? `${metrics.weight} ${metrics.weightUnit}` : 'Setup'}
            </span>
          </button>

          {/* Calendar */}
          <button
            className="profile-dropdown__item"
            onClick={() => {
              setOpen(false);
              navigate('/calendar');
            }}
          >
            <Calendar size={16} strokeWidth={2} />
            <span>Workout Calendar</span>
            <span className="profile-dropdown__item-hint">History</span>
          </button>

          <div className="profile-dropdown__divider" />

          {/* Logout */}
          <button
            className="profile-dropdown__item profile-dropdown__item--danger"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
          >
            <LogOut size={16} strokeWidth={2} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
