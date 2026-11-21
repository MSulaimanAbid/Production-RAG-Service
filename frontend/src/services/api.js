/**
 * Centralized API Client for DocuMind
 * Connects directly to FastAPI backend endpoints with strict error normalization.
 */

export const API_BASE = window.location.origin.includes(':8000')
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

export const api = {
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

  /**
   * List all documents
   * GET /api/documents
   */
  async listDocuments() {
    const res = await fetch(`${API_BASE}/api/documents`);
    return handleResponse(res);
  },

  /**
   * Get single document metadata
   * GET /api/documents/{doc_id}
   */
  async getDocument(docId) {
    const res = await fetch(`${API_BASE}/api/documents/${encodeURIComponent(docId)}`);
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
    });
    if (res.status === 204) {
      return { success: true };
    }
    return handleResponse(res);
  },

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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },
};
