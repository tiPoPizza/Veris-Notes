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
 * Strips HTML and converts embeds to clean plain text
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';

  let text = html
    .replace(/<span[^>]*class="[^"]*veris-attachment-embed[^"]*"[^>]*>[\s\S]*?<\/span>/gi, match => {
      const nameMatch = match.match(/<span[^>]*class="[^"]*truncate[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
      return nameMatch ? `[Вложение: ${nameMatch[1]}]` : '[Вложение]';
    })
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n# $1\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n')
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n\n#### $1\n')
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '\n> $1\n')
    .replace(/<pre[^>]*><code>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n• $1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  // Decode standard HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return text.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Converts rich note HTML into clean standard Markdown
 */
export function htmlToMarkdown(note: Note): string {
  let content = note.content || '';

  // Extract attachments before stripping
  content = content
    .replace(/<span[^>]*class="[^"]*veris-attachment-embed[^"]*"[^>]*>[\s\S]*?<\/span>/gi, match => {
      const nameMatch = match.match(/<span[^>]*class="[^"]*truncate[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
      const name = nameMatch ? nameMatch[1] : 'attachment';
      return `\n\n![${name}](${name})\n\n`;
    })
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n')
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n')
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '\n> $1\n')
    .replace(/<pre[^>]*><code>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n')
    .replace(/<code>([\s\S]*?)<\/code>/gi, '`$1`')
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*')
    .replace(/<del[^>]*>([\s\S]*?)<\/del>/gi, '~~$1~~')
    .replace(/<s[^>]*>([\s\S]*?)<\/s>/gi, '~~$1~~')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  content = content
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  const tagsHeader = note.tags && note.tags.length > 0 ? `\n\n**Теги:** ${note.tags.map(t => `#${t}`).join(' ')}` : '';
  const dateStr = new Date(note.updatedAt).toLocaleString('ru-RU');

  return `# ${note.title || 'Без названия'}\n\n*Обновлено: ${dateStr}*\n${tagsHeader}\n\n---\n\n${content.trim()}`;
}

/**
 * Generates an elegant standalone HTML document
 */
export function generateHtmlDocument(note: Note): string {
  const title = note.title || 'Без названия';
  const dateStr = new Date(note.updatedAt).toLocaleString('ru-RU');
  const tagsHtml = note.tags && note.tags.length > 0
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
      line-height: 1.65;
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
    .content h1 { font-size: 1.7rem; margin: 1.4em 0 0.4em; }
    .content h2 { font-size: 1.4rem; margin: 1.2em 0 0.4em; }
    .content h3 { font-size: 1.2rem; margin: 1em 0 0.3em; }
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

/**
 * Generates an RTF document
 */
export function generateRtfDocument(note: Note): string {
  const title = note.title || 'Без названия';
  const plainText = htmlToPlainText(note.content || '');

  // RTF Unicode escaper
  const escapeRtf = (str: string) => {
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

  return `{\\rtf1\\ansi\\ansicpg1251\\deff0\\deflang1049{\\fonttbl{\\f0\\fnil\\fcharset204 Segoe UI;}{\\f1\\fnil\\fcharset204 Calibri;}}
{\\colortbl ;\\red234\\green179\\blue8;\\red100\\green100\\blue100;}
\\viewkind4\\uc1\\pard\\sb200\\sa100\\b\\f0\\fs36 ${escapeRtf(title)}\\b0\\fs20\\par
\\pard\\sa200\\cf2\\f1\\fs18 \'ce\'e1\'ed\'ee\'e2\'eb\'e5\'ed\'ee: ${new Date(note.updatedAt).toLocaleString('ru-RU')}\\cf0\\par
\\pard\\sb100\\f1\\fs22
${escapeRtf(plainText)}\\par
}`;
}

/**
 * Generates standard FictionBook 2.0 (FB2) format
 */
export function generateFb2Document(note: Note): string {
  const title = escapeXml(note.title || 'Без названия');
  const plain = htmlToPlainText(note.content || '');
  const paragraphs = plain.split('\n\n').filter(Boolean);

  const paragraphsXml = paragraphs
    .map(p => `<p>${escapeXml(p.trim().replace(/\n/g, '<empty-line/>'))}</p>`)
    .join('\n      ');

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
 * Generates a full Microsoft Word .DOCX file using JSZip and OpenXML
 */
export async function generateDocxDocument(note: Note): Promise<Blob> {
  const zip = new JSZip();
  const title = escapeXml(note.title || 'Без названия');
  const plainText = htmlToPlainText(note.content || '');
  const paragraphs = plainText.split('\n\n').filter(Boolean);

  let docxBodyXml = `
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading1"/>
        <w:spacing w:before="240" w:after="120"/>
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
    <w:p>
      <w:pPr>
        <w:spacing w:after="240"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:i/>
          <w:sz w:val="18"/>
          <w:color w:val="666666"/>
        </w:rPr>
        <w:t>Обновлено: ${new Date(note.updatedAt).toLocaleString('ru-RU')}</w:t>
      </w:r>
    </w:p>
  `;

  for (const para of paragraphs) {
    docxBodyXml += `
    <w:p>
      <w:pPr>
        <w:spacing w:after="160" w:line="276" w:lineRule="auto"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:sz w:val="24"/>
        </w:rPr>
        <w:t xml:space="preserve">${escapeXml(para)}</w:t>
      </w:r>
    </w:p>
    `;
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
