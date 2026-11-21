import { html } from '../../utils/html.js';

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon = null,
  className = '',
  title = '',
}) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-subtle select-none focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]';

  const sizeClasses = {
    xs: 'px-2.5 py-1 text-xs gap-1.5',
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-3.5 py-2 text-sm gap-2',
    lg: 'px-4 py-2.5 text-sm gap-2.5',
    icon: 'p-2 text-slate-500 hover:text-slate-800',
  }[size] || 'px-3.5 py-2 text-sm gap-2';

  const variantClasses = {
    primary: 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm focus:ring-slate-900/30',
    accent: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm focus:ring-blue-500/30',
    secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-xs focus:ring-slate-300',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 focus:ring-slate-200',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm focus:ring-rose-500/30',
    dangerGhost: 'bg-transparent hover:bg-rose-50 text-rose-600 hover:text-rose-700 focus:ring-rose-200',
  }[variant] || 'bg-slate-900 text-white';

  return html`
    <button
      type=${type}
      onClick=${onClick}
      disabled=${disabled || loading}
      title=${title}
      className="${baseClasses} ${sizeClasses} ${variantClasses} ${className}"
    >
      ${loading && html`
        <svg className="animate-spin -ml-0.5 h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
      `}
      ${!loading && icon && html`<span className="shrink-0 flex items-center">${icon}</span>`}
      <span>${children}</span>
    </button>
  `;
}
