import { html } from '../utils/html.js';
import { Modal } from './ui/Modal.js';
import { Button } from './ui/Button.js';
import { Badge } from './ui/Badge.js';

/**
 * DocumentDetailModal Component.
 * Inspector dialog displaying full metadata of an indexed document:
 * Document ID, SHA-256 hash, chunk distribution, file size, ingestion time, and deletion trigger.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible.
 * @param {() => void} props.onClose - Modal close handler.
 * @param {Object|null} props.document - Selected document metadata object.
 * @param {(doc: Object) => void} [props.onDeleteRequest] - Callback to delete the document.
 */
export function DocumentDetailModal({
  isOpen,
  onClose,
  document,
  onDeleteRequest,
}) {
  if (!document) return null;

  const formatDate = (isoStr) => {
    try {
      return new Date(isoStr).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return html`
    <${Modal}
      isOpen=${isOpen}
      onClose=${onClose}
      title="Document Details"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        <!-- Title and Type -->
        <div className="flex items-start justify-between gap-3 p-3.5 bg-slate-50 rounded-lg border border-slate-200/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs font-bold text-xs uppercase">
              ${document.file_type}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 leading-tight">${document.filename}</h4>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">ID: ${document.doc_id}</p>
            </div>
          </div>
          <${Badge} variant="primary" size="xs">
            ${document.file_type.toUpperCase()}
          <//>
        </div>

        <!-- Metadata Grid -->
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
            <span className="text-slate-400 block text-[11px]">Vector Chunks</span>
            <span className="text-base font-semibold text-slate-800 font-mono mt-0.5 block">
              ${document.chunk_count}
            </span>
          </div>

          <div className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
            <span className="text-slate-400 block text-[11px]">Pages</span>
            <span className="text-base font-semibold text-slate-800 font-mono mt-0.5 block">
              ${document.page_count !== null && document.page_count !== undefined ? document.page_count : 'N/A'}
            </span>
          </div>

          <div className="col-span-2 p-3 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
            <span className="text-slate-400 block text-[11px]">Ingested On</span>
            <span className="text-xs font-medium text-slate-700 mt-0.5 block">
              ${formatDate(document.created_at)}
            </span>
          </div>

          ${document.file_hash && html`
            <div className="col-span-2 p-3 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
              <span className="text-slate-400 block text-[11px]">SHA-256 Content Fingerprint</span>
              <span className="text-[11px] font-mono text-slate-600 break-all select-all mt-0.5 block">
                ${document.file_hash}
              </span>
            </div>
          `}
        </div>

        <!-- Footer Actions -->
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <${Button}
            variant="dangerGhost"
            size="sm"
            onClick=${() => {
              onClose();
              if (onDeleteRequest) onDeleteRequest(document);
            }}
            icon=${html`
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            `}
          >
            Delete Document
          <//>

          <${Button}
            variant="secondary"
            size="sm"
            onClick=${onClose}
          >
            Close
          <//>
        </div>
      </div>
    <//>
  `;
}
