import { html, React } from '../utils/html.js';
import { api } from '../services/api.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';

/**
 * Extracts a safe, human-readable string from an error object.
 * Protects React rendering against raw exception arrays and validation dictionaries.
 *
 * @param {Error|Object|string} err - Error object or string caught in try/catch block.
 * @param {string} fallback - Default error message if extraction yields empty.
 * @returns {string} Sanitized string message ready for rendering.
 */
function extractErrorText(err, fallback = 'Authentication failed. Please verify your credentials.') {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  const detail = err.detail || err.message;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => (typeof d === 'object' && d ? (d.msg || JSON.stringify(d)) : String(d)))
      .join('; ');
  }
  if (typeof detail === 'object' && detail !== null) {
    return detail.msg || detail.detail || JSON.stringify(detail);
  }
  return fallback;
}

/**
 * LoginPage Component.
 * Provides user sign-in and account registration with tab-switching,
 * live password requirement counter, and error handling.
 *
 * @param {Object} props
 * @param {(user: Object) => void} props.onLoginSuccess - Callback invoked on successful authentication.
 * @param {(toast: Object) => void} [props.onNotify] - Callback for displaying global notifications.
 */
export function LoginPage({ onLoginSuccess, onNotify }) {
  const { useState } = React;

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setErrorMessage('Please enter your full name.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters long.');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (mode === 'login') {
        const res = await api.login({ email: email.trim(), password });
        if (onNotify) {
          onNotify({
            type: 'success',
            title: 'Welcome Back',
            message: `Signed in as ${res.user.name || res.user.email}`,
          });
        }
        onLoginSuccess(res.user);
      } else {
        const res = await api.register({
          email: email.trim(),
          password,
          name: name.trim(),
        });
        if (onNotify) {
          onNotify({
            type: 'success',
            title: 'Account Created',
            message: `Welcome to DocuMind, ${res.user.name}!`,
          });
        }
        onLoginSuccess(res.user);
      }
    } catch (err) {
      console.error('Authentication failed:', err);
      setErrorMessage(extractErrorText(err, 'Authentication failed. Please verify your credentials.'));
    } finally {
      setIsLoading(false);
    }
  };

  return html`
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 relative selection:bg-blue-100 selection:text-blue-900">
      <!-- Background Decorative Grid Accent -->
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-60"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <!-- Brand Header -->
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md mb-3 ring-4 ring-slate-100">
            <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">DocuMind</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            Enterprise AI Document Intelligence & Grounded Knowledge Platform
          </p>
        </div>

        <!-- Auth Card -->
        <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl border border-slate-200/90 shadow-sm space-y-6">
          <!-- Mode Switcher Tabs -->
          <div className="flex p-1 bg-slate-100/90 rounded-lg text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick=${() => { setMode('login'); setErrorMessage(''); }}
              className="flex-1 py-1.5 text-center rounded-md transition-subtle cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'hover:text-slate-900'
              }"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick=${() => { setMode('register'); setErrorMessage(''); }}
              className="flex-1 py-1.5 text-center rounded-md transition-subtle cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'hover:text-slate-900'
              }"
            >
              Create Account
            </button>
          </div>

          <!-- Error Alert Banner -->
          ${errorMessage ? html`
            <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-lg flex items-start gap-2.5 animate-in fade-in duration-150">
              <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <p className="text-xs text-rose-700 leading-snug font-medium">${String(errorMessage)}</p>
            </div>
          ` : null}

          <!-- Form Fields -->
          <form onSubmit=${handleSubmit} className="space-y-4">
            ${mode === 'register' ? html`
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Johnson"
                  value=${name}
                  onChange=${(e) => setName(e.target.value)}
                  disabled=${isLoading}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-subtle"
                />
              </div>
            ` : null}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="name@company.com"
                value=${email}
                onChange=${(e) => setEmail(e.target.value)}
                disabled=${isLoading}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-subtle"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700">Password</label>
                <button
                  type="button"
                  onClick=${() => setShowPassword(!showPassword)}
                  className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  ${showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type=${showPassword ? 'text' : 'password'}
                required
                minLength=${mode === 'register' ? 6 : 1}
                autoComplete=${mode === 'login' ? 'current-password' : 'new-password'}
                placeholder=${mode === 'register' ? 'At least 6 characters' : '••••••••'}
                value=${password}
                onChange=${(e) => setPassword(e.target.value)}
                disabled=${isLoading}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-subtle"
              />
              ${mode === 'register' ? html`
                <div className="mt-1.5 flex items-center justify-between text-[11px] transition-all">
                  <span className="flex items-center gap-1.5 ${
                    password.length === 0
                      ? 'text-slate-400'
                      : password.length >= 6
                      ? 'text-emerald-600 font-medium'
                      : 'text-amber-600 font-medium'
                  }">
                    ${password.length >= 6 ? html`
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    ` : html`
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                    `}
                    <span>
                      ${password.length === 0
                        ? 'Must be at least 6 characters'
                        : password.length >= 6
                        ? 'Password meets requirement'
                        : `At least 6 characters (${password.length}/6)`}
                    </span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    ${password.length}/6 min
                  </span>
                </div>
              ` : null}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled=${isLoading}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/30 transition-subtle disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                ${isLoading ? html`
                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                ` : null}
                <span>${mode === 'login' ? 'Sign In to Workspace' : 'Create Account'}</span>
              </button>
            </div>
          </form>
        </div>

        <!-- Trust Badges Footer -->
        <div className="mt-8 flex items-center justify-center gap-6 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            <span>Strict Citation Grounding</span>
          </div>
          <span>&bull;</span>
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            </svg>
            <span>ChromaDB Vector Store</span>
          </div>
        </div>
      </div>
    </div>
  `;
}
