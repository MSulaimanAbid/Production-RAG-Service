import { html, React } from '../utils/html.js';
import { Modal } from './ui/Modal.js';
import { Button } from './ui/Button.js';
import { Badge } from './ui/Badge.js';
import { api } from '../services/api.js';

export function DocumentUploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
  onNotify,
  maxSizeMb = 50,
}) {
  const { useState, useRef } = React;
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
      setUploadError(`Unsupported file format "${ext}". Please upload a PDF (.pdf) or Word document (.docx).`);
      return false;
    }

    const fileSizeMb = file.size / (1024 * 1024);
    if (fileSizeMb > maxSizeMb) {
      setUploadError(`File size (${fileSizeMb.toFixed(1)} MB) exceeds the maximum allowed limit of ${maxSizeMb} MB.`);
      return false;
    }

    if (file.size === 0) {
      setUploadError('The selected file is empty (0 bytes).');
      return false;
    }

    return true;
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    setUploadError(null);
    setStepMessage(`Uploading ${selectedFile.name}...`);

    try {
      setStepMessage('Extracting text & chunking with metadata...');
      const response = await api.uploadDocument(selectedFile);

      onNotify({
        type: 'success',
        title: 'Document Ingested',
        message: `"${response.filename}" successfully indexed into ChromaDB with ${response.chunk_count} chunks.`,
      });

      if (onUploadSuccess) onUploadSuccess(response);
      handleClose();
    } catch (err) {
      console.error('Upload failed:', err);
      let detailMsg = err.detail || err.message || 'Ingestion failed';

      if (err.status === 409) {
        detailMsg = 'This exact document has already been uploaded and indexed. Duplicate files are rejected to avoid duplicate vectors.';
      } else if (err.status === 415) {
        detailMsg = 'Unsupported document format. Only PDF and DOCX files are allowed.';
      } else if (err.status === 400) {
        detailMsg = err.detail || 'Could not extract text from document. Check if the PDF is scanned or password protected.';
      }

      setUploadError(detailMsg);
      onNotify({
        type: 'error',
        title: 'Ingestion Error',
        message: detailMsg,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return html`
    <${Modal}
      isOpen=${isOpen}
      onClose=${handleClose}
      title="Upload and Ingest Document"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <!-- Dropzone -->
        <div
          onDragOver=${handleDragOver}
          onDragLeave=${handleDragLeave}
          onDrop=${handleDrop}
          onClick=${() => !isUploading && fileInputRef.current?.click()}
          className="border-2 border-dashed rounded-xl p-6 text-center transition-subtle cursor-pointer ${
            isDragging
              ? 'border-blue-500 bg-blue-50/50'
              : selectedFile
              ? 'border-emerald-400 bg-emerald-50/20'
              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
          }"
        >
          <input
            ref=${fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange=${handleFileChange}
            className="hidden"
            disabled=${isUploading}
          />

          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-500">
            ${selectedFile ? html`
              <svg className="w-5 h-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            ` : html`
              <svg className="w-5 h-5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            `}
          </div>

          ${selectedFile ? html`
            <div>
              <p className="text-sm font-semibold text-slate-900 truncate max-w-[280px] mx-auto">
                ${selectedFile.name}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                ${formatFileSize(selectedFile.size)} &bull; Ready to ingest
              </p>
            </div>
          ` : html`
            <div>
              <p className="text-sm font-medium text-slate-800">
                Click to upload or drag & drop
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Supported formats: <strong className="text-slate-600">PDF</strong>, <strong className="text-slate-600">DOCX</strong> (up to ${maxSizeMb} MB)
              </p>
            </div>
          `}
        </div>

        <!-- Ingestion Step Progress or Error -->
        ${isUploading && html`
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-lg p-3 flex items-center gap-3">
            <svg className="animate-spin h-4 w-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-blue-900 truncate">${stepMessage}</p>
              <p className="text-[11px] text-blue-700">Generating Gemini 3072-dim embeddings & storing vectors...</p>
            </div>
          </div>
        `}

        ${uploadError && html`
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-start gap-2.5">
            <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p className="text-xs text-rose-700 leading-relaxed">${uploadError}</p>
          </div>
        `}

        <!-- Actions -->
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <${Button}
            variant="ghost"
            size="sm"
            onClick=${handleClose}
            disabled=${isUploading}
          >
            Cancel
          <//>
          <${Button}
            variant="primary"
            size="sm"
            onClick=${handleSubmit}
            disabled=${!selectedFile || isUploading}
            loading=${isUploading}
          >
            Ingest Document
          <//>
        </div>
      </div>
    <//>
  `;
}
