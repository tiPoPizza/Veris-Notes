export type ThemeType = 'Prelude' | 'Cadenza';

export interface ThemePresetTags {
  brightness: 'light' | 'dark'; // светлая | тёмная
  temperature: 'warm' | 'cool' | 'mixed'; // тёплая | холодная | смешанная (нейтральная)
  contrast: 'high' | 'medium'; // высокая | средняя контрастность
  mood: 'calm' | 'vibrant'; // спокойная | яркая
  accentTone: 'warm' | 'cool' | 'neutral'; // тёплый | холодный | нейтральный
  saturation: 'rich' | 'muted'; // насыщенная | приглушённая
}

export interface ThemePreset {
  id: string;
  name: string;
  category: string;
  type: ThemeType;
  bg: string;
  text: string;
  accent: string;
  tags?: ThemePresetTags;
}

export interface ThemeCategory {
  id: string;
  name: string;
  themes: ThemePreset[];
}

export interface ThemeScheduleSettings {
  enabled: boolean;
  dayThemeId: string;
  nightThemeId: string;
  dayStartTime: string;   // format "HH:MM" e.g. "06:00"
  nightStartTime: string; // format "HH:MM" e.g. "20:00"
}

export interface NoteAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  textContent?: string;
  updatedAt: number;
}

export interface NoteBlock {
  id: string;
  name: string;
  type: 'pinned' | 'general' | 'custom';
}

export interface Note {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  isPrivate?: boolean;
  blockId?: string | null;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  charCount?: number;
  attachments?: NoteAttachment[];
  titleFont?: string;
  deletedAt?: number;
}

export type TrashRetentionDays = 7 | 15 | 30 | 90 | 0;

export interface Priority {
  id: string;
  name: string;
  color: string;
  level?: number; // 1 = highest priority (e.g. urgent)
}

export type TaskSortOrder = 'newest' | 'oldest' | 'most_important' | 'least_important';
export type SearchTarget = 'all' | 'title' | 'content';

export interface TaskItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskList {
  id: string;
  title: string;
  updatedAt: number;
  priority?: Priority | null;
  badgeText?: string; // legacy e.g. "Срочно", "Ямате", "Низкий"
  badgeColor?: 'red' | 'gold' | 'green' | 'blue' | 'purple' | 'gray' | string;
  tags?: string[];
  items: TaskItem[];
  deletedAt?: number;
}

export type TileDisplayMode = 'both' | 'title' | 'content';

export type SidebarTabId = 'notes' | 'tasks' | 'kanban' | 'calendar' | 'private';

export type ActionMenuDisplayMode = 'tiles' | 'rows';

export type ActionMenuItemId =
  | 'calendar'
  | 'kanban'
  | 'trash'
  | 'settings'
  | 'ai'
  | 'webSearch'
  | 'notes'
  | 'tasks'
  | 'private';

export type FormattingToolbarButtonId =
  | 'cut'
  | 'copy'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'align'
  | 'heading'
  | 'quote'
  | 'code'
  | 'color'
  | 'textColor';

export const DEFAULT_FORMATTING_TOOLBAR_BUTTONS: FormattingToolbarButtonId[] = [
  'cut',
  'copy',
  'bold',
  'italic',
  'underline',
  'align',
  'heading',
  'quote',
  'code',
  'color',
];

export const ALL_FORMATTING_TOOLBAR_BUTTONS: FormattingToolbarButtonId[] = [
  ...DEFAULT_FORMATTING_TOOLBAR_BUTTONS,
  'textColor',
];

export type NoteTileActionId =
  | 'reorder'
  | 'pin'
  | 'duplicate'
  | 'block'
  | 'tag'
  | 'export'
  | 'delete';

export const ALL_NOTE_TILE_ACTIONS: NoteTileActionId[] = [
  'reorder',
  'pin',
  'duplicate',
  'block',
  'tag',
  'export',
  'delete',
];

export type EditorQuickActionId =
  | 'focusMode'
  | 'pin'
  | 'tag'
  | 'block'
  | 'export'
  | 'private'
  | 'delete';

export const ALL_EDITOR_QUICK_ACTIONS: EditorQuickActionId[] = [
  'focusMode',
  'pin',
  'tag',
  'block',
  'export',
  'private',
  'delete',
];

export const DEFAULT_PASTEL_HIGHLIGHT_COLORS: Array<{ id: string; color: string; label: string }> = [
  { id: 'pastel-yellow', color: '#FEF08A', label: 'Пастельно-жёлтый' },
  { id: 'pastel-peach', color: '#FED7AA', label: 'Пастельно-персиковый' },
  { id: 'pastel-pink', color: '#FBCFE8', label: 'Пастельно-розовый' },
  { id: 'pastel-lavender', color: '#DDD6FE', label: 'Пастельно-сиреневый' },
  { id: 'pastel-sky', color: '#BAE6FD', label: 'Пастельно-голубой' },
  { id: 'pastel-mint', color: '#BBF7D0', label: 'Пастельно-мятный' },
  { id: 'pastel-aqua', color: '#99F6E4', label: 'Пастельно-бирюзовый' },
  { id: 'pastel-slate', color: '#E2E8F0', label: 'Пастельно-серый' },
];

export type CreateBarActionId =
  | 'none'
  | 'aiChat'
  | 'webSearch'
  | 'settings'
  | 'calendar'
  | 'calendarChevron'
  | 'dynamicNewItem'
  | 'newBlock';

export type SidebarCreateDropdownActionId =
  | 'newBlock'
  | 'calendarEvent'
  | 'newNote'
  | 'newTask'
  | 'kanbanCard'
  | 'kanbanColumn';

export const ALL_SIDEBAR_CREATE_DROPDOWN_ACTIONS: Array<{
  id: SidebarCreateDropdownActionId;
  label: string;
  desc: string;
}> = [
  { id: 'newBlock', label: 'Новый блок', desc: 'Создать новый блок для заметок' },
  { id: 'calendarEvent', label: 'Событие в календаре', desc: 'Быстро создать событие или напоминание в календаре' },
  { id: 'newNote', label: 'Новая заметка', desc: 'Создать новую заметку' },
  { id: 'newTask', label: 'Новая задача', desc: 'Создать новый список задач' },
  { id: 'kanbanCard', label: 'Карточка канбана', desc: 'Создать карточку канбана' },
  { id: 'kanbanColumn', label: 'Колонка канбана', desc: 'Создать новую колонку на канбан-доске' },
];

export const DEFAULT_SIDEBAR_CREATE_DROPDOWN_ACTIONS: SidebarCreateDropdownActionId[] = ['newBlock'];

export interface QuickSettings {
  showBorder: boolean;
  showCharCount: boolean;
  showWordCount?: boolean;
  showDate: boolean;
  showTileMetadata: boolean;
  tileDisplayMode?: TileDisplayMode;
  hideTileDots?: boolean;
  oneTimeFormatting: boolean;
  formattingToolbarButtons?: FormattingToolbarButtonId[];
  noteTileActions?: NoteTileActionId[];
  editorQuickActions?: EditorQuickActionId[];
  createBarLeftAction?: CreateBarActionId;
  createBarRightAction?: CreateBarActionId;
  sidebarCreateDropdownActions?: SidebarCreateDropdownActionId[];
  customHighlightColors?: string[]; // 8 customizable hex highlight colors
  horizontalMainMenu?: boolean;
  pinSearchToHomeScreen?: boolean;
  showSidebarTabs?: boolean;
  sidebarTabs?: SidebarTabId[];
  actionMenuDisplayMode?: ActionMenuDisplayMode;
  actionMenuItems?: ActionMenuItemId[];
  pinFocusModeToBottomBar?: boolean;
  bedtimeReminderEnabled?: boolean;
  bedtimeReminderTime?: string; // 'HH:mm', e.g. '22:30'
  bedtimeReminderTitle?: string;
  bedtimeReminderDescription?: string;
  fontSize: number; // in px, e.g. 12, 14, 16, 18, 20, 24
  lineHeight: number; // e.g. 1.2, 1.4, 1.6, 1.8, 2.0
  fontFamily: string; // e.g. 'sans', 'serif', 'mono', 'playfair', 'jakarta'
  leftPanelPos: string;
  rightPanelPos: string;
  bottomPanelPos: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // 'YYYY-MM-DD'
  isAllDay: boolean;
  startTime?: string; // 'HH:mm'
  endTime?: string; // 'HH:mm'
  remindOnDay: boolean;
  description?: string;
  deleted?: boolean;
  deletedAt?: number;
  reminderDismissedForever?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type ViewMode = 'editor' | 'notes' | 'tasks' | 'kanban' | 'settings' | 'trash' | 'calendar' | 'private';

export interface KanbanChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface KanbanCard {
  id: string;
  columnId: string;
  title: string;
  description?: string;
  color?: string; // pastel color hex code
  priority?: Priority | null;
  tags?: string[];
  checklist?: KanbanChecklistItem[];
  dueDate?: string; // 'YYYY-MM-DD'
  dueTime?: string; // 'HH:mm'
  order: number;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export interface KanbanColumn {
  id: string;
  title: string;
  color: string; // pastel color
  order: number;
  createdAt?: number;
  updatedAt?: number;
}

export type LanguageCode = 'ru' | 'en' | 'es' | 'it';

export type LaunchScreen = 'notes' | 'editor' | 'tasks' | 'kanban' | 'anacrusa';

export type WebSearchDepth = 'basic' | 'advanced';
export type WebSearchAnswerDetail = 'basic' | 'advanced';
export type WebSearchProvider = 'tavily' | 'exa';
export type ExaSearchModel = 'fast' | 'deep' | 'deep-reasoning';

export interface WebSearchSettings {
  provider: WebSearchProvider;
  tavilyApiKey: string;
  exaApiKey: string;
  // Tavily specific settings
  searchDepth: WebSearchDepth;
  answerDetail: WebSearchAnswerDetail;
  maxResults: number;
  // Exa specific settings
  exaModel: ExaSearchModel;
  exaIncludeAnswer: boolean;
}

export interface WebSearchResultItem {
  title: string;
  url: string;
  content: string;
  score?: number;
  publishedDate?: string | null;
}

export interface WebSearchResponse {
  query: string;
  answer?: string;
  results: WebSearchResultItem[];
  provider: string;
  searchDepth: string;
  exaModel?: string;
}

export interface WebSearchHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  response: WebSearchResponse;
  pinned?: boolean;
}

export type PinModalMode = 'set' | 'change' | 'disable';
export type PinTarget = 'app' | 'private';

export interface PinUnlockResult {
  success: boolean;
  error?: string;
  lockoutSeconds?: number;
  attemptsLeft?: number;
}

export type CohereModelId =
  | 'command-r7b-12-2024'
  | 'command-r-08-2024'
  | 'command-r-plus-08-2024'
  | 'command-a-03-2025'
  | 'command-a-reasoning-08-2025'
  | string;

export interface CohereModelMeta {
  id: string;
  name: string;
  tier?: 'free' | 'paid';
  description: string;
}

export type AIModelMeta = CohereModelMeta;

export type AnacrusaProvider = 'cohere' | 'ionet';

export type SemanticSearchTriggerMode = 'manual' | 'auto';
export type SemanticIndexingMode = 'auto' | 'manual';

export interface SemanticSearchSettings {
  enabled: boolean;
  modelRepo: string; // e.g. 'Xenova/rubert-tiny2'
  triggerMode: SemanticSearchTriggerMode; // 'manual' (recommended for battery) | 'auto'
  indexingMode?: SemanticIndexingMode; // 'auto' (base default) | 'manual' (only on click in settings)
  similarityThreshold: number; // e.g. 0.58
}

export type AnacrusaWebSearchMode = 'never' | 'ask' | 'auto';

export interface AnacrusaSettings {
  provider: AnacrusaProvider;
  cohereApiKey: string;
  ionetApiKey: string;
  model: string; // Active model for Cohere
  ionetModel?: string; // Active model for io.net
  ionetBaseUrl?: string; // Base URL for io.net (default: https://api.intelligence.io.solutions/api/v1)
  temperature: number;
  systemPrompt: string;
  webSearchMode?: AnacrusaWebSearchMode;
}

export type AnacrusaActionType =
  | 'create_note'
  | 'update_note'
  | 'rename_note'
  | 'delete_note'
  | 'format_note'
  | 'create_tag'
  | 'delete_tag'
  | 'attach_tags'
  | 'detach_tags'
  | 'create_task_list'
  | 'update_task_list'
  | 'rename_task_list'
  | 'delete_task_list'
  | 'create_block'
  | 'rename_block'
  | 'delete_block'
  | 'move_notes_to_block'
  | 'pin_notes'
  | 'unpin_notes'
  | 'create_calendar_event'
  | 'update_calendar_event'
  | 'delete_calendar_event'
  | 'update_settings'
  | 'web_search';

export type AnacrusaUndoPayload =
  | { type: 'create_note'; noteId: string }
  | { type: 'update_note'; noteId: string; previousTitle: string; previousContent: string }
  | { type: 'rename_note'; noteId: string; previousTitle: string }
  | { type: 'delete_note'; notes: Note[] }
  | { type: 'format_note'; noteId: string; previousContent: string; previousTitle?: string }
  | { type: 'create_tag'; tagId: string; tagName: string }
  | { type: 'delete_tag'; tag: Tag; notesWithTag: string[]; taskListsWithTag: string[] }
  | { type: 'attach_tags'; notesPrevTags?: { id: string; tags: string[] }[]; taskListsPrevTags?: { id: string; tags: string[] }[]; createdTagIds?: string[] }
  | { type: 'detach_tags'; notesPrevTags?: { id: string; tags: string[] }[]; taskListsPrevTags?: { id: string; tags: string[] }[] }
  | { type: 'create_task_list'; taskListId: string }
  | { type: 'update_task_list'; taskListId: string; previousTitle?: string; previousItems?: { id: string; text: string; completed: boolean }[] }
  | { type: 'rename_task_list'; taskListId: string; previousTitle: string }
  | { type: 'delete_task_list'; taskLists: TaskList[] }
  | { type: 'create_block'; blockId: string }
  | { type: 'rename_block'; blockId: string; previousName: string }
  | { type: 'delete_block'; block: NoteBlock; notesState?: { id: string; blockId: string | null }[] }
  | { type: 'move_notes_to_block'; notes: { id: string; blockId: string | null }[]; createdBlockId?: string }
  | { type: 'pin_notes' | 'unpin_notes'; notes: { id: string; pinned: boolean }[] }
  | { type: 'create_calendar_event'; eventId: string }
  | { type: 'update_calendar_event'; eventId: string; previousEvent: CalendarEvent }
  | { type: 'delete_calendar_event'; events: CalendarEvent[] }
  | {
      type: 'update_settings';
      previousTheme?: ThemePreset;
      previousLanguage?: LanguageCode;
      previousLaunchScreen?: LaunchScreen;
      previousQuickSettings?: Partial<QuickSettings>;
    };

export interface AnacrusaStep {
  id: string;
  index?: number;
  action: AnacrusaActionType;
  toolName?: string;
  title: string;
  summary: string;
  status: 'running' | 'completed' | 'failed' | 'undone';
  error?: string;
  noteId?: string;
  taskListId?: string;
  blockName?: string;
  tagName?: string;
  tagColor?: string;
  pinned?: boolean;
  undoPayload?: AnacrusaUndoPayload;
}

export interface AnacrusaNoteAction {
  type: AnacrusaActionType;
  noteId?: string;
  taskListId?: string;
  title?: string;
  blockName?: string;
  summary?: string;
  itemsCount?: number;
  noteCount?: number;
  pinned?: boolean;
}

export interface AnacrusaReadStep {
  step: number;
  tool: string;
  queryOrTarget?: string;
  resultSummary?: string;
}

export interface AnacrusaChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  attachedNotes?: { id: string; title: string }[];
  noteAction?: AnacrusaNoteAction;
  steps?: AnacrusaStep[];
  readSteps?: AnacrusaReadStep[];
  pendingWebSearch?: {
    query: string;
    toolCallId?: string;
    status?: 'pending' | 'approved' | 'declined';
  };
  webSearchResultSummary?: string;
  webSearchSources?: {
    title: string;
    url: string;
    publishedDate?: string | null;
    snippet?: string;
  }[];
}

export interface AnacrusaChatSession {
  id: string;
  title: string;
  model: string;
  createdAt: number;
  updatedAt: number;
  messages: AnacrusaChatMessage[];
  pinned?: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  createdAt: number;
}
