import { html, React } from '../utils/html.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { CitationCard } from '../components/CitationCard.js';
import { RetrievedContextPanel } from '../components/RetrievedContextPanel.js';
import { MarkdownRenderer } from '../components/MarkdownRenderer.js';
import { AnswerSkeleton } from '../components/ui/Skeleton.js';
import { api } from '../services/api.js';

export function AskAIPage({
  documents = [],
  onNotify,
  onOpenUpload,
}) {
  const { useState, useRef, useEffect } = React;
  
  const [question, setQuestion] = useState('');
  const [selectedDocId, setSelectedDocId] = useState(''); // '' means entire corpus
  const [topK, setTopK] = useState(5);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.35);
  const [showConfig, setShowConfig] = useState(false);

  const [isAsking, setIsAsking] = useState(false);
  const [answerData, setAnswerData] = useState(null);
  const [selectedChunkId, setSelectedChunkId] = useState(null);

  const textareaRef = useRef(null);

  // Auto-focus question input on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleAsk = async (queryText = null) => {
    const q = (queryText || question).trim();
    if (!q || isAsking) return;

    if (q.length < 3) {
      onNotify({
        type: 'error',
        title: 'Validation Error',
        message: 'Question must be at least 3 characters long.',
      });
      return;
    }

    if (q.length > 1000) {
      onNotify({
        type: 'error',
        title: 'Validation Error',
        message: 'Question cannot exceed 1,000 characters.',
      });
      return;
    }

    setIsAsking(true);
    setAnswerData(null);
    setSelectedChunkId(null);

    try {
      const docIds = selectedDocId ? [selectedDocId] : null;
      const res = await api.askQuestion({
        question: q,
        topK,
        similarityThreshold,
        docIds,
      });

      setAnswerData(res);
      if (res.retrieved_chunks && res.retrieved_chunks.length > 0) {
        setSelectedChunkId(res.retrieved_chunks[0].chunk_id);
      }
    } catch (err) {
      console.error('Ask failed:', err);
      let errMsg = err.detail || err.message || 'Failed to generate answer.';
      if (err.status === 400 && errMsg.includes('injection')) {
        errMsg = 'Security Guardrail: Input contained prohibited prompt injection patterns.';
      }
      onNotify({
        type: 'error',
        title: 'Query Failed',
        message: errMsg,
      });
    } finally {
      setIsAsking(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  const handleCitationClick = ({ filename, page, section }) => {
    if (!answerData?.retrieved_chunks) return;
    
    // Find matching chunk
    const matched = answerData.retrieved_chunks.find((c) => {
      const fnMatch = c.filename.toLowerCase().includes(filename.toLowerCase()) ||
                      filename.toLowerCase().includes(c.filename.toLowerCase());
      if (!fnMatch) return false;
      if (page && c.page !== null && c.page !== undefined) {
        return Number(page) === Number(c.page);
      }
      if (section && c.section) {
        return c.section.toLowerCase().includes(section.toLowerCase());
      }
      return true;
    });

    if (matched) {
      setSelectedChunkId(matched.chunk_id);
    }
  };

  // Authentic prompt starters from the actual corpus
  const samplePrompts = [
    {
      title: 'Remote Work Policy',
      query: 'What is the maximum reimbursement for home office equipment provided to Tier A remote employees?',
      doc: 'acme_global_remote_work_policy.docx',
    },
    {
      title: 'Incident Playbook',
      query: 'What are the target first response and resolution SLAs for a P1 critical incident?',
      doc: 'cloud_infrastructure_incident_playbook.docx',
    },
    {
      title: 'Attention Mechanism',
      query: 'What is the attention mechanism in Transformer models?',
      doc: 'attention_is_all_you_need.pdf',
    },
    {
      title: 'Artemis Mission',
      query: 'Why is the lunar south pole targeted for resource exploration in Artemis?',
      doc: 'nasa_artemis_mission_overview.docx',
    },
  ];

  return html`
    <div className="space-y-6">
      <!-- Main Workspace: Split into Left (Input & Answer) and Right (Retrieved Context) -->
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <!-- Left Column: Input + Answer (7 cols) -->
        <div className="lg:col-span-7 space-y-5">
          <!-- Question Input Box -->
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-3.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-subtle">
            <!-- Top Controls (Scope Selector + Settings toggle) -->
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <!-- Scope selector -->
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-slate-400 font-medium shrink-0">Scope:</span>
                <select
                  value=${selectedDocId}
                  onChange=${(e) => setSelectedDocId(e.target.value)}
                  disabled=${isAsking}
                  className="bg-slate-50 text-slate-800 text-xs font-medium border border-slate-200 rounded-md px-2 py-1 max-w-[200px] truncate focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">All Documents (${documents.length})</option>
                  ${documents.map((d) => html`
                    <option key=${d.doc_id} value=${d.doc_id}>
                      ${d.filename}
                    </option>
                  `)}
                </select>
              </div>

              <!-- Advanced Settings Toggle -->
              <button
                type="button"
                onClick=${() => setShowConfig(!showConfig)}
                className="text-slate-400 hover:text-slate-700 flex items-center gap-1 text-[11px] font-medium cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                <span>${showConfig ? 'Hide Config' : 'Tuning'}</span>
              </button>
            </div>

            <!-- Collapsible Retrieval Controls -->
            ${showConfig && html`
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70 grid grid-cols-2 gap-3 text-xs animate-in fade-in duration-100">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">
                    Top-K Chunks: <strong className="font-mono text-slate-900">${topK}</strong>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value=${topK}
                    onChange=${(e) => setTopK(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">
                    Min Similarity: <strong className="font-mono text-slate-900">${similarityThreshold.toFixed(2)}</strong>
                  </label>
                  <input
                    type="range"
                    min="0.10"
                    max="0.80"
                    step="0.05"
                    value=${similarityThreshold}
                    onChange=${(e) => setSimilarityThreshold(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            `}

            <!-- Textarea -->
            <div className="relative">
              <textarea
                ref=${textareaRef}
                value=${question}
                onChange=${(e) => setQuestion(e.target.value)}
                onKeyDown=${handleKeyDown}
                disabled=${isAsking}
                placeholder="Ask a question about your indexed documents..."
                rows="3"
                className="w-full text-sm text-slate-900 placeholder:text-slate-400 bg-transparent resize-none border-0 p-0 focus:outline-none focus:ring-0 leading-relaxed disabled:opacity-50"
              />
            </div>

            <!-- Bottom Row: Hints & Submit Button -->
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="hidden sm:inline">Press <kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px]">Enter</kbd> to submit</span>
                <span className="hidden sm:inline">&bull;</span>
                <span className="hidden sm:inline"><kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px]">Shift+Enter</kbd> for newline</span>
                <span className="font-mono text-[10px] ${question.length > 900 ? 'text-amber-600' : ''}">
                  ${question.length}/1000
                </span>
              </div>

              <div className="flex items-center gap-2">
                ${question && html`
                  <${Button}
                    variant="ghost"
                    size="sm"
                    onClick=${() => setQuestion('')}
                    disabled=${isAsking}
                  >
                    Clear
                  <//>
                `}

                <${Button}
                  variant="primary"
                  size="sm"
                  onClick=${() => handleAsk()}
                  disabled=${!question.trim() || isAsking}
                  loading=${isAsking}
                  icon=${html`
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  `}
                >
                  Ask AI
                <//>
              </div>
            </div>
          </div>

          <!-- Answer Presentation Section -->
          ${isAsking && html`
            <${AnswerSkeleton} />
          `}

          ${answerData && !isAsking && html`
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden animate-in fade-in duration-150">
              <!-- Answer Meta Bar -->
              <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full ${answerData.answerable ? 'bg-emerald-500' : 'bg-amber-500'}"></div>
                  <span className="font-semibold text-slate-800">
                    ${answerData.answerable ? 'Grounded Response' : 'Out-of-Domain Refusal'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                  <span>Latency: <strong>${answerData.latency_ms} ms</strong></span>
                  <span>&bull;</span>
                  <span>Citations: <strong>${answerData.citations?.length || 0}</strong></span>
                </div>
              </div>

              <!-- Question Echo -->
              <div className="px-5 pt-4 pb-2 border-b border-slate-100/70">
                <p className="text-xs text-slate-400 font-medium">Question</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5 leading-snug">
                  ${answerData.question}
                </p>
              </div>

              <!-- Answer Body -->
              <div className="p-5">
                ${!answerData.answerable ? html`
                  <!-- Refusal Banner (Section 9 requirement) -->
                  <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200/80 text-amber-900 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <svg className="w-4 h-4 text-amber-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      <span>Information Absent From Knowledge Base</span>
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      ${answerData.answer}
                    </p>
                    <p className="text-[11px] text-amber-700/80 pt-1 border-t border-amber-200/50">
                      The system strictly refused to invent facts because no retrieved chunks met the required similarity threshold of <strong>≥${similarityThreshold}</strong>.
                    </p>
                  </div>
                ` : html`
                  <${MarkdownRenderer}
                    content=${answerData.answer}
                    onCitationClick=${handleCitationClick}
                  />
                `}
              </div>

              <!-- Citations Section -->
              ${answerData.citations && answerData.citations.length > 0 && html`
                <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                      </svg>
                      Verified Citations (${answerData.citations.length})
                    </h4>
                    <span className="text-[10px] text-slate-400">Click a card to inspect source context</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    ${answerData.citations.map((c) => html`
                      <${CitationCard}
                        key=${c.chunk_id}
                        citation=${c}
                        isSelected=${selectedChunkId === c.chunk_id}
                        onSelectChunk=${(id) => setSelectedChunkId(id)}
                      />
                    `)}
                  </div>
                </div>
              `}
            </div>
          `}

          <!-- Empty State / Corpus Starters (Section 7 requirement) -->
          ${!answerData && !isAsking && html`
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                  AI
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Document Question Answering</h3>
                  <p className="text-xs text-slate-500">Every claim is grounded in retrieved chunks with validated citations.</p>
                </div>
              </div>

              <!-- How it works steps -->
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="font-bold text-blue-600 font-mono text-[11px] block">01 / RETRIEVE</span>
                  <p className="text-slate-600 mt-1 leading-snug">Embed query & search ChromaDB for top matching chunks.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="font-bold text-blue-600 font-mono text-[11px] block">02 / FILTER & REFUSE</span>
                  <p className="text-slate-600 mt-1 leading-snug">Filter chunks by similarity cutoff. Refuse if empty.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="font-bold text-blue-600 font-mono text-[11px] block">03 / GROUND & CITE</span>
                  <p className="text-slate-600 mt-1 leading-snug">Generate answer citing exact pages/sections with zero hallucination.</p>
                </div>
              </div>

              <!-- Sample questions derived from corpus -->
              <div className="pt-2">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Sample Questions from Indexed Corpus
                </p>
                <div className="grid grid-cols-1 gap-2">
                  ${samplePrompts.map((p, idx) => html`
                    <button
                      key=${idx}
                      type="button"
                      onClick=${() => {
                        setQuestion(p.query);
                        handleAsk(p.query);
                      }}
                      className="w-full text-left p-2.5 rounded-lg border border-slate-200/70 hover:border-blue-400 hover:bg-blue-50/20 transition-subtle cursor-pointer group"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
                          ${p.query}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                          ${p.title} &rarr;
                        </span>
                      </div>
                    </button>
                  `)}
                </div>
              </div>
            </div>
          `}
        </div>

        <!-- Right Column: Retrieved Context Inspector (5 cols) (Section 8 requirement) -->
        <div className="lg:col-span-5 h-[calc(100vh-140px)] sticky top-20">
          <${RetrievedContextPanel}
            chunks=${answerData?.retrieved_chunks || []}
            selectedChunkId=${selectedChunkId}
            onSelectChunk=${(id) => setSelectedChunkId(id)}
          />
        </div>
      </div>
    </div>
  `;
}
