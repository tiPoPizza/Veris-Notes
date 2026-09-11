import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useApp, COHERE_MODELS, IONET_MODELS } from '../context/AppContext';
import { hexToRgba, isLightColor, ALL_THEMES } from '../themes';
import {
  X,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Plus,
  ArrowUp,
  Zap,
  History,
  Trash2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  MoreHorizontal,
  Edit2,
  FileText,
  AtSign,
  SquarePen,
  Music,
  Sliders,
  Settings as SettingsIcon,
  Send,
  Loader2,
  ListTodo,
  Folder,
  FolderPlus,
  FolderX,
  Pin,
  Undo2,
  Shapes,
  RotateCcw,
  CheckCircle2,
  Layers,
  Palette,
  Highlighter,
  Type,
  Edit3,
  Tag as TagIcon,
  Tags,
  Search,
  Database,
  Globe,
  Calendar as CalendarIcon,
  Bell,
  Clock,
  SlidersHorizontal,
  ArrowUpDown,
  GitBranch,
  Pencil,
  Square,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import {
  AnacrusaChatMessage,
  AnacrusaChatSession,
  AnacrusaNoteAction,
  AnacrusaActionType,
  AnacrusaStep,
  AnacrusaReadStep,
  CohereModelId,
  Note,
  TaskList,
  Tag,
  CalendarEvent,
} from '../types';

/**
 * Converts AI Markdown or plain text response into rich HTML for Veris NoteEditor
 */
function convertTextOrMarkdownToNoteHtml(raw: string): string {
  if (!raw) return '';
  const text = raw.trim();

  // If already contains rich structural HTML tags and no unprocessed markdown blocks, return as is
  if (/<(p|div|ul|ol|table|h[1-6]|blockquote)\b[^>]*>/i.test(text) && !text.includes('```') && !text.includes('==')) {
    return text;
  }

  // Pre-process code blocks: ```lang ... ```
  let processed = text;
  const codeBlocks: string[] = [];
  processed = processed.replace(/```(?:[a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g, (_, codeContent) => {
    const placeholder = `__CODE_BLOCK_PLACEHOLDER_${codeBlocks.length}__`;
    codeBlocks.push(
      `<pre style="background: rgba(125, 125, 125, 0.12); border-radius: 8px; padding: 10px 14px; margin: 0.75rem 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.875rem; line-height: 1.5; overflow-x: auto; white-space: pre-wrap; border: 1px solid rgba(125, 125, 125, 0.2);"><code>${codeContent
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')}</code></pre>`
    );
    return placeholder;
  });

  // Convert inline highlights: ==#color|text== or ==text==
  processed = processed.replace(/==(?:#([0-9a-fA-F]{3,8})|[a-zA-Z-]+)\|([\s\S]*?)==/g, (_, color, highlightedText) => {
    const bgCol = color?.startsWith('#') ? color : (color ? `#${color}` : '#9E862B');
    return `<span style="background-color: ${bgCol}; color: #ffffff; padding: 0.32em 4px; border-radius: 2px; display: inline; box-decoration-break: clone; -webkit-box-decoration-break: clone;" data-highlight="true">${highlightedText}</span>`;
  });
  processed = processed.replace(/==([\s\S]*?)==/g, '<span style="background-color: #9E862B; color: #ffffff; padding: 0.32em 4px; border-radius: 2px; display: inline; box-decoration-break: clone; -webkit-box-decoration-break: clone;" data-highlight="true">$1</span>');

  // Convert inline markdown formatting
  processed = processed
    .replace(/\*\*\*(.*?)\*\*\*/g, '<b><i>$1</i></b>')
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.*?)\*/g, '<i>$1</i>')
    .replace(/__(.*?)__/g, '<u>$1</u>')
    .replace(/~~(.*?)~~/g, '<s>$1</s>')
    .replace(/`([^`\n]+)`/g, '<code style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.875em; background: rgba(125, 125, 125, 0.15); padding: 0.15em 0.35em; border-radius: 4px;">$1</code>');

  const lines = processed.split('\n');
  const result: string[] = [];
  let inUl = false;
  let inOl = false;
  let inBlockquote = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check if we are inside a blockquote and whether the quote continues
    if (inBlockquote) {
      if (/^>\s*/.test(trimmed)) {
        const item = trimmed.replace(/^>\s*/, '');
        result.push(item ? `<br/>${item}` : '<br/>');
        continue;
      }
      // If line is empty, check if subsequent line continues the quote
      let hasSubsequentQuote = false;
      if (!trimmed) {
        for (let j = i + 1; j < lines.length; j++) {
          const nextLineTrim = lines[j].trim();
          if (!nextLineTrim) continue;
          if (/^>\s*/.test(nextLineTrim)) {
            hasSubsequentQuote = true;
          }
          break;
        }
      }
      if (hasSubsequentQuote) {
        // Keep empty line inside quote
        result.push('<br/>');
        continue;
      } else {
        result.push('</blockquote>');
        inBlockquote = false;
      }
    }

    if (!trimmed) {
      if (inUl) { result.push('</ul>'); inUl = false; }
      if (inOl) { result.push('</ol>'); inOl = false; }
      result.push('<p><br/></p>');
      continue;
    }

    // Check code block placeholder
    if (trimmed.startsWith('__CODE_BLOCK_PLACEHOLDER_')) {
      if (inUl) { result.push('</ul>'); inUl = false; }
      if (inOl) { result.push('</ol>'); inOl = false; }
      const match = trimmed.match(/__CODE_BLOCK_PLACEHOLDER_(\d+)__/);
      if (match) {
        const idx = parseInt(match[1], 10);
        result.push(codeBlocks[idx] || '');
        continue;
      }
    }

    // Text alignment tags: [align=center]...[/align]
    const alignMatch = trimmed.match(/^\[align=(left|center|right|justify)\]([\s\S]*?)\[\/align\]$/i);
    if (alignMatch) {
      if (inUl) { result.push('</ul>'); inUl = false; }
      if (inOl) { result.push('</ol>'); inOl = false; }
      result.push(`<p style="text-align: ${alignMatch[1].toLowerCase()};">${alignMatch[2]}</p>`);
      continue;
    }

    // Headers (#, ##, ###, ####)
    if (/^####\s+(.*)/.test(trimmed)) {
      if (inUl) { result.push('</ul>'); inUl = false; }
      if (inOl) { result.push('</ol>'); inOl = false; }
      const content = trimmed.replace(/^####\s+/, '');
      result.push(`<h4>${content}</h4>`);
      continue;
    }
    if (/^###\s+(.*)/.test(trimmed)) {
      if (inUl) { result.push('</ul>'); inUl = false; }
      if (inOl) { result.push('</ol>'); inOl = false; }
      const content = trimmed.replace(/^###\s+/, '');
      result.push(`<h3>${content}</h3>`);
      continue;
    }
    if (/^##\s+(.*)/.test(trimmed)) {
      if (inUl) { result.push('</ul>'); inUl = false; }
      if (inOl) { result.push('</ol>'); inOl = false; }
      const content = trimmed.replace(/^##\s+/, '');
      result.push(`<h2>${content}</h2>`);
      continue;
    }
    if (/^#\s+(.*)/.test(trimmed)) {
      if (inUl) { result.push('</ul>'); inUl = false; }
      if (inOl) { result.push('</ol>'); inOl = false; }
      const content = trimmed.replace(/^#\s+/, '');
      result.push(`<h1>${content}</h1>`);
      continue;
    }

    // Unordered lists (- , * , • )
    if (/^[-*•]\s+(.*)/.test(trimmed)) {
      if (inOl) { result.push('</ol>'); inOl = false; }
      if (!inUl) { result.push('<ul>'); inUl = true; }
      const item = trimmed.replace(/^[-*•]\s+/, '');
      result.push(`<li>${item}</li>`);
      continue;
    }

    // Ordered lists (1. , 2. )
    if (/^\d+[.)]\s+(.*)/.test(trimmed)) {
      if (inUl) { result.push('</ul>'); inUl = false; }
      if (!inOl) { result.push('<ol>'); inOl = true; }
      const item = trimmed.replace(/^\d+[.)]\s+/, '');
      result.push(`<li>${item}</li>`);
      continue;
    }

    // Blockquote (> )
    if (/^>\s*(.*)/.test(trimmed)) {
      if (inUl) { result.push('</ul>'); inUl = false; }
      if (inOl) { result.push('</ol>'); inOl = false; }
      const item = trimmed.replace(/^>\s*/, '');
      result.push('<blockquote>');
      inBlockquote = true;
      result.push(item || '<br/>');
      continue;
    }

    // If line already starts with HTML tag, push as is
    if (/^<(p|div|h[1-6]|blockquote|pre|table|ul|ol)\b/i.test(trimmed)) {
      if (inUl) { result.push('</ul>'); inUl = false; }
      if (inOl) { result.push('</ol>'); inOl = false; }
      result.push(trimmed);
      continue;
    }

    // Regular paragraph
    if (inUl) { result.push('</ul>'); inUl = false; }
    if (inOl) { result.push('</ol>'); inOl = false; }
    result.push(`<p>${trimmed}</p>`);
  }

  if (inBlockquote) result.push('</blockquote>');
  if (inUl) result.push('</ul>');
  if (inOl) result.push('</ol>');

  let finalHtml = result.join('');
  // Restore any code blocks remaining
  codeBlocks.forEach((cb, idx) => {
    finalHtml = finalHtml.replace(new RegExp(`__CODE_BLOCK_PLACEHOLDER_${idx}__`, 'g'), cb);
  });

  return finalHtml;
}

export interface RawActionStep {
  name: string;
  arguments: Record<string, any>;
}

/**
 * Extracts multiple or single action steps from Cohere v2 toolCalls,
 * code blocks (JSON / veris_action), or inline JSON.
 */
function extractActionStepsFromResponse(
  rawResponse: string,
  serverToolCalls?: any[]
): {
  displayText: string;
  steps: RawActionStep[];
} {
  const steps: RawActionStep[] = [];
  let cleanedText = (rawResponse || '').trim();

  // 1. Check serverToolCalls from Cohere v2 API
  if (Array.isArray(serverToolCalls) && serverToolCalls.length > 0) {
    for (const tc of serverToolCalls) {
      if (tc && tc.name) {
        steps.push({
          name: tc.name as AnacrusaActionType,
          arguments: tc.arguments || {},
        });
      }
    }
  }

  // 2. Check JSON code blocks ```veris_action or ```json
  const codeBlockRegex = /```(?:veris_action|json|action)?\s*([\s\S]*?)\s*```/gi;
  let match: RegExpExecArray | null;
  while ((match = codeBlockRegex.exec(rawResponse)) !== null) {
    const blockContent = match[1].trim();
    if (blockContent.startsWith('{') || blockContent.startsWith('[')) {
      try {
        const parsed = JSON.parse(blockContent);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            const actName = item?.action || item?.name;
            if (actName) {
              steps.push({
                name: actName as AnacrusaActionType,
                arguments: item,
              });
            }
          }
          cleanedText = cleanedText.replace(match[0], '').trim();
        } else if (parsed) {
          const actName = parsed?.action || parsed?.name;
          if (actName) {
            steps.push({
              name: actName as AnacrusaActionType,
              arguments: parsed,
            });
            cleanedText = cleanedText.replace(match[0], '').trim();
          }
        }
      } catch {
        // ignore parse error
      }
    }
  }

  // 3. Check inline JSON array or single object if no steps found yet
  if (steps.length === 0) {
    const inlineArrayMatch = /\[\s*\{[\s\S]*?"action"\s*:\s*"(?:create_note|update_note|rename_note|delete_note|format_note|create_task_list|update_task_list|rename_task_list|delete_task_list|move_notes_to_block|create_block|rename_block|delete_block|pin_notes|unpin_notes|create_tag|delete_tag|attach_tags|detach_tags|create_calendar_event|update_calendar_event|delete_calendar_event)"[\s\S]*?\}\s*\]/i.exec(cleanedText);
    if (inlineArrayMatch) {
      try {
        const parsedArray = JSON.parse(inlineArrayMatch[0]);
        if (Array.isArray(parsedArray)) {
          for (const item of parsedArray) {
            const actName = item?.action || item?.name;
            if (actName) {
              steps.push({
                name: actName as AnacrusaActionType,
                arguments: item,
              });
            }
          }
          cleanedText = cleanedText.replace(inlineArrayMatch[0], '').trim();
        }
      } catch {}
    }
  }

  if (steps.length === 0) {
    const inlineSingleMatch = /\{[\s\S]*?"action"\s*:\s*"(?:create_note|update_note|rename_note|delete_note|format_note|create_task_list|update_task_list|rename_task_list|delete_task_list|move_notes_to_block|create_block|rename_block|delete_block|pin_notes|unpin_notes|create_tag|delete_tag|attach_tags|detach_tags|create_calendar_event|update_calendar_event|delete_calendar_event)"[\s\S]*?\}/i.exec(cleanedText);
    if (inlineSingleMatch) {
      try {
        const parsed = JSON.parse(inlineSingleMatch[0]);
        const actName = parsed?.action || parsed?.name;
        if (actName) {
          steps.push({
            name: actName as AnacrusaActionType,
            arguments: parsed,
          });
          cleanedText = cleanedText.replace(inlineSingleMatch[0], '').trim();
        }
      } catch {}
    }
  }

  return { displayText: cleanedText, steps };
}

export const AnacrusaDrawer: React.FC = () => {
  const {
    isAIPromptOpen,
    closeAnacrusaDrawer,
    anacrusaSettings,
    setAnacrusaSettings,
    anacrusaSessions,
    activeAnacrusaSessionId,
    setActiveAnacrusaSessionId,
    saveAnacrusaSession,
    deleteAnacrusaSession,
    clearAllAnacrusaSessions,
    insertTextIntoActiveNote,
    createNote,
    updateNote,
    setActiveNoteId,
    setViewMode,
    viewMode,
    activeNoteId,
    activeTaskId,
    notes,
    deleteNote,
    restoreNote,
    blocks,
    createBlock,
    updateBlock,
    deleteBlock,
    moveNotesToBlock,
    togglePinNote,
    taskLists,
    saveTaskList,
    deleteTaskList,
    restoreTaskList,
    setActiveTaskId,
    tags,
    createTag,
    deleteTagByName,
    toggleNoteTag,
    setSelectedTagFilter,
    theme,
    setTheme,
    quickSettings,
    updateQuickSettings,
    launchScreen,
    setLaunchScreen,
    language,
    setLanguage,
    setActiveSettingsTab,
    events,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    restoreCalendarEvent,
    setSelectedCalendarDate,
    webSearchSettings,
  } = useApp();

  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ type: string; message: string } | null>(null);
  const [copiedAction, setCopiedAction] = useState<string | null>(null);
  const [isPowerSettingsOpen, setIsPowerSettingsOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [attachedNotes, setAttachedNotes] = useState<Note[]>([]);
  const [showNotePicker, setShowNotePicker] = useState(false);
  const [notePickerFilter, setNotePickerFilter] = useState('');
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);
  const [isWebSearchForced, setIsWebSearchForced] = useState(false);
  const [activePromptChips, setActivePromptChips] = useState<('note' | 'tasks' | 'event')[]>([]);
  const [redoMenuMsgId, setRedoMenuMsgId] = useState<string | null>(null);
  const redoMenuRef = useRef<HTMLDivElement>(null);
  const [expandedWebSourcesMsgIds, setExpandedWebSourcesMsgIds] = useState<Record<string, boolean>>({});
  const [sessionMenuOpenId, setSessionMenuOpenId] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<AnacrusaChatSession | null>(null);
  const [sessionToRename, setSessionToRename] = useState<AnacrusaChatSession | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const sessionMenuRef = useRef<HTMLDivElement>(null);

  const [isHistoryMenuOpen, setIsHistoryMenuOpen] = useState(false);
  const [historySortOrder, setHistorySortOrder] = useState<'newest' | 'oldest'>(() => {
    try {
      const saved = localStorage.getItem('anacrusa_history_sort_order');
      if (saved === 'oldest' || saved === 'newest') return saved;
    } catch {
      // fallback
    }
    return 'newest';
  });
  const historyMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sessionMenuRef.current && !sessionMenuRef.current.contains(e.target as Node)) {
        setSessionMenuOpenId(null);
      }
      if (historyMenuRef.current && !historyMenuRef.current.contains(e.target as Node)) {
        setIsHistoryMenuOpen(false);
      }
    };
    if (sessionMenuOpenId || isHistoryMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sessionMenuOpenId, isHistoryMenuOpen]);

  const handleSetHistorySortOrder = (order: 'newest' | 'oldest') => {
    setHistorySortOrder(order);
    try {
      localStorage.setItem('anacrusa_history_sort_order', order);
    } catch {
      // ignore
    }
  };

  const toggleWebSources = (msgId: string) => {
    setExpandedWebSourcesMsgIds(prev => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const notePickerRef = useRef<HTMLDivElement>(null);
  const slashMenuRef = useRef<HTMLDivElement>(null);
  const shapesBtnRef = useRef<HTMLButtonElement>(null);
  const newlyCreatedNotesRef = useRef<Note[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const [promptMenuMessage, setPromptMenuMessage] = useState<AnacrusaChatMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  };

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const handlePromptPressStart = (msg: AnacrusaChatMessage, e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(30);
      }
      setPromptMenuMessage(msg);
    }, 450);
  };

  const handlePromptPressMove = (e: React.TouchEvent) => {
    if (touchStartPosRef.current && e.touches.length > 0) {
      const dx = Math.abs(e.touches[0].clientX - touchStartPosRef.current.x);
      const dy = Math.abs(e.touches[0].clientY - touchStartPosRef.current.y);
      if (dx > 10 || dy > 10) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
    }
  };

  const handlePromptMouseDown = (msg: AnacrusaChatMessage, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setPromptMenuMessage(msg);
    }, 450);
  };

  const handlePromptPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePromptContextMenu = (msg: AnacrusaChatMessage, e: React.MouseEvent) => {
    e.preventDefault();
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setPromptMenuMessage(msg);
  };

  const calculateBranchedTitle = (currentTitle: string): string => {
    const trimmed = currentTitle.trim();
    // 4+ branches: keep the elegant small square (▪)
    if (/^[■⬛▪▫◽⬝]\s*/u.test(trimmed)) {
      const base = trimmed.replace(/^[■⬛▪▫◽⬝]\s*/u, '');
      return `▪ ${base}`;
    }
    // 3 bullets ••• -> becomes elegant small square ▪
    if (/^•••\s*/.test(trimmed)) {
      const base = trimmed.replace(/^•••\s*/, '');
      return `▪ ${base}`;
    }
    // 2 bullets •• -> becomes 3 bullets •••
    if (/^••\s*/.test(trimmed)) {
      const base = trimmed.replace(/^••\s*/, '');
      return `••• ${base}`;
    }
    // 1 bullet • -> becomes 2 bullets ••
    if (/^•\s*/.test(trimmed)) {
      const base = trimmed.replace(/^•\s*/, '');
      return `•• ${base}`;
    }
    // Standard chat (no bullet) -> becomes 1 bullet •
    return `• ${trimmed}`;
  };

  const formatDisplaySessionTitle = (title?: string): string => {
    if (!title) return 'Новый диалог';
    // Replace huge block squares with elegant small square
    return title.replace(/^[■⬛]\s*/u, '▪ ');
  };

  const handleCreateBranch = (messageId: string) => {
    if (!activeSession) return;
    const msgIndex = activeSession.messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;

    // Copy conversation history up to and including this response
    const historyToCopy = activeSession.messages.slice(0, msgIndex + 1);
    const branchedMessages: AnacrusaChatMessage[] = historyToCopy.map(m => ({
      ...m,
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    }));

    const newTitle = calculateBranchedTitle(activeSession.title || 'Чат');
    const newSessionId = `session-branch-${Date.now()}`;
    const newSession: AnacrusaChatSession = {
      id: newSessionId,
      title: newTitle,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: activeSession.model || anacrusaSettings.model,
      messages: branchedMessages,
      pinned: false,
    };

    saveAnacrusaSession(newSession);
    setActiveAnacrusaSessionId(newSessionId);
    setCopiedAction(`branch-${messageId}`);
    setTimeout(() => setCopiedAction(null), 2000);
  };

  const MAX_ATTACHED_NOTES = 10;

  const resolveNotes = (
    noteIds?: (string | null | undefined)[],
    queries?: (string | number | null | undefined)[],
    overrideNotes?: Note[]
  ): Note[] => {
    const poolNotes = overrideNotes || [
      ...newlyCreatedNotesRef.current,
      ...notes.filter(n => !newlyCreatedNotesRef.current.some(c => c.id === n.id)),
    ];
    const result: Note[] = [];

    // 1. Direct ID matches from context
    if (noteIds && Array.isArray(noteIds)) {
      for (const id of noteIds) {
        if (!id) continue;
        const found = poolNotes.find(n => n.id === id);
        if (found && !result.some(r => r.id === found.id)) {
          result.push(found);
        }
      }
    }

    // 2. Query / Index / Title matches
    if (queries && Array.isArray(queries)) {
      for (const rawQ of queries) {
        if (rawQ === undefined || rawQ === null) continue;
        const q = String(rawQ).trim().replace(/^["'«]|["'»]$/g, '');
        if (!q) continue;

        // Direct ID check
        const idMatch = poolNotes.find(n => n.id === q);
        if (idMatch && !result.some(r => r.id === idMatch.id)) {
          result.push(idMatch);
          continue;
        }

        // Numeric index e.g. "1", "2", "1-ю", "1-я", "1 заметка", "1 заметку"
        const numMatch = q.match(/^(?:заметка\s+)?(\d+)(?:-?[а-яё]+)?(?:\s+заметк[а-яё]*)?$/i) ||
                         q.match(/^(\d+)(?:-?[а-яё]+)?(?:\s+заметк[а-яё]*)?$/i);
        if (numMatch) {
          const num = parseInt(numMatch[1], 10);
          if (num >= 1 && num <= poolNotes.length) {
            const n = poolNotes[num - 1];
            if (n && !result.some(r => r.id === n.id)) {
              result.push(n);
              continue;
            }
          }
        }

        // Word ordinals like "первая", "первую", "вторая", "вторую", "последняя"
        const wordOrdinals: Record<string, number> = {
          'первую': 1, 'первая': 1, 'первый': 1,
          'вторую': 2, 'вторая': 2, 'второй': 2,
          'третью': 3, 'третья': 3, 'третий': 3,
          'четвертую': 4, 'четвертая': 4, 'четвертый': 4,
          'пятую': 5, 'пятая': 5, 'пятый': 5,
          'последнюю': poolNotes.length, 'последняя': poolNotes.length, 'последний': poolNotes.length,
        };
        const lowerQ = q.toLowerCase();
        for (const [ordKey, ordNum] of Object.entries(wordOrdinals)) {
          if (lowerQ.includes(ordKey) && ordNum >= 1 && ordNum <= poolNotes.length) {
            const n = poolNotes[ordNum - 1];
            if (n && !result.some(r => r.id === n.id)) {
              result.push(n);
              continue;
            }
          }
        }

        // Skip generic single-word noise that matches all notes
        if (/^(?:заметка|заметку|заметки|все|всё|заметкам|note|notes)$/i.test(q)) {
          continue;
        }

        // Exact title match (case-insensitive)
        const exact = poolNotes.find(n => n.title.toLowerCase().trim() === q.toLowerCase());
        if (exact && !result.some(r => r.id === exact.id)) {
          result.push(exact);
          continue;
        }

        // Substring match in title (only if query is meaningful >= 2 chars)
        if (q.length >= 2) {
          const sub = poolNotes.filter(n => n.title.toLowerCase().includes(q.toLowerCase()));
          for (const s of sub) {
            if (!result.some(r => r.id === s.id)) result.push(s);
          }
        }
      }
    }

    // Fallbacks: ONLY if nothing matched at all AND attached or active note exists
    if (result.length === 0 && attachedNotes.length > 0) {
      return attachedNotes;
    }
    if (result.length === 0 && activeNoteId && viewMode === 'editor') {
      const act = poolNotes.find(n => n.id === activeNoteId);
      if (act) return [act];
    }

    return result;
  };

  const resolveTaskList = (taskListId?: string, taskListTitle?: string): TaskList | undefined => {
    if (taskListId) {
      const found = taskLists.find(t => t.id === taskListId);
      if (found) return found;
    }
    if (taskListTitle) {
      const clean = taskListTitle.toLowerCase().trim().replace(/^["'«]|["'»]$/g, '');
      if (clean) {
        // 1. Exact title match
        const exact = taskLists.find(t => t.title.toLowerCase().trim() === clean);
        if (exact) return exact;
        // 2. Numeric match (e.g. "1", "список 1")
        const numMatch = clean.match(/^(?:список\s+)?(\d+)$/i);
        if (numMatch) {
          const num = parseInt(numMatch[1], 10);
          if (num >= 1 && num <= taskLists.length) return taskLists[num - 1];
        }
        // 3. Substring match
        const sub = taskLists.find(t => t.title.toLowerCase().includes(clean));
        if (sub) return sub;
      }
    }
    // Fallback: if activeTask is selected, or if there's only 1 task list
    if (activeTaskId) {
      const act = taskLists.find(t => t.id === activeTaskId);
      if (act) return act;
    }
    if (taskLists.length === 1) {
      return taskLists[0];
    }
    return undefined;
  };

  const resolveTaskLists = (
    taskListIds?: (string | null | undefined)[],
    queries?: (string | number | null | undefined)[]
  ): TaskList[] => {
    const result: TaskList[] = [];

    if (taskListIds && Array.isArray(taskListIds)) {
      for (const id of taskListIds) {
        if (!id) continue;
        const found = taskLists.find(t => t.id === id);
        if (found && !result.some(r => r.id === found.id)) {
          result.push(found);
        }
      }
    }

    if (queries && Array.isArray(queries)) {
      for (const rawQ of queries) {
        if (rawQ === undefined || rawQ === null) continue;
        const q = String(rawQ).trim().replace(/^["'«]|["'»]$/g, '');
        if (!q) continue;

        const idMatch = taskLists.find(t => t.id === q);
        if (idMatch && !result.some(r => r.id === idMatch.id)) {
          result.push(idMatch);
          continue;
        }

        const numMatch = q.match(/^(?:список\s+)?(\d+)$/i);
        if (numMatch) {
          const num = parseInt(numMatch[1], 10);
          if (num >= 1 && num <= taskLists.length) {
            const t = taskLists[num - 1];
            if (t && !result.some(r => r.id === t.id)) {
              result.push(t);
              continue;
            }
          }
        }

        const exact = taskLists.find(t => t.title.toLowerCase().trim() === q.toLowerCase());
        if (exact && !result.some(r => r.id === exact.id)) {
          result.push(exact);
          continue;
        }

        if (q.length >= 2) {
          const sub = taskLists.filter(t => t.title.toLowerCase().includes(q.toLowerCase()));
          for (const s of sub) {
            if (!result.some(r => r.id === s.id)) result.push(s);
          }
        }
      }
    }

    return result;
  };

  // Active session
  const activeSession = useMemo(() => {
    return anacrusaSessions.find(s => s.id === activeAnacrusaSessionId) || null;
  }, [anacrusaSessions, activeAnacrusaSessionId]);

  // Close model dropdown, note picker, and slash menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(target)) {
        setIsModelDropdownOpen(false);
      }
      if (
        notePickerRef.current &&
        !notePickerRef.current.contains(target) &&
        !shapesBtnRef.current?.contains(target)
      ) {
        setShowNotePicker(false);
      }
      if (
        slashMenuRef.current &&
        !slashMenuRef.current.contains(target) &&
        !shapesBtnRef.current?.contains(target)
      ) {
        setShowSlashMenu(false);
      }
      if (
        redoMenuRef.current &&
        !redoMenuRef.current.contains(target)
      ) {
        setRedoMenuMsgId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // When drawer opens:
  // 1. If in note editor, auto-attach current active note context!
  // 2. Focus input
  useEffect(() => {
    if (isAIPromptOpen) {
      setErrorInfo(null);
      setShowHistory(false);
      setIsPowerSettingsOpen(false);
      setIsModelDropdownOpen(false);
      setShowNotePicker(false);
      setShowSlashMenu(false);
      setActivePromptChips([]);

      if (viewMode === 'editor' && activeNoteId) {
        const curr = notes.find(n => n.id === activeNoteId);
        if (curr) {
          setAttachedNotes([curr]);
        } else {
          setAttachedNotes([]);
        }
      } else {
        setAttachedNotes([]);
      }

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = '24px';
          textareaRef.current.style.overflowY = 'hidden';
          textareaRef.current.focus();
        }
      }, 150);
    }
  }, [isAIPromptOpen, viewMode, activeNoteId, notes]);

  // Dynamically auto-resize textarea as user types, adding scrollbar ONLY when content exceeds 2+ lines
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px';
      textareaRef.current.style.overflowY = 'hidden';
      const scrollH = textareaRef.current.scrollHeight;
      if (!inputQuery) {
        textareaRef.current.style.height = '24px';
        textareaRef.current.style.overflowY = 'hidden';
      } else if (scrollH > 32) {
        const targetH = Math.min(scrollH, 120);
        textareaRef.current.style.height = `${targetH}px`;
        textareaRef.current.style.overflowY = scrollH > 120 ? 'auto' : 'hidden';
      } else {
        textareaRef.current.style.height = '24px';
        textareaRef.current.style.overflowY = 'hidden';
      }
    }
  }, [inputQuery]);

  // Scroll to bottom of chat when new message arrives
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeSession?.messages, loading]);

  const isLight = isLightColor(theme.bg);
  const drawerBg = isLight ? hexToRgba(theme.bg, 0.95) : hexToRgba(theme.bg, 0.92);
  const cardBg = hexToRgba(theme.text, isLight ? 0.04 : 0.07);
  const cardBorder = quickSettings.showBorder ? theme.accent : hexToRgba(theme.text, 0.12);
  const glassBg = hexToRgba(theme.text, 0.08);

  const isIonet = anacrusaSettings.provider === 'ionet';
  const activeApiKey = (isIonet ? anacrusaSettings.ionetApiKey : anacrusaSettings.cohereApiKey)?.trim();
  const hasApiKey = Boolean(activeApiKey);

  const activeModel = isIonet
    ? (anacrusaSettings.ionetModel || 'meta-llama/Llama-3.3-70B-Instruct')
    : anacrusaSettings.model;

  const currentModelMeta = isIonet
    ? (IONET_MODELS.find(m => m.id === activeModel) || {
        id: activeModel,
        name: activeModel.split('/').pop() || activeModel,
        description: 'Модель io.net',
      })
    : (COHERE_MODELS.find(m => m.id === anacrusaSettings.model) || COHERE_MODELS[0]);

  // Slash commands catalogue
  const slashCommands = useMemo(() => [
    {
      id: 'search',
      command: '/поиск',
      alias: '/search',
      title: 'Веб-поиск',
      icon: <Globe size={16} className="text-sky-400" />,
      action: () => {
        setIsWebSearchForced(true);
        // Strip the slash command from input
        const lastSlashIndex = inputQuery.lastIndexOf('/');
        if (lastSlashIndex !== -1) {
          setInputQuery(inputQuery.substring(0, lastSlashIndex).trimEnd());
        }
        setShowSlashMenu(false);
        if (textareaRef.current) textareaRef.current.focus();
      },
    },
    {
      id: 'create_note',
      command: '/заметка',
      alias: '/note',
      title: 'Создать заметку',
      icon: <FileText size={16} style={{ color: theme.accent }} />,
      action: () => {
        setActivePromptChips(prev => prev.includes('note') ? prev : [...prev, 'note']);
        const lastSlashIndex = inputQuery.lastIndexOf('/');
        if (lastSlashIndex !== -1) {
          setInputQuery(inputQuery.substring(0, lastSlashIndex).trimEnd());
        }
        setShowSlashMenu(false);
        if (textareaRef.current) textareaRef.current.focus();
      },
    },
    {
      id: 'create_task',
      command: '/задачи',
      alias: '/tasks',
      title: 'Список задач',
      icon: <ListTodo size={16} className="text-emerald-400" />,
      action: () => {
        setActivePromptChips(prev => prev.includes('tasks') ? prev : [...prev, 'tasks']);
        const lastSlashIndex = inputQuery.lastIndexOf('/');
        if (lastSlashIndex !== -1) {
          setInputQuery(inputQuery.substring(0, lastSlashIndex).trimEnd());
        }
        setShowSlashMenu(false);
        if (textareaRef.current) textareaRef.current.focus();
      },
    },
    {
      id: 'calendar_event',
      command: '/событие',
      alias: '/event',
      title: 'Событие в календаре',
      icon: <CalendarIcon size={16} className="text-amber-400" />,
      action: () => {
        setActivePromptChips(prev => prev.includes('event') ? prev : [...prev, 'event']);
        const lastSlashIndex = inputQuery.lastIndexOf('/');
        if (lastSlashIndex !== -1) {
          setInputQuery(inputQuery.substring(0, lastSlashIndex).trimEnd());
        }
        setShowSlashMenu(false);
        if (textareaRef.current) textareaRef.current.focus();
      },
    },
  ], [inputQuery, theme.accent]);

  const filteredSlashCommands = useMemo(() => {
    const q = slashFilter.toLowerCase().trim();
    if (!q) return slashCommands;
    return slashCommands.filter(c =>
      c.command.toLowerCase().includes(q) ||
      (c.alias && c.alias.toLowerCase().includes(q)) ||
      c.title.toLowerCase().includes(q)
    );
  }, [slashCommands, slashFilter]);

  // Filter notes for @ picker (max 10 notes allowed)
  const filteredNotes = notes.filter(n => {
    if (attachedNotes.some(att => att.id === n.id)) return false;
    const query = notePickerFilter.toLowerCase().trim();
    if (!query) return true;
    const titleMatch = (n.title || 'Без названия').toLowerCase().includes(query);
    const contentMatch = (n.content || '').toLowerCase().includes(query);
    return titleMatch || contentMatch;
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputQuery(val);

    // Check if user is typing / for slash commands
    const lastSlashIndex = val.lastIndexOf('/');
    if (lastSlashIndex !== -1 && (lastSlashIndex === 0 || val[lastSlashIndex - 1] === ' ' || val[lastSlashIndex - 1] === '\n')) {
      const queryAfterSlash = val.substring(lastSlashIndex + 1);
      if (!queryAfterSlash.includes(' ')) {
        setShowSlashMenu(true);
        setSlashFilter(queryAfterSlash);
        setSelectedSlashIndex(0);
      } else {
        setShowSlashMenu(false);
      }
    } else {
      setShowSlashMenu(false);
    }

    // Check if user is typing @ to open note picker
    const lastAtIndex = val.lastIndexOf('@');
    if (lastAtIndex !== -1 && lastAtIndex === val.length - 1) {
      setShowNotePicker(true);
      setNotePickerFilter('');
    } else if (lastAtIndex !== -1 && lastAtIndex > val.lastIndexOf(' ')) {
      setShowNotePicker(true);
      setNotePickerFilter(val.substring(lastAtIndex + 1));
    } else {
      setShowNotePicker(false);
    }
  };

  const handleSelectNoteMention = (note: Note) => {
    if (attachedNotes.length >= MAX_ATTACHED_NOTES) {
      setShowNotePicker(false);
      return;
    }
    if (!attachedNotes.some(n => n.id === note.id)) {
      setAttachedNotes(prev => {
        if (prev.length >= MAX_ATTACHED_NOTES) return prev;
        return [...prev, note];
      });
    }
    // Strip the '@' and partial filter from the end of prompt
    const lastAtIndex = inputQuery.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      setInputQuery(inputQuery.substring(0, lastAtIndex).trimEnd());
    }
    setShowNotePicker(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleRemoveAttachedNote = (noteId: string) => {
    setAttachedNotes(prev => prev.filter(n => n.id !== noteId));
  };

  const handleStartNewChat = () => {
    setActiveAnacrusaSessionId(null);
    setInputQuery('');
    setErrorInfo(null);
    setShowHistory(false);
    setIsPowerSettingsOpen(false);
    setIsModelDropdownOpen(false);
    setShowSlashMenu(false);
    setIsWebSearchForced(false);

    if (viewMode === 'editor' && activeNoteId) {
      const curr = notes.find(n => n.id === activeNoteId);
      if (curr) setAttachedNotes([curr]);
    } else {
      setAttachedNotes([]);
    }

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 100);
  };

  const executeActionStep = (rawStep: RawActionStep): AnacrusaStep => {
    const stepId = `step-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const safeArgs = (rawStep?.arguments && typeof rawStep.arguments === 'object') ? rawStep.arguments : {};
    const step: RawActionStep = {
      name: rawStep?.name || '',
      arguments: safeArgs,
    };

    if (step.name === 'create_note') {
      const title = (step.arguments.title || '').trim() || 'Новая заметка';
      const content = step.arguments.content || '';
      const formattedHtml = convertTextOrMarkdownToNoteHtml(content);

      const blockNameArg = (step.arguments.block_name || step.arguments.blockName || step.arguments.block || '').trim();
      const blockIdArg = step.arguments.block_id || step.arguments.blockId;
      let targetBlockId: string | null | undefined = undefined;
      let targetBlockTitle = '';

      if (blockIdArg) {
        targetBlockId = blockIdArg;
        const blk = blocks.find(b => b.id === blockIdArg);
        if (blk) targetBlockTitle = blk.name;
      } else if (blockNameArg) {
        const isGeneral = /^(?:общие?|без\s+блока|general|нет|null)$/i.test(blockNameArg);
        if (isGeneral) {
          targetBlockId = null;
          targetBlockTitle = 'Общие';
        } else {
          const blk = blocks.find(b => b.name.toLowerCase().trim() === blockNameArg.toLowerCase())
            || blocks.find(b => b.name.toLowerCase().includes(blockNameArg.toLowerCase()));
          if (blk) {
            targetBlockId = blk.id;
            targetBlockTitle = blk.name;
          } else {
            const newBlock = createBlock(blockNameArg);
            if (newBlock) {
              targetBlockId = newBlock.id;
              targetBlockTitle = newBlock.name;
            }
          }
        }
      }

      const newNote = createNote(title, formattedHtml, targetBlockId ?? null);

      if (newNote) {
        newlyCreatedNotesRef.current.push(newNote);
        setActiveNoteId(newNote.id);
        setViewMode('editor');
        setAttachedNotes([newNote]);
        return {
          id: stepId,
          action: 'create_note',
          title: newNote.title,
          summary: 'Создана заметка',
          status: 'completed',
          noteId: newNote.id,
          blockName: targetBlockTitle || undefined,
          undoPayload: {
            type: 'create_note',
            noteId: newNote.id,
          },
        };
      }
    }

    if (step.name === 'update_note') {
      const noteIdArg = step.arguments.note_id || step.arguments.noteId;
      const titleArg = step.arguments.title?.trim();
      const content = step.arguments.content || '';
      const formattedHtml = convertTextOrMarkdownToNoteHtml(content);

      const resolved = resolveNotes(noteIdArg ? [noteIdArg] : undefined, titleArg ? [titleArg] : undefined);
      let targetNote: Note | undefined = resolved[0];

      if (!targetNote && attachedNotes.length > 0) {
        targetNote = notes.find(n => n.id === attachedNotes[0].id) || attachedNotes[0];
      }
      if (!targetNote && activeNoteId && viewMode === 'editor') {
        targetNote = notes.find(n => n.id === activeNoteId);
      }

      if (targetNote) {
        const prevTitle = targetNote.title;
        const prevContent = targetNote.content;
        const updatedTitle = titleArg || targetNote.title;

        updateNote(targetNote.id, {
          title: updatedTitle,
          content: formattedHtml,
        });
        setActiveNoteId(targetNote.id);
        setViewMode('editor');

        return {
          id: stepId,
          action: 'update_note',
          title: updatedTitle,
          summary: 'Обновлена заметка',
          status: 'completed',
          noteId: targetNote.id,
          undoPayload: {
            type: 'update_note',
            noteId: targetNote.id,
            previousTitle: prevTitle,
            previousContent: prevContent,
          },
        };
      } else {
        const newNote = createNote(titleArg || 'Новая заметка', formattedHtml);
        if (newNote) {
          newlyCreatedNotesRef.current.push(newNote);
        }
        return {
          id: stepId,
          action: 'create_note',
          title: newNote.title,
          summary: 'Создана заметка',
          status: 'completed',
          noteId: newNote.id,
          undoPayload: {
            type: 'create_note',
            noteId: newNote.id,
          },
        };
      }
    }

    if (step.name === 'rename_note') {
      const noteIdArg = step.arguments.note_id || step.arguments.noteId;
      const titleArg = step.arguments.title?.trim();
      const newTitle = (step.arguments.new_title || step.arguments.newTitle || '').trim() || 'Новое название';
      const targetNote = resolveNotes(noteIdArg ? [noteIdArg] : undefined, titleArg ? [titleArg] : undefined)[0];

      if (targetNote) {
        const prevTitle = targetNote.title;
        updateNote(targetNote.id, { title: newTitle });
        return {
          id: stepId,
          action: 'rename_note',
          title: newTitle,
          summary: 'Заметка переименована',
          status: 'completed',
          noteId: targetNote.id,
          undoPayload: {
            type: 'rename_note',
            noteId: targetNote.id,
            previousTitle: prevTitle,
          },
        };
      }
      return {
        id: stepId,
        action: 'rename_note',
        title: newTitle,
        summary: 'Заметка не найдена',
        status: 'failed',
      };
    }

    if (step.name === 'create_task_list') {
      const listTitle = (step.arguments.title || step.arguments.name || '').trim() || 'Список задач';
      const rawItems: any[] = Array.isArray(step.arguments.items) ? step.arguments.items : [];
      const items = rawItems.map((item, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        text: typeof item === 'string' ? item.trim() : (item?.text || 'Задача'),
        completed: Boolean(item?.completed),
      })).filter(it => it.text.length > 0);

      const newList = saveTaskList({
        title: listTitle,
        items: items.length > 0 ? items : [{ id: `item-${Date.now()}-0`, text: 'Первая задача', completed: false }],
      });

      if (newList) {
        setActiveTaskId(newList.id);
        setViewMode('tasks');
        return {
          id: stepId,
          action: 'create_task_list',
          title: newList.title,
          summary: 'Создан список задач',
          status: 'completed',
          taskListId: newList.id,
          undoPayload: {
            type: 'create_task_list',
            taskListId: newList.id,
          },
        };
      }
    }

    if (step.name === 'update_task_list') {
      const targetList = resolveTaskList(
        step.arguments.task_list_id || step.arguments.taskListId,
        step.arguments.task_list_title || step.arguments.taskListTitle
      );

      if (targetList) {
        const prevTitle = targetList.title;
        const prevItems = JSON.parse(JSON.stringify(targetList.items));
        const newTitle = step.arguments.new_title?.trim() || targetList.title;
        let currentItems = [...targetList.items];

        const addItems: string[] = Array.isArray(step.arguments.add_items)
          ? step.arguments.add_items
          : Array.isArray(step.arguments.addItems) ? step.arguments.addItems : [];
        if (addItems.length > 0) {
          addItems.forEach((text, idx) => {
            if (text && text.trim()) {
              currentItems.push({
                id: `item-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
                text: text.trim(),
                completed: false,
              });
            }
          });
        }

        const fullItems = Array.isArray(step.arguments.items) ? step.arguments.items : [];
        if (fullItems.length > 0) {
          currentItems = fullItems.map((it: any, idx: number) => ({
            id: `item-${Date.now()}-${idx}`,
            text: typeof it === 'string' ? it.trim() : (it?.text || 'Задача'),
            completed: Boolean(it?.completed),
          })).filter((it: any) => it.text.length > 0);
        }

        const toggleItems: string[] = Array.isArray(step.arguments.toggle_completed_items)
          ? step.arguments.toggle_completed_items
          : Array.isArray(step.arguments.toggleCompletedItems) ? step.arguments.toggleCompletedItems : [];
        if (toggleItems.length > 0) {
          currentItems = currentItems.map(it => {
            const shouldToggle = toggleItems.some(t =>
              it.id === t ||
              it.text.toLowerCase().includes(t.toLowerCase().trim()) ||
              t.toLowerCase().includes(it.text.toLowerCase().trim())
            );
            return shouldToggle ? { ...it, completed: !it.completed } : it;
          });
        }

        const removeItems: string[] = Array.isArray(step.arguments.remove_items)
          ? step.arguments.remove_items
          : Array.isArray(step.arguments.removeItems) ? step.arguments.removeItems : [];
        if (removeItems.length > 0) {
          currentItems = currentItems.filter(it => {
            const shouldRemove = removeItems.some(r =>
              it.id === r ||
              it.text.toLowerCase().includes(r.toLowerCase().trim()) ||
              r.toLowerCase().includes(it.text.toLowerCase().trim())
            );
            return !shouldRemove;
          });
        }

        const updatedList = saveTaskList({
          id: targetList.id,
          title: newTitle,
          items: currentItems,
        });

        setActiveTaskId(targetList.id);
        setViewMode('tasks');
        return {
          id: stepId,
          action: 'update_task_list',
          title: updatedList.title,
          summary: 'Обновлен список задач',
          status: 'completed',
          taskListId: targetList.id,
          undoPayload: {
            type: 'update_task_list',
            taskListId: targetList.id,
            previousTitle: prevTitle,
            previousItems: prevItems,
          },
        };
      } else {
        const listTitle = step.arguments.new_title || step.arguments.task_list_title || 'Список задач';
        const rawItems = step.arguments.add_items || step.arguments.items || ['Задача 1'];
        const items = rawItems.map((it: any, idx: number) => ({
          id: `item-${Date.now()}-${idx}`,
          text: typeof it === 'string' ? it.trim() : (it?.text || 'Задача'),
          completed: false,
        }));
        const newList = saveTaskList({ title: listTitle, items });
        setActiveTaskId(newList.id);
        setViewMode('tasks');
        return {
          id: stepId,
          action: 'create_task_list',
          title: newList.title,
          summary: 'Создан список задач',
          status: 'completed',
          taskListId: newList.id,
          undoPayload: {
            type: 'create_task_list',
            taskListId: newList.id,
          },
        };
      }
    }

    if (step.name === 'move_notes_to_block') {
      const noteIdsArg: string[] = Array.isArray(step.arguments.note_ids)
        ? step.arguments.note_ids
        : (typeof step.arguments.note_ids === 'string' ? [step.arguments.note_ids] : []);
      const noteQueries: string[] = Array.isArray(step.arguments.note_titles)
        ? step.arguments.note_titles
        : (typeof step.arguments.note_titles === 'string' ? [step.arguments.note_titles] : (step.arguments.title ? [step.arguments.title] : []));
      const blockNameRaw = (step.arguments.block_name || step.arguments.blockName || '').trim();

      let matchedNotes = resolveNotes(noteIdsArg, noteQueries);
      if (matchedNotes.length === 0 && newlyCreatedNotesRef.current.length > 0) {
        matchedNotes = [...newlyCreatedNotesRef.current];
      }

      if (matchedNotes.length > 0) {
        const isGeneral = !blockNameRaw || /^(?:общие?|без\s+блока|general|нет|null)$/i.test(blockNameRaw);
        let targetBlockId: string | null = null;
        let targetBlockTitle = 'Общие';
        let createdBlockId: string | undefined = undefined;

        if (!isGeneral) {
          const existingBlock = blocks.find(b => b.name.toLowerCase().trim() === blockNameRaw.toLowerCase());
          if (existingBlock) {
            targetBlockId = existingBlock.id;
            targetBlockTitle = existingBlock.name;
          } else {
            const newBlock = createBlock(blockNameRaw);
            targetBlockId = newBlock.id;
            targetBlockTitle = newBlock.name;
            createdBlockId = newBlock.id;
          }
        }

        const prevNotesState = matchedNotes.map(n => ({ id: n.id, blockId: n.blockId ?? null }));
        moveNotesToBlock(matchedNotes.map(n => n.id), targetBlockId);

        matchedNotes.forEach(mn => {
          const inBatch = newlyCreatedNotesRef.current.find(n => n.id === mn.id);
          if (inBatch) {
            inBatch.blockId = targetBlockId;
          }
        });

        return {
          id: stepId,
          action: 'move_notes_to_block',
          title: targetBlockTitle,
          summary: targetBlockTitle ? `Перемещено в блок «${targetBlockTitle}»` : 'Заметка перемещена',
          status: 'completed',
          blockName: targetBlockTitle,
          undoPayload: {
            type: 'move_notes_to_block',
            notes: prevNotesState,
            createdBlockId,
          },
        };
      } else {
        return {
          id: stepId,
          action: 'move_notes_to_block',
          title: blockNameRaw || 'Блок',
          summary: 'Не удалось переместить',
          status: 'failed',
        };
      }
    }

    if (step.name === 'create_block') {
      const blockName = (step.arguments.block_name || step.arguments.name || step.arguments.title || '').trim() || 'Новый блок';
      const newBlock = createBlock(blockName);
      return {
        id: stepId,
        action: 'create_block',
        title: newBlock.name,
        summary: `Создан блок «${newBlock.name}»`,
        status: 'completed',
        blockName: newBlock.name,
        undoPayload: {
          type: 'create_block',
          blockId: newBlock.id,
        },
      };
    }

    if (step.name === 'rename_block') {
      const blockNameRaw = (step.arguments.block_name || step.arguments.current_name || step.arguments.name || '').trim();
      const blockIdRaw = step.arguments.block_id || step.arguments.blockId;
      const newName = (step.arguments.new_name || step.arguments.newName || step.arguments.title || '').trim();

      let targetBlock = blocks.find(b => (blockIdRaw && b.id === blockIdRaw) || (blockNameRaw && b.name.toLowerCase().trim() === blockNameRaw.toLowerCase()));
      if (!targetBlock && blockNameRaw) {
        targetBlock = blocks.find(b => b.name.toLowerCase().includes(blockNameRaw.toLowerCase()));
      }

      if (targetBlock && newName) {
        const prevName = targetBlock.name;
        updateBlock(targetBlock.id, newName);
        return {
          id: stepId,
          action: 'rename_block',
          title: newName,
          summary: 'Блок переименован',
          status: 'completed',
          blockName: newName,
          undoPayload: {
            type: 'rename_block',
            blockId: targetBlock.id,
            previousName: prevName,
          },
        };
      }
      return {
        id: stepId,
        action: 'rename_block',
        title: newName || 'Блок',
        summary: 'Блок не найден',
        status: 'failed',
      };
    }

    if (step.name === 'delete_block') {
      const blockNameRaw = (step.arguments.block_name || step.arguments.name || '').trim();
      const blockIdRaw = step.arguments.block_id || step.arguments.blockId;
      let targetBlock = blocks.find(b => (blockIdRaw && b.id === blockIdRaw) || (blockNameRaw && b.name.toLowerCase().trim() === blockNameRaw.toLowerCase()));
      if (!targetBlock && blockNameRaw) {
        targetBlock = blocks.find(b => b.name.toLowerCase().includes(blockNameRaw.toLowerCase()));
      }

      if (targetBlock) {
        const blockCopy = { ...targetBlock };
        const notesInBlock = notes.filter(n => n.blockId === targetBlock.id).map(n => ({ id: n.id, blockId: n.blockId ?? null }));
        deleteBlock(targetBlock.id);
        return {
          id: stepId,
          action: 'delete_block',
          title: blockCopy.name,
          summary: 'Блок удален',
          status: 'completed',
          blockName: blockCopy.name,
          undoPayload: {
            type: 'delete_block',
            block: blockCopy,
            notesState: notesInBlock,
          },
        };
      }
      return {
        id: stepId,
        action: 'delete_block',
        title: blockNameRaw || 'Блок',
        summary: 'Блок не найден',
        status: 'failed',
      };
    }

    if (step.name === 'rename_task_list') {
      const listIdArg = step.arguments.task_list_id || step.arguments.taskListId;
      const listTitleArg = step.arguments.task_list_title || step.arguments.taskListTitle || step.arguments.current_title || step.arguments.title;
      const newTitle = (step.arguments.new_title || step.arguments.newTitle || '').trim() || 'Новый список задач';
      const targetList = resolveTaskList(listIdArg, listTitleArg);

      if (targetList) {
        const prevTitle = targetList.title;
        saveTaskList({
          id: targetList.id,
          title: newTitle,
          items: targetList.items,
        });
        setActiveTaskId(targetList.id);
        setViewMode('tasks');
        return {
          id: stepId,
          action: 'rename_task_list',
          title: newTitle,
          summary: 'Список задач переименован',
          status: 'completed',
          taskListId: targetList.id,
          undoPayload: {
            type: 'rename_task_list',
            taskListId: targetList.id,
            previousTitle: prevTitle,
          },
        };
      }
      return {
        id: stepId,
        action: 'rename_task_list',
        title: newTitle,
        summary: 'Список задач не найден',
        status: 'failed',
      };
    }

    if (step.name === 'delete_task_list') {
      const listIdArg = step.arguments.task_list_id || step.arguments.taskListId;
      const listTitleArg = step.arguments.task_list_title || step.arguments.taskListTitle || step.arguments.title;
      const targetList = resolveTaskList(listIdArg, listTitleArg);

      if (targetList) {
        const listCopy = JSON.parse(JSON.stringify(targetList));
        deleteTaskList(targetList.id);
        return {
          id: stepId,
          action: 'delete_task_list',
          title: listCopy.title,
          summary: 'Удален список задач',
          status: 'completed',
          taskListId: listCopy.id,
          undoPayload: {
            type: 'delete_task_list',
            taskLists: [listCopy],
          },
        };
      }
      return {
        id: stepId,
        action: 'delete_task_list',
        title: listTitleArg || 'Список задач',
        summary: 'Список задач не найден',
        status: 'failed',
      };
    }

    if (step.name === 'delete_note') {
      const noteIdsArg: string[] = Array.isArray(step.arguments.note_ids)
        ? step.arguments.note_ids
        : (typeof step.arguments.note_ids === 'string' ? [step.arguments.note_ids] : (step.arguments.note_id ? [step.arguments.note_id] : []));
      const noteQueries: string[] = Array.isArray(step.arguments.note_titles)
        ? step.arguments.note_titles
        : (typeof step.arguments.note_titles === 'string' ? [step.arguments.note_titles] : (step.arguments.title ? [step.arguments.title] : []));
      const matchedNotes = resolveNotes(noteIdsArg, noteQueries);

      if (matchedNotes.length > 0) {
        const notesCopies = matchedNotes.map(n => JSON.parse(JSON.stringify(n)));
        for (const n of matchedNotes) {
          deleteNote(n.id);
        }
        const titlesStr = matchedNotes.map(n => `«${n.title || 'Без названия'}»`).join(', ');
        return {
          id: stepId,
          action: 'delete_note',
          title: matchedNotes[0]?.title || 'Заметка',
          summary: 'Удалена заметка',
          status: 'completed',
          undoPayload: {
            type: 'delete_note',
            notes: notesCopies,
          },
        };
      }
      return {
        id: stepId,
        action: 'delete_note',
        title: 'Заметка',
        summary: 'Заметка не найдена',
        status: 'failed',
      };
    }

    if (step.name === 'format_note') {
      const noteIdArg = step.arguments.note_id || step.arguments.noteId;
      const titleArg = step.arguments.note_title || step.arguments.title;
      const matchedNotes = resolveNotes(noteIdArg ? [noteIdArg] : undefined, titleArg ? [titleArg] : undefined);
      let targetNote: Note | undefined = matchedNotes[0];

      if (!targetNote && attachedNotes.length > 0) {
        targetNote = notes.find(n => n.id === attachedNotes[0].id) || attachedNotes[0];
      }
      if (!targetNote && activeNoteId && viewMode === 'editor') {
        targetNote = notes.find(n => n.id === activeNoteId);
      }

      if (targetNote) {
        const prevTitle = targetNote.title;
        const prevContent = targetNote.content;
        let newContent = targetNote.content;

        const COLOR_MAP: Record<string, string> = {
          'mustard': '#9E862B',
          'горчичный': '#9E862B',
          'dusty-red': '#8C4343',
          'красный': '#8C4343',
          'пыльно-красный': '#8C4343',
          'red': '#8C4343',
          'slate-blue': '#3B6584',
          'синий': '#3B6584',
          'серо-синий': '#3B6584',
          'blue': '#3B6584',
          'forest-green': '#3D7043',
          'зеленый': '#3D7043',
          'зелёный': '#3D7043',
          'лесной': '#3D7043',
          'green': '#3D7043',
          'slate-grey': '#6B6B6B',
          'серый': '#6B6B6B',
          'сланцовый': '#6B6B6B',
          'grey': '#6B6B6B',
          'gray': '#6B6B6B',
          'deep-purple': '#60316E',
          'фиолетовый': '#60316E',
          'purple': '#60316E',
          'bronze': '#8C6023',
          'бронзовый': '#8C6023',
          'burgundy': '#7A2838',
          'бордовый': '#7A2838',
          'yellow': '#EAB308',
          'желтый': '#EAB308',
          'жёлтый': '#EAB308',
          'pink': '#EC4899',
          'розовый': '#EC4899',
          'teal': '#14B8A6',
          'бирюзовый': '#14B8A6',
          'orange': '#F97316',
          'оранжевый': '#F97316',
        };

        const resolveColorHex = (raw?: string): string => {
          if (!raw) return '#9E862B';
          const clean = raw.trim().toLowerCase();
          if (clean.startsWith('#')) return raw.trim();
          return COLOR_MAP[clean] || '#9E862B';
        };

        const applyStylesToFragment = (
          txt: string,
          stylesList: string[],
          opts: {
            color?: string;
            headingLevel?: number;
            align?: string;
          }
        ): string => {
          let res = txt;
          const normalized = stylesList.map(s => s.toLowerCase().trim());

          // 1. Code inline
          if (normalized.includes('code')) {
            res = `<code style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.875em; background: rgba(125, 125, 125, 0.15); padding: 0.15em 0.35em; border-radius: 4px;">${res}</code>`;
          }

          // 2. Highlight
          if (normalized.includes('highlight') || opts.color) {
            const hlColor = resolveColorHex(opts.color);
            res = `<span style="background-color: ${hlColor}; color: #ffffff; padding: 2px 6px; border-radius: 4px;" data-highlight="true">${res}</span>`;
          }

          // 3. Basic decorations
          if (normalized.includes('bold')) {
            res = `<b>${res}</b>`;
          }
          if (normalized.includes('italic')) {
            res = `<i>${res}</i>`;
          }
          if (normalized.includes('underline')) {
            res = `<u>${res}</u>`;
          }
          if (normalized.includes('strikethrough')) {
            res = `<s>${res}</s>`;
          }

          // 4. Block wrappers
          if (normalized.includes('heading')) {
            const lvl = Math.min(3, Math.max(1, Number(opts.headingLevel || 1)));
            res = `<h${lvl}>${res}</h${lvl}>`;
          }
          if (normalized.includes('quote')) {
            res = `<blockquote>${res}</blockquote>`;
          }
          if (normalized.includes('code_block')) {
            res = `<pre style="background: rgba(125, 125, 125, 0.12); border-radius: 8px; padding: 10px 14px; margin: 0.75rem 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.875rem; line-height: 1.5; overflow-x: auto; white-space: pre-wrap; border: 1px solid rgba(125, 125, 125, 0.2);"><code>${res}</code></pre>`;
          }
          if (normalized.includes('align') || (opts.align && ['left', 'center', 'right', 'justify'].includes(opts.align.toLowerCase()))) {
            const alignVal = (opts.align || 'center').toLowerCase();
            res = `<p style="text-align: ${alignVal};">${res}</p>`;
          }

          return res;
        };

        // Extract multiple styles
        const rawStylesArg = step.arguments.styles || step.arguments.style;
        let activeStyles: string[] = [];
        if (Array.isArray(rawStylesArg)) {
          activeStyles = rawStylesArg.map(String);
        } else if (typeof rawStylesArg === 'string') {
          activeStyles = [rawStylesArg];
        }

        if (step.arguments.format_type || step.arguments.formatType) {
          const singleType = String(step.arguments.format_type || step.arguments.formatType);
          if (!activeStyles.includes(singleType)) {
            activeStyles.push(singleType);
          }
        }

        if (activeStyles.length === 0) {
          activeStyles = ['bold'];
        }

        const targetText = (step.arguments.target_text || step.arguments.targetText || '').trim();
        const headingLevel = Number(step.arguments.heading_level || step.arguments.headingLevel || 1);
        const align = (step.arguments.align || 'center').toLowerCase();
        const rawColor = step.arguments.color || step.arguments.highlightColor;

        if (step.arguments.formatted_content) {
          newContent = convertTextOrMarkdownToNoteHtml(step.arguments.formatted_content);
        } else if (Array.isArray(step.arguments.operations) && step.arguments.operations.length > 0) {
          // Multi-operation batch formatting
          for (const op of step.arguments.operations) {
            const opTarget = (op.target_text || op.targetText || '').trim();
            if (!opTarget) continue;
            const opStyles = Array.isArray(op.styles) ? op.styles : (op.format_type ? [op.format_type] : activeStyles);
            const formattedFrag = applyStylesToFragment(opTarget, opStyles, {
              color: op.color || rawColor,
              headingLevel: op.heading_level || op.headingLevel || headingLevel,
              align: op.align || align,
            });
            if (newContent.includes(opTarget)) {
              newContent = newContent.replace(opTarget, formattedFrag);
            }
          }
        } else if (targetText) {
          const formattedFrag = applyStylesToFragment(targetText, activeStyles, {
            color: rawColor,
            headingLevel,
            align,
          });
          if (newContent.includes(targetText)) {
            newContent = newContent.replace(targetText, formattedFrag);
          } else {
            newContent = `${newContent}<p>${formattedFrag}</p>`;
          }
        } else {
          // Multi-format whole note content
          newContent = applyStylesToFragment(newContent, activeStyles, {
            color: rawColor,
            headingLevel,
            align,
          });
        }

        updateNote(targetNote.id, { content: newContent });
        setActiveNoteId(targetNote.id);
        setViewMode('editor');

        const stylesDescription = activeStyles
          .map(s => {
            if (s === 'bold') return 'жирный';
            if (s === 'italic') return 'курсив';
            if (s === 'underline') return 'подчеркивание';
            if (s === 'strikethrough') return 'зачеркивание';
            if (s === 'heading') return `заголовок H${headingLevel}`;
            if (s === 'quote') return 'цитата';
            if (s === 'code') return 'код';
            if (s === 'code_block') return 'блок кода';
            if (s === 'align') return `выравнивание (${align})`;
            if (s === 'highlight') return `маркер (${rawColor || '#9E862B'})`;
            return s;
          })
          .join(' + ');

        return {
          id: stepId,
          action: 'format_note',
          title: targetNote.title,
          summary: 'Заметка оформлена',
          status: 'completed',
          noteId: targetNote.id,
          undoPayload: {
            type: 'format_note',
            noteId: targetNote.id,
            previousContent: prevContent,
            previousTitle: prevTitle,
          },
        };
      }

      return {
        id: stepId,
        action: 'format_note',
        title: titleArg || 'Заметка',
        summary: 'Заметка не найдена',
        status: 'failed',
      };
    }

    if (step.name === 'create_tag') {
      const name = (step.arguments.name || step.arguments.tag_name || step.arguments.tagName || '').trim().replace(/^#/g, '');
      const rawColor = step.arguments.color || step.arguments.tag_color || step.arguments.hex || theme.accent;
      
      const COLOR_MAP: Record<string, string> = {
        'mustard': '#9E862B',
        'горчичный': '#9E862B',
        'dusty-red': '#8C4343',
        'красный': '#8C4343',
        'red': '#EF4444',
        'slate-blue': '#3B6584',
        'синий': '#3B82F6',
        'blue': '#3B82F6',
        'forest-green': '#3D7043',
        'зеленый': '#10B981',
        'зелёный': '#10B981',
        'green': '#10B981',
        'slate-grey': '#6B6B6B',
        'серый': '#6B6B6B',
        'grey': '#6B6B6B',
        'gray': '#6B6B6B',
        'deep-purple': '#60316E',
        'фиолетовый': '#8B5CF6',
        'purple': '#8B5CF6',
        'bronze': '#8C6023',
        'бронзовый': '#8C6023',
        'burgundy': '#7A2838',
        'бордовый': '#7A2838',
        'yellow': '#EAB308',
        'желтый': '#EAB308',
        'жёлтый': '#EAB308',
        'pink': '#EC4899',
        'розовый': '#EC4899',
        'teal': '#14B8A6',
        'бирюзовый': '#14B8A6',
        'orange': '#F97316',
        'оранжевый': '#F97316',
      };

      const resolveColorHex = (raw?: string): string => {
        if (!raw) return '#10B981';
        const clean = raw.trim().toLowerCase();
        if (clean.startsWith('#')) return raw.trim();
        return COLOR_MAP[clean] || '#10B981';
      };

      const color = resolveColorHex(rawColor);

      if (name) {
        const existing = tags.find(t => t.name.toLowerCase() === name.toLowerCase());
        const tagObj = createTag(name, color);
        return {
          id: stepId,
          action: 'create_tag',
          title: name,
          summary: 'Создан тег',
          status: 'completed',
          tagName: name,
          tagColor: color,
          undoPayload: {
            type: 'create_tag',
            tagId: tagObj.id,
            tagName: tagObj.name,
          },
        };
      }
      return {
        id: stepId,
        action: 'create_tag',
        title: 'Тег',
        summary: 'Ошибка создания тега',
        status: 'failed',
      };
    }

    if (step.name === 'delete_tag') {
      const tagNames: string[] = Array.isArray(step.arguments.tag_names)
        ? step.arguments.tag_names
        : (step.arguments.tag_name ? [step.arguments.tag_name] : (step.arguments.name ? [step.arguments.name] : []));

      if (tagNames.length > 0) {
        const deletedSummaries: string[] = [];
        let lastDeletedTag: Tag | undefined;
        const notesWithTag: string[] = [];
        const taskListsWithTag: string[] = [];

        for (const rawName of tagNames) {
          const cleanName = rawName.trim().replace(/^#/g, '');
          const existing = tags.find(t => t.name.toLowerCase() === cleanName.toLowerCase());
          if (existing) {
            lastDeletedTag = { ...existing };
            notes.forEach(n => {
              if (n.tags && n.tags.some(t => t.toLowerCase() === cleanName.toLowerCase())) {
                notesWithTag.push(n.id);
              }
            });
            taskLists.forEach(tl => {
              if (tl.tags && tl.tags.some(t => t.toLowerCase() === cleanName.toLowerCase())) {
                taskListsWithTag.push(tl.id);
              }
            });
            deleteTagByName(existing.name);
            deletedSummaries.push(`«#${existing.name}»`);
          }
        }

        if (deletedSummaries.length > 0) {
          return {
            id: stepId,
            action: 'delete_tag',
            title: deletedSummaries[0],
            summary: 'Тег удален',
            status: 'completed',
            undoPayload: lastDeletedTag
              ? {
                  type: 'delete_tag',
                  tag: lastDeletedTag,
                  notesWithTag: Array.from(new Set(notesWithTag)),
                  taskListsWithTag: Array.from(new Set(taskListsWithTag)),
                }
              : undefined,
          };
        }
      }

      return {
        id: stepId,
        action: 'delete_tag',
        title: 'Тег',
        summary: 'Тег не найден',
        status: 'failed',
      };
    }

    if (step.name === 'attach_tags') {
      const rawTags: string[] = Array.isArray(step.arguments.tags)
        ? step.arguments.tags
        : (step.arguments.tag ? [step.arguments.tag] : (step.arguments.name ? [step.arguments.name] : []));
      const tagColors: Record<string, string> = step.arguments.tag_colors || {};
      const noteIdsArg: string[] = Array.isArray(step.arguments.note_ids)
        ? step.arguments.note_ids
        : (step.arguments.note_id ? [step.arguments.note_id] : []);
      const noteQueries: string[] = Array.isArray(step.arguments.note_titles)
        ? step.arguments.note_titles
        : (step.arguments.note_title ? [step.arguments.note_title] : (step.arguments.title ? [step.arguments.title] : []));
      const taskListIdsArg: string[] = Array.isArray(step.arguments.task_list_ids)
        ? step.arguments.task_list_ids
        : (step.arguments.task_list_id ? [step.arguments.task_list_id] : []);
      const taskListQueries: string[] = Array.isArray(step.arguments.task_list_titles)
        ? step.arguments.task_list_titles
        : (step.arguments.task_list_title ? [step.arguments.task_list_title] : []);

      const cleanTags = rawTags.map(t => t.trim().replace(/^#/g, '')).filter(Boolean);
      if (cleanTags.length === 0) {
        return {
          id: stepId,
          action: 'attach_tags',
          title: 'Теги',
          summary: 'Не указаны теги для прикрепления',
          status: 'failed',
        };
      }

      const COLOR_PALETTE = ['#EF4444', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#9E862B'];
      const createdTagIds: string[] = [];

      for (let i = 0; i < cleanTags.length; i++) {
        const tagName = cleanTags[i];
        const existing = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
        if (!existing) {
          const assignedColor = tagColors[tagName] || COLOR_PALETTE[i % COLOR_PALETTE.length];
          const created = createTag(tagName, assignedColor);
          createdTagIds.push(created.id);
        }
      }

      let targetNotes = resolveNotes(noteIdsArg, noteQueries);
      let targetTaskLists = resolveTaskLists(taskListIdsArg, taskListQueries);

      if (targetNotes.length === 0 && targetTaskLists.length === 0) {
        if (viewMode === 'editor' && activeNoteId) {
          const curr = notes.find(n => n.id === activeNoteId);
          if (curr) targetNotes = [curr];
        } else if (viewMode === 'tasks' && activeTaskId) {
          const curr = taskLists.find(t => t.id === activeTaskId);
          if (curr) targetTaskLists = [curr];
        } else if (attachedNotes.length > 0) {
          targetNotes = attachedNotes;
        }
      }

      const notesPrevTags = targetNotes.map(n => ({ id: n.id, tags: [...(n.tags || [])] }));
      const taskListsPrevTags = targetTaskLists.map(t => ({ id: t.id, tags: [...(t.tags || [])] }));

      for (const note of targetNotes) {
        const current = note.tags || [];
        const merged = Array.from(new Set([...current, ...cleanTags]));
        updateNote(note.id, { tags: merged });
      }

      for (const list of targetTaskLists) {
        const current = list.tags || [];
        const merged = Array.from(new Set([...current, ...cleanTags]));
        saveTaskList({
          id: list.id,
          title: list.title,
          items: list.items,
          tags: merged,
        });
      }

      const targetsCount = targetNotes.length + targetTaskLists.length;
      if (targetsCount > 0) {
        return {
          id: stepId,
          action: 'attach_tags',
          title: cleanTags[0],
          summary: 'Тег прикреплен',
          status: 'completed',
          undoPayload: {
            type: 'attach_tags',
            notesPrevTags,
            taskListsPrevTags,
            createdTagIds,
          },
        };
      }

      return {
        id: stepId,
        action: 'attach_tags',
        title: 'Теги',
        summary: 'Элемент не найден',
        status: 'failed',
      };
    }

    if (step.name === 'detach_tags') {
      const rawTags: string[] = Array.isArray(step.arguments.tags)
        ? step.arguments.tags
        : (step.arguments.tag ? [step.arguments.tag] : (step.arguments.name ? [step.arguments.name] : []));
      const noteIdsArg: string[] = Array.isArray(step.arguments.note_ids)
        ? step.arguments.note_ids
        : (step.arguments.note_id ? [step.arguments.note_id] : []);
      const noteQueries: string[] = Array.isArray(step.arguments.note_titles)
        ? step.arguments.note_titles
        : (step.arguments.note_title ? [step.arguments.note_title] : (step.arguments.title ? [step.arguments.title] : []));
      const taskListIdsArg: string[] = Array.isArray(step.arguments.task_list_ids)
        ? step.arguments.task_list_ids
        : (step.arguments.task_list_id ? [step.arguments.task_list_id] : []);
      const taskListQueries: string[] = Array.isArray(step.arguments.task_list_titles)
        ? step.arguments.task_list_titles
        : (step.arguments.task_list_title ? [step.arguments.task_list_title] : []);

      const cleanTags = rawTags.map(t => t.trim().replace(/^#/g, '').toLowerCase()).filter(Boolean);
      if (cleanTags.length === 0) {
        return {
          id: stepId,
          action: 'detach_tags',
          title: 'Теги',
          summary: 'Не указаны теги для снятия',
          status: 'failed',
        };
      }

      let targetNotes = resolveNotes(noteIdsArg, noteQueries);
      let targetTaskLists = resolveTaskLists(taskListIdsArg, taskListQueries);

      if (targetNotes.length === 0 && targetTaskLists.length === 0) {
        if (viewMode === 'editor' && activeNoteId) {
          const curr = notes.find(n => n.id === activeNoteId);
          if (curr) targetNotes = [curr];
        } else if (viewMode === 'tasks' && activeTaskId) {
          const curr = taskLists.find(t => t.id === activeTaskId);
          if (curr) targetTaskLists = [curr];
        } else if (attachedNotes.length > 0) {
          targetNotes = attachedNotes;
        }
      }

      const notesPrevTags = targetNotes.map(n => ({ id: n.id, tags: [...(n.tags || [])] }));
      const taskListsPrevTags = targetTaskLists.map(t => ({ id: t.id, tags: [...(t.tags || [])] }));

      for (const note of targetNotes) {
        const filtered = (note.tags || []).filter(t => !cleanTags.includes(t.toLowerCase()));
        updateNote(note.id, { tags: filtered });
      }

      for (const list of targetTaskLists) {
        const filtered = (list.tags || []).filter(t => !cleanTags.includes(t.toLowerCase()));
        saveTaskList({
          id: list.id,
          title: list.title,
          items: list.items,
          tags: filtered,
        });
      }

      const targetsCount = targetNotes.length + targetTaskLists.length;
      if (targetsCount > 0) {
        return {
          id: stepId,
          action: 'detach_tags',
          title: rawTags[0],
          summary: 'Тег снят',
          status: 'completed',
          undoPayload: {
            type: 'detach_tags',
            notesPrevTags,
            taskListsPrevTags,
          },
        };
      }

      return {
        id: stepId,
        action: 'detach_tags',
        title: 'Теги',
        summary: 'Элемент не найден',
        status: 'failed',
      };
    }

    if (step.name === 'pin_notes' || step.name === 'unpin_notes') {
      const noteIdsArg: string[] = Array.isArray(step.arguments.note_ids)
        ? step.arguments.note_ids
        : (typeof step.arguments.note_ids === 'string' ? [step.arguments.note_ids] : []);
      const noteQueries: string[] = Array.isArray(step.arguments.note_titles)
        ? step.arguments.note_titles
        : (typeof step.arguments.note_titles === 'string' ? [step.arguments.note_titles] : (step.arguments.title ? [step.arguments.title] : []));
      const isPin = step.name === 'pin_notes' && step.arguments.pinned !== false;

      const matchedNotes = resolveNotes(noteIdsArg, noteQueries);

      if (matchedNotes.length > 0) {
        const prevNotesState = matchedNotes.map(n => ({ id: n.id, pinned: Boolean(n.pinned) }));
        for (const n of matchedNotes) {
          if (Boolean(n.pinned) !== isPin) {
            togglePinNote(n.id);
          }
        }

        return {
          id: stepId,
          action: isPin ? 'pin_notes' : 'unpin_notes',
          title: matchedNotes[0]?.title,
          summary: isPin ? 'Заметка закреплена' : 'Заметка откреплена',
          status: 'completed',
          pinned: isPin,
          undoPayload: {
            type: isPin ? 'pin_notes' : 'unpin_notes',
            notes: prevNotesState,
          },
        };
      } else {
        return {
          id: stepId,
          action: isPin ? 'pin_notes' : 'unpin_notes',
          title: 'Заметка',
          summary: 'Заметка не найдена',
          status: 'failed',
        };
      }
    }

    if (step.name === 'create_calendar_event') {
      const title = (step.arguments.title || step.arguments.name || 'Новое событие').trim();
      const date = (step.arguments.date || new Date().toISOString().split('T')[0]).trim();
      const isAllDay = step.arguments.isAllDay !== false;
      const startTime = step.arguments.startTime || (isAllDay ? undefined : '12:00');
      const endTime = step.arguments.endTime || undefined;
      const remindOnDay = step.arguments.remindOnDay !== false;
      const description = step.arguments.description || '';
      const rawEvents = Array.isArray(step.arguments.events) ? step.arguments.events : [];

      if (rawEvents.length > 0) {
        const createdIds: string[] = [];
        for (const ev of rawEvents) {
          const evTitle = (ev.title || 'Событие').trim();
          const evDate = (ev.date || date).trim();
          const evAllDay = ev.isAllDay !== false;
          const newEv = createCalendarEvent({
            title: evTitle,
            date: evDate,
            isAllDay: evAllDay,
            startTime: ev.startTime || (evAllDay ? undefined : '12:00'),
            endTime: ev.endTime || undefined,
            remindOnDay: ev.remindOnDay !== false,
            description: ev.description || '',
          });
          createdIds.push(newEv.id);
        }

        return {
          id: stepId,
          action: 'create_calendar_event',
          title: rawEvents[0]?.title || 'События календаря',
          summary: 'Создано событие',
          status: 'completed',
          undoPayload: {
            type: 'create_calendar_event',
            eventId: createdIds[0],
          },
        };
      }

      const newEv = createCalendarEvent({
        title,
        date,
        isAllDay,
        startTime,
        endTime,
        remindOnDay,
        description,
      });

      return {
        id: stepId,
        action: 'create_calendar_event',
        title: newEv.title,
        summary: 'Создано событие',
        status: 'completed',
        undoPayload: {
          type: 'create_calendar_event',
          eventId: newEv.id,
        },
      };
    }

    if (step.name === 'update_calendar_event') {
      const eventId = step.arguments.event_id;
      const eventTitle = (step.arguments.event_title || '').trim().toLowerCase();
      const dateFilter = (step.arguments.date_filter || '').trim();

      const targetEvent = events.find(ev => {
        if (eventId && ev.id === eventId) return true;
        if (eventTitle && (ev.title || '').toLowerCase().includes(eventTitle)) {
          if (dateFilter) return ev.date === dateFilter;
          return true;
        }
        return false;
      });

      if (targetEvent) {
        const previousEvent: CalendarEvent = { ...targetEvent };
        const updates: Partial<CalendarEvent> = {};
        if (step.arguments.new_title) updates.title = step.arguments.new_title.trim();
        if (step.arguments.new_date) updates.date = step.arguments.new_date.trim();
        if (step.arguments.isAllDay !== undefined) updates.isAllDay = step.arguments.isAllDay;
        if (step.arguments.startTime !== undefined) updates.startTime = step.arguments.startTime;
        if (step.arguments.endTime !== undefined) updates.endTime = step.arguments.endTime;
        if (step.arguments.remindOnDay !== undefined) updates.remindOnDay = step.arguments.remindOnDay;
        if (step.arguments.description !== undefined) updates.description = step.arguments.description;

        updateCalendarEvent(targetEvent.id, updates);

        return {
          id: stepId,
          action: 'update_calendar_event',
          title: updates.title || targetEvent.title,
          summary: 'Событие обновлено',
          status: 'completed',
          undoPayload: {
            type: 'update_calendar_event',
            eventId: targetEvent.id,
            previousEvent,
          },
        };
      } else {
        return {
          id: stepId,
          action: 'update_calendar_event',
          title: 'Календарь',
          summary: 'Событие не найдено',
          status: 'failed',
        };
      }
    }

    if (step.name === 'delete_calendar_event') {
      const eventIds: string[] = Array.isArray(step.arguments.event_ids) ? step.arguments.event_ids : (step.arguments.event_id ? [step.arguments.event_id] : []);
      const eventTitles: string[] = Array.isArray(step.arguments.event_titles) ? step.arguments.event_titles : (step.arguments.event_title ? [step.arguments.event_title] : []);
      const dateFilter = (step.arguments.date || '').trim();

      const matched = events.filter(ev => {
        if (eventIds.includes(ev.id)) return true;
        if (eventTitles.some(t => (ev.title || '').toLowerCase().includes(t.toLowerCase()))) {
          if (dateFilter) return ev.date === dateFilter;
          return true;
        }
        return false;
      });

      if (matched.length > 0) {
        for (const ev of matched) {
          deleteCalendarEvent(ev.id);
        }

        return {
          id: stepId,
          action: 'delete_calendar_event',
          title: matched[0]?.title,
          summary: 'Событие удалено',
          status: 'completed',
          undoPayload: {
            type: 'delete_calendar_event',
            events: matched,
          },
        };
      } else {
        return {
          id: stepId,
          action: 'delete_calendar_event',
          title: 'Календарь',
          summary: 'Событие не найдено',
          status: 'failed',
        };
      }
    }

    if (step.name === 'update_settings') {
      const args = step.arguments || {};
      const appliedChanges: string[] = [];
      const undoPayload: any = {
        type: 'update_settings',
        previousTheme: theme,
        previousLanguage: language,
        previousLaunchScreen: launchScreen,
        previousQuickSettings: { ...quickSettings },
      };

      // 1. Theme update
      if (args.theme && typeof args.theme === 'string') {
        const themeQuery = args.theme.trim().toLowerCase();
        let targetTheme = ALL_THEMES.find(t => t.id.toLowerCase() === themeQuery || t.name.toLowerCase() === themeQuery);
        if (!targetTheme) {
          // Fuzzy match or common aliases
          if (themeQuery.includes('бордо') || themeQuery === 'bordeaux') targetTheme = ALL_THEMES.find(t => t.id === 'bordeaux');
          else if (themeQuery.includes('марсал') || themeQuery === 'marsala') targetTheme = ALL_THEMES.find(t => t.id === 'marsala');
          else if (themeQuery.includes('бренди') || themeQuery === 'brandy') targetTheme = ALL_THEMES.find(t => t.id === 'brandy');
          else if (themeQuery.includes('йело') || themeQuery === 'con_yelo') targetTheme = ALL_THEMES.find(t => t.id === 'con_yelo');
          else if (themeQuery.includes('сургуч') || themeQuery === 'sealing_wax') targetTheme = ALL_THEMES.find(t => t.id === 'sealing_wax');
          else if (themeQuery.includes('ночное письмо') || themeQuery === 'night_letter') targetTheme = ALL_THEMES.find(t => t.id === 'night_letter');
          else if (themeQuery.includes('кварц') || themeQuery === 'rose_quartz') targetTheme = ALL_THEMES.find(t => t.id === 'rose_quartz');
          else if (themeQuery.includes('роза во тьме') || themeQuery === 'rose_in_dark') targetTheme = ALL_THEMES.find(t => t.id === 'rose_in_dark');
          else if (themeQuery.includes('сосульк') || themeQuery === 'thawed_icicle' || themeQuery.includes('светл') || themeQuery === 'light') targetTheme = ALL_THEMES.find(t => t.id === 'thawed_icicle');
          else if (themeQuery.includes('сено') || themeQuery === 'hay_under_snow' || themeQuery.includes('темн') || themeQuery.includes('тёмн') || themeQuery === 'dark') targetTheme = ALL_THEMES.find(t => t.id === 'hay_under_snow');
          else if (themeQuery.includes('подснежник') || themeQuery === 'snowdrop') targetTheme = ALL_THEMES.find(t => t.id === 'snowdrop');
          else if (themeQuery.includes('саксофон') || themeQuery === 'saxophone') targetTheme = ALL_THEMES.find(t => t.id === 'saxophone');
          else if (themeQuery.includes('флейт') || themeQuery === 'flute') targetTheme = ALL_THEMES.find(t => t.id === 'flute');
          else if (themeQuery.includes('ночь из окна') || themeQuery === 'night_window') targetTheme = ALL_THEMES.find(t => t.id === 'night_window');
          else if (themeQuery.includes('мельниц') || themeQuery === 'windmill') targetTheme = ALL_THEMES.find(t => t.id === 'windmill');
          else if (themeQuery.includes('кров') || themeQuery === 'drying_blood') targetTheme = ALL_THEMES.find(t => t.id === 'drying_blood');
          else if (themeQuery.includes('шалфей') || themeQuery === 'dried_sage') targetTheme = ALL_THEMES.find(t => t.id === 'dried_sage');
          else if (themeQuery.includes('гладь') || themeQuery === 'smooth_surface') targetTheme = ALL_THEMES.find(t => t.id === 'smooth_surface');
          else if (themeQuery.includes('мох') || themeQuery === 'moss_on_stone') targetTheme = ALL_THEMES.find(t => t.id === 'moss_on_stone');
          else if (themeQuery.includes('графит') || themeQuery === 'graphite') targetTheme = ALL_THEMES.find(t => t.id === 'graphite');
          else if (themeQuery.includes('тон в тон') || themeQuery === 'tone_in_tone') targetTheme = ALL_THEMES.find(t => t.id === 'tone_in_tone');
          else {
            targetTheme = ALL_THEMES.find(t => t.name.toLowerCase().includes(themeQuery) || t.id.toLowerCase().includes(themeQuery));
          }
        }

        if (targetTheme) {
          setTheme(targetTheme);
          appliedChanges.push(`Тема: «${targetTheme.name}»`);
        }
      }

      // 2. Language update
      if (args.language && ['ru', 'en', 'es', 'it'].includes(args.language)) {
        setLanguage(args.language);
        const langNames: Record<string, string> = { ru: 'Русский', en: 'English', es: 'Español', it: 'Italiano' };
        appliedChanges.push(`Язык: ${langNames[args.language] || args.language}`);
      }

      // 3. Launch screen
      if (args.launch_screen && ['notes', 'editor', 'tasks', 'kanban', 'anacrusa'].includes(args.launch_screen)) {
        setLaunchScreen(args.launch_screen);
        appliedChanges.push(
          `Экран запуска: ${
            args.launch_screen === 'notes'
              ? 'Заметки'
              : args.launch_screen === 'editor'
              ? 'Редактор'
              : args.launch_screen === 'tasks'
              ? 'Задачи'
              : args.launch_screen === 'kanban'
              ? 'Канбан'
              : 'Anacrusa'
          }`
        );
      }

      // 4. QuickSettings parameters
      const qsUpdates: any = {};
      if (typeof args.font_size === 'number' && args.font_size >= 10 && args.font_size <= 32) {
        qsUpdates.fontSize = args.font_size;
        appliedChanges.push(`Размер шрифта: ${args.font_size}px`);
      }
      if (typeof args.line_height === 'number') {
        qsUpdates.lineHeight = args.line_height;
        appliedChanges.push(`Интервал: ${args.line_height}`);
      }
      if (typeof args.font_family === 'string') {
        qsUpdates.fontFamily = args.font_family;
        appliedChanges.push(`Шрифт: ${args.font_family}`);
      }
      if (typeof args.show_border === 'boolean') {
        qsUpdates.showBorder = args.show_border;
        appliedChanges.push(`Обводка плиток: ${args.show_border ? 'вкл' : 'выкл'}`);
      }
      if (typeof args.show_char_count === 'boolean') {
        qsUpdates.showCharCount = args.show_char_count;
        appliedChanges.push(`Счетчик символов: ${args.show_char_count ? 'вкл' : 'выкл'}`);
      }
      if (typeof args.show_word_count === 'boolean') {
        qsUpdates.showWordCount = args.show_word_count;
        appliedChanges.push(`Счетчик слов: ${args.show_word_count ? 'вкл' : 'выкл'}`);
      }
      if (typeof args.show_date === 'boolean') {
        qsUpdates.showDate = args.show_date;
        appliedChanges.push(`Дата в заметках: ${args.show_date ? 'вкл' : 'выкл'}`);
      }
      if (typeof args.pin_focus_mode_to_bottom_bar === 'boolean') {
        qsUpdates.pinFocusModeToBottomBar = args.pin_focus_mode_to_bottom_bar;
        appliedChanges.push(`Режим фокуса в панели: ${args.pin_focus_mode_to_bottom_bar ? 'закреплен' : 'откреплен'}`);
      }
      if (typeof args.bedtime_reminder_enabled === 'boolean') {
        qsUpdates.bedtimeReminderEnabled = args.bedtime_reminder_enabled;
        appliedChanges.push(`Напоминание ко сну: ${args.bedtime_reminder_enabled ? 'вкл' : 'выкл'}`);
      }
      if (typeof args.bedtime_reminder_time === 'string' && /^\d{1,2}:\d{2}$/.test(args.bedtime_reminder_time.trim())) {
        qsUpdates.bedtimeReminderTime = args.bedtime_reminder_time.trim();
        appliedChanges.push(`Время подготовки ко сну: ${args.bedtime_reminder_time.trim()}`);
      }
      if (typeof args.bedtime_reminder_title === 'string' && args.bedtime_reminder_title.trim()) {
        qsUpdates.bedtimeReminderTitle = args.bedtime_reminder_title.trim();
        appliedChanges.push(`Заголовок напоминания ко сну: «${args.bedtime_reminder_title.trim()}»`);
      }
      if (typeof args.bedtime_reminder_description === 'string') {
        qsUpdates.bedtimeReminderDescription = args.bedtime_reminder_description.trim();
        appliedChanges.push(`Описание напоминания ко сну: «${args.bedtime_reminder_description.trim()}»`);
      }
      if (typeof args.show_tile_metadata === 'boolean') {
        qsUpdates.showTileMetadata = args.show_tile_metadata;
        appliedChanges.push(`Метаданные: ${args.show_tile_metadata ? 'вкл' : 'выкл'}`);
      }
      if (args.tile_display_mode && ['both', 'title', 'content'].includes(args.tile_display_mode)) {
        qsUpdates.tileDisplayMode = args.tile_display_mode;
        appliedChanges.push(`Вид плиток: ${args.tile_display_mode}`);
      }
      if (typeof args.hide_tile_dots === 'boolean') {
        qsUpdates.hideTileDots = args.hide_tile_dots;
        appliedChanges.push(`Кнопка меню «...»: ${args.hide_tile_dots ? 'скрыта' : 'видима'}`);
      }
      if (typeof args.one_time_formatting === 'boolean') {
        qsUpdates.oneTimeFormatting = args.one_time_formatting;
        appliedChanges.push(`Однократное форматирование: ${args.one_time_formatting ? 'вкл' : 'выкл'}`);
      }
      if (typeof args.horizontal_main_menu === 'boolean') {
        qsUpdates.horizontalMainMenu = args.horizontal_main_menu;
        appliedChanges.push(`Горизонтальное меню: ${args.horizontal_main_menu ? 'вкл' : 'выкл'}`);
      }
      if (typeof args.pin_search_to_home_screen === 'boolean') {
        qsUpdates.pinSearchToHomeScreen = args.pin_search_to_home_screen;
        appliedChanges.push(`Поиск на главном экране: ${args.pin_search_to_home_screen ? 'закреплен' : 'откреплен'}`);
      }
      if (Array.isArray(args.sidebar_tabs)) {
        qsUpdates.sidebarTabs = args.sidebar_tabs;
        appliedChanges.push(`Вкладки панели: [${args.sidebar_tabs.join(', ')}]`);
      }
      if (args.action_menu_display_mode && ['tiles', 'rows'].includes(args.action_menu_display_mode)) {
        qsUpdates.actionMenuDisplayMode = args.action_menu_display_mode;
        appliedChanges.push(`Меню действий: ${args.action_menu_display_mode === 'tiles' ? 'плитки' : 'строки'}`);
      }
      if (Array.isArray(args.action_menu_items)) {
        qsUpdates.actionMenuItems = args.action_menu_items;
        appliedChanges.push(`Элементы меню действий обновлены`);
      }
      if (typeof args.left_panel_pos === 'string') {
        qsUpdates.leftPanelPos = args.left_panel_pos;
      }
      if (typeof args.right_panel_pos === 'string') {
        qsUpdates.rightPanelPos = args.right_panel_pos;
      }
      if (typeof args.bottom_panel_pos === 'string') {
        qsUpdates.bottomPanelPos = args.bottom_panel_pos;
      }

      if (Object.keys(qsUpdates).length > 0) {
        updateQuickSettings(qsUpdates);
      }

      const summaryText = 'Настройки обновлены';

      return {
        id: stepId,
        action: 'update_settings',
        title: 'Настройки приложения',
        summary: summaryText,
        status: 'completed',
        undoPayload,
      };
    }

    if (step.name === 'get_social_links' || step.name === 'get_community_links') {
      return {
        id: stepId,
        action: 'get_social_links' as any,
        title: 'Сообщества Veris Note',
        summary: 'Ссылки получены',
        status: 'completed',
      };
    }

    if (step.name === 'web_search') {
      return {
        id: stepId,
        action: 'web_search',
        title: 'Веб-поиск',
        summary: 'Поиск в сети',
        status: 'completed',
      };
    }

    return {
      id: stepId,
      action: step.name as AnacrusaActionType,
      title: 'Действие',
      summary: 'Действие выполнено',
      status: 'completed',
    };
  };

  const handleUndoMessageSteps = (messageId: string) => {
    if (!activeSession) return;
    const targetMsg = activeSession.messages.find(m => m.id === messageId);
    if (!targetMsg || !targetMsg.steps || targetMsg.steps.length === 0) return;

    // Rollback completed steps in reverse order
    const updatedSteps = [...targetMsg.steps];
    for (let i = updatedSteps.length - 1; i >= 0; i--) {
      const step = updatedSteps[i];
      if (step.status !== 'completed' || !step.undoPayload) continue;

      const p = step.undoPayload;
      if (p.type === 'create_note') {
        deleteNote(p.noteId);
      } else if (p.type === 'update_note') {
        updateNote(p.noteId, {
          title: p.previousTitle,
          content: p.previousContent,
        });
      } else if (p.type === 'rename_note') {
        updateNote(p.noteId, {
          title: p.previousTitle,
        });
      } else if (p.type === 'delete_note') {
        for (const n of p.notes) {
          restoreNote(n.id);
        }
      } else if (p.type === 'format_note') {
        updateNote(p.noteId, {
          title: p.previousTitle,
          content: p.previousContent,
        });
      } else if (p.type === 'create_task_list') {
        deleteTaskList(p.taskListId);
      } else if (p.type === 'update_task_list') {
        saveTaskList({
          id: p.taskListId,
          title: p.previousTitle || 'Список задач',
          items: p.previousItems || [],
        });
      } else if (p.type === 'rename_task_list') {
        const currentList = taskLists.find(t => t.id === p.taskListId);
        saveTaskList({
          id: p.taskListId,
          title: p.previousTitle || 'Список задач',
          items: currentList ? currentList.items : [],
        });
      } else if (p.type === 'delete_task_list') {
        for (const list of p.taskLists) {
          restoreTaskList(list.id);
        }
      } else if (p.type === 'move_notes_to_block') {
        for (const item of p.notes) {
          moveNotesToBlock([item.id], item.blockId);
        }
        if (p.createdBlockId) {
          deleteBlock(p.createdBlockId);
        }
      } else if (p.type === 'create_block') {
        deleteBlock(p.blockId);
      } else if (p.type === 'rename_block') {
        updateBlock(p.blockId, p.previousName);
      } else if (p.type === 'delete_block') {
        const restoredBlock = createBlock(p.block.name);
        if (restoredBlock && p.notesState) {
          moveNotesToBlock(p.notesState.map(n => n.id), restoredBlock.id);
        }
      } else if (p.type === 'pin_notes' || p.type === 'unpin_notes') {
        for (const item of p.notes) {
          const current = notes.find(n => n.id === item.id);
          if (current && Boolean(current.pinned) !== item.pinned) {
            togglePinNote(item.id);
          }
        }
      } else if (p.type === 'create_tag') {
        if (p.tagName) {
          deleteTagByName(p.tagName);
        }
      } else if (p.type === 'delete_tag') {
        if (p.tag) {
          createTag(p.tag.name, p.tag.color);
          if (p.notesWithTag && Array.isArray(p.notesWithTag)) {
            for (const nid of p.notesWithTag) {
              const currentNote = notes.find(n => n.id === nid);
              if (currentNote) {
                const merged = Array.from(new Set([...(currentNote.tags || []), p.tag.name]));
                updateNote(nid, { tags: merged });
              }
            }
          }
          if (p.taskListsWithTag && Array.isArray(p.taskListsWithTag)) {
            for (const tlid of p.taskListsWithTag) {
              const currentList = taskLists.find(t => t.id === tlid);
              if (currentList) {
                const merged = Array.from(new Set([...(currentList.tags || []), p.tag.name]));
                saveTaskList({
                  id: currentList.id,
                  title: currentList.title,
                  items: currentList.items,
                  tags: merged,
                });
              }
            }
          }
        }
      } else if (p.type === 'attach_tags') {
        if (p.notesPrevTags && Array.isArray(p.notesPrevTags)) {
          for (const item of p.notesPrevTags) {
            updateNote(item.id, { tags: item.tags });
          }
        }
        if (p.taskListsPrevTags && Array.isArray(p.taskListsPrevTags)) {
          for (const item of p.taskListsPrevTags) {
            const currentList = taskLists.find(t => t.id === item.id);
            if (currentList) {
              saveTaskList({
                id: currentList.id,
                title: currentList.title,
                items: currentList.items,
                tags: item.tags,
              });
            }
          }
        }
        if (p.createdTagIds && Array.isArray(p.createdTagIds)) {
          for (const tid of p.createdTagIds) {
            const tObj = tags.find(t => t.id === tid);
            if (tObj) deleteTagByName(tObj.name);
          }
        }
      } else if (p.type === 'detach_tags') {
        if (p.notesPrevTags && Array.isArray(p.notesPrevTags)) {
          for (const item of p.notesPrevTags) {
            updateNote(item.id, { tags: item.tags });
          }
        }
        if (p.taskListsPrevTags && Array.isArray(p.taskListsPrevTags)) {
          for (const item of p.taskListsPrevTags) {
            const currentList = taskLists.find(t => t.id === item.id);
            if (currentList) {
              saveTaskList({
                id: currentList.id,
                title: currentList.title,
                items: currentList.items,
                tags: item.tags,
              });
            }
          }
        }
      } else if (p.type === 'create_calendar_event') {
        deleteCalendarEvent(p.eventId);
      } else if (p.type === 'update_calendar_event') {
        if (p.previousEvent) {
          updateCalendarEvent(p.eventId, p.previousEvent);
        }
      } else if (p.type === 'delete_calendar_event') {
        if (p.events && Array.isArray(p.events)) {
          for (const ev of p.events) {
            restoreCalendarEvent(ev.id);
          }
        }
      } else if (p.type === 'update_settings') {
        if (p.previousTheme) {
          setTheme(p.previousTheme);
        }
        if (p.previousLanguage) {
          setLanguage(p.previousLanguage);
        }
        if (p.previousLaunchScreen) {
          setLaunchScreen(p.previousLaunchScreen);
        }
        if (p.previousQuickSettings) {
          updateQuickSettings(p.previousQuickSettings);
        }
      }

      updatedSteps[i] = {
        ...step,
        status: 'undone',
        summary: `[Отменено] ${step.summary.replace(/^\[Отменено\]\s*/, '')}`,
      };
    }

    const updatedMessages = activeSession.messages.map(m => {
      if (m.id === messageId) {
        return {
          ...m,
          steps: updatedSteps,
          noteAction: undefined, // clear single card once undone
        };
      }
      return m;
    });

    const finalSession: AnacrusaChatSession = {
      ...activeSession,
      updatedAt: Date.now(),
      messages: updatedMessages,
    };

    saveAnacrusaSession(finalSession);
  };

  const handleRedoResponse = (
    assistantMsgId: string,
    lengthMode: 'standard' | 'shorter' | 'longer' = 'standard'
  ) => {
    if (!activeSession || loading) return;
    setRedoMenuMsgId(null);

    const assistantIdx = activeSession.messages.findIndex(m => m.id === assistantMsgId);
    if (assistantIdx === -1) return;

    let userMsgIdx = assistantIdx - 1;
    while (userMsgIdx >= 0 && activeSession.messages[userMsgIdx].role !== 'user') {
      userMsgIdx--;
    }
    if (userMsgIdx === -1) return;

    const targetUserMsg = activeSession.messages[userMsgIdx];
    const baseHistory = activeSession.messages.slice(0, userMsgIdx);

    handleSendMessage(undefined, {
      targetUserMessage: targetUserMsg,
      baseHistory,
      lengthModifier: lengthMode,
    });
  };

  const handleSendMessage = async (
    customPrompt?: string,
    redoOptions?: {
      targetUserMessage: AnacrusaChatMessage;
      baseHistory: AnacrusaChatMessage[];
      lengthModifier?: 'standard' | 'shorter' | 'longer';
    }
  ) => {
    let rawText = redoOptions ? redoOptions.targetUserMessage.content : (customPrompt ?? inputQuery).trim();
    if (!rawText || loading) return;

    // Detect if prompt has slash command like /поиск or /search, and support multiple slash commands
    let forceSearch = isWebSearchForced;
    const currentChips = new Set<'note' | 'tasks' | 'event'>(activePromptChips);

    if (!redoOptions) {
      if (/\/(?:поиск|search|web)\b/i.test(rawText)) {
        forceSearch = true;
        rawText = rawText.replace(/\/(?:поиск|search|web)\s*/gi, '').trim();
      }
      if (/\/(?:заметка|note)\b/i.test(rawText)) {
        currentChips.add('note');
        rawText = rawText.replace(/\/(?:заметка|note)\s*/gi, '').trim();
      }
      if (/\/(?:задачи|tasks)\b/i.test(rawText)) {
        currentChips.add('tasks');
        rawText = rawText.replace(/\/(?:задачи|tasks)\s*/gi, '').trim();
      }
      if (/\/(?:событие|event)\b/i.test(rawText)) {
        currentChips.add('event');
        rawText = rawText.replace(/\/(?:событие|event)\s*/gi, '').trim();
      }
    }

    if (!rawText) return;

    // Apply command intent wrapper if active
    let formattedText = rawText;
    const activeCmds = Array.from(currentChips);
    if (!redoOptions) {
      if (activeCmds.length === 1) {
        if (activeCmds[0] === 'note') formattedText = `Создай заметку: ${rawText}`;
        else if (activeCmds[0] === 'tasks') formattedText = `Создай список задач: ${rawText}`;
        else if (activeCmds[0] === 'event') formattedText = `Запланируй событие: ${rawText}`;
      } else if (activeCmds.length > 1) {
        const descriptions = activeCmds.map(c => {
          if (c === 'note') return 'создать заметку';
          if (c === 'tasks') return 'создать список задач';
          if (c === 'event') return 'запланировать событие в календаре';
          return '';
        }).filter(Boolean);
        formattedText = `[Команды: ${descriptions.join(', ')}]\nПожалуйста, выполни все указанные действия для запроса: ${rawText}`;
      }
    }

    const messageText = formattedText;
    let promptForModel = formattedText;

    if (redoOptions) {
      if (redoOptions.lengthModifier === 'shorter') {
        promptForModel += '\n\n[Инструкция: Сделай этот ответ существенно короче, компактнее и лаконичнее предыдущего, без потери сути]';
      } else if (redoOptions.lengthModifier === 'longer') {
        promptForModel += '\n\n[Инструкция: Сделай этот ответ максимально подробным, глубоким и развернутым, предоставив больше деталей и пояснений]';
      }
    }

    // Reset input and states if normal send
    if (!redoOptions) {
      setInputQuery('');
      setShowNotePicker(false);
      setShowSlashMenu(false);
      setIsWebSearchForced(false);
      setActivePromptChips([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = '24px';
        textareaRef.current.style.overflowY = 'hidden';
      }
    }

    setLoading(true);
    setErrorInfo(null);
    newlyCreatedNotesRef.current = [];

    // Build lightweight workspace context (On-Demand Retrieval architecture)
    const userBlocksSummary = blocks.map(b => `«${b.name}» (id: "${b.id}")`).join(', ');
    const tagsSummary = tags.map(t => `#${t.name} (${t.color})`).join(', ');
    const todayStr = new Date().toISOString().split('T')[0];

    const settingsSummary = [
      `Тема: «${theme.name}» (${theme.id})`,
      `Язык: ${language}`,
      `Шрифт: ${quickSettings.fontFamily || 'sans'} (${quickSettings.fontSize || 16}px, высота строки: ${quickSettings.lineHeight || 1.6})`,
      `Благополучие: [Режим фокуса в панели: ${quickSettings.pinFocusModeToBottomBar ? 'вкл' : 'выкл'}, Подготовка ко сну: ${quickSettings.bedtimeReminderEnabled ? `вкл (время: ${quickSettings.bedtimeReminderTime || '22:30'}, заголовок: «${quickSettings.bedtimeReminderTitle || 'Подготовка ко сну'}»)` : 'выкл'}]`,
      `Отображение в заметках: [Счётчик символов: ${quickSettings.showCharCount ? 'вкл' : 'выкл'}, Счётчик слов: ${quickSettings.showWordCount ? 'вкл' : 'выкл'}, Дата изменения: ${quickSettings.showDate ? 'вкл' : 'выкл'}, Метаданные: ${quickSettings.showTileMetadata ? 'вкл' : 'выкл'}, Обводка: ${quickSettings.showBorder ? 'вкл' : 'выкл'}]`,
    ].join('; ');

    const workspaceSnapshot = [
      `[РАБОЧЕЕ ПРОСТРАНСТВО VERIS]:`,
      `- Текущая дата (сегодня): ${todayStr}`,
      `- Заметок в базе: ${notes.length}`,
      `- Списков задач в базе: ${taskLists.length}`,
      `- Событий в календаре: ${events.length}`,
      `- Блоки: ${userBlocksSummary || 'Общие, Закреплённые'}`,
      `- Теги: ${tagsSummary || '(тегов пока нет)'}`,
      `- Текущие настройки: ${settingsSummary}`,
      `- Текущий экран: ${viewMode}${viewMode === 'editor' && activeNoteId ? ` (открыта заметка id="${activeNoteId}")` : ''}${viewMode === 'tasks' && activeTaskId ? ` (открыт список задач id="${activeTaskId}")` : ''}`,
      `[ИНСТРУКЦИЯ ПОИСКА]: Если тебе нужны данные, текст конкретных заметок, списки задач или события календаря — используй функции search_workspace, get_note_content, get_task_list, list_workspace_items, search_calendar_events.`,
    ].join('\n');

    // Prepare note context if any notes are attached OR if current note is open in editor
    let noteContentContext = '';
    if (attachedNotes.length > 0) {
      noteContentContext = attachedNotes
        .map(
          n =>
            `[СОДЕРЖИМОЕ ПРИКРЕПЛЁННОЙ ЗАМЕТКИ (id="${n.id}", title="${n.title || 'Без названия'}")]\n${n.content ? n.content.replace(/<[^>]+>/g, ' ').trim() : '(Пустая заметка)'}`
        )
        .join('\n\n');
    } else if (viewMode === 'editor' && activeNoteId) {
      const activeNote = notes.find(n => n.id === activeNoteId);
      if (activeNote) {
        noteContentContext = `[СОДЕРЖИМОЕ ТЕКУЩЕЙ ОТКРЫТОЙ В РЕДАКТОРЕ ЗАМЕТКИ (id="${activeNote.id}", title="${activeNote.title || 'Без названия'}")]\n${activeNote.content ? activeNote.content.replace(/<[^>]+>/g, ' ').trim() : '(Пустая заметка)'}`;
      }
    }

    const fullContext = [workspaceSnapshot, noteContentContext].filter(Boolean).join('\n\n');

    // Format full prompt sent to model
    const userMessageContent = fullContext
      ? `${fullContext}\n\n---\nЗапрос пользователя: ${promptForModel}`
      : promptForModel;

    const userMessage: AnacrusaChatMessage = redoOptions
      ? redoOptions.targetUserMessage
      : {
          id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          role: 'user',
          content: messageText,
          timestamp: Date.now(),
          attachedNotes: attachedNotes.map(n => ({ id: n.id, title: n.title || 'Без названия' })),
        };

    // Determine current session or create a new one
    const sessionId = activeSession ? activeSession.id : `session-${Date.now()}`;
    const sessionTitle = activeSession ? activeSession.title : messageText.slice(0, 40);

    let existingMessages = activeSession ? activeSession.messages : [];
    if (redoOptions) {
      existingMessages = redoOptions.baseHistory;
    } else if (editingMessageId) {
      const editIdx = existingMessages.findIndex(m => m.id === editingMessageId);
      if (editIdx !== -1) {
        existingMessages = existingMessages.slice(0, editIdx);
      }
      setEditingMessageId(null);
    }
    const updatedMessages = [...existingMessages, userMessage];

    // Optimistically update / create session
    const updatedSession: AnacrusaChatSession = {
      id: sessionId,
      title: sessionTitle,
      createdAt: activeSession ? activeSession.createdAt : Date.now(),
      updatedAt: Date.now(),
      model: anacrusaSettings.model,
      messages: updatedMessages,
    };

    saveAnacrusaSession(updatedSession);
    setActiveAnacrusaSessionId(sessionId);

    // Build payload messages history for Cohere API (multi-turn conversation)
    const apiMessages = updatedMessages.map(m => ({
      role: m.role,
      content: m.role === 'user' && m.id === userMessage.id ? userMessageContent : m.content,
    }));

    // Prepare workspace data for on-demand server retrieval
    const workspaceData = {
      notes: (notes || []).filter(Boolean).map(n => ({
        id: n?.id,
        title: n?.title || 'Без названия',
        blockId: n?.blockId,
        tags: n?.tags || [],
        content: n?.content || '',
        updatedAt: n?.updatedAt,
      })),
      taskLists: (taskLists || []).filter(Boolean).map(t => ({
        id: t?.id,
        title: t?.title || 'Список задач',
        tags: t?.tags || [],
        items: t?.items || [],
      })),
      blocks: (blocks || []).filter(Boolean).map(b => ({ id: b?.id, name: b?.name })),
      tags: (tags || []).filter(Boolean).map(t => ({ id: t?.id, name: t?.name, color: t?.color })),
      events: (events || []).filter(Boolean).map(e => ({
        id: e?.id,
        title: e?.title || 'Событие',
        date: e?.date || '',
        isAllDay: e?.isAllDay ?? true,
        startTime: e?.startTime || null,
        endTime: e?.endTime || null,
        remindOnDay: e?.remindOnDay ?? false,
        description: e?.description || '',
      })),
      activeNoteId,
      activeTaskId,
      viewMode,
    };

    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const chatEndpoint = isIonet ? '/api/ai/ionet/chat' : '/api/ai/cohere/chat';
      const res = await fetch(chatEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          provider: anacrusaSettings.provider,
          apiKey: activeApiKey,
          baseUrl: anacrusaSettings.ionetBaseUrl,
          model: activeModel,
          temperature: anacrusaSettings.temperature,
          systemPrompt: anacrusaSettings.systemPrompt,
          webSearchMode: anacrusaSettings.webSearchMode || 'ask',
          webSearchSettings,
          forceWebSearch: forceSearch,
          messages: apiMessages,
          workspaceData,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        const defaultErr = isIonet
          ? 'Произошла ошибка при обращении к io.net API.'
          : 'Произошла ошибка при обращении к Cohere API.';
        setErrorInfo({
          type: typeof data.error === 'string' ? data.error : 'ERROR',
          message: data.message || (typeof data.error === 'string' ? data.error : defaultErr),
        });
        return;
      }

      const serverExecutionTrace: AnacrusaReadStep[] = Array.isArray(data.executionTrace)
        ? data.executionTrace.map((tr: any) => ({
            step: tr.step,
            tool: tr.tool,
            queryOrTarget: tr.queryOrTarget,
            resultSummary: tr.resultSummary,
          }))
        : [];

      // Check if server is asking for user confirmation before doing web search
      if (data.pendingWebSearch) {
        const assistantMessage: AnacrusaChatMessage = {
          id: `msg-ai-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          role: 'assistant',
          content: data.text || `Для ответа требуется актуальная информация из интернета по запросу: «${data.pendingWebSearch.query}». Запрашиваю подтверждение на выполнение поиска.`,
          timestamp: Date.now(),
          readSteps: serverExecutionTrace.length > 0 ? serverExecutionTrace : undefined,
          pendingWebSearch: {
            query: data.pendingWebSearch.query,
            toolCallId: data.pendingWebSearch.toolCallId,
            status: 'pending',
          },
        };

        const finalSession: AnacrusaChatSession = {
          ...updatedSession,
          updatedAt: Date.now(),
          messages: [...updatedMessages, assistantMessage],
        };

        saveAnacrusaSession(finalSession);
        return;
      }

      const rawText = data.text || '';
      const serverToolCalls: any[] = Array.isArray(data.toolCalls)
        ? data.toolCalls
        : (data.toolCall ? [data.toolCall] : []);

      // Extract structured steps from Cohere v2 toolCalls, JSON blocks, or inline arrays
      const { displayText: parsedText, steps: parsedSteps } = extractActionStepsFromResponse(rawText, serverToolCalls);

      let finalDisplayText = parsedText || rawText;
      const rawStepsToExecute: RawActionStep[] = [...parsedSteps];

      // Fallback Semantic Intent Detection if model returned no explicit tools/JSON (especially for small BYOK 7-10B models)
      if (rawStepsToExecute.length === 0) {
        const trimmedPrompt = messageText.trim();
        const deleteNoteMatch = trimmedPrompt.match(/(?:удали|сотри|очисти|выброси)\s+(?:заметк[уиеа]?\s+)?["'«]?(.+?)["'»]?$/i);
        const renameBlockMatch = trimmedPrompt.match(/(?:переименуй|измени\s+название|поменяй\s+название)\s+блока?\s+["'«]?(.+?)["'»]?\s+(?:в|на)\s+["'«]?(.+?)["'»]?$/i);
        const deleteBlockMatch = trimmedPrompt.match(/(?:удали|сотри|уничтожь)\s+блок\s+["'«]?(.+?)["'»]?$/i);
        const createBlockMatch = trimmedPrompt.match(/(?:создай|сделай|добавь)\s+блок\s+["'«]?(.+?)["'»]?$/i);
        const createTagMatch = trimmedPrompt.match(/(?:создай|добавь|сделай|новый)\s+тег\s+["'«#]?([a-zA-Zа-яА-ЯёЁ0-9_-]+)["'»]?(?:\s+(?:с\s+цветом|цвет|HEX)\s+([#a-zA-Z0-9]+))?/i);
        const deleteTagMatch = trimmedPrompt.match(/(?:удали|сотри|убери)\s+тег\s+["'«#]?([a-zA-Zа-яА-ЯёЁ0-9_-]+)["'»]?$/i);
        const attachTagMatch = trimmedPrompt.match(/(?:прикрепи|добавь|повесь|назначь)\s+тег[и]?\s+["'«#]?([a-zA-Zа-яА-ЯёЁ0-9_,\s#-]+?)["'»]?\s+(?:к|для|в)\s+(?:заметк[еуиа]?|списк[уеа]?|дел[ау]?)\s*["'«]?(.+?)["'»]?$/i);
        const detachTagMatch = trimmedPrompt.match(/(?:убери|сними|открепи|удали)\s+тег[и]?\s+["'«#]?([a-zA-Zа-яА-ЯёЁ0-9_,\s#-]+?)["'»]?\s+(?:с|из|от)\s+(?:заметк[иеуа]?|списк[ауе]?|дел[ау]?)\s*["'«]?(.+?)["'»]?$/i);
        const createCalendarMatch = trimmedPrompt.match(/(?:создай|добавь|напомни|поставь|запланируй)\s+(?:событие|встречу|созвон|напоминание|задачу\s+в\s+календарь|в\s+календар[еь])\s*(.*)/i);
        const renameTaskListMatch = trimmedPrompt.match(/(?:переименуй|измени\s+название|поменяй\s+название)\s+(?:список\s+задач|списка\s+задач|список\s+дел|чек-?лист)\s*["'«]?(.+?)["'»]?\s+(?:в|на)\s+["'«]?(.+?)["'»]?$/i);
        const deleteTaskListMatch = trimmedPrompt.match(/(?:удали|сотри)\s+(?:список\s+задач|список\s+дел|чек-?лист)\s*["'«]?(.+?)["'»]?$/i);
        const formatNoteMatch = trimmedPrompt.match(/(?:отформатируй|сделай\s+жирным|выдели|сделай\s+заголовк|добавь\s+цитат|подчеркни|курсив|выравни)/i);
        const createNoteMatch = /(?:создай|сделай|напиши|составь|сгенерируй|сохрани)\s+(?:мне\s+)?(?:новую\s+)?(?:заметку|рецепт|план|конспект|статью)/i.test(trimmedPrompt);
        const renameMatch = trimmedPrompt.match(/(?:переименуй|измени\s+название|поменяй\s+название|назови)\s+(?:заметк[уи]\s+)?(?:в|на)?\s*["'«]?(.+?)["'»]?$/i);
        const moveBlockMatch = trimmedPrompt.match(/(?:перенеси|перемести|помести|добавь|переложи|скинь)\s+(?:заметк[иуеа]?\s+)?(.+?)\s+в\s+блок\s+["'«]?(.+?)["'»]?$/i);
        const pinMatch = trimmedPrompt.match(/^(?:(закрепи|прикрепи|открепи|сними\s+закрепление))\s*(?:заметк[уи]\s*)?(?:["'«]?(.+?)["'»]?)?$/i);
        const updateTaskListMatch = /(?:обнови|добавь|измени|допиши|удали\s+пункт|отметь)\s+(?:в\s+)?(?:список\s+задач|списке\s+задач|список\s+дел|чек-?лист)/i.test(trimmedPrompt);
        const createTaskListMatch = /(?:создай|сделай|напиши|составь|сгенерируй)\s+(?:мне\s+)?(?:новый\s+)?(?:список\s+задач|список\s+дел|чек-?лист|туду-?лист|todo-?лист|список\s+покупок)/i.test(trimmedPrompt);

        let targetNote: Note | undefined = attachedNotes.length > 0
          ? (notes.find(n => n.id === attachedNotes[0].id) || attachedNotes[0])
          : (activeNoteId && viewMode === 'editor' ? notes.find(n => n.id === activeNoteId) : undefined);

        if (createTagMatch) {
          rawStepsToExecute.push({
            name: 'create_tag',
            arguments: {
              name: createTagMatch[1].trim().replace(/^#/g, ''),
              color: createTagMatch[2]?.trim(),
            },
          });
        } else if (deleteTagMatch) {
          rawStepsToExecute.push({
            name: 'delete_tag',
            arguments: {
              tag_name: deleteTagMatch[1].trim().replace(/^#/g, ''),
            },
          });
        } else if (attachTagMatch) {
          const parsedTags = attachTagMatch[1].split(/[,;\s]+/).map(s => s.replace(/^#/g, '').trim()).filter(Boolean);
          const targetTitle = attachTagMatch[2].trim();
          rawStepsToExecute.push({
            name: 'attach_tags',
            arguments: {
              tags: parsedTags,
              note_titles: [targetTitle],
              task_list_titles: [targetTitle],
            },
          });
        } else if (detachTagMatch) {
          const parsedTags = detachTagMatch[1].split(/[,;\s]+/).map(s => s.replace(/^#/g, '').trim()).filter(Boolean);
          const targetTitle = detachTagMatch[2].trim();
          rawStepsToExecute.push({
            name: 'detach_tags',
            arguments: {
              tags: parsedTags,
              note_titles: [targetTitle],
              task_list_titles: [targetTitle],
            },
          });
        } else if (createCalendarMatch) {
          const rest = createCalendarMatch[1].trim();
          let eventTitle = rest || 'Событие';
          let targetDate = new Date().toISOString().split('T')[0];
          
          if (/завтра/i.test(trimmedPrompt)) {
            const tom = new Date();
            tom.setDate(tom.getDate() + 1);
            targetDate = tom.toISOString().split('T')[0];
          }

          rawStepsToExecute.push({
            name: 'create_calendar_event',
            arguments: {
              title: eventTitle,
              date: targetDate,
              isAllDay: true,
              remindOnDay: true,
            },
          });
        } else if (renameBlockMatch) {
          rawStepsToExecute.push({
            name: 'rename_block',
            arguments: {
              block_name: renameBlockMatch[1].trim(),
              new_name: renameBlockMatch[2].trim(),
            },
          });
        } else if (deleteBlockMatch) {
          rawStepsToExecute.push({
            name: 'delete_block',
            arguments: {
              block_name: deleteBlockMatch[1].trim(),
            },
          });
        } else if (createBlockMatch) {
          rawStepsToExecute.push({
            name: 'create_block',
            arguments: {
              block_name: createBlockMatch[1].trim(),
            },
          });
        } else if (renameTaskListMatch) {
          rawStepsToExecute.push({
            name: 'rename_task_list',
            arguments: {
              task_list_title: renameTaskListMatch[1].trim(),
              new_title: renameTaskListMatch[2].trim(),
            },
          });
        } else if (deleteTaskListMatch) {
          rawStepsToExecute.push({
            name: 'delete_task_list',
            arguments: {
              task_list_title: deleteTaskListMatch[1].trim(),
            },
          });
        } else if (deleteNoteMatch && /(?:заметк|удали\s+заметку)/i.test(trimmedPrompt)) {
          rawStepsToExecute.push({
            name: 'delete_note',
            arguments: {
              note_titles: [deleteNoteMatch[1].trim()],
            },
          });
        } else if (formatNoteMatch && targetNote) {
          let formatType = 'full';
          if (/жирн/i.test(trimmedPrompt)) formatType = 'bold';
          else if (/курсив/i.test(trimmedPrompt)) formatType = 'italic';
          else if (/подчерк/i.test(trimmedPrompt)) formatType = 'underline';
          else if (/цитат/i.test(trimmedPrompt)) formatType = 'quote';
          else if (/код/i.test(trimmedPrompt)) formatType = 'code';
          else if (/заголов/i.test(trimmedPrompt)) formatType = 'heading';
          else if (/выдели|цвет/i.test(trimmedPrompt)) formatType = 'highlight';
          else if (/выравни/i.test(trimmedPrompt)) formatType = 'align';

          rawStepsToExecute.push({
            name: 'format_note',
            arguments: {
              note_id: targetNote.id,
              format_type: formatType,
              formatted_content: rawText,
            },
          });
        } else if (moveBlockMatch) {
          const notesPart = moveBlockMatch[1];
          const blockNameRaw = moveBlockMatch[2].trim();
          const parsedQueries = notesPart.split(/[,;\s+и\s+]+/i).map(s => s.trim()).filter(Boolean);
          rawStepsToExecute.push({
            name: 'move_notes_to_block',
            arguments: {
              note_titles: parsedQueries.length > 0 ? parsedQueries : [notesPart],
              block_name: blockNameRaw,
            },
          });
        } else if (pinMatch) {
          const actionWord = pinMatch[1].toLowerCase();
          const isPin = !actionWord.startsWith('от') && !actionWord.startsWith('сними');
          const noteQuery = pinMatch[2]?.trim();
          rawStepsToExecute.push({
            name: isPin ? 'pin_notes' : 'unpin_notes',
            arguments: {
              pinned: isPin,
              note_titles: noteQuery ? [noteQuery] : (targetNote ? [targetNote.title] : []),
            },
          });
        } else if (updateTaskListMatch) {
          let listTitle = 'Список задач';
          const listTitleMatch = trimmedPrompt.match(/(?:список\s+задач|списке\s+задач|список\s+дел|чек-?лист)\s*["'«]?([^"'\n]+?)["'»]?\s*(?:добавь|измени|отметь|удали|$)/i);
          if (listTitleMatch && listTitleMatch[1].trim()) {
            listTitle = listTitleMatch[1].trim();
          }

          const rawLines = rawText.split('\n');
          const parsedItems = rawLines
            .filter(l => /^(?:[-*•]|\d+[.)]|\[[ xX]?\])\s+/.test(l.trim()))
            .map(l => l.replace(/^(?:[-*•]|\d+[.)]|\[[ xX]?\])\s+/, '').trim())
            .filter(t => t.length > 0);

          rawStepsToExecute.push({
            name: 'update_task_list',
            arguments: {
              task_list_title: listTitle,
              add_items: parsedItems.length > 0 ? parsedItems : undefined,
            },
          });
        } else if (createTaskListMatch) {
          let listTitle = 'Список задач';
          const titleExtract = trimmedPrompt.match(/(?:список\s+задач|список\s+дел|чек-?лист|туду-?лист|todo-?лист|список\s+покупок)\s*(?:с\s+названием|под\s+названием|:|«|"|'|\s+)(.+?)(?:$|[.,\n]|с\s+задачами)/i);
          if (titleExtract && titleExtract[1].trim()) {
            listTitle = titleExtract[1].replace(/["'«»]/g, '').trim();
          }

          const rawLines = rawText.split('\n');
          let parsedItems = rawLines
            .filter(l => /^(?:[-*•]|\d+[.)]|\[[ xX]?\])\s+/.test(l.trim()))
            .map(l => l.replace(/^(?:[-*•]|\d+[.)]|\[[ xX]?\])\s+/, '').trim())
            .filter(t => t.length > 0);

          if (parsedItems.length === 0) {
            const tasksPartMatch = trimmedPrompt.match(/(?:задачами|пунктами|делами|списком|содержащий)[:\s]+(.+)$/i);
            if (tasksPartMatch) {
              parsedItems = tasksPartMatch[1].split(/[,;]+/).map(s => s.trim()).filter(Boolean);
            }
          }

          rawStepsToExecute.push({
            name: 'create_task_list',
            arguments: {
              title: listTitle,
              items: parsedItems.length > 0 ? parsedItems : ['Первая задача', 'Вторая задача'],
            },
          });
        } else if (renameMatch && targetNote) {
          const newTitle = renameMatch[1].trim();
          rawStepsToExecute.push({
            name: 'rename_note',
            arguments: {
              note_id: targetNote.id,
              new_title: newTitle,
            },
          });
        } else if (createNoteMatch || (rawText.trim().startsWith('# ') && rawText.includes('\n'))) {
          let extractedTitle = 'Новая заметка';
          const titleHeadingMatch = rawText.match(/^#\s+(.+)$/m);
          if (titleHeadingMatch) {
            extractedTitle = titleHeadingMatch[1].replace(/[*_#]/g, '').trim();
          } else {
            const cleanedPrompt = trimmedPrompt
              .replace(/^(?:создай|сделай|напиши|составь|сгенерируй|сохрани)\s+(?:мне\s+)?(?:новую\s+)?(?:заметку\s+)?(?:с\s+|о\s+|про\s+)?/i, '')
              .trim();
            if (cleanedPrompt) {
              extractedTitle = cleanedPrompt.charAt(0).toUpperCase() + cleanedPrompt.slice(1);
            }
          }
          rawStepsToExecute.push({
            name: 'create_note',
            arguments: {
              title: extractedTitle,
              content: rawText,
            },
          });
        }

        // If multiple commands were requested, ensure missing ones are fulfilled in fallback mode
        if (activeCmds.includes('event') && !rawStepsToExecute.some(s => s.name === 'create_calendar_event')) {
          let eventTitle = 'Событие';
          const evMatch = trimmedPrompt.match(/(?:событие|встреча|митинг|план)\s*[:«"']?([^«"'\n.]+)/i);
          if (evMatch && evMatch[1].trim()) {
            eventTitle = evMatch[1].trim();
          } else if (rawText.trim()) {
            eventTitle = rawText.slice(0, 35);
          }
          rawStepsToExecute.push({
            name: 'create_calendar_event',
            arguments: {
              title: eventTitle,
              date: new Date().toISOString().split('T')[0],
              isAllDay: true,
              remindOnDay: true,
            },
          });
        }
        if (activeCmds.includes('note') && !rawStepsToExecute.some(s => s.name === 'create_note')) {
          let noteTitle = 'Новая заметка';
          const titleHeadingMatch = rawText.match(/^#\s+(.+)$/m);
          if (titleHeadingMatch) {
            noteTitle = titleHeadingMatch[1].replace(/[*_#]/g, '').trim();
          }
          rawStepsToExecute.push({
            name: 'create_note',
            arguments: {
              title: noteTitle,
              content: rawText,
            },
          });
        }
        if (activeCmds.includes('tasks') && !rawStepsToExecute.some(s => s.name === 'create_task_list')) {
          rawStepsToExecute.push({
            name: 'create_task_list',
            arguments: {
              title: 'Список задач',
              items: ['Первая задача', 'Вторая задача'],
            },
          });
        }
      }

      // Execute all steps sequentially and collect results with undo payloads
      const executedSteps: AnacrusaStep[] = [];
      for (const step of rawStepsToExecute) {
        const stepResult = executeActionStep(step);
        executedSteps.push(stepResult);
      }

      // Build primary noteActionMeta for backwards compatibility if steps exist
      let noteActionMeta: AnacrusaNoteAction | undefined = undefined;
      if (executedSteps.length > 0) {
        const primaryStep = executedSteps[0];
        noteActionMeta = {
          type: primaryStep.action,
          noteId: primaryStep.noteId,
          taskListId: primaryStep.taskListId,
          title: primaryStep.title,
          blockName: primaryStep.blockName,
          pinned: primaryStep.pinned,
          summary: executedSteps.length === 1
            ? primaryStep.summary
            : `Выполнено шагов: ${executedSteps.length}`,
        };

        // If the model gave no text or text matches raw markup, generate a readable overview
        if (!finalDisplayText || finalDisplayText === rawText || finalDisplayText.trim().startsWith('```')) {
          if (executedSteps.length === 1) {
            finalDisplayText = primaryStep.summary;
          } else {
            finalDisplayText = `Выполнено ${executedSteps.length} ${executedSteps.length <= 4 ? 'шага' : 'шагов'}:\n` +
              executedSteps.map((s, idx) => `${idx + 1}. ${s.summary}`).join('\n');
          }
        }
      }

      const assistantMessage: AnacrusaChatMessage = {
        id: `msg-ai-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        role: 'assistant',
        content: finalDisplayText,
        timestamp: Date.now(),
        noteAction: noteActionMeta,
        steps: executedSteps.length > 0 ? executedSteps : undefined,
        readSteps: serverExecutionTrace.length > 0 ? serverExecutionTrace : undefined,
        webSearchSources: Array.isArray(data.webSearchSources) && data.webSearchSources.length > 0 ? data.webSearchSources : undefined,
      };

      const finalSession: AnacrusaChatSession = {
        ...updatedSession,
        updatedAt: Date.now(),
        messages: [...updatedMessages, assistantMessage],
      };

      saveAnacrusaSession(finalSession);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }
      setErrorInfo({
        type: 'NETWORK_ERROR',
        message: err.message || 'Не удалось подключиться к серверу AI.',
      });
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleConfirmWebSearch = async (messageId: string, query: string, confirmed: boolean) => {
    if (!activeSession || loading) return;
    setLoading(true);
    setErrorInfo(null);

    // 1. Update message status locally
    const currentMessages = activeSession.messages.map(m => {
      if (m.id === messageId && m.pendingWebSearch) {
        return {
          ...m,
          pendingWebSearch: {
            ...m.pendingWebSearch,
            status: (confirmed ? 'approved' : 'declined') as 'approved' | 'declined',
          },
        };
      }
      return m;
    });

    const tempSession: AnacrusaChatSession = {
      ...activeSession,
      updatedAt: Date.now(),
      messages: currentMessages,
    };
    saveAnacrusaSession(tempSession);

    // Build payload messages history
    const apiMessages = currentMessages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Prepare workspace data
    const workspaceData = {
      notes: (notes || []).filter(Boolean).map(n => ({
        id: n?.id,
        title: n?.title || 'Без названия',
        blockId: n?.blockId,
        tags: n?.tags || [],
        content: n?.content || '',
        updatedAt: n?.updatedAt,
      })),
      taskLists: (taskLists || []).filter(Boolean).map(t => ({
        id: t?.id,
        title: t?.title || 'Список задач',
        tags: t?.tags || [],
        items: t?.items || [],
      })),
      blocks: (blocks || []).filter(Boolean).map(b => ({ id: b?.id, name: b?.name })),
      tags: (tags || []).filter(Boolean).map(t => ({ id: t?.id, name: t?.name, color: t?.color })),
      events: (events || []).filter(Boolean).map(e => ({
        id: e?.id,
        title: e?.title || 'Событие',
        date: e?.date || '',
        isAllDay: e?.isAllDay ?? true,
        startTime: e?.startTime || null,
        endTime: e?.endTime || null,
        remindOnDay: e?.remindOnDay ?? false,
        description: e?.description || '',
      })),
      activeNoteId,
      activeTaskId,
      viewMode,
    };

    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const chatEndpoint = isIonet ? '/api/ai/ionet/chat' : '/api/ai/cohere/chat';
      const res = await fetch(chatEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          provider: anacrusaSettings.provider,
          apiKey: activeApiKey,
          baseUrl: anacrusaSettings.ionetBaseUrl,
          model: activeModel,
          temperature: anacrusaSettings.temperature,
          systemPrompt: anacrusaSettings.systemPrompt,
          messages: apiMessages,
          workspaceData,
          webSearchMode: confirmed ? 'auto' : 'never',
          webSearchSettings,
          confirmedWebSearch: confirmed,
          webSearchDeclined: !confirmed,
          webSearchQuery: query,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        const defaultErr = isIonet
          ? 'Произошла ошибка при обращении к io.net API.'
          : 'Произошла ошибка при поиске информации.';
        setErrorInfo({
          type: typeof data.error === 'string' ? data.error : 'ERROR',
          message: data.message || (typeof data.error === 'string' ? data.error : defaultErr),
        });
        return;
      }

      const rawText = data.text || '';
      const serverToolCalls: any[] = Array.isArray(data.toolCalls)
        ? data.toolCalls
        : (data.toolCall ? [data.toolCall] : []);

      const serverExecutionTrace: AnacrusaReadStep[] = Array.isArray(data.executionTrace)
        ? data.executionTrace.map((tr: any) => ({
            step: tr.step,
            tool: tr.tool,
            queryOrTarget: tr.queryOrTarget,
            resultSummary: tr.resultSummary,
          }))
        : [];

      const { displayText: parsedText, steps: parsedSteps } = extractActionStepsFromResponse(rawText, serverToolCalls);
      const finalDisplayText = parsedText || rawText;

      const executedSteps: AnacrusaStep[] = [];
      for (const step of parsedSteps) {
        const stepResult = executeActionStep(step);
        executedSteps.push(stepResult);
      }

      // Update the pending message with the actual answer
      const updatedFinalMessages = currentMessages.map(m => {
        if (m.id === messageId) {
          return {
            ...m,
            content: finalDisplayText,
            readSteps: [
              ...(m.readSteps || []),
              ...serverExecutionTrace,
            ],
            steps: executedSteps.length > 0 ? executedSteps : m.steps,
            pendingWebSearch: {
              query,
              status: (confirmed ? 'approved' : 'declined') as 'approved' | 'declined',
            },
            webSearchSources: Array.isArray(data.webSearchSources) && data.webSearchSources.length > 0 ? data.webSearchSources : m.webSearchSources,
          };
        }
        return m;
      });

      const finalSession: AnacrusaChatSession = {
        ...activeSession,
        updatedAt: Date.now(),
        messages: updatedFinalMessages,
      };

      saveAnacrusaSession(finalSession);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }
      setErrorInfo({
        type: 'NETWORK_ERROR',
        message: err.message || 'Ошибка сети при выполнении поиска.',
      });
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Slash Menu Keyboard Navigation
    if (showSlashMenu && filteredSlashCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSlashIndex(prev => (prev + 1) % filteredSlashCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSlashIndex(prev => (prev - 1 + filteredSlashCommands.length) % filteredSlashCommands.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selectedCmd = filteredSlashCommands[selectedSlashIndex] || filteredSlashCommands[0];
        if (selectedCmd) {
          selectedCmd.action();
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSlashMenu(false);
        return;
      }
    }

    // Note Picker Escape
    if (showNotePicker && e.key === 'Escape') {
      e.preventDefault();
      setShowNotePicker(false);
      return;
    }

    if (e.key === 'Enter') {
      if (e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      } else {
        e.stopPropagation();
      }
    }
  };

  const handleCopyMessage = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAction(`copy-${id}`);
    setTimeout(() => setCopiedAction(null), 2000);
  };

  const handleInsertIntoNote = (text: string, id: string) => {
    // Format response cleanly
    const formatted = `<div style="padding:12px;margin:8px 0;border-left:3px solid ${theme.accent};background:${hexToRgba(theme.text, 0.05)};border-radius:10px;"><p style="margin:0;line-height:1.6;">${text.replace(/\n/g, '<br/>')}</p></div>`;
    insertTextIntoActiveNote(formatted);
    setCopiedAction(`insert-${id}`);
    setTimeout(() => setCopiedAction(null), 2000);
  };

  const handleCreateNoteFromResponse = (text: string, id: string) => {
    const titleMatch = text.slice(0, 35).replace(/[#*`_]/g, '').trim() || 'Ответ Anacrusa';
    const newNote = createNote(titleMatch, text.replace(/\n/g, '<br/>'));
    setActiveNoteId(newNote.id);
    setViewMode('editor');
    closeAnacrusaDrawer();
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return `Сегодня ${timeStr}`;
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return `Вчера ${timeStr}`;
    }
    const dateFormatted = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    return `${dateFormatted} ${timeStr}`;
  };

  const sortedSessions = useMemo(() => {
    return [...anacrusaSessions].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return historySortOrder === 'oldest'
        ? a.updatedAt - b.updatedAt
        : b.updatedAt - a.updatedAt;
    });
  }, [anacrusaSessions, historySortOrder]);

  const handleTogglePinSession = (session: AnacrusaChatSession) => {
    saveAnacrusaSession({
      ...session,
      pinned: !session.pinned,
      updatedAt: Date.now(),
    });
    setSessionMenuOpenId(null);
  };

  const handleSaveRename = () => {
    if (!sessionToRename) return;
    const trimmed = renameTitle.trim();
    if (trimmed) {
      saveAnacrusaSession({
        ...sessionToRename,
        title: trimmed,
        updatedAt: Date.now(),
      });
    }
    setSessionToRename(null);
  };

  const handleConfirmDeleteSession = () => {
    if (!sessionToDelete) return;
    deleteAnacrusaSession(sessionToDelete.id);
    setSessionToDelete(null);
    setSessionMenuOpenId(null);
  };

  if (!isAIPromptOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end backdrop-blur-xs animate-fadeIn"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
      onClick={closeAnacrusaDrawer}
    >
      <div
        className="w-full sm:w-[460px] md:w-[520px] h-full flex flex-col shadow-2xl border-l backdrop-blur-2xl transition-all relative overflow-hidden"
        style={{
          backgroundColor: drawerBg,
          borderColor: cardBorder,
          color: theme.text,
          boxShadow: `-15px 0 50px ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.5)'}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Floating Top Action Controls (Over Content) */}
        <div
          className={
            showHistory
              ? 'absolute top-3 inset-x-0 px-4 flex items-center justify-between z-30 pointer-events-none transition-all'
              : 'pt-3 pb-1 px-4 flex items-center justify-between shrink-0 z-30 relative transition-all bg-transparent'
          }
        >
          {/* Left Area: History Toggle / Back button + Model Name Dropdown */}
          <div className="flex items-center gap-2 min-w-0">
            {showHistory ? (
              <div className="flex items-center gap-2 pointer-events-auto">
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-2.5 rounded-2xl border shadow-lg backdrop-blur-xl hover:opacity-80 active:scale-95 transition flex items-center justify-center cursor-pointer shrink-0"
                  style={{
                    backgroundColor: glassBg,
                    borderColor: cardBorder,
                    color: theme.text,
                  }}
                  title="Назад к диалогу"
                >
                  <ArrowLeft size={18} />
                </button>
                <div
                  className="px-3.5 py-2.5 rounded-2xl border shadow-lg backdrop-blur-xl flex items-center shrink-0 select-none"
                  style={{
                    backgroundColor: glassBg,
                    borderColor: cardBorder,
                    color: theme.text,
                  }}
                >
                  <span className="text-xs sm:text-sm font-bold tracking-tight">История диалогов</span>
                </div>
              </div>
            ) : (
              <>
                {/* Chat History Button */}
                <button
                  onClick={() => {
                    setShowHistory(true);
                    setIsModelDropdownOpen(false);
                    setIsPowerSettingsOpen(false);
                  }}
                  className="p-2 rounded-xl hover:bg-white/10 active:scale-95 transition cursor-pointer"
                  style={{ color: theme.text }}
                  title="История диалогов"
                >
                  <History size={18} />
                </button>

                {/* Model Selector Button with Chevron & Dropdown Submenu */}
                <div className="relative" ref={modelDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsModelDropdownOpen(prev => !prev);
                      setIsPowerSettingsOpen(false);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 active:scale-98 transition cursor-pointer text-sm sm:text-[15px] font-bold tracking-tight select-none"
                    style={{ color: theme.text }}
                    title={`Провайдер: ${isIonet ? 'io.net' : 'Cohere'} - ${currentModelMeta.name}`}
                  >
                    <span className="truncate max-w-[140px] sm:max-w-[170px]">{currentModelMeta.name}</span>
                    {isModelDropdownOpen ? (
                      <ChevronUp size={16} className="opacity-70 transition-transform shrink-0" />
                    ) : (
                      <ChevronDown size={16} className="opacity-70 transition-transform shrink-0" />
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {isModelDropdownOpen && (
                    <div
                      className="absolute top-full left-0 mt-1.5 w-72 sm:w-80 max-h-[440px] overflow-y-auto p-2 rounded-2xl shadow-2xl border backdrop-blur-2xl z-50 space-y-1 animate-fadeIn custom-scrollbar"
                      style={{
                        backgroundColor: isLight ? hexToRgba(theme.bg, 0.98) : hexToRgba(theme.bg, 0.94),
                        borderColor: cardBorder,
                        boxShadow: `0 12px 35px ${isLight ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.6)'}`,
                      }}
                    >
                      {/* Models List */}
                      <div className="space-y-0.5">
                        {!isIonet ? (
                          COHERE_MODELS.map(model => (
                            <button
                              key={model.id}
                              type="button"
                              onClick={() => {
                                setAnacrusaSettings(prev => ({ ...prev, model: model.id }));
                                setIsModelDropdownOpen(false);
                              }}
                              className="w-full px-3 py-2 rounded-xl flex items-center justify-between transition cursor-pointer text-left hover:bg-white/5"
                              style={{
                                backgroundColor:
                                  anacrusaSettings.model === model.id
                                    ? hexToRgba(theme.accent, 0.18)
                                    : 'transparent',
                              }}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="text-xs font-bold truncate">
                                  {model.name}
                                </div>
                              </div>
                              {anacrusaSettings.model === model.id && (
                                <Check size={16} className="shrink-0" style={{ color: theme.accent }} />
                              )}
                            </button>
                          ))
                        ) : (
                          IONET_MODELS.map(model => {
                            const isSelected = (anacrusaSettings.ionetModel || 'meta-llama/Llama-3.3-70B-Instruct') === model.id;
                            return (
                              <button
                                key={model.id}
                                type="button"
                                onClick={() => {
                                  setAnacrusaSettings(prev => ({ ...prev, ionetModel: model.id }));
                                  setIsModelDropdownOpen(false);
                                }}
                                className="w-full px-3 py-2 rounded-xl flex items-center justify-between transition cursor-pointer text-left hover:bg-white/5"
                                style={{
                                  backgroundColor: isSelected
                                    ? hexToRgba(theme.accent, 0.18)
                                    : 'transparent',
                                }}
                              >
                                <div className="min-w-0 pr-2">
                                  <div className="text-xs font-bold truncate">
                                    {model.name}
                                  </div>
                                </div>
                                {isSelected && (
                                  <Check size={16} className="shrink-0" style={{ color: theme.accent }} />
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right Action Controls: New Chat / History Clear / Lightning Settings / Close */}
          <div className="flex items-center gap-1.5 shrink-0">
            {showHistory ? (
              <div className="flex items-center gap-2 pointer-events-auto">
                {/* 3 Sliders Filter / Sort / Clear Menu */}
                <div className="relative shrink-0" ref={historyMenuRef}>
                  <button
                    onClick={() => setIsHistoryMenuOpen(prev => !prev)}
                    className="p-2.5 rounded-2xl border shadow-lg backdrop-blur-xl hover:opacity-80 active:scale-95 transition flex items-center justify-center cursor-pointer"
                    style={{
                      backgroundColor: isHistoryMenuOpen ? hexToRgba(theme.accent, 0.18) : glassBg,
                      borderColor: isHistoryMenuOpen ? theme.accent : cardBorder,
                      color: isHistoryMenuOpen ? theme.accent : theme.text,
                    }}
                    title="Сортировка и опции истории"
                  >
                    <SlidersHorizontal size={18} />
                  </button>

                  {/* Dropdown Menu */}
                  {isHistoryMenuOpen && (
                    <div
                      className="absolute right-0 mt-2 w-56 rounded-2xl border shadow-2xl backdrop-blur-2xl p-2 z-50 animate-scaleUp flex flex-col gap-2"
                      style={{
                        backgroundColor: isLight ? hexToRgba(theme.bg, 0.96) : hexToRgba(theme.bg, 0.92),
                        borderColor: cardBorder,
                        color: theme.text,
                        boxShadow: isLight ? '0 10px 25px -5px rgba(0,0,0,0.1)' : '0 20px 25px -5px rgba(0,0,0,0.5)',
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="text-[11px] font-bold uppercase tracking-wider opacity-60 flex items-center justify-between px-1">
                        <span>Сортировка чатов</span>
                        <ArrowUpDown size={12} style={{ color: theme.accent }} />
                      </div>

                      <div className="space-y-1">
                        {[
                          { id: 'newest' as const, label: 'Сначала новые', icon: Clock },
                          { id: 'oldest' as const, label: 'Сначала старые', icon: Clock },
                        ].map(opt => {
                          const isSelected = historySortOrder === opt.id;
                          const IconComp = opt.icon;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                handleSetHistorySortOrder(opt.id);
                                setIsHistoryMenuOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer text-left border ${
                                isSelected ? 'shadow-xs font-bold' : 'hover:opacity-90 font-normal'
                              }`}
                              style={{
                                backgroundColor: isSelected
                                  ? hexToRgba(theme.accent, isLight ? 0.14 : 0.18)
                                  : hexToRgba(theme.text, 0.04),
                                color: isSelected ? theme.accent : theme.text,
                                borderColor: isSelected
                                  ? theme.accent
                                  : hexToRgba(theme.text, 0.08),
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <IconComp
                                  size={14}
                                  style={{ color: isSelected ? theme.accent : hexToRgba(theme.text, 0.5) }}
                                />
                                <span>{opt.label}</span>
                              </div>
                              {isSelected && <Check size={13} style={{ color: theme.accent }} />}
                            </button>
                          );
                        })}
                      </div>

                      {anacrusaSessions.length > 0 && (
                        <div className="pt-1.5 border-t" style={{ borderColor: hexToRgba(theme.text, 0.08) }}>
                          <button
                            type="button"
                            onClick={() => {
                              setIsHistoryMenuOpen(false);
                              setShowClearAllModal(true);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/10 active:scale-98 transition cursor-pointer"
                          >
                            <Trash2 size={14} />
                            <span>Очистить всё</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Close Button */}
                <button
                  onClick={closeAnacrusaDrawer}
                  className="p-2.5 rounded-2xl border shadow-lg backdrop-blur-xl hover:opacity-80 active:scale-95 transition flex items-center justify-center cursor-pointer shrink-0"
                  style={{
                    backgroundColor: glassBg,
                    borderColor: cardBorder,
                    color: theme.text,
                  }}
                  title="Закрыть"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <>
                {/* New Chat Button */}
                <button
                  onClick={handleStartNewChat}
                  className="p-2.5 rounded-2xl border shadow-lg backdrop-blur-xl hover:opacity-80 active:scale-95 transition flex items-center justify-center cursor-pointer"
                  style={{
                    backgroundColor: glassBg,
                    borderColor: cardBorder,
                    color: theme.text,
                  }}
                  title="Новый диалог"
                >
                  <SquarePen size={18} />
                </button>

                {/* Lightning Quick Settings Button */}
                <button
                  onClick={() => {
                    setIsPowerSettingsOpen(prev => !prev);
                    setIsModelDropdownOpen(false);
                  }}
                  className="p-2.5 rounded-2xl border shadow-lg backdrop-blur-xl hover:opacity-80 active:scale-95 transition flex items-center justify-center cursor-pointer"
                  style={{
                    backgroundColor: isPowerSettingsOpen ? hexToRgba(theme.accent, 0.2) : glassBg,
                    borderColor: isPowerSettingsOpen ? theme.accent : cardBorder,
                    color: isPowerSettingsOpen ? theme.accent : theme.text,
                  }}
                  title="Параметры провайдера и ИИ"
                >
                  <Zap size={16} />
                </button>

                {/* Close Button */}
                <button
                  onClick={closeAnacrusaDrawer}
                  className="p-2.5 rounded-2xl border shadow-lg backdrop-blur-xl hover:opacity-80 active:scale-95 transition flex items-center justify-center cursor-pointer"
                  style={{
                    backgroundColor: glassBg,
                    borderColor: cardBorder,
                    color: theme.text,
                  }}
                  title="Закрыть"
                >
                  <X size={18} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Quick Power Settings Panel (Toggled by Lightning Icon) */}
        {isPowerSettingsOpen && !showHistory && (
          <div
            className="p-3.5 border-b space-y-3 animate-fadeIn shrink-0 z-10"
            style={{
              backgroundColor: cardBg,
              borderColor: hexToRgba(theme.text, 0.08),
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold opacity-70">Провайдер и параметры</span>
              <button
                onClick={() => {
                  setActiveSettingsTab('ai');
                  setViewMode('settings', 'ai');
                  closeAnacrusaDrawer();
                }}
                className="flex items-center gap-1 text-[11px] font-semibold opacity-70 hover:opacity-100 hover:underline cursor-pointer"
                style={{ color: theme.accent }}
              >
                <span>Настройки ИИ</span>
                <ExternalLink size={11} />
              </button>
            </div>

            {/* Provider Tabs in Power Dropdown */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAnacrusaSettings(prev => ({ ...prev, provider: 'cohere' }))}
                className="py-1.5 px-3 rounded-xl border text-center transition cursor-pointer text-xs font-semibold"
                style={{
                  backgroundColor:
                    anacrusaSettings.provider !== 'ionet'
                      ? hexToRgba(theme.accent, 0.18)
                      : 'transparent',
                  borderColor:
                    anacrusaSettings.provider !== 'ionet'
                      ? theme.accent
                      : hexToRgba(theme.text, 0.12),
                }}
              >
                Cohere
              </button>

              <button
                type="button"
                onClick={() => setAnacrusaSettings(prev => ({ ...prev, provider: 'ionet' }))}
                className="py-1.5 px-3 rounded-xl border text-center transition cursor-pointer text-xs font-semibold"
                style={{
                  backgroundColor:
                    anacrusaSettings.provider === 'ionet'
                      ? hexToRgba(theme.accent, 0.18)
                      : 'transparent',
                  borderColor:
                    anacrusaSettings.provider === 'ionet'
                      ? theme.accent
                      : hexToRgba(theme.text, 0.12),
                }}
              >
                io.net
              </button>
            </div>

            {/* Temperature setting */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-medium opacity-70">Креативность (Temperature)</span>
                <span className="font-mono text-xs font-bold" style={{ color: theme.accent }}>
                  {anacrusaSettings.temperature.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={anacrusaSettings.temperature}
                onChange={e =>
                  setAnacrusaSettings(prev => ({
                    ...prev,
                    temperature: parseFloat(e.target.value),
                  }))
                }
                className="w-full h-1.5 rounded-full accent-current cursor-pointer"
                style={{ color: theme.accent }}
              />
            </div>

            {/* System prompt preview */}
            <div className="space-y-1">
              <span className="text-[11px] font-medium opacity-70 block">Системная инструкция</span>
              <textarea
                rows={2}
                value={anacrusaSettings.systemPrompt}
                onChange={e =>
                  setAnacrusaSettings(prev => ({ ...prev, systemPrompt: e.target.value }))
                }
                className="w-full p-2 rounded-xl border text-xs font-normal outline-hidden resize-none transition leading-relaxed"
                style={{
                  backgroundColor: hexToRgba(theme.text, 0.03),
                  borderColor: cardBorder,
                  color: theme.text,
                }}
              />
            </div>
          </div>
        )}

        {/* Main Scrollable Content */}
        <div
          ref={scrollContainerRef}
          className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 space-y-4 pb-6 custom-scrollbar scroll-smooth"
          style={{ paddingTop: showHistory ? '72px' : '16px' }}
        >
          {/* HISTORY VIEW */}
          {showHistory ? (
            <div className="space-y-3 animate-fadeIn">
              {anacrusaSessions.length === 0 ? (
                <div className="py-24 px-4 flex flex-col items-center justify-center text-center animate-fadeIn">
                  <p className="text-xs sm:text-sm font-medium opacity-55 max-w-[340px] leading-relaxed select-none whitespace-pre-line">
                    {`Если продолжать музыкальную атмосферу, то пустая история это люди ещё не пришли слушать или уже ушли.
Посреди будет вальс, поэтому так и назовём пустышку

Вальс`}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedSessions.map(session => {
                    const isMenuOpen = sessionMenuOpenId === session.id;
                    const isSessionActive = activeAnacrusaSessionId === session.id;
                    return (
                      <div
                        key={session.id}
                        onClick={() => {
                          setActiveAnacrusaSessionId(session.id);
                          setShowHistory(false);
                        }}
                        className="p-3 rounded-2xl border transition hover:border-white/30 cursor-pointer group relative flex flex-col gap-1.5"
                        style={{
                          backgroundColor: isSessionActive
                            ? hexToRgba(theme.accent, 0.12)
                            : cardBg,
                          borderColor: isSessionActive
                            ? theme.accent
                            : hexToRgba(theme.text, 0.1),
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-bold text-xs sm:text-sm line-clamp-1 group-hover:opacity-100 transition flex items-center gap-1.5 min-w-0 pr-1">
                            {session.pinned && (
                              <Pin
                                size={12}
                                className="shrink-0 fill-current rotate-45"
                                style={{ color: theme.accent }}
                              />
                            )}
                            <span className="truncate">{formatDisplaySessionTitle(session.title)}</span>
                          </div>

                          {/* 3-Dots Action Button & Dropdown Submenu */}
                          <div className="relative shrink-0" ref={isMenuOpen ? sessionMenuRef : undefined}>
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                setSessionMenuOpenId(prev => (prev === session.id ? null : session.id));
                              }}
                              className="p-1 rounded-lg opacity-50 group-hover:opacity-100 hover:bg-white/10 active:scale-90 transition cursor-pointer"
                              style={{ color: theme.text }}
                              title="Опции диалога"
                            >
                              <MoreHorizontal size={15} />
                            </button>

                            {/* Submenu Dropdown */}
                            {isMenuOpen && (
                              <div
                                className="absolute right-0 top-full mt-1 w-44 p-1.5 rounded-2xl border shadow-2xl backdrop-blur-2xl z-50 flex flex-col gap-0.5 text-xs font-semibold animate-fadeIn"
                                style={{
                                  backgroundColor: isLight ? 'rgba(255, 255, 255, 0.98)' : hexToRgba(theme.bg, 0.98),
                                  borderColor: hexToRgba(theme.text, 0.15),
                                  color: theme.text,
                                  boxShadow: `0 10px 30px ${isLight ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.6)'}`,
                                }}
                                onClick={e => e.stopPropagation()}
                              >
                                {/* Pin / Unpin */}
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleTogglePinSession(session);
                                  }}
                                  className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/10 active:scale-98 transition cursor-pointer text-left"
                                >
                                  <Pin
                                    size={13}
                                    style={{ color: theme.accent }}
                                    className={session.pinned ? 'fill-current' : ''}
                                  />
                                  <span>{session.pinned ? 'Открепить' : 'Закрепить'}</span>
                                </button>

                                {/* Rename */}
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setSessionMenuOpenId(null);
                                    setRenameTitle(session.title || 'Новый диалог');
                                    setSessionToRename(session);
                                  }}
                                  className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/10 active:scale-98 transition cursor-pointer text-left"
                                >
                                  <Edit2 size={13} style={{ color: theme.accent }} />
                                  <span>Переименовать</span>
                                </button>

                                {/* Delete */}
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setSessionMenuOpenId(null);
                                    setSessionToDelete(session);
                                  }}
                                  className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-red-500/15 text-red-500 active:scale-98 transition cursor-pointer text-left"
                                >
                                  <Trash2 size={13} />
                                  <span>Удалить</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-[10px] opacity-60 font-mono">
                          <span>{formatTimestamp(session.updatedAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ACTIVE CHAT VIEW */
            <div className="space-y-4 animate-fadeIn">
              {/* Missing API Key Warning */}
              {!hasApiKey && (
                <div
                  className="p-3.5 rounded-2xl border flex items-start gap-3 text-xs animate-fadeIn"
                  style={{
                    backgroundColor: hexToRgba(theme.accent, 0.1),
                    borderColor: hexToRgba(theme.accent, 0.3),
                  }}
                >
                  <AlertCircle size={18} className="shrink-0 mt-0.5" style={{ color: theme.accent }} />
                  <div className="space-y-1.5">
                    <div className="font-bold">
                      {isIonet ? 'Ключ io.net API не настроен' : 'Ключ Cohere API не настроен'}
                    </div>
                    <p className="opacity-75 leading-relaxed text-[11px]">
                      {isIonet
                        ? 'Для работы Anacrusa через io.net укажите API-ключ в настройках.'
                        : 'Для работы Anacrusa укажите бесплатный или платный ключ Cohere в настройках.'}
                    </p>
                    <button
                      onClick={() => {
                        setActiveSettingsTab('ai');
                        setViewMode('settings');
                        closeAnacrusaDrawer();
                      }}
                      className="px-3 py-1.5 rounded-xl font-bold text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                      style={{
                        backgroundColor: theme.accent,
                        color: '#FFFFFF',
                      }}
                    >
                      <span>Настроить ключ</span>
                      <ExternalLink size={12} />
                    </button>
                  </div>
                </div>
              )}

              {/* Error Box */}
              {errorInfo && (
                <div
                  className="p-3 rounded-2xl border flex items-start gap-2.5 text-xs text-red-400 animate-fadeIn"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold">Ошибка запроса</div>
                    <p className="opacity-90 leading-relaxed text-[11px]">{errorInfo.message}</p>
                  </div>
                </div>
              )}

              {/* Minimalist Empty State */}
              {(!activeSession || activeSession.messages.length === 0) && (
                <div className="py-24 px-4 flex flex-col items-center justify-center text-center animate-fadeIn">
                  <p className="text-xs sm:text-sm italic font-medium opacity-55 max-w-[320px] leading-relaxed select-none">
                    ...три. И —
                  </p>
                </div>
              )}

              {/* MESSAGES LIST */}
              {activeSession && activeSession.messages.length > 0 && (
                <div className="space-y-4">
                  {activeSession.messages.map(msg => {
                    const isUser = msg.role === 'user';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
                      >
                        {/* Message Bubble */}
                        <div
                          onTouchStart={isUser ? (e) => handlePromptPressStart(msg, e) : undefined}
                          onTouchEnd={isUser ? handlePromptPressEnd : undefined}
                          onTouchMove={isUser ? handlePromptPressMove : undefined}
                          onTouchCancel={isUser ? handlePromptPressEnd : undefined}
                          onMouseDown={isUser ? (e) => handlePromptMouseDown(msg, e) : undefined}
                          onMouseUp={isUser ? handlePromptPressEnd : undefined}
                          onMouseLeave={isUser ? handlePromptPressEnd : undefined}
                          onContextMenu={isUser ? (e) => handlePromptContextMenu(msg, e) : undefined}
                          className={`p-3.5 rounded-2xl max-w-[90%] sm:max-w-[85%] text-xs sm:text-[13px] leading-relaxed transition select-text ${
                            isUser ? 'rounded-tr-xs cursor-pointer active:scale-[0.99]' : 'rounded-tl-xs border shadow-xs'
                          }`}
                          style={{
                            backgroundColor: isUser
                              ? theme.accent
                              : cardBg,
                            color: isUser ? '#FFFFFF' : theme.text,
                            borderColor: isUser ? 'transparent' : hexToRgba(theme.text, 0.12),
                          }}
                          title={isUser ? "Зажмите, чтобы скопировать или изменить" : undefined}
                        >
                          {/* Attached note badges on user message */}
                          {isUser && msg.attachedNotes && msg.attachedNotes.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {msg.attachedNotes.map(att => (
                                <span
                                  key={att.id}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-black/20 flex items-center gap-1"
                                >
                                  <FileText size={10} />
                                  <span>{att.title || 'Заметка'}</span>
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Message Content with Markdown support */}
                          <div className={`select-text break-words leading-relaxed ${
                            isUser
                              ? 'text-white'
                              : 'text-inherit [&_h1]:text-[15px] [&_h1]:font-extrabold [&_h1]:my-2 [&_h2]:text-[14px] [&_h2]:font-bold [&_h2]:my-1.5 [&_h3]:text-[13px] [&_h3]:font-bold [&_h3]:my-1 [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:my-1.5 [&_li]:my-0.5 [&_strong]:font-bold [&_b]:font-bold [&_em]:italic [&_i]:italic [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-black/15 [&_code]:text-[11px] [&_pre]:p-2.5 [&_pre]:rounded-lg [&_pre]:bg-black/20 [&_pre]:overflow-x-auto [&_blockquote]:border-l-2 [&_blockquote]:pl-2.5 [&_blockquote]:opacity-80'
                          }`}>
                            {isUser ? (
                              <div className="whitespace-pre-wrap">{msg.content}</div>
                            ) : (
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.content}
                              </ReactMarkdown>
                            )}
                          </div>

                          {isUser && copiedAction === `prompt-copy-${msg.id}` && (
                            <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-white/90 justify-end animate-fadeIn">
                              <Check size={11} />
                              <span>Скопировано</span>
                            </div>
                          )}

                          {/* ReAct On-Demand Retrieval / Read Trace */}
                          {msg.readSteps && msg.readSteps.length > 0 && (
                            <div
                              className="mt-2.5 p-2.5 rounded-xl border flex flex-col gap-1.5 text-[11px] transition"
                              style={{
                                backgroundColor: hexToRgba(theme.bg, isLight ? 0.6 : 0.3),
                                borderColor: hexToRgba(theme.text, 0.1),
                              }}
                            >
                              <div className="flex items-center gap-1.5 font-semibold text-[11px] opacity-75">
                                <span>Поиск и чтение данных {msg.readSteps.length}</span>
                              </div>
                              <div className="space-y-1">
                                {msg.readSteps.map((rs, rIdx) => {
                                  let label = '';
                                  let queryDetail = rs.queryOrTarget || '';
                                  if (rs.tool === 'list_workspace_items') {
                                    const target = (rs.queryOrTarget || '').toLowerCase();
                                    if (target.includes('block')) {
                                      label = 'Поиск блоков';
                                      queryDetail = '';
                                    } else if (target.includes('task')) {
                                      label = 'Поиск задач';
                                      queryDetail = '';
                                    } else if (target.includes('tag')) {
                                      label = 'Поиск тегов';
                                      queryDetail = '';
                                    } else {
                                      label = 'Поиск заметок';
                                      queryDetail = '';
                                    }
                                  } else if (rs.tool === 'search_workspace') {
                                    label = 'Поиск в заметках';
                                  } else if (rs.tool === 'get_note_content') {
                                    label = 'Чтение заметки';
                                  } else if (rs.tool === 'get_task_list') {
                                    label = 'Чтение списка';
                                  } else if (rs.tool === 'search_calendar_events') {
                                    label = 'Поиск в календаре';
                                  } else if (rs.tool === 'web_search') {
                                    label = 'Веб-поиск';
                                  } else {
                                    label = rs.tool;
                                  }

                                  return (
                                    <div
                                      key={`rs-${rIdx}`}
                                      className="px-2 py-1 rounded-lg flex items-center justify-between gap-2 opacity-85 text-[10px]"
                                      style={{ backgroundColor: hexToRgba(theme.text, 0.04) }}
                                    >
                                      <div className="flex items-center gap-1.5 truncate">
                                        <span className="font-semibold">{label}</span>
                                        {queryDetail && <span className="truncate opacity-80">{queryDetail}</span>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Interactive Web Search Sources Button & Expandable Modal/List */}
                          {msg.webSearchSources && msg.webSearchSources.length > 0 && (
                            <div className="mt-2.5">
                              {!expandedWebSourcesMsgIds[msg.id] ? (
                                <button
                                  type="button"
                                  onClick={() => toggleWebSources(msg.id)}
                                  className="px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition hover:opacity-90 active:scale-95 cursor-pointer shadow-xs"
                                  style={{
                                    backgroundColor: hexToRgba(theme.accent, isLight ? 0.08 : 0.15),
                                    borderColor: hexToRgba(theme.accent, 0.25),
                                    color: theme.accent,
                                  }}
                                  title="Показать ссылки на источники поиска"
                                >
                                  <Globe size={13} />
                                  <span>Источники ({msg.webSearchSources.length})</span>
                                  <ChevronDown size={13} />
                                </button>
                              ) : (
                                <div
                                  className="p-3 rounded-2xl border flex flex-col gap-2.5 text-xs transition animate-fadeIn shadow-sm"
                                  style={{
                                    backgroundColor: hexToRgba(theme.accent, isLight ? 0.07 : 0.12),
                                    borderColor: hexToRgba(theme.accent, 0.25),
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 font-bold text-[12px]" style={{ color: theme.accent }}>
                                      <Globe size={13} />
                                      <span>Источники и материалы ({msg.webSearchSources.length})</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => toggleWebSources(msg.id)}
                                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
                                      style={{ color: theme.accent }}
                                      title="Скрыть список источников"
                                    >
                                      <span>Закрыть</span>
                                      <ChevronUp size={12} />
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-1 gap-1.5">
                                    {msg.webSearchSources.map((source, sIdx) => {
                                      let domain = '';
                                      try {
                                        domain = new URL(source.url).hostname.replace(/^www\./, '');
                                      } catch {
                                        domain = source.url;
                                      }
                                      return (
                                        <a
                                          key={`src-${sIdx}-${source.url}`}
                                          href={source.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-2 rounded-xl border flex items-center justify-between gap-2.5 transition hover:opacity-90 active:scale-[0.99] group text-left cursor-pointer"
                                          style={{
                                            backgroundColor: hexToRgba(theme.bg, isLight ? 0.85 : 0.45),
                                            borderColor: hexToRgba(theme.text, 0.1),
                                          }}
                                          title={source.url}
                                        >
                                          <div className="min-w-0 flex-1">
                                            <div className="font-semibold text-[11px] truncate group-hover:underline" style={{ color: theme.text }}>
                                              {source.title || domain}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] opacity-60 font-mono mt-0.5 truncate">
                                              <span className="truncate">{domain}</span>
                                              {source.publishedDate && (
                                                <>
                                                  <span>•</span>
                                                  <span className="shrink-0">{source.publishedDate}</span>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                          <ExternalLink size={12} className="shrink-0 opacity-60 group-hover:opacity-100 transition" style={{ color: theme.accent }} />
                                        </a>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Interactive Web Search Permission Prompt */}
                          {msg.pendingWebSearch && msg.pendingWebSearch.status === 'pending' && (
                            <div
                              className="mt-3 p-3.5 rounded-2xl border flex flex-col gap-2.5 text-xs shadow-xs animate-fadeIn"
                              style={{
                                backgroundColor: hexToRgba(theme.accent, isLight ? 0.08 : 0.15),
                                borderColor: hexToRgba(theme.accent, 0.4),
                              }}
                            >
                              <div className="flex items-start gap-2.5">
                                <div
                                  className="p-2 rounded-xl flex items-center justify-center shrink-0"
                                  style={{
                                    backgroundColor: theme.accent,
                                    color: isLightColor(theme.accent) ? '#000' : '#FFF',
                                  }}
                                >
                                  <Globe size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-extrabold text-[12px] flex items-center gap-1.5" style={{ color: theme.accent }}>
                                    <span>Запрос на веб-поиск</span>
                                  </div>
                                  <p className="opacity-80 text-[11px] mt-0.5 leading-snug">
                                    Ассистенту требуется актуальная информация из интернета по поисковому запросу:
                                  </p>
                                  <div
                                    className="mt-1.5 px-2.5 py-1.5 rounded-lg border font-mono text-[11px] font-bold truncate select-all"
                                    style={{
                                      backgroundColor: hexToRgba(theme.bg, 0.8),
                                      borderColor: hexToRgba(theme.accent, 0.25),
                                    }}
                                  >
                                    «{msg.pendingWebSearch.query}»
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: hexToRgba(theme.accent, 0.2) }}>
                                <button
                                  type="button"
                                  disabled={loading}
                                  onClick={() => handleConfirmWebSearch(msg.id, msg.pendingWebSearch!.query, true)}
                                  className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition hover:opacity-90 active:scale-95 cursor-pointer disabled:opacity-50"
                                  style={{
                                    backgroundColor: theme.accent,
                                    color: isLightColor(theme.accent) ? '#000' : '#FFF',
                                  }}
                                >
                                  <Check size={14} />
                                  <span>Да, выполнить поиск</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={loading}
                                  onClick={() => handleConfirmWebSearch(msg.id, msg.pendingWebSearch!.query, false)}
                                  className="px-3 py-2 rounded-xl text-xs font-bold border transition hover:opacity-90 active:scale-95 cursor-pointer opacity-75 hover:opacity-100 disabled:opacity-50"
                                  style={{
                                    borderColor: hexToRgba(theme.text, 0.2),
                                    color: theme.text,
                                    backgroundColor: hexToRgba(theme.text, 0.05),
                                  }}
                                >
                                  <X size={14} />
                                  <span>Нет, ответить без поиска</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Multi-Step Execution Visualization */}
                          {msg.steps && msg.steps.length > 0 && (
                            <div
                              className="mt-3 p-3 rounded-2xl border flex flex-col gap-2 text-xs transition animate-fadeIn"
                              style={{
                                backgroundColor: hexToRgba(theme.accent, isLight ? 0.08 : 0.14),
                                borderColor: hexToRgba(theme.accent, 0.3),
                              }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="font-bold text-[12px]" style={{ color: theme.accent }}>
                                  <span>Шаги выполнения {msg.steps.length}</span>
                                </div>

                                {msg.steps.some(s => s.status === 'undone') ? (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 opacity-75"
                                    style={{ backgroundColor: hexToRgba(theme.text, 0.08) }}
                                  >
                                    <RotateCcw size={10} />
                                    <span>Отменено</span>
                                  </span>
                                ) : null}
                              </div>

                              <div className="space-y-1.5">
                                {msg.steps.map((step, sIdx) => {
                                  const isDone = step.status === 'completed';
                                  const isUndone = step.status === 'undone';

                                  return (
                                    <div
                                      key={step.id || `step-${sIdx}`}
                                      className="p-2 rounded-xl border flex items-center justify-between gap-2 text-xs transition"
                                      style={{
                                        backgroundColor: hexToRgba(theme.bg, isLight ? 0.7 : 0.4),
                                        borderColor: hexToRgba(theme.accent, isDone ? 0.25 : 0.15),
                                        opacity: isUndone ? 0.65 : 1,
                                      }}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span
                                          className="shrink-0 font-mono font-bold text-[12px] text-center"
                                          style={{ color: theme.accent }}
                                        >
                                          {sIdx + 1}
                                        </span>
                                        <div className="min-w-0">
                                          <div className="font-semibold text-[11px] truncate">
                                            <span className={isUndone ? 'line-through' : ''}>{step.summary}</span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0">
                                        {step.tagName && step.action === 'create_tag' && !isUndone && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (step.tagName) {
                                                setSelectedTagFilter(step.tagName);
                                                setViewMode('notes');
                                              }
                                            }}
                                            className="px-2 py-1 rounded-md text-[10px] font-bold transition hover:opacity-90 flex items-center gap-1"
                                            style={{
                                              backgroundColor: step.tagColor || theme.accent,
                                              color: isLightColor(step.tagColor || theme.accent) ? '#000000' : '#FFFFFF',
                                            }}
                                          >
                                            <span>#{step.tagName}</span>
                                          </button>
                                        )}

                                        {step.noteId && (step.action === 'create_note' || step.action === 'update_note' || step.action === 'rename_note' || step.action === 'format_note') && !isUndone && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (step.noteId) {
                                                setActiveNoteId(step.noteId);
                                                setViewMode('editor');
                                              }
                                            }}
                                            className="px-2 py-1 rounded-md text-[10px] font-bold transition hover:opacity-90 flex items-center gap-1"
                                            style={{
                                              backgroundColor: theme.accent,
                                              color: isLightColor(theme.accent) ? '#000000' : '#FFFFFF',
                                            }}
                                          >
                                            <span>Открыть</span>
                                            <ExternalLink size={10} />
                                          </button>
                                        )}

                                        {step.action === 'update_settings' && !isUndone && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setViewMode('settings');
                                            }}
                                            className="px-2 py-1 rounded-md text-[10px] font-bold transition hover:opacity-90 flex items-center gap-1"
                                            style={{
                                              backgroundColor: theme.accent,
                                              color: isLightColor(theme.accent) ? '#000000' : '#FFFFFF',
                                            }}
                                          >
                                            <span>Настройки</span>
                                            <ExternalLink size={10} />
                                          </button>
                                        )}

                                        {step.taskListId && (step.action === 'create_task_list' || step.action === 'update_task_list' || step.action === 'rename_task_list') && !isUndone && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (step.taskListId) {
                                                setActiveTaskId(step.taskListId);
                                              }
                                              setViewMode('tasks');
                                            }}
                                            className="px-2 py-1 rounded-md text-[10px] font-bold transition hover:opacity-90 flex items-center gap-1"
                                            style={{
                                              backgroundColor: theme.accent,
                                              color: isLightColor(theme.accent) ? '#000000' : '#FFFFFF',
                                            }}
                                          >
                                            <span>Открыть</span>
                                            <ExternalLink size={10} />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Fallback Single Interactive Action Card (if no multi-step array) */}
                          {(!msg.steps || msg.steps.length === 0) && msg.noteAction && (
                            <div
                              className="mt-3 p-2.5 rounded-xl border flex items-center justify-between gap-2.5 text-xs transition animate-fadeIn"
                              style={{
                                backgroundColor: hexToRgba(theme.accent, isLight ? 0.1 : 0.16),
                                borderColor: hexToRgba(theme.accent, 0.35),
                              }}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                  style={{
                                    backgroundColor: hexToRgba(theme.accent, 0.25),
                                    color: theme.accent,
                                  }}
                                >
                                  {msg.noteAction.type === 'create_task_list' || msg.noteAction.type === 'update_task_list' || msg.noteAction.type === 'rename_task_list' || msg.noteAction.type === 'delete_task_list' ? (
                                    <ListTodo size={15} />
                                  ) : msg.noteAction.type === 'create_block' ? (
                                    <FolderPlus size={15} />
                                  ) : msg.noteAction.type === 'delete_block' ? (
                                    <FolderX size={15} />
                                  ) : msg.noteAction.type === 'move_notes_to_block' || msg.noteAction.type === 'rename_block' ? (
                                    <Folder size={15} />
                                  ) : msg.noteAction.type === 'create_tag' || msg.noteAction.type === 'delete_tag' ? (
                                    <TagIcon size={15} />
                                  ) : msg.noteAction.type === 'attach_tags' || msg.noteAction.type === 'detach_tags' ? (
                                    <Tags size={15} />
                                  ) : msg.noteAction.type === 'delete_note' ? (
                                    <Trash2 size={15} />
                                  ) : msg.noteAction.type === 'format_note' ? (
                                    <Palette size={15} />
                                  ) : msg.noteAction.type === 'pin_notes' || msg.noteAction.type === 'unpin_notes' ? (
                                    <Pin size={15} />
                                  ) : (
                                    <FileText size={15} />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold truncate text-[12px]">
                                    {msg.noteAction.type === 'create_note'
                                      ? 'Создана заметка'
                                      : msg.noteAction.type === 'rename_note'
                                      ? 'Изменено название'
                                      : msg.noteAction.type === 'delete_note'
                                      ? 'Удалена заметка'
                                      : msg.noteAction.type === 'format_note'
                                      ? 'Форматирование'
                                      : msg.noteAction.type === 'create_tag'
                                      ? 'Создан тег'
                                      : msg.noteAction.type === 'delete_tag'
                                      ? 'Удален тег'
                                      : msg.noteAction.type === 'attach_tags'
                                      ? 'Прикреплены теги'
                                      : msg.noteAction.type === 'detach_tags'
                                      ? 'Сняты теги'
                                      : msg.noteAction.type === 'create_task_list'
                                      ? 'Создан список задач'
                                      : msg.noteAction.type === 'update_task_list'
                                      ? 'Обновлен список задач'
                                      : msg.noteAction.type === 'rename_task_list'
                                      ? 'Переименован список'
                                      : msg.noteAction.type === 'delete_task_list'
                                      ? 'Удален список задач'
                                      : msg.noteAction.type === 'create_block'
                                      ? 'Создан блок'
                                      : msg.noteAction.type === 'rename_block'
                                      ? 'Переименован блок'
                                      : msg.noteAction.type === 'delete_block'
                                      ? 'Удален блок'
                                      : msg.noteAction.type === 'move_notes_to_block'
                                      ? 'Перемещено в блок'
                                      : msg.noteAction.type === 'pin_notes'
                                      ? (msg.noteAction.pinned !== false ? 'Заметка закреплена' : 'Заметка откреплена')
                                      : msg.noteAction.type === 'unpin_notes'
                                      ? 'Заметка откреплена'
                                      : 'Обновлена заметка'}: «{msg.noteAction.title || msg.noteAction.blockName || 'Общие'}»
                                  </div>
                                  <div className="text-[10px] opacity-70 truncate">
                                    {msg.noteAction.summary || (msg.noteAction.type === 'create_note' ? 'Открыта в редакторе' : 'Изменения применены')}
                                  </div>
                                </div>
                              </div>

                              {(msg.noteAction.type === 'create_note' || msg.noteAction.type === 'update_note' || msg.noteAction.type === 'rename_note' || msg.noteAction.type === 'format_note') && msg.noteAction.noteId && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (msg.noteAction?.noteId) {
                                      setActiveNoteId(msg.noteAction.noteId);
                                      setViewMode('editor');
                                    }
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold shrink-0 transition cursor-pointer hover:opacity-90 active:scale-95 flex items-center gap-1"
                                  style={{
                                    backgroundColor: theme.accent,
                                    color: isLightColor(theme.accent) ? '#000000' : '#FFFFFF',
                                  }}
                                >
                                  <span>Открыть</span>
                                  <ExternalLink size={11} />
                                </button>
                              )}

                              {(msg.noteAction.type === 'create_task_list' || msg.noteAction.type === 'update_task_list' || msg.noteAction.type === 'rename_task_list') && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (msg.noteAction?.taskListId) {
                                      setActiveTaskId(msg.noteAction.taskListId);
                                    }
                                    setViewMode('tasks');
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold shrink-0 transition cursor-pointer hover:opacity-90 active:scale-95 flex items-center gap-1"
                                  style={{
                                    backgroundColor: theme.accent,
                                    color: isLightColor(theme.accent) ? '#000000' : '#FFFFFF',
                                  }}
                                >
                                  <span>Открыть</span>
                                  <ExternalLink size={11} />
                                </button>
                              )}

                              {msg.noteAction.type === 'move_notes_to_block' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setViewMode('notes');
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold shrink-0 transition cursor-pointer hover:opacity-90 active:scale-95 flex items-center gap-1"
                                  style={{
                                    backgroundColor: theme.accent,
                                    color: isLightColor(theme.accent) ? '#000000' : '#FFFFFF',
                                  }}
                                >
                                  <span>К заметкам</span>
                                  <ExternalLink size={11} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Assistant Actions Bar */}
                        {!isUser && (
                          <div className="flex items-center gap-1 text-[11px] px-1 flex-wrap">
                            {/* Automatic Undo button if steps can be rolled back */}
                            {msg.steps && msg.steps.some(s => s.status === 'completed' && s.undoPayload) && (
                              <button
                                onClick={() => handleUndoMessageSteps(msg.id)}
                                className="px-2 py-1 rounded-lg hover:bg-white/10 opacity-75 hover:opacity-100 transition flex items-center gap-1 cursor-pointer font-medium"
                                style={{ color: theme.accent }}
                                title="Отменить выполненные изменения"
                              >
                                <Undo2 size={12} />
                                <span className="text-[10px]">Отменить действие</span>
                              </button>
                            )}

                            {/* Copy button */}
                            <button
                              onClick={() => handleCopyMessage(msg.content, msg.id)}
                              className="px-2 py-1 rounded-lg hover:bg-white/10 opacity-75 hover:opacity-100 transition flex items-center gap-1 cursor-pointer"
                              title="Скопировать ответ"
                            >
                              {copiedAction === `copy-${msg.id}` ? (
                                <>
                                  <Check size={12} style={{ color: theme.accent }} />
                                  <span className="text-[10px] font-bold" style={{ color: theme.accent }}>
                                    Скопировано
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Copy size={12} />
                                  <span className="text-[10px]">Копировать</span>
                                </>
                              )}
                            </button>

                            {/* Insert into active note button (if in note editor) */}
                            {viewMode === 'editor' && activeNoteId ? (
                              <button
                                onClick={() => handleInsertIntoNote(msg.content, msg.id)}
                                className="px-2 py-1 rounded-lg hover:bg-white/10 opacity-75 hover:opacity-100 transition flex items-center gap-1 cursor-pointer"
                                title="Вставить ответ в открытую заметку"
                              >
                                {copiedAction === `insert-${msg.id}` ? (
                                  <>
                                    <Check size={12} style={{ color: theme.accent }} />
                                    <span className="text-[10px] font-bold" style={{ color: theme.accent }}>
                                      Вставлено
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Plus size={12} />
                                    <span className="text-[10px]">Вставить в заметку</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              /* Create new note button (if outside note editor) */
                              <button
                                onClick={() => handleCreateNoteFromResponse(msg.content, msg.id)}
                                className="px-2 py-1 rounded-lg hover:bg-white/10 opacity-75 hover:opacity-100 transition flex items-center gap-1 cursor-pointer"
                                title="Создать новую заметку из этого ответа"
                              >
                                <FileText size={12} />
                                <span className="text-[10px]">Создать заметку</span>
                              </button>
                            )}

                            {/* Branch Button */}
                            <button
                              onClick={() => handleCreateBranch(msg.id)}
                              className="px-2 py-1 rounded-lg hover:bg-white/10 opacity-75 hover:opacity-100 transition flex items-center gap-1 cursor-pointer"
                              title="Создать ветку чата из этого ответа"
                            >
                              {copiedAction === `branch-${msg.id}` ? (
                                <>
                                  <Check size={12} style={{ color: theme.accent }} />
                                  <span className="text-[10px] font-bold" style={{ color: theme.accent }}>
                                    Ветка создана
                                  </span>
                                </>
                              ) : (
                                <>
                                  <GitBranch size={12} />
                                  <span className="text-[10px]">Ветка</span>
                                </>
                              )}
                            </button>

                            {/* Redo / Regenerate Response Button & Submenu */}
                            <div className="relative inline-block">
                              <button
                                type="button"
                                onClick={() => setRedoMenuMsgId(prev => prev === msg.id ? null : msg.id)}
                                className="px-2 py-1 rounded-lg hover:bg-white/10 opacity-75 hover:opacity-100 transition flex items-center gap-1 cursor-pointer"
                                title="Переделать ответ"
                                disabled={loading}
                              >
                                <RotateCcw size={12} />
                                <span className="text-[10px]">Переделать</span>
                              </button>

                              {redoMenuMsgId === msg.id && (
                                <div
                                  ref={redoMenuRef}
                                  className="absolute bottom-full mb-1.5 left-0 z-50 p-1.5 rounded-2xl shadow-2xl border min-w-[220px] text-xs space-y-1 animate-fadeIn opacity-100 select-none"
                                  style={{
                                    backgroundColor: isLight ? '#FFFFFF' : '#1C1D22',
                                    borderColor: hexToRgba(theme.text, 0.22),
                                    boxShadow: isLight
                                      ? '0 14px 40px -4px rgba(0, 0, 0, 0.25), 0 4px 12px rgba(0, 0, 0, 0.1)'
                                      : '0 18px 45px -4px rgba(0, 0, 0, 0.9), 0 6px 18px rgba(0, 0, 0, 0.65)',
                                    color: theme.text,
                                  }}
                                >
                                  <div
                                    className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider opacity-50 border-b pb-1 mb-1"
                                    style={{ borderColor: hexToRgba(theme.text, 0.1) }}
                                  >
                                    Переделать ответ
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleRedoResponse(msg.id, 'standard')}
                                    className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-left hover:bg-white/10 active:scale-98 transition cursor-pointer"
                                  >
                                    <RotateCcw size={15} style={{ color: theme.accent }} className="shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <div className="font-semibold text-xs leading-tight">Обычный ответ</div>
                                      <div className="text-[10px] opacity-60 leading-tight">Перегенерировать ответ как есть</div>
                                    </div>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleRedoResponse(msg.id, 'shorter')}
                                    className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-left hover:bg-white/10 active:scale-98 transition cursor-pointer"
                                  >
                                    <Minimize2 size={15} className="shrink-0 text-sky-400" />
                                    <div className="min-w-0 flex-1">
                                      <div className="font-semibold text-xs leading-tight">Сделать короче</div>
                                      <div className="text-[10px] opacity-60 leading-tight">Кратко, сжато и по существу</div>
                                    </div>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleRedoResponse(msg.id, 'longer')}
                                    className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-left hover:bg-white/10 active:scale-98 transition cursor-pointer"
                                  >
                                    <Maximize2 size={15} className="shrink-0 text-amber-400" />
                                    <div className="min-w-0 flex-1">
                                      <div className="font-semibold text-xs leading-tight">Сделать длиннее</div>
                                      <div className="text-[10px] opacity-60 leading-tight">Подробнее, с разбором и деталями</div>
                                    </div>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Loading indicator */}
                  {loading && (
                    <div className="flex items-center gap-2.5 p-2.5 px-3 rounded-2xl border text-xs max-w-fit shadow-xs animate-fadeIn"
                      style={{
                        backgroundColor: cardBg,
                        borderColor: hexToRgba(theme.text, 0.1),
                      }}
                    >
                      <Loader2 size={15} className="animate-spin shrink-0" style={{ color: theme.accent }} />
                      <span className="opacity-75">Anacrusa думает...</span>
                      <button
                        type="button"
                        onClick={handleStopGeneration}
                        className="ml-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 active:scale-95 border"
                        style={{
                          borderColor: hexToRgba(theme.text, 0.25),
                          color: theme.text,
                          backgroundColor: hexToRgba(theme.text, 0.08),
                        }}
                        title="Остановить генерацию"
                      >
                        <Square size={9} className="fill-current" />
                        <span>Остановить</span>
                      </button>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Docked Bottom Input Bar */}
        {!showHistory && (
          <div
            className="shrink-0 px-3 pb-3 sm:px-4 sm:pb-4 pt-1 transition-all space-y-2 relative z-30 bg-transparent"
          >
            {/* Slash Commands Menu Popover */}
            {showSlashMenu && (
              <div
                ref={slashMenuRef}
                className="absolute bottom-full left-3 right-3 mb-2 max-h-64 overflow-y-auto p-1.5 rounded-2xl shadow-2xl border backdrop-blur-2xl z-50 space-y-1 animate-fadeIn"
                style={{
                  backgroundColor: isLight ? hexToRgba(theme.bg, 0.97) : hexToRgba(theme.bg, 0.95),
                  borderColor: cardBorder,
                  boxShadow: `0 14px 40px ${isLight ? 'rgba(0,0,0,0.16)' : 'rgba(0,0,0,0.65)'}`,
                }}
              >
                <div
                  className="px-2 py-1 flex items-center justify-between border-b pb-1.5 mb-1"
                  style={{ borderColor: hexToRgba(theme.text, 0.08) }}
                >
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSlashMenu(true);
                        setShowNotePicker(false);
                      }}
                      className="px-2 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 select-none"
                      style={{
                        backgroundColor: hexToRgba(theme.accent, 0.2),
                        color: theme.accent,
                      }}
                    >
                      <span className="font-mono">/</span> Команды
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSlashMenu(false);
                        setShowNotePicker(true);
                      }}
                      className="px-2 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 select-none hover:bg-white/10"
                      style={{
                        color: theme.text,
                      }}
                    >
                      <span className="font-mono">@</span> Заметки ({attachedNotes.length}/{MAX_ATTACHED_NOTES})
                    </button>
                  </div>
                  <span className="font-mono text-[9px] opacity-60">↑↓ / Enter</span>
                </div>
                {filteredSlashCommands.length === 0 ? (
                  <div className="p-3 text-xs opacity-50 text-center">Команда не найдена</div>
                ) : (
                  filteredSlashCommands.map((cmd, idx) => {
                    const isSelected = idx === selectedSlashIndex;
                    return (
                      <button
                        key={cmd.id}
                        type="button"
                        onClick={() => cmd.action()}
                        onMouseEnter={() => setSelectedSlashIndex(idx)}
                        className={`w-full p-2 rounded-xl flex items-center gap-2.5 text-left transition cursor-pointer text-xs ${
                          isSelected ? 'bg-white/15' : 'hover:bg-white/10'
                        }`}
                        style={isSelected ? { backgroundColor: hexToRgba(theme.accent, 0.15) } : {}}
                      >
                        <div className="p-1.5 rounded-lg bg-black/10 shrink-0">
                          {cmd.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs" style={{ color: theme.accent }}>
                              {cmd.command}
                            </span>
                            <span className="font-semibold truncate">{cmd.title}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* Note Mention / Attach Popover Dropdown */}
            {showNotePicker && (
              <div
                ref={notePickerRef}
                className="absolute bottom-full left-3 right-3 mb-2 max-h-56 overflow-y-auto p-1.5 rounded-2xl shadow-2xl border backdrop-blur-2xl z-50 space-y-1 animate-fadeIn"
                style={{
                  backgroundColor: isLight ? hexToRgba(theme.bg, 0.96) : hexToRgba(theme.bg, 0.92),
                  borderColor: cardBorder,
                  boxShadow: `0 12px 35px ${isLight ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.6)'}`,
                }}
              >
                <div
                  className="px-2 py-1 flex items-center justify-between border-b pb-1.5 mb-1"
                  style={{ borderColor: hexToRgba(theme.text, 0.08) }}
                >
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSlashMenu(true);
                        setShowNotePicker(false);
                      }}
                      className="px-2 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 select-none hover:bg-white/10"
                      style={{
                        color: theme.text,
                      }}
                    >
                      <span className="font-mono">/</span> Команды
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSlashMenu(false);
                        setShowNotePicker(true);
                      }}
                      className="px-2 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 select-none"
                      style={{
                        backgroundColor: hexToRgba(theme.accent, 0.2),
                        color: theme.accent,
                      }}
                    >
                      <span className="font-mono">@</span> Заметки ({attachedNotes.length}/{MAX_ATTACHED_NOTES})
                    </button>
                  </div>
                  <span className="font-mono text-[9px] opacity-60">ESC</span>
                </div>
                {filteredNotes.length === 0 ? (
                  <div className="p-2 text-xs opacity-50 text-center">
                    {attachedNotes.length >= MAX_ATTACHED_NOTES
                      ? `Достигнут лимит (максимум ${MAX_ATTACHED_NOTES} заметок)`
                      : 'Заметки не найдены'}
                  </div>
                ) : (
                  filteredNotes.slice(0, 8).map(n => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleSelectNoteMention(n)}
                      className="w-full p-2 rounded-xl flex items-center gap-2 text-left hover:bg-white/10 transition cursor-pointer text-xs"
                    >
                      <FileText size={14} style={{ color: theme.accent }} />
                      <div className="truncate flex-1 font-semibold">{n.title || 'Без названия'}</div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Active Mode Badges & Attached Note Chips */}
            {(isWebSearchForced || activePromptChips.length > 0 || attachedNotes.length > 0) && (
              <div className="flex flex-wrap items-center gap-1.5 px-1">
                {isWebSearchForced && (
                  <span
                    className="px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 border animate-fadeIn"
                    style={{
                      backgroundColor: 'rgba(14, 165, 233, 0.15)',
                      borderColor: 'rgba(14, 165, 233, 0.35)',
                      color: theme.text,
                    }}
                  >
                    <Globe size={12} className="text-sky-400" />
                    <span>Веб-поиск</span>
                    <button
                      type="button"
                      onClick={() => setIsWebSearchForced(false)}
                      className="hover:opacity-75 p-0.5 transition cursor-pointer"
                      title="Отключить веб-поиск"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {activePromptChips.includes('note') && (
                  <span
                    className="px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 border animate-fadeIn"
                    style={{
                      backgroundColor: hexToRgba(theme.accent, 0.15),
                      borderColor: hexToRgba(theme.accent, 0.35),
                      color: theme.text,
                    }}
                  >
                    <FileText size={12} style={{ color: theme.accent }} />
                    <span>Заметка</span>
                    <button
                      type="button"
                      onClick={() => setActivePromptChips(prev => prev.filter(c => c !== 'note'))}
                      className="hover:opacity-75 p-0.5 transition cursor-pointer"
                      title="Убрать режим заметки"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {activePromptChips.includes('tasks') && (
                  <span
                    className="px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 border animate-fadeIn"
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      borderColor: 'rgba(16, 185, 129, 0.35)',
                      color: theme.text,
                    }}
                  >
                    <ListTodo size={12} className="text-emerald-400" />
                    <span>Задачи</span>
                    <button
                      type="button"
                      onClick={() => setActivePromptChips(prev => prev.filter(c => c !== 'tasks'))}
                      className="hover:opacity-75 p-0.5 transition cursor-pointer"
                      title="Убрать режим задач"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {activePromptChips.includes('event') && (
                  <span
                    className="px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 border animate-fadeIn"
                    style={{
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      borderColor: 'rgba(245, 158, 11, 0.35)',
                      color: theme.text,
                    }}
                  >
                    <CalendarIcon size={12} className="text-amber-400" />
                    <span>Событие</span>
                    <button
                      type="button"
                      onClick={() => setActivePromptChips(prev => prev.filter(c => c !== 'event'))}
                      className="hover:opacity-75 p-0.5 transition cursor-pointer"
                      title="Убрать режим события"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {attachedNotes.map(n => (
                  <span
                    key={n.id}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-medium flex items-center gap-1.5 border animate-fadeIn"
                    style={{
                      backgroundColor: hexToRgba(theme.accent, 0.15),
                      borderColor: hexToRgba(theme.accent, 0.35),
                      color: theme.text,
                    }}
                  >
                    <FileText size={12} style={{ color: theme.accent }} />
                    <span className="truncate max-w-[160px]">{n.title || 'Без названия'}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachedNote(n.id)}
                      className="hover:opacity-75 p-0.5 transition cursor-pointer"
                      title="Убрать контекст"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Main Input Box with optional editing banner */}
            <div
              className="flex flex-col rounded-2xl border transition shadow-xs overflow-hidden"
              style={{
                backgroundColor: hexToRgba(theme.text, isLight ? 0.04 : 0.08),
                borderColor: editingMessageId ? theme.accent : cardBorder,
              }}
            >
              {/* Editing Banner */}
              {editingMessageId && (
                <div
                  className="flex items-center justify-between px-3 py-1.5 border-b text-[11px] font-medium animate-fadeIn"
                  style={{
                    backgroundColor: hexToRgba(theme.accent, 0.1),
                    borderColor: hexToRgba(theme.accent, 0.2),
                    color: theme.accent,
                  }}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Pencil size={11} />
                    <span>Редактирование промпта</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMessageId(null);
                      setInputQuery('');
                      if (textareaRef.current) {
                        textareaRef.current.style.height = '24px';
                      }
                    }}
                    className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition cursor-pointer"
                    title="Отменить редактирование"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 px-2.5 py-1.5">
                {/* Combined @ and / commands & notes trigger button with Shapes icon */}
              <button
                ref={shapesBtnRef}
                type="button"
                onClick={() => {
                  if (showSlashMenu || showNotePicker) {
                    setShowSlashMenu(false);
                    setShowNotePicker(false);
                  } else {
                    setShowSlashMenu(true);
                    setShowNotePicker(false);
                    setSlashFilter('');
                    setSelectedSlashIndex(0);
                  }
                }}
                className="w-7 h-7 rounded-xl hover:bg-white/10 active:scale-95 transition cursor-pointer shrink-0 opacity-80 hover:opacity-100 flex items-center justify-center select-none border"
                style={{
                  borderColor: (showSlashMenu || showNotePicker) ? theme.accent : hexToRgba(theme.text, 0.12),
                  backgroundColor: (showSlashMenu || showNotePicker) ? hexToRgba(theme.accent, 0.18) : 'transparent',
                  color: (showSlashMenu || showNotePicker) ? theme.accent : theme.text,
                }}
                title={`Меню команд (/) и заметок (@) [${attachedNotes.length}/${MAX_ATTACHED_NOTES}]`}
              >
                <Shapes size={14} />
              </button>

              {/* Textarea - Vertically centered */}
              <div className="flex-1 flex items-center min-w-0">
                <textarea
                  ref={textareaRef}
                  value={inputQuery}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Раз, два, три"
                  rows={1}
                  enterKeyHint="enter"
                  className="w-full bg-transparent text-xs sm:text-[13px] outline-hidden resize-none leading-[24px] py-0 transition-all placeholder:opacity-40"
                  style={{
                    color: theme.text,
                    height: '24px',
                    overflowY: 'hidden',
                  }}
                />
              </div>

              {/* Send or Stop Button */}
              <button
                type="button"
                onClick={loading ? handleStopGeneration : () => handleSendMessage()}
                disabled={!loading && !inputQuery.trim()}
                className="p-1.5 rounded-xl transition cursor-pointer shrink-0 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center"
                style={{
                  backgroundColor: loading
                    ? theme.text
                    : (inputQuery.trim() ? theme.accent : 'transparent'),
                  color: loading
                    ? (isLight ? '#FFFFFF' : '#0F172A')
                    : (inputQuery.trim() ? (isLightColor(theme.accent) ? '#000000' : '#FFFFFF') : theme.text),
                }}
                title={loading ? "Остановить генерацию" : "Отправить (Shift + Enter)"}
              >
                {loading ? (
                  <Square size={13} className="fill-current" />
                ) : (
                  <ArrowUp size={16} />
                )}
              </button>
            </div>
          </div>
          </div>
        )}

        {/* Delete Chat Confirmation Modal */}
        {sessionToDelete && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
            onClick={() => setSessionToDelete(null)}
          >
            <div
              className="w-full max-w-sm rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 border backdrop-blur-2xl animate-scaleUp"
              style={{
                backgroundColor: isLight ? hexToRgba(theme.bg, 0.98) : hexToRgba(theme.bg, 0.94),
                borderColor: cardBorder,
                color: theme.text,
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3.5">
                <div className="shrink-0 flex items-center justify-center">
                  <Trash2 size={24} style={{ color: theme.accent }} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Удалить диалог?</h3>
                  <p className="text-xs opacity-60 mt-0.5 line-clamp-2">
                    «{sessionToDelete.title || 'Диалог'}» будет удален безвозвратно.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSessionToDelete(null)}
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
                  type="button"
                  onClick={handleConfirmDeleteSession}
                  className="flex-1 py-3 px-4 rounded-2xl font-bold text-xs active:scale-98 transition cursor-pointer shadow-lg hover:opacity-90"
                  style={{
                    backgroundColor: theme.accent,
                    color: '#FFFFFF',
                  }}
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clear All Sessions Confirmation Modal */}
        {showClearAllModal && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
            onClick={() => setShowClearAllModal(false)}
          >
            <div
              className="w-full max-w-sm rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 border backdrop-blur-2xl animate-scaleUp"
              style={{
                backgroundColor: isLight ? hexToRgba(theme.bg, 0.98) : hexToRgba(theme.bg, 0.94),
                borderColor: cardBorder,
                color: theme.text,
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3.5">
                <div className="shrink-0 flex items-center justify-center">
                  <Trash2 size={24} style={{ color: theme.accent }} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Очистить всю историю?</h3>
                  <p className="text-xs opacity-60 mt-0.5 line-clamp-2">
                    Все диалоги и сообщения будут удалены безвозвратно.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearAllModal(false)}
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
                  type="button"
                  onClick={() => {
                    clearAllAnacrusaSessions();
                    setShowClearAllModal(false);
                  }}
                  className="flex-1 py-3 px-4 rounded-2xl font-bold text-xs active:scale-98 transition cursor-pointer shadow-lg hover:opacity-90"
                  style={{
                    backgroundColor: theme.accent,
                    color: '#FFFFFF',
                  }}
                >
                  Очистить
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rename Chat Modal */}
        {sessionToRename && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
            onClick={() => setSessionToRename(null)}
          >
            <div
              className="w-full max-w-sm rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 border backdrop-blur-2xl animate-scaleUp"
              style={{
                backgroundColor: isLight ? hexToRgba(theme.bg, 0.98) : hexToRgba(theme.bg, 0.94),
                borderColor: cardBorder,
                color: theme.text,
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3.5">
                <div className="shrink-0 flex items-center justify-center">
                  <Edit2 size={24} style={{ color: theme.accent }} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Переименовать диалог</h3>
                  <p className="text-xs opacity-60 mt-0.5">
                    Укажите новое название для этого диалога
                  </p>
                </div>
              </div>

              <input
                type="text"
                value={renameTitle}
                onChange={e => setRenameTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveRename();
                  if (e.key === 'Escape') setSessionToRename(null);
                }}
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-2xl border text-sm font-semibold outline-hidden transition"
                style={{
                  backgroundColor: hexToRgba(theme.text, 0.04),
                  borderColor: cardBorder,
                  color: theme.text,
                }}
                placeholder="Название диалога..."
              />

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setSessionToRename(null)}
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
                  type="button"
                  onClick={handleSaveRename}
                  className="flex-1 py-3 px-4 rounded-2xl font-bold text-xs active:scale-98 transition cursor-pointer shadow-lg hover:opacity-90"
                  style={{
                    backgroundColor: theme.accent,
                    color: '#FFFFFF',
                  }}
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Prompt Context Submenu (Long press or right-click) */}
        {promptMenuMessage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn"
            onClick={() => setPromptMenuMessage(null)}
          >
            <div
              className="w-full max-w-[260px] p-2 rounded-2xl border shadow-2xl flex flex-col gap-1 select-none animate-scaleIn"
              style={{
                backgroundColor: isLight ? '#FFFFFF' : '#1E293B',
                borderColor: hexToRgba(theme.text, 0.15),
                color: theme.text,
              }}
              onClick={e => e.stopPropagation()}
            >
              <div
                className="px-3 py-1.5 border-b text-[11px] font-semibold opacity-60 truncate"
                style={{ borderColor: hexToRgba(theme.text, 0.08) }}
              >
                {promptMenuMessage.content.slice(0, 32)}{promptMenuMessage.content.length > 32 ? '…' : ''}
              </div>

              {/* Copy prompt */}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(promptMenuMessage.content);
                  setCopiedAction(`prompt-copy-${promptMenuMessage.id}`);
                  setPromptMenuMessage(null);
                  setTimeout(() => setCopiedAction(null), 2000);
                }}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer text-left"
              >
                <Copy size={15} style={{ color: theme.accent }} />
                <span>Скопировать</span>
              </button>

              {/* Edit prompt */}
              <button
                type="button"
                onClick={() => {
                  setEditingMessageId(promptMenuMessage.id);
                  setInputQuery(promptMenuMessage.content);
                  setPromptMenuMessage(null);
                  setTimeout(() => {
                    if (textareaRef.current) {
                      textareaRef.current.focus();
                      const len = promptMenuMessage.content.length;
                      textareaRef.current.setSelectionRange(len, len);
                      textareaRef.current.style.height = 'auto';
                      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
                    }
                  }, 60);
                }}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer text-left"
              >
                <Pencil size={15} style={{ color: theme.accent }} />
                <span>Изменить</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
