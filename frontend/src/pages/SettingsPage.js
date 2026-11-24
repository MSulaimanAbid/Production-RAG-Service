import { html } from '../utils/html.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';

/**
 * SettingsPage Component.
 * Read-only diagnostic panel showing active AI runtime settings:
 * LLM model, embedding model, vector database collection parameters,
 * chunking strategy (sizes and overlaps), and live component health metrics.
 *
 * @param {Object} props
 * @param {Object|null} props.config - Public system configuration parameters.
 * @param {Object|null} props.health - Live system health telemetry object.
 * @param {() => void} props.onRefreshHealth - Handler to refresh component health.
 * @param {boolean} [props.loading] - Whether health check is currently pending.
 */
export function SettingsPage({
  config = null,
  health = null,
  onRefreshHealth,
  loading = false,
}) {
  const isHealthy = health?.status === 'ok';

  return html`
    <div className="space-y-6 max-w-4xl">
      <!-- Page Header -->
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            System & Runtime Configuration
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Live parameters powering the production retrieval and generation pipeline.
          </p>
        </div>

        <${Button}
          variant="secondary"
          size="sm"
          onClick=${onRefreshHealth}
          disabled=${loading}
          icon=${html`
            <svg className="w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          `}
        >
          Check Connectivity
        <//>
      </div>

      <!-- Service Health & Connectivity Section -->
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
            <h3 className="text-sm font-semibold text-slate-900">Infrastructure Health</h3>
          </div>
          <${Badge} variant=${isHealthy ? 'success' : 'warning'} size="xs">
            ${isHealthy ? 'Operational' : 'Degraded'}
          <//>
        </div>

        <div className="p-4 divide-y divide-slate-100 text-xs">
          <div className="py-2.5 first:pt-0 flex items-center justify-between">
            <div>
              <span className="font-medium text-slate-800">Vector Storage (ChromaDB)</span>
              <p className="text-[11px] text-slate-400">Persistent vector collection holding indexed embeddings</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-500">${health?.document_count ?? 0} docs</span>
              <${Badge} variant=${health?.vector_db?.status === 'ok' ? 'success' : 'danger'} size="xs">
                ${health?.vector_db?.status || 'ok'}
              <//>
            </div>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <div>
              <span className="font-medium text-slate-800">Google GenAI Embedding Service</span>
              <p className="text-[11px] text-slate-400">gemini-embedding-001 generating 3072-dimensional vectors</p>
            </div>
            <${Badge} variant=${health?.embedding_service?.status === 'ok' ? 'success' : 'danger'} size="xs">
              ${health?.embedding_service?.status || 'ok'}
            <//>
          </div>

          <div className="py-2.5 last:pb-0 flex items-center justify-between">
            <div>
              <span className="font-medium text-slate-800">Gemini LLM Generation Pipeline</span>
              <p className="text-[11px] text-slate-400">Grounded generation with multi-model fallback</p>
            </div>
            <${Badge} variant=${health?.llm_service?.status === 'ok' ? 'success' : 'danger'} size="xs">
              ${health?.llm_service?.status || 'ok'}
            <//>
          </div>
        </div>
      </div>

      <!-- Models & Inference Configuration -->
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          <h3 className="text-sm font-semibold text-slate-900">AI Model Stack</h3>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200/70">
            <span className="text-slate-400 text-[11px] block">Primary Generation LLM</span>
            <span className="font-semibold text-slate-900 font-mono text-xs mt-1 block">
              ${config?.llm_model || 'gemini-3.5-flash-lite'}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">
              Temperature: 0.1 (strict factual grounding). Automatic fallback to gemini-3.1-flash-lite and gemini-3.5-flash on rate limits.
            </p>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200/70">
            <span className="text-slate-400 text-[11px] block">Dense Embedding Model</span>
            <span className="font-semibold text-slate-900 font-mono text-xs mt-1 block">
              ${config?.embedding_model || 'gemini-embedding-001'}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">
              3072-dimensional vector space with cosine distance metric in ChromaDB.
            </p>
          </div>
        </div>
      </div>

      <!-- Ingestion & Retrieval Hyperparameters -->
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          </svg>
          <h3 className="text-sm font-semibold text-slate-900">Retrieval & Chunking Parameters</h3>
        </div>

        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-200/60">
            <span className="text-slate-400 text-[11px] block">Chunk Size</span>
            <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">
              ${config?.chunk_size || 512}
            </span>
            <span className="text-[10px] text-slate-400">tokens (Config A)</span>
          </div>

          <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-200/60">
            <span className="text-slate-400 text-[11px] block">Chunk Overlap</span>
            <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">
              ${config?.chunk_overlap || 50}
            </span>
            <span className="text-[10px] text-slate-400">tokens</span>
          </div>

          <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-200/60">
            <span className="text-slate-400 text-[11px] block">Similarity Cutoff</span>
            <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">
              ${config?.similarity_threshold || 0.35}
            </span>
            <span className="text-[10px] text-slate-400">cosine threshold</span>
          </div>

          <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-200/60">
            <span className="text-slate-400 text-[11px] block">Default Top-K</span>
            <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">
              ${config?.retrieval_top_k || 5}
            </span>
            <span className="text-[10px] text-slate-400">chunks fetched</span>
          </div>
        </div>
      </div>

      <!-- File Upload Limits & Guardrails -->
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
          <h3 className="text-sm font-semibold text-slate-900">Upload Limits & Active Guardrails</h3>
        </div>

        <div className="p-4 space-y-3 text-xs text-slate-600">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span>Maximum File Size</span>
            <span className="font-mono font-semibold text-slate-900">${config?.max_file_size_mb || 50} MB</span>
          </div>
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span>Allowed MIME Extensions</span>
            <span className="font-mono text-slate-700">${config?.allowed_extensions ? config.allowed_extensions.join(', ') : '.pdf, .docx'}</span>
          </div>
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span>Deduplication Mechanism</span>
            <span className="font-medium text-slate-800">SHA-256 Fingerprinting (HTTP 409 Conflict)</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Security Guardrails (Bonus F)</span>
            <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
              Input Sanitization + Secret Scrubbing + Neutralization Active
            </span>
          </div>
        </div>
      </div>
    </div>
  `;
}
