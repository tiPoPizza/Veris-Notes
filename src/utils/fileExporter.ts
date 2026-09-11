import JSZip from 'jszip';
import { Note } from '../types';

export interface ExportFormatOption {
  id: string;
  name: string;
  extension: string;
  mimeType: string;
  description: string;
  badge: string;
  iconType: 'text' | 'code' | 'doc' | 'table' | 'book' | 'pdf';
}

export const EXPORT_FORMATS: ExportFormatOption[] = [
  {
    id: 'txt',
    name: 'Текстовый документ (TXT)',
    extension: 'txt',
    mimeType: 'text/plain;charset=utf-8',
    description: '',
    badge: 'TXT',
    iconType: 'text',
  },
  {
    id: 'md',
    name: 'Markdown (MD)',
    extension: 'md',
    mimeType: 'text/markdown;charset=utf-8',
    description: '',
    badge: 'MD',
    iconType: 'code',
  },
  {
    id: 'docx',
    name: 'Документ Word (DOCX)',
    extension: 'docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    description: '',
    badge: 'DOCX',
    iconType: 'doc',
  },
  {
    id: 'html',
    name: 'Веб-страница (HTML)',
    extension: 'html',
    mimeType: 'text/html;charset=utf-8',
    description: '',
    badge: 'HTML',
    iconType: 'code',
  },
  {
    id: 'json',
    name: 'Структура JSON',
    extension: 'json',
    mimeType: 'application/json;charset=utf-8',
    description: '',
    badge: 'JSON',
    iconType: 'code',
  },
  {
    id: 'rtf',
    name: 'Rich Text Format (RTF)',
    extension: 'rtf',
    mimeType: 'application/rtf;charset=utf-8',
    description: '',
    badge: 'RTF',
    iconType: 'doc',
  },
  {
    id: 'pdf',
    name: 'PDF Документ',
    extension: 'pdf',
    mimeType: 'application/pdf',
    description: '',
    badge: 'PDF',
    iconType: 'pdf',
  },
  {
    id: 'epub',
    name: 'Электронная книга (EPUB)',
    extension: 'epub',
    mimeType: 'application/epub+zip',
    description: '',
    badge: 'EPUB',
    iconType: 'book',
  },
  {
    id: 'fb2',
    name: 'FictionBook (FB2)',
    extension: 'fb2',
    mimeType: 'application/xml;charset=utf-8',
    description: '',
    badge: 'FB2',
    iconType: 'book',
  },
  {
    id: 'csv',
    name: 'Таблица CSV',
    extension: 'csv',
    mimeType: 'text/csv;charset=utf-8',
    description: '',
    badge: 'CSV',
    iconType: 'table',
  },
  {
    id: 'tsv',
    name: 'Таблица TSV',
    extension: 'tsv',
    mimeType: 'text/tab-separated-values;charset=utf-8',
    description: '',
    badge: 'TSV',
    iconType: 'table',
  },
];

/**
 * Strips HTML and converts embeds to clean, readable plain text without empty line artifacts
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';

  // Clean attachment embeds first
  const cleaned = html.replace(
    /<span[^>]*class="[^"]*veris-attachment-embed[^"]*"[^>]*>[\s\S]*?<\/span>/gi,
    match => {
      const nameMatch = match.match(/<span[^>]*class="[^"]*truncate[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
      return nameMatch ? `[Вложение: ${nameMatch[1].trim()}]` : '[Вложение]';
    }
  );

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(cleaned, 'text/html');
    const lines: string[] = [];

    const processNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
      }
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
      }

      const el = node as HTMLElement;
      const tag = el.tagName.toUpperCase();

      if (tag === 'BR') {
        return '\n';
      }

      if (tag === 'H1') return `\n${getInlineText(el)}\n`;
      if (tag === 'H2') return `\n${getInlineText(el)}\n`;
      if (tag === 'H3') return `\n${getInlineText(el)}\n`;
      if (tag === 'H4') return `\n${getInlineText(el)}\n`;
      if (tag === 'BLOCKQUOTE') return `\n${getInlineText(el)}\n`;
      if (tag === 'PRE') return `\n${el.textContent || ''}\n`;
      if (tag === 'LI') {
        const parentTag = el.parentElement?.tagName.toUpperCase();
        if (parentTag === 'OL') {
          const index = Array.from(el.parentElement?.children || []).indexOf(el) + 1;
          return `${index}. ${getInlineText(el)}\n`;
        }
        return `• ${getInlineText(el)}\n`;
      }
      if (tag === 'P' || tag === 'DIV') {
        const content = getInlineText(el);
        if (!content || content === '\n') {
          return '\n';
        }
        return `${content}\n`;
      }

      let childText = '';
      for (const child of Array.from(el.childNodes)) {
        childText += processNode(child);
      }
      return childText;
    };

    const getInlineText = (parent: HTMLElement): string => {
      let result = '';
      for (const child of Array.from(parent.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
          result += child.textContent || '';
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const childEl = child as HTMLElement;
          const tag = childEl.tagName.toUpperCase();
          if (tag === 'BR') {
            result += '\n';
          } else {
            result += getInlineText(childEl);
          }
        }
      }
      return result;
    };

    for (const child of Array.from(doc.body.childNodes)) {
      const text = processNode(child);
      if (text) lines.push(text);
    }

    const rawText = lines.join('');
    return rawText
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch (e) {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}

/**
 * Converts rich note HTML into clean standard Markdown with all styles preserved
 */
export function htmlToMarkdown(note: Note): string {
  const rawHtml = note.content || '';

  // Clean embeds first
  const cleaned = rawHtml.replace(
    /<span[^>]*class="[^"]*veris-attachment-embed[^"]*"[^>]*>[\s\S]*?<\/span>/gi,
    match => {
      const nameMatch = match.match(/<span[^>]*class="[^"]*truncate[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
      const name = nameMatch ? nameMatch[1].trim() : 'attachment';
      return `\n\n[Вложение: ${name}]\n\n`;
    }
  );

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(cleaned, 'text/html');

    const renderInline = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
      }
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
      }

      const el = node as HTMLElement;
      const tag = el.tagName.toUpperCase();

      if (tag === 'BR') return '\n';
      if (tag === 'STRONG' || tag === 'B') return `**${renderChildren(el)}**`;
      if (tag === 'EM' || tag === 'I') return `*${renderChildren(el)}*`;
      if (tag === 'U') return `<u>${renderChildren(el)}</u>`;
      if (tag === 'S' || tag === 'DEL' || tag === 'STRIKE') return `~~${renderChildren(el)}~~`;
      if (tag === 'CODE') return `\`${renderChildren(el)}\``;
      if (tag === 'MARK') return `==${renderChildren(el)}==`;
      if (tag === 'A') {
        const href = el.getAttribute('href') || '#';
        return `[${renderChildren(el)}](${href})`;
      }
      if (tag === 'IMG') {
        const src = el.getAttribute('src') || '';
        const alt = el.getAttribute('alt') || 'image';
        return `![${alt}](${src})`;
      }

      return renderChildren(el);
    };

    const renderChildren = (parent: HTMLElement): string => {
      let res = '';
      for (const child of Array.from(parent.childNodes)) {
        res += renderInline(child);
      }
      return res;
    };

    const renderBlock = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = node.textContent?.trim();
        return t ? `${t}\n\n` : '';
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return '';

      const el = node as HTMLElement;
      const tag = el.tagName.toUpperCase();

      if (tag === 'H1') return `# ${renderChildren(el)}\n\n`;
      if (tag === 'H2') return `## ${renderChildren(el)}\n\n`;
      if (tag === 'H3') return `### ${renderChildren(el)}\n\n`;
      if (tag === 'H4') return `#### ${renderChildren(el)}\n\n`;
      if (tag === 'BLOCKQUOTE') return `> ${renderChildren(el)}\n\n`;
      if (tag === 'PRE') return `\`\`\`\n${el.textContent || ''}\n\`\`\`\n\n`;
      if (tag === 'HR') return `---\n\n`;

      if (tag === 'UL') {
        let items = '';
        for (const li of Array.from(el.children)) {
          if (li.tagName.toUpperCase() === 'LI') {
            items += `- ${renderChildren(li as HTMLElement)}\n`;
          }
        }
        return `${items}\n`;
      }

      if (tag === 'OL') {
        let items = '';
        const children = Array.from(el.children);
        for (let i = 0; i < children.length; i++) {
          const li = children[i];
          if (li.tagName.toUpperCase() === 'LI') {
            items += `${i + 1}. ${renderChildren(li as HTMLElement)}\n`;
          }
        }
        return `${items}\n`;
      }

      if (tag === 'P' || tag === 'DIV') {
        const inline = renderChildren(el);
        if (!inline || inline === '\n') {
          return '\n';
        }
        return `${inline}\n\n`;
      }

      return `${renderChildren(el)}\n\n`;
    };

    let mdContent = '';
    for (const child of Array.from(doc.body.childNodes)) {
      mdContent += renderBlock(child);
    }

    const cleanBody = mdContent
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const tagsHeader =
      note.tags && note.tags.length > 0 ? `\n\n**Теги:** ${note.tags.map(t => `#${t}`).join(' ')}` : '';
    const dateStr = new Date(note.updatedAt).toLocaleString('ru-RU');

    return `# ${note.title || 'Без названия'}\n\n*Обновлено: ${dateStr}*${tagsHeader}\n\n---\n\n${cleanBody}`;
  } catch (e) {
    return `# ${note.title || 'Без названия'}\n\n${htmlToPlainText(rawHtml)}`;
  }
}

/**
 * Generates an elegant standalone HTML document
 */
export function generateHtmlDocument(note: Note): string {
  const title = note.title || 'Без названия';
  const dateStr = new Date(note.updatedAt).toLocaleString('ru-RU');
  const tagsHtml =
    note.tags && note.tags.length > 0
      ? `<div class="tags">${note.tags.map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join('')}</div>`
      : '';

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - Veris</title>
  <style>
    :root {
      --bg: #121214;
      --card: #1c1c1f;
      --text: #f0f0f3;
      --accent: #eab308;
      --border: rgba(255, 255, 255, 0.12);
      --dim: rgba(240, 240, 243, 0.6);
    }
    @media (prefers-color-scheme: light) {
      :root {
        --bg: #f8fafc;
        --card: #ffffff;
        --text: #0f172a;
        --accent: #d97706;
        --border: rgba(0, 0, 0, 0.1);
        --dim: rgba(15, 23, 42, 0.6);
      }
    }
    body {
      margin: 0;
      padding: 40px 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
    }
    .container {
      max-width: 760px;
      margin: 0 auto;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 40px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
    }
    h1.title {
      font-size: 2.2rem;
      font-weight: 800;
      margin: 0 0 12px 0;
      line-height: 1.2;
    }
    .meta {
      font-size: 0.85rem;
      color: var(--dim);
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    .tag {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 8px;
      background: rgba(234, 179, 8, 0.15);
      color: var(--accent);
      border: 1px solid rgba(234, 179, 8, 0.3);
    }
    .content {
      font-size: 1.05rem;
    }
    .content p, .content div {
      margin: 0.35em 0;
      line-height: 1.6;
    }
    .content h1 { font-size: 1.7rem; margin: 1.2em 0 0.3em; }
    .content h2 { font-size: 1.4rem; margin: 1.1em 0 0.3em; }
    .content h3 { font-size: 1.2rem; margin: 1em 0 0.25em; }
    .content ul, .content ol {
      margin: 0.4em 0;
      padding-left: 28px;
    }
    .content li {
      margin: 0.2em 0;
    }
    .content blockquote {
      border-left: 4px solid var(--accent);
      padding-left: 16px;
      margin: 16px 0;
      color: var(--dim);
      font-style: italic;
    }
    .content pre {
      background: rgba(0, 0, 0, 0.3);
      padding: 16px;
      border-radius: 12px;
      overflow-x: auto;
      font-family: monospace;
      font-size: 0.9rem;
    }
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
      font-size: 0.8rem;
      color: var(--dim);
      text-align: center;
    }
    @media print {
      body {
        background-color: #ffffff !important;
        color: #000000 !important;
        padding: 0 !important;
      }
      .container {
        border: none !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        padding: 0 !important;
        max-width: 100% !important;
      }
      .footer {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1 class="title">${escapeHtml(title)}</h1>
    <div class="meta">
      <div>Обновлено: ${escapeHtml(dateStr)}</div>
      ${tagsHtml}
    </div>
    <div class="content">
      ${note.content || '<p><em>Пустая заметка</em></p>'}
    </div>
    <div class="footer">
      Экспортировано из <strong>Veris Notes</strong>
    </div>
  </div>
</body>
</html>`;
}

// RTF Unicode escaper
export const escapeRtf = (str: string): string => {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 128) {
      if (str[i] === '\\' || str[i] === '{' || str[i] === '}') {
        result += '\\' + str[i];
      } else if (str[i] === '\n') {
        result += '\\par\n';
      } else {
        result += str[i];
      }
    } else {
      result += '\\u' + (code > 32767 ? code - 65536 : code) + '?';
    }
  }
  return result;
};

/**
 * Generates an RTF document preserving bold, italic, underline, strike, headings and lists
 */
export function generateRtfDocument(note: Note): string {
  const title = note.title || 'Без названия';
  const dateStr = new Date(note.updatedAt).toLocaleString('ru-RU');

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(note.content || '', 'text/html');

    const renderRtfInline = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return escapeRtf(node.textContent || '');
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return '';

      const el = node as HTMLElement;
      const tag = el.tagName.toUpperCase();

      let childrenRtf = '';
      for (const child of Array.from(el.childNodes)) {
        childrenRtf += renderRtfInline(child);
      }

      if (tag === 'BR') return '\\line\n';
      if (tag === 'B' || tag === 'STRONG') return `\\b ${childrenRtf}\\b0 `;
      if (tag === 'I' || tag === 'EM') return `\\i ${childrenRtf}\\i0 `;
      if (tag === 'U') return `\\ul ${childrenRtf}\\ulnone `;
      if (tag === 'S' || tag === 'DEL' || tag === 'STRIKE') return `\\strike ${childrenRtf}\\strike0 `;
      if (tag === 'CODE') return `{\\f2 ${childrenRtf}}`;
      return childrenRtf;
    };

    let rtfBody = '';
    const renderRtfBlock = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = node.textContent?.trim();
        if (t) rtfBody += `\\pard\\sa120\\f1\\fs22 ${escapeRtf(t)}\\par\n`;
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;

      const el = node as HTMLElement;
      const tag = el.tagName.toUpperCase();

      if (tag === 'H1') {
        rtfBody += `\\pard\\sb240\\sa120\\b\\f0\\fs32 ${renderRtfInline(el)}\\b0\\par\n`;
        return;
      }
      if (tag === 'H2') {
        rtfBody += `\\pard\\sb200\\sa100\\b\\f0\\fs28 ${renderRtfInline(el)}\\b0\\par\n`;
        return;
      }
      if (tag === 'H3') {
        rtfBody += `\\pard\\sb160\\sa80\\b\\f0\\fs24 ${renderRtfInline(el)}\\b0\\par\n`;
        return;
      }
      if (tag === 'BLOCKQUOTE') {
        rtfBody += `\\pard\\li400\\sa120\\i\\f1\\fs22 ${renderRtfInline(el)}\\i0\\par\n`;
        return;
      }
      if (tag === 'UL' || tag === 'OL') {
        const isOl = tag === 'OL';
        const children = Array.from(el.children);
        children.forEach((li, idx) => {
          if (li.tagName.toUpperCase() === 'LI') {
            const prefix = isOl ? `${idx + 1}. ` : `\\'95 `;
            rtfBody += `\\pard\\li400\\sa80\\f1\\fs22 ${escapeRtf(prefix)}${renderRtfInline(li as HTMLElement)}\\par\n`;
          }
        });
        return;
      }
      if (tag === 'PRE') {
        rtfBody += `\\pard\\li200\\sa120\\f2\\fs20 ${escapeRtf(el.textContent || '')}\\par\n`;
        return;
      }

      const inline = renderRtfInline(el);
      if (inline.trim()) {
        rtfBody += `\\pard\\sa120\\f1\\fs22 ${inline}\\par\n`;
      }
    };

    for (const child of Array.from(doc.body.childNodes)) {
      renderRtfBlock(child);
    }

    return `{\\rtf1\\ansi\\ansicpg1251\\deff0\\deflang1049{\\fonttbl{\\f0\\fnil\\fcharset204 Segoe UI;}{\\f1\\fnil\\fcharset204 Calibri;}{\\f2\\fnil\\fcharset204 Consolas;}}
{\\colortbl ;\\red234\\green179\\blue8;\\red120\\green120\\blue120;}
\\viewkind4\\uc1\\pard\\sb200\\sa100\\b\\f0\\fs36 ${escapeRtf(title)}\\b0\\par
\\pard\\sa200\\cf2\\f1\\fs18 \'ce\'e1\'ed\'ee\'e2\'eb\'e5\'ed\'ee: ${escapeRtf(dateStr)}\\cf0\\par
${rtfBody || '\\pard\\sa120\\f1\\fs22\\par\n'}
}`;
  } catch (e) {
    return `{\\rtf1\\ansi\\ansicpg1251\\deff0\\deflang1049{\\fonttbl{\\f0\\fnil\\fcharset204 Segoe UI;}{\\f1\\fnil\\fcharset204 Calibri;}}
{\\colortbl ;\\red234\\green179\\blue8;\\red100\\green100\\blue100;}
\\viewkind4\\uc1\\pard\\sb200\\sa100\\b\\f0\\fs36 ${escapeRtf(title)}\\b0\\par
\\pard\\sa200\\cf2\\f1\\fs18 \'ce\'e1\'ed\'ee\'e2\'eb\'e5\'ed\'ee: ${escapeRtf(dateStr)}\\cf0\\par
\\pard\\sb100\\f1\\fs22
${escapeRtf(htmlToPlainText(note.content || ''))}\\par
}`;
  }
}

/**
 * Generates standard FictionBook 2.0 (FB2) format
 */
export function generateFb2Document(note: Note): string {
  const title = escapeXml(note.title || 'Без названия');

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(note.content || '', 'text/html');

    const renderFb2Inline = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) return escapeXml(node.textContent || '');
      if (node.nodeType !== Node.ELEMENT_NODE) return '';

      const el = node as HTMLElement;
      const tag = el.tagName.toUpperCase();

      let children = '';
      for (const child of Array.from(el.childNodes)) {
        children += renderFb2Inline(child);
      }

      if (tag === 'B' || tag === 'STRONG') return `<strong>${children}</strong>`;
      if (tag === 'I' || tag === 'EM') return `<emphasis>${children}</emphasis>`;
      if (tag === 'S' || tag === 'DEL' || tag === 'STRIKE') return `<strikethrough>${children}</strikethrough>`;
      return children;
    };

    const paragraphsXml: string[] = [];
    for (const child of Array.from(doc.body.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const t = child.textContent?.trim();
        if (t) paragraphsXml.push(`<p>${escapeXml(t)}</p>`);
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) continue;

      const el = child as HTMLElement;
      const tag = el.tagName.toUpperCase();

      if (tag.startsWith('H')) {
        paragraphsXml.push(`<subtitle>${renderFb2Inline(el)}</subtitle>`);
      } else if (tag === 'LI') {
        paragraphsXml.push(`<p>• ${renderFb2Inline(el)}</p>`);
      } else {
        const text = renderFb2Inline(el);
        if (text.trim()) {
          paragraphsXml.push(`<p>${text}</p>`);
        }
      }
    }

    return `<?xml version="1.0" encoding="utf-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0" xmlns:l="http://www.w3.org/1999/xlink">
  <description>
    <title-info>
      <genre>nonfiction</genre>
      <author>
        <first-name>Veris</first-name>
        <last-name>User</last-name>
      </author>
      <book-title>${title}</book-title>
      <date>${new Date(note.updatedAt).toISOString().slice(0, 10)}</date>
      <lang>ru</lang>
    </title-info>
    <document-info>
      <author>
        <nickname>Veris</nickname>
      </author>
      <program-used>Veris Notes</program-used>
      <date>${new Date().toISOString().slice(0, 10)}</date>
      <id>veris-${note.id}</id>
      <version>1.0</version>
    </document-info>
  </description>
  <body>
    <title>
      <p>${title}</p>
    </title>
    <section>
      ${paragraphsXml.length > 0 ? paragraphsXml.join('\n      ') : '<p>Пустая заметка</p>'}
    </section>
  </body>
</FictionBook>`;
  } catch (e) {
    const plain = htmlToPlainText(note.content || '');
    const paragraphs = plain.split('\n\n').filter(Boolean);
    const paragraphsXml = paragraphs.map(p => `<p>${escapeXml(p.trim())}</p>`).join('\n      ');

    return `<?xml version="1.0" encoding="utf-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0" xmlns:l="http://www.w3.org/1999/xlink">
  <description>
    <title-info>
      <genre>nonfiction</genre>
      <author>
        <first-name>Veris</first-name>
        <last-name>User</last-name>
      </author>
      <book-title>${title}</book-title>
      <date>${new Date(note.updatedAt).toISOString().slice(0, 10)}</date>
      <lang>ru</lang>
    </title-info>
    <document-info>
      <author>
        <nickname>Veris</nickname>
      </author>
      <program-used>Veris Notes</program-used>
      <date>${new Date().toISOString().slice(0, 10)}</date>
      <id>veris-${note.id}</id>
      <version>1.0</version>
    </document-info>
  </description>
  <body>
    <title>
      <p>${title}</p>
    </title>
    <section>
      ${paragraphsXml || '<p>Пустая заметка</p>'}
    </section>
  </body>
</FictionBook>`;
  }
}

/**
 * Generates an EPUB e-book using JSZip
 */
export async function generateEpubDocument(note: Note): Promise<Blob> {
  const zip = new JSZip();
  const title = escapeXml(note.title || 'Без названия');
  const contentHtml = generateHtmlDocument(note);

  // 1. mimetype (must be first, uncompressed)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. META-INF/container.xml
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  // 3. OEBPS/content.opf
  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${title}</dc:title>
    <dc:creator>Veris Notes</dc:creator>
    <dc:language>ru</dc:language>
    <dc:identifier id="BookID">urn:uuid:veris-${note.id}</dc:identifier>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="content"/>
  </spine>
</package>`
  );

  // 4. OEBPS/toc.ncx
  zip.file(
    'OEBPS/toc.ncx',
    `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:veris-${note.id}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${title}</text></docTitle>
  <navMap>
    <navPoint id="navpoint-1" playOrder="1">
      <navLabel><text>${title}</text></navLabel>
      <content src="content.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`
  );

  // 5. OEBPS/content.xhtml
  zip.file(
    'OEBPS/content.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${title}</title>
  <style type="text/css">
    body { font-family: sans-serif; line-height: 1.6; padding: 5%; }
    h1 { font-size: 1.8em; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div>${note.content || ''}</div>
</body>
</html>`
  );

  return await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
}

/**
 * Generates a full Microsoft Word .DOCX file with rich formatting preserved
 * (bold, italic, underline, strike, headings, lists, quotes, code)
 */
export async function generateDocxDocument(note: Note): Promise<Blob> {
  const zip = new JSZip();
  const title = escapeXml(note.title || 'Без названия');
  const dateStr = new Date(note.updatedAt).toLocaleString('ru-RU');

  interface RunStyle {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strike?: boolean;
    code?: boolean;
    color?: string;
  }

  const renderRun = (text: string, style: RunStyle): string => {
    if (!text) return '';
    let rPr = '';
    if (style.bold) rPr += '<w:b/>';
    if (style.italic) rPr += '<w:i/>';
    if (style.underline) rPr += '<w:u w:val="single"/>';
    if (style.strike) rPr += '<w:strike/>';
    if (style.color) rPr += `<w:color w:val="${style.color.replace('#', '')}"/>`;
    if (style.code) {
      rPr += '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:shd w:fill="F1F5F9"/><w:sz w:val="20"/>';
    } else {
      rPr += '<w:sz w:val="24"/><w:szCs w:val="24"/>';
    }

    return `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
  };

  const traverseInline = (node: Node, style: RunStyle): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return renderRun(node.textContent || '', style);
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as HTMLElement;
    const tag = el.tagName.toUpperCase();

    if (tag === 'BR') {
      return '<w:r><w:br/></w:r>';
    }

    // Attachment embed
    if (el.classList.contains('veris-attachment-embed')) {
      const nameMatch = el.textContent?.trim() || 'Вложение';
      return renderRun(`[${nameMatch}] `, { ...style, bold: true, color: 'EAB308' });
    }

    const nextStyle: RunStyle = { ...style };
    if (tag === 'B' || tag === 'STRONG') nextStyle.bold = true;
    if (tag === 'I' || tag === 'EM') nextStyle.italic = true;
    if (tag === 'U') nextStyle.underline = true;
    if (tag === 'S' || tag === 'DEL' || tag === 'STRIKE') nextStyle.strike = true;
    if (tag === 'CODE') nextStyle.code = true;

    let res = '';
    for (const child of Array.from(el.childNodes)) {
      res += traverseInline(child, nextStyle);
    }
    return res;
  };

  let docxBodyXml = `
    <!-- Note Title -->
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading1"/>
        <w:spacing w:before="120" w:after="120"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="36"/>
          <w:szCs w:val="36"/>
          <w:color w:val="EAB308"/>
        </w:rPr>
        <w:t>${title}</w:t>
      </w:r>
    </w:p>

    <!-- Meta date -->
    <w:p>
      <w:pPr>
        <w:spacing w:after="180"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:i/>
          <w:sz w:val="18"/>
          <w:color w:val="71717A"/>
        </w:rPr>
        <w:t>Обновлено: ${dateStr}</w:t>
      </w:r>
    </w:p>
  `;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(note.content || '', 'text/html');

    const renderBlock = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text) {
          docxBodyXml += `
          <w:p>
            <w:pPr><w:spacing w:after="80" w:line="240" w:lineRule="auto"/></w:pPr>
            ${renderRun(text, {})}
          </w:p>`;
        }
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;

      const el = node as HTMLElement;
      const tag = el.tagName.toUpperCase();

      if (tag === 'H1') {
        docxBodyXml += `
        <w:p>
          <w:pPr>
            <w:pStyle w:val="Heading1"/>
            <w:spacing w:before="240" w:after="80"/>
          </w:pPr>
          ${traverseInline(el, { bold: true })}
        </w:p>`;
        return;
      }

      if (tag === 'H2') {
        docxBodyXml += `
        <w:p>
          <w:pPr>
            <w:pStyle w:val="Heading2"/>
            <w:spacing w:before="200" w:after="60"/>
          </w:pPr>
          ${traverseInline(el, { bold: true })}
        </w:p>`;
        return;
      }

      if (tag === 'H3') {
        docxBodyXml += `
        <w:p>
          <w:pPr>
            <w:pStyle w:val="Heading3"/>
            <w:spacing w:before="160" w:after="40"/>
          </w:pPr>
          ${traverseInline(el, { bold: true })}
        </w:p>`;
        return;
      }

      if (tag === 'H4') {
        docxBodyXml += `
        <w:p>
          <w:pPr>
            <w:pStyle w:val="Heading4"/>
            <w:spacing w:before="120" w:after="40"/>
          </w:pPr>
          ${traverseInline(el, { bold: true })}
        </w:p>`;
        return;
      }

      if (tag === 'BLOCKQUOTE') {
        docxBodyXml += `
        <w:p>
          <w:pPr>
            <w:pBdr>
              <w:left w:val="single" w:sz="24" w:space="12" w:color="EAB308"/>
            </w:pBdr>
            <w:ind w:left="400"/>
            <w:spacing w:after="80" w:before="60"/>
          </w:pPr>
          ${traverseInline(el, { italic: true })}
        </w:p>`;
        return;
      }

      if (tag === 'PRE') {
        docxBodyXml += `
        <w:p>
          <w:pPr>
            <w:shd w:fill="F4F4F5"/>
            <w:ind w:left="200" w:right="200"/>
            <w:spacing w:after="80" w:before="60"/>
          </w:pPr>
          ${renderRun(el.textContent || '', { code: true })}
        </w:p>`;
        return;
      }

      if (tag === 'UL' || tag === 'OL') {
        const isOl = tag === 'OL';
        const children = Array.from(el.children);
        children.forEach((li, idx) => {
          if (li.tagName.toUpperCase() === 'LI') {
            const bullet = isOl ? `${idx + 1}.  ` : '•   ';
            docxBodyXml += `
            <w:p>
              <w:pPr>
                <w:ind w:left="400" w:hanging="240"/>
                <w:spacing w:after="50"/>
              </w:pPr>
              ${renderRun(bullet, { bold: true })}
              ${traverseInline(li, {})}
            </w:p>`;
          }
        });
        return;
      }

      // Paragraph / Div
      const runs = traverseInline(el, {});
      if (!runs) {
        // Preserved empty line without huge gaps
        docxBodyXml += `
        <w:p>
          <w:pPr><w:spacing w:after="60"/></w:pPr>
        </w:p>`;
      } else {
        docxBodyXml += `
        <w:p>
          <w:pPr><w:spacing w:after="80" w:line="240" w:lineRule="auto"/></w:pPr>
          ${runs}
        </w:p>`;
      }
    };

    for (const child of Array.from(doc.body.childNodes)) {
      renderBlock(child);
    }
  } catch (e) {
    const plainText = htmlToPlainText(note.content || '');
    const paragraphs = plainText.split('\n\n').filter(Boolean);
    for (const para of paragraphs) {
      docxBodyXml += `
      <w:p>
        <w:pPr>
          <w:spacing w:after="80" w:line="240" w:lineRule="auto"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:sz w:val="24"/>
          </w:rPr>
          <w:t xml:space="preserve">${escapeXml(para)}</w:t>
        </w:r>
      </w:p>`;
    }
  }

  // [Content_Types].xml
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );

  // _rels/.rels
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  // word/document.xml
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${docxBodyXml}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`
  );

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * Triggers instant browser download of note in chosen format
 */
export async function exportNoteToFile(note: Note, formatId: string): Promise<void> {
  const safeTitle = (note.title || 'note')
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim() || 'note';
  const filename = `${safeTitle}.${formatId}`;

  switch (formatId) {
    case 'txt': {
      const content = `${note.title || 'Без названия'}\n\n${htmlToPlainText(note.content || '')}`;
      downloadBlob(new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' }), filename);
      break;
    }
    case 'md': {
      const content = htmlToMarkdown(note);
      downloadBlob(new Blob(['\uFEFF' + content], { type: 'text/markdown;charset=utf-8' }), filename);
      break;
    }
    case 'html': {
      const content = generateHtmlDocument(note);
      downloadBlob(new Blob(['\uFEFF' + content], { type: 'text/html;charset=utf-8' }), filename);
      break;
    }
    case 'json': {
      const content = JSON.stringify(note, null, 2);
      downloadBlob(new Blob(['\uFEFF' + content], { type: 'application/json;charset=utf-8' }), filename);
      break;
    }
    case 'rtf': {
      const content = generateRtfDocument(note);
      downloadBlob(new Blob([content], { type: 'application/rtf;charset=utf-8' }), filename);
      break;
    }
    case 'fb2': {
      const content = generateFb2Document(note);
      downloadBlob(new Blob(['\uFEFF' + content], { type: 'application/xml;charset=utf-8' }), filename);
      break;
    }
    case 'docx': {
      const blob = await generateDocxDocument(note);
      downloadBlob(blob, filename);
      break;
    }
    case 'epub': {
      const blob = await generateEpubDocument(note);
      downloadBlob(blob, filename);
      break;
    }
    case 'csv': {
      const plain = htmlToPlainText(note.content || '').replace(/"/g, '""');
      const titleCsv = (note.title || '').replace(/"/g, '""');
      const tagsCsv = (note.tags || []).join('; ').replace(/"/g, '""');
      const csv = `"Название","Теги","Создано","Обновлено","Содержимое"\n"${titleCsv}","${tagsCsv}","${new Date(note.createdAt).toISOString()}","${new Date(note.updatedAt).toISOString()}","${plain}"`;
      downloadBlob(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }), filename);
      break;
    }
    case 'tsv': {
      const plain = htmlToPlainText(note.content || '').replace(/\t/g, ' ').replace(/\n/g, '\\n');
      const titleTsv = (note.title || '').replace(/\t/g, ' ');
      const tagsTsv = (note.tags || []).join('; ').replace(/\t/g, ' ');
      const tsv = `Название\tТеги\tСоздано\tОбновлено\tСодержимое\n${titleTsv}\t${tagsTsv}\t${new Date(note.createdAt).toISOString()}\t${new Date(note.updatedAt).toISOString()}\t${plain}`;
      downloadBlob(new Blob(['\uFEFF' + tsv], { type: 'text/tab-separated-values;charset=utf-8' }), filename);
      break;
    }
    case 'pdf': {
      // Create printable frame with beautifully styled note and trigger print/pdf dialog
      printNoteAsPdf(note);
      break;
    }
    default:
      throw new Error(`Неподдерживаемый формат: ${formatId}`);
  }
}

/**
 * Triggers styled print dialog for PDF saving
 */
export function printNoteAsPdf(note: Note): void {
  const html = generateHtmlDocument(note);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  } else {
    // Fallback: create hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 2000);
      }, 400);
    }
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeXml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates the Blob and appropriate filename for a single note in given format
 */
export async function generateSingleNoteBlob(
  note: Note,
  formatId: string
): Promise<{ blob: Blob; filename: string }> {
  const safeTitle = (note.title || 'note')
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim() || 'note';
  const filename = `${safeTitle}.${formatId === 'pdf' ? 'html' : formatId}`;

  switch (formatId) {
    case 'txt': {
      const content = `${note.title || 'Без названия'}\n\n${htmlToPlainText(note.content || '')}`;
      return {
        blob: new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' }),
        filename,
      };
    }
    case 'md': {
      const content = htmlToMarkdown(note);
      return {
        blob: new Blob(['\uFEFF' + content], { type: 'text/markdown;charset=utf-8' }),
        filename,
      };
    }
    case 'html': {
      const content = generateHtmlDocument(note);
      return {
        blob: new Blob(['\uFEFF' + content], { type: 'text/html;charset=utf-8' }),
        filename,
      };
    }
    case 'json': {
      const content = JSON.stringify(note, null, 2);
      return {
        blob: new Blob(['\uFEFF' + content], { type: 'application/json;charset=utf-8' }),
        filename,
      };
    }
    case 'rtf': {
      const content = generateRtfDocument(note);
      return {
        blob: new Blob([content], { type: 'application/rtf;charset=utf-8' }),
        filename,
      };
    }
    case 'fb2': {
      const content = generateFb2Document(note);
      return {
        blob: new Blob(['\uFEFF' + content], { type: 'application/xml;charset=utf-8' }),
        filename,
      };
    }
    case 'docx': {
      const blob = await generateDocxDocument(note);
      return { blob, filename };
    }
    case 'epub': {
      const blob = await generateEpubDocument(note);
      return { blob, filename };
    }
    case 'pdf': {
      const content = generateHtmlDocument(note);
      return {
        blob: new Blob(['\uFEFF' + content], { type: 'text/html;charset=utf-8' }),
        filename: `${safeTitle}.html`,
      };
    }
    default: {
      const content = `${note.title || 'Без названия'}\n\n${htmlToPlainText(note.content || '')}`;
      return {
        blob: new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' }),
        filename: `${safeTitle}.txt`,
      };
    }
  }
}

/**
 * Generates an elegant standalone HTML document combining multiple notes with TOC and styles
 */
export function generateCombinedHtmlDocument(notes: Note[], collectionTitle: string = 'Заметки'): string {
  const dateStr = new Date().toLocaleString('ru-RU');

  const tocItems = notes
    .map((n, i) => {
      const title = n.title?.trim() || `Заметка ${i + 1}`;
      return `<li><a href="#note-${n.id}">${i + 1}. ${escapeHtml(title)}</a></li>`;
    })
    .join('');

  const notesHtml = notes
    .map((note, idx) => {
      const title = note.title?.trim() || `Заметка ${idx + 1}`;
      const updated = new Date(note.updatedAt).toLocaleString('ru-RU');
      const tags =
        note.tags && note.tags.length > 0
          ? `<div class="tags">${note.tags.map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join('')}</div>`
          : '';

      return `
      <section class="note-section" id="note-${note.id}">
        <div class="note-header">
          <span class="note-index">#${idx + 1}</span>
          <h2 class="note-title">${escapeHtml(title)}</h2>
        </div>
        <div class="note-meta">
          <span>Обновлено: ${updated}</span>
          ${tags}
        </div>
        <div class="note-body">
          ${note.content || '<p><em>Нет содержимого</em></p>'}
        </div>
      </section>
      `;
    })
    .join('\n<hr class="note-divider"/>\n');

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(collectionTitle)} - Veris</title>
  <style>
    :root {
      --bg: #121214;
      --card: #1c1c1f;
      --text: #f0f0f3;
      --accent: #eab308;
      --border: rgba(255, 255, 255, 0.12);
      --dim: rgba(240, 240, 243, 0.6);
    }
    @media (prefers-color-scheme: light) {
      :root {
        --bg: #f8fafc;
        --card: #ffffff;
        --text: #0f172a;
        --accent: #d97706;
        --border: rgba(0, 0, 0, 0.1);
        --dim: rgba(15, 23, 42, 0.6);
      }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 40px 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
    }
    .container {
      max-width: 820px;
      margin: 0 auto;
    }
    .collection-header {
      border-bottom: 2px solid var(--accent);
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .collection-title {
      font-size: 32px;
      font-weight: 800;
      margin: 0 0 8px 0;
      color: var(--accent);
    }
    .collection-meta {
      font-size: 14px;
      color: var(--dim);
    }
    .toc {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 40px;
    }
    .toc-title {
      font-size: 16px;
      font-weight: 700;
      margin: 0 0 12px 0;
    }
    .toc ul {
      margin: 0;
      padding-left: 20px;
    }
    .toc li {
      margin-bottom: 6px;
    }
    .toc a {
      color: var(--accent);
      text-decoration: none;
    }
    .toc a:hover {
      text-decoration: underline;
    }
    .note-section {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 28px;
      margin-bottom: 28px;
    }
    .note-header {
      display: flex;
      align-items: baseline;
      gap: 12px;
      margin-bottom: 8px;
    }
    .note-index {
      font-size: 14px;
      font-weight: 800;
      color: var(--accent);
    }
    .note-title {
      font-size: 24px;
      font-weight: 700;
      margin: 0;
    }
    .note-meta {
      font-size: 13px;
      color: var(--dim);
      margin-bottom: 20px;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .tag {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(234, 179, 8, 0.15);
      color: var(--accent);
      font-weight: 500;
    }
    .note-body {
      font-size: 15px;
      line-height: 1.7;
    }
    .note-body img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
    }
    .note-divider {
      border: none;
      height: 1px;
      background: transparent;
      margin: 20px 0;
    }
    @media print {
      body {
        background: white !important;
        color: black !important;
        padding: 0;
      }
      .toc {
        page-break-after: always;
      }
      .note-section {
        border: none;
        background: transparent;
        padding: 0;
        margin-bottom: 40px;
        page-break-after: always;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="collection-header">
      <h1 class="collection-title">${escapeHtml(collectionTitle)}</h1>
      <div class="collection-meta">Всего заметок: ${notes.length} &bull; Экспортировано: ${dateStr}</div>
    </header>

    ${notes.length > 1 ? `
    <nav class="toc">
      <div class="toc-title">Содержание</div>
      <ul>${tocItems}</ul>
    </nav>
    ` : ''}

    <main>
      ${notesHtml}
    </main>
  </div>
</body>
</html>`;
}

/**
 * Generates a multi-page Microsoft Word .DOCX file combining multiple notes
 */
export async function generateCombinedDocxDocument(
  notes: Note[],
  collectionTitle: string = 'Заметки'
): Promise<Blob> {
  const zip = new JSZip();

  let bodyXml = `
    <!-- Collection Cover / Heading -->
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading1"/>
        <w:spacing w:before="240" w:after="120"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="44"/>
          <w:szCs w:val="44"/>
          <w:color w:val="EAB308"/>
        </w:rPr>
        <w:t>${escapeXml(collectionTitle)}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="360"/></w:pPr>
      <w:r>
        <w:rPr><w:i/><w:sz w:val="20"/><w:color w:val="71717A"/></w:rPr>
        <w:t>Всего заметок: ${notes.length} • Экспортировано: ${new Date().toLocaleString('ru-RU')}</w:t>
      </w:r>
    </w:p>
    <w:p><w:r><w:br w:type="page"/></w:r></w:p>
  `;

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const title = escapeXml(note.title || 'Без названия');
    const dateStr = new Date(note.updatedAt).toLocaleString('ru-RU');
    const plainText = htmlToPlainText(note.content || '');
    const paragraphs = plainText.split('\n').filter(Boolean);

    bodyXml += `
      <w:p>
        <w:pPr>
          <w:pStyle w:val="Heading1"/>
          <w:spacing w:before="240" w:after="120"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:b/>
            <w:sz w:val="34"/>
            <w:szCs w:val="34"/>
            <w:color w:val="EAB308"/>
          </w:rPr>
          <w:t>${i + 1}. ${title}</w:t>
        </w:r>
      </w:p>
      <w:p>
        <w:pPr><w:spacing w:after="160"/></w:pPr>
        <w:r>
          <w:rPr><w:i/><w:sz w:val="18"/><w:color w:val="71717A"/></w:rPr>
          <w:t>Обновлено: ${dateStr}</w:t>
        </w:r>
      </w:p>
    `;

    for (const para of paragraphs) {
      bodyXml += `
      <w:p>
        <w:pPr><w:spacing w:after="100" w:line="240" w:lineRule="auto"/></w:pPr>
        <w:r>
          <w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>
          <w:t xml:space="preserve">${escapeXml(para)}</w:t>
        </w:r>
      </w:p>`;
    }

    if (i < notes.length - 1) {
      bodyXml += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    }
  }

  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );

  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyXml}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`
  );

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * Generates an RTF document combining multiple notes with page breaks
 */
export function generateCombinedRtfDocument(notes: Note[], collectionTitle: string = 'Заметки'): string {
  let rtf = '{\\rtf1\\ansi\\ansicpg1251\\deff0\\deflang1049{\\fonttbl{\\f0\\fnil\\fcharset204 Segoe UI;}{\\f1\\fnil\\fcharset204 Calibri;}}\n';
  rtf += '{\\colortbl ;\\red234\\green179\\blue8;\\red120\\green120\\blue120;}\n';
  rtf += `\\viewkind4\\uc1\\pard\\sb240\\sa120\\b\\f0\\fs40 ${escapeRtf(collectionTitle)}\\b0\\par\n`;
  rtf += `\\pard\\sa240\\cf2\\f1\\fs18 \'c2\'f1\'e5\'e3\'ee \'e7\'e0\'ec\'e5\'f2\'ee\'ea: ${notes.length} | \'dd\'ea\'f1\'ef\'ee\'f0\'f2: ${escapeRtf(new Date().toLocaleString('ru-RU'))}\\cf0\\par\\par\n`;

  notes.forEach((note, idx) => {
    if (idx > 0) {
      rtf += '\\page\n';
    }
    const title = note.title?.trim() || `Заметка ${idx + 1}`;
    const dateStr = new Date(note.updatedAt).toLocaleString('ru-RU');
    rtf += `\\pard\\sb200\\sa100\\b\\f0\\fs34 ${idx + 1}. ${escapeRtf(title)}\\b0\\par\n`;
    rtf += `\\pard\\sa180\\cf2\\f1\\fs18 \'ce\'e1\'ed\'ee\'e2\'eb\'e5\'ed\'ee: ${escapeRtf(dateStr)}\\cf0\\par\n`;

    const plain = htmlToPlainText(note.content || '');
    const paras = plain.split('\n');
    paras.forEach(p => {
      if (p.trim()) {
        rtf += `\\pard\\sa100\\f1\\fs22 ${escapeRtf(p)}\\par\n`;
      }
    });
  });

  rtf += '}';
  return rtf;
}

/**
 * Triggers styled print dialog for PDF saving of combined notes
 */
export function printCombinedNotes(notes: Note[], collectionTitle: string = 'Заметки'): void {
  const html = generateCombinedHtmlDocument(notes, collectionTitle);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  } else {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 2000);
      }, 400);
    }
  }
}

/**
 * Exports multiple notes as individual files packed into a ZIP archive
 */
export async function exportNotesAsZip(
  notes: Note[],
  formatId: string,
  archiveName: string = 'notes_export'
): Promise<void> {
  const zip = new JSZip();
  const nameCount: Record<string, number> = {};

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const { blob, filename } = await generateSingleNoteBlob(note, formatId);

    // Deduplicate filename
    const extIndex = filename.lastIndexOf('.');
    const base = extIndex > 0 ? filename.substring(0, extIndex) : filename;
    const ext = extIndex > 0 ? filename.substring(extIndex) : '';

    let finalName = filename;
    if (nameCount[filename]) {
      nameCount[filename]++;
      finalName = `${base} (${nameCount[filename]})${ext}`;
    } else {
      nameCount[filename] = 1;
    }

    zip.file(finalName, blob);
  }

  const safeArchiveName = archiveName
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim() || 'notes_export';

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/zip',
  });

  downloadBlob(zipBlob, `${safeArchiveName}.zip`);
}

/**
 * Exports multiple notes combined into a single file in the chosen format
 */
export async function exportCombinedNotes(
  notes: Note[],
  formatId: string,
  collectionTitle: string = 'Заметки',
  customFilename?: string
): Promise<void> {
  const dateStr = new Date().toISOString().slice(0, 10);
  const safeBase = (customFilename || `${collectionTitle}_${dateStr}`)
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim();

  switch (formatId) {
    case 'txt': {
      const header = `════════════════════════════════════════════════════════════\n${collectionTitle.toUpperCase()}\nВсего заметок: ${notes.length} | Экспортировано: ${new Date().toLocaleString('ru-RU')}\n════════════════════════════════════════════════════════════\n\n`;
      const combined = notes
        .map((note, idx) => {
          const sep = '─'.repeat(60);
          const title = note.title?.trim() || `Заметка ${idx + 1}`;
          const date = new Date(note.updatedAt).toLocaleString('ru-RU');
          const tags = note.tags && note.tags.length > 0 ? `Теги: ${note.tags.join(', ')}\n` : '';
          const body = htmlToPlainText(note.content || '');
          return `${sep}\n[${idx + 1}] ${title}\nДата изменения: ${date}\n${tags}${sep}\n\n${body}`;
        })
        .join('\n\n\n');

      downloadBlob(
        new Blob(['\uFEFF' + header + combined], { type: 'text/plain;charset=utf-8' }),
        `${safeBase}.txt`
      );
      break;
    }

    case 'md': {
      const header = `# ${collectionTitle}\n\n> Экспортировано: ${new Date().toLocaleString('ru-RU')} • Всего заметок: **${notes.length}**\n\n---\n\n`;
      const combined = notes
        .map((note, idx) => {
          const title = note.title?.trim() || `Заметка ${idx + 1}`;
          const date = new Date(note.updatedAt).toLocaleString('ru-RU');
          const tags =
            note.tags && note.tags.length > 0
              ? ` | Теги: ${note.tags.map(t => '`#' + t + '`').join(' ')}`
              : '';
          const mdContent = htmlToMarkdown(note);
          return `## ${idx + 1}. ${title}\n\n*Обновлено: ${date}${tags}*\n\n${mdContent}`;
        })
        .join('\n\n---\n\n');

      downloadBlob(
        new Blob(['\uFEFF' + header + combined], { type: 'text/markdown;charset=utf-8' }),
        `${safeBase}.md`
      );
      break;
    }

    case 'html': {
      const html = generateCombinedHtmlDocument(notes, collectionTitle);
      downloadBlob(
        new Blob(['\uFEFF' + html], { type: 'text/html;charset=utf-8' }),
        `${safeBase}.html`
      );
      break;
    }

    case 'json': {
      const data = {
        collection: collectionTitle,
        exportedAt: new Date().toISOString(),
        totalNotes: notes.length,
        notes: notes,
      };
      downloadBlob(
        new Blob(['\uFEFF' + JSON.stringify(data, null, 2)], {
          type: 'application/json;charset=utf-8',
        }),
        `${safeBase}.json`
      );
      break;
    }

    case 'rtf': {
      const rtf = generateCombinedRtfDocument(notes, collectionTitle);
      downloadBlob(new Blob([rtf], { type: 'application/rtf;charset=utf-8' }), `${safeBase}.rtf`);
      break;
    }

    case 'docx': {
      const blob = await generateCombinedDocxDocument(notes, collectionTitle);
      downloadBlob(blob, `${safeBase}.docx`);
      break;
    }

    case 'pdf': {
      printCombinedNotes(notes, collectionTitle);
      break;
    }

    default: {
      throw new Error(`Неподдерживаемый формат для объединения: ${formatId}`);
    }
  }
}

/**
 * Universal export batch function for both single merged file or separate ZIP files
 */
export async function exportNotesBatch(
  notes: Note[],
  mode: 'single' | 'separate',
  formatId: string,
  options?: {
    collectionTitle?: string;
    baseName?: string;
  }
): Promise<void> {
  const collectionTitle = options?.collectionTitle || 'Заметки';
  const baseName = options?.baseName || `${collectionTitle.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`;

  if (mode === 'separate') {
    await exportNotesAsZip(notes, formatId, baseName);
  } else {
    await exportCombinedNotes(notes, formatId, collectionTitle, baseName);
  }
}
