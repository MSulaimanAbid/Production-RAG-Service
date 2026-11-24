import { html } from '../utils/html.js';

const CITATION_REGEX = /\[Source:\s*([^,\]]+)(?:,\s*(?:page\s*(\d+)|section\s*['"]?([^'"]+)['"]?))?\]/gi;

/**
 * MarkdownRenderer Component.
 * Parses generated LLM responses, formatting paragraphs, bullet lists, bold text,
 * and turning inline citation tags `[Source: file, page N]` into clickable interactive pills.
 *
 * @param {Object} props
 * @param {string} props.content - Generated LLM response text.
 * @param {(citation: Object) => void} [props.onCitationClick] - Callback when an inline citation tag is clicked.
 */
export function MarkdownRenderer({ content = '', onCitationClick }) {
  if (!content) return null;

  // Split into paragraphs / lines
  const paragraphs = content.split(/\n\n+/);

  const renderInlineFormatted = (text) => {
    // Replace citation tags with interactive marker
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

      // Push text before citation
      if (matchIndex > lastIndex) {
        elements.push(renderBasicFormatting(text.substring(lastIndex, matchIndex)));
      }

      // Push interactive citation button
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
          <svg className="w-2.5 h-2.5 text-blue-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
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
    // Format bold **text** and `code`
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return html`<strong key=${i} className="font-semibold text-slate-900">${part.slice(2, -2)}</strong>`;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return html`<code key=${i} className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-xs font-mono border border-slate-200">${part.slice(1, -1)}</code>`;
      }
      return part;
    });
  };

  return html`
    <div className="prose-rag space-y-3">
      ${paragraphs.map((p, idx) => {
        const trimmed = p.trim();

        // Check if list item
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const listItems = trimmed.split(/\n[-*]\s+/).map((item) => item.replace(/^[-*]\s+/, ''));
          return html`
            <ul key=${idx} className="list-disc pl-5 space-y-1">
              ${listItems.map((li, lIdx) => html`
                <li key=${lIdx} className="text-slate-800 leading-relaxed">
                  ${renderInlineFormatted(li)}
                </li>
              `)}
            </ul>
          `;
        }

        // Check if header
        if (trimmed.startsWith('### ')) {
          return html`
            <h4 key=${idx} className="text-sm font-semibold text-slate-900 tracking-tight mt-3">
              ${renderInlineFormatted(trimmed.slice(4))}
            </h4>
          `;
        }
        if (trimmed.startsWith('## ')) {
          return html`
            <h3 key=${idx} className="text-base font-semibold text-slate-900 tracking-tight mt-4">
              ${renderInlineFormatted(trimmed.slice(3))}
            </h3>
          `;
        }

        // Standard paragraph
        return html`
          <p key=${idx} className="text-slate-800 leading-relaxed">
            ${renderInlineFormatted(trimmed)}
          </p>
        `;
      })}
    </div>
  `;
}
