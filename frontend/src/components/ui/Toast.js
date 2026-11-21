import { html } from '../../utils/html.js';

export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return html`
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      ${toasts.map((toast) => html`
        <div
          key=${toast.id}
          className="pointer-events-auto bg-white rounded-lg shadow-lg border border-slate-200/90 p-3.5 flex items-start gap-3 transform transition-all animate-in slide-in-from-bottom-2 duration-150"
        >
          <!-- Status Icon -->
          <div className="shrink-0 mt-0.5">
            ${toast.type === 'success' && html`
              <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            `}
            ${toast.type === 'error' && html`
              <svg className="w-4 h-4 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            `}
            ${toast.type === 'info' && html`
              <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            `}
          </div>

          <!-- Content -->
          <div className="flex-1 min-w-0">
            ${toast.title && html`<p className="text-xs font-semibold text-slate-900">${toast.title}</p>`}
            <p className="text-xs text-slate-600 break-words mt-0.5 leading-relaxed">${toast.message}</p>
          </div>

          <!-- Close button -->
          <button
            type="button"
            onClick=${() => onDismiss(toast.id)}
            className="shrink-0 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      `)}
    </div>
  `;
}
