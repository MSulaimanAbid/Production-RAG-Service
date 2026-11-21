import { html } from '../../utils/html.js';

export function Badge({ children, variant = 'default', size = 'sm', className = '' }) {
  const baseClasses = 'inline-flex items-center font-medium rounded-full transition-subtle';
  
  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[10px] leading-tight',
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-xs',
  }[size] || 'px-2.5 py-0.5 text-xs';

  const variantClasses = {
    default: 'bg-slate-100 text-slate-700 border border-slate-200/80',
    primary: 'bg-blue-50 text-blue-700 border border-blue-200/80',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200/80',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200/80',
    mono: 'bg-slate-100 text-slate-800 font-mono text-[11px] border border-slate-200',
    score: 'bg-indigo-50 text-indigo-700 font-mono font-semibold border border-indigo-200',
  }[variant] || 'bg-slate-100 text-slate-700 border border-slate-200';

  return html`
    <span className="${baseClasses} ${sizeClasses} ${variantClasses} ${className}">
      ${children}
    </span>
  `;
}
