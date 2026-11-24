import { html, React } from '../utils/html.js';
import { Button } from '../components/ui/Button.js';
import { DocumentTable } from '../components/DocumentTable.js';
import { DocumentUploadModal } from '../components/DocumentUploadModal.js';
import { DocumentDetailModal } from '../components/DocumentDetailModal.js';

/**
 * DocumentsPage Component.
 * Dedicated knowledge base management view housing the searchable DocumentTable,
 * upload triggers, and document inspector dialogs.
 *
 * @param {Object} props
 * @param {Array<Object>} props.documents - List of documents in the knowledge base.
 * @param {boolean} [props.loading] - Whether document fetch is currently active.
 * @param {() => void} props.onRefresh - Refresh documents handler.
 * @param {(toast: Object) => void} [props.onNotify] - Global notification toast trigger.
 * @param {boolean} props.isUploadOpen - Controlled state for the upload modal.
 * @param {(open: boolean) => void} props.setIsUploadOpen - State updater for upload modal.
 */
export function DocumentsPage({
  documents = [],
  loading = false,
  onRefresh,
  onNotify,
  isUploadOpen,
  setIsUploadOpen,
}) {
  const { useState } = React;
  const [selectedDoc, setSelectedDoc] = useState(null);

  return html`
    <div className="space-y-6">
      <!-- Page Description Banner -->
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Knowledge Base Documents
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
            Manage documents indexed in your vector database. Uploading extracts structured text, detects duplicates via SHA-256 fingerprints, and generates 3072-dimensional embeddings.
          </p>
        </div>

        <${Button}
          variant="primary"
          size="sm"
          onClick=${() => setIsUploadOpen(true)}
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

      <!-- Main Documents Table -->
      <${DocumentTable}
        documents=${documents}
        loading=${loading}
        onRefresh=${onRefresh}
        onOpenUpload=${() => setIsUploadOpen(true)}
        onViewDetails=${(doc) => setSelectedDoc(doc)}
        onNotify=${onNotify}
      />

      <!-- Detail Modal -->
      <${DocumentDetailModal}
        isOpen=${!!selectedDoc}
        onClose=${() => setSelectedDoc(null)}
        document=${selectedDoc}
        onDeleteRequest=${() => {
          setSelectedDoc(null);
        }}
      />

      <!-- Upload Modal -->
      <${DocumentUploadModal}
        isOpen=${isUploadOpen}
        onClose=${() => setIsUploadOpen(false)}
        onUploadSuccess=${() => {
          if (onRefresh) onRefresh();
        }}
        onNotify=${onNotify}
      />
    </div>
  `;
}
