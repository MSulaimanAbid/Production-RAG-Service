import { html, React } from './utils/html.js?v=1.0.8';
import { Sidebar } from './components/Sidebar.js?v=1.0.8';
import { Header } from './components/Header.js?v=1.0.8';
import { ToastContainer } from './components/ui/Toast.js?v=1.0.8';
import { DocumentUploadModal } from './components/DocumentUploadModal.js?v=1.0.8';
import { DocumentDetailModal } from './components/DocumentDetailModal.js?v=1.0.8';
import { OverviewPage } from './pages/OverviewPage.js?v=1.0.8';
import { DocumentsPage } from './pages/DocumentsPage.js?v=1.0.8';
import { AskAIPage } from './pages/AskAIPage.js?v=1.0.8';
import { SettingsPage } from './pages/SettingsPage.js?v=1.0.8';
import { LoginPage } from './pages/LoginPage.js?v=1.0.8';
import { api } from './services/api.js?v=1.0.8';

/**
 * Root Application Component for DocuMind.
 * Manages authentication gating, global state (documents, system health, configuration),
 * tab routing, upload/detail modals, and notification toasts.
 */
export function App() {
  const { useState, useEffect } = React;

  // Authentication state
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return typeof api?.getUser === 'function' ? api.getUser() : null;
    } catch {
      return null;
    }
  });
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Active tab with URL hash support
  const getInitialTab = () => {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    if (['overview', 'documents', 'ask', 'settings'].includes(hash)) {
      return hash;
    }
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  
  // Data state
  const [documents, setDocuments] = useState([]);
  const [health, setHealth] = useState(null);
  const [config, setConfig] = useState(null);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loadingHealth, setLoadingHealth] = useState(false);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [inspectDoc, setInspectDoc] = useState(null);

  // Notifications
  const [toasts, setToasts] = useState([]);

  const addToast = ({ type = 'info', title = '', message = '' }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 7);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync tab with URL hash
  const handleSelectTab = (tab) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (['overview', 'documents', 'ask', 'settings'].includes(hash)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Fetch initial data
  const fetchDocuments = async () => {
    if (typeof api?.getToken === 'function' && !api.getToken()) return;
    setLoadingDocs(true);
    try {
      const data = await api.listDocuments();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      if (err.status !== 401) {
        addToast({
          type: 'error',
          title: 'Connection Issue',
          message: 'Could not fetch documents list from backend.',
        });
      }
    } finally {
      setLoadingDocs(false);
    }
  };

  const fetchHealth = async () => {
    setLoadingHealth(true);
    try {
      const [healthData, configData] = await Promise.all([
        api.getHealth(),
        api.getConfig().catch(() => null),
      ]);
      setHealth(healthData);
      if (configData) setConfig(configData);
    } catch (err) {
      console.error('Failed to fetch system health:', err);
    } finally {
      setLoadingHealth(false);
    }
  };

  // Check auth on load
  useEffect(() => {
    let isMounted = true;
    const checkAuth = async () => {
      try {
        const token = typeof api?.getToken === 'function' ? api.getToken() : null;
        if (!token) {
          if (isMounted) {
            setCurrentUser(null);
            setIsCheckingAuth(false);
          }
          return;
        }
        const user = await api.getMe();
        if (isMounted) {
          setCurrentUser(user);
          if (user) {
            fetchDocuments();
            fetchHealth();
          }
        }
      } catch (err) {
        console.warn('Session expired or invalid:', err);
        if (typeof api?.clearSession === 'function') api.clearSession();
        if (isMounted) setCurrentUser(null);
      } finally {
        if (isMounted) setIsCheckingAuth(false);
      }
    };

    checkAuth();
    return () => { isMounted = false; };
  }, []);

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setDocuments([]);
    addToast({
      type: 'info',
      title: 'Signed Out',
      message: 'You have been safely signed out of DocuMind.',
    });
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'overview':
        return { title: 'Overview', subtitle: 'Platform metrics, health status, and quick actions' };
      case 'documents':
        return { title: 'Documents', subtitle: 'Manage indexed PDF and DOCX files in ChromaDB' };
      case 'ask':
        return { title: 'Ask AI', subtitle: 'Grounded question answering with verified citations' };
      case 'settings':
        return { title: 'Settings', subtitle: 'Runtime models, vector storage, and hyperparameters' };
      default:
        return { title: 'DocuMind', subtitle: '' };
    }
  };

  // Initial authentication check loading spinner
  if (isCheckingAuth) {
    return html`
      <div className="flex h-screen w-screen items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm animate-pulse">
            <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]"></div>
          </div>
        </div>
      </div>
    `;
  }

  // Not logged in -> Show Login Page
  if (!currentUser) {
    return html`
      <div className="min-h-screen w-full overflow-y-auto overflow-x-hidden">
        <${LoginPage}
          onLoginSuccess=${(user) => {
            setCurrentUser(user);
            fetchDocuments();
            fetchHealth();
          }}
          onNotify=${addToast}
        />
        <${ToastContainer}
          toasts=${toasts}
          onDismiss=${removeToast}
        />
      </div>
    `;
  }

  const pageInfo = getPageTitle();

  // Logged in -> Show Full Workspace Application
  return html`
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 overflow-hidden">
      <!-- Persistent Sidebar -->
      <${Sidebar}
        activeTab=${activeTab}
        onSelectTab=${handleSelectTab}
        health=${health}
        isMobileOpen=${isMobileNavOpen}
        onCloseMobile=${() => setIsMobileNavOpen(false)}
        currentUser=${currentUser}
        onLogout=${handleLogout}
      />

      <!-- Content Area -->
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <!-- App Header -->
        <${Header}
          title=${pageInfo.title}
          subtitle=${pageInfo.subtitle}
          onOpenUpload=${() => setIsUploadOpen(true)}
          onToggleMobile=${() => setIsMobileNavOpen(!isMobileNavOpen)}
          totalDocs=${documents.length}
        />

        <!-- Scrollable Main Content -->
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          ${activeTab === 'overview' && html`
            <${OverviewPage}
              documents=${documents}
              health=${health}
              config=${config}
              loading=${loadingDocs}
              onNavigate=${handleSelectTab}
              onOpenUpload=${() => setIsUploadOpen(true)}
              onViewDoc=${(doc) => setInspectDoc(doc)}
            />
          `}

          ${activeTab === 'documents' && html`
            <${DocumentsPage}
              documents=${documents}
              loading=${loadingDocs}
              onRefresh=${fetchDocuments}
              onNotify=${addToast}
              isUploadOpen=${isUploadOpen}
              setIsUploadOpen=${setIsUploadOpen}
            />
          `}

          ${activeTab === 'ask' && html`
            <${AskAIPage}
              documents=${documents}
              onNotify=${addToast}
              onOpenUpload=${() => setIsUploadOpen(true)}
            />
          `}

          ${activeTab === 'settings' && html`
            <${SettingsPage}
              config=${config}
              health=${health}
              onRefreshHealth=${fetchHealth}
              loading=${loadingHealth}
            />
          `}
        </main>
      </div>

      <!-- Global Upload Modal -->
      <${DocumentUploadModal}
        isOpen=${isUploadOpen}
        onClose=${() => setIsUploadOpen(false)}
        onUploadSuccess=${() => {
          fetchDocuments();
          fetchHealth();
        }}
        onNotify=${addToast}
        maxSizeMb=${config?.max_file_size_mb || 50}
      />

      <!-- Global Document Detail Modal -->
      <${DocumentDetailModal}
        isOpen=${!!inspectDoc}
        onClose=${() => setInspectDoc(null)}
        document=${inspectDoc}
        onDeleteRequest=${() => {
          setInspectDoc(null);
          fetchDocuments();
        }}
      />

      <!-- Toast Container -->
      <${ToastContainer}
        toasts=${toasts}
        onDismiss=${removeToast}
      />
    </div>
  `;
}
