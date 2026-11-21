import htm from '/static/vendor/htm.module.js';

const { useState, useEffect, useRef, useMemo } = window.React;
const html = htm.bind(window.React.createElement);

// ── API Client ───────────────────────────────────────────────────────────────
const API_BASE = window.location.origin.includes(':8000')
  ? window.location.origin
  : 'http://127.0.0.1:8000';

class ApiClientError extends Error {
  constructor(status, error, detail, requestId = null) {
    super(detail || error || `HTTP Error ${status}`);
    this.name = 'ApiClientError';
    this.status = status;
    this.error = error;
    this.detail = detail;
    this.requestId = requestId;
  }
}

async function handleResponse(res) {
  const contentType = res.headers.get('content-type') || '';
  let data = null;

  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = { detail: 'Failed to parse JSON server response.' };
    }
  } else {
    const text = await res.text();
    data = { detail: text || `HTTP ${res.status}` };
  }

  if (!res.ok) {
    const error = data?.error || `STATUS_${res.status}`;
    const detail = data?.detail || 'An unexpected error occurred.';
    const requestId = data?.request_id || res.headers.get('X-Request-ID') || null;
    throw new ApiClientError(res.status, error, detail, requestId);
  }

  return data;
}

const api = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/api/health`);
    return handleResponse(res);
  },
  async getConfig() {
    const res = await fetch(`${API_BASE}/api/config`);
    return handleResponse(res);
  },
  async listDocuments() {
    const res = await fetch(`${API_BASE}/api/documents`);
    return handleResponse(res);
  },
  async getDocument(docId) {
    const res = await fetch(`${API_BASE}/api/documents/${encodeURIComponent(docId)}`);
    return handleResponse(res);
  },
  async uploadDocument(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/api/documents`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(res);
  },
  async deleteDocument(docId) {
    const res = await fetch(`${API_BASE}/api/documents/${encodeURIComponent(docId)}`, {
      method: 'DELETE',
    });
    if (res.status === 204) return { success: true };
    return handleResponse(res);
  },
  async askQuestion({ question, topK = 5, similarityThreshold = 0.35, docIds = null }) {
    const payload = {
      question: question.trim(),
      top_k: Number(topK),
      similarity_threshold: Number(similarityThreshold),
      doc_ids: Array.isArray(docIds) && docIds.length > 0 ? docIds : null,
    };
    const res = await fetch(`${API_BASE}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },
};

// ── UI Components ─────────────────────────────────────────────────────────────
function Badge({ children, variant = 'default', size = 'sm', className = '' }) {
  const baseClasses = 'inline-flex items-center font-medium rounded-full transition-subtle';
  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[10px] leading-tight',
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-xs',
  }[size] || 'px-2.5 py-0.5 text-xs';

  const variantClasses = {
    default: 'bg-slate-100 text-slate-700 border border-slate-200/80',
    primary: 'bg-blue-50 text-blue-700 border border-blue-200/80',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200/80',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200/80',
    mono: 'bg-slate-100 text-slate-800 font-mono text-[11px] border border-slate-200',
    score: 'bg-indigo-50 text-indigo-700 font-mono font-semibold border border-indigo-200',
  }[variant] || 'bg-slate-100 text-slate-700 border border-slate-200';

  return html`
    <span className="${baseClasses} ${sizeClasses} ${variantClasses} ${className}">
      ${children}
    </span>
  `;
}

function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon = null,
  className = '',
  title = '',
}) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-subtle select-none focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]';
  const sizeClasses = {
    xs: 'px-2.5 py-1 text-xs gap-1.5',
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-3.5 py-2 text-sm gap-2',
    lg: 'px-4 py-2.5 text-sm gap-2.5',
    icon: 'p-2 text-slate-500 hover:text-slate-800',
  }[size] || 'px-3.5 py-2 text-sm gap-2';

  const variantClasses = {
    primary: 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm focus:ring-slate-900/30',
    accent: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm focus:ring-blue-500/30',
    secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-xs focus:ring-slate-300',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 focus:ring-slate-200',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm focus:ring-rose-500/30',
    dangerGhost: 'bg-transparent hover:bg-rose-50 text-rose-600 hover:text-rose-700 focus:ring-rose-200',
  }[variant] || 'bg-slate-900 text-white';

  return html`
    <button
      type=${type}
      onClick=${onClick}
      disabled=${disabled || loading}
      title=${title}
      className="${baseClasses} ${sizeClasses} ${variantClasses} ${className}"
    >
      ${loading && html`
        <svg className="animate-spin -ml-0.5 h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
      `}
      ${!loading && icon && html`<span className="shrink-0 flex items-center">${icon}</span>`}
      <span>${children}</span>
    </button>
  `;
}

function Input({
  value,
  onChange,
  onKeyDown,
  placeholder = '',
  type = 'text',
  icon = null,
  clearable = false,
  onClear = null,
  disabled = false,
  className = '',
  autoFocus = false,
}) {
  return html`
    <div className="relative flex items-center w-full">
      ${icon && html`<span className="absolute left-3 text-slate-400 pointer-events-none flex items-center">${icon}</span>`}
      <input
        type=${type}
        value=${value}
        onChange=${onChange}
        onKeyDown=${onKeyDown}
        placeholder=${placeholder}
        disabled=${disabled}
        autoFocus=${autoFocus}
        className="w-full bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-lg border border-slate-200/90 shadow-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-subtle py-2 ${
          icon ? 'pl-9' : 'pl-3.5'
        } ${clearable && value ? 'pr-8' : 'pr-3.5'} ${className}"
      />
      ${clearable && value && html`
        <button
          type="button"
          onClick=${onClear}
          className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `}
    </div>
  `;
}

function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return html`
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity" onClick=${onClose} />
      <div className="relative bg-white rounded-xl shadow-xl border border-slate-200/80 w-full ${maxWidth} z-10 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900 tracking-tight">${title}</h3>
          <button type="button" onClick=${onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-subtle cursor-pointer">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="p-5">${children}</div>
      </div>
    </div>
  `;
}

function ToastContainer({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return html`
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      ${toasts.map((toast) => html`
        <div key=${toast.id} className="pointer-events-auto bg-white rounded-lg shadow-lg border border-slate-200/90 p-3.5 flex items-start gap-3 transform transition-all animate-in slide-in-from-bottom-2 duration-150">
          <div className="shrink-0 mt-0.5">
            ${toast.type === 'success' && html`<svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"></path></svg>`}
            ${toast.type === 'error' && html`<svg className="w-4 h-4 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`}
            ${toast.type === 'info' && html`<svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`}
          </div>
          <div className="flex-1 min-w-0">
            ${toast.title && html`<p className="text-xs font-semibold text-slate-900">${toast.title}</p>`}
            <p className="text-xs text-slate-600 break-words mt-0.5 leading-relaxed">${toast.message}</p>
          </div>
          <button type="button" onClick=${() => onDismiss(toast.id)} className="shrink-0 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer">
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

function TableSkeleton({ rows = 5 }) {
  return html`
    <div className="w-full space-y-3">
      ${Array.from({ length: rows }).map((_, i) => html`
        <div key=${i} className="flex items-center gap-4 py-3 border-b border-slate-100 animate-pulse">
          <div className="w-8 h-8 rounded-lg bg-slate-200 shrink-0"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 rounded w-1/3"></div>
            <div className="h-3 bg-slate-100 rounded w-1/4"></div>
          </div>
          <div className="w-20 h-5 bg-slate-100 rounded-full"></div>
          <div className="w-16 h-4 bg-slate-100 rounded"></div>
        </div>
      `)}
    </div>
  `;
}

function CardSkeleton() {
  return html`
    <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="w-24 h-4 bg-slate-200 rounded"></div>
        <div className="w-6 h-6 bg-slate-100 rounded-md"></div>
      </div>
      <div className="w-16 h-7 bg-slate-300 rounded"></div>
      <div className="w-32 h-3 bg-slate-100 rounded"></div>
    </div>
  `;
}

function AnswerSkeleton() {
  return html`
    <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-4 animate-pulse">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="w-32 h-4 bg-slate-200 rounded"></div>
        <div className="w-20 h-4 bg-slate-100 rounded"></div>
      </div>
      <div className="space-y-2.5">
        <div className="h-4 bg-slate-200 rounded w-full"></div>
        <div className="h-4 bg-slate-200 rounded w-11/12"></div>
        <div className="h-4 bg-slate-200 rounded w-4/5"></div>
        <div className="h-4 bg-slate-100 rounded w-2/3"></div>
      </div>
      <div className="flex gap-2 pt-2">
        <div className="w-28 h-6 bg-blue-50 rounded-md"></div>
        <div className="w-32 h-6 bg-blue-50 rounded-md"></div>
      </div>
    </div>
  `;
}

// ── Sidebar & Header ─────────────────────────────────────────────────────────
function Sidebar({ activeTab, onSelectTab, health, isMobileOpen, onCloseMobile }) {
  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: html`<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect></svg>`,
    },
    {
      id: 'documents',
      label: 'Documents',
      badge: health?.document_count !== undefined ? String(health.document_count) : null,
      icon: html`<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
    },
    {
      id: 'ask',
      label: 'Ask AI',
      highlight: true,
      icon: html`<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: html`<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
    },
  ];

  const handleNavClick = (id) => {
    onSelectTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  const isHealthy = health?.status === 'ok';

  return html`
    ${isMobileOpen && html`<div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden" onClick=${onCloseMobile} />`}
    <aside className="fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-tighter shadow-xs">
            <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-900 tracking-tight leading-none">DocuMind</h1>
            <p className="text-[11px] text-slate-400 font-medium tracking-tight mt-0.5">Document Intelligence</p>
          </div>
        </div>
        <button type="button" onClick=${onCloseMobile} className="lg:hidden p-1 text-slate-400 hover:text-slate-600 rounded-md">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-2.5 pb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Workspace</p>
        ${navItems.map((item) => {
          const isActive = activeTab === item.id;
          return html`
            <button
              key=${item.id}
              type="button"
              onClick=${() => handleNavClick(item.id)}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-subtle cursor-pointer select-none ${isActive ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}"
            >
              <div className="flex items-center gap-2.5">
                <span className="${isActive ? 'text-blue-600' : 'text-slate-400'}">${item.icon}</span>
                <span>${item.label}</span>
              </div>
              ${item.badge && html`<span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-200/70 text-slate-700">${item.badge}</span>`}
            </button>
          `;
        })}
      </div>

      <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-white border border-slate-200/60 shadow-2xs text-[11px]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full ${isHealthy ? 'bg-emerald-400 opacity-75' : 'bg-amber-400 opacity-75'}"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 ${isHealthy ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
            </span>
            <span className="text-slate-600 font-medium">${isHealthy ? 'System Active' : 'Degraded'}</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">${health?.version ? `v${health.version}` : 'v1.0.0'}</span>
        </div>
        <div className="flex items-center justify-between px-2.5 text-[11px] text-slate-400">
          <span>Enterprise RAG</span>
          <a href="/docs" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 hover:underline flex items-center gap-1 transition-subtle">
            <span>OpenAPI</span>
            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          </a>
        </div>
      </div>
    </aside>
  `;
}

function Header({ title, subtitle, onOpenUpload, onToggleMobile, totalDocs = 0 }) {
  return html`
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200/80 px-4 sm:px-6 py-3.5 flex items-center justify-between transition-subtle">
      <div className="flex items-center gap-3">
        <button type="button" onClick=${onToggleMobile} className="lg:hidden p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-subtle cursor-pointer" aria-label="Open sidebar">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight leading-tight">${title}</h2>
          ${subtitle && html`<p className="text-xs text-slate-500 font-normal leading-tight hidden sm:block mt-0.5">${subtitle}</p>`}
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="hidden md:flex items-center text-xs text-slate-500 bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-md gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
          <span>Corpus:</span>
          <span className="font-semibold text-slate-700">${totalDocs} ${totalDocs === 1 ? 'doc' : 'docs'}</span>
        </div>
        <${Button} variant="primary" size="sm" onClick=${onOpenUpload} icon=${html`<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`}>
          Upload Document
        <//>
      </div>
    </header>
  `;
}

// ── Citations & Context Inspector ───────────────────────────────────────────
function CitationCard({ citation, onSelectChunk, isSelected = false }) {
  const locText = citation.page !== null && citation.page !== undefined ? `Page ${citation.page}` : (citation.section || 'General');
  return html`
    <div
      onClick=${() => onSelectChunk && onSelectChunk(citation.chunk_id)}
      className="bg-white rounded-lg p-3 border transition-subtle cursor-pointer select-none text-left ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/15 bg-blue-50/20' : 'border-slate-200/80 hover:border-slate-300 hover:shadow-xs'}"
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <svg className="w-3.5 h-3.5 text-blue-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          <span className="text-xs font-semibold text-slate-900 truncate" title=${citation.filename}>${citation.filename}</span>
        </div>
        <${Badge} variant="primary" size="xs">${locText}<//>
      </div>
      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed italic bg-slate-50/60 p-1.5 rounded border border-slate-100">
        "${citation.excerpt}"
      </p>
      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 text-[10px] text-slate-400">
        <span className="font-mono truncate">ID: ${citation.chunk_id.slice(0, 14)}...</span>
        <span className="text-blue-600 font-medium hover:underline">View Chunk &rarr;</span>
      </div>
    </div>
  `;
}

function RetrievedContextPanel({ chunks = [], selectedChunkId = null, onSelectChunk = null }) {
  const [filterText, setFilterText] = useState('');
  const chunkRefs = useRef({});

  useEffect(() => {
    if (selectedChunkId && chunkRefs.current[selectedChunkId]) {
      chunkRefs.current[selectedChunkId].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedChunkId]);

  if (!chunks || chunks.length === 0) {
    return html`
      <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
        <svg className="w-8 h-8 text-slate-300 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
        <p className="font-medium text-slate-600">No context retrieved yet</p>
        <p className="mt-1 text-[11px]">Submit a question to inspect retrieved vector chunks.</p>
      </div>
    `;
  }

  const filteredChunks = chunks.filter((c) => {
    if (!filterText) return true;
    const q = filterText.toLowerCase();
    return c.filename.toLowerCase().includes(q) || c.text.toLowerCase().includes(q) || (c.section && c.section.toLowerCase().includes(q));
  });

  return html`
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col h-full overflow-hidden">
      <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            <h3 className="text-xs font-semibold text-slate-900 tracking-tight">Retrieved Context</h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100/70 text-blue-700 font-semibold">${chunks.length} ${chunks.length === 1 ? 'chunk' : 'chunks'}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">threshold: ≥0.35</span>
        </div>
        ${chunks.length > 3 && html`<input type="text" value=${filterText} onChange=${(e) => setFilterText(e.target.value)} placeholder="Filter chunk text..." className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-500 placeholder:text-slate-400 text-slate-800" />`}
        <p className="text-[10px] text-slate-500 leading-tight">Scores represent cosine similarity (0.0 to 1.0) against 3072-dim Gemini embeddings.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 divide-y divide-slate-100">
        ${filteredChunks.map((chunk, idx) => {
          const isSelected = selectedChunkId === chunk.chunk_id;
          const scorePercent = Math.min(100, Math.round(chunk.similarity_score * 100));
          const locText = chunk.page !== null && chunk.page !== undefined ? `Page ${chunk.page}` : (chunk.section || 'General');

          return html`
            <div
              key=${chunk.chunk_id}
              ref=${(el) => (chunkRefs.current[chunk.chunk_id] = el)}
              onClick=${() => onSelectChunk && onSelectChunk(chunk.chunk_id)}
              className="pt-3 first:pt-0 transition-subtle rounded-lg p-2.5 ${isSelected ? 'bg-blue-50/50 border border-blue-400 ring-2 ring-blue-500/10' : 'hover:bg-slate-50/70'}"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-mono font-bold text-slate-400">#${String(idx + 1).padStart(2, '0')}</span>
                  <span className="text-xs font-semibold text-slate-900 truncate" title=${chunk.filename}>${chunk.filename}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <${Badge} variant="default" size="xs">${locText}<//>
                  <${Badge} variant="score" size="xs">${(chunk.similarity_score).toFixed(3)}<//>
                </div>
              </div>

              <div className="mb-2">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                  <span>Cosine Similarity</span>
                  <span className="font-mono font-medium text-slate-600">${scorePercent}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-300 ${chunk.similarity_score >= 0.75 ? 'bg-emerald-500' : chunk.similarity_score >= 0.50 ? 'bg-blue-500' : 'bg-amber-500'}" style=${{ width: `${scorePercent}%` }}></div>
                </div>
              </div>

              <div className="bg-slate-50/80 rounded-md p-2.5 border border-slate-200/60 font-mono text-xs text-slate-700 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap select-text">
                ${chunk.text}
              </div>
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

// ── Markdown Parser ──────────────────────────────────────────────────────────
const CITATION_REGEX = /\[Source:\s*([^,\]]+)(?:,\s*(?:page\s*(\d+)|section\s*['"]?([^'"]+)['"]?))?\]/gi;

function MarkdownRenderer({ content = '', onCitationClick }) {
  if (!content) return null;
  const paragraphs = content.split(/\n\n+/);

  const renderInlineFormatted = (text) => {
    const elements = [];
    let lastIndex = 0;
    let match;
    const regex = new RegExp(CITATION_REGEX);

    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index;
      const fullMatch = match[0];
      const filename = match[1].trim();
      const page = match[2] ? match[2].trim() : null;
      const section = match[3] ? match[3].trim() : null;

      if (matchIndex > lastIndex) {
        elements.push(renderBasicFormatting(text.substring(lastIndex, matchIndex)));
      }

      const citationLabel = page ? `p.${page}` : (section ? `'${section}'` : 'doc');
      elements.push(html`
        <button
          key=${matchIndex}
          type="button"
          onClick=${(e) => {
            e.stopPropagation();
            if (onCitationClick) onCitationClick({ filename, page, section });
          }}
          className="citation-tag"
          title="Click to view verified chunk context from ${filename}"
        >
          <svg className="w-2.5 h-2.5 text-blue-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          <span className="truncate max-w-[140px]">${filename}</span>
          <span className="text-blue-500 font-semibold">${citationLabel}</span>
        </button>
      `);
      lastIndex = matchIndex + fullMatch.length;
    }

    if (lastIndex < text.length) {
      elements.push(renderBasicFormatting(text.substring(lastIndex)));
    }
    return elements;
  };

  const renderBasicFormatting = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return html`<strong key=${i} className="font-semibold text-slate-900">${part.slice(2, -2)}</strong>`;
      if (part.startsWith('`') && part.endsWith('`')) return html`<code key=${i} className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-xs font-mono border border-slate-200">${part.slice(1, -1)}</code>`;
      return part;
    });
  };

  return html`
    <div className="prose-rag space-y-3">
      ${paragraphs.map((p, idx) => {
        const trimmed = p.trim();
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const listItems = trimmed.split(/\n[-*]\s+/).map((item) => item.replace(/^[-*]\s+/, ''));
          return html`<ul key=${idx} className="list-disc pl-5 space-y-1">${listItems.map((li, lIdx) => html`<li key=${lIdx} className="text-slate-800 leading-relaxed">${renderInlineFormatted(li)}</li>`)}</ul>`;
        }
        if (trimmed.startsWith('### ')) return html`<h4 key=${idx} className="text-sm font-semibold text-slate-900 tracking-tight mt-3">${renderInlineFormatted(trimmed.slice(4))}</h4>`;
        if (trimmed.startsWith('## ')) return html`<h3 key=${idx} className="text-base font-semibold text-slate-900 tracking-tight mt-4">${renderInlineFormatted(trimmed.slice(3))}</h3>`;
        return html`<p key=${idx} className="text-slate-800 leading-relaxed">${renderInlineFormatted(trimmed)}</p>`;
      })}
    </div>
  `;
}

// ── Modals & Document Table ──────────────────────────────────────────────────
function DocumentUploadModal({ isOpen, onClose, onUploadSuccess, onNotify, maxSizeMb = 50 }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [stepMessage, setStepMessage] = useState('');
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const resetState = () => {
    setSelectedFile(null);
    setIsDragging(false);
    setIsUploading(false);
    setStepMessage('');
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (isUploading) return;
    resetState();
    onClose();
  };

  const validateFile = (file) => {
    setUploadError(null);
    if (!file) return false;
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!['.pdf', '.docx'].includes(ext)) {
      setUploadError(`Unsupported format "${ext}". Please upload PDF or DOCX.`);
      return false;
    }
    const fileSizeMb = file.size / (1024 * 1024);
    if (fileSizeMb > maxSizeMb) {
      setUploadError(`File exceeds maximum allowed limit of ${maxSizeMb} MB.`);
      return false;
    }
    if (file.size === 0) {
      setUploadError('The selected file is empty (0 bytes).');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!selectedFile || isUploading) return;
    setIsUploading(true);
    setUploadError(null);
    setStepMessage(`Ingesting ${selectedFile.name}...`);

    try {
      const response = await api.uploadDocument(selectedFile);
      onNotify({
        type: 'success',
        title: 'Document Ingested',
        message: `"${response.filename}" successfully stored in ChromaDB (${response.chunk_count} chunks).`,
      });
      if (onUploadSuccess) onUploadSuccess(response);
      handleClose();
    } catch (err) {
      console.error(err);
      let detailMsg = err.detail || err.message || 'Ingestion failed';
      if (err.status === 409) detailMsg = 'This exact document has already been uploaded (duplicate detected).';
      else if (err.status === 415) detailMsg = 'Unsupported document format. Only PDF and DOCX files are allowed.';
      setUploadError(detailMsg);
      onNotify({ type: 'error', title: 'Ingestion Error', message: detailMsg });
    } finally {
      setIsUploading(false);
    }
  };

  return html`
    <${Modal} isOpen=${isOpen} onClose=${handleClose} title="Upload and Ingest Document" maxWidth="max-w-md">
      <div className="space-y-4">
        <div
          onDragOver=${(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave=${(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop=${(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f && validateFile(f)) setSelectedFile(f); }}
          onClick=${() => !isUploading && fileInputRef.current?.click()}
          className="border-2 border-dashed rounded-xl p-6 text-center transition-subtle cursor-pointer ${isDragging ? 'border-blue-500 bg-blue-50/50' : selectedFile ? 'border-emerald-400 bg-emerald-50/20' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'}"
        >
          <input ref=${fileInputRef} type="file" accept=".pdf,.docx" onChange=${(e) => { const f = e.target.files?.[0]; if (f && validateFile(f)) setSelectedFile(f); }} className="hidden" disabled=${isUploading} />
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-500">
            ${selectedFile ? html`<svg className="w-5 h-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"></path></svg>` : html`<svg className="w-5 h-5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>`}
          </div>
          ${selectedFile ? html`
            <p className="text-sm font-semibold text-slate-900 truncate max-w-[280px] mx-auto">${selectedFile.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">${(selectedFile.size / 1024 / 1024).toFixed(1)} MB &bull; Ready to ingest</p>
          ` : html`
            <p className="text-sm font-medium text-slate-800">Click to upload or drag & drop</p>
            <p className="text-xs text-slate-400 mt-1">Supported formats: <strong className="text-slate-600">PDF</strong>, <strong className="text-slate-600">DOCX</strong> (up to ${maxSizeMb} MB)</p>
          `}
        </div>

        ${isUploading && html`
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-lg p-3 flex items-center gap-3">
            <svg className="animate-spin h-4 w-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-blue-900 truncate">${stepMessage}</p>
              <p className="text-[11px] text-blue-700">Generating Gemini 3072-dim embeddings & storing vectors...</p>
            </div>
          </div>
        `}

        ${uploadError && html`
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-start gap-2.5">
            <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <p className="text-xs text-rose-700 leading-relaxed">${uploadError}</p>
          </div>
        `}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <${Button} variant="ghost" size="sm" onClick=${handleClose} disabled=${isUploading}>Cancel<//>
          <${Button} variant="primary" size="sm" onClick=${handleSubmit} disabled=${!selectedFile || isUploading} loading=${isUploading}>Ingest Document<//>
        </div>
      </div>
    <//>
  `;
}

function DocumentDetailModal({ isOpen, onClose, document, onDeleteRequest }) {
  if (!document) return null;
  return html`
    <${Modal} isOpen=${isOpen} onClose=${onClose} title="Document Details" maxWidth="max-w-lg">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 p-3.5 bg-slate-50 rounded-lg border border-slate-200/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs font-bold text-xs uppercase">${document.file_type}</div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 leading-tight">${document.filename}</h4>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">ID: ${document.doc_id}</p>
            </div>
          </div>
          <${Badge} variant="primary" size="xs">${document.file_type.toUpperCase()}<//>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
            <span className="text-slate-400 block text-[11px]">Vector Chunks</span>
            <span className="text-base font-semibold text-slate-800 font-mono mt-0.5 block">${document.chunk_count}</span>
          </div>
          <div className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
            <span className="text-slate-400 block text-[11px]">Pages</span>
            <span className="text-base font-semibold text-slate-800 font-mono mt-0.5 block">${document.page_count ?? 'N/A'}</span>
          </div>
          <div className="col-span-2 p-3 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
            <span className="text-slate-400 block text-[11px]">Ingested On</span>
            <span className="text-xs font-medium text-slate-700 mt-0.5 block">${new Date(document.created_at).toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <${Button} variant="dangerGhost" size="sm" onClick=${() => { onClose(); if (onDeleteRequest) onDeleteRequest(document); }}>Delete Document<//>
          <${Button} variant="secondary" size="sm" onClick=${onClose}>Close<//>
        </div>
      </div>
    <//>
  `;
}

function DocumentTable({ documents = [], loading = false, onRefresh, onOpenUpload, onViewDetails, onNotify }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [docToDelete, setDocToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      if (typeFilter !== 'all' && doc.file_type.toLowerCase() !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return doc.filename.toLowerCase().includes(q) || doc.doc_id.toLowerCase().includes(q);
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'date_asc') return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === 'name') return a.filename.localeCompare(b.filename);
      if (sortBy === 'chunks') return b.chunk_count - a.chunk_count;
      return 0;
    });
  }, [documents, searchQuery, typeFilter, sortBy]);

  const confirmDelete = async () => {
    if (!docToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await api.deleteDocument(docToDelete.doc_id);
      onNotify({ type: 'success', title: 'Document Purged', message: `"${docToDelete.filename}" vectors removed from ChromaDB.` });
      setDocToDelete(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      onNotify({ type: 'error', title: 'Deletion Failed', message: err.detail || 'Could not delete document.' });
    } finally {
      setIsDeleting(false);
    }
  };

  return html`
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/40">
        <div className="w-full sm:w-72">
          <${Input} value=${searchQuery} onChange=${(e) => setSearchQuery(e.target.value)} onClear=${() => setSearchQuery('')} clearable=${true} placeholder="Search documents by name..." icon=${html`<svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`} />
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
            ${['all', 'pdf', 'docx'].map((t) => html`
              <button key=${t} type="button" onClick=${() => setTypeFilter(t)} className="px-2.5 py-1 rounded-md capitalize font-medium transition-subtle cursor-pointer ${typeFilter === t ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}">${t}</button>
            `)}
          </div>
          <select value=${sortBy} onChange=${(e) => setSortBy(e.target.value)} className="text-xs bg-white text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer">
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="name">Alphabetical</option>
            <option value="chunks">Most Chunks</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        ${loading ? html`<div className="p-6"><${TableSkeleton} rows=${5} /></div>` : filteredDocs.length === 0 ? html`
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-slate-900">No documents found</p>
            <p className="text-xs text-slate-500 mt-1">Upload a PDF or DOCX file to start building your knowledge base.</p>
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
                <tr key=${doc.doc_id} className="hover:bg-slate-50/70 transition-subtle group">
                  <td className="py-3 px-4 max-w-xs sm:max-w-md">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded bg-slate-100 border border-slate-200/60 flex items-center justify-center shrink-0 text-slate-600 font-bold text-[10px] uppercase">${doc.file_type}</div>
                      <div className="min-w-0">
                        <p onClick=${() => onViewDetails && onViewDetails(doc)} className="font-medium text-slate-900 truncate hover:text-blue-600 cursor-pointer" title=${doc.filename}>${doc.filename}</p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">ID: ${doc.doc_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4"><${Badge} variant=${doc.file_type.toLowerCase() === 'pdf' ? 'primary' : 'success'} size="xs">${doc.file_type.toUpperCase()}<//></td>
                  <td className="py-3 px-4 font-mono text-slate-700">${doc.chunk_count}</td>
                  <td className="py-3 px-4 font-mono text-slate-500">${doc.page_count ?? '—'}</td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">${new Date(doc.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button type="button" onClick=${() => onViewDetails && onViewDetails(doc)} className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-subtle cursor-pointer">Details</button>
                      <button type="button" onClick=${() => setDocToDelete(doc)} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-subtle cursor-pointer" title="Delete">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              `)}
            </tbody>
          </table>
        `}
      </div>

      <${Modal} isOpen=${!!docToDelete} onClose=${() => !isDeleting && setDocToDelete(null)} title="Confirm Document Deletion" maxWidth="max-w-md">
        <div className="space-y-4">
          <p className="text-sm font-semibold text-slate-900">Permanently purge "${docToDelete?.filename}"?</p>
          <p className="text-xs text-slate-600 leading-relaxed">This action permanently deletes the document and purges all its vector embeddings from ChromaDB. Content will never appear in future answers.</p>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <${Button} variant="ghost" size="sm" onClick=${() => setDocToDelete(null)} disabled=${isDeleting}>Cancel<//>
            <${Button} variant="danger" size="sm" onClick=${confirmDelete} loading=${isDeleting}>Confirm Purge<//>
          </div>
        </div>
      <//>
    </div>
  `;
}

// ── Pages ────────────────────────────────────────────────────────────────────
function OverviewPage({ documents = [], health = null, config = null, loading = false, onNavigate, onOpenUpload, onViewDoc }) {
  const totalChunks = documents.reduce((sum, d) => sum + (d.chunk_count || 0), 0);
  const pdfCount = documents.filter((d) => d.file_type.toLowerCase() === 'pdf').length;
  const docxCount = documents.filter((d) => d.file_type.toLowerCase() === 'docx').length;
  const isHealthy = health?.status === 'ok';
  const recentDocs = [...documents].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);

  return html`
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-medium mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
            Production RAG Intelligence
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">DocuMind Knowledge Base</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">Upload enterprise documents, extract clean structural chunks, embed with 3072-dimensional Gemini vectors, and ask questions with strict citation grounding.</p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <${Button} variant="secondary" size="sm" onClick=${() => onNavigate('ask')}>Ask Questions<//>
          <${Button} variant="primary" size="sm" onClick=${onOpenUpload}>Upload Document<//>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        ${loading ? html`<${CardSkeleton} /><${CardSkeleton} /><${CardSkeleton} /><${CardSkeleton} />` : html`
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-slate-500 text-xs font-medium block">Indexed Documents</span>
            <span className="text-2xl font-bold text-slate-900 font-mono mt-2 block">${documents.length}</span>
            <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
              <span>${pdfCount} PDF &bull; ${docxCount} DOCX</span>
              <button type="button" onClick=${() => onNavigate('documents')} className="text-blue-600 hover:underline cursor-pointer">Manage &rarr;</button>
            </div>
          </div>
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-slate-500 text-xs font-medium block">Vector Chunks</span>
            <span className="text-2xl font-bold text-slate-900 font-mono mt-2 block">${totalChunks}</span>
            <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
              <span>ChromaDB Persistent</span>
              <span className="font-mono text-slate-400">3072 dims</span>
            </div>
          </div>
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-slate-500 text-xs font-medium block">LLM Generation</span>
            <span className="text-sm font-semibold text-slate-900 truncate font-mono mt-2 block">${config?.llm_model || 'gemini-3.5-flash-lite'}</span>
            <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
              <span>Grounded Citations</span>
              <span className="font-mono text-slate-600">temp 0.1</span>
            </div>
          </div>
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-slate-500 text-xs font-medium block">System Health</span>
            <span className="text-lg font-bold text-slate-900 capitalize mt-2 block">${health?.status || 'Active'}</span>
            <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
              <span>API Gateway</span>
              <span className="font-mono text-slate-400">${health?.version ? `v${health.version}` : '1.0.0'}</span>
            </div>
          </div>
        `}
      </div>

      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
          <h3 className="text-sm font-semibold text-slate-900">Recent Documents</h3>
          <${Button} variant="ghost" size="xs" onClick=${() => onNavigate('documents')}>View All &rarr;<//>
        </div>
        <div className="divide-y divide-slate-100">
          ${recentDocs.length === 0 ? html`<div className="p-8 text-center text-xs text-slate-400">No documents uploaded yet.</div>` : recentDocs.map((doc) => html`
            <div key=${doc.doc_id} className="p-3.5 hover:bg-slate-50/60 transition-subtle flex items-center justify-between gap-4 cursor-pointer" onClick=${() => onViewDoc && onViewDoc(doc)}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-600 uppercase shrink-0">${doc.file_type}</div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">${doc.filename}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">${doc.chunk_count} chunks &bull; Ingested ${new Date(doc.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <${Badge} variant=${doc.file_type.toLowerCase() === 'pdf' ? 'primary' : 'success'} size="xs">${doc.file_type.toUpperCase()}<//>
            </div>
          `)}
        </div>
      </div>
    </div>
  `;
}

function DocumentsPage({ documents = [], loading = false, onRefresh, onNotify, isUploadOpen, setIsUploadOpen }) {
  const [selectedDoc, setSelectedDoc] = useState(null);
  return html`
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Knowledge Base Documents</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">Manage indexed documents in ChromaDB with SHA-256 duplicate detection and 3072-dimensional embeddings.</p>
        </div>
        <${Button} variant="primary" size="sm" onClick=${() => setIsUploadOpen(true)}>Upload Document<//>
      </div>

      <${DocumentTable} documents=${documents} loading=${loading} onRefresh=${onRefresh} onOpenUpload=${() => setIsUploadOpen(true)} onViewDetails=${(doc) => setSelectedDoc(doc)} onNotify=${onNotify} />
      <${DocumentDetailModal} isOpen=${!!selectedDoc} onClose=${() => setSelectedDoc(null)} document=${selectedDoc} />
      <${DocumentUploadModal} isOpen=${isUploadOpen} onClose=${() => setIsUploadOpen(false)} onUploadSuccess=${() => { if (onRefresh) onRefresh(); }} onNotify=${onNotify} />
    </div>
  `;
}

function AskAIPage({ documents = [], onNotify, onOpenUpload }) {
  const [question, setQuestion] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [topK, setTopK] = useState(5);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.35);
  const [showConfig, setShowConfig] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [answerData, setAnswerData] = useState(null);
  const [selectedChunkId, setSelectedChunkId] = useState(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.focus();
  }, []);

  const handleAsk = async (queryText = null) => {
    const q = (queryText || question).trim();
    if (!q || isAsking) return;

    if (q.length < 3) {
      onNotify({ type: 'error', title: 'Validation Error', message: 'Question must be at least 3 characters.' });
      return;
    }

    setIsAsking(true);
    setAnswerData(null);
    setSelectedChunkId(null);

    try {
      const docIds = selectedDocId ? [selectedDocId] : null;
      const res = await api.askQuestion({ question: q, topK, similarityThreshold, docIds });
      setAnswerData(res);
      if (res.retrieved_chunks && res.retrieved_chunks.length > 0) {
        setSelectedChunkId(res.retrieved_chunks[0].chunk_id);
      }
    } catch (err) {
      console.error(err);
      onNotify({ type: 'error', title: 'Query Failed', message: err.detail || 'Failed to generate answer.' });
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

  const samplePrompts = [
    { title: 'Remote Work Policy', query: 'What is the maximum reimbursement for home office equipment provided to Tier A remote employees?' },
    { title: 'Incident Playbook', query: 'What are the target first response and resolution SLAs for a P1 critical incident?' },
    { title: 'Attention Mechanism', query: 'What is the attention mechanism in Transformer models?' },
    { title: 'Artemis Mission', query: 'Why is the lunar south pole targeted for resource exploration in Artemis?' },
  ];

  return html`
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-3.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-subtle">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-slate-400 font-medium shrink-0">Scope:</span>
                <select value=${selectedDocId} onChange=${(e) => setSelectedDocId(e.target.value)} disabled=${isAsking} className="bg-slate-50 text-slate-800 text-xs font-medium border border-slate-200 rounded-md px-2 py-1 max-w-[200px] truncate focus:outline-none focus:border-blue-500 cursor-pointer">
                  <option value="">All Documents (${documents.length})</option>
                  ${documents.map((d) => html`<option key=${d.doc_id} value=${d.doc_id}>${d.filename}</option>`)}
                </select>
              </div>
              <button type="button" onClick=${() => setShowConfig(!showConfig)} className="text-slate-400 hover:text-slate-700 flex items-center gap-1 text-[11px] font-medium cursor-pointer">
                <span>${showConfig ? 'Hide Config' : 'Tuning'}</span>
              </button>
            </div>

            ${showConfig && html`
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70 grid grid-cols-2 gap-3 text-xs animate-in fade-in duration-100">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Top-K: <strong className="font-mono text-slate-900">${topK}</strong></label>
                  <input type="range" min="1" max="10" value=${topK} onChange=${(e) => setTopK(Number(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Threshold: <strong className="font-mono text-slate-900">${similarityThreshold.toFixed(2)}</strong></label>
                  <input type="range" min="0.10" max="0.80" step="0.05" value=${similarityThreshold} onChange=${(e) => setSimilarityThreshold(Number(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                </div>
              </div>
            `}

            <textarea ref=${textareaRef} value=${question} onChange=${(e) => setQuestion(e.target.value)} onKeyDown=${handleKeyDown} disabled=${isAsking} placeholder="Ask a question about your indexed documents..." rows="3" className="w-full text-sm text-slate-900 placeholder:text-slate-400 bg-transparent resize-none border-0 p-0 focus:outline-none focus:ring-0 leading-relaxed disabled:opacity-50" />

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-400 hidden sm:inline">Press <kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px]">Enter</kbd> to submit</span>
              <div className="flex items-center gap-2">
                ${question && html`<${Button} variant="ghost" size="sm" onClick=${() => setQuestion('')} disabled=${isAsking}>Clear<//>`}
                <${Button} variant="primary" size="sm" onClick=${() => handleAsk()} disabled=${!question.trim() || isAsking} loading=${isAsking}>Ask AI<//>
              </div>
            </div>
          </div>

          ${isAsking && html`<${AnswerSkeleton} />`}

          ${answerData && !isAsking && html`
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden animate-in fade-in duration-150">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full ${answerData.answerable ? 'bg-emerald-500' : 'bg-amber-500'}"></div>
                  <span className="font-semibold text-slate-800">${answerData.answerable ? 'Grounded Response' : 'Out-of-Domain Refusal'}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                  <span>Latency: <strong>${answerData.latency_ms} ms</strong></span>
                  <span>&bull;</span>
                  <span>Citations: <strong>${answerData.citations?.length || 0}</strong></span>
                </div>
              </div>

              <div className="px-5 pt-4 pb-2 border-b border-slate-100/70">
                <p className="text-xs text-slate-400 font-medium">Question</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">${answerData.question}</p>
              </div>

              <div className="p-5">
                ${!answerData.answerable ? html`
                  <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200/80 text-amber-900 space-y-2">
                    <p className="text-xs font-semibold">Information Absent From Knowledge Base</p>
                    <p className="text-xs text-amber-800 leading-relaxed">${answerData.answer}</p>
                  </div>
                ` : html`
                  <${MarkdownRenderer} content=${answerData.answer} onCitationClick=${({ filename, page, section }) => {
                    const matched = answerData.retrieved_chunks?.find((c) => c.filename.toLowerCase().includes(filename.toLowerCase()));
                    if (matched) setSelectedChunkId(matched.chunk_id);
                  }} />
                `}
              </div>

              ${answerData.citations && answerData.citations.length > 0 && html`
                <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/30 space-y-2.5">
                  <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Verified Citations (${answerData.citations.length})</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    ${answerData.citations.map((c) => html`<${CitationCard} key=${c.chunk_id} citation=${c} isSelected=${selectedChunkId === c.chunk_id} onSelectChunk=${(id) => setSelectedChunkId(id)} />`)}
                  </div>
                </div>
              `}
            </div>
          `}

          {!answerData && !isAsking && html`
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">Document Question Answering</h3>
              <p className="text-xs text-slate-500">Every claim is grounded in retrieved chunks with validated citations.</p>
              <div className="pt-2">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Sample Questions from Indexed Corpus</p>
                <div className="grid grid-cols-1 gap-2">
                  ${samplePrompts.map((p, idx) => html`
                    <button key=${idx} type="button" onClick=${() => { setQuestion(p.query); handleAsk(p.query); }} className="w-full text-left p-2.5 rounded-lg border border-slate-200/70 hover:border-blue-400 hover:bg-blue-50/20 transition-subtle cursor-pointer group">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-800 group-hover:text-blue-600 transition-colors">${p.query}</span>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">${p.title} &rarr;</span>
                      </div>
                    </button>
                  `)}
                </div>
              </div>
            </div>
          `}
        </div>

        <div className="lg:col-span-5 h-[calc(100vh-140px)] sticky top-20">
          <${RetrievedContextPanel} chunks=${answerData?.retrieved_chunks || []} selectedChunkId=${selectedChunkId} onSelectChunk=${(id) => setSelectedChunkId(id)} />
        </div>
      </div>
    </div>
  `;
}

function SettingsPage({ config = null, health = null, onRefreshHealth, loading = false }) {
  const isHealthy = health?.status === 'ok';

  return html`
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">System & Runtime Configuration</h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">Live parameters powering the production retrieval and generation pipeline.</p>
        </div>
        <${Button} variant="secondary" size="sm" onClick=${onRefreshHealth} disabled=${loading}>Check Connectivity<//>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Infrastructure Health</h3>
          <${Badge} variant=${isHealthy ? 'success' : 'warning'} size="xs">${isHealthy ? 'Operational' : 'Degraded'}<//>
        </div>
        <div className="p-4 divide-y divide-slate-100 text-xs">
          <div className="py-2.5 flex items-center justify-between">
            <span className="font-medium text-slate-800">Vector Storage (ChromaDB)</span>
            <span className="text-[11px] font-mono text-slate-500">${health?.document_count ?? 0} docs</span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span className="font-medium text-slate-800">Google GenAI Embedding Service</span>
            <span className="font-mono text-slate-500">gemini-embedding-001 (3072 dims)</span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span className="font-medium text-slate-800">Gemini LLM Generation Pipeline</span>
            <span className="font-mono text-slate-500">${config?.llm_model || 'gemini-3.5-flash-lite'}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-semibold text-slate-900">Retrieval Parameters</h3>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-200/60">
            <span className="text-slate-400 text-[11px] block">Chunk Size</span>
            <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">${config?.chunk_size || 512}</span>
          </div>
          <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-200/60">
            <span className="text-slate-400 text-[11px] block">Chunk Overlap</span>
            <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">${config?.chunk_overlap || 50}</span>
          </div>
          <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-200/60">
            <span className="text-slate-400 text-[11px] block">Similarity Cutoff</span>
            <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">${config?.similarity_threshold || 0.35}</span>
          </div>
          <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-200/60">
            <span className="text-slate-400 text-[11px] block">Default Top-K</span>
            <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">${config?.retrieval_top_k || 5}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ── Root App Orchestrator ────────────────────────────────────────────────────
function App() {
  const getInitialTab = () => {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    if (['overview', 'documents', 'ask', 'settings'].includes(hash)) return hash;
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [health, setHealth] = useState(null);
  const [config, setConfig] = useState(null);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [inspectDoc, setInspectDoc] = useState(null);
  const [toasts, setToasts] = useState([]);

  const addToast = ({ type = 'info', title = '', message = '' }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 7);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  };

  const handleSelectTab = (tab) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (['overview', 'documents', 'ask', 'settings'].includes(hash)) setActiveTab(hash);
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const fetchDocuments = async () => {
    setLoadingDocs(true);
    try {
      const data = await api.listDocuments();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const fetchHealth = async () => {
    try {
      const [h, c] = await Promise.all([api.getHealth(), api.getConfig().catch(() => null)]);
      setHealth(h);
      if (c) setConfig(c);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchHealth();
  }, []);

  const getPageTitle = () => {
    switch (activeTab) {
      case 'overview': return { title: 'Overview', subtitle: 'Platform metrics, health status, and quick actions' };
      case 'documents': return { title: 'Documents', subtitle: 'Manage indexed PDF and DOCX files in ChromaDB' };
      case 'ask': return { title: 'Ask AI', subtitle: 'Grounded question answering with verified citations' };
      case 'settings': return { title: 'Settings', subtitle: 'Runtime models, vector storage, and hyperparameters' };
      default: return { title: 'DocuMind', subtitle: '' };
    }
  };

  const pageInfo = getPageTitle();

  return html`
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 overflow-hidden">
      <${Sidebar} activeTab=${activeTab} onSelectTab=${handleSelectTab} health=${health} isMobileOpen=${isMobileNavOpen} onCloseMobile=${() => setIsMobileNavOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <${Header} title=${pageInfo.title} subtitle=${pageInfo.subtitle} onOpenUpload=${() => setIsUploadOpen(true)} onToggleMobile=${() => setIsMobileNavOpen(!isMobileNavOpen)} totalDocs=${documents.length} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          ${activeTab === 'overview' && html`<${OverviewPage} documents=${documents} health=${health} config=${config} loading=${loadingDocs} onNavigate=${handleSelectTab} onOpenUpload=${() => setIsUploadOpen(true)} onViewDoc=${(doc) => setInspectDoc(doc)} />`}
          ${activeTab === 'documents' && html`<${DocumentsPage} documents=${documents} loading=${loadingDocs} onRefresh=${fetchDocuments} onNotify=${addToast} isUploadOpen=${isUploadOpen} setIsUploadOpen=${setIsUploadOpen} />`}
          ${activeTab === 'ask' && html`<${AskAIPage} documents=${documents} onNotify=${addToast} onOpenUpload=${() => setIsUploadOpen(true)} />`}
          ${activeTab === 'settings' && html`<${SettingsPage} config=${config} health=${health} onRefreshHealth=${fetchHealth} />`}
        </main>
      </div>

      <${DocumentUploadModal} isOpen=${isUploadOpen} onClose=${() => setIsUploadOpen(false)} onUploadSuccess=${() => { fetchDocuments(); fetchHealth(); }} onNotify=${addToast} />
      <${DocumentDetailModal} isOpen=${!!inspectDoc} onClose=${() => setInspectDoc(null)} document=${inspectDoc} onDeleteRequest=${() => { setInspectDoc(null); fetchDocuments(); }} />
      <${ToastContainer} toasts=${toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  `;
}

// ── Mount to DOM ─────────────────────────────────────────────────────────────
const rootElement = document.getElementById('root');
const root = window.ReactDOM.createRoot(rootElement);
root.render(window.React.createElement(App));
