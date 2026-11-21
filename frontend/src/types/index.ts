/**
 * TypeScript Type Definitions for DocuMind Frontend
 * Strictly matching backend Pydantic v2 schemas from backend/schemas.py
 */

export type FileType = 'pdf' | 'docx';

export interface DocumentListItem {
  doc_id: string;
  filename: string;
  file_type: FileType;
  chunk_count: number;
  page_count: number | null;
  created_at: string;
}

export interface DocumentListResponse {
  documents: DocumentListItem[];
  total: number;
}

export interface DocumentResponse {
  doc_id: string;
  filename: string;
  file_type: string;
  file_hash: string;
  chunk_count: number;
  page_count: number | null;
  created_at: string;
  message: string;
}

export interface Citation {
  chunk_id: string;
  doc_id: string;
  filename: string;
  page: number | null;
  section: string | null;
  excerpt: string;
}

export interface RetrievedChunk {
  chunk_id: string;
  doc_id: string;
  filename: string;
  file_type: string;
  page: number | null;
  section: string | null;
  chunk_index: number;
  text: string;
  similarity_score: number; // 0.0 to 1.0 cosine similarity
}

export interface AskRequest {
  question: string;
  top_k?: number;
  similarity_threshold?: number;
  doc_ids?: string[] | null;
}

export interface AskResponse {
  question: string;
  answer: string;
  citations: Citation[];
  retrieved_chunks: RetrievedChunk[];
  chunk_count: number;
  answerable: boolean;
  latency_ms: number;
}

export interface ServiceStatus {
  status: 'ok' | 'error';
  detail?: string | null;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  version: string;
  vector_db: ServiceStatus;
  embedding_service: ServiceStatus;
  llm_service: ServiceStatus;
  document_count: number;
  timestamp: string;
}

export interface AppConfig {
  app_name: string;
  app_version: string;
  llm_model: string;
  embedding_model: string;
  chunk_size: number;
  chunk_overlap: number;
  similarity_threshold: number;
  retrieval_top_k: number;
  max_file_size_mb: number;
  allowed_extensions: string[];
}

export interface ApiError {
  error: string;
  detail: string;
  request_id?: string | null;
}
