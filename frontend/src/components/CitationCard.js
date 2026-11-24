import { html } from '../utils/html.js';
import { Badge } from './ui/Badge.js';

/**
 * CitationCard Component.
 * Displays an individual grounded citation reference with filename,
 * page/section badge, snippet text, and selection state.
 *
 * @param {Object} props
 * @param {Object} props.citation - Citation metadata object.
 * @param {(chunkId: string) => void} [props.onSelectChunk] - Callback when user clicks the citation card.
 * @param {boolean} [props.isSelected] - Whether this citation is currently highlighted.
 */
export function CitationCard({ citation, onSelectChunk, isSelected = false }) {
  const locText = citation.page !== null && citation.page !== undefined
    ? `Page ${citation.page}`
    : (citation.section || 'General');

  return html`
    <div
      onClick=${() => onSelectChunk && onSelectChunk(citation.chunk_id)}
      className="bg-white rounded-lg p-3 border transition-subtle cursor-pointer select-none text-left ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-500/15 bg-blue-50/20'
          : 'border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
      }"
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <svg className="w-3.5 h-3.5 text-blue-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <span className="text-xs font-semibold text-slate-900 truncate" title=${citation.filename}>
            ${citation.filename}
          </span>
        </div>
        <${Badge} variant="primary" size="xs">
          ${locText}
        <//>
      </div>

      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed italic bg-slate-50/60 p-1.5 rounded border border-slate-100">
        "${citation.excerpt}"
      </p>

      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 text-[10px] text-slate-400">
        <span className="font-mono truncate" title=${citation.chunk_id}>
          ID: ${citation.chunk_id.slice(0, 14)}...
        </span>
        <span className="text-blue-600 font-medium hover:underline">
          View Chunk &rarr;
        </span>
      </div>
    </div>
  `;
}
