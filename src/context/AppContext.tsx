import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Note, NoteAttachment, TaskList, ThemePreset, QuickSettings, ViewMode, LanguageCode, LaunchScreen, Tag, Priority, TaskItem, NoteBlock, TaskSortOrder, SearchTarget, CalendarEvent, WebSearchSettings, WebSearchHistoryItem, KanbanColumn, KanbanCard, KanbanChecklistItem, PinUnlockResult } from '../types';
import { DEFAULT_THEME, ALL_THEMES } from '../themes';
import { parseFileToNotes, ImportedNoteData } from '../utils/fileImporter';
import { idbGet, idbSet, idbDelete, safeLocalStorageSet } from '../utils/dbStorage';

export const INITIAL_WEB_SEARCH_SETTINGS: WebSearchSettings = {
  provider: 'tavily',
  tavilyApiKey: '',
  searchDepth: 'basic',
  answerDetail: 'basic',
  maxResults: 5,
};

export const DEFAULT_BLOCKS: NoteBlock[] = [
  { id: 'pinned', name: 'Закреплённые', type: 'pinned' },
  { id: 'general', name: 'Общие', type: 'general' },
];

export const DEFAULT_PRIORITIES: Priority[] = [
  { id: 'p1', name: 'Срочно', color: '#EF4444', level: 1 },
  { id: 'p2', name: 'Высокая', color: '#F97316', level: 2 },
  { id: 'p3', name: 'Средняя', color: '#EAB308', level: 3 },
  { id: 'p4', name: 'Низкая', color: '#22C55E', level: 4 },
  { id: 'p5', name: 'Неважно', color: '#94A3B8', level: 5 },
  { id: 'p6', name: 'когда получится', color: '#2EC4B6', level: 6 },
];

export const KANBAN_PASTEL_COLORS = [
  { name: 'Зеленый', color: '#86EFAC', bg: 'rgba(134, 239, 172, 0.15)' },
  { name: 'Синий', color: '#93C5FD', bg: 'rgba(147, 197, 253, 0.15)' },
  { name: 'Оранжевый', color: '#FDBA74', bg: 'rgba(253, 186, 116, 0.15)' },
  { name: 'Фиолетовый', color: '#C4B5FD', bg: 'rgba(196, 181, 253, 0.15)' },
  { name: 'Розовый', color: '#FDA4AF', bg: 'rgba(253, 164, 175, 0.15)' },
  { name: 'Серый', color: '#CBD5E1', bg: 'rgba(203, 213, 225, 0.15)' },
  { name: 'Желтый', color: '#FDE68A', bg: 'rgba(253, 230, 138, 0.15)' },
  { name: 'Бирюзовый', color: '#5EEAD4', bg: 'rgba(94, 234, 212, 0.15)' },
];
export const KANBAN_COLORS = KANBAN_PASTEL_COLORS;

export const DEFAULT_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'col-todo', title: 'Сделать', color: '#93C5FD', order: 0 },
  { id: 'col-inprogress', title: 'В работе', color: '#FDBA74', order: 1 },
  { id: 'col-done', title: 'Готово', color: '#86EFAC', order: 2 },
];

export const INITIAL_KANBAN_CARDS: KanbanCard[] = [
  {
    id: 'kcard-1',
    columnId: 'col-todo',
    title: 'Настроить процесс',
    description: 'Определить ключевые этапы задач и порядок колонок.',
    color: '#93C5FD',
    tags: ['Старт'],
    checklist: [
      { id: 'kc-1', text: 'Создать нужные колонки', completed: true },
      { id: 'kc-2', text: 'Распределить задачи', completed: false },
    ],
    order: 0,
    createdAt: Date.now() - 3600000 * 4,
    updatedAt: Date.now() - 3600000 * 2,
  },
  {
    id: 'kcard-2',
    columnId: 'col-inprogress',
    title: 'Изучить канбан доску',
    description: 'Проверить перетаскивание карточек, фильтрацию и смену этапов.',
    color: '#FDBA74',
    tags: ['Канбан'],
    priority: { id: 'p2', name: 'Высокая', color: '#F97316', level: 2 },
    order: 0,
    createdAt: Date.now() - 3600000 * 8,
    updatedAt: Date.now() - 3600000 * 1,
  },
  {
    id: 'kcard-3',
    columnId: 'col-done',
    title: 'Первая задача',
    color: '#86EFAC',
    tags: ['Готово'],
    order: 0,
    createdAt: Date.now() - 3600000 * 24,
    updatedAt: Date.now() - 3600000 * 12,
  },
];

const DEFAULT_TAGS: Tag[] = [
  { id: '1', name: 'Работа', color: '#A855F7' },
  { id: '2', name: 'Хобби', color: '#22C55E' },
  { id: '3', name: 'Учёба', color: '#EC4899' },
  { id: '4', name: 'Эго', color: '#EF4444' },
  { id: '5', name: 'Дискредитация', color: '#3B82F6' },
  { id: 'tag-hello', name: 'Здравствуйте)', color: '#2EC4B6' },
];

const INITIAL_NOTES: Note[] = [
  {
    id: 'note-user',
    title: 'Про пользователя',
    content: `Самые, мать его, красивые заметки.
А теперь скажи это про себя.

Давай вместе:
Я — мать его, `,
    pinned: true,
    tags: ['Здравствуйте)'],
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 3600000,
    charCount: 85,
  },
  {
    id: 'note-brand',
    title: 'Про бренд',
    content: `Я не хочу говорить, какие мы крутые.
Но то, что заметки должны вызывать эмоции — я, пожалуй, скажу`,
    pinned: false,
    tags: ['Здравствуйте)'],
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 1,
    charCount: 97,
  },
];

const INITIAL_TASKS: TaskList[] = [
  {
    id: 'task-starter',
    title: 'Стартовые задачи',
    updatedAt: Date.now(),
    priority: { id: 'p6', name: 'когда получится', color: '#2EC4B6' },
    tags: ['Здравствуйте)'],
    items: [
      { id: 'start-1', text: 'Отметьте меня выполненной', completed: false },
      { id: 'start-2', text: 'Выберите удобную тему', completed: false },
      { id: 'start-3', text: 'Запишите что-нибудь', completed: false },
    ],
  },
];

const INITIAL_QUICK_SETTINGS: QuickSettings = {
  showBorder: false,
  showCharCount: true,
  showDate: true,
  showTileMetadata: false,
  tileDisplayMode: 'both',
  hideTileDots: false,
  oneTimeFormatting: true,
  horizontalMainMenu: false,
  pinSearchToHomeScreen: false,
  sidebarTabs: ['notes', 'tasks'],
  actionMenuDisplayMode: 'tiles',
  actionMenuItems: ['calendar', 'kanban', 'trash', 'settings', 'ai', 'webSearch'],
  fontSize: 16,
  lineHeight: 1.6,
  fontFamily: 'sans',
  leftPanelPos: 'Снизу справа',
  rightPanelPos: 'Справа от центра',
  bottomPanelPos: 'Снизу по центру',
};

interface AppContextType {
  notes: Note[];
  taskLists: TaskList[];
  tags: Tag[];
  priorities: Priority[];
  blocks: NoteBlock[];
  theme: ThemePreset;
  quickSettings: QuickSettings;
  viewMode: ViewMode;
  previousViewMode: ViewMode;
  activeSettingsTab: string | null;
  activeNoteId: string | null;
  activeTaskId: string | null;
  sidebarOpen: boolean;
  selectedTagFilter: string | null;
  taskSortOrder: TaskSortOrder;
  searchQuery: string;
  searchTarget: SearchTarget;
  language: LanguageCode;
  launchScreen: LaunchScreen;
  
  deletedNotes: Note[];
  deletedTaskLists: TaskList[];
  events: CalendarEvent[];
  deletedEvents: CalendarEvent[];
  activeReminderEvent: CalendarEvent | null;
  selectedCalendarDate: string;
  setSelectedCalendarDate: (date: string) => void;
  dismissReminder: (eventId: string, forever?: boolean) => void;
  
  // Kanban state & modals
  kanbanColumns: KanbanColumn[];
  kanbanCards: KanbanCard[];
  isKanbanCardModalOpen: boolean;
  editingKanbanCard: KanbanCard | null;
  targetKanbanColumnId: string | null;
  isKanbanColumnModalOpen: boolean;
  editingKanbanColumn: KanbanColumn | null;
  isKanbanQuickViewOpen: boolean;
  quickViewKanbanCard: KanbanCard | null;
  openQuickViewKanbanCardModal: (card: KanbanCard) => void;
  closeQuickViewKanbanCardModal: () => void;
  openCreateKanbanCardModal: (columnId?: string) => void;
  openEditKanbanCardModal: (card: KanbanCard) => void;
  closeKanbanCardModal: () => void;
  openCreateKanbanColumnModal: (editColumn?: KanbanColumn | null) => void;
  closeKanbanColumnModal: () => void;
  createKanbanColumn: (title: string, color?: string) => KanbanColumn;
  updateKanbanColumn: (id: string, updates: Partial<KanbanColumn>) => void;
  deleteKanbanColumn: (id: string, deleteCards?: boolean, targetColumnId?: string) => void;
  moveKanbanColumn: (id: string, direction: 'left' | 'right' | 'up' | 'down') => void;
  reorderKanbanColumns: (orderedColumnIds: string[]) => void;
  createKanbanCard: (columnId: string, cardData: Partial<KanbanCard>) => KanbanCard;
  updateKanbanCard: (id: string, updates: Partial<KanbanCard>) => void;
  deleteKanbanCard: (id: string) => void;
  moveKanbanCard: (cardId: string, targetColumnId: string, newIndex?: number) => void;
  reorderKanbanCardsInColumn: (columnId: string, orderedCardIds: string[]) => void;

  // Modals state
  isQuickSettingsOpen: boolean;
  isTagSearchOpen: boolean;
  isNoteSearchOpen: boolean;
  isAIPromptOpen: boolean;
  isWebSearchOpen: boolean;
  webSearchSettings: WebSearchSettings;
  setWebSearchSettings: React.Dispatch<React.SetStateAction<WebSearchSettings>>;
  searchHistory: WebSearchHistoryItem[];
  addSearchHistoryItem: (item: { query: string; response: WebSearchHistoryItem['response'] }) => void;
  deleteSearchHistoryItem: (id: string) => void;
  clearSearchHistory: () => void;
  isTaskModalOpen: boolean;
  editingTaskList: TaskList | null;
  isExportModalOpen: boolean;
  exportTargetNoteId: string | null;
  isCreateBlockModalOpen: boolean;
  blockModalInitialNoteIds: string[];
  editingBlock: NoteBlock | null;
  isDeleteBlockModalOpen: boolean;
  blockToDelete: NoteBlock | null;

  // Setters & Operations
  setTheme: (theme: ThemePreset) => void;
  setQuickSettings: React.Dispatch<React.SetStateAction<QuickSettings>>;
  updateQuickSettings: (updates: Partial<QuickSettings>) => void;
  setViewMode: (view: ViewMode) => void;
  setActiveSettingsTab: (tab: string | null) => void;
  setActiveNoteId: (id: string | null) => void;
  setActiveTaskId: (id: string | null) => void;
  setSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setSelectedTagFilter: (tag: string | null) => void;
  setTaskSortOrder: (order: TaskSortOrder) => void;
  setSearchQuery: (query: string) => void;
  setSearchTarget: (target: SearchTarget) => void;
  setLanguage: (lang: LanguageCode) => void;
  setLaunchScreen: (screen: LaunchScreen) => void;

  setIsQuickSettingsOpen: (open: boolean) => void;
  setIsTagSearchOpen: (open: boolean) => void;
  setIsNoteSearchOpen: (open: boolean) => void;
  setIsAIPromptOpen: (open: boolean) => void;
  setIsWebSearchOpen: (open: boolean) => void;
  insertTextIntoActiveNote: (text: string) => void;
  setIsExportModalOpen: (open: boolean) => void;
  openExportModal: (noteId?: string) => void;
  openCreateTaskListModal: () => void;
  openEditTaskListModal: (listId: string) => void;
  closeTaskModal: () => void;

  // Block Operations
  createBlock: (name: string, noteIds?: string[]) => NoteBlock;
  updateBlock: (id: string, name: string) => void;
  deleteBlock: (id: string) => void;
  openDeleteBlockModal: (block: NoteBlock) => void;
  closeDeleteBlockModal: () => void;
  confirmDeleteBlock: (blockId: string, action: 'transfer' | 'delete_notes', targetBlockId?: string | null) => void;
  moveBlock: (id: string, direction: 'up' | 'down') => void;
  moveNoteInBlock: (noteId: string, direction: 'up' | 'down') => void;
  moveNotesToBlock: (noteIds: string[], targetBlockId: string | null) => void;
  openCreateBlockModal: (initialNoteIds?: string[], editBlock?: NoteBlock | null) => void;
  closeCreateBlockModal: () => void;

  // Tag & Priority CRUD
  deleteTagByName: (tagName: string) => void;
  createTag: (name: string, color?: string) => Tag;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  toggleNoteTag: (noteId: string, tagName: string) => void;
  createPriority: (name: string, color?: string, level?: number) => Priority;
  updatePriority: (id: string, updates: Partial<Priority>) => void;
  deletePriority: (id: string) => void;

  // Trash Operations
  restoreNote: (id: string) => void;
  restoreTaskList: (id: string) => void;
  permanentlyDeleteNote: (id: string) => void;
  permanentlyDeleteTaskList: (id: string) => void;
  clearAllDeletedNotes: () => void;
  clearAllDeletedTaskLists: () => void;
  restoreAllDeletedNotes: () => void;
  restoreAllDeletedTaskLists: () => void;
  restoreCalendarEvent: (id: string) => void;
  permanentlyDeleteCalendarEvent: (id: string) => void;
  clearAllDeletedCalendarEvents: () => void;
  restoreAllDeletedCalendarEvents: () => void;

  // Calendar CRUD
  createCalendarEvent: (eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => CalendarEvent;
  updateCalendarEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteCalendarEvent: (id: string) => void;

  // Note CRUD
  createNote: (title?: string, content?: string) => Note;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  duplicateNote: (id: string) => Note | undefined;
  togglePinNote: (id: string) => void;
  addAttachmentToNote: (noteId: string, attachment: NoteAttachment) => boolean;
  deleteAttachmentFromNote: (noteId: string, attachmentId: string) => void;
  updateAttachmentInNote: (noteId: string, attachmentId: string, updates: Partial<NoteAttachment>) => void;
  reorderAttachmentsInNote: (noteId: string, attachmentId: string, direction: 'up' | 'down') => void;
  moveAttachmentIndex: (noteId: string, fromIndex: number, toIndex: number) => void;

  // Task CRUD
  createTaskList: (title?: string) => TaskList;
  saveTaskList: (listData: { id?: string; title: string; items: TaskItem[]; tags?: string[]; priority?: Priority | null }) => TaskList;
  updateTaskList: (id: string, updates: Partial<TaskList>) => void;
  deleteTaskList: (id: string) => void;
  addTaskItem: (listId: string, text: string) => void;
  toggleTaskItem: (listId: string, itemId: string) => void;
  deleteTaskItem: (listId: string, itemId: string) => void;
  createNoteFromTaskList: (listId: string) => Note;

  // History Undo/Redo for active note
  undoNoteContent: () => void;
  redoNoteContent: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // PIN & Security (App Lock)
  appPin: string | null;
  isAppLocked: boolean;
  unlockApp: (pin: string) => PinUnlockResult;
  setAppPin: (pin: string) => void;
  removeAppPin: () => void;
  lockApp: () => void;
  appLockoutUntil: number;
  appFailedAttempts: number;

  // PIN & Security (Private Space)
  privatePin: string | null;
  isPrivateLocked: boolean;
  unlockPrivateSpace: (pin: string) => PinUnlockResult;
  setPrivatePin: (pin: string) => void;
  removePrivatePin: () => void;
  lockPrivateSpace: () => void;
  resetPrivateSpace: () => void;
  privateLockoutUntil: number;
  privateFailedAttempts: number;

  // Reset & Import
  resetAllData: () => void;
  importFiles: (files: FileList | File[]) => Promise<{ count: number; errors: string[] }>;
  importNotesData: (notesData: { title: string; content: string; tags?: string[] }[]) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('veris_notes');
    if (!saved) return INITIAL_NOTES;
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : INITIAL_NOTES;
    } catch {
      return INITIAL_NOTES;
    }
  });

  const [taskLists, setTaskLists] = useState<TaskList[]>(() => {
    const saved = localStorage.getItem('veris_task_lists');
    if (!saved) return INITIAL_TASKS;
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : INITIAL_TASKS;
    } catch {
      return INITIAL_TASKS;
    }
  });

  const [deletedNotes, setDeletedNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('veris_deleted_notes');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [deletedTaskLists, setDeletedTaskLists] = useState<TaskList[]>(() => {
    const saved = localStorage.getItem('veris_deleted_task_lists');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const saved = localStorage.getItem('veris_calendar_events');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [deletedEvents, setDeletedEvents] = useState<CalendarEvent[]>(() => {
    const saved = localStorage.getItem('veris_deleted_calendar_events');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [kanbanColumns, setKanbanColumns] = useState<KanbanColumn[]>(() => {
    const saved = localStorage.getItem('veris_kanban_columns');
    if (!saved) return DEFAULT_KANBAN_COLUMNS;
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_KANBAN_COLUMNS;
    } catch {
      return DEFAULT_KANBAN_COLUMNS;
    }
  });

  const [kanbanCards, setKanbanCards] = useState<KanbanCard[]>(() => {
    const saved = localStorage.getItem('veris_kanban_cards');
    if (!saved) return INITIAL_KANBAN_CARDS;
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : INITIAL_KANBAN_CARDS;
    } catch {
      return INITIAL_KANBAN_CARDS;
    }
  });

  const [isKanbanCardModalOpen, setIsKanbanCardModalOpen] = useState<boolean>(false);
  const [editingKanbanCard, setEditingKanbanCard] = useState<KanbanCard | null>(null);
  const [targetKanbanColumnId, setTargetKanbanColumnId] = useState<string | null>(null);
  const [isKanbanColumnModalOpen, setIsKanbanColumnModalOpen] = useState<boolean>(false);
  const [editingKanbanColumn, setEditingKanbanColumn] = useState<KanbanColumn | null>(null);
  const [isKanbanQuickViewOpen, setIsKanbanQuickViewOpen] = useState<boolean>(false);
  const [quickViewKanbanCard, setQuickViewKanbanCard] = useState<KanbanCard | null>(null);

  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const [activeReminderEvent, setActiveReminderEvent] = useState<CalendarEvent | null>(null);

  const [tags, setTags] = useState<Tag[]>(() => {
    const saved = localStorage.getItem('veris_tags');
    if (!saved) return DEFAULT_TAGS;
    try {
      const parsed: Tag[] = JSON.parse(saved);
      if (!Array.isArray(parsed)) return DEFAULT_TAGS;
      const hasHello = parsed.some(t => t.name === 'Здравствуйте)');
      if (!hasHello) {
        return [...parsed, { id: 'tag-hello', name: 'Здравствуйте)', color: '#2EC4B6' }];
      }
      return parsed;
    } catch {
      return DEFAULT_TAGS;
    }
  });

  const [priorities, setPriorities] = useState<Priority[]>(() => {
    const saved = localStorage.getItem('veris_priorities');
    if (!saved) return DEFAULT_PRIORITIES;
    try {
      const parsed: Priority[] = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p, idx) => ({
          ...p,
          level: typeof p.level === 'number' ? p.level : idx + 1,
        }));
      }
      return DEFAULT_PRIORITIES;
    } catch {
      return DEFAULT_PRIORITIES;
    }
  });

  const [blocks, setBlocks] = useState<NoteBlock[]>(() => {
    const saved = localStorage.getItem('veris_blocks');
    if (!saved) return DEFAULT_BLOCKS;
    try {
      const parsed: NoteBlock[] = JSON.parse(saved);
      if (!Array.isArray(parsed)) return DEFAULT_BLOCKS;
      if (!parsed.some(b => b.id === 'pinned')) {
        parsed.unshift({ id: 'pinned', name: 'Закреплённые', type: 'pinned' });
      }
      if (!parsed.some(b => b.id === 'general')) {
        parsed.push({ id: 'general', name: 'Общие', type: 'general' });
      }
      return parsed;
    } catch {
      return DEFAULT_BLOCKS;
    }
  });

  const [isCreateBlockModalOpen, setIsCreateBlockModalOpen] = useState<boolean>(false);
  const [blockModalInitialNoteIds, setBlockModalInitialNoteIds] = useState<string[]>([]);
  const [editingBlock, setEditingBlock] = useState<NoteBlock | null>(null);
  const [isDeleteBlockModalOpen, setIsDeleteBlockModalOpen] = useState<boolean>(false);
  const [blockToDelete, setBlockToDelete] = useState<NoteBlock | null>(null);

  const [theme, setThemeState] = useState<ThemePreset>(() => {
    const savedId = localStorage.getItem('veris_theme_id');
    if (savedId) {
      const found = ALL_THEMES.find(t => t.id === savedId);
      if (found) return found;
    }
    return DEFAULT_THEME;
  });

  const [quickSettings, setQuickSettings] = useState<QuickSettings>(() => {
    const saved = localStorage.getItem('veris_quick_settings');
    if (!saved) return INITIAL_QUICK_SETTINGS;
    try {
      const parsed = JSON.parse(saved);
      return typeof parsed === 'object' && parsed !== null
        ? { ...INITIAL_QUICK_SETTINGS, ...parsed }
        : INITIAL_QUICK_SETTINGS;
    } catch {
      return INITIAL_QUICK_SETTINGS;
    }
  });

  const updateQuickSettings = useCallback((updates: Partial<QuickSettings>) => {
    setQuickSettings(prev => {
      const next = { ...prev, ...updates };
      safeLocalStorageSet('veris_quick_settings', next);
      return next;
    });
  }, []);

  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem('veris_language');
    return (saved as LanguageCode) || 'ru';
  });

  const [launchScreen, setLaunchScreenState] = useState<LaunchScreen>(() => {
    const saved = localStorage.getItem('veris_launch_screen');
    return (saved as LaunchScreen) || 'notes';
  });

  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    const savedLaunch = localStorage.getItem('veris_launch_screen') as LaunchScreen;
    if (savedLaunch === 'editor') return 'editor';
    if (savedLaunch === 'tasks') return 'tasks';
    return 'notes';
  });

  const [previousViewMode, setPreviousViewMode] = useState<ViewMode>('notes');
  const [activeSettingsTab, setActiveSettingsTab] = useState<string | null>(null);

  const setViewMode = (newMode: ViewMode) => {
    if (newMode === 'settings' && viewMode !== 'settings') {
      setPreviousViewMode(viewMode);
      setActiveSettingsTab(null);
    } else if (newMode !== 'settings') {
      setActiveSettingsTab(null);
    }
    setViewModeState(newMode);
  };

  const setLaunchScreen = (screen: LaunchScreen) => {
    setLaunchScreenState(screen);
    localStorage.setItem('veris_launch_screen', screen);
  };
  const [activeNoteId, setActiveNoteId] = useState<string | null>(() => {
    const savedNotes = localStorage.getItem('veris_notes');
    if (savedNotes) {
      try {
        const parsed = JSON.parse(savedNotes);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed[0].id;
        }
      } catch {}
    }
    return INITIAL_NOTES[0]?.id || null;
  });
  const [activeTaskId, setActiveTaskId] = useState<string | null>(() => {
    const savedTasks = localStorage.getItem('veris_task_lists');
    if (savedTasks) {
      try {
        const parsed = JSON.parse(savedTasks);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed[0].id;
        }
      } catch {}
    }
    return INITIAL_TASKS[0]?.id || null;
  });
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [taskSortOrder, setTaskSortOrderState] = useState<TaskSortOrder>(() => {
    const saved = localStorage.getItem('veris_task_sort_order');
    if (saved === 'newest' || saved === 'oldest' || saved === 'most_important' || saved === 'least_important') {
      return saved;
    }
    return 'newest';
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchTarget, setSearchTarget] = useState<SearchTarget>('all');

  const setTaskSortOrder = (order: TaskSortOrder) => {
    setTaskSortOrderState(order);
    localStorage.setItem('veris_task_sort_order', order);
  };

  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState<boolean>(false);
  const [isTagSearchOpen, setIsTagSearchOpen] = useState<boolean>(false);
  const [isNoteSearchOpen, setIsNoteSearchOpen] = useState<boolean>(false);
  const [isAIPromptOpen, setIsAIPromptOpen] = useState<boolean>(false);
  const [isWebSearchOpen, setIsWebSearchOpen] = useState<boolean>(false);

  const [webSearchSettings, setWebSearchSettings] = useState<WebSearchSettings>(() => {
    const saved = localStorage.getItem('veris_web_search_settings');
    if (!saved) return INITIAL_WEB_SEARCH_SETTINGS;
    try {
      const parsed = JSON.parse(saved);
      return typeof parsed === 'object' && parsed !== null
        ? { ...INITIAL_WEB_SEARCH_SETTINGS, ...parsed }
        : INITIAL_WEB_SEARCH_SETTINGS;
    } catch {
      return INITIAL_WEB_SEARCH_SETTINGS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('veris_web_search_settings', JSON.stringify(webSearchSettings));
    } catch {}
  }, [webSearchSettings]);

  // Web Search History State (Persisted in localStorage)
  const [searchHistory, setSearchHistory] = useState<WebSearchHistoryItem[]>(() => {
    const saved = localStorage.getItem('veris_web_search_history');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('veris_web_search_history', JSON.stringify(searchHistory));
    } catch {}
  }, [searchHistory]);

  const addSearchHistoryItem = useCallback((item: { query: string; response: WebSearchHistoryItem['response'] }) => {
    const newItem: WebSearchHistoryItem = {
      id: `sh-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      query: item.query,
      timestamp: Date.now(),
      response: item.response,
    };
    setSearchHistory(prev => {
      // Remove any existing duplicate queries to keep the newest at the top
      const filtered = prev.filter(h => h.query.toLowerCase().trim() !== item.query.toLowerCase().trim());
      // Keep up to 50 recent searches
      return [newItem, ...filtered].slice(0, 50);
    });
  }, []);

  const deleteSearchHistoryItem = useCallback((id: string) => {
    setSearchHistory(prev => prev.filter(h => h.id !== id));
  }, []);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
  }, []);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [editingTaskList, setEditingTaskList] = useState<TaskList | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportTargetNoteId, setExportTargetNoteId] = useState<string | null>(null);

  const openExportModal = (noteId?: string) => {
    setExportTargetNoteId(noteId || null);
    setIsExportModalOpen(true);
  };

  // Helper for brute force progressive lockout calculation
  const getLockoutDuration = (attempts: number): number => {
    if (attempts <= 5) return 60; // 1 min
    if (attempts === 6) return 300; // 5 min
    if (attempts === 7) return 900; // 15 min
    if (attempts === 8) return 1800; // 30 min
    return 3600; // 60 min
  };

  // APP PIN SECURITY
  const [appPin, setAppPinState] = useState<string | null>(() => {
    return localStorage.getItem('veris_app_pin') || null;
  });
  const [isAppLocked, setIsAppLocked] = useState<boolean>(() => {
    const savedPin = localStorage.getItem('veris_app_pin');
    return Boolean(savedPin);
  });
  const [appFailedAttempts, setAppFailedAttempts] = useState<number>(() => {
    const saved = localStorage.getItem('veris_app_failed_attempts');
    return saved ? parseInt(saved, 10) || 0 : 0;
  });
  const [appLockoutUntil, setAppLockoutUntil] = useState<number>(() => {
    const saved = localStorage.getItem('veris_app_lockout_until');
    return saved ? parseInt(saved, 10) || 0 : 0;
  });

  const unlockApp = (pin: string): PinUnlockResult => {
    if (!appPin) {
      setIsAppLocked(false);
      return { success: true };
    }

    const now = Date.now();
    if (appLockoutUntil && now < appLockoutUntil) {
      const remainingSeconds = Math.ceil((appLockoutUntil - now) / 1000);
      return {
        success: false,
        error: `Блокировка. Попробуйте через ${remainingSeconds} сек.`,
        lockoutSeconds: remainingSeconds,
        attemptsLeft: 0,
      };
    }

    if (pin === appPin) {
      setAppFailedAttempts(0);
      setAppLockoutUntil(0);
      localStorage.removeItem('veris_app_failed_attempts');
      localStorage.removeItem('veris_app_lockout_until');
      setIsAppLocked(false);
      return { success: true };
    } else {
      const newAttempts = appFailedAttempts + 1;
      setAppFailedAttempts(newAttempts);
      localStorage.setItem('veris_app_failed_attempts', String(newAttempts));

      if (newAttempts >= 5) {
        const lockoutSecs = getLockoutDuration(newAttempts);
        const lockoutTime = now + lockoutSecs * 1000;
        setAppLockoutUntil(lockoutTime);
        localStorage.setItem('veris_app_lockout_until', String(lockoutTime));
        return {
          success: false,
          error: `Превышено количество попыток. Блокировка на ${Math.ceil(lockoutSecs / 60)} мин.`,
          lockoutSeconds: lockoutSecs,
          attemptsLeft: 0,
        };
      } else {
        const attemptsLeft = 5 - newAttempts;
        return {
          success: false,
          error: `Неверный пин-код. Осталось попыток: ${attemptsLeft}`,
          attemptsLeft,
        };
      }
    }
  };

  const setAppPin = (newPin: string) => {
    const cleanPin = newPin.trim();
    if (cleanPin.length >= 1 && cleanPin.length <= 12) {
      localStorage.setItem('veris_app_pin', cleanPin);
      setAppPinState(cleanPin);
      setIsAppLocked(false);
    }
  };

  const removeAppPin = () => {
    localStorage.removeItem('veris_app_pin');
    localStorage.removeItem('veris_app_failed_attempts');
    localStorage.removeItem('veris_app_lockout_until');
    setAppPinState(null);
    setIsAppLocked(false);
    setAppFailedAttempts(0);
    setAppLockoutUntil(0);
  };

  const lockApp = () => {
    if (appPin) {
      setIsAppLocked(true);
    }
  };

  // PRIVATE SPACE SECURITY
  const [privatePin, setPrivatePinState] = useState<string | null>(() => {
    return localStorage.getItem('veris_private_pin') || null;
  });
  const [isPrivateLocked, setIsPrivateLocked] = useState<boolean>(() => {
    const savedPin = localStorage.getItem('veris_private_pin');
    return Boolean(savedPin);
  });
  const [privateFailedAttempts, setPrivateFailedAttempts] = useState<number>(() => {
    const saved = localStorage.getItem('veris_private_failed_attempts');
    return saved ? parseInt(saved, 10) || 0 : 0;
  });
  const [privateLockoutUntil, setPrivateLockoutUntil] = useState<number>(() => {
    const saved = localStorage.getItem('veris_private_lockout_until');
    return saved ? parseInt(saved, 10) || 0 : 0;
  });

  const unlockPrivateSpace = (pin: string): PinUnlockResult => {
    if (!privatePin) {
      setIsPrivateLocked(false);
      return { success: true };
    }

    const now = Date.now();
    if (privateLockoutUntil && now < privateLockoutUntil) {
      const remainingSeconds = Math.ceil((privateLockoutUntil - now) / 1000);
      return {
        success: false,
        error: `Блокировка. Попробуйте через ${remainingSeconds} сек.`,
        lockoutSeconds: remainingSeconds,
        attemptsLeft: 0,
      };
    }

    if (pin === privatePin) {
      setPrivateFailedAttempts(0);
      setPrivateLockoutUntil(0);
      localStorage.removeItem('veris_private_failed_attempts');
      localStorage.removeItem('veris_private_lockout_until');
      setIsPrivateLocked(false);
      return { success: true };
    } else {
      const newAttempts = privateFailedAttempts + 1;
      setPrivateFailedAttempts(newAttempts);
      localStorage.setItem('veris_private_failed_attempts', String(newAttempts));

      if (newAttempts >= 5) {
        const lockoutSecs = getLockoutDuration(newAttempts);
        const lockoutTime = now + lockoutSecs * 1000;
        setPrivateLockoutUntil(lockoutTime);
        localStorage.setItem('veris_private_lockout_until', String(lockoutTime));
        return {
          success: false,
          error: `Превышено количество попыток. Блокировка на ${Math.ceil(lockoutSecs / 60)} мин.`,
          lockoutSeconds: lockoutSecs,
          attemptsLeft: 0,
        };
      } else {
        const attemptsLeft = 5 - newAttempts;
        return {
          success: false,
          error: `Неверный пин-код. Осталось попыток: ${attemptsLeft}`,
          attemptsLeft,
        };
      }
    }
  };

  const setPrivatePin = (newPin: string) => {
    const cleanPin = newPin.trim();
    if (cleanPin.length >= 1 && cleanPin.length <= 12) {
      localStorage.setItem('veris_private_pin', cleanPin);
      setPrivatePinState(cleanPin);
      setIsPrivateLocked(false);
    }
  };

  const removePrivatePin = () => {
    localStorage.removeItem('veris_private_pin');
    localStorage.removeItem('veris_private_failed_attempts');
    localStorage.removeItem('veris_private_lockout_until');
    setPrivatePinState(null);
    setIsPrivateLocked(false);
    setPrivateFailedAttempts(0);
    setPrivateLockoutUntil(0);
  };

  const lockPrivateSpace = () => {
    if (privatePin) {
      setIsPrivateLocked(true);
    }
  };

  const resetPrivateSpace = () => {
    removePrivatePin();
    setNotes(prev =>
      prev.map(n => (n.isPrivate ? { ...n, isPrivate: false } : n))
    );
  };

  // Undo / Redo history stack for current note content
  const [history, setHistory] = useState<Record<string, string[]>>({});
  const [historyIndex, setHistoryIndex] = useState<Record<string, number>>({});

  // Hydrate from IndexedDB on startup for full large-media fidelity
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [savedNotes, savedTasks, savedDeletedNotes, savedDeletedTasks, savedEvents, savedDeletedEvents, savedKanbanCols, savedKanbanCards] = await Promise.all([
          idbGet<Note[]>('veris_notes'),
          idbGet<TaskList[]>('veris_task_lists'),
          idbGet<Note[]>('veris_deleted_notes'),
          idbGet<TaskList[]>('veris_deleted_task_lists'),
          idbGet<CalendarEvent[]>('veris_calendar_events'),
          idbGet<CalendarEvent[]>('veris_deleted_calendar_events'),
          idbGet<KanbanColumn[]>('veris_kanban_columns'),
          idbGet<KanbanCard[]>('veris_kanban_cards'),
        ]);
        if (!isMounted) return;
        if (savedNotes && Array.isArray(savedNotes) && savedNotes.length > 0) {
          setNotes(savedNotes);
        }
        if (savedTasks && Array.isArray(savedTasks) && savedTasks.length > 0) {
          setTaskLists(savedTasks);
        }
        if (savedDeletedNotes && Array.isArray(savedDeletedNotes)) {
          setDeletedNotes(savedDeletedNotes);
        }
        if (savedDeletedTasks && Array.isArray(savedDeletedTasks)) {
          setDeletedTaskLists(savedDeletedTasks);
        }
        if (savedEvents && Array.isArray(savedEvents)) {
          setEvents(savedEvents);
        }
        if (savedDeletedEvents && Array.isArray(savedDeletedEvents)) {
          setDeletedEvents(savedDeletedEvents);
        }
        if (savedKanbanCols && Array.isArray(savedKanbanCols) && savedKanbanCols.length > 0) {
          setKanbanColumns(savedKanbanCols);
        }
        if (savedKanbanCards && Array.isArray(savedKanbanCards)) {
          setKanbanCards(savedKanbanCards);
        }
      } catch (err) {
        console.warn('IndexedDB initial load note:', err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Persist values
  useEffect(() => {
    idbSet('veris_notes', notes);
    safeLocalStorageSet('veris_notes', notes);
  }, [notes]);

  useEffect(() => {
    idbSet('veris_task_lists', taskLists);
    safeLocalStorageSet('veris_task_lists', taskLists);
  }, [taskLists]);

  useEffect(() => {
    idbSet('veris_kanban_columns', kanbanColumns);
    safeLocalStorageSet('veris_kanban_columns', kanbanColumns);
  }, [kanbanColumns]);

  useEffect(() => {
    idbSet('veris_kanban_cards', kanbanCards);
    safeLocalStorageSet('veris_kanban_cards', kanbanCards);
  }, [kanbanCards]);

  useEffect(() => {
    idbSet('veris_deleted_notes', deletedNotes);
    safeLocalStorageSet('veris_deleted_notes', deletedNotes);
  }, [deletedNotes]);

  useEffect(() => {
    idbSet('veris_deleted_task_lists', deletedTaskLists);
    safeLocalStorageSet('veris_deleted_task_lists', deletedTaskLists);
  }, [deletedTaskLists]);

  useEffect(() => {
    idbSet('veris_calendar_events', events);
    safeLocalStorageSet('veris_calendar_events', events);
  }, [events]);

  useEffect(() => {
    idbSet('veris_deleted_calendar_events', deletedEvents);
    safeLocalStorageSet('veris_deleted_calendar_events', deletedEvents);
  }, [deletedEvents]);

  // Check for today's reminders on mount and whenever events change
  useEffect(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    let sessionDismissed: string[] = [];
    try {
      const stored = sessionStorage.getItem('veris_session_dismissed_reminders');
      if (stored) sessionDismissed = JSON.parse(stored);
    } catch {
      sessionDismissed = [];
    }

    const todayEventsWithReminder = events.filter(
      ev =>
        !ev.deleted &&
        ev.remindOnDay &&
        ev.date === todayStr &&
        !ev.reminderDismissedForever &&
        !sessionDismissed.includes(ev.id)
    );

    if (todayEventsWithReminder.length > 0) {
      setActiveReminderEvent(todayEventsWithReminder[0]);
    }
  }, [events]);

  useEffect(() => {
    safeLocalStorageSet('veris_quick_settings', quickSettings);
  }, [quickSettings]);

  useEffect(() => {
    safeLocalStorageSet('veris_tags', tags);
  }, [tags]);

  useEffect(() => {
    safeLocalStorageSet('veris_priorities', priorities);
  }, [priorities]);

  useEffect(() => {
    safeLocalStorageSet('veris_blocks', blocks);
  }, [blocks]);

  const setTheme = (newTheme: ThemePreset) => {
    setThemeState(newTheme);
    localStorage.setItem('veris_theme_id', newTheme.id);
  };

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem('veris_language', lang);
  };

  const openCreateTaskListModal = () => {
    setEditingTaskList(null);
    setIsTaskModalOpen(true);
  };

  const openEditTaskListModal = (listId: string) => {
    const found = taskLists.find(l => l.id === listId);
    if (found) {
      setEditingTaskList(found);
      setIsTaskModalOpen(true);
    }
  };

  const closeTaskModal = () => {
    setIsTaskModalOpen(false);
    setEditingTaskList(null);
  };

  // Block CRUD & Operations
  const openCreateBlockModal = (initialNoteIds: string[] = [], editBlock: NoteBlock | null = null) => {
    setBlockModalInitialNoteIds(initialNoteIds);
    setEditingBlock(editBlock);
    setIsCreateBlockModalOpen(true);
  };

  const closeCreateBlockModal = () => {
    setIsCreateBlockModalOpen(false);
    setEditingBlock(null);
    setBlockModalInitialNoteIds([]);
  };

  const createBlock = (name: string, noteIds: string[] = []): NoteBlock => {
    const trimmed = name.trim() || 'Новый блок';
    const newBlock: NoteBlock = {
      id: `block-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: trimmed,
      type: 'custom',
    };
    setBlocks(prev => [...prev, newBlock]);
    if (noteIds.length > 0) {
      setNotes(prev =>
        prev.map(note =>
          noteIds.includes(note.id)
            ? { ...note, blockId: newBlock.id, pinned: false, updatedAt: Date.now() }
            : note
        )
      );
    }
    return newBlock;
  };

  const updateBlock = (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBlocks(prev =>
      prev.map(b => (b.id === id ? { ...b, name: trimmed } : b))
    );
  };

  const openDeleteBlockModal = (block: NoteBlock) => {
    setBlockToDelete(block);
    setIsDeleteBlockModalOpen(true);
  };

  const closeDeleteBlockModal = () => {
    setIsDeleteBlockModalOpen(false);
    setBlockToDelete(null);
  };

  const confirmDeleteBlock = (
    blockId: string,
    action: 'transfer' | 'delete_notes',
    targetBlockId: string | null = 'general'
  ) => {
    if (action === 'delete_notes') {
      // Move all notes in this block to deletedNotes (trash)
      const notesToDelete = notes.filter(n => n.blockId === blockId);
      if (notesToDelete.length > 0) {
        setDeletedNotes(prev => [...notesToDelete, ...prev.filter(n => !notesToDelete.some(d => d.id === n.id))]);
        setNotes(prev => {
          const remaining = prev.filter(n => n.blockId !== blockId);
          if (activeNoteId && notesToDelete.some(n => n.id === activeNoteId)) {
            setActiveNoteId(remaining[0]?.id || null);
          }
          return remaining;
        });
      }
    } else {
      // Transfer notes to target block
      setNotes(prev =>
        prev.map(note => {
          if (note.blockId !== blockId) return note;
          if (targetBlockId === 'pinned') {
            return { ...note, pinned: true, blockId: null, updatedAt: Date.now() };
          } else if (targetBlockId === 'general' || targetBlockId === null) {
            return { ...note, pinned: false, blockId: 'general', updatedAt: Date.now() };
          } else {
            return { ...note, pinned: false, blockId: targetBlockId, updatedAt: Date.now() };
          }
        })
      );
    }

    // Remove block
    setBlocks(prev => prev.filter(b => b.id !== blockId));
    closeDeleteBlockModal();
  };

  const deleteBlock = (id: string) => {
    const block = blocks.find(b => b.id === id);
    if (block) {
      openDeleteBlockModal(block);
    } else {
      setBlocks(prev => prev.filter(b => b.id !== id));
    }
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  const moveNoteInBlock = (noteId: string, direction: 'up' | 'down') => {
    setNotes(prev => {
      const targetNote = prev.find(n => n.id === noteId);
      if (!targetNote) return prev;

      const isPinned = targetNote.pinned;
      const blockId = targetNote.blockId || 'general';

      // Find all notes belonging to the same visual block group
      const sameBlockNotes = prev.filter(n => {
        if (isPinned) return n.pinned;
        if (blockId === 'general') return !n.pinned && (!n.blockId || n.blockId === 'general');
        return !n.pinned && n.blockId === blockId;
      });

      const idxInBlock = sameBlockNotes.findIndex(n => n.id === noteId);
      if (idxInBlock === -1) return prev;

      const targetIdxInBlock = direction === 'up' ? idxInBlock - 1 : idxInBlock + 1;
      if (targetIdxInBlock < 0 || targetIdxInBlock >= sameBlockNotes.length) return prev;

      const otherNote = sameBlockNotes[targetIdxInBlock];
      if (!otherNote) return prev;

      // Swap positions in the global notes array
      const copy = [...prev];
      const globalIdx1 = copy.findIndex(n => n.id === targetNote.id);
      const globalIdx2 = copy.findIndex(n => n.id === otherNote.id);

      if (globalIdx1 !== -1 && globalIdx2 !== -1) {
        const temp = copy[globalIdx1];
        copy[globalIdx1] = copy[globalIdx2];
        copy[globalIdx2] = temp;
        idbSet('veris_notes', copy);
      }
      return copy;
    });
  };

  const moveNotesToBlock = (noteIds: string[], targetBlockId: string | null) => {
    setNotes(prev =>
      prev.map(note => {
        if (!noteIds.includes(note.id)) return note;
        if (targetBlockId === 'pinned') {
          return { ...note, pinned: true, blockId: null, updatedAt: Date.now() };
        } else if (targetBlockId === 'general' || targetBlockId === null) {
          return { ...note, pinned: false, blockId: null, updatedAt: Date.now() };
        } else {
          return { ...note, pinned: false, blockId: targetBlockId, updatedAt: Date.now() };
        }
      })
    );
  };

  // Priority CRUD
  const createPriority = (name: string, color?: string, level?: number): Priority => {
    const trimmed = name.trim();
    const existing = priorities.find(p => p.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      const updated: Priority = {
        ...existing,
        color: color || existing.color,
        level: typeof level === 'number' ? level : (existing.level || 3),
      };
      setPriorities(prev => prev.map(p => (p.id === existing.id ? updated : p)));
      return updated;
    }

    const assignedLevel = typeof level === 'number' ? level : priorities.length + 1;
    const newPriority: Priority = {
      id: `priority-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: trimmed,
      color: color || theme.accent,
      level: assignedLevel,
    };
    setPriorities(prev => [...prev, newPriority]);
    return newPriority;
  };

  const updatePriority = (id: string, updates: Partial<Priority>) => {
    setPriorities(prev =>
      prev.map(p => (p.id === id ? { ...p, ...updates } : p))
    );
    // Also update tasks that reference this priority
    setTaskLists(prev =>
      prev.map(tl => {
        if (
          tl.priority?.id === id ||
          (tl.priority?.name && updates.name && tl.priority.name.toLowerCase() === updates.name.toLowerCase())
        ) {
          return {
            ...tl,
            priority: {
              ...tl.priority,
              ...updates,
            } as Priority,
          };
        }
        return tl;
      })
    );
    // Also update kanban cards
    setKanbanCards(prev =>
      prev.map(card => {
        if (
          card.priority?.id === id ||
          (card.priority?.name && updates.name && card.priority.name.toLowerCase() === updates.name.toLowerCase())
        ) {
          return {
            ...card,
            priority: {
              ...card.priority,
              ...updates,
            } as Priority,
          };
        }
        return card;
      })
    );
  };

  const deletePriority = (id: string) => {
    const target = priorities.find(p => p.id === id);
    setPriorities(prev => prev.filter(p => p.id !== id));
    if (target) {
      setTaskLists(prev =>
        prev.map(tl => {
          if (
            tl.priority?.id === id ||
            (tl.priority?.name && target.name && tl.priority.name.toLowerCase() === target.name.toLowerCase())
          ) {
            return { ...tl, priority: undefined, badgeText: undefined };
          }
          return tl;
        })
      );
      setKanbanCards(prev =>
        prev.map(card => {
          if (
            card.priority?.id === id ||
            (card.priority?.name && target.name && card.priority.name.toLowerCase() === target.name.toLowerCase())
          ) {
            return { ...card, priority: undefined };
          }
          return card;
        })
      );
    }
  };

  // Tag CRUD
  const deleteTagByName = (tagName: string) => {
    setTags(prev => prev.filter(t => t.name.toLowerCase() !== tagName.toLowerCase()));
    setNotes(prev =>
      prev.map(note => ({
        ...note,
        tags: (note.tags || []).filter(t => t.toLowerCase() !== tagName.toLowerCase()),
      }))
    );
    setTaskLists(prev =>
      prev.map(tl => ({
        ...tl,
        tags: (tl.tags || []).filter(t => t.toLowerCase() !== tagName.toLowerCase()),
      }))
    );
    if (selectedTagFilter && selectedTagFilter.toLowerCase() === tagName.toLowerCase()) {
      setSelectedTagFilter(null);
    }
  };

  const createTag = (name: string, color?: string): Tag => {
    const trimmed = name.trim();
    const existing = tags.find(t => t.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      if (color && color !== existing.color) {
        const updated = { ...existing, color };
        setTags(prev => prev.map(t => (t.id === existing.id ? updated : t)));
        return updated;
      }
      return existing;
    }

    const newTag: Tag = {
      id: `tag-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: trimmed,
      color: color || theme.accent,
    };
    setTags(prev => [...prev, newTag]);
    return newTag;
  };

  const updateTag = (id: string, updates: Partial<Tag>) => {
    const target = tags.find(t => t.id === id);
    if (!target) return;

    setTags(prev => prev.map(t => (t.id === id ? { ...t, ...updates } : t)));

    // If name changed, rename references in notes and tasks
    if (updates.name && updates.name.trim() && updates.name.toLowerCase() !== target.name.toLowerCase()) {
      const oldName = target.name.toLowerCase();
      const newName = updates.name.trim();
      setNotes(prev =>
        prev.map(n => ({
          ...n,
          tags: (n.tags || []).map(t => (t.toLowerCase() === oldName ? newName : t)),
        }))
      );
      setTaskLists(prev =>
        prev.map(tl => ({
          ...tl,
          tags: (tl.tags || []).map(t => (t.toLowerCase() === oldName ? newName : t)),
        }))
      );
      if (selectedTagFilter && selectedTagFilter.toLowerCase() === oldName) {
        setSelectedTagFilter(newName);
      }
    }
  };

  const toggleNoteTag = (noteId: string, tagName: string) => {
    setNotes(prev =>
      prev.map(note => {
        if (note.id !== noteId) return note;
        const currentTags = note.tags || [];
        const exists = currentTags.some(t => t.toLowerCase() === tagName.toLowerCase());
        const updatedTags = exists
          ? currentTags.filter(t => t.toLowerCase() !== tagName.toLowerCase())
          : [...currentTags, tagName];
        return {
          ...note,
          tags: updatedTags,
          updatedAt: Date.now(),
        };
      })
    );
  };

  // Note CRUD
  const createNote = (title = 'Новая заметка', content = '') => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title,
      content,
      pinned: false,
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      charCount: content.length,
    };
    setHistory(h => ({ ...h, [newNote.id]: [content] }));
    setHistoryIndex(hi => ({ ...hi, [newNote.id]: 0 }));
    setNotes(prev => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    setViewMode('editor');
    return newNote;
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    if (updates.content !== undefined) {
      setHistory(prevHist => {
        const stack = prevHist[id] && prevHist[id].length > 0 ? prevHist[id] : [];
        const currentIdx = historyIndex[id] !== undefined ? historyIndex[id] : (stack.length > 0 ? stack.length - 1 : 0);
        
        // Don't record if identical to current index in history
        if (stack.length > 0 && stack[currentIdx] === updates.content) {
          return prevHist;
        }

        const newStack = [...stack.slice(0, currentIdx + 1), updates.content!];
        if (newStack.length > 60) newStack.shift();
        return { ...prevHist, [id]: newStack };
      });

      setHistoryIndex(prevIdx => {
        const stack = history[id] || [];
        const currentIdx = prevIdx[id] !== undefined ? prevIdx[id] : (stack.length > 0 ? stack.length - 1 : 0);
        const nextIdx = Math.min(currentIdx + 1, 59);
        return { ...prevIdx, [id]: nextIdx };
      });
    }

    setNotes(prev =>
      prev.map(note => {
        if (note.id !== id) return note;
        const newContent = updates.content !== undefined ? updates.content : note.content;

        return {
          ...note,
          ...updates,
          updatedAt: Date.now(),
          charCount: newContent.length,
        };
      })
    );
  };

  const deleteNote = (id: string) => {
    const noteToDelete = notes.find(n => n.id === id);
    if (noteToDelete) {
      setDeletedNotes(prev => [noteToDelete, ...prev.filter(n => n.id !== id)]);
    }
    setNotes(prev => {
      const remaining = prev.filter(n => n.id !== id);
      if (activeNoteId === id) {
        setActiveNoteId(remaining[0]?.id || null);
      }
      return remaining;
    });
  };

  const duplicateNote = (id: string) => {
    const noteToCopy = notes.find(n => n.id === id);
    if (!noteToCopy) return;
    const newNote: Note = {
      ...noteToCopy,
      id: `note-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      attachments: noteToCopy.attachments ? [...noteToCopy.attachments] : [],
      tags: noteToCopy.tags ? [...noteToCopy.tags] : [],
    };
    setNotes(prev => {
      const index = prev.findIndex(n => n.id === id);
      if (index !== -1) {
        const updated = [...prev];
        updated.splice(index + 1, 0, newNote);
        return updated;
      }
      return [newNote, ...prev];
    });
    return newNote;
  };

  // Trash Handlers
  const restoreNote = (id: string) => {
    const target = deletedNotes.find(n => n.id === id);
    if (target) {
      setNotes(prev => [target, ...prev]);
      setDeletedNotes(prev => prev.filter(n => n.id !== id));
    }
  };

  const permanentlyDeleteNote = (id: string) => {
    setDeletedNotes(prev => prev.filter(n => n.id !== id));
  };

  const clearAllDeletedNotes = () => {
    setDeletedNotes([]);
  };

  const restoreAllDeletedNotes = () => {
    setNotes(prev => [...deletedNotes, ...prev]);
    setDeletedNotes([]);
  };

  const togglePinNote = (id: string) => {
    setNotes(prev =>
      prev.map(note => (note.id === id ? { ...note, pinned: !note.pinned } : note))
    );
  };

  const addAttachmentToNote = (noteId: string, attachment: NoteAttachment): boolean => {
    const MAX_NOTE_ATTACHMENTS_SIZE = 50 * 1024 * 1024; // 50 MB
    let success = true;

    setNotes(prev =>
      prev.map(note => {
        if (note.id !== noteId) return note;

        const currentAttachments = note.attachments || [];
        const currentTotalSize = currentAttachments.reduce((sum, a) => sum + a.size, 0);

        if (attachment.size > MAX_NOTE_ATTACHMENTS_SIZE || currentTotalSize + attachment.size > MAX_NOTE_ATTACHMENTS_SIZE) {
          alert('Ошибка: Общий размер вложений в 1 заметке не должен превышать 50 МБ.');
          success = false;
          return note;
        }

        return {
          ...note,
          attachments: [...currentAttachments, attachment],
          updatedAt: Date.now(),
        };
      })
    );

    return success;
  };

  const deleteAttachmentFromNote = (noteId: string, attachmentId: string) => {
    setNotes(prev =>
      prev.map(note => {
        if (note.id !== noteId) return note;
        let cleanContent = note.content || '';
        if (typeof DOMParser !== 'undefined') {
          try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(`<div>${cleanContent}</div>`, 'text/html');
            const embeds = doc.querySelectorAll(`[data-attachment-id="${attachmentId}"]`);
            embeds.forEach(el => el.remove());
            cleanContent = doc.body.firstElementChild?.innerHTML ?? cleanContent;
          } catch {
            // fallback
          }
        }
        const tagRegex = new RegExp(`\\[\\[attachment:${attachmentId}\\]\\]`, 'g');
        cleanContent = cleanContent.replace(tagRegex, '');
        return {
          ...note,
          content: cleanContent,
          attachments: (note.attachments || []).filter(a => a.id !== attachmentId),
          updatedAt: Date.now(),
        };
      })
    );
  };

  const updateAttachmentInNote = (
    noteId: string,
    attachmentId: string,
    updates: Partial<NoteAttachment>
  ) => {
    setNotes(prev =>
      prev.map(note => {
        if (note.id !== noteId) return note;
        return {
          ...note,
          attachments: (note.attachments || []).map(a =>
            a.id === attachmentId ? { ...a, ...updates, updatedAt: Date.now() } : a
          ),
          updatedAt: Date.now(),
        };
      })
    );
  };

  const reorderAttachmentsInNote = (
    noteId: string,
    attachmentId: string,
    direction: 'up' | 'down'
  ) => {
    setNotes(prev =>
      prev.map(note => {
        if (note.id !== noteId) return note;
        const list = [...(note.attachments || [])];
        const idx = list.findIndex(a => a.id === attachmentId);
        if (idx === -1) return note;

        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= list.length) return note;

        const temp = list[idx];
        list[idx] = list[targetIdx];
        list[targetIdx] = temp;

        return { ...note, attachments: list, updatedAt: Date.now() };
      })
    );
  };

  const moveAttachmentIndex = (
    noteId: string,
    fromIndex: number,
    toIndex: number
  ) => {
    setNotes(prev =>
      prev.map(note => {
        if (note.id !== noteId) return note;
        const list = [...(note.attachments || [])];
        if (
          fromIndex < 0 ||
          fromIndex >= list.length ||
          toIndex < 0 ||
          toIndex >= list.length ||
          fromIndex === toIndex
        ) {
          return note;
        }

        const [movedItem] = list.splice(fromIndex, 1);
        list.splice(toIndex, 0, movedItem);

        return { ...note, attachments: list, updatedAt: Date.now() };
      })
    );
  };

  // Task CRUD
  const saveTaskList = (listData: {
    id?: string;
    title: string;
    items: TaskItem[];
    tags?: string[];
    priority?: Priority | null;
  }): TaskList => {
    if (listData.id) {
      const existingId = listData.id;
      setTaskLists(prev =>
        prev.map(list =>
          list.id === existingId
            ? {
                ...list,
                title: listData.title.trim() || 'Без названия',
                items: listData.items,
                tags: listData.tags || [],
                priority: listData.priority,
                updatedAt: Date.now(),
              }
            : list
        )
      );
      const updated = taskLists.find(l => l.id === existingId);
      return (
        updated || {
          id: existingId,
          title: listData.title.trim() || 'Без названия',
          items: listData.items,
          tags: listData.tags || [],
          priority: listData.priority,
          updatedAt: Date.now(),
        }
      );
    } else {
      const newList: TaskList = {
        id: `task-${Date.now()}`,
        title: listData.title.trim() || 'Новый список',
        updatedAt: Date.now(),
        items: listData.items,
        tags: listData.tags || [],
        priority: listData.priority || null,
      };
      setTaskLists(prev => [newList, ...prev]);
      setActiveTaskId(newList.id);
      return newList;
    }
  };

  const createTaskList = (title = 'Новый список') => {
    const newList: TaskList = {
      id: `task-${Date.now()}`,
      title,
      badgeText: '0%',
      badgeColor: 'gray',
      updatedAt: Date.now(),
      items: [],
    };
    setTaskLists(prev => [newList, ...prev]);
    setActiveTaskId(newList.id);
    setViewMode('tasks');
    return newList;
  };

  const updateTaskList = (id: string, updates: Partial<TaskList>) => {
    setTaskLists(prev =>
      prev.map(list => (list.id === id ? { ...list, ...updates, updatedAt: Date.now() } : list))
    );
  };

  const deleteTaskList = (id: string) => {
    const listToDelete = taskLists.find(l => l.id === id);
    if (listToDelete) {
      setDeletedTaskLists(prev => [listToDelete, ...prev.filter(l => l.id !== id)]);
    }
    setTaskLists(prev => {
      const remaining = prev.filter(l => l.id !== id);
      if (activeTaskId === id) {
        setActiveTaskId(remaining[0]?.id || null);
      }
      return remaining;
    });
  };

  const restoreTaskList = (id: string) => {
    const target = deletedTaskLists.find(l => l.id === id);
    if (target) {
      setTaskLists(prev => [target, ...prev]);
      setDeletedTaskLists(prev => prev.filter(l => l.id !== id));
    }
  };

  const permanentlyDeleteTaskList = (id: string) => {
    setDeletedTaskLists(prev => prev.filter(l => l.id !== id));
  };

  const clearAllDeletedTaskLists = () => {
    setDeletedTaskLists([]);
  };

  const restoreAllDeletedTaskLists = () => {
    setTaskLists(prev => [...deletedTaskLists, ...prev]);
    setDeletedTaskLists([]);
  };

  // Calendar CRUD & Trash Handlers
  const createCalendarEvent = (eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newEvent: CalendarEvent = {
      ...eventData,
      id: `event-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setEvents(prev => [newEvent, ...prev]);
    return newEvent;
  };

  const updateCalendarEvent = (id: string, updates: Partial<CalendarEvent>) => {
    setEvents(prev =>
      prev.map(ev => (ev.id === id ? { ...ev, ...updates, updatedAt: Date.now() } : ev))
    );
  };

  const deleteCalendarEvent = (id: string) => {
    const target = events.find(ev => ev.id === id);
    if (target) {
      setDeletedEvents(prev => [{ ...target, deleted: true, deletedAt: Date.now() }, ...prev.filter(e => e.id !== id)]);
      setEvents(prev => prev.filter(ev => ev.id !== id));
    }
  };

  const restoreCalendarEvent = (id: string) => {
    const target = deletedEvents.find(ev => ev.id === id);
    if (target) {
      const restored = { ...target, deleted: false };
      setEvents(prev => [restored, ...prev]);
      setDeletedEvents(prev => prev.filter(ev => ev.id !== id));
    }
  };

  const permanentlyDeleteCalendarEvent = (id: string) => {
    setDeletedEvents(prev => prev.filter(ev => ev.id !== id));
  };

  const clearAllDeletedCalendarEvents = () => {
    setDeletedEvents([]);
  };

  const restoreAllDeletedCalendarEvents = () => {
    const restored = deletedEvents.map(e => ({ ...e, deleted: false }));
    setEvents(prev => [...restored, ...prev]);
    setDeletedEvents([]);
  };

  const dismissReminder = (eventId: string, forever = false) => {
    if (forever) {
      updateCalendarEvent(eventId, { reminderDismissedForever: true });
    } else {
      try {
        let sessionDismissed: string[] = [];
        const stored = sessionStorage.getItem('veris_session_dismissed_reminders');
        if (stored) sessionDismissed = JSON.parse(stored);
        if (!sessionDismissed.includes(eventId)) {
          sessionDismissed.push(eventId);
          sessionStorage.setItem('veris_session_dismissed_reminders', JSON.stringify(sessionDismissed));
        }
      } catch (err) {
        console.error(err);
      }
    }
    setActiveReminderEvent(null);
  };

  const addTaskItem = (listId: string, text: string) => {
    if (!text.trim()) return;
    setTaskLists(prev =>
      prev.map(list => {
        if (list.id !== listId) return list;
        const newItems = [...list.items, { id: `item-${Date.now()}`, text: text.trim(), completed: false }];
        const completedCount = newItems.filter(i => i.completed).length;
        const pct = Math.round((completedCount / newItems.length) * 100) || 0;
        return {
          ...list,
          items: newItems,
          badgeText: `${pct}%`,
          updatedAt: Date.now(),
        };
      })
    );
  };

  const toggleTaskItem = (listId: string, itemId: string) => {
    setTaskLists(prev =>
      prev.map(list => {
        if (list.id !== listId) return list;
        const updated = list.items.map(item =>
          item.id === itemId ? { ...item, completed: !item.completed } : item
        );
        const uncompleted = updated.filter(i => !i.completed);
        const completed = updated.filter(i => i.completed);
        const newItems = [...uncompleted, ...completed];
        const completedCount = completed.length;
        const pct = newItems.length > 0 ? Math.round((completedCount / newItems.length) * 100) : 0;
        return {
          ...list,
          items: newItems,
          badgeText: list.badgeText && !list.badgeText.includes('%') ? list.badgeText : `${pct}%`,
          updatedAt: Date.now(),
        };
      })
    );
  };

  const deleteTaskItem = (listId: string, itemId: string) => {
    setTaskLists(prev =>
      prev.map(list => {
        if (list.id !== listId) return list;
        const newItems = list.items.filter(item => item.id !== itemId);
        const completedCount = newItems.filter(i => i.completed).length;
        const pct = newItems.length > 0 ? Math.round((completedCount / newItems.length) * 100) : 0;
        return {
          ...list,
          items: newItems,
          badgeText: newItems.length > 0 ? `${pct}%` : '0%',
          updatedAt: Date.now(),
        };
      })
    );
  };

  const createNoteFromTaskList = (listId: string) => {
    const list = taskLists.find(l => l.id === listId);
    if (!list) return createNote();
    const formattedContent = list.items
      .map(i => `${i.completed ? '[x]' : '[ ]'} ${i.text}`)
      .join('\n');
    return createNote(list.title, formattedContent);
  };

  // Undo / Redo for active note
  const currentStack = activeNoteId ? history[activeNoteId] || [] : [];
  const currentIdx = activeNoteId ? historyIndex[activeNoteId] ?? 0 : 0;
  const canUndo = currentIdx > 0;
  const canRedo = currentIdx < currentStack.length - 1;

  const undoNoteContent = () => {
    if (!activeNoteId || !canUndo) return;
    const newIdx = currentIdx - 1;
    const prevContent = currentStack[newIdx];
    setHistoryIndex(hi => ({ ...hi, [activeNoteId]: newIdx }));
    setNotes(prev =>
      prev.map(n => (n.id === activeNoteId ? { ...n, content: prevContent, updatedAt: Date.now() } : n))
    );
  };

  const redoNoteContent = () => {
    if (!activeNoteId || !canRedo) return;
    const newIdx = currentIdx + 1;
    const nextContent = currentStack[newIdx];
    setHistoryIndex(hi => ({ ...hi, [activeNoteId]: newIdx }));
    setNotes(prev =>
      prev.map(n => (n.id === activeNoteId ? { ...n, content: nextContent, updatedAt: Date.now() } : n))
    );
  };

  const importNotesData = (importedItems: ImportedNoteData[]) => {
    if (!importedItems || importedItems.length === 0) return;

    const newNotes: Note[] = importedItems.map((item, index) => ({
      id: `note-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
      title: item.title || 'Импортированная заметка',
      content: item.content || '',
      pinned: false,
      tags: item.tags || ['Импорт'],
      createdAt: Date.now() - index * 100,
      updatedAt: Date.now(),
      charCount: (item.content || '').length,
      attachments: item.attachments || [],
    }));

    setNotes(prev => [...newNotes, ...prev]);

    // Ensure any new tags are registered
    importedItems.forEach(item => {
      if (item.tags) {
        item.tags.forEach(tagName => {
          if (tagName && !tags.some(t => t.name.toLowerCase() === tagName.toLowerCase())) {
            createTag(tagName);
          }
        });
      }
    });

    if (newNotes.length > 0) {
      setActiveNoteId(newNotes[0].id);
      setViewModeState('notes');
      setActiveSettingsTab(null);
    }
  };

  const importFiles = async (fileList: FileList | File[]): Promise<{ count: number; errors: string[] }> => {
    const files = Array.from(fileList);
    let totalImported = 0;
    const errors: string[] = [];

    for (const file of files) {
      try {
        const result = await parseFileToNotes(file);
        if (result.success) {
          // If this is a full Veris backup
          if (result.fullBackupData && Array.isArray(result.fullBackupData.notes)) {
            const backupNotes = result.fullBackupData.notes.map((n: Note) => ({
              ...n,
              id: n.id || `note-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            }));
            setNotes(prev => [...backupNotes, ...prev]);
            if (result.fullBackupData.taskLists && Array.isArray(result.fullBackupData.taskLists)) {
              setTaskLists(prev => [...result.fullBackupData!.taskLists!, ...prev]);
            }
            if (backupNotes.length > 0) {
              setActiveNoteId(backupNotes[0].id);
            }
            totalImported += backupNotes.length;
          } else if (result.notes && result.notes.length > 0) {
            importNotesData(result.notes);
            totalImported += result.notes.length;
          }
        } else {
          errors.push(`${file.name}: ${result.error || 'Ошибка чтения'}`);
        }
      } catch (err: any) {
        errors.push(`${file.name}: ${err?.message || 'Не удалось импортировать'}`);
      }
    }

    return { count: totalImported, errors };
  };

  const resetAllData = () => {
    try {
      localStorage.clear();
      idbDelete('veris_notes');
      idbDelete('veris_task_lists');
      idbDelete('veris_deleted_notes');
      idbDelete('veris_deleted_task_lists');
      idbDelete('veris_kanban_columns');
      idbDelete('veris_kanban_cards');
    } catch (e) {}
    setAppPinState(null);
    setIsAppLocked(false);
    setAppFailedAttempts(0);
    setAppLockoutUntil(0);
    setPrivatePinState(null);
    setIsPrivateLocked(false);
    setPrivateFailedAttempts(0);
    setPrivateLockoutUntil(0);
    setNotes(INITIAL_NOTES);
    setDeletedNotes([]);
    setTaskLists(INITIAL_TASKS);
    setDeletedTaskLists([]);
    setKanbanColumns(DEFAULT_KANBAN_COLUMNS);
    setKanbanCards(INITIAL_KANBAN_CARDS);
    setTags(DEFAULT_TAGS);
    setPriorities(DEFAULT_PRIORITIES);
    setHistory({});
    setHistoryIndex({});
    setActiveNoteId(null);
    setActiveTaskId(null);
    setThemeState(DEFAULT_THEME);
    setQuickSettings(INITIAL_QUICK_SETTINGS);
    setLanguageState('ru');
    setLaunchScreenState('notes');
    setSelectedTagFilter(null);
    setSearchQuery('');
    setActiveSettingsTab(null);
    setViewModeState('notes');
  };

  const insertTextIntoActiveNote = useCallback((textToInsert: string) => {
    if (!textToInsert) return;
    if (activeNoteId) {
      const active = notes.find(n => n.id === activeNoteId);
      if (active) {
        const cleanExisting = active.content ? active.content.trim() : '';
        const newContent = cleanExisting ? `${cleanExisting}\n\n${textToInsert}` : textToInsert;
        updateNote(activeNoteId, { content: newContent });
        return;
      }
    }
    // If no active note, create a new note with the inserted text
    const newNote = createNote('Результаты поиска', textToInsert);
    setActiveNoteId(newNote.id);
    setViewModeState('editor');
  }, [activeNoteId, notes, updateNote, createNote]);

  // Kanban Modals & CRUD
  const openCreateKanbanCardModal = (columnId?: string) => {
    setTargetKanbanColumnId(columnId || (kanbanColumns[0]?.id ?? 'col-todo'));
    setEditingKanbanCard(null);
    setIsKanbanCardModalOpen(true);
  };

  const openEditKanbanCardModal = (card: KanbanCard) => {
    setEditingKanbanCard(card);
    setTargetKanbanColumnId(card.columnId);
    setIsKanbanCardModalOpen(true);
  };

  const closeKanbanCardModal = () => {
    setIsKanbanCardModalOpen(false);
    setEditingKanbanCard(null);
    setTargetKanbanColumnId(null);
  };

  const openQuickViewKanbanCardModal = (card: KanbanCard) => {
    setQuickViewKanbanCard(card);
    setIsKanbanQuickViewOpen(true);
  };

  const closeQuickViewKanbanCardModal = () => {
    setIsKanbanQuickViewOpen(false);
    setQuickViewKanbanCard(null);
  };

  const openCreateKanbanColumnModal = (editColumn: KanbanColumn | null = null) => {
    setEditingKanbanColumn(editColumn);
    setIsKanbanColumnModalOpen(true);
  };

  const closeKanbanColumnModal = () => {
    setIsKanbanColumnModalOpen(false);
    setEditingKanbanColumn(null);
  };

  const createKanbanColumn = (title: string, color?: string): KanbanColumn => {
    const newCol: KanbanColumn = {
      id: `col-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim() || 'Новая колонка',
      color: color || '#93C5FD',
      order: kanbanColumns.length,
    };
    setKanbanColumns(prev => [...prev, newCol]);
    return newCol;
  };

  const updateKanbanColumn = (id: string, updates: Partial<KanbanColumn>) => {
    setKanbanColumns(prev =>
      prev.map(c => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const deleteKanbanColumn = (id: string, deleteCards = false, targetColumnId?: string) => {
    if (deleteCards) {
      setKanbanCards(prev => prev.filter(card => card.columnId !== id));
    } else if (targetColumnId && targetColumnId !== id) {
      setKanbanCards(prev =>
        prev.map(card => (card.columnId === id ? { ...card, columnId: targetColumnId, updatedAt: Date.now() } : card))
      );
    } else {
      const remainingCols = kanbanColumns.filter(c => c.id !== id);
      if (remainingCols.length > 0) {
        const fallbackColId = remainingCols[0].id;
        setKanbanCards(prev =>
          prev.map(card => (card.columnId === id ? { ...card, columnId: fallbackColId, updatedAt: Date.now() } : card))
        );
      }
    }
    setKanbanColumns(prev => prev.filter(c => c.id !== id).map((col, idx) => ({ ...col, order: idx })));
  };

  const moveKanbanColumn = (id: string, direction: 'left' | 'right' | 'up' | 'down') => {
    setKanbanColumns(prev => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const index = sorted.findIndex(c => c.id === id);
      if (index === -1) return prev;
      const isPrev = direction === 'left' || direction === 'up';
      const targetIndex = isPrev ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= sorted.length) return prev;
      const temp = sorted[index];
      sorted[index] = sorted[targetIndex];
      sorted[targetIndex] = temp;
      return sorted.map((col, idx) => ({ ...col, order: idx }));
    });
  };

  const reorderKanbanColumns = (orderedColumnIds: string[]) => {
    setKanbanColumns(prev => {
      const colMap = new Map<string, KanbanColumn>(prev.map(c => [c.id, c]));
      const result: KanbanColumn[] = [];
      orderedColumnIds.forEach((id, idx) => {
        const col = colMap.get(id);
        if (col) {
          result.push({
            id: col.id,
            title: col.title,
            color: col.color,
            order: idx,
            createdAt: col.createdAt,
            updatedAt: Date.now(),
          });
        }
      });
      return result;
    });
  };

  const createKanbanCard = (columnId: string, cardData: Partial<KanbanCard>): KanbanCard => {
    const columnCards = kanbanCards.filter(c => c.columnId === columnId);
    const targetCol = kanbanColumns.find(c => c.id === columnId);
    const newCard: KanbanCard = {
      id: `kcard-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      columnId,
      title: cardData.title?.trim() || 'Новая задача',
      description: cardData.description || '',
      color: cardData.color || targetCol?.color || '#93C5FD',
      priority: cardData.priority || null,
      tags: cardData.tags || [],
      checklist: cardData.checklist || [],
      dueDate: cardData.dueDate,
      order: cardData.order ?? columnCards.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setKanbanCards(prev => [...prev, newCard]);
    return newCard;
  };

  const updateKanbanCard = (id: string, updates: Partial<KanbanCard>) => {
    setKanbanCards(prev =>
      prev.map(c => (c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c))
    );
  };

  const deleteKanbanCard = (id: string) => {
    setKanbanCards(prev => prev.filter(c => c.id !== id));
  };

  const moveKanbanCard = (cardId: string, targetColumnId: string, newIndex?: number) => {
    setKanbanCards(prev => {
      const targetCard = prev.find(c => c.id === cardId);
      if (!targetCard) return prev;

      const isSameColumn = targetCard.columnId === targetColumnId;
      const sourceColumnCards = prev
        .filter(c => c.columnId === targetCard.columnId && c.id !== cardId)
        .sort((a, b) => a.order - b.order);
      const destColumnCards = isSameColumn
        ? sourceColumnCards
        : prev
            .filter(c => c.columnId === targetColumnId && c.id !== cardId)
            .sort((a, b) => a.order - b.order);

      const insertIndex = typeof newIndex === 'number'
        ? Math.max(0, Math.min(newIndex, destColumnCards.length))
        : destColumnCards.length;

      const updatedTargetCard = {
        ...targetCard,
        columnId: targetColumnId,
        updatedAt: Date.now(),
      };

      destColumnCards.splice(insertIndex, 0, updatedTargetCard);

      const reindexedDest = destColumnCards.map((c, idx) => ({ ...c, order: idx }));
      const reindexedSource = isSameColumn
        ? []
        : sourceColumnCards.map((c, idx) => ({ ...c, order: idx }));

      const otherCards = prev.filter(
        c => c.columnId !== targetCard.columnId && c.columnId !== targetColumnId
      );

      return [...otherCards, ...(isSameColumn ? [] : reindexedSource), ...reindexedDest];
    });
  };

  const reorderKanbanCardsInColumn = (columnId: string, orderedCardIds: string[]) => {
    setKanbanCards(prev => {
      const cardMap = new Map<string, KanbanCard>(prev.map(c => [c.id, c]));
      const updatedColumnCards: KanbanCard[] = [];
      orderedCardIds.forEach((id, idx) => {
        const card = cardMap.get(id);
        if (card) {
          updatedColumnCards.push({
            ...card,
            columnId,
            order: idx,
            updatedAt: Date.now(),
          });
        }
      });
      const otherCards = prev.filter(c => c.columnId !== columnId);
      return [...otherCards, ...updatedColumnCards];
    });
  };

  return (
    <AppContext.Provider
      value={{
        notes,
        taskLists,
        tags,
        priorities,
        blocks,
        theme,
        quickSettings,
        webSearchSettings,
        setWebSearchSettings,
        searchHistory,
        addSearchHistoryItem,
        deleteSearchHistoryItem,
        clearSearchHistory,
        viewMode,
        previousViewMode,
        activeSettingsTab,
        activeNoteId,
        activeTaskId,
        sidebarOpen,
        selectedTagFilter,
        taskSortOrder,
        searchQuery,
        searchTarget,
        language,
        launchScreen,
        deletedNotes,
        deletedTaskLists,
        events,
        deletedEvents,
        activeReminderEvent,
        selectedCalendarDate,
        setSelectedCalendarDate,
        dismissReminder,
        createCalendarEvent,
        updateCalendarEvent,
        deleteCalendarEvent,
        restoreCalendarEvent,
        permanentlyDeleteCalendarEvent,
        clearAllDeletedCalendarEvents,
        restoreAllDeletedCalendarEvents,

        kanbanColumns,
        kanbanCards,
        isKanbanCardModalOpen,
        editingKanbanCard,
        targetKanbanColumnId,
        isKanbanColumnModalOpen,
        editingKanbanColumn,
        isKanbanQuickViewOpen,
        quickViewKanbanCard,
        openQuickViewKanbanCardModal,
        closeQuickViewKanbanCardModal,
        openCreateKanbanCardModal,
        openEditKanbanCardModal,
        closeKanbanCardModal,
        openCreateKanbanColumnModal,
        closeKanbanColumnModal,
        createKanbanColumn,
        updateKanbanColumn,
        deleteKanbanColumn,
        moveKanbanColumn,
        reorderKanbanColumns,
        createKanbanCard,
        updateKanbanCard,
        deleteKanbanCard,
        moveKanbanCard,
        reorderKanbanCardsInColumn,

        isQuickSettingsOpen,
        isTagSearchOpen,
        isNoteSearchOpen,
        isAIPromptOpen,
        isWebSearchOpen,
        setIsWebSearchOpen,
        insertTextIntoActiveNote,
        isTaskModalOpen,
        editingTaskList,
        isExportModalOpen,
        exportTargetNoteId,
        isCreateBlockModalOpen,
        blockModalInitialNoteIds,
        editingBlock,
        isDeleteBlockModalOpen,
        blockToDelete,

        appPin,
        isAppLocked,
        unlockApp,
        setAppPin,
        removeAppPin,
        lockApp,
        appLockoutUntil,
        appFailedAttempts,

        privatePin,
        isPrivateLocked,
        unlockPrivateSpace,
        setPrivatePin,
        removePrivatePin,
        lockPrivateSpace,
        resetPrivateSpace,
        privateLockoutUntil,
        privateFailedAttempts,

        setTheme,
        setQuickSettings,
        updateQuickSettings,
        setViewMode,
        setActiveSettingsTab,
        setActiveNoteId,
        setActiveTaskId,
        setSidebarOpen,
        setSelectedTagFilter,
        setTaskSortOrder,
        setSearchQuery,
        setSearchTarget,
        setLanguage,
        setLaunchScreen,
        setIsQuickSettingsOpen,
        setIsTagSearchOpen,
        setIsNoteSearchOpen,
        setIsAIPromptOpen,
        setIsExportModalOpen,
        openExportModal,
        openCreateTaskListModal,
        openEditTaskListModal,
        closeTaskModal,

        createBlock,
        updateBlock,
        deleteBlock,
        openDeleteBlockModal,
        closeDeleteBlockModal,
        confirmDeleteBlock,
        moveBlock,
        moveNoteInBlock,
        moveNotesToBlock,
        openCreateBlockModal,
        closeCreateBlockModal,

        deleteTagByName,
        createTag,
        updateTag,
        toggleNoteTag,
        createPriority,
        updatePriority,
        deletePriority,

        restoreNote,
        restoreTaskList,
        permanentlyDeleteNote,
        permanentlyDeleteTaskList,
        clearAllDeletedNotes,
        clearAllDeletedTaskLists,
        restoreAllDeletedNotes,
        restoreAllDeletedTaskLists,

        createNote,
        updateNote,
        deleteNote,
        duplicateNote,
        togglePinNote,
        addAttachmentToNote,
        deleteAttachmentFromNote,
        updateAttachmentInNote,
        reorderAttachmentsInNote,
        moveAttachmentIndex,

        createTaskList,
        saveTaskList,
        updateTaskList,
        deleteTaskList,
        addTaskItem,
        toggleTaskItem,
        deleteTaskItem,
        createNoteFromTaskList,

        undoNoteContent,
        redoNoteContent,
        canUndo,
        canRedo,

        resetAllData,
        importFiles,
        importNotesData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
