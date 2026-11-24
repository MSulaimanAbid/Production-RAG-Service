import { html } from '../utils/html.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { CardSkeleton } from '../components/ui/Skeleton.js';

/**
 * OverviewPage Component.
 * Executive dashboard displaying system metrics: total documents indexed,
 * chunk counts, vector storage status, system health telemetry, and recent document activity.
 *
 * @param {Object} props
 * @param {Array<Object>} props.documents - List of documents in the knowledge base.
 * @param {Object|null} props.health - Backend health telemetry payload.
 * @param {Object|null} props.config - Public runtime configuration parameters.
 * @param {boolean} [props.loading] - Whether data is actively loading.
 * @param {(tab: string) => void} props.onNavigate - Callback to switch active navigation tab.
 * @param {() => void} props.onOpenUpload - Action to launch document uploader.
 * @param {(doc: Object) => void} props.onViewDoc - Action to view document details.
 */
export function OverviewPage({
  documents = [],
  health = null,
  config = null,
  loading = false,
  onNavigate,
  onOpenUpload,
  onViewDoc,
}) {
  const totalChunks = documents.reduce((sum, d) => sum + (d.chunk_count || 0), 0);
  const pdfCount = documents.filter((d) => d.file_type.toLowerCase() === 'pdf').length;
  const docxCount = documents.filter((d) => d.file_type.toLowerCase() === 'docx').length;
  const isHealthy = health?.status === 'ok';

  const recentDocs = [...documents]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  return html`
    <div className="space-y-6">
      <!-- Welcome Banner -->
      <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-medium mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
            Production RAG Intelligence
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            DocuMind Knowledge Base
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
            Upload enterprise documents, extract clean structural chunks, embed with 3072-dimensional Gemini vectors, and ask questions with strict citation grounding.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <${Button}
            variant="secondary"
            size="sm"
            onClick=${() => onNavigate('ask')}
            icon=${html`
              <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
            `}
          >
            Ask Questions
          <//>
          <${Button}
            variant="primary"
            size="sm"
            onClick=${onOpenUpload}
            icon=${html`
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            `}
          >
            Upload Document
          <//>
        </div>
      </div>

      <!-- Real Metrics Grid -->
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        ${loading ? html`
          <${CardSkeleton} />
          <${CardSkeleton} />
          <${CardSkeleton} />
          <${CardSkeleton} />
        ` : html`
          <!-- Total Documents -->
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Indexed Documents</span>
              <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 font-mono">${documents.length}</span>
              <span className="text-[11px] text-slate-400">files</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
              <span>${pdfCount} PDF &bull; ${docxCount} DOCX</span>
              <button
                type="button"
                onClick=${() => onNavigate('documents')}
                className="text-blue-600 hover:underline cursor-pointer"
              >
                Manage &rarr;
              </button>
            </div>
          </div>

          <!-- Total Vector Chunks -->
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Vector Chunks</span>
              <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
              </svg>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 font-mono">${totalChunks}</span>
              <span className="text-[11px] text-slate-400">embeddings</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
              <span>ChromaDB Persistent</span>
              <span className="font-mono text-slate-400">3072 dims</span>
            </div>
          </div>

          <!-- Model & Generation -->
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>LLM Generation</span>
              <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </div>
            <div className="mt-2">
              <span className="text-sm font-semibold text-slate-900 truncate block font-mono">
                ${config?.llm_model || 'gemini-3.5-flash-lite'}
              </span>
              <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Active with Fallback
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
              <span>Grounded Citations</span>
              <span className="font-mono text-slate-600">temp 0.1</span>
            </div>
          </div>

          <!-- Service Health -->
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>System Health</span>
              <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
              </svg>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-lg font-bold text-slate-900 capitalize">
                ${health?.status || 'Active'}
              </span>
              <${Badge} variant=${isHealthy ? 'success' : 'warning'} size="xs">
                ${isHealthy ? 'All Systems Go' : 'Degraded'}
              <//>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
              <span>API Gateway</span>
              <span className="font-mono text-slate-400">${health?.version ? `v${health.version}` : '1.0.0'}</span>
            </div>
          </div>
        `}
      </div>

      <!-- Quick Actions Grid -->
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick=${() => onNavigate('ask')}
          className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-subtle cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
            Ask Questions
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Query across your knowledge base and receive answers with verified inline document citations.
          </p>
        </div>

        <div
          onClick=${onOpenUpload}
          className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-emerald-400 hover:shadow-xs transition-subtle cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">
            Upload Documents
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Add new PDF policies, research papers, or DOCX playbooks with automatic duplicate detection.
          </p>
        </div>

        <div
          onClick=${() => onNavigate('settings')}
          className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-400 hover:shadow-xs transition-subtle cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-slate-900 group-hover:text-slate-800 transition-colors">
            Runtime Architecture
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Inspect retrieval thresholds, chunk sizes, ChromaDB storage paths, and live API dependencies.
          </p>
        </div>
      </div>

      <!-- Recent Documents Section -->
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Recent Documents</h3>
            <p className="text-[11px] text-slate-500">Latest files ingested into the knowledge base</p>
          </div>
          <${Button}
            variant="ghost"
            size="xs"
            onClick=${() => onNavigate('documents')}
          >
            View All Documents &rarr;
          <//>
        </div>

        <div className="divide-y divide-slate-100">
          ${recentDocs.length === 0 ? html`
            <div className="p-8 text-center text-xs text-slate-400">
              No documents uploaded yet.
            </div>
          ` : recentDocs.map((doc) => html`
            <div
              key=${doc.doc_id}
              className="p-3.5 hover:bg-slate-50/60 transition-subtle flex items-center justify-between gap-4 cursor-pointer"
              onClick=${() => onViewDoc && onViewDoc(doc)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-600 uppercase shrink-0">
                  ${doc.file_type}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate" title=${doc.filename}>
                    ${doc.filename}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    ${doc.chunk_count} chunks &bull; Ingested ${new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <${Badge}
                  variant=${doc.file_type.toLowerCase() === 'pdf' ? 'primary' : 'success'}
                  size="xs"
                >
                  ${doc.file_type.toUpperCase()}
                <//>
                <span className="text-slate-400 text-xs">&rarr;</span>
              </div>
            </div>
          `)}
        </div>
      </div>
    </div>
  `;
}
