import { html } from '../../utils/html.js';

export function Input({
  value,
  onChange,
  onKeyDown,
  placeholder = '',
  type = 'text',
  icon = null,
  clearable = false,
  onClear = null,
  disabled = false,
  className = '',
  autoFocus = false,
}) {
  return html`
    <div className="relative flex items-center w-full">
      ${icon && html`
        <span className="absolute left-3 text-slate-400 pointer-events-none flex items-center">
          ${icon}
        </span>
      `}
      <input
        type=${type}
        value=${value}
        onChange=${onChange}
        onKeyDown=${onKeyDown}
        placeholder=${placeholder}
        disabled=${disabled}
        autoFocus=${autoFocus}
        className="w-full bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-lg border border-slate-200/90 shadow-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-subtle py-2 ${
          icon ? 'pl-9' : 'pl-3.5'
        } ${clearable && value ? 'pr-8' : 'pr-3.5'} ${className}"
      />
      ${clearable && value && html`
        <button
          type="button"
          onClick=${onClear}
          className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `}
    </div>
  `;
}
