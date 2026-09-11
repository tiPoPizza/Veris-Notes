import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../i18n';
import { hexToRgba, isLightColor } from '../themes';
import { Image as ImageIcon, FileText, Check, GripVertical, Trash2, Mic, Layers } from 'lucide-react';
import { NoteAttachment, NoteBlock } from '../types';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import { FormattingToolbar } from './FormattingToolbar';
import { FloatingNoteSearch } from './FloatingNoteSearch';
import { NoteReadModal } from './NoteReadModal';
import { BlockNotesModal } from './BlockNotesModal';
import { stripHtmlTags } from '../utils/textUtils';
import { getFontFamilyStyle } from '../utils/fonts';

/**
 * Generates a clean, bold straight seekbar SVG with accent color.
 * The played portion is a bold straight line in theme.accent ending in a smooth thumb knob.
 * The unplayed portion is a clean subtle straight track extending to the end.
 */
function renderStraightScrubberSvg(
  progress: number, // 0.0 to 1.0
  accentColor: string,
  textColor: string,
  isLight: boolean
): string {
  const width = 1000;
  const height = 20;
  const midY = 10;
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const playedX = Math.round(clampedProgress * width);

  const unplayedLine = `<line x1="0" y1="${midY}" x2="${width}" y2="${midY}" stroke="${textColor}" stroke-opacity="${isLight ? '0.18' : '0.24'}" stroke-width="4.5" stroke-linecap="round" />`;

  const playedLine =
    playedX > 0
      ? `<line x1="0" y1="${midY}" x2="${playedX}" y2="${midY}" stroke="${accentColor}" stroke-width="4.5" stroke-linecap="round" />`
      : '';

  const thumbX = Math.max(0, Math.min(width - 5, playedX - 2.5));
  const thumbPill = `
    <rect 
      class="veris-audio-thumb" 
      x="${thumbX}" 
      y="2" 
      width="5" 
      height="16" 
      rx="2.5" 
      fill="${accentColor}" 
      style="filter: drop-shadow(0 1px 3px rgba(0,0,0,0.38));"
    />
  `;

  return `
    <svg class="veris-audio-seekbar-svg w-full h-5 cursor-pointer overflow-visible select-none pointer-events-auto" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      ${unplayedLine}
      ${playedLine}
      ${thumbPill}
    </svg>
  `;
}

/**
 * Creates an interactive DOM element for an attachment widget inside the note body.
 */
function createAttachmentEmbedDom(
  att: NoteAttachment,
  isLight: boolean,
  accentColor: string,
  themeBg: string,
  themeText: string
): HTMLElement {
  const isAudio =
    att.type.startsWith('audio/') ||
    /\.(mp3|wav|ogg|m4a|aac|webm|opus|flac|wma)$/i.test(att.name);

  if (isAudio) {
    const div = document.createElement('div');
    div.className =
      'veris-audio-embed my-3 p-3.5 rounded-2xl flex flex-col gap-2.5 select-none cursor-default w-full max-w-lg border transition shadow-lg';
    div.setAttribute('data-attachment-id', att.id);
    div.setAttribute('data-attachment-type', 'audio');
    div.setAttribute('contenteditable', 'false');
    div.setAttribute('draggable', 'true');

    // Theme palette-matched styling (inherits theme text/bg tone, avoiding cold blue tint)
    const bgStyle = isLight ? hexToRgba(themeText, 0.04) : hexToRgba(themeText, 0.07);
    const borderStyle = hexToRgba(themeText, isLight ? 0.08 : 0.14);
    const buttonBg = hexToRgba(themeText, isLight ? 0.05 : 0.08);
    const buttonBorder = hexToRgba(themeText, isLight ? 0.08 : 0.14);

    div.style.background = bgStyle;
    div.style.backdropFilter = 'blur(20px) saturate(180%)';
    div.style.borderColor = borderStyle;
    div.style.boxShadow = isLight
      ? '0 6px 20px -4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.7)'
      : '0 8px 24px -4px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)';
    div.style.color = 'inherit';
    div.style.userSelect = 'none';
    div.style.lineHeight = 'normal';
    div.style.boxSizing = 'border-box';
    div.style.height = 'auto';
    div.style.minHeight = 'auto';
    div.style.maxHeight = 'none';

    const textColor = themeText;
    const accentTextColor = isLightColor(accentColor) ? '#000000' : '#FFFFFF';
    const scrubberHtml = renderStraightScrubberSvg(0, accentColor, textColor, isLight);

    div.innerHTML = `
      <div class="flex items-center gap-3 w-full">
        <button type="button" class="veris-audio-play-btn w-11 h-11 min-w-[44px] max-w-[44px] rounded-full flex items-center justify-center shrink-0 cursor-pointer shadow-md transition active:scale-95" style="background-color: ${accentColor}; color: ${accentTextColor};" title="Воспроизвести">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 4 19 12 6 20 6 4"/></svg>
        </button>
        <div class="flex-1 flex flex-col justify-center min-w-0 px-0.5 gap-1">
          <div class="veris-audio-seekbar-container w-full h-5 flex items-center cursor-pointer select-none" title="Перемотка" draggable="false">
            ${scrubberHtml}
          </div>
          <div class="w-full flex items-center justify-between text-[11px] font-mono select-none leading-none opacity-80">
            <span class="veris-audio-time font-semibold font-mono tracking-tight shrink-0">00:00</span>
            <span class="truncate text-[10px] opacity-60 ml-2 max-w-[170px] sm:max-w-[240px]" title="${att.name}">${att.name}</span>
          </div>
        </div>
      </div>
      <div class="flex items-center justify-between gap-2 w-full pt-1">
        <button type="button" class="veris-audio-speed-btn w-9 h-7.5 min-w-[36px] max-w-[36px] min-h-[30px] max-h-[30px] p-0 rounded-xl text-[11px] font-mono font-bold leading-none transition active:scale-90 select-none shrink-0 cursor-pointer flex items-center justify-center text-center border" data-speed="1" title="Скорость воспроизведения" style="background-color: ${buttonBg}; color: ${textColor}; border-color: ${buttonBorder};">1x</button>
        <div class="flex-1 flex items-center justify-center gap-2 max-w-[260px]">
          <button type="button" class="veris-audio-rewind-btn flex-1 h-7.5 min-h-[30px] max-h-[30px] px-2 rounded-xl text-[11px] font-mono font-bold transition active:scale-95 select-none cursor-pointer flex items-center justify-center border" title="Назад 15 сек" style="background-color: ${buttonBg}; color: ${textColor}; border-color: ${buttonBorder};">
            <span>-15</span>
          </button>
          <button type="button" class="veris-audio-forward-btn flex-1 h-7.5 min-h-[30px] max-h-[30px] px-2 rounded-xl text-[11px] font-mono font-bold transition active:scale-95 select-none cursor-pointer flex items-center justify-center border" title="Вперед 15 сек" style="background-color: ${buttonBg}; color: ${textColor}; border-color: ${buttonBorder};">
            <span>+15</span>
          </button>
        </div>
        <button type="button" class="veris-audio-delete-btn w-9 h-7.5 min-w-[36px] max-w-[36px] min-h-[30px] max-h-[30px] p-0 rounded-xl text-red-400 hover:text-red-500 active:scale-90 transition select-none shrink-0 cursor-pointer flex items-center justify-center border" title="Удалить запись" style="background-color: ${buttonBg}; border-color: ${buttonBorder};">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"/>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            <line x1="10" x2="10" y1="11" y2="17"/>
            <line x1="14" x2="14" y1="11" y2="17"/>
          </svg>
        </button>
      </div>
    `;

    return div;
  }

  const span = document.createElement('span');
  span.className =
    'veris-attachment-embed inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold my-1 mr-2 align-middle select-none cursor-pointer transition shadow-xs hover:opacity-85 active:scale-95';
  span.setAttribute('data-attachment-id', att.id);
  span.setAttribute('contenteditable', 'false');
  span.setAttribute('draggable', 'true');

  const isImg =
    att.type.startsWith('image/') ||
    /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(att.name);
  const iconEmoji = isImg ? '🖼️' : '📄';

  const formattedSize =
    att.size > 1024 * 1024
      ? `${(att.size / (1024 * 1024)).toFixed(1)} МБ`
      : `${Math.max(1, Math.round(att.size / 1024))} КБ`;

  span.style.backgroundColor = isLight
    ? 'rgba(0, 0, 0, 0.07)'
    : 'rgba(255, 255, 255, 0.12)';
  span.style.borderColor = accentColor;
  span.style.color = 'inherit';
  span.style.display = 'inline-flex';
  span.style.userSelect = 'none';

  span.innerHTML = `
    <span class="text-sm select-none pointer-events-none">${iconEmoji}</span>
    <span class="truncate max-w-[200px] select-none pointer-events-none">${att.name}</span>
    <span class="text-[10px] opacity-60 font-mono ml-0.5 select-none pointer-events-none">(${formattedSize})</span>
  `;

  return span;
}

const NOTE_PLACEHOLDERS = [
  'Время расцветать...',
  'Свежий лист...',
  'Затакт...',
  'Ваше слово...',
  'Ваша тема...',
  'Начало строки...',
];

export const NoteEditor: React.FC = () => {
  const {
    activeNoteId,
    notes,
    blocks,
    updateNote,
    addAttachmentToNote,
    deleteAttachmentFromNote,
    moveAttachmentIndex,
    isNoteSearchOpen,
    setIsNoteSearchOpen,
    quickSettings,
    theme,
    language,
    isFocusMode,
    undoNoteContent,
    redoNoteContent,
    lastHistoryAction,
  } = useApp();

  const [selectedAttachment, setSelectedAttachment] = useState<NoteAttachment | null>(null);
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [audioToDelete, setAudioToDelete] = useState<{ attId: string; embedEl: HTMLElement } | null>(null);
  const [readOnlyNoteId, setReadOnlyNoteId] = useState<string | null>(null);
  const [activeBlockModalId, setActiveBlockModalId] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionPosition, setMentionPosition] = useState<{ top: number; left: number; above: boolean } | null>(null);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState<number>(0);

  const editorRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastActiveNoteIdRef = useRef<string | null>(null);
  const noteScrollPositionsRef = useRef<Record<string, number>>({});
  const isKeyboardOpenRef = useRef<boolean>(false);
  const wasEditingBeforeSelectionRef = useRef<boolean>(false);
  const lastSavedRangeRef = useRef<Range | null>(null);

  // Active audio player reference
  const activeAudioRef = useRef<{
    audio: HTMLAudioElement;
    attId: string;
    embedEl: HTMLElement;
  } | null>(null);

  // Drag tracking refs
  const draggedAttachmentRef = useRef<NoteAttachment | null>(null);
  const draggedFromEditorNodeRef = useRef<HTMLElement | null>(null);

  // Touch drag tracking for mobile
  const touchStateRef = useRef<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    att: NoteAttachment | null;
    isDragging: boolean;
    ghostEl: HTMLElement | null;
    timer: any;
  }>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    att: null,
    isDragging: false,
    ghostEl: null,
    timer: null,
  });

  const note = notes.find(n => n.id === activeNoteId);

  const isLight = isLightColor(theme.bg);
  const cardBg = isLight ? hexToRgba(theme.text, 0.05) : hexToRgba(theme.text, 0.08);
  const cardBorder = quickSettings.showBorder ? theme.accent : hexToRgba(theme.text, 0.15);

  // Check for @ mention trigger in text preceding caret
  const checkMentionTrigger = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed || !editorRef.current) {
      setMentionQuery(null);
      return;
    }
    if (sel.rangeCount === 0) {
      setMentionQuery(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (
      !editorRef.current.contains(range.commonAncestorContainer) &&
      range.commonAncestorContainer !== editorRef.current
    ) {
      setMentionQuery(null);
      return;
    }

    const textNode = range.startContainer;
    if (textNode.nodeType === Node.TEXT_NODE) {
      const text = textNode.textContent || '';
      const offset = range.startOffset;
      const textBeforeCaret = text.slice(0, offset);

      // Match @ followed by letters/digits/underscores
      const match = textBeforeCaret.match(/@([^\s@]*)$/);
      if (match) {
        const q = match[1];
        setMentionQuery(q);

        const rect = range.getBoundingClientRect();
        const editorRect = editorRef.current.getBoundingClientRect();

        const caretLeft = rect.left > 0 ? rect.left : editorRect.left + 20;
        const caretTop = rect.top > 0 ? rect.top : editorRect.top + 40;
        const caretBottom = rect.bottom > 0 ? rect.bottom : editorRect.top + 60;

        const spaceBelow = window.innerHeight - caretBottom;
        const isAbove = spaceBelow < 220 && caretTop > 200;

        const left = Math.max(16, Math.min(caretLeft, window.innerWidth - 300));
        const top = isAbove ? Math.max(16, caretTop - 8) : caretBottom + 8;

        setMentionPosition({ top, left, above: isAbove });
        setSelectedMentionIndex(0);
        return;
      }
    }

    setMentionQuery(null);
  }, []);

  // Ensure caret line gently scrolls only if it reaches the top edge of the bottom menu
  const ensureCaretAboveBottomMenu = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editorRef.current) return;
    const range = sel.getRangeAt(0);
    if (
      !editorRef.current.contains(range.commonAncestorContainer) &&
      range.commonAncestorContainer !== editorRef.current
    ) {
      return;
    }

    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    let rect: DOMRect | null = null;
    const clientRects = range.getClientRects();
    if (clientRects.length > 0 && clientRects[0].height > 0) {
      rect = clientRects[0];
    } else {
      const bound = range.getBoundingClientRect();
      if (bound && bound.height > 0) {
        rect = bound;
      } else {
        const el =
          range.startContainer.nodeType === Node.ELEMENT_NODE
            ? (range.startContainer as HTMLElement)
            : range.startContainer.parentElement;
        if (el) {
          rect = el.getBoundingClientRect();
        }
      }
    }

    if (!rect || rect.height === 0) return;

    // Find top boundary of the bottom pill
    const dockPill =
      document.getElementById('floating-dock-pill') ||
      document.getElementById('floating-bottom-dock');

    const dockTop = dockPill
      ? dockPill.getBoundingClientRect().top
      : (typeof window !== 'undefined' ? window.innerHeight - 70 : 600);

    // Only scroll if the caret's bottom is within 10px of or colliding with the pill
    const threshold = dockTop - 10;

    if (rect.bottom > threshold) {
      const diff = rect.bottom - threshold;
      if (diff > 0 && diff < 100) {
        scrollContainer.scrollTop += diff;
      }
    }
  }, []);

  const handleEditorInput = useCallback(() => {
    if (editorRef.current && note) {
      updateNote(note.id, { content: editorRef.current.innerHTML });
    }
    checkMentionTrigger();
    requestAnimationFrame(() => {
      ensureCaretAboveBottomMenu();
    });
  }, [note, updateNote, checkMentionTrigger, ensureCaretAboveBottomMenu]);

  // Mention items (both blocks and notes) for @ mention
  type MentionItem =
    | { kind: 'block'; item: NoteBlock }
    | { kind: 'note'; item: any };

  const mentionItems: MentionItem[] = React.useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase().replace(/_/g, ' ').trim();

    const matchedBlocks: MentionItem[] = (blocks || [])
      .filter(b => {
        const name = (b.name || '').toLowerCase();
        const nameUnderscore = name.replace(/\s+/g, '_');
        if (!q) return true;
        return name.includes(q) || nameUnderscore.includes(q);
      })
      .map(b => ({ kind: 'block', item: b }));

    const matchedNotes: MentionItem[] = notes
      .filter(n => {
        if (n.id === activeNoteId) return false;
        const title = (n.title || 'Без названия').toLowerCase();
        const titleUnderscore = title.replace(/\s+/g, '_');
        if (!q) return true;
        return title.includes(q) || titleUnderscore.includes(q);
      })
      .map(n => ({ kind: 'note', item: n }));

    return [...matchedBlocks, ...matchedNotes];
  }, [blocks, notes, activeNoteId, mentionQuery]);

  // Insert chosen block mention as interactive link
  const insertBlockMention = useCallback(
    (targetBlock: NoteBlock) => {
      const sel = window.getSelection();
      if (!sel || !editorRef.current) return;

      let range = sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
      if (!range && lastSavedRangeRef.current) {
        range = lastSavedRangeRef.current;
      }
      if (!range) return;

      const textNode = range.startContainer;
      if (textNode.nodeType !== Node.TEXT_NODE) return;

      const text = textNode.textContent || '';
      const offset = range.startOffset;
      const textBeforeCaret = text.slice(0, offset);
      const lastAt = textBeforeCaret.lastIndexOf('@');
      if (lastAt === -1) return;

      const rawName = targetBlock.name?.trim() || 'Блок';
      const safeName = rawName.replace(/\s+/g, '_');

      const linkSpan = document.createElement('span');
      linkSpan.className =
        'veris-block-link font-semibold underline cursor-pointer px-0.5 mx-0.5 transition active:scale-95 inline-flex items-center gap-0.5 select-none';
      linkSpan.setAttribute('data-block-id', targetBlock.id);
      linkSpan.setAttribute('contenteditable', 'false');
      linkSpan.style.color = theme.accent;
      linkSpan.style.backgroundColor = 'transparent';
      linkSpan.textContent = `@${safeName}`;

      const beforeText = text.slice(0, lastAt);
      const afterText = text.slice(offset);

      textNode.textContent = beforeText;
      const spaceNode = document.createTextNode('\u00A0' + afterText);

      if (textNode.nextSibling) {
        textNode.parentNode?.insertBefore(linkSpan, textNode.nextSibling);
        textNode.parentNode?.insertBefore(spaceNode, linkSpan.nextSibling);
      } else {
        textNode.parentNode?.appendChild(linkSpan);
        textNode.parentNode?.appendChild(spaceNode);
      }

      const newRange = document.createRange();
      newRange.setStart(spaceNode, 1);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      lastSavedRangeRef.current = newRange.cloneRange();

      setMentionQuery(null);
      if (editorRef.current && note) {
        updateNote(note.id, { content: editorRef.current.innerHTML });
      }
    },
    [theme.accent, note, updateNote]
  );

  // Insert chosen note mention as interactive link
  const insertNoteMention = useCallback(
    (targetNote: any) => {
      const sel = window.getSelection();
      if (!sel || !editorRef.current) return;

      let range = sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
      if (!range && lastSavedRangeRef.current) {
        range = lastSavedRangeRef.current;
      }
      if (!range) return;

      const textNode = range.startContainer;
      if (textNode.nodeType !== Node.TEXT_NODE) return;

      const text = textNode.textContent || '';
      const offset = range.startOffset;
      const textBeforeCaret = text.slice(0, offset);
      const lastAt = textBeforeCaret.lastIndexOf('@');
      if (lastAt === -1) return;

      const rawTitle = targetNote.title?.trim() || 'Без_названия';
      const safeTitle = rawTitle.replace(/\s+/g, '_');

      const linkSpan = document.createElement('span');
      linkSpan.className =
        'veris-note-link font-semibold underline cursor-pointer px-0.5 mx-0.5 transition active:scale-95 inline-flex items-center gap-0.5 select-none';
      linkSpan.setAttribute('data-note-id', targetNote.id);
      linkSpan.setAttribute('contenteditable', 'false');
      linkSpan.style.color = theme.accent;
      linkSpan.style.backgroundColor = 'transparent';
      linkSpan.textContent = `@${safeTitle}`;

      const beforeText = text.slice(0, lastAt);
      const afterText = text.slice(offset);

      textNode.textContent = beforeText;
      const spaceNode = document.createTextNode('\u00A0' + afterText);

      if (textNode.nextSibling) {
        textNode.parentNode?.insertBefore(linkSpan, textNode.nextSibling);
        textNode.parentNode?.insertBefore(spaceNode, linkSpan.nextSibling);
      } else {
        textNode.parentNode?.appendChild(linkSpan);
        textNode.parentNode?.appendChild(spaceNode);
      }

      // Position caret right after spaceNode
      const newRange = document.createRange();
      newRange.setStart(spaceNode, 1);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      lastSavedRangeRef.current = newRange.cloneRange();

      setMentionQuery(null);
      if (editorRef.current && note) {
        updateNote(note.id, { content: editorRef.current.innerHTML });
      }
    },
    [theme.accent, note, updateNote]
  );

  const isScrubbingRef = useRef<{
    att: NoteAttachment;
    embedEl: HTMLElement;
    seekbarEl: HTMLElement;
  } | null>(null);

  // Stop active audio playback
  const stopCurrentAudio = useCallback(() => {
    if (activeAudioRef.current) {
      const { audio, embedEl } = activeAudioRef.current;
      audio.pause();
      audio.currentTime = 0;
      const playBtn = embedEl.querySelector('.veris-audio-play-btn');
      if (playBtn) {
        playBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none" class="translate-x-[1.5px]"><polygon points="7 4.5 19.5 12 7 19.5 7 4.5"/></svg>`;
      }
      const seekbarContainer = embedEl.querySelector('.veris-audio-seekbar-container');
      if (seekbarContainer) {
        seekbarContainer.innerHTML = renderStraightScrubberSvg(
          0,
          theme.accent,
          theme.text,
          isLight
        );
      }
      activeAudioRef.current = null;
    }
  }, [theme.accent, theme.text, isLight]);

  // Cleanup audio and search on note switch or unmount
  useEffect(() => {
    return () => {
      stopCurrentAudio();
      setIsNoteSearchOpen(false);
    };
  }, [activeNoteId, stopCurrentAudio, setIsNoteSearchOpen]);

  // Global Ctrl+F / Cmd+F handler inside Note Editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsNoteSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsNoteSearchOpen]);

  const formatSecs = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Helper to initialize or reuse the active Audio instance without forced playback
  const initAudioInstance = useCallback(
    (att: NoteAttachment, embedEl: HTMLElement): HTMLAudioElement => {
      if (activeAudioRef.current && activeAudioRef.current.attId === att.id) {
        activeAudioRef.current.embedEl = embedEl;
        return activeAudioRef.current.audio;
      }

      stopCurrentAudio();

      const audio = new Audio(att.dataUrl);
      const speedBtn = embedEl.querySelector('.veris-audio-speed-btn') as HTMLElement | null;
      const speed = speedBtn ? parseFloat(speedBtn.getAttribute('data-speed') || '1') : 1;
      audio.playbackRate = speed;

      const playBtn = embedEl.querySelector('.veris-audio-play-btn');
      const timeEl = embedEl.querySelector('.veris-audio-time');
      const seekbarContainer = embedEl.querySelector('.veris-audio-seekbar-container');
      const textColor = theme.text;

      audio.onloadedmetadata = () => {
        if (timeEl && audio.duration) {
          const current = audio.currentTime || 0;
          timeEl.textContent = `${formatSecs(current)} / ${formatSecs(audio.duration)}`;
        }
      };

      audio.ontimeupdate = () => {
        if (!audio.duration) return;
        if (isScrubbingRef.current && isScrubbingRef.current.att.id === att.id) return;

        const progress = audio.currentTime / audio.duration;
        if (timeEl) {
          timeEl.textContent = `${formatSecs(audio.currentTime)} / ${formatSecs(audio.duration)}`;
        }
        if (seekbarContainer) {
          seekbarContainer.innerHTML = renderStraightScrubberSvg(
            progress,
            theme.accent,
            textColor,
            isLight
          );
        }
      };

      audio.onended = () => {
        if (playBtn) {
          playBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none" class="translate-x-[1.5px]"><polygon points="7 4.5 19.5 12 7 19.5 7 4.5"/></svg>`;
        }
        if (timeEl && audio.duration) {
          timeEl.textContent = `00:00 / ${formatSecs(audio.duration)}`;
        }
        if (seekbarContainer) {
          seekbarContainer.innerHTML = renderStraightScrubberSvg(
            0,
            theme.accent,
            textColor,
            isLight
          );
        }
        activeAudioRef.current = null;
      };

      activeAudioRef.current = { audio, attId: att.id, embedEl };
      return audio;
    },
    [stopCurrentAudio, theme.accent, theme.text, isLight]
  );

  // Toggle voice message audio play / pause
  const togglePlayAudio = useCallback(
    (att: NoteAttachment, embedEl: HTMLElement) => {
      const audio = initAudioInstance(att, embedEl);
      const playBtn = embedEl.querySelector('.veris-audio-play-btn');

      if (!audio.paused) {
        audio.pause();
        if (playBtn) {
          playBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none" class="translate-x-[1.5px]"><polygon points="7 4.5 19.5 12 7 19.5 7 4.5"/></svg>`;
        }
      } else {
        const speedBtn = embedEl.querySelector('.veris-audio-speed-btn') as HTMLElement | null;
        const speed = speedBtn ? parseFloat(speedBtn.getAttribute('data-speed') || '1') : 1;
        audio.playbackRate = speed;

        audio
          .play()
          .then(() => {
            if (playBtn) {
              playBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="5.5" y="4" width="4" height="16" rx="1.5"/><rect x="14.5" y="4" width="4" height="16" rx="1.5"/></svg>`;
            }
          })
          .catch(err => {
            console.warn('Audio play error:', err);
          });
      }
    },
    [initAudioInstance]
  );

  // Performs forward or rewind skip by N seconds with instant UI update (does NOT autoplay if paused)
  const performAudioSkip = useCallback(
    (att: NoteAttachment, embedEl: HTMLElement, direction: 'rewind' | 'forward', seconds: number) => {
      const audio = initAudioInstance(att, embedEl);
      const textColor = theme.text;
      const seekbarEl = embedEl.querySelector('.veris-audio-seekbar-container') as HTMLElement | null;
      const timeEl = embedEl.querySelector('.veris-audio-time');

      const dur = audio.duration || 0;
      const delta = direction === 'rewind' ? -seconds : seconds;
      const newTime = Math.max(0, Math.min(dur > 0 ? dur : 9999, (audio.currentTime || 0) + delta));
      audio.currentTime = newTime;

      if (timeEl && dur > 0) {
        timeEl.textContent = `${formatSecs(newTime)} / ${formatSecs(dur)}`;
      }
      if (seekbarEl && dur > 0) {
        const progress = newTime / dur;
        seekbarEl.innerHTML = renderStraightScrubberSvg(progress, theme.accent, textColor, isLight);
      }
    },
    [initAudioInstance, theme.text, theme.accent, isLight]
  );

  // Scrubber seek handler (works with click & drag across the entire width, does NOT autoplay if paused)
  const seekAudioScrubber = (att: NoteAttachment, embedEl: HTMLElement, clientX: number) => {
    const seekbarEl = embedEl.querySelector('.veris-audio-seekbar-container') as HTMLElement;
    if (!seekbarEl) return;
    const rect = seekbarEl.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const textColor = theme.text;

    const audio = initAudioInstance(att, embedEl);

    if (audio.duration && !isNaN(audio.duration)) {
      audio.currentTime = ratio * audio.duration;
      const timeEl = embedEl.querySelector('.veris-audio-time');
      if (timeEl) {
        timeEl.textContent = `${formatSecs(audio.currentTime)} / ${formatSecs(audio.duration)}`;
      }
    }

    seekbarEl.innerHTML = renderStraightScrubberSvg(
      ratio,
      theme.accent,
      textColor,
      isLight
    );
  };

  // Global pointer listeners for smooth scrubber drag
  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!isScrubbingRef.current) return;
      const { att, embedEl, seekbarEl } = isScrubbingRef.current;
      const rect = seekbarEl.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const textColor = theme.text;

      seekbarEl.innerHTML = renderStraightScrubberSvg(
        ratio,
        theme.accent,
        textColor,
        isLight
      );

      if (activeAudioRef.current && activeAudioRef.current.attId === att.id) {
        const audio = activeAudioRef.current.audio;
        if (audio.duration) {
          audio.currentTime = ratio * audio.duration;
          const timeEl = embedEl.querySelector('.veris-audio-time');
          if (timeEl) {
            timeEl.textContent = `${formatSecs(audio.currentTime)} / ${formatSecs(audio.duration)}`;
          }
        }
      }
    };

    const handleGlobalPointerUp = (e: PointerEvent) => {
      if (!isScrubbingRef.current) return;
      const { att, embedEl, seekbarEl } = isScrubbingRef.current;
      const rect = seekbarEl.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

      if (activeAudioRef.current && activeAudioRef.current.attId === att.id) {
        const audio = activeAudioRef.current.audio;
        if (audio.duration) {
          audio.currentTime = ratio * audio.duration;
        }
      } else {
        seekAudioScrubber(att, embedEl, e.clientX);
      }

      isScrubbingRef.current = null;
    };

    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, [isLight, theme.accent, theme.text]);

  // Clean up any remaining touch ghost elements on unmount or cancel
  const cleanupGhost = useCallback(() => {
    if (touchStateRef.current.ghostEl && touchStateRef.current.ghostEl.parentNode) {
      touchStateRef.current.ghostEl.parentNode.removeChild(touchStateRef.current.ghostEl);
    }
    touchStateRef.current.ghostEl = null;
    touchStateRef.current.isDragging = false;
    document.querySelectorAll('.veris-drag-ghost').forEach(el => el.remove());
  }, []);

  useEffect(() => {
    return () => {
      cleanupGhost();
    };
  }, [cleanupGhost]);

  // Monitor virtual keyboard state
  useEffect(() => {
    const updateKeyboardState = () => {
      if (typeof window !== 'undefined' && window.visualViewport) {
        const isOpen = window.innerHeight - window.visualViewport.height > 150;
        isKeyboardOpenRef.current = isOpen;
      }
    };

    if (typeof window !== 'undefined' && window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateKeyboardState);
      window.visualViewport.addEventListener('scroll', updateKeyboardState);
    }
    return () => {
      if (typeof window !== 'undefined' && window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateKeyboardState);
        window.visualViewport.removeEventListener('scroll', updateKeyboardState);
      }
    };
  }, []);

  // Decorate any existing attachment embeds inside editorRef to ensure theme consistency and single-row controls
  const decorateExistingEmbeds = useCallback(() => {
    if (!editorRef.current) return;
    const embeds = editorRef.current.querySelectorAll('[data-attachment-id]');
    const textColor = theme.text;
    const bgStyle = isLight ? hexToRgba(theme.text, 0.04) : hexToRgba(theme.text, 0.07);
    const borderStyle = hexToRgba(theme.text, isLight ? 0.08 : 0.14);
    const buttonBg = hexToRgba(theme.text, isLight ? 0.05 : 0.08);
    const buttonBorder = hexToRgba(theme.text, isLight ? 0.08 : 0.14);
    const accentTextColor = isLightColor(theme.accent) ? '#000000' : '#FFFFFF';

    embeds.forEach(el => {
      el.setAttribute('contenteditable', 'false');
      el.setAttribute('draggable', 'true');
      (el as HTMLElement).style.userSelect = 'none';

      // Upgrade existing audio embeds
      if (el.classList.contains('veris-audio-embed')) {
        const audioEl = el as HTMLElement;
        audioEl.style.height = 'auto';
        audioEl.style.minHeight = 'auto';
        audioEl.style.maxHeight = 'none';
        audioEl.style.lineHeight = 'normal';
        audioEl.style.boxSizing = 'border-box';
        audioEl.style.padding = '14px';

        // Apply theme-derived styles
        audioEl.style.background = bgStyle;
        audioEl.style.backdropFilter = 'blur(20px) saturate(180%)';
        audioEl.style.borderColor = borderStyle;
        audioEl.style.boxShadow = isLight
          ? '0 6px 20px -4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.7)'
          : '0 8px 24px -4px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)';

        const attId = audioEl.getAttribute('data-attachment-id');
        const att = note?.attachments?.find(a => a.id === attId);
        const attName = att ? att.name : 'Аудиозапись';

        // If the audio embed contains the old border-t separator or is missing the new structure, regenerate it
        const hasOldSeparator = !!audioEl.querySelector('.border-t');
        const hasDeleteInBottomRow = !!audioEl.querySelector('.veris-audio-delete-btn');
        const needsRebuild = hasOldSeparator || !hasDeleteInBottomRow || !audioEl.querySelector('.veris-audio-rewind-btn');

        if (needsRebuild) {
          const scrubberHtml = renderStraightScrubberSvg(0, theme.accent, textColor, isLight);
          audioEl.className =
            'veris-audio-embed my-3 p-3.5 rounded-2xl flex flex-col gap-2.5 select-none cursor-default w-full max-w-lg border transition shadow-lg';
          audioEl.innerHTML = `
            <div class="flex items-center gap-3 w-full">
              <button type="button" class="veris-audio-play-btn w-11 h-11 min-w-[44px] max-w-[44px] rounded-full flex items-center justify-center shrink-0 cursor-pointer shadow-md transition active:scale-95" style="background-color: ${theme.accent}; color: ${accentTextColor};" title="Воспроизвести">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 4 19 12 6 20 6 4"/></svg>
              </button>
              <div class="flex-1 flex flex-col justify-center min-w-0 px-0.5 gap-1">
                <div class="veris-audio-seekbar-container w-full h-5 flex items-center cursor-pointer select-none" title="Перемотка" draggable="false">
                  ${scrubberHtml}
                </div>
                <div class="w-full flex items-center justify-between text-[11px] font-mono select-none leading-none opacity-80">
                  <span class="veris-audio-time font-semibold font-mono tracking-tight shrink-0">00:00</span>
                  <span class="truncate text-[10px] opacity-60 ml-2 max-w-[170px] sm:max-w-[240px]" title="${attName}">${attName}</span>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between gap-2 w-full pt-1">
              <button type="button" class="veris-audio-speed-btn w-9 h-7.5 min-w-[36px] max-w-[36px] min-h-[30px] max-h-[30px] p-0 rounded-xl text-[11px] font-mono font-bold leading-none transition active:scale-90 select-none shrink-0 cursor-pointer flex items-center justify-center text-center border" data-speed="1" title="Скорость воспроизведения" style="background-color: ${buttonBg}; color: ${textColor}; border-color: ${buttonBorder};">1x</button>
              <div class="flex-1 flex items-center justify-center gap-2 max-w-[260px]">
                <button type="button" class="veris-audio-rewind-btn flex-1 h-7.5 min-h-[30px] max-h-[30px] px-2 rounded-xl text-[11px] font-mono font-bold transition active:scale-95 select-none cursor-pointer flex items-center justify-center border" title="Назад 15 сек" style="background-color: ${buttonBg}; color: ${textColor}; border-color: ${buttonBorder};">
                  <span>-15</span>
                </button>
                <button type="button" class="veris-audio-forward-btn flex-1 h-7.5 min-h-[30px] max-h-[30px] px-2 rounded-xl text-[11px] font-mono font-bold transition active:scale-95 select-none cursor-pointer flex items-center justify-center border" title="Вперед 15 сек" style="background-color: ${buttonBg}; color: ${textColor}; border-color: ${buttonBorder};">
                  <span>+15</span>
                </button>
              </div>
              <button type="button" class="veris-audio-delete-btn w-9 h-7.5 min-w-[36px] max-w-[36px] min-h-[30px] max-h-[30px] p-0 rounded-xl text-red-400 hover:text-red-500 active:scale-90 transition select-none shrink-0 cursor-pointer flex items-center justify-center border" title="Удалить запись" style="background-color: ${buttonBg}; border-color: ${buttonBorder};">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18"/>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                  <line x1="10" x2="10" y1="11" y2="17"/>
                  <line x1="14" x2="14" y1="11" y2="17"/>
                </svg>
              </button>
            </div>
          `;
        } else {
          // Update colors on existing elements to match active theme palette
          const playBtn = audioEl.querySelector('.veris-audio-play-btn') as HTMLElement | null;
          if (playBtn) {
            playBtn.style.backgroundColor = theme.accent;
            playBtn.style.color = isLightColor(theme.accent) ? '#000000' : '#FFFFFF';
            // Also ensure play SVG is centered
            const playSvg = playBtn.querySelector('svg');
            if (playSvg) {
              playSvg.setAttribute('class', '');
              playSvg.innerHTML = '<polygon points="6 4 19 12 6 20 6 4"/>';
            }
          }
          const thumb = audioEl.querySelector('.veris-audio-thumb') as SVGElement | null;
          if (thumb) {
            thumb.setAttribute('fill', theme.accent);
          }
          const speedBtn = audioEl.querySelector('.veris-audio-speed-btn') as HTMLButtonElement | null;
          if (speedBtn) {
            const speedVal = speedBtn.getAttribute('data-speed') || '1';
            speedBtn.textContent = `${speedVal}x`;
            if (parseFloat(speedVal) > 1) {
              speedBtn.style.backgroundColor = theme.accent;
              speedBtn.style.color = isLightColor(theme.accent) ? '#000000' : '#FFFFFF';
              speedBtn.style.borderColor = theme.accent;
            } else {
              speedBtn.style.backgroundColor = buttonBg;
              speedBtn.style.color = textColor;
              speedBtn.style.borderColor = buttonBorder;
            }
          }
          const delBtn = audioEl.querySelector('.veris-audio-delete-btn') as HTMLElement | null;
          if (delBtn) {
            delBtn.style.backgroundColor = buttonBg;
            delBtn.style.borderColor = buttonBorder;
          }
          const rewBtn = audioEl.querySelector('.veris-audio-rewind-btn') as HTMLElement | null;
          if (rewBtn) {
            rewBtn.style.backgroundColor = buttonBg;
            rewBtn.style.color = textColor;
            rewBtn.style.borderColor = buttonBorder;
            rewBtn.innerHTML = '<span>-15</span>';
          }
          const fwdBtn = audioEl.querySelector('.veris-audio-forward-btn') as HTMLElement | null;
          if (fwdBtn) {
            fwdBtn.style.backgroundColor = buttonBg;
            fwdBtn.style.color = textColor;
            fwdBtn.style.borderColor = buttonBorder;
            fwdBtn.innerHTML = '<span>+15</span>';
          }
        }
      }
    });

    // Decorate existing note links
    const noteLinks = editorRef.current.querySelectorAll('.veris-note-link, [data-note-id]');
    noteLinks.forEach(el => {
      el.setAttribute('contenteditable', 'false');
      (el as HTMLElement).style.cursor = 'pointer';
      (el as HTMLElement).style.color = theme.accent;
      (el as HTMLElement).style.backgroundColor = 'transparent';
    });

    // Decorate existing block links
    const blockLinks = editorRef.current.querySelectorAll('.veris-block-link, [data-block-id]');
    blockLinks.forEach(el => {
      el.setAttribute('contenteditable', 'false');
      (el as HTMLElement).style.cursor = 'pointer';
      (el as HTMLElement).style.color = theme.accent;
      (el as HTMLElement).style.backgroundColor = 'transparent';
    });
  }, [theme.accent, isLight]);

  // Sync editor content on active note change or undo/redo, preserving scroll position and caret
  useEffect(() => {
    if (!editorRef.current || !note) return;

    const isSameNote = lastActiveNoteIdRef.current === note.id;
    lastActiveNoteIdRef.current = note.id;

    if (editorRef.current.innerHTML !== (note.content || '')) {
      const savedScrollTop = isSameNote && scrollContainerRef.current
        ? scrollContainerRef.current.scrollTop
        : (noteScrollPositionsRef.current[note.id] ?? 0);

      // Check if editor or keyboard was active before content swap
      const wasKeyboardOrEditorActive =
        isKeyboardOpenRef.current ||
        wasEditingBeforeSelectionRef.current ||
        document.activeElement === editorRef.current ||
        Boolean(editorRef.current.contains(document.activeElement)) ||
        (typeof window !== 'undefined' &&
          window.visualViewport &&
          window.innerHeight - window.visualViewport.height > 150);

      const oldHtml = editorRef.current.innerHTML;
      const newHtml = note.content || '';

      // Compute divergence / diff location between oldHtml and newHtml
      let prefix = 0;
      const minLen = Math.min(oldHtml.length, newHtml.length);
      while (prefix < minLen && oldHtml[prefix] === newHtml[prefix]) {
        prefix++;
      }

      let suffix = 0;
      while (
        suffix < (minLen - prefix) &&
        oldHtml[oldHtml.length - 1 - suffix] === newHtml[newHtml.length - 1 - suffix]
      ) {
        suffix++;
      }

      // In newHtml, identify target index for the undone action
      let targetHtmlIndex = Math.max(prefix, newHtml.length - suffix);

      // If targetHtmlIndex lands inside an HTML tag, advance past the tag
      const lastOpenTag = newHtml.lastIndexOf('<', targetHtmlIndex);
      const lastCloseTag = newHtml.lastIndexOf('>', targetHtmlIndex);
      if (lastOpenTag > lastCloseTag && lastOpenTag !== -1) {
        const nextClose = newHtml.indexOf('>', targetHtmlIndex);
        if (nextClose !== -1) {
          targetHtmlIndex = nextClose + 1;
        }
      }

      // Compute plain text offset (non-tag characters) up to targetHtmlIndex
      let plainTextOffset = 0;
      let inTag = false;
      for (let i = 0; i < Math.min(targetHtmlIndex, newHtml.length); i++) {
        const ch = newHtml[i];
        if (ch === '<') inTag = true;
        else if (ch === '>') inTag = false;
        else if (!inTag) plainTextOffset++;
      }

      // Apply new HTML to editor DOM
      editorRef.current.innerHTML = newHtml;
      decorateExistingEmbeds();

      // Locate target node and range at plainTextOffset
      const walker = document.createTreeWalker(
        editorRef.current,
        NodeFilter.SHOW_TEXT,
        null
      );

      let accOffset = 0;
      let targetNode: Node | null = null;
      let offsetInNode = 0;
      let lastTextNode: Node | null = null;

      while (walker.nextNode()) {
        const node = walker.currentNode;
        lastTextNode = node;
        const len = node.textContent?.length || 0;
        if (accOffset + len >= plainTextOffset) {
          targetNode = node;
          offsetInNode = Math.max(0, Math.min(len, plainTextOffset - accOffset));
          break;
        }
        accOffset += len;
      }

      if (!targetNode && lastTextNode) {
        targetNode = lastTextNode;
        offsetInNode = lastTextNode.textContent?.length || 0;
      }

      let targetRange: Range | null = null;
      let changeRect: DOMRect | null = null;

      if (targetNode) {
        try {
          targetRange = document.createRange();
          targetRange.setStart(targetNode, offsetInNode);
          targetRange.setEnd(targetNode, offsetInNode);

          const clientRects = targetRange.getClientRects();
          if (clientRects.length > 0) {
            changeRect = clientRects[0];
          } else if (targetNode.parentElement) {
            changeRect = targetNode.parentElement.getBoundingClientRect();
          }
        } catch (err) {
          console.warn('Target range error:', err);
        }
      } else if (editorRef.current) {
        changeRect = editorRef.current.getBoundingClientRect();
      }

      // If keyboard was open or editor was focused, maintain focus & place cursor right at the undone action
      if (wasKeyboardOrEditorActive) {
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          if (targetRange) {
            sel.addRange(targetRange);
            lastSavedRangeRef.current = targetRange.cloneRange();
          } else if (editorRef.current) {
            const fallbackRange = document.createRange();
            fallbackRange.selectNodeContents(editorRef.current);
            fallbackRange.collapse(false);
            sel.addRange(fallbackRange);
            lastSavedRangeRef.current = fallbackRange.cloneRange();
          }
        }

        editorRef.current.focus({ preventScroll: true });
        wasEditingBeforeSelectionRef.current = true;
      } else if (targetRange) {
        lastSavedRangeRef.current = targetRange.cloneRange();
      }

      // Check visibility & handle scroll position
      const scrollContainer = scrollContainerRef.current;
      if (scrollContainer) {
        if (isSameNote && changeRect) {
          const containerRect = scrollContainer.getBoundingClientRect();
          // Threshold margins: 30px from top, 70px from bottom (accounting for floating dock/keyboard)
          const visibleTopThreshold = containerRect.top + 30;
          const visibleBottomThreshold = containerRect.bottom - 70;

          const isInVisibleViewport =
            changeRect.top >= visibleTopThreshold &&
            changeRect.bottom <= visibleBottomThreshold;

          if (isInVisibleViewport) {
            // Revert is in visible part: DO NOT SCROLL, keep current view stationary
            scrollContainer.scrollTop = savedScrollTop;
            requestAnimationFrame(() => {
              if (scrollContainer) {
                scrollContainer.scrollTop = savedScrollTop;
              }
            });
          } else {
            // Revert is outside visible screen: scroll smoothly to where the revert occurred
            const currentScrollTop = scrollContainer.scrollTop;
            const rectRelTop = changeRect.top - containerRect.top;
            const targetScrollTop = Math.max(
              0,
              currentScrollTop + rectRelTop - Math.max(80, scrollContainer.clientHeight / 3)
            );

            scrollContainer.scrollTo({
              top: targetScrollTop,
              behavior: 'smooth',
            });
          }
        } else if (savedScrollTop > 0) {
          scrollContainer.scrollTop = savedScrollTop;
          requestAnimationFrame(() => {
            if (scrollContainer) {
              scrollContainer.scrollTop = savedScrollTop;
            }
          });
        }
      }
    } else if (!isSameNote && scrollContainerRef.current) {
      // Switching back to an existing note: restore its scroll position
      const savedScrollTop = noteScrollPositionsRef.current[note.id] ?? 0;
      if (savedScrollTop > 0) {
        scrollContainerRef.current.scrollTop = savedScrollTop;
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = savedScrollTop;
          }
        });
      }
    }
  }, [activeNoteId, note?.content, decorateExistingEmbeds, lastHistoryAction]);

  // Sync selection change to track last known caret position inside editor
  useEffect(() => {
    const handleSelection = () => {
      const sel = window.getSelection();
      if (!sel || !editorRef.current) return;
      if (sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (
          editorRef.current.contains(range.commonAncestorContainer) ||
          range.commonAncestorContainer === editorRef.current
        ) {
          lastSavedRangeRef.current = range.cloneRange();
        }
      }
    };
    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  // Listen to attachment addition event (e.g. from FloatingDock file picker or AudioDictationModal)
  useEffect(() => {
    const handleInsertAttachmentEvent = (e: any) => {
      const detail = e.detail;
      if (!detail || detail.noteId !== note?.id || !editorRef.current) return;
      const att: NoteAttachment = detail.attachment;

      // Remove any existing embed of this attachment to prevent duplication
      const existing = editorRef.current.querySelectorAll(`[data-attachment-id="${att.id}"]`);
      existing.forEach(el => el.remove());

      const newEmbed = createAttachmentEmbedDom(att, isLight, theme.accent, theme.bg, theme.text);
      const spaceNode = document.createTextNode('\u00A0');

      let inserted = false;
      const savedRange = lastSavedRangeRef.current;
      if (savedRange && editorRef.current.contains(savedRange.commonAncestorContainer)) {
        try {
          savedRange.collapse(false);
          savedRange.insertNode(newEmbed);
          if (newEmbed.nextSibling) {
            newEmbed.parentNode?.insertBefore(spaceNode, newEmbed.nextSibling);
          } else {
            newEmbed.parentNode?.appendChild(spaceNode);
          }
          // Move caret after inserted space
          const sel = window.getSelection();
          if (sel) {
            const newRange = document.createRange();
            newRange.setStartAfter(spaceNode);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
            lastSavedRangeRef.current = newRange.cloneRange();
          }
          inserted = true;
        } catch (err) {
          inserted = false;
        }
      }

      if (!inserted) {
        editorRef.current.appendChild(newEmbed);
        editorRef.current.appendChild(spaceNode);
      }

      handleEditorInput();
      decorateExistingEmbeds();
    };

    window.addEventListener('veris-insert-attachment' as any, handleInsertAttachmentEvent);
    return () => {
      window.removeEventListener('veris-insert-attachment' as any, handleInsertAttachmentEvent);
    };
  }, [note?.id, isLight, theme.accent, handleEditorInput, decorateExistingEmbeds]);

  // Listen to font application event from FloatingDock / FontPickerModal
  useEffect(() => {
    const handleApplyFontEvent = (e: any) => {
      const detail = e.detail;
      if (!detail) return;
      const { fontValue, cssFamily, target } = detail;

      if (target === 'title') {
        if (note) {
          updateNote(note.id, { titleFont: fontValue });
        }
        return;
      }

      // Target is editor cursor / text
      if (!editorRef.current) return;
      editorRef.current.focus();

      const sel = window.getSelection();
      let range: Range | null = null;
      if (sel && sel.rangeCount > 0) {
        const r = sel.getRangeAt(0);
        if (editorRef.current.contains(r.commonAncestorContainer)) {
          range = r;
        }
      }

      if (!range && lastSavedRangeRef.current && editorRef.current.contains(lastSavedRangeRef.current.commonAncestorContainer)) {
        range = lastSavedRangeRef.current;
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }

      if (range) {
        if (!range.collapsed) {
          // Selected text -> wrap in span with font-family
          const selectedContent = range.extractContents();
          const span = document.createElement('span');
          span.style.fontFamily = cssFamily;
          span.appendChild(selectedContent);
          range.insertNode(span);

          if (sel) {
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            sel.removeAllRanges();
            sel.addRange(newRange);
            lastSavedRangeRef.current = newRange.cloneRange();
          }
        } else {
          // Collapsed cursor -> insert zero-width space span so typing continues in this font
          const span = document.createElement('span');
          span.style.fontFamily = cssFamily;
          const zeroWidth = document.createTextNode('\u200B');
          span.appendChild(zeroWidth);
          range.insertNode(span);

          if (sel) {
            const newRange = document.createRange();
            newRange.setStart(zeroWidth, 1);
            newRange.setEnd(zeroWidth, 1);
            sel.removeAllRanges();
            sel.addRange(newRange);
            lastSavedRangeRef.current = newRange.cloneRange();
          }
        }
      } else {
        // If nothing was focused in editor, append styled span
        const span = document.createElement('span');
        span.style.fontFamily = cssFamily;
        const zeroWidth = document.createTextNode('\u200B');
        span.appendChild(zeroWidth);
        editorRef.current.appendChild(span);

        if (sel) {
          const newRange = document.createRange();
          newRange.setStart(zeroWidth, 1);
          newRange.setEnd(zeroWidth, 1);
          sel.removeAllRanges();
          sel.addRange(newRange);
          lastSavedRangeRef.current = newRange.cloneRange();
        }
      }

      handleEditorInput();
    };

    window.addEventListener('veris-apply-font' as any, handleApplyFontEvent);
    return () => {
      window.removeEventListener('veris-apply-font' as any, handleApplyFontEvent);
    };
  }, [note, updateNote, handleEditorInput]);

  // Monitor text selection in editor for floating formatting toolbar with real-time scroll sync
  useEffect(() => {
    const updateSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !editorRef.current) {
        setSelectionRect(null);
        return;
      }

      if (!editorRef.current.contains(sel.anchorNode)) {
        setSelectionRect(null);
        return;
      }

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        // If selection has scrolled completely outside of visible area (above header or off bottom)
        if (rect.bottom < 70 || rect.top > window.innerHeight - 15) {
          setSelectionRect(null);
          return;
        }
        setSelectionRect(rect);
      } else {
        setSelectionRect(null);
      }
    };

    const handleSelectionChange = () => {
      updateSelection();

      const isKeyboardCurrentlyOpen =
        isKeyboardOpenRef.current ||
        (typeof window !== 'undefined' &&
          window.visualViewport &&
          window.innerHeight - window.visualViewport.height > 150);

      if (!isKeyboardCurrentlyOpen && !wasEditingBeforeSelectionRef.current) {
        if (
          document.activeElement instanceof HTMLElement &&
          document.activeElement === editorRef.current
        ) {
          document.activeElement.blur();
        }
      }
    };

    let scrollRafId: number | null = null;
    const handleScrollOrResize = () => {
      if (scrollRafId !== null) cancelAnimationFrame(scrollRafId);
      scrollRafId = requestAnimationFrame(() => {
        updateSelection();
        scrollRafId = null;
      });
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    window.addEventListener('scroll', handleScrollOrResize, { passive: true });

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScrollOrResize, { passive: true });
    }

    return () => {
      if (scrollRafId !== null) cancelAnimationFrame(scrollRafId);
      document.removeEventListener('selectionchange', handleSelectionChange);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize);
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScrollOrResize);
      }
    };
  }, []);

  if (!note) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 opacity-50">
        <p className="text-sm">Заметка не выбрана</p>
      </div>
    );
  }

  const t = (key: string) => getTranslation(language, key);

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const months = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
    ];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month}, ${hours}:${minutes}`;
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNote(note.id, { title: e.target.value });
  };

  // Enforce enter newline and formatting reset, and handle mention navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Intercept undo/redo keyboard shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        redoNoteContent();
      } else {
        undoNoteContent();
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redoNoteContent();
      return;
    }

    // Intercept keyboard navigation if mention menu is visible
    if (mentionQuery !== null && mentionItems.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(i => (i + 1) % mentionItems.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(i => (i - 1 + mentionItems.length) % mentionItems.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = mentionItems[selectedMentionIndex];
        if (selected) {
          if (selected.kind === 'block') {
            insertBlockMention(selected.item);
          } else {
            insertNoteMention(selected.item);
          }
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === 'Enter') {
      setTimeout(() => {
        document.execCommand('removeFormat', false, undefined);
        const sel = window.getSelection();
        if (sel && sel.anchorNode) {
          let node: Node | null = sel.anchorNode;
          if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
          const el = node as HTMLElement | null;
          if (el && el.closest('pre, h1, h2, h3, h4')) {
            document.execCommand('formatBlock', false, '<p>');
          }
        }
        handleEditorInput();
      }, 0);
      return;
    }

    if (quickSettings.oneTimeFormatting && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      const sel = window.getSelection();
      if (sel && sel.isCollapsed) {
        let node: Node | null = sel.anchorNode;
        if (node && node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent || '';
          const offset = sel.anchorOffset;

          const parentElem = node.parentElement;
          if (
            parentElem &&
            parentElem !== editorRef.current &&
            offset === text.length &&
            /^(B|I|U|STRONG|EM|SPAN|MARK)$/i.test(parentElem.tagName)
          ) {
            e.preventDefault();

            const charToInsert = e.key;
            const nextSibling = parentElem.nextSibling;

            if (nextSibling && nextSibling.nodeType === Node.TEXT_NODE) {
              nextSibling.textContent = (nextSibling.textContent || '') + charToInsert;
              const range = document.createRange();
              range.setStart(nextSibling, nextSibling.textContent.length);
              range.setEnd(nextSibling, nextSibling.textContent.length);
              sel.removeAllRanges();
              sel.addRange(range);
            } else {
              const newTextNode = document.createTextNode(charToInsert);
              if (parentElem.nextSibling) {
                parentElem.parentNode?.insertBefore(newTextNode, parentElem.nextSibling);
              } else {
                parentElem.parentNode?.appendChild(newTextNode);
              }
              const range = document.createRange();
              range.setStart(newTextNode, 1);
              range.setEnd(newTextNode, 1);
              sel.removeAllRanges();
              sel.addRange(range);
            }

            handleEditorInput();
          }
        }
      }
    }
  };

  /* =======================================================================
   * DRAG AND DROP HANDLERS (Embedded Attachment & External Files)
   * ======================================================================= */

  // 1. Drag start from inside the editor (moving embedded attachment inside text)
  const handleEditorDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Don't initiate HTML5 drag if user is scrubbing or clicking buttons inside audio embed
    if (
      target.closest('.veris-audio-seekbar-container') ||
      target.closest('.veris-audio-play-btn') ||
      target.closest('.veris-audio-speed-btn') ||
      target.closest('.veris-audio-delete-btn')
    ) {
      e.preventDefault();
      return;
    }

    // Stop active audio immediately when dragging begins
    stopCurrentAudio();

    const embed = target.closest('[data-attachment-id]') as HTMLElement | null;
    if (embed) {
      const attId = embed.getAttribute('data-attachment-id');
      const att = note.attachments?.find(a => a.id === attId) || null;
      if (attId) {
        draggedFromEditorNodeRef.current = embed;
        draggedAttachmentRef.current = att;

        e.dataTransfer.setData('application/veris-attachment-id', attId);
        e.dataTransfer.setData('text/plain', ''); // Avoid browser dumping raw title text
        e.dataTransfer.effectAllowed = 'move';
      }
    }
  };

  // 2. Drag over editor area
  const handleEditorDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleEditorDragLeave = () => {
    // No-op
  };

  // 3. Drop inside the editor (places or moves entire attachment widget at caret without duplicating)
  const handleEditorDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    stopCurrentAudio();

    // Check if external files were dropped from the operating system
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (de) => {
          const dataUrlVal = de.target?.result as string;
          const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|webm)$/i.test(file.name);
          const newAttachment: NoteAttachment = {
            id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            size: file.size,
            type: file.type || (isAudio ? 'audio/mpeg' : 'application/octet-stream'),
            dataUrl: dataUrlVal,
            updatedAt: Date.now(),
          };
          addAttachmentToNote(note.id, newAttachment);
          window.dispatchEvent(
            new CustomEvent('veris-insert-attachment', {
              detail: { noteId: note.id, attachment: newAttachment },
            })
          );
        };
        reader.readAsDataURL(file);
      });
      return;
    }

    const attId =
      e.dataTransfer.getData('application/veris-attachment-id') ||
      draggedAttachmentRef.current?.id;

    if (!attId) return;

    const att =
      note.attachments?.find(a => a.id === attId) || draggedAttachmentRef.current;
    if (!att || !editorRef.current) return;

    // Determine drop caret location
    let range: Range | null = null;
    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(e.clientX, e.clientY);
    } else if ((document as any).caretPositionFromPoint) {
      const pos = (document as any).caretPositionFromPoint(e.clientX, e.clientY);
      if (pos && pos.offsetNode) {
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
      }
    }

    // STRICTLY REMOVE any existing embed of this attachment to prevent duplication
    const existing = editorRef.current.querySelectorAll(`[data-attachment-id="${att.id}"]`);
    existing.forEach(el => el.remove());

    if (draggedFromEditorNodeRef.current && draggedFromEditorNodeRef.current.parentNode) {
      draggedFromEditorNodeRef.current.parentNode.removeChild(draggedFromEditorNodeRef.current);
    }

    // Build the rich interactive attachment widget
    const newEmbed = createAttachmentEmbedDom(att, isLight, theme.accent, theme.bg, theme.text);
    const spaceNode = document.createTextNode('\u00A0');

    if (range && editorRef.current.contains(range.startContainer)) {
      range.insertNode(newEmbed);

      if (newEmbed.nextSibling) {
        newEmbed.parentNode?.insertBefore(spaceNode, newEmbed.nextSibling);
      } else {
        newEmbed.parentNode?.appendChild(spaceNode);
      }

      // Position caret right after inserted attachment widget
      const sel = window.getSelection();
      if (sel) {
        const newRange = document.createRange();
        newRange.setStartAfter(spaceNode);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
        lastSavedRangeRef.current = newRange.cloneRange();
      }
    } else {
      // Fallback: Append to end of editor
      editorRef.current.appendChild(newEmbed);
      editorRef.current.appendChild(spaceNode);
    }

    handleEditorInput();
    decorateExistingEmbeds();

    draggedAttachmentRef.current = null;
    draggedFromEditorNodeRef.current = null;
  };

  // Pointer down on seekbar or control buttons inside editor
  const handleEditorPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    const embed = target.closest('[data-attachment-id]') as HTMLElement | null;
    if (!embed) return;

    const attId = embed.getAttribute('data-attachment-id');
    const att = note?.attachments?.find(a => a.id === attId);
    if (!att) return;

    // Prevent drag from buttons
    if (
      target.closest('.veris-audio-rewind-btn') ||
      target.closest('.veris-audio-forward-btn') ||
      target.closest('.veris-audio-play-btn') ||
      target.closest('.veris-audio-delete-btn') ||
      target.closest('.veris-audio-speed-btn')
    ) {
      e.stopPropagation();
      return;
    }

    // Check if clicked seekbar to initiate dragging
    const seekbarEl = target.closest('.veris-audio-seekbar-container') as HTMLElement | null;
    if (seekbarEl) {
      e.stopPropagation();
      isScrubbingRef.current = { att, embedEl: embed, seekbarEl };
      seekAudioScrubber(att, embed, e.clientX);
    }
  };

  // 4. Click handling inside editor: note links, audio play/speed/delete/seek, or regular attachment preview
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // Check if clicked a block link
    const blockLink = target.closest('[data-block-id], .veris-block-link') as HTMLElement | null;
    if (blockLink) {
      const linkedBlockId = blockLink.getAttribute('data-block-id');
      if (linkedBlockId) {
        e.preventDefault();
        e.stopPropagation();
        setActiveBlockModalId(linkedBlockId);
        return;
      }
    }

    // Check if clicked a note link
    const noteLink = target.closest('[data-note-id], .veris-note-link') as HTMLElement | null;
    if (noteLink) {
      const linkedNoteId = noteLink.getAttribute('data-note-id');
      if (linkedNoteId) {
        e.preventDefault();
        e.stopPropagation();
        setReadOnlyNoteId(linkedNoteId);
        return;
      }
    }

    const embed = target.closest('[data-attachment-id]') as HTMLElement | null;
    if (!embed) return;

    const attId = embed.getAttribute('data-attachment-id');
    const att = note?.attachments?.find(a => a.id === attId);
    if (!att) return;

    // Check if clicked rewind button
    if (target.closest('.veris-audio-rewind-btn')) {
      e.preventDefault();
      e.stopPropagation();
      performAudioSkip(att, embed, 'rewind', 15);
      return;
    }

    // Check if clicked forward button
    if (target.closest('.veris-audio-forward-btn')) {
      e.preventDefault();
      e.stopPropagation();
      performAudioSkip(att, embed, 'forward', 15);
      return;
    }

    // Check if clicked delete button on voice message
    if (target.closest('.veris-audio-delete-btn')) {
      e.preventDefault();
      e.stopPropagation();
      setAudioToDelete({ attId: att.id, embedEl: embed });
      return;
    }

    // Check if clicked play button on voice message
    if (target.closest('.veris-audio-play-btn')) {
      e.preventDefault();
      e.stopPropagation();
      togglePlayAudio(att, embed);
      return;
    }

    // Check if clicked speed button on voice message (x1, x1.5, x2)
    if (target.closest('.veris-audio-speed-btn')) {
      e.preventDefault();
      e.stopPropagation();
      const speedBtn = target.closest('.veris-audio-speed-btn') as HTMLElement;
      const currentSpeed = parseFloat(speedBtn.getAttribute('data-speed') || '1');
      const nextSpeed = currentSpeed === 1 ? 1.5 : currentSpeed === 1.5 ? 2 : 1;
      speedBtn.setAttribute('data-speed', String(nextSpeed));
      speedBtn.textContent = `${nextSpeed}x`;
      const textColor = theme.text;
      const buttonBg = hexToRgba(theme.text, isLight ? 0.05 : 0.08);
      const buttonBorder = hexToRgba(theme.text, isLight ? 0.08 : 0.14);

      if (nextSpeed > 1) {
        speedBtn.style.backgroundColor = theme.accent;
        speedBtn.style.color = isLightColor(theme.accent) ? '#000000' : '#FFFFFF';
        speedBtn.style.borderColor = theme.accent;
      } else {
        speedBtn.style.backgroundColor = buttonBg;
        speedBtn.style.color = textColor;
        speedBtn.style.borderColor = buttonBorder;
      }

      if (activeAudioRef.current && activeAudioRef.current.attId === att.id) {
        activeAudioRef.current.audio.playbackRate = nextSpeed;
      }
      handleEditorInput();
      return;
    }

    // Check if clicked seekbar on voice message
    if (target.closest('.veris-audio-seekbar-container') || target.closest('.veris-audio-waveform')) {
      e.preventDefault();
      e.stopPropagation();
      seekAudioScrubber(att, embed, e.clientX);
      return;
    }

    // If it's a voice message embed body (not play/speed/delete/seekbar), open preview modal
    e.preventDefault();
    e.stopPropagation();
    setSelectedAttachment(att);
  };

  // Confirm delete of voice message
  const confirmDeleteAudio = () => {
    if (!audioToDelete || !note) return;
    const { attId, embedEl } = audioToDelete;
    if (activeAudioRef.current && activeAudioRef.current.attId === attId) {
      stopCurrentAudio();
    }
    embedEl.remove();
    deleteAttachmentFromNote(note.id, attId);
    handleEditorInput();
    setAudioToDelete(null);
  };

  // 5. Clipboard paste handler: pastes screenshots / audio / files inline at cursor
  const handleEditorPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items || items.length === 0) return;

    const filesToUpload: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) filesToUpload.push(file);
      }
    }

    if (filesToUpload.length > 0) {
      e.preventDefault();
      filesToUpload.forEach(file => {
        const reader = new FileReader();
        reader.onload = (de) => {
          const dataUrlVal = de.target?.result as string;
          const ext = file.type.split('/')[1] || 'png';
          const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|webm)$/i.test(file.name);
          const newAttachment: NoteAttachment = {
            id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: file.name || (isAudio ? `audio_${Date.now()}.${ext}` : `image_${Date.now()}.${ext}`),
            size: file.size,
            type: file.type || (isAudio ? 'audio/mpeg' : 'image/png'),
            dataUrl: dataUrlVal,
            updatedAt: Date.now(),
          };
          addAttachmentToNote(note.id, newAttachment);
          window.dispatchEvent(
            new CustomEvent('veris-insert-attachment', {
              detail: { noteId: note.id, attachment: newAttachment },
            })
          );
        };
        reader.readAsDataURL(file);
      });
    }
  };

  /* =======================================================================
   * MOBILE TOUCH DRAG-AND-DROP (Long-press & drag in-text chip on mobile)
   * ======================================================================= */

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const embed = target.closest('[data-attachment-id]') as HTMLElement | null;
    if (!embed) return;

    // Don't drag if interacting with buttons or seekbar inside audio embed
    if (
      target.closest('.veris-audio-play-btn') ||
      target.closest('.veris-audio-speed-btn') ||
      target.closest('.veris-audio-delete-btn') ||
      target.closest('.veris-audio-seekbar-container') ||
      target.closest('.veris-audio-waveform')
    ) {
      return;
    }

    const attId = embed.getAttribute('data-attachment-id');
    const att = note.attachments?.find(a => a.id === attId);
    if (!att) return;

    const touch = e.touches[0];
    const state = touchStateRef.current;
    state.startX = touch.clientX;
    state.startY = touch.clientY;
    state.currentX = touch.clientX;
    state.currentY = touch.clientY;
    state.att = att;
    state.isDragging = false;

    // Detect hold to drag
    clearTimeout(state.timer);
    state.timer = setTimeout(() => {
      stopCurrentAudio();
      state.isDragging = true;
      // Create ghost badge
      const ghost = document.createElement('div');
      ghost.className =
        'veris-drag-ghost fixed pointer-events-none z-50 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-2xl flex items-center gap-1.5 backdrop-blur-md animate-pulse';
      ghost.style.left = `${touch.clientX - 40}px`;
      ghost.style.top = `${touch.clientY - 30}px`;
      ghost.style.backgroundColor = isLight ? '#FFFFFF' : '#1E1E1E';
      ghost.style.borderColor = theme.accent;
      ghost.style.color = theme.text;
      ghost.innerHTML = `<span>🎙️</span><span class="truncate max-w-[150px]">${att.name}</span>`;
      document.body.appendChild(ghost);
      state.ghostEl = ghost;
    }, 250);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const state = touchStateRef.current;
    if (!state.att) return;

    const touch = e.touches[0];
    state.currentX = touch.clientX;
    state.currentY = touch.clientY;

    const dist = Math.hypot(touch.clientX - state.startX, touch.clientY - state.startY);
    if (dist > 10 && !state.isDragging) {
      clearTimeout(state.timer);
      stopCurrentAudio();
      state.isDragging = true;

      const ghost = document.createElement('div');
      ghost.className =
        'veris-drag-ghost fixed pointer-events-none z-50 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-2xl flex items-center gap-1.5 backdrop-blur-md animate-pulse';
      ghost.style.left = `${touch.clientX - 40}px`;
      ghost.style.top = `${touch.clientY - 30}px`;
      ghost.style.backgroundColor = isLight ? '#FFFFFF' : '#1E1E1E';
      ghost.style.borderColor = theme.accent;
      ghost.style.color = theme.text;
      ghost.innerHTML = `<span>🎙️</span><span class="truncate max-w-[150px]">${state.att.name}</span>`;
      document.body.appendChild(ghost);
      state.ghostEl = ghost;
    }

    if (state.isDragging && state.ghostEl) {
      e.preventDefault();
      state.ghostEl.style.left = `${touch.clientX - 40}px`;
      state.ghostEl.style.top = `${touch.clientY - 30}px`;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const state = touchStateRef.current;
    clearTimeout(state.timer);
    cleanupGhost();

    if (state.isDragging && state.att && editorRef.current) {
      e.preventDefault();
      stopCurrentAudio();
      let range: Range | null = null;
      if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(state.currentX, state.currentY);
      } else if ((document as any).caretPositionFromPoint) {
        const pos = (document as any).caretPositionFromPoint(state.currentX, state.currentY);
        if (pos && pos.offsetNode) {
          range = document.createRange();
          range.setStart(pos.offsetNode, pos.offset);
          range.collapse(true);
        }
      }

      // STRICTLY REMOVE existing embed to prevent duplication
      const existing = editorRef.current.querySelectorAll(`[data-attachment-id="${state.att.id}"]`);
      existing.forEach(el => el.remove());

      const newEmbed = createAttachmentEmbedDom(state.att, isLight, theme.accent, theme.bg, theme.text);
      const spaceNode = document.createTextNode('\u00A0');

      if (range && editorRef.current.contains(range.startContainer)) {
        range.insertNode(newEmbed);
        if (newEmbed.nextSibling) {
          newEmbed.parentNode?.insertBefore(spaceNode, newEmbed.nextSibling);
        } else {
          newEmbed.parentNode?.appendChild(spaceNode);
        }
      } else {
        editorRef.current.appendChild(newEmbed);
        editorRef.current.appendChild(spaceNode);
      }

      handleEditorInput();
      decorateExistingEmbeds();
    }

    state.isDragging = false;
    state.att = null;
  };

  const plainText = stripHtmlTags(note.content).trim();
  const plainTextLength = stripHtmlTags(note.content).length;
  const plainTextWords = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;

  const notePlaceholder = React.useMemo(() => {
    if (!note) return NOTE_PLACEHOLDERS[0];
    let hash = 0;
    for (let i = 0; i < note.id.length; i++) {
      hash = (hash << 5) - hash + note.id.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % NOTE_PLACEHOLDERS.length;
    return NOTE_PLACEHOLDERS[index];
  }, [note?.id]);

  const isContentEmpty =
    stripHtmlTags(note.content || '').trim().length === 0 &&
    !note.content?.includes('<img') &&
    !note.content?.includes('data-attachment-id');

  return (
    <div
      ref={scrollContainerRef}
      onScroll={() => {
        if (scrollContainerRef.current && note?.id) {
          noteScrollPositionsRef.current[note.id] = scrollContainerRef.current.scrollTop;
        }
      }}
      className="flex-1 w-full h-full overflow-y-auto overflow-x-hidden relative"
    >
      {/* Floating Formatting Toolbar */}
      <FormattingToolbar
        selectionRect={selectionRect}
        onApplyFormat={handleEditorInput}
        oneTimeFormatting={quickSettings.oneTimeFormatting}
      />

      {/* Delete Voice Message Confirmation Modal */}
      {audioToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
          onClick={() => setAudioToDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 shadow-2xl border backdrop-blur-2xl transition-all space-y-4 animate-scaleUp"
            style={{
              backgroundColor: hexToRgba(theme.bg, 0.95),
              color: theme.text,
              borderColor: cardBorder,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3.5">
              <Trash2 size={24} style={{ color: theme.accent }} className="shrink-0" />
              <div>
                <h3 className="font-extrabold text-base">Удалить аудиозапись?</h3>
                <p className="text-xs opacity-60 mt-0.5">
                  Вы действительно хотите удалить это голосовое сообщение из заметки?
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setAudioToDelete(null)}
                className="flex-1 py-3 px-4 rounded-2xl border font-bold text-xs hover:opacity-80 active:scale-98 transition cursor-pointer"
                style={{
                  borderColor: cardBorder,
                  backgroundColor: hexToRgba(theme.text, 0.05),
                  color: theme.text,
                }}
              >
                Отмена
              </button>
              <button
                onClick={confirmDeleteAudio}
                className="flex-1 py-3 px-4 rounded-2xl font-bold text-xs active:scale-98 transition cursor-pointer shadow-lg hover:opacity-90"
                style={{
                  backgroundColor: theme.accent,
                  color: isLightColor(theme.accent) ? '#000000' : '#FFFFFF',
                }}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Full-Screen Content Area */}
      <div
        className="w-full max-w-3xl mx-auto px-4 sm:px-12 pt-24 sm:pt-32 pb-48 sm:pb-56 flex flex-col min-h-full"
        onClick={e => {
          if (e.target === e.currentTarget && editorRef.current) {
            editorRef.current.focus();
          }
        }}
      >
        {/* Note Title Input */}
        <input
          type="text"
          value={note.title}
          onChange={handleTitleChange}
          placeholder="Заголовок"
          className="w-full bg-transparent border-none outline-hidden text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3 transition text-left"
          style={{
            color: theme.text,
            fontFamily: getFontFamilyStyle(note.titleFont || quickSettings.fontFamily || 'sans'),
          }}
        />

        {/* Note Metadata Line */}
        {!isFocusMode && (
          <div className="flex items-center justify-start gap-3.5 text-xs opacity-50 mb-6 font-medium select-none flex-wrap">
            {quickSettings.showCharCount && (
              <span>{plainTextLength} {t('chars')}</span>
            )}
            {quickSettings.showWordCount && (
              <span>{plainTextWords} {t('words')}</span>
            )}
            {quickSettings.showDate && (
              <span>{formatDate(note.updatedAt)}</span>
            )}
          </div>
        )}

        {/* Rich ContentEditable Note Editor with Drag & Drop Integration & dynamic placeholder */}
        <div className="relative w-full min-h-[320px]">
          {isContentEmpty && (
            <div
              aria-hidden="true"
              className="absolute top-0 left-0 pointer-events-none select-none opacity-40 transition-opacity duration-150 whitespace-pre-wrap"
              style={{
                color: theme.text,
                fontSize: `${quickSettings.fontSize}px`,
                lineHeight: quickSettings.lineHeight || 1.6,
              }}
            >
              {notePlaceholder}
            </div>
          )}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onFocus={() => {
              wasEditingBeforeSelectionRef.current = true;
            }}
            onBlur={() => {
              setTimeout(() => {
                if (document.activeElement !== editorRef.current) {
                  wasEditingBeforeSelectionRef.current = false;
                }
              }, 250);
            }}
            onInput={handleEditorInput}
            onKeyDown={handleKeyDown}
            onPaste={handleEditorPaste}
            onDragStart={handleEditorDragStart}
            onDragOver={handleEditorDragOver}
            onDragLeave={handleEditorDragLeave}
            onDrop={handleEditorDrop}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={cleanupGhost}
            onPointerDown={handleEditorPointerDown}
            onClick={handleEditorClick}
            onContextMenu={e => e.preventDefault()}
            className="w-full bg-transparent border-none outline-hidden leading-relaxed transition font-normal min-h-[320px] focus:outline-none focus:ring-0 cursor-text whitespace-pre-wrap [&_h1]:text-3xl [&_h1]:font-extrabold [&_h1]:my-3 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:my-2 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:my-2 [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:my-1 [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--theme-accent,#eab308)] [&_blockquote]:pl-4 [&_blockquote]:my-3 [&_blockquote]:opacity-90 [&_blockquote_p]:my-0 [&_blockquote_div]:my-0 [&_pre]:bg-black/20 [&_pre]:p-3 [&_pre]:rounded-xl [&_pre]:font-mono [&_pre]:text-xs [&_pre]:my-3 [&_pre]:overflow-x-auto"
            style={{
              color: theme.text,
              fontSize: `${quickSettings.fontSize}px`,
              lineHeight: quickSettings.lineHeight || 1.6,
            }}
          />
        </div>
      </div>

      {/* Attachment Preview Modal */}
      {selectedAttachment && (
        <AttachmentPreviewModal
          attachment={selectedAttachment}
          noteId={note.id}
          onClose={() => setSelectedAttachment(null)}
        />
      )}

      {/* Floating In-Editor Search Bar */}
      <FloatingNoteSearch
        isOpen={isNoteSearchOpen}
        onClose={() => setIsNoteSearchOpen(false)}
        editorRef={editorRef}
      />

      {/* Mention Autocomplete Menu (@) for Notes & Blocks */}
      {mentionQuery !== null && mentionPosition && mentionItems.length > 0 && (
        <div
          className="fixed z-50 w-64 sm:w-72 max-h-56 overflow-y-auto rounded-2xl border p-1.5 shadow-2xl backdrop-blur-2xl animate-scaleUp flex flex-col gap-1"
          style={{
            top: `${mentionPosition.top}px`,
            left: `${mentionPosition.left}px`,
            backgroundColor: isLight ? 'rgba(255, 255, 255, 0.92)' : hexToRgba(theme.bg, 0.95),
            borderColor: cardBorder,
            color: theme.text,
            boxShadow: `0 16px 40px ${isLight ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.5)'}`,
          }}
          onMouseDown={e => e.preventDefault()}
        >
          <div className="px-2.5 py-1 text-[10px] font-bold opacity-45 uppercase tracking-wider select-none">
            Упомянуть заметку или блок
          </div>
          {mentionItems.map((entry, idx) => {
            const isSelected = idx === selectedMentionIndex;
            const isBlock = entry.kind === 'block';
            const displayTitle = isBlock
              ? (entry.item.name?.trim() || 'Блок').replace(/\s+/g, '_')
              : (entry.item.title?.trim() || 'Без названия').replace(/\s+/g, '_');

            return (
              <button
                key={isBlock ? `block-${entry.item.id}` : `note-${entry.item.id}`}
                type="button"
                onClick={() => {
                  if (isBlock) {
                    insertBlockMention(entry.item);
                  } else {
                    insertNoteMention(entry.item);
                  }
                }}
                className={`w-full px-2.5 py-2 rounded-xl text-left text-xs flex items-center gap-2 transition cursor-pointer select-none ${
                  isSelected ? 'font-bold shadow-xs' : 'opacity-85 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: isSelected ? hexToRgba(theme.accent, 0.18) : 'transparent',
                  color: isSelected ? theme.accent : theme.text,
                }}
              >
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: hexToRgba(theme.accent, isSelected ? 0.25 : 0.12),
                    color: theme.accent,
                  }}
                >
                  {isBlock ? <Layers size={13} /> : <FileText size={13} />}
                </div>
                <span className="truncate flex-1">@{displayTitle}</span>
                {isBlock && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: hexToRgba(theme.accent, 0.15),
                      color: theme.accent,
                    }}
                  >
                    Блок
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Note Read-Only Modal (opened when clicking a note link) */}
      {readOnlyNoteId && (
        <NoteReadModal
          noteId={readOnlyNoteId}
          onClose={() => setReadOnlyNoteId(null)}
        />
      )}

      {/* Block Notes Modal (opened when clicking a block link) */}
      {activeBlockModalId && (
        <BlockNotesModal
          blockId={activeBlockModalId}
          onClose={() => setActiveBlockModalId(null)}
        />
      )}
    </div>
  );
};
