import { html } from '../utils/html.js';

export function Sidebar({
  activeTab,
  onSelectTab,
  health,
  isMobileOpen,
  onCloseMobile,
}) {
  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: html`
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
          <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
          <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
          <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
        </svg>
      `,
    },
    {
      id: 'documents',
      label: 'Documents',
      badge: health?.document_count !== undefined ? String(health.document_count) : null,
      icon: html`
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      `,
    },
    {
      id: 'ask',
      label: 'Ask AI',
      highlight: true,
      icon: html`
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
        </svg>
      `,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: html`
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      `,
    },
  ];

  const handleNavClick = (id) => {
    onSelectTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  const isHealthy = health?.status === 'ok';

  return html`
    <!-- Mobile Backdrop -->
    ${isMobileOpen && html`
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
        onClick=${onCloseMobile}
      />
    `}

    <!-- Sidebar Container -->
    <aside
      className="fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
      }"
    >
      <!-- Brand Header -->
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <!-- Stylized AI Intelligence Monogram -->
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-tighter shadow-xs">
            <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-900 tracking-tight leading-none">DocuMind</h1>
            <p className="text-[11px] text-slate-400 font-medium tracking-tight mt-0.5">Document Intelligence</p>
          </div>
        </div>

        <!-- Mobile Close Button -->
        <button
          type="button"
          onClick=${onCloseMobile}
          className="lg:hidden p-1 text-slate-400 hover:text-slate-600 rounded-md"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Navigation Links -->
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-2.5 pb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Workspace
        </p>
        ${navItems.map((item) => {
          const isActive = activeTab === item.id;
          return html`
            <button
              key=${item.id}
              type="button"
              onClick=${() => handleNavClick(item.id)}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-subtle cursor-pointer select-none ${
                isActive
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }"
            >
              <div className="flex items-center gap-2.5">
                <span className="${isActive ? 'text-blue-600' : 'text-slate-400'}">
                  ${item.icon}
                </span>
                <span>${item.label}</span>
              </div>
              ${item.badge && html`
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
                  ${item.badge}
                </span>
              `}
            </button>
          `;
        })}
      </div>

      <!-- Sidebar Footer -->
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
        <!-- Live System Status Indicator -->
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-white border border-slate-200/60 shadow-2xs text-[11px]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full ${
                isHealthy ? 'bg-emerald-400 opacity-75' : 'bg-amber-400 opacity-75'
              }"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 ${
                isHealthy ? 'bg-emerald-500' : 'bg-amber-500'
              }"></span>
            </span>
            <span className="text-slate-600 font-medium">${isHealthy ? 'System Active' : 'Degraded'}</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">${health?.version ? `v${health.version}` : 'v1.0.0'}</span>
        </div>

        <!-- Quick Info / Help Link -->
        <div className="flex items-center justify-between px-2.5 text-[11px] text-slate-400">
          <span>Enterprise RAG</span>
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-600 hover:underline flex items-center gap-1 transition-subtle"
          >
            <span>OpenAPI</span>
            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        </div>
      </div>
    </aside>
  `;
}
