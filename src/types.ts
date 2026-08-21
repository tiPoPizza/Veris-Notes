export type ThemeType = 'Prelude' | 'Cadenza';

export interface ThemePreset {
  id: string;
  name: string;
  category: string;
  type: ThemeType;
  bg: string;
  text: string;
  accent: string;
}

export interface ThemeCategory {
  id: string;
  name: string;
  themes: ThemePreset[];
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
}

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

export interface QuickSettings {
  showBorder: boolean;
  showCharCount: boolean;
  showDate: boolean;
  showTileMetadata: boolean;
  tileDisplayMode?: TileDisplayMode;
  hideTileDots?: boolean;
  oneTimeFormatting: boolean;
  horizontalMainMenu?: boolean;
  pinSearchToHomeScreen?: boolean;
  sidebarTabs?: SidebarTabId[];
  actionMenuDisplayMode?: ActionMenuDisplayMode;
  actionMenuItems?: ActionMenuItemId[];
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

export type LaunchScreen = 'notes' | 'editor' | 'tasks';

export type WebSearchDepth = 'basic' | 'advanced';
export type WebSearchAnswerDetail = 'basic' | 'advanced';
export type WebSearchProvider = 'tavily';

export interface WebSearchSettings {
  provider: WebSearchProvider;
  tavilyApiKey: string;
  searchDepth: WebSearchDepth;
  answerDetail: WebSearchAnswerDetail;
  maxResults: number;
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
}

export interface WebSearchHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  response: WebSearchResponse;
}

export type PinModalMode = 'set' | 'change' | 'disable';
export type PinTarget = 'app' | 'private';

export interface PinUnlockResult {
  success: boolean;
  error?: string;
  lockoutSeconds?: number;
  attemptsLeft?: number;
}
