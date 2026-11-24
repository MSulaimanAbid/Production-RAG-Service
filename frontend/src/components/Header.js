import { html } from '../utils/html.js';
import { Button } from './ui/Button.js';

/**
 * Application Header Component.
 * Displays current page title, contextual subtitle, mobile drawer hamburger button,
 * and persistent document upload action button.
 *
 * @param {Object} props
 * @param {string} props.title - Current view title.
 * @param {string} [props.subtitle] - Contextual subtitle description.
 * @param {() => void} [props.onOpenUpload] - Handler to launch Document Upload modal.
 * @param {() => void} [props.onToggleMobile] - Handler to toggle mobile navigation menu.
 * @param {number} [props.totalDocs] - Count of currently indexed documents.
 */
export function Header({
  title,
  subtitle,
  onOpenUpload,
  onToggleMobile,
  totalDocs = 0,
}) {
  return html`
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200/80 px-4 sm:px-6 py-3.5 flex items-center justify-between transition-subtle">
      <!-- Left side: Mobile menu toggle + Title -->
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick=${onToggleMobile}
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-subtle cursor-pointer"
          aria-label="Open sidebar"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        <div>
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight leading-tight">
            ${title}
          </h2>
          ${subtitle && html`
            <p className="text-xs text-slate-500 font-normal leading-tight hidden sm:block mt-0.5">
              ${subtitle}
            </p>
          `}
        </div>
      </div>

      <!-- Right side: Quick actions -->
      <div className="flex items-center gap-2.5">
        <div className="hidden md:flex items-center text-xs text-slate-500 bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-md gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
          <span>Corpus:</span>
          <span className="font-semibold text-slate-700">${totalDocs} ${totalDocs === 1 ? 'doc' : 'docs'}</span>
        </div>

        <${Button}
          variant="primary"
          size="sm"
          onClick=${onOpenUpload}
          icon=${html`
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          `}
        >
          Upload Document
        <//>
      </div>
    </header>
  `;
}
