import { html, React } from '../utils/html.js';
import { Badge } from './ui/Badge.js';

export function RetrievedContextPanel({
  chunks = [],
  selectedChunkId = null,
  onSelectChunk = null,
}) {
  const { useState, useEffect, useRef } = React;
  const [filterText, setFilterText] = useState('');
  const chunkRefs = useRef({});

  useEffect(() => {
    if (selectedChunkId && chunkRefs.current[selectedChunkId]) {
      chunkRefs.current[selectedChunkId].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedChunkId]);

  if (!chunks || chunks.length === 0) {
    return html`
      <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
        <svg className="w-8 h-8 text-slate-300 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
        </svg>
        <p className="font-medium text-slate-600">No context retrieved yet</p>
        <p className="mt-1 text-[11px]">Submit a question to inspect retrieved vector chunks.</p>
      </div>
    `;
  }

  const filteredChunks = chunks.filter((c) => {
    if (!filterText) return true;
    const q = filterText.toLowerCase();
    return (
      c.filename.toLowerCase().includes(q) ||
      c.text.toLowerCase().includes(q) ||
      (c.section && c.section.toLowerCase().includes(q))
    );
  });

  return html`
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col h-full overflow-hidden">
      <!-- Panel Header -->
      <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            <h3 className="text-xs font-semibold text-slate-900 tracking-tight">
              Retrieved Context
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100/70 text-blue-700 font-semibold">
              ${chunks.length} ${chunks.length === 1 ? 'chunk' : 'chunks'}
            </span>
          </div>

          <span className="text-[10px] text-slate-400 font-mono">
            threshold: ≥0.35
          </span>
        </div>

        <!-- Filter within chunks -->
        ${chunks.length > 3 && html`
          <input
            type="text"
            value=${filterText}
            onChange=${(e) => setFilterText(e.target.value)}
            placeholder="Filter chunk text..."
            className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-500 placeholder:text-slate-400 text-slate-800"
          />
        `}

        <!-- Similarity score explanation banner -->
        <p className="text-[10px] text-slate-500 leading-tight">
          Scores represent cosine similarity (0.0 to 1.0) against 3072-dim Gemini embeddings. Higher values denote closer semantic alignment.
        </p>
      </div>

      <!-- Chunks List -->
      <div className="flex-1 overflow-y-auto p-3 space-y-3 divide-y divide-slate-100">
        ${filteredChunks.map((chunk, idx) => {
          const isSelected = selectedChunkId === chunk.chunk_id;
          const scorePercent = Math.min(100, Math.round(chunk.similarity_score * 100));
          const locText = chunk.page !== null && chunk.page !== undefined
            ? `Page ${chunk.page}`
            : (chunk.section || 'General');

          return html`
            <div
              key=${chunk.chunk_id}
              ref=${(el) => (chunkRefs.current[chunk.chunk_id] = el)}
              onClick=${() => onSelectChunk && onSelectChunk(chunk.chunk_id)}
              className="pt-3 first:pt-0 transition-subtle rounded-lg p-2.5 ${
                isSelected
                  ? 'bg-blue-50/50 border border-blue-400 ring-2 ring-blue-500/10'
                  : 'hover:bg-slate-50/70'
              }"
            >
              <!-- Chunk Header -->
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    #${String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="text-xs font-semibold text-slate-900 truncate" title=${chunk.filename}>
                    ${chunk.filename}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <${Badge} variant="default" size="xs">
                    ${locText}
                  <//>
                  <${Badge} variant="score" size="xs">
                    ${(chunk.similarity_score).toFixed(3)}
                  <//>
                </div>
              </div>

              <!-- Similarity Score Visual Bar -->
              <div className="mb-2">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                  <span>Cosine Similarity</span>
                  <span className="font-mono font-medium text-slate-600">${scorePercent}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300 ${
                      chunk.similarity_score >= 0.75
                        ? 'bg-emerald-500'
                        : chunk.similarity_score >= 0.50
                        ? 'bg-blue-500'
                        : 'bg-amber-500'
                    }"
                    style=${{ width: `${scorePercent}%` }}
                  ></div>
                </div>
              </div>

              <!-- Chunk Text -->
              <div className="bg-slate-50/80 rounded-md p-2.5 border border-slate-200/60 font-mono text-xs text-slate-700 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap select-text">
                ${chunk.text}
              </div>

              <!-- Technical metadata -->
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span title=${chunk.chunk_id}>ID: ${chunk.chunk_id.slice(0, 16)}...</span>
                <span>chunk index: ${chunk.chunk_index}</span>
              </div>
            </div>
          `;
        })}
      </div>
    </div>
  `;
}
