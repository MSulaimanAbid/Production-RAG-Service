import { html, React } from '../utils/html.js';
import { Button } from './ui/Button.js';
import { Badge } from './ui/Badge.js';
import { Input } from './ui/Input.js';
import { TableSkeleton } from './ui/Skeleton.js';
import { Modal } from './ui/Modal.js';
import { api } from '../services/api.js';

/**
 * DocumentTable Component.
 * Interactive document management table with real-time text search,
 * file-type filtering (PDF / DOCX), multi-column sorting, and deletion confirmation modal.
 *
 * @param {Object} props
 * @param {Array<Object>} props.documents - List of indexed documents from backend.
 * @param {boolean} [props.loading] - Whether document fetch is currently active.
 * @param {() => void} [props.onRefresh] - Refresh documents handler.
 * @param {() => void} [props.onOpenUpload] - Handler to open file upload dialog.
 * @param {(doc: Object) => void} [props.onViewDetails] - Handler to inspect document details.
 * @param {(toast: Object) => void} [props.onNotify] - Global toast notification handler.
 */
export function DocumentTable({
  documents = [],
  loading = false,
  onRefresh,
  onOpenUpload,
  onViewDetails,
  onNotify,
}) {
  const { useState, useMemo } = React;
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'pdf', 'docx'
  const [sortBy, setSortBy] = useState('date_desc'); // 'date_desc', 'date_asc', 'name', 'chunks'
  
  // Deletion modal state
  const [docToDelete, setDocToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      // Type filter
      if (typeFilter !== 'all' && doc.file_type.toLowerCase() !== typeFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          doc.filename.toLowerCase().includes(q) ||
          doc.doc_id.toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      if (sortBy === 'date_asc') {
        return new Date(a.created_at) - new Date(b.created_at);
      }
      if (sortBy === 'name') {
        return a.filename.localeCompare(b.filename);
      }
      if (sortBy === 'chunks') {
        return b.chunk_count - a.chunk_count;
      }
      return 0;
    });
  }, [documents, searchQuery, typeFilter, sortBy]);

  const confirmDelete = async () => {
    if (!docToDelete || isDeleting) return;

    setIsDeleting(true);
    try {
      await api.deleteDocument(docToDelete.doc_id);
      onNotify({
        type: 'success',
        title: 'Document Purged',
        message: `"${docToDelete.filename}" and its vector chunks were permanently removed from ChromaDB.`,
      });
      setDocToDelete(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Delete failed:', err);
      onNotify({
        type: 'error',
        title: 'Deletion Failed',
        message: err.detail || 'Could not delete document from database.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (isoStr) => {
    try {
      return new Date(isoStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  return html`
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
      <!-- Table Controls Bar -->
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/40">
        <!-- Search field -->
        <div className="w-full sm:w-72">
          <${Input}
            value=${searchQuery}
            onChange=${(e) => setSearchQuery(e.target.value)}
            onClear=${() => setSearchQuery('')}
            clearable=${true}
            placeholder="Search documents by name..."
            icon=${html`
              <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            `}
          />
        </div>

        <!-- Filters & Sorting -->
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <!-- Type Filter Tabs -->
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
            ${['all', 'pdf', 'docx'].map((t) => html`
              <button
                key=${t}
                type="button"
                onClick=${() => setTypeFilter(t)}
                className="px-2.5 py-1 rounded-md capitalize font-medium transition-subtle cursor-pointer ${
                  typeFilter === t
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }"
              >
                ${t}
              </button>
            `)}
          </div>

          <!-- Sort Select -->
          <select
            value=${sortBy}
            onChange=${(e) => setSortBy(e.target.value)}
            className="text-xs bg-white text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="name">Alphabetical</option>
            <option value="chunks">Most Chunks</option>
          </select>
        </div>
      </div>

      <!-- Table Content Area -->
      <div className="overflow-x-auto">
        ${loading ? html`
          <div className="p-6">
            <${TableSkeleton} rows=${5} />
          </div>
        ` : filteredDocs.length === 0 ? html`
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
            </div>
            <h4 className="text-sm font-semibold text-slate-900">No documents found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              ${searchQuery || typeFilter !== 'all'
                ? 'No documents match your active search or filter criteria.'
                : 'Your knowledge base is empty. Upload your first PDF or DOCX file to start.'}
            </p>
            ${!searchQuery && typeFilter === 'all' && html`
              <div className="mt-4">
                <${Button} variant="primary" size="sm" onClick=${onOpenUpload}>
                  Upload Documents
                <//>
              </div>
            `}
          </div>
        ` : html`
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Document</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Chunks</th>
                <th className="py-3 px-4">Pages</th>
                <th className="py-3 px-4">Uploaded</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              ${filteredDocs.map((doc) => html`
                <tr
                  key=${doc.doc_id}
                  className="hover:bg-slate-50/70 transition-subtle group"
                >
                  <!-- Document Name & ID -->
                  <td className="py-3 px-4 max-w-xs sm:max-w-md">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded bg-slate-100 border border-slate-200/60 flex items-center justify-center shrink-0 text-slate-600 font-bold text-[10px] uppercase">
                        ${doc.file_type}
                      </div>
                      <div className="min-w-0">
                        <p
                          onClick=${() => onViewDetails && onViewDetails(doc)}
                          className="font-medium text-slate-900 truncate hover:text-blue-600 cursor-pointer"
                          title=${doc.filename}
                        >
                          ${doc.filename}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono truncate" title=${doc.doc_id}>
                          ${doc.doc_id}
                        </p>
                      </div>
                    </div>
                  </td>

                  <!-- Type Badge -->
                  <td className="py-3 px-4">
                    <${Badge}
                      variant=${doc.file_type.toLowerCase() === 'pdf' ? 'primary' : 'success'}
                      size="xs"
                    >
                      ${doc.file_type.toUpperCase()}
                    <//>
                  </td>

                  <!-- Chunks -->
                  <td className="py-3 px-4 font-mono text-slate-700">
                    ${doc.chunk_count}
                  </td>

                  <!-- Pages -->
                  <td className="py-3 px-4 font-mono text-slate-500">
                    ${doc.page_count !== null && doc.page_count !== undefined ? doc.page_count : '—'}
                  </td>

                  <!-- Date -->
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                    ${formatDate(doc.created_at)}
                  </td>

                  <!-- Actions -->
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick=${() => onViewDetails && onViewDetails(doc)}
                        className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-subtle cursor-pointer"
                        title="View Metadata"
                      >
                        Details
                      </button>

                      <button
                        type="button"
                        onClick=${() => setDocToDelete(doc)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-subtle cursor-pointer"
                        title="Delete Document"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              `)}
            </tbody>
          </table>
        `}
      </div>

      <!-- Table Footer / Count -->
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
        <span>Showing <strong>${filteredDocs.length}</strong> of <strong>${documents.length}</strong> documents</span>
        <button
          type="button"
          onClick=${onRefresh}
          className="text-slate-400 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
          title="Refresh document list"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          <span>Sync</span>
        </button>
      </div>

      <!-- Delete Confirmation Dialog -->
      <${Modal}
        isOpen=${!!docToDelete}
        onClose=${() => !isDeleting && setDocToDelete(null)}
        title="Confirm Document Deletion"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Permanently purge "${docToDelete?.filename}"?
              </p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                This action will delete the document file and <strong>permanently purge all ${docToDelete?.chunk_count} vector embeddings</strong> from ChromaDB. Content from this document will never appear in future answers.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <${Button}
              variant="ghost"
              size="sm"
              onClick=${() => setDocToDelete(null)}
              disabled=${isDeleting}
            >
              Cancel
            <//>
            <${Button}
              variant="danger"
              size="sm"
              onClick=${confirmDelete}
              loading=${isDeleting}
            >
              Confirm Purge
            <//>
          </div>
        </div>
      <//>
    </div>
  `;
}
