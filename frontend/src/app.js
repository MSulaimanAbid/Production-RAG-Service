import { html, React } from './utils/html.js';
import { Sidebar } from './components/Sidebar.js';
import { Header } from './components/Header.js';
import { ToastContainer } from './components/ui/Toast.js';
import { DocumentUploadModal } from './components/DocumentUploadModal.js';
import { DocumentDetailModal } from './components/DocumentDetailModal.js';
import { OverviewPage } from './pages/OverviewPage.js';
import { DocumentsPage } from './pages/DocumentsPage.js';
import { AskAIPage } from './pages/AskAIPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { api } from './services/api.js';

export function App() {
  const { useState, useEffect } = React;

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
    setLoadingDocs(true);
    try {
      const data = await api.listDocuments();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      addToast({
        type: 'error',
        title: 'Connection Issue',
        message: 'Could not fetch documents list from backend.',
      });
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

  useEffect(() => {
    fetchDocuments();
    fetchHealth();
  }, []);

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

  const pageInfo = getPageTitle();

  return html`
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 overflow-hidden">
      <!-- Persistent Sidebar -->
      <${Sidebar}
        activeTab=${activeTab}
        onSelectTab=${handleSelectTab}
        health=${health}
        isMobileOpen=${isMobileNavOpen}
        onCloseMobile=${() => setIsMobileNavOpen(false)}
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
        onDeleteRequest=${(doc) => {
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
