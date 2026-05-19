import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
   const { signInWithPassword, signUpWithPassword } = useAuth();
   const [isSignUp, setIsSignUp] = useState(false);
   const [email, setEmail] = useState('');
   const [password, setPassword] = useState('');
   const [loading, setLoading] = useState(false);
   const [errorMsg, setErrorMsg] = useState<string | null>(null);

   const handleSubmit = async (e: FormEvent) => {
      e.preventDefault();
      if (!email.trim() || !password.trim()) return;
      setLoading(true);
      setErrorMsg(null);

      let error;
      if (isSignUp) {
         const res = await signUpWithPassword(email.trim(), password);
         error = res.error;
      } else {
         const res = await signInWithPassword(email.trim(), password);
         error = res.error;
      }

      setLoading(false);
      if (error) setErrorMsg(error);
   };

   return (
      <div className="login-bg">
         {/* Ambient glows */}
         <div className="login-glow login-glow--1" />
         <div className="login-glow login-glow--2" />

         <div className="login-card">
            {/* Logo */}
            <div className="login-logo">
               <img src="/apex_fitness.png" alt="Apex Fitness Logo" width={56} height={56} />
            </div>

            <h1 className="login-title">Apex Fitness</h1>
            <p className="login-sub">Your personal weekly workout planner</p>

            <div className="login-divider" />

            <p className="login-prompt">
               {isSignUp ? 'Create a new account' : 'Sign in to your account'}
            </p>

            <form className="login-form" onSubmit={handleSubmit} noValidate>
               <div className="login-input-wrap">
                  {/* Mail icon */}
                  <svg className="login-input-icon" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                     <rect x="2" y="4" width="20" height="16" rx="2" />
                     <path d="M2 7l10 7 10-7" />
                  </svg>
                  <input
                     id="email"
                     className="login-input"
                     type="email"
                     placeholder="you@example.com"
                     value={email}
                     onChange={e => { setEmail(e.target.value); setErrorMsg(null); }}
                     autoComplete="email"
                     autoFocus
                     required
                  />
               </div>

               <div className="login-input-wrap">
                  {/* Lock icon */}
                  <svg className="login-input-icon" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                     <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                     <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <input
                     id="password"
                     className="login-input"
                     type="password"
                     placeholder="Password"
                     value={password}
                     onChange={e => { setPassword(e.target.value); setErrorMsg(null); }}
                     autoComplete={isSignUp ? "new-password" : "current-password"}
                     required
                  />
               </div>

               {errorMsg && (
                  <p className="login-error">{errorMsg}</p>
               )}

               <button
                  type="submit"
                  className="login-submit-btn"
                  disabled={loading || !email.trim() || !password.trim()}
               >
                  {loading ? <span className="login-spinner" /> : (
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {isSignUp ? (
                           <>
                              <path d="M16 21v-2a4 4 0 0 0-4-4H5c-1.1 0-2 .9-2 2v2"></path>
                              <circle cx="8.5" cy="7" r="4"></circle>
                              <line x1="20" y1="8" x2="20" y2="14"></line>
                              <line x1="23" y1="11" x2="17" y2="11"></line>
                           </>
                        ) : (
                           <>
                              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                              <polyline points="10 17 15 12 10 7"></polyline>
                              <line x1="15" y1="12" x2="3" y2="12"></line>
                           </>
                        )}
                     </svg>
                  )}
                  {loading ? (isSignUp ? 'Creating account…' : 'Signing in…') : (isSignUp ? 'Sign up' : 'Sign in')}
               </button>
            </form>

            <p className="login-footer">
               {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
               <button
                  type="button"
                  className="login-toggle-btn"
                  onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(null); }}
               >
                  {isSignUp ? 'Sign in' : 'Sign up'}
               </button>
            </p>
         </div>
      </div>
   );
}

