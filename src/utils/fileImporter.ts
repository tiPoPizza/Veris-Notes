import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { Note, NoteAttachment } from '../types';

// Configure PDF.js worker
if (typeof window !== 'undefined' && pdfjsLib) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('PDF.js worker initialization warning:', e);
  }
}

export interface ImportedNoteData {
  title: string;
  content: string;
  tags?: string[];
  attachments?: NoteAttachment[];
}

export interface ImportResult {
  notes: ImportedNoteData[];
  fullBackupData?: {
    notes?: Note[];
    taskLists?: any[];
    tags?: string[];
  };
  filename: string;
  success: boolean;
  error?: string;
}

/**
 * Creates HTML string representation of an in-place attachment embed widget
 */
export function createAttachmentEmbedHtml(
  att: NoteAttachment,
  isLight = false,
  accentColor = '#FBBF24'
): string {
  const isAudio =
    att.type.startsWith('audio/') ||
    /\.(mp3|wav|ogg|m4a|aac|webm|opus|flac|wma)$/i.test(att.name);

  if (isAudio) {
    const bgStyle = isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.07)';
    const borderStyle = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.14)';
    const buttonBg = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)';
    const buttonBorder = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.14)';
    const textColor = isLight ? '#000000' : '#FFFFFF';
    return `<div class="veris-audio-embed my-3 p-3.5 rounded-2xl flex flex-col gap-2.5 select-none cursor-default w-full max-w-lg border transition shadow-lg" data-attachment-id="${att.id}" data-attachment-type="audio" contenteditable="false" draggable="true" style="background-color: ${bgStyle}; border-color: ${borderStyle}; color: inherit; user-select: none;"><div class="flex items-center gap-3 w-full"><button type="button" class="veris-audio-play-btn w-11 h-11 min-w-[44px] max-w-[44px] rounded-full flex items-center justify-center shrink-0 cursor-pointer shadow-md transition active:scale-95 text-white" style="background-color: ${accentColor};" title="Воспроизвести"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 4 19 12 6 20 6 4"/></svg></button><div class="flex-1 flex flex-col justify-center min-w-0 px-0.5 gap-1"><div class="veris-audio-seekbar-container w-full h-5 flex items-center cursor-pointer select-none" title="Перемотка" draggable="false"><svg class="veris-audio-seekbar-svg w-full h-5 cursor-pointer overflow-visible select-none pointer-events-auto" viewBox="0 0 1000 20" preserveAspectRatio="none"><line x1="0" y1="10" x2="1000" y2="10" stroke="${textColor}" stroke-opacity="${isLight ? '0.18' : '0.24'}" stroke-width="4.5" stroke-linecap="round" /><rect class="veris-audio-thumb" x="0" y="2" width="5" height="16" rx="2.5" fill="${accentColor}" /></svg></div><div class="w-full flex items-center justify-between text-[11px] font-mono select-none leading-none opacity-80"><span class="veris-audio-time font-semibold font-mono tracking-tight shrink-0">00:00</span><span class="truncate text-[10px] opacity-60 ml-2 max-w-[170px] sm:max-w-[240px]" title="${att.name}">${att.name}</span></div></div></div><div class="flex items-center justify-between gap-2 w-full pt-1"><button type="button" class="veris-audio-delete-btn w-9 h-7.5 min-w-[36px] max-w-[36px] min-h-[30px] max-h-[30px] p-0 rounded-xl text-red-400 hover:text-red-500 active:scale-90 transition select-none shrink-0 cursor-pointer flex items-center justify-center border" title="Удалить запись" style="background-color: ${buttonBg}; border-color: ${buttonBorder};"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg></button><div class="flex-1 flex items-center justify-center gap-2 max-w-[260px]"><button type="button" class="veris-audio-rewind-btn flex-1 h-7.5 min-h-[30px] max-h-[30px] px-2 rounded-xl text-[11px] font-mono font-bold transition active:scale-95 select-none cursor-pointer flex items-center justify-center border" title="Назад 15 сек" style="background-color: ${buttonBg}; color: ${textColor}; border-color: ${buttonBorder};"><span>-15</span></button><button type="button" class="veris-audio-forward-btn flex-1 h-7.5 min-h-[30px] max-h-[30px] px-2 rounded-xl text-[11px] font-mono font-bold transition active:scale-95 select-none cursor-pointer flex items-center justify-center border" title="Вперед 15 сек" style="background-color: ${buttonBg}; color: ${textColor}; border-color: ${buttonBorder};"><span>+15</span></button></div><button type="button" class="veris-audio-speed-btn w-9 h-7.5 min-w-[36px] max-w-[36px] min-h-[30px] max-h-[30px] p-0 rounded-xl text-[11px] font-mono font-bold leading-none transition active:scale-90 select-none shrink-0 cursor-pointer flex items-center justify-center text-center border" data-speed="1" title="Скорость воспроизведения" style="background-color: ${buttonBg}; color: ${textColor}; border-color: ${buttonBorder};">1x</button></div></div>&nbsp;`;
  }

  const isImg =
    att.type.startsWith('image/') ||
    /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(att.name);
  const iconEmoji = isImg ? '🖼️' : '📄';

  const formattedSize =
    att.size > 1024 * 1024
      ? `${(att.size / (1024 * 1024)).toFixed(1)} МБ`
      : `${Math.max(1, Math.round(att.size / 1024))} КБ`;

  const bgStyle = isLight ? 'rgba(0, 0, 0, 0.07)' : 'rgba(255, 255, 255, 0.12)';

  return `<span class="veris-attachment-embed inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold my-1 mr-2 align-middle select-none cursor-pointer transition shadow-xs hover:opacity-85 active:scale-95" data-attachment-id="${att.id}" contenteditable="false" draggable="true" style="background-color: ${bgStyle}; border-color: ${accentColor}; color: inherit; display: inline-flex; user-select: none;"><span class="text-sm select-none pointer-events-none">${iconEmoji}</span><span class="truncate max-w-[200px] select-none pointer-events-none">${att.name}</span><span class="text-[10px] opacity-60 font-mono ml-0.5 select-none pointer-events-none">(${formattedSize})</span></span>&nbsp;`;
}

/**
 * Parses markdown syntax to rich HTML
 */
function markdownToHtml(md: string): string {
  let html = md
    // Escape standard tags first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers
    .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Blockquote
    .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
    // Bold & Italic
    .replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/___(.*?)___/gim, '<strong><em>$1</em></strong>')
    .replace(/__(.*?)__/gim, '<strong>$1</strong>')
    .replace(/_(.*?)_/gim, '<em>$1</em>')
    // Strikethrough
    .replace(/~~(.*?)~~/gim, '<del>$1</del>')
    // Code blocks
    .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    // Unordered lists
    .replace(/^\s*[\-\*]\s+(.*$)/gim, '<li>$1</li>')
    // Ordered lists
    .replace(/^\s*\d+\.\s+(.*$)/gim, '<li>$1</li>')
    // Newlines
    .replace(/\n\n+/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  return `<p>${html}</p>`
    .replace(/<p><\/p>/g, '')
    .replace(/<p><h([1-4])>/g, '<h$1>')
    .replace(/<\/h([1-4])><\/p>/g, '</h$1>')
    .replace(/<p><blockquote>/g, '<blockquote>')
    .replace(/<\/blockquote><\/p>/g, '</blockquote>')
    .replace(/<\/blockquote>(?:\s*(?:<br\/?>|\n)\s*)*<blockquote>/gi, '<br>')
    .replace(/<p><pre>/g, '<pre>')
    .replace(/<\/pre><\/p>/g, '</pre>');
}

/**
 * Parses RTF format to clean HTML
 */
function parseRtfToHtml(rtfText: string): string {
  let str = rtfText;
  
  // Remove binary/image sections and font tables
  str = str.replace(/\{\\fonttbl[\s\S]*?\}/g, '');
  str = str.replace(/\{\\colortbl[\s\S]*?\}/g, '');
  str = str.replace(/\{\\stylesheet[\s\S]*?\}/g, '');
  str = str.replace(/\{\\info[\s\S]*?\}/g, '');
  str = str.replace(/\{\\\*[\s\S]*?\}/g, '');

  // Handle unicode escapes \uN?
  str = str.replace(/\\u(\d+)\??/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  
  // Handle hex characters \'xx
  str = str.replace(/\\\'([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  // Convert basic formatting
  str = str.replace(/\\b(?:\s+|0\b)/g, (match) => match.includes('0') ? '</b>' : '<b>');
  str = str.replace(/\\i(?:\s+|0\b)/g, (match) => match.includes('0') ? '</i>' : '<i>');
  str = str.replace(/\\ul(?:\s+|0\b)/g, (match) => match.includes('0') ? '</u>' : '<u>');
  str = str.replace(/\\par\b/g, '</p><p>');
  str = str.replace(/\\line\b/g, '<br/>');
  str = str.replace(/\\tab\b/g, ' &emsp; ');

  // Remove other backslash control tags
  str = str.replace(/\\[a-zA-Z0-9\-]+\b ?/g, '');
  // Remove remaining RTF brackets
  str = str.replace(/[\{\}]/g, '');

  return `<p>${str.trim()}</p>`.replace(/<p><\/p>/g, '');
}

/**
 * Parses CSV or CVT (comma / semicolon separated values) into an HTML table
 */
function parseCsvToHtml(csvText: string, separator: string = ','): string {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return '';

  let html = '<table class="w-full border-collapse my-3 text-xs border border-white/20">';
  lines.forEach((line, index) => {
    // Basic CSV splitting taking into account quotes
    const cells = line.split(new RegExp(`${separator}(?=(?:(?:[^\"]*\"){2})*[^\"]*$)`));
    html += '<tr class="border-b border-white/10">';
    cells.forEach(cell => {
      const cleanCell = cell.trim().replace(/^"|"$/g, '').replace(/""/g, '"');
      const tag = index === 0 ? 'th' : 'td';
      const cellStyle = index === 0 
        ? 'padding: 6px 10px; font-weight: bold; background: rgba(255,255,255,0.08); text-align: left;'
        : 'padding: 6px 10px; opacity: 0.9;';
      html += `<${tag} style="${cellStyle}">${cleanCell || '&nbsp;'}</${tag}>`;
    });
    html += '</tr>';
  });
  html += '</table>';
  return html;
}

/**
 * Parses FB2 (FictionBook 2) XML with in-place image positioning
 */
function parseFb2(xmlText: string): { title: string; html: string; attachments: NoteAttachment[] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  
  // Extract book title
  const titleElem = doc.querySelector('title-info book-title') || doc.querySelector('book-title');
  const bookTitle = titleElem?.textContent?.trim() || '';

  // Extract embedded images from <binary>
  const attachments: NoteAttachment[] = [];
  const binMap: Record<string, NoteAttachment> = {};

  const binaryElems = doc.querySelectorAll('binary');
  binaryElems.forEach(bin => {
    const rawId = bin.getAttribute('id') || `img_${Date.now()}`;
    const contentType = bin.getAttribute('content-type') || 'image/jpeg';
    const base64Data = bin.textContent?.trim().replace(/\s+/g, '') || '';
    if (base64Data) {
      const dataUrl = `data:${contentType};base64,${base64Data}`;
      const ext = contentType.split('/')[1] || 'jpg';
      const name = rawId.includes('.') ? rawId : `${rawId}.${ext}`;
      const att: NoteAttachment = {
        id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name,
        size: Math.round(base64Data.length * 0.75),
        type: contentType,
        dataUrl,
        updatedAt: Date.now(),
      };
      attachments.push(att);
      binMap[rawId.toLowerCase()] = att;
      binMap[rawId.replace(/^#/, '').toLowerCase()] = att;
      binMap[name.toLowerCase()] = att;
    }
  });

  // Extract body
  const bodyElem = doc.querySelector('body');
  if (!bodyElem) {
    return { title: bookTitle, html: `<p>${xmlText.slice(0, 500)}</p>`, attachments };
  }

  let html = '';
  
  // Process sections, titles, poems, epigraphs, images, and paragraphs in natural order
  const elements = bodyElem.querySelectorAll('title, subtitle, p, v, epigraph, cite, empty-line, image');
  elements.forEach(el => {
    const tag = el.tagName.toLowerCase();

    if (tag === 'image') {
      const href = (el.getAttribute('l:href') || el.getAttribute('xlink:href') || el.getAttribute('href') || '').replace(/^#/, '');
      const cleanHref = href.toLowerCase();
      const matched = binMap[cleanHref] || attachments.find(a => a.name.toLowerCase().includes(cleanHref));
      if (matched) {
        html += `<div class="my-2">${createAttachmentEmbedHtml(matched)}</div>`;
      }
      return;
    }

    const text = el.textContent?.trim() || '';
    if (!text && tag !== 'empty-line') return;

    switch (tag) {
      case 'title':
        html += `<h2 class="text-xl font-bold my-3">${text}</h2>`;
        break;
      case 'subtitle':
        html += `<h3 class="text-lg font-semibold my-2">${text}</h3>`;
        break;
      case 'epigraph':
      case 'cite':
        html += `<blockquote class="border-l-4 border-amber-400 pl-3 my-2 opacity-80 italic">${text}</blockquote>`;
        break;
      case 'empty-line':
        html += '<br/>';
        break;
      case 'v': // verse line in poem
        html += `<div class="italic pl-4 text-xs">${text}</div>`;
        break;
      case 'p':
      default:
        html += `<p class="my-1.5">${text}</p>`;
        break;
    }
  });

  return {
    title: bookTitle,
    html: html || `<p>${bodyElem.textContent || ''}</p>`,
    attachments,
  };
}

/**
 * Parses EPUB files using JSZip with in-place attachment placement and clean image replacement
 */
async function parseEpub(arrayBuffer: ArrayBuffer): Promise<{ title: string; html: string; attachments: NoteAttachment[] }> {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const attachments: NoteAttachment[] = [];
  const pathToAttachment: Record<string, NoteAttachment> = {};
  const nameToAttachment: Record<string, NoteAttachment> = {};

  // Extract all embedded images from the EPUB container
  const imageEntries = Object.keys(zip.files).filter(path =>
    /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(path) && !path.startsWith('__MACOSX')
  );

  for (const imgPath of imageEntries) {
    const imgFile = zip.file(imgPath);
    if (imgFile) {
      try {
        const base64 = await imgFile.async('base64');
        const ext = imgPath.split('.').pop()?.toLowerCase() || 'jpg';
        const mime = ext === 'png' ? 'image/png' : ext === 'svg' ? 'image/svg+xml' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
        const dataUrl = `data:${mime};base64,${base64}`;
        const fileName = imgPath.split('/').pop() || `image.${ext}`;
        const att: NoteAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: fileName,
          size: Math.round(base64.length * 0.75),
          type: mime,
          dataUrl,
          updatedAt: Date.now(),
        };
        attachments.push(att);
        pathToAttachment[imgPath.toLowerCase()] = att;
        nameToAttachment[fileName.toLowerCase()] = att;
        nameToAttachment[decodeURIComponent(fileName.toLowerCase())] = att;
      } catch (err) {
        console.warn('Failed to extract EPUB image:', imgPath, err);
      }
    }
  }
  
  // 1. Locate container.xml to find root .opf
  let opfPath = '';
  const containerFile = zip.file('META-INF/container.xml');
  if (containerFile) {
    const containerXml = await containerFile.async('text');
    const parser = new DOMParser();
    const containerDoc = parser.parseFromString(containerXml, 'text/xml');
    const rootfile = containerDoc.querySelector('rootfile');
    opfPath = rootfile?.getAttribute('full-path') || '';
  }

  let bookTitle = '';
  const htmlChapters: string[] = [];
  const opfDir = opfPath ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

  if (opfPath && zip.file(opfPath)) {
    const opfXml = await zip.file(opfPath)!.async('text');
    const parser = new DOMParser();
    const opfDoc = parser.parseFromString(opfXml, 'text/xml');
    
    // Get title
    const dcTitle = opfDoc.querySelector('title, dc\\:title');
    bookTitle = dcTitle?.textContent?.trim() || '';

    // Manifest items
    const manifestItems: Record<string, string> = {};
    opfDoc.querySelectorAll('manifest > item').forEach(item => {
      const id = item.getAttribute('id');
      const href = item.getAttribute('href');
      if (id && href) {
        manifestItems[id] = opfDir + href;
      }
    });

    // Spine reading order
    const spineItemRefs = opfDoc.querySelectorAll('spine > itemref');
    for (const itemref of Array.from(spineItemRefs)) {
      const idref = itemref.getAttribute('idref');
      if (idref && manifestItems[idref]) {
        const file = zip.file(manifestItems[idref]);
        if (file) {
          const content = await file.async('text');
          htmlChapters.push(content);
        }
      }
    }
  }

  // Fallback: If no spine found, gather all .html/.xhtml/.htm files
  if (htmlChapters.length === 0) {
    const htmlFiles = Object.keys(zip.files).filter(path => 
      /\.(xhtml|html|htm)$/i.test(path) && !path.startsWith('__MACOSX')
    ).sort();

    for (const path of htmlFiles) {
      const file = zip.file(path);
      if (file) {
        const content = await file.async('text');
        htmlChapters.push(content);
      }
    }
  }

  // Clean and combine HTML chapters with in-place image widget replacement
  let combinedHtml = '';
  const parser = new DOMParser();
  for (const chapter of htmlChapters) {
    try {
      const doc = parser.parseFromString(chapter, 'text/html');
      if (!bookTitle) {
        const titleTag = doc.querySelector('title, h1');
        if (titleTag && titleTag.textContent) {
          bookTitle = titleTag.textContent.trim();
        }
      }

      // Remove script and style tags
      doc.querySelectorAll('script, style, link').forEach(s => s.remove());

      // Replace <img>, <image>, and <svg> with in-place attachment embed widgets
      const imgElements = Array.from(doc.querySelectorAll('img, image, svg'));
      imgElements.forEach(elem => {
        let src = elem.getAttribute('src') || elem.getAttribute('xlink:href') || elem.getAttribute('href') || '';
        
        if (elem.tagName.toLowerCase() === 'svg') {
          const nestedImg = elem.querySelector('image');
          if (nestedImg) {
            src = nestedImg.getAttribute('xlink:href') || nestedImg.getAttribute('href') || nestedImg.getAttribute('src') || '';
          } else {
            return;
          }
        }

        const cleanSrc = decodeURIComponent(src.split('?')[0].split('#')[0]);
        const fileName = cleanSrc.split('/').pop()?.toLowerCase() || '';

        // Match with extracted attachment
        let matchedAtt: NoteAttachment | undefined = undefined;
        if (fileName && nameToAttachment[fileName]) {
          matchedAtt = nameToAttachment[fileName];
        } else if (cleanSrc) {
          for (const key of Object.keys(pathToAttachment)) {
            if (key.endsWith(fileName) || (cleanSrc.length > 3 && key.includes(cleanSrc.toLowerCase()))) {
              matchedAtt = pathToAttachment[key];
              break;
            }
          }
        }

        if (matchedAtt) {
          const span = doc.createElement('span');
          span.innerHTML = createAttachmentEmbedHtml(matchedAtt);
          const widget = span.firstElementChild || span;
          elem.replaceWith(widget);
        } else {
          // Remove broken local image so browser doesn't show broken placeholder box
          if (!src.startsWith('data:image/') && !src.startsWith('http://') && !src.startsWith('https://')) {
            elem.remove();
          }
        }
      });

      const body = doc.querySelector('body');
      if (body) {
        combinedHtml += body.innerHTML + '<hr class="my-4 opacity-30"/>';
      }
    } catch (e) {
      combinedHtml += `<p>${chapter}</p>`;
    }
  }

  return {
    title: bookTitle,
    html: combinedHtml || '<p>Пустая книга EPUB</p>',
    attachments,
  };
}

/**
 * Parses PDF using pdfjs-dist
 */
async function parsePdf(arrayBuffer: ArrayBuffer): Promise<{ title: string; html: string }> {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  let fullTextHtml = '';
  let firstLineTitle = '';

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    let lastY: number | null = null;
    let pageHtml = '';
    
    for (const item of textContent.items as any[]) {
      if ('str' in item) {
        const str = item.str;
        if (!str.trim()) continue;

        if (!firstLineTitle && str.trim().length > 3) {
          firstLineTitle = str.trim();
        }

        // New line detection based on vertical coordinate changes
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 8) {
          pageHtml += '<br/>';
        }
        pageHtml += str + ' ';
        lastY = item.transform[5];
      }
    }

    fullTextHtml += `<div class="pdf-page my-3 pb-2 border-b border-white/10"><p>${pageHtml}</p></div>`;
  }

  return {
    title: firstLineTitle || `PDF Документ (${numPages} стр.)`,
    html: fullTextHtml,
  };
}

/**
 * Master parser function that processes any supported file format
 */
export async function parseFileToNotes(file: File): Promise<ImportResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const baseName = file.name.replace(/\.[^/.]+$/, '');

  try {
    // 0. Standalone Images (PNG, JPG, JPEG, WEBP, GIF, SVG, BMP, AVIF, ICO, TIFF)
    const imageExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'avif', 'ico', 'tiff'];
    if (imageExtensions.includes(ext) || file.type.startsWith('image/')) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const att: NoteAttachment = {
        id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        size: file.size,
        type: file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        dataUrl,
        updatedAt: Date.now(),
      };

      return {
        filename: file.name,
        success: true,
        notes: [{
          title: baseName || 'Изображение',
          content: `<p>${createAttachmentEmbedHtml(att)}</p>`,
          attachments: [att],
          tags: ['Изображение', 'Импорт'],
        }],
      };
    }

    // 0.1 Audio files (.mp3, .wav, .ogg, .m4a, .aac, .flac, .opus, .webm, .wma)
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus', 'webm', 'wma'].includes(ext) || file.type.startsWith('audio/')) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const audioMime = file.type || (
        ext === 'mp3' ? 'audio/mpeg' :
        ext === 'wav' ? 'audio/wav' :
        ext === 'ogg' ? 'audio/ogg' :
        ext === 'm4a' ? 'audio/mp4' :
        ext === 'aac' ? 'audio/aac' :
        ext === 'flac' ? 'audio/flac' :
        ext === 'opus' ? 'audio/opus' :
        ext === 'webm' ? 'audio/webm' :
        'audio/mpeg'
      );

      const att: NoteAttachment = {
        id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        size: file.size,
        type: audioMime,
        dataUrl,
        updatedAt: Date.now(),
      };

      return {
        filename: file.name,
        success: true,
        notes: [{
          title: baseName || 'Аудиозапись',
          content: `<p>${createAttachmentEmbedHtml(att)}</p>`,
          attachments: [att],
          tags: ['Аудио', 'Импорт'],
        }],
      };
    }

    // 1. PDF
    if (ext === 'pdf') {
      const buffer = await file.arrayBuffer();
      const { title, html } = await parsePdf(buffer);
      return {
        filename: file.name,
        success: true,
        notes: [{
          title: title || baseName,
          content: html,
          tags: ['PDF', 'Импорт'],
        }],
      };
    }

    // 2. DOCX (with embedded image extraction)
    if (ext === 'docx') {
      const buffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
      
      // Extract images from word/media/* in DOCX zip package
      const attachments: NoteAttachment[] = [];
      try {
        const zip = await JSZip.loadAsync(buffer);
        const mediaFiles = Object.keys(zip.files).filter(p =>
          p.startsWith('word/media/') && /\.(png|jpe?g|gif|webp|svg|bmp|emf|wmf)$/i.test(p)
        );

        for (const mediaPath of mediaFiles) {
          const mFile = zip.file(mediaPath);
          if (mFile) {
            const base64 = await mFile.async('base64');
            const mExt = mediaPath.split('.').pop()?.toLowerCase() || 'jpg';
            const mime = mExt === 'png' ? 'image/png' : mExt === 'svg' ? 'image/svg+xml' : mExt === 'gif' ? 'image/gif' : 'image/jpeg';
            const dataUrl = `data:${mime};base64,${base64}`;
            const fileName = mediaPath.split('/').pop() || `image.${mExt}`;
            attachments.push({
              id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              name: fileName,
              size: Math.round(base64.length * 0.75),
              type: mime,
              dataUrl,
              updatedAt: Date.now(),
            });
          }
        }
      } catch (e) {
        console.warn('DOCX image extraction warning:', e);
      }

      return {
        filename: file.name,
        success: true,
        notes: [{
          title: baseName,
          content: result.value || '<p>Пустой документ</p>',
          attachments,
          tags: ['DOCX', 'Импорт'],
        }],
      };
    }

    // 3. EPUB
    if (ext === 'epub') {
      const buffer = await file.arrayBuffer();
      const { title, html, attachments } = await parseEpub(buffer);
      return {
        filename: file.name,
        success: true,
        notes: [{
          title: title || baseName,
          content: html,
          attachments,
          tags: ['Книги', 'EPUB'],
        }],
      };
    }

    // 4. FB2
    if (ext === 'fb2') {
      const text = await file.text();
      const { title, html, attachments } = parseFb2(text);
      return {
        filename: file.name,
        success: true,
        notes: [{
          title: title || baseName,
          content: html,
          attachments,
          tags: ['Книги', 'FB2'],
        }],
      };
    }

    // 5. RTF
    if (ext === 'rtf') {
      const text = await file.text();
      const html = parseRtfToHtml(text);
      return {
        filename: file.name,
        success: true,
        notes: [{
          title: baseName,
          content: html,
          tags: ['RTF', 'Импорт'],
        }],
      };
    }

    // 6. JSON (Veris backup or generic note JSON)
    if (ext === 'json') {
      const text = await file.text();
      const data = JSON.parse(text);

      // Full Veris backup format
      if (data && (Array.isArray(data.notes) || data.app === 'Veris Notes' || data.taskLists)) {
        return {
          filename: file.name,
          success: true,
          notes: (data.notes || []).map((n: any) => ({
            title: n.title || 'Без названия',
            content: n.content || '',
            attachments: n.attachments || [],
            tags: n.tags || ['Импорт'],
          })),
          fullBackupData: data,
        };
      }

      // Array of notes or objects
      if (Array.isArray(data)) {
        const parsedNotes = data.map((item, idx) => {
          if (typeof item === 'string') {
            return { title: `Элемент ${idx + 1}`, content: `<p>${item}</p>`, tags: ['JSON'] };
          }
          return {
            title: item.title || item.name || `Заметка ${idx + 1}`,
            content: item.content || item.body || item.text || `<pre><code>${JSON.stringify(item, null, 2)}</code></pre>`,
            attachments: item.attachments || [],
            tags: item.tags || ['JSON'],
          };
        });

        return {
          filename: file.name,
          success: true,
          notes: parsedNotes,
        };
      }

      // Single object
      return {
        filename: file.name,
        success: true,
        notes: [{
          title: data.title || data.name || baseName,
          content: data.content || data.body || data.text || `<pre><code>${JSON.stringify(data, null, 2)}</code></pre>`,
          attachments: data.attachments || [],
          tags: data.tags || ['JSON'],
        }],
      };
    }

    // 7. HTML / HTM (with data:image extraction and in-place embed replacement)
    if (ext === 'html' || ext === 'htm') {
      const text = await file.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      
      const attachments: NoteAttachment[] = [];
      doc.querySelectorAll('img').forEach((img, idx) => {
        const src = img.getAttribute('src') || '';
        if (src.startsWith('data:image/')) {
          const mimeMatch = src.match(/^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,/);
          const mime = mimeMatch ? mimeMatch[1] : 'image/png';
          const iExt = mime.split('/')[1]?.split('+')[0] || 'png';
          const alt = img.getAttribute('alt') || `Изображение ${idx + 1}`;
          const name = alt.includes('.') ? alt : `${alt}.${iExt}`;
          const att: NoteAttachment = {
            id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name,
            size: Math.round(src.length * 0.75),
            type: mime,
            dataUrl: src,
            updatedAt: Date.now(),
          };
          attachments.push(att);
          const span = doc.createElement('span');
          span.innerHTML = createAttachmentEmbedHtml(att);
          img.replaceWith(span.firstElementChild || span);
        }
      });

      doc.querySelectorAll('script, style, link').forEach(el => el.remove());
      
      const titleTag = doc.querySelector('title, h1');
      const docTitle = titleTag?.textContent?.trim() || baseName;
      const bodyHtml = doc.body?.innerHTML || text;

      return {
        filename: file.name,
        success: true,
        notes: [{
          title: docTitle,
          content: bodyHtml,
          attachments,
          tags: ['HTML', 'Импорт'],
        }],
      };
    }

    // 8. Markdown (MD)
    if (ext === 'md' || ext === 'markdown') {
      const text = await file.text();
      const lines = text.split('\n');
      const firstLine = lines[0]?.replace(/^#+\s*/, '').trim();
      const title = firstLine && firstLine.length < 80 ? firstLine : baseName;
      const html = markdownToHtml(text);

      return {
        filename: file.name,
        success: true,
        notes: [{
          title,
          content: html,
          tags: ['Markdown', 'Импорт'],
        }],
      };
    }

    // 9. CSV / CVT
    if (ext === 'csv' || ext === 'cvt') {
      const text = await file.text();
      const separator = text.includes(';') ? ';' : ',';
      const html = parseCsvToHtml(text, separator);

      return {
        filename: file.name,
        success: true,
        notes: [{
          title: baseName,
          content: html,
          tags: [ext.toUpperCase(), 'Таблица'],
        }],
      };
    }

    // 10. TSV / TAB
    if (ext === 'tsv' || ext === 'tab') {
      const text = await file.text();
      const html = parseCsvToHtml(text, '\t');

      return {
        filename: file.name,
        success: true,
        notes: [{
          title: baseName,
          content: html,
          tags: ['TSV', 'Таблица'],
        }],
      };
    }

    // 11. TXT (and any generic plain text)
    const rawText = await file.text();
    const lines = rawText.split('\n');
    const firstLine = lines[0]?.trim();
    const title = firstLine && firstLine.length < 80 ? firstLine : baseName;
    const formattedContent = lines.map(line => line.trim() ? `<p>${line}</p>` : '<br/>').join('');

    return {
      filename: file.name,
      success: true,
      notes: [{
        title: title || baseName,
        content: formattedContent || `<p>${rawText}</p>`,
        tags: ['Текст', 'Импорт'],
      }],
    };

  } catch (error: any) {
    console.error('Error importing file:', file.name, error);
    return {
      filename: file.name,
      success: false,
      notes: [],
      error: error?.message || 'Не удалось распознать формат файла',
    };
  }
}
