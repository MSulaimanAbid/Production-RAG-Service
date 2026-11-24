/**
 * Centralized API Client for DocuMind
 * Connects directly to FastAPI backend endpoints with strict error normalization
 * and JWT Bearer token authentication.
 */

export const API_BASE = window.location.origin.includes(':8000')
  ? window.location.origin
  : 'http://127.0.0.1:8000';

const TOKEN_KEY = 'documind_auth_token';
const USER_KEY = 'documind_auth_user';

/**
 * Custom error class for API client failures.
 * Normalizes backend error responses (including Pydantic validation arrays)
 * into human-readable strings to protect React rendering.
 *
 * @param {number} status - HTTP status code returned by the server.
 * @param {string} error - Standardized uppercase error identifier.
 * @param {string|Array|Object} detail - Raw or formatted error message.
 * @param {string|null} requestId - Unique request tracing ID.
 */
class ApiClientError extends Error {
  constructor(status, error, detail, requestId = null) {
    let safeDetail = 'An unexpected error occurred.';
    if (typeof detail === 'string') {
      safeDetail = detail;
    } else if (Array.isArray(detail)) {
      safeDetail = detail
        .map((d) => (typeof d === 'object' && d ? (d.msg || JSON.stringify(d)) : String(d)))
        .join('; ');
    } else if (typeof detail === 'object' && detail !== null) {
      safeDetail = detail.msg || detail.detail || JSON.stringify(detail);
    } else if (detail !== undefined && detail !== null) {
      safeDetail = String(detail);
    }

    super(safeDetail || error || `HTTP Error ${status}`);
    this.name = 'ApiClientError';
    this.status = status;
    this.error = error;
    this.detail = safeDetail;
    this.requestId = requestId;
  }
}

/**
 * Global response handler for fetch requests.
 * Parses JSON or text payloads, extracts request tracing IDs,
 * normalizes error structures, and automatically clears sessions on 401.
 *
 * @param {Response} res - Native browser fetch Response object.
 * @returns {Promise<any>} Parsed response data.
 * @throws {ApiClientError} When response status is outside the 200-299 range.
 */
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
    const requestId = data?.request_id || res.headers.get('X-Request-ID') || null;
    let rawDetail = data?.detail || 'An unexpected error occurred.';
    let detail = rawDetail;

    if (Array.isArray(rawDetail)) {
      detail = rawDetail
        .map((d) => (typeof d === 'object' && d ? (d.msg || JSON.stringify(d)) : String(d)))
        .join('; ');
    } else if (typeof rawDetail === 'object' && rawDetail !== null) {
      detail = rawDetail.msg || rawDetail.detail || JSON.stringify(rawDetail);
    } else {
      detail = String(rawDetail);
    }

    // If unauthorized, clear local session
    if (res.status === 401) {
      api.clearSession();
    }

    throw new ApiClientError(res.status, error, detail, requestId);
  }

  return data;
}

/**
 * Builds standard request headers with JWT Bearer authorization if active.
 *
 * @param {Object} existingHeaders - Existing request headers.
 * @returns {Object} Headers object containing Authorization token if present.
 */
function getAuthHeaders(existingHeaders = {}) {
  const headers = { ...existingHeaders };
  const token = api.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // ── Session & Token Helpers ───────────────────────────────────────────────

  /**
   * Retrieves active JWT Bearer token from localStorage.
   * @returns {string|null} Current JWT token or null if unauthenticated.
   */
  getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || null;
    } catch {
      return null;
    }
  },

  /**
   * Retrieves cached user profile object from localStorage.
   * @returns {Object|null} Cached user profile or null.
   */
  getUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /**
   * Persists authentication token and user profile to localStorage.
   * @param {string} token - Signed JWT Bearer token.
   * @param {Object} user - User profile object.
   */
  setSession(token, user) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (err) {
      console.warn('Failed to save auth session to localStorage:', err);
    }
  },

  /**
   * Clears stored JWT token and user profile from localStorage.
   */
  clearSession() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (err) {
      console.warn('Failed to clear auth session:', err);
    }
  },

  // ── Auth Endpoints ────────────────────────────────────────────────────────

  /**
   * Log in user with email & password
   * POST /api/auth/login
   */
  async login({ email, password }) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse(res);
    if (data?.access_token && data?.user) {
      this.setSession(data.access_token, data.user);
    }
    return data;
  },

  /**
   * Register new user account
   * POST /api/auth/register
   */
  async register({ email, password, name }) {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await handleResponse(res);
    if (data?.access_token && data?.user) {
      this.setSession(data.access_token, data.user);
    }
    return data;
  },

  /**
   * Fetch currently authenticated user profile
   * GET /api/auth/me
   */
  async getMe() {
    const token = this.getToken();
    if (!token) return null;

    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: getAuthHeaders(),
    });
    const user = await handleResponse(res);
    if (user) {
      this.setSession(token, user);
    }
    return user;
  },

  /**
   * Log out and clear session
   */
  logout() {
    this.clearSession();
  },

  // ── System Endpoints ──────────────────────────────────────────────────────

  /**
   * Health check
   * GET /api/health
   */
  async getHealth() {
    const res = await fetch(`${API_BASE}/api/health`);
    return handleResponse(res);
  },

  /**
   * Runtime configuration
   * GET /api/config
   */
  async getConfig() {
    const res = await fetch(`${API_BASE}/api/config`);
    return handleResponse(res);
  },

  // ── Document Endpoints (Protected) ────────────────────────────────────────

  /**
   * List all documents
   * GET /api/documents
   */
  async listDocuments() {
    const res = await fetch(`${API_BASE}/api/documents`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  /**
   * Get single document metadata
   * GET /api/documents/{doc_id}
   */
  async getDocument(docId) {
    const res = await fetch(`${API_BASE}/api/documents/${encodeURIComponent(docId)}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  /**
   * Upload and ingest document
   * POST /api/documents
   */
  async uploadDocument(file) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/api/documents`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    return handleResponse(res);
  },

  /**
   * Delete document and purge vectors
   * DELETE /api/documents/{doc_id}
   */
  async deleteDocument(docId) {
    const res = await fetch(`${API_BASE}/api/documents/${encodeURIComponent(docId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (res.status === 204) {
      return { success: true };
    }
    return handleResponse(res);
  },

  // ── QA Endpoints (Protected) ──────────────────────────────────────────────

  /**
   * Ask question over indexed documents
   * POST /api/ask
   */
  async askQuestion({ question, topK = 5, similarityThreshold = 0.35, docIds = null }) {
    const payload = {
      question: question.trim(),
      top_k: Number(topK),
      similarity_threshold: Number(similarityThreshold),
      doc_ids: Array.isArray(docIds) && docIds.length > 0 ? docIds : null,
    };

    const res = await fetch(`${API_BASE}/api/ask`, {
      method: 'POST',
      headers: getAuthHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },
};
