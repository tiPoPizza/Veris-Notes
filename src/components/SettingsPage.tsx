import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useApp, COHERE_MODELS, IONET_MODELS } from '../context/AppContext';
import { getTranslation } from '../i18n';
import { THEME_CATEGORIES, isLightColor, hexToRgba } from '../themes';
import { LanguageCode, SidebarTabId } from '../types';
import {
  Globe,
  Lock,
  Palette,
  Edit3,
  Sparkles,
  Database,
  MoreHorizontal,
  Check,
  RefreshCw,
  RotateCcw,
  Download,
  Upload,
  FileText,
  CheckSquare,
  Columns3,
  Calendar as CalendarIcon,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  X,
  Loader2,
  SlidersHorizontal,
  KeyRound,
  Shield,
  Youtube,
  Instagram,
  Pin,
  Video,
  Send,
  ExternalLink,
  Eye,
  EyeOff,
  Compass,
  Zap,
  Bot,
  Heart,
  Moon,
  Bell,
  Cpu,
  FileSearch,
  Trash2,
  WifiOff,
  BatteryMedium,
  Layers,
  Search,
  Scissors,
  Copy,
  AlignLeft,
  Quote,
  Code,
  Highlighter,
  Files,
  FolderArchive,
  Archive,
  Edit2,
  Plus,
  CopyPlus,
  ArrowUpDown,
  Tag as TagIcon,
  Maximize2,
  HardDrive,
  Brain,
} from 'lucide-react';
import { CustomSelect } from './CustomSelect';
import { CustomTimePicker } from './CustomTimePicker';
import { PinModal, PinModalMode } from './PinModal';
import { FONT_FAMILY_OPTIONS } from '../utils/fonts';
import { FormattingToolbarButtonId, ALL_FORMATTING_TOOLBAR_BUTTONS, NoteTileActionId, ALL_NOTE_TILE_ACTIONS, EditorQuickActionId, ALL_EDITOR_QUICK_ACTIONS, DEFAULT_PASTEL_HIGHLIGHT_COLORS } from '../types';
import { calculateStorageBreakdown, StorageBreakdownResult, formatBytes } from '../utils/storageBreakdown';
import {
  ThemeRegistryModal,
  ThemeFilters,
  DEFAULT_THEME_FILTERS,
  matchThemeWithFilters,
} from './ThemeRegistryModal';
import { ThemeSchedulerModal } from './ThemeSchedulerModal';
import { Clock } from 'lucide-react';
import {
  HF_SEMANTIC_MODELS,
  semanticSearchService,
  ModelDownloadProgress,
} from '../services/semanticSearch';
import { stripHtmlTags, isColorLight } from '../utils/textUtils';
import { createSettingsTranslator } from '../utils/settingsTranslations';
import { ColorPaletteModal } from './ColorPaletteModal';

const LINE_HEIGHT_OPTIONS = [
  { value: 1.2, label: '1.2' },
  { value: 1.4, label: '1.4' },
  { value: 1.6, label: '1.6' },
  { value: 1.8, label: '1.8' },
  { value: 2.0, label: '2.0' },
];

const TILE_DISPLAY_OPTIONS = [
  { value: 'both', label: 'Название + текст' },
  { value: 'title', label: 'Название' },
  { value: 'content', label: 'Текст' },
];

const TRASH_RETENTION_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 7, label: '7 дней' },
  { value: 15, label: '15 дней' },
  { value: 30, label: '30 дней' },
  { value: 90, label: '90 дней' },
  { value: 0, label: 'Никогда' },
];

const FORMATTING_BUTTON_OPTIONS: Array<{
  id: FormattingToolbarButtonId;
  label: string;
  desc: string;
  letter?: string;
  letterClass?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  { id: 'cut', label: 'Вырезать', desc: 'Копировать и удалить выделенный текст', icon: Scissors },
  { id: 'copy', label: 'Копировать', desc: 'Копировать выделенный текст в буфер обмена', icon: Copy },
  { id: 'bold', label: 'Жирный (B)', desc: 'Выделение полужирным начертанием', letter: 'B', letterClass: 'font-black' },
  { id: 'italic', label: 'Курсив (I)', desc: 'Выделение курсивным начертанием', letter: 'I', letterClass: 'italic font-bold' },
  { id: 'underline', label: 'Подчёркнутый (U)', desc: 'Нижнее подчёркивание текста', letter: 'U', letterClass: 'underline font-bold' },
  { id: 'align', label: 'Выравнивание', desc: 'Выравнивание по левому краю, по центру или справа', icon: AlignLeft },
  { id: 'heading', label: 'Заголовки (H)', desc: 'Уровни заголовков H1–H4 и обычный текст', letter: 'H', letterClass: 'font-bold' },
  { id: 'quote', label: 'Цитата', desc: 'Оформление текста блоком цитаты', icon: Quote },
  { id: 'code', label: 'Код', desc: 'Оформление моноширинным фрагментом кода', icon: Code },
  { id: 'color', label: 'Выделение цветом', desc: 'Палитра цветного маркера для текста', icon: Highlighter },
];

const NOTE_TILE_ACTION_OPTIONS: Array<{
  id: NoteTileActionId;
  label: string;
  desc: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
}> = [
  { id: 'reorder', label: 'Вверх / Вниз', desc: 'Кнопки ручного перемещения порядка заметки', icon: ArrowUpDown },
  { id: 'pin', label: 'Закрепить', desc: 'Закрепление заметки вверху списка', icon: Pin },
  { id: 'duplicate', label: 'Дублировать', desc: 'Быстрое создание копии заметки', icon: CopyPlus },
  { id: 'block', label: 'В блок', desc: 'Перемещение заметки в блок', icon: Layers },
  { id: 'tag', label: 'Добавить тег', desc: 'Прикрепление и создание категорий-тегов', icon: TagIcon },
  { id: 'export', label: 'Экспорт', desc: 'Экспорт заметки в файл (TXT, MD, PDF)', icon: Download },
  { id: 'delete', label: 'Корзина', desc: 'Удаление заметки в корзину', icon: Trash2 },
];

const EDITOR_QUICK_ACTION_OPTIONS: Array<{
  id: EditorQuickActionId;
  label: string;
  desc: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
}> = [
  { id: 'focusMode', label: 'Фокус мод', desc: 'Полноэкранный режим письма без отвлекающих элементов', icon: Maximize2 },
  { id: 'pin', label: 'Закрепить', desc: 'Закрепление или открепление текущей заметки', icon: Pin },
  { id: 'tag', label: 'Добавить тег', desc: 'Управление метками и тегами открытой заметки', icon: TagIcon },
  { id: 'block', label: 'В блок', desc: 'Перемещение заметки в блок или сменить блок', icon: Layers },
  { id: 'export', label: 'Экспорт', desc: 'Экспорт заметки в файл (DOCX, TXT, PDF и др.)', icon: Download },
  { id: 'private', label: 'В приват', desc: 'Перемещение заметки в защищённое пространство', icon: Shield },
  { id: 'delete', label: 'В корзину', desc: 'Удаление заметки в корзину', icon: Trash2 },
];

export const SettingsPage: React.FC = () => {
  const {
    theme,
    setTheme,
    language,
    setLanguage,
    launchScreen,
    setLaunchScreen,
    quickSettings,
    setQuickSettings,
    webSearchSettings,
    setWebSearchSettings,
    anacrusaSettings,
    setAnacrusaSettings,
    semanticSearchSettings,
    setSemanticSearchSettings,
    notes,
    taskLists,
    resetAllData,
    importFiles,
    activeSettingsTab,
    setActiveSettingsTab,
    openExportModal,
    openBatchExportModal,
    appPin,
    lockApp,
    privatePin,
    lockPrivateSpace,
    resetPrivateSpace,
    isPrivateLocked,
    triggerBedtimeReminderTest,
    workspacesEnabled,
    setWorkspacesEnabled,
    workspaces,
    activeWorkspaceId,
    switchWorkspace,
    createWorkspace,
    renameWorkspace,
    deleteWorkspace,
    moveNoteToWorkspace,
    moveNotesToWorkspace,
    setIsWorkspaceModalOpen,
    trashRetentionDays,
    setTrashRetentionDays,
    themeSchedule,
  } = useApp();

  const [isThemeSchedulerOpen, setIsThemeSchedulerOpen] = useState(false);
  const [transferTargetWsId, setTransferTargetWsId] = useState<string>('');
  const [transferSelectedNoteIds, setTransferSelectedNoteIds] = useState<string[]>([]);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isTransferNoteSelectOpen, setIsTransferNoteSelectOpen] = useState(false);
  const [isTransferWsSelectOpen, setIsTransferWsSelectOpen] = useState(false);
  const [transferNoteSearch, setTransferNoteSearch] = useState('');
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [editingWorkspaceName, setEditingWorkspaceName] = useState('');
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const transferNoteDropdownRef = useRef<HTMLDivElement>(null);
  const transferWsDropdownRef = useRef<HTMLDivElement>(null);

  const [pinModalMode, setPinModalMode] = useState<PinModalMode | null>(null);
  const [pinModalTarget, setPinModalTarget] = useState<'app' | 'private'>('app');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importNotice, setImportNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showTavilyKey, setShowTavilyKey] = useState(false);
  const [showExaKey, setShowExaKey] = useState(false);
  const [showCohereKey, setShowCohereKey] = useState(false);
  const [showIonetKey, setShowIonetKey] = useState(false);
  const [showCustomIonetModel, setShowCustomIonetModel] = useState(false);
  const [isAiModelDropdownOpen, setIsAiModelDropdownOpen] = useState(false);
  const [isThemeRegistryOpen, setIsThemeRegistryOpen] = useState(false);
  const [themeFilters, setThemeFilters] = useState<ThemeFilters>(DEFAULT_THEME_FILTERS);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Collapsible cards in Editor tab (all initially false / collapsed as requested)
  const [isWorkspacesOpen, setIsWorkspacesOpen] = useState(false);
  const [isLaunchScreenOpen, setIsLaunchScreenOpen] = useState(false);
  const [isTypographyOpen, setIsTypographyOpen] = useState(false);
  const [isNoteDisplayOpen, setIsNoteDisplayOpen] = useState(false);
  const [isFormattingButtonsOpen, setIsFormattingButtonsOpen] = useState(false);
  const [isNoteActionButtonsOpen, setIsNoteActionButtonsOpen] = useState(false);
  const [isEditorQuickActionsOpen, setIsEditorQuickActionsOpen] = useState(false);

  // Highlight colors customization state
  const [editingHighlightIndex, setEditingHighlightIndex] = useState<number | null>(null);

  // Storage breakdown state
  const [storageBreakdown, setStorageBreakdown] = useState<StorageBreakdownResult | null>(null);
  const [isLoadingStorage, setIsLoadingStorage] = useState<boolean>(false);

  const loadStorageData = useCallback(async () => {
    setIsLoadingStorage(true);
    try {
      const res = await calculateStorageBreakdown();
      setStorageBreakdown(res);
    } catch (err) {
      console.error('Failed to calculate storage breakdown', err);
    } finally {
      setIsLoadingStorage(false);
    }
  }, []);

  useEffect(() => {
    if (activeSettingsTab === 'data') {
      loadStorageData();
    }
  }, [activeSettingsTab, loadStorageData]);

  const activeHighlightColors = useMemo(() => {
    if (quickSettings.customHighlightColors && quickSettings.customHighlightColors.length === 8) {
      return quickSettings.customHighlightColors;
    }
    return DEFAULT_PASTEL_HIGHLIGHT_COLORS.map(c => c.color);
  }, [quickSettings.customHighlightColors]);

  const handleSelectHighlightColor = useCallback((slotIndex: number, newColor: string) => {
    const next = [...activeHighlightColors];
    next[slotIndex] = newColor;
    setQuickSettings(prev => ({ ...prev, customHighlightColors: next }));
  }, [activeHighlightColors, setQuickSettings]);

  const handleResetAllHighlightColors = useCallback(() => {
    const next = DEFAULT_PASTEL_HIGHLIGHT_COLORS.map(c => c.color);
    setQuickSettings(prev => ({ ...prev, customHighlightColors: next }));
  }, [setQuickSettings]);

  const tr = useMemo(() => createSettingsTranslator(language), [language]);

  const formattingButtonOptions = useMemo(() => {
    return FORMATTING_BUTTON_OPTIONS.map(opt => ({
      ...opt,
      label: tr(opt.label),
      desc: tr(opt.desc),
    }));
  }, [tr]);

  const noteTileActionOptions = useMemo(() => {
    return NOTE_TILE_ACTION_OPTIONS.map(opt => ({
      ...opt,
      label: tr(opt.label),
      desc: tr(opt.desc),
    }));
  }, [tr]);

  const editorQuickActionOptions = useMemo(() => {
    return EDITOR_QUICK_ACTION_OPTIONS.map(opt => ({
      ...opt,
      label: tr(opt.label),
      desc: tr(opt.desc),
    }));
  }, [tr]);

  const tileDisplayOptions = useMemo(() => {
    return TILE_DISPLAY_OPTIONS.map(opt => ({
      ...opt,
      label: tr(opt.label),
    }));
  }, [tr]);

  const trashRetentionOptions = useMemo(() => {
    return TRASH_RETENTION_OPTIONS.map(opt => ({
      ...opt,
      label: tr(opt.label),
    }));
  }, [tr]);

  // Semantic Search Local State
  const [cachedModels, setCachedModels] = useState<Record<string, boolean>>({});
  const [downloadingRepo, setDownloadingRepo] = useState<string | null>(null);
  const [modelProgress, setModelProgress] = useState<ModelDownloadProgress>({ status: 'idle', progress: 0 });
  const [indexedNotesCount, setIndexedNotesCount] = useState<number>(0);
  const [isReindexing, setIsReindexing] = useState<boolean>(false);
  const [reindexMessage, setReindexMessage] = useState<string | null>(null);

  // Subscribe to progress and check cached models
  useEffect(() => {
    const unsub = semanticSearchService.subscribeProgress(progress => {
      setModelProgress(progress);
      if (progress.status === 'ready' || progress.status === 'error') {
        setDownloadingRepo(null);
      }
    });

    const checkCaches = async () => {
      const results: Record<string, boolean> = {};
      for (const m of HF_SEMANTIC_MODELS) {
        results[m.repo] = await semanticSearchService.isModelCached(m.repo);
      }
      setCachedModels(results);

      const count = await semanticSearchService.getIndexedCount(semanticSearchSettings.modelRepo);
      setIndexedNotesCount(count);
    };

    checkCaches();
    return () => unsub();
  }, [semanticSearchSettings.modelRepo]);

  const handleDownloadModel = async (repo: string) => {
    setDownloadingRepo(repo);
    const success = await semanticSearchService.loadModel(repo);
    if (success) {
      setCachedModels(prev => ({ ...prev, [repo]: true }));
      setSemanticSearchSettings(prev => ({
        ...prev,
        modelRepo: repo,
        enabled: true,
      }));
      const count = await semanticSearchService.getIndexedCount(repo);
      setIndexedNotesCount(count);
    }
  };

  const handleDeleteModel = async (repo: string) => {
    const ok = await semanticSearchService.deleteCachedModel(repo);
    if (ok) {
      setCachedModels(prev => ({ ...prev, [repo]: false }));
      const count = await semanticSearchService.getIndexedCount(repo);
      setIndexedNotesCount(count);
    }
  };

  const handleReindexNotes = async () => {
    const activeRepo = semanticSearchSettings.modelRepo;
    setIsReindexing(true);
    setReindexMessage(null);
    try {
      // Ensure model is loaded
      await semanticSearchService.loadModel(activeRepo);
      // Index all non-private notes
      const notesToIndex = notes.filter(n => !n.isPrivate);
      let count = 0;
      for (const note of notesToIndex) {
        const text = `${note.title || ''}\n${stripHtmlTags(note.content || '')}`.trim();
        if (text) {
          await semanticSearchService.getEmbedding(text, activeRepo);
          count++;
        }
      }
      const finalCount = await semanticSearchService.getIndexedCount(activeRepo);
      setIndexedNotesCount(finalCount);
      setReindexMessage(`Успешно проиндексировано ${count} заметок`);
      setTimeout(() => setReindexMessage(null), 4000);
    } catch (err: any) {
      setReindexMessage(`Ошибка индексации: ${err?.message || 'Сбой'}`);
    } finally {
      setIsReindexing(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsAiModelDropdownOpen(false);
      }
      if (transferNoteDropdownRef.current && !transferNoteDropdownRef.current.contains(event.target as Node)) {
        setIsTransferNoteSelectOpen(false);
      }
      if (transferWsDropdownRef.current && !transferWsDropdownRef.current.contains(event.target as Node)) {
        setIsTransferWsSelectOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredTransferNotes = useMemo(() => {
    if (!transferNoteSearch.trim()) return notes;
    const q = transferNoteSearch.toLowerCase();
    return notes.filter(n => {
      const title = (n.title || '').toLowerCase();
      const content = (n.content || '').toLowerCase();
      const tags = (n.tags || []).join(' ').toLowerCase();
      return title.includes(q) || content.includes(q) || tags.includes(q);
    });
  }, [notes, transferNoteSearch]);

  const t = (key: string) => getTranslation(language, key);
  const isLight = isLightColor(theme.bg);

  const handleFileImport = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsImporting(true);
    setImportNotice(null);

    try {
      const { count, errors } = await importFiles(files);
      if (count > 0) {
        setImportNotice({
          type: 'success',
          message: `Успешно импортировано заметок: ${count}${errors.length > 0 ? ` (ошибок: ${errors.length})` : ''}`,
        });
      } else if (errors.length > 0) {
        setImportNotice({
          type: 'error',
          message: `Не удалось импортировать файлы: ${errors.join(', ')}`,
        });
      }
    } catch (e: any) {
      setImportNotice({
        type: 'error',
        message: e?.message || 'Ошибка импорта файлов',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const languages: { code: LanguageCode; name: string }[] = [
    { code: 'ru', name: 'Русский' },
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'it', name: 'Italiano' },
  ];

  const exportData = () => {
    const dataStr = JSON.stringify({ notes, taskLists, theme, language }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veris-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const cardBg = isLight ? '#FFFFFF' : hexToRgba(theme.text, 0.05);
  const cardBorder = hexToRgba(theme.text, 0.12);

  const categories = [
    { id: 'themes', title: tr('Темы'), icon: <Palette size={18} /> },
    { id: 'customization', title: tr('Кастомизация'), icon: <SlidersHorizontal size={18} /> },
    { id: 'editor', title: tr('Редактор'), icon: <Edit3 size={18} /> },
    { id: 'wellbeing', title: tr('Благополучие'), icon: <Heart size={18} /> },
    { id: 'language', title: tr('Язык'), icon: <Globe size={18} /> },
    { id: 'security', title: tr('Безопасность'), icon: <Lock size={18} /> },
    { id: 'data', title: tr('Данные'), icon: <Database size={18} /> },
    { id: 'ai', title: tr('ИИ'), icon: <Sparkles size={18} /> },
    { id: 'search', title: tr('Поиск'), icon: <Search size={18} /> },
    { id: 'other', title: tr('Другое'), icon: <MoreHorizontal size={18} /> },
  ];

  // If no category selected, render Category List
  if (!activeSettingsTab) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 md:p-12">
        <div className="max-w-md mx-auto w-full pt-4 pb-12">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-6 text-center">
            {tr('Настройки')}
          </h1>

          <div className="space-y-2.5">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveSettingsTab(cat.id)}
                className="w-full flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer hover:opacity-90 active:scale-[0.99]"
                style={{
                  backgroundColor: cardBg,
                  borderColor: cardBorder,
                  color: theme.text,
                }}
              >
                <div className="flex items-center gap-3.5">
                  <div className="opacity-80 flex items-center justify-center">
                    {cat.icon}
                  </div>
                  <span className="font-bold text-sm sm:text-base">{cat.title}</span>
                </div>
                <ChevronRight size={18} className="opacity-40" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Category Detail View
  const currentCategory = categories.find(c => c.id === activeSettingsTab);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 md:p-12">
      <div className="max-w-2xl mx-auto w-full pt-4 pb-12">
        {/* Category Header */}
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-center mb-6">
          {currentCategory?.title || tr('Настройки')}
        </h1>

        {/* TAB: Themes */}
        {activeSettingsTab === 'themes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsThemeRegistryOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition shadow-xs hover:shadow-md active:scale-98 cursor-pointer"
                style={{
                  backgroundColor: hexToRgba(theme.accent, 0.12),
                  color: theme.accent,
                  border: `1px solid ${hexToRgba(theme.accent, 0.25)}`,
                }}
              >
                <span>{tr('Подобрать тему')}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsThemeSchedulerOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition shadow-xs hover:shadow-md active:scale-98 cursor-pointer shrink-0"
                style={{
                  backgroundColor: themeSchedule?.enabled ? hexToRgba(theme.accent, 0.15) : hexToRgba(theme.text, 0.06),
                  color: themeSchedule?.enabled ? theme.accent : theme.text,
                  border: `1px solid ${themeSchedule?.enabled ? hexToRgba(theme.accent, 0.3) : hexToRgba(theme.text, 0.12)}`,
                }}
                title={tr('Настроить смену тем по времени (день / ночь)', 'Schedule theme changes by time (day / night)')}
              >
                <span>{tr('Смена тем', 'Theme Scheduler')}</span>
                {themeSchedule?.enabled && (
                  <span
                    className="w-2 h-2 rounded-full animate-pulse shrink-0"
                    style={{ backgroundColor: theme.accent }}
                  />
                )}
              </button>
            </div>

            {Object.entries(themeFilters).some(([_, v]) => Array.isArray(v) ? v.length > 0 : Boolean(v.trim())) && (
              <div className="flex items-center justify-start animate-fadeIn">
                <button
                  type="button"
                  onClick={() => setThemeFilters(DEFAULT_THEME_FILTERS)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold opacity-75 hover:opacity-100 transition cursor-pointer"
                  style={{
                    backgroundColor: hexToRgba(theme.text, 0.06),
                    color: theme.text,
                  }}
                  title={tr('Сбросить фильтры', 'Reset filters')}
                >
                  <RotateCcw size={12} />
                  <span>{tr('Сбросить фильтры', 'Reset filters')}</span>
                </button>
              </div>
            )}

            {THEME_CATEGORIES.map(category => {
              const matchingThemes = category.themes.filter(preset =>
                matchThemeWithFilters(preset, themeFilters)
              );
              if (matchingThemes.length === 0) return null;

              return (
                <div key={category.id} className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider opacity-60 flex items-center gap-1.5">
                    <span>{category.name}</span>
                    <span className="opacity-40 font-normal">{matchingThemes.length}</span>
                  </h3>

                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                    {matchingThemes.map(preset => {
                      const isActive = theme.id === preset.id;
                      return (
                        <div
                          key={preset.id}
                          onClick={() => setTheme(preset)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer relative shadow-xs hover:shadow-md ${
                            isActive ? 'ring-2 shadow-lg' : 'hover:scale-[1.01]'
                          }`}
                          style={{
                            backgroundColor: preset.bg,
                            borderColor: isActive ? preset.accent : hexToRgba(preset.text, 0.2),
                            color: preset.text,
                          }}
                        >
                          {/* Mini Screen Header */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-xs truncate">{preset.name}</span>
                            {isActive && (
                              <div
                                className="w-4 h-4 rounded-full flex items-center justify-center text-white shrink-0"
                                style={{ backgroundColor: preset.accent }}
                              >
                                <Check size={10} />
                              </div>
                            )}
                          </div>

                          {/* Mini Screen Body Preview */}
                          <div
                            className="p-2 rounded-xl border space-y-1"
                            style={{
                              backgroundColor: hexToRgba(preset.text, 0.04),
                              borderColor: hexToRgba(preset.text, 0.1),
                            }}
                          >
                            <div className="font-bold text-[11px] opacity-90 truncate">
                              Заголовок
                            </div>
                            <div className="text-[10px] opacity-70 leading-tight truncate">
                              Текст заметки
                            </div>
                            <div className="pt-1 flex items-center justify-between">
                              <span
                                className="px-1.5 py-0.5 rounded-md text-[9px] font-bold"
                                style={{
                                  backgroundColor: hexToRgba(preset.accent, 0.2),
                                  color: preset.accent,
                                }}
                              >
                                Акцент
                              </span>
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: preset.accent }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB: Language */}
        {activeSettingsTab === 'language' && (
          <div>
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            >
              {languages.map(lang => {
                const isSelected = language === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className="w-full flex items-center justify-between p-4 border-b last:border-0 text-sm font-semibold hover:opacity-80 transition text-left cursor-pointer"
                    style={{ borderColor: cardBorder }}
                  >
                    <span>{lang.name}</span>
                    {isSelected && <Check size={16} style={{ color: theme.accent }} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB: Customization */}
        {activeSettingsTab === 'customization' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl border space-y-4" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              {/* Gorizontalnoe glavnoe menu (Horizontal main menu) */}
              <div
                className="flex items-center justify-between text-xs font-semibold py-1 cursor-pointer gap-4"
                onClick={() => setQuickSettings(prev => ({ ...prev, horizontalMainMenu: !prev.horizontalMainMenu }))}
              >
                <div className="flex-1 pr-4">
                  <div>{tr('Горизонтальное главное меню')}</div>
                  <div className="text-[10px] opacity-50 font-normal mt-0.5">
                    {tr('Располагать блоки заметок и задач горизонтально (слева направо)')}
                  </div>
                </div>
                <div
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                    quickSettings.horizontalMainMenu ? 'justify-end' : 'justify-start'
                  }`}
                  style={{
                    backgroundColor: quickSettings.horizontalMainMenu ? theme.accent : hexToRgba(theme.text, 0.2),
                  }}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </div>
              </div>

              {/* Obvodka paneley (Panel border) */}
              <div
                className="flex items-center justify-between text-xs font-semibold pt-3 border-t cursor-pointer gap-4"
                style={{ borderColor: cardBorder }}
                onClick={() => setQuickSettings(prev => ({ ...prev, showBorder: !prev.showBorder }))}
              >
                <div className="flex-1 pr-4">
                  <div>{tr('Обводка панелей')}</div>
                  <div className="text-[10px] opacity-50 font-normal mt-0.5">{tr('Отображать тонкую рамку вокруг боковой панели, редактора и плиток')}</div>
                </div>
                <div
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                    quickSettings.showBorder ? 'justify-end' : 'justify-start'
                  }`}
                  style={{
                    backgroundColor: quickSettings.showBorder ? theme.accent : hexToRgba(theme.text, 0.2),
                  }}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </div>
              </div>

              {/* Metadata na plitkakh (Tile metadata toggle for notes and tasks) */}
              <div
                className="flex items-center justify-between text-xs font-semibold pt-3 border-t cursor-pointer gap-4"
                style={{ borderColor: cardBorder }}
                onClick={() => setQuickSettings(prev => ({ ...prev, showTileMetadata: !prev.showTileMetadata }))}
              >
                <div className="flex-1 pr-4">
                  <div>{tr('Метаданные на плитках')}</div>
                  <div className="text-[10px] opacity-50 font-normal mt-0.5">{tr('Отображать дату и время обновления на карточках заметок и задач')}</div>
                </div>
                <div
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                    quickSettings.showTileMetadata ? 'justify-end' : 'justify-start'
                  }`}
                  style={{
                    backgroundColor: quickSettings.showTileMetadata ? theme.accent : hexToRgba(theme.text, 0.2),
                  }}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </div>
              </div>

              {/* Hide 3-dots on tiles (Скрыть 3 точки на плитках) */}
              <div
                className="flex items-center justify-between text-xs font-semibold pt-3 border-t cursor-pointer gap-4"
                style={{ borderColor: cardBorder }}
                onClick={() => setQuickSettings(prev => ({ ...prev, hideTileDots: !prev.hideTileDots }))}
              >
                <div className="flex-1 pr-4">
                  <div>{tr('Скрыть 3 точки на плитках')}</div>
                  <div className="text-[10px] opacity-50 font-normal mt-0.5">{tr('Меню действий будет вызываться через зажатие плитки')}</div>
                </div>
                <div
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                    quickSettings.hideTileDots ? 'justify-end' : 'justify-start'
                  }`}
                  style={{
                    backgroundColor: quickSettings.hideTileDots ? theme.accent : hexToRgba(theme.text, 0.2),
                  }}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </div>
              </div>

              {/* Pinned Search Bar on Home Screen */}
              <div
                className="flex items-center justify-between text-xs font-semibold pt-3 border-t cursor-pointer gap-4"
                style={{ borderColor: cardBorder }}
                onClick={() => setQuickSettings(prev => ({ ...prev, pinSearchToHomeScreen: !prev.pinSearchToHomeScreen }))}
              >
                <div className="flex-1 pr-4">
                  <div>{tr('Панель поиска на главном экране')}</div>
                  <div className="text-[10px] opacity-50 font-normal mt-0.5">{tr('Закрепить панель поиска между оглавлением и списком заметок/задач')}</div>
                </div>
                <div
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                    quickSettings.pinSearchToHomeScreen ? 'justify-end' : 'justify-start'
                  }`}
                  style={{
                    backgroundColor: quickSettings.pinSearchToHomeScreen ? theme.accent : hexToRgba(theme.text, 0.2),
                  }}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </div>
              </div>

              {/* Tile Display Mode (Отображение плиток) */}
              <div className="flex flex-wrap sm:flex-nowrap items-center justify-between text-xs font-semibold pt-3 border-t gap-3" style={{ borderColor: cardBorder }}>
                <div className="flex-1 min-w-[140px] pr-2">
                  <div>{tr('Отображение плиток')}</div>
                  <div className="text-[10px] opacity-50 font-normal mt-0.5">{tr('Выберите, что показывать на карточках заметок')}</div>
                </div>
                <div className="shrink-0">
                  <CustomSelect
                    value={quickSettings.tileDisplayMode || 'both'}
                    onChange={val => setQuickSettings(prev => ({ ...prev, tileDisplayMode: val as any }))}
                    options={tileDisplayOptions}
                  />
                </div>
              </div>

              {/* Sidebar Tabs Display & Sequence (Вкладки бокового меню: Заметки / Задачи / Канбан / Календарь) */}
              <div className="pt-4 border-t space-y-3" style={{ borderColor: cardBorder }}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold">{tr('Вкладки бокового меню')}</div>
                    <div className="text-[10px] opacity-50 font-normal mt-0.5">
                      {tr('Настройте видимость и порядок вкладок')}
                    </div>
                  </div>
                  {/* Master Toggle for Sidebar Tabs Bar */}
                  <div
                    onClick={() =>
                      setQuickSettings(prev => ({
                        ...prev,
                        showSidebarTabs: prev.showSidebarTabs === false ? true : false,
                      }))
                    }
                    className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors shrink-0 ${
                      quickSettings.showSidebarTabs !== false ? 'justify-end' : 'justify-start'
                    }`}
                    style={{
                      backgroundColor:
                        quickSettings.showSidebarTabs !== false
                          ? theme.accent
                          : isLight
                          ? '#E5E7EB'
                          : 'rgba(255, 255, 255, 0.2)',
                    }}
                    title={quickSettings.showSidebarTabs !== false ? 'Панель вкладок включена' : 'Панель вкладок скрыта'}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                  </div>
                </div>

                {(() => {
                  const ALL_TABS: { id: SidebarTabId; label: string; icon: React.ReactNode }[] = [
                    { id: 'notes', label: tr('Заметки'), icon: <FileText size={14} /> },
                    { id: 'tasks', label: tr('Задачи'), icon: <CheckSquare size={14} /> },
                    { id: 'kanban', label: tr('Канбан'), icon: <Columns3 size={14} /> },
                    { id: 'calendar', label: tr('Календарь'), icon: <CalendarIcon size={14} /> },
                    { id: 'private', label: tr('Приват'), icon: <Shield size={14} /> },
                  ];

                  const currentActiveTabs: SidebarTabId[] =
                    quickSettings.sidebarTabs !== undefined
                      ? quickSettings.sidebarTabs
                      : ['notes', 'tasks'];

                  // Build complete ordered list including inactive ones at the end
                  const orderedAllTabs: SidebarTabId[] = [
                    ...currentActiveTabs,
                    ...(['notes', 'tasks', 'kanban', 'calendar', 'private'] as SidebarTabId[]).filter(
                      t => !currentActiveTabs.includes(t)
                    ),
                  ];

                  const handleToggleTab = (tabId: SidebarTabId) => {
                    const isCurrentlyActive = currentActiveTabs.includes(tabId);
                    if (isCurrentlyActive) {
                      const nextTabs = currentActiveTabs.filter(t => t !== tabId);
                      setQuickSettings(prev => ({ ...prev, sidebarTabs: nextTabs }));
                    } else {
                      const nextTabs = [...currentActiveTabs, tabId];
                      setQuickSettings(prev => ({ ...prev, sidebarTabs: nextTabs }));
                    }
                  };

                  const handleMoveTab = (index: number, direction: 'up' | 'down') => {
                    const targetIndex = direction === 'up' ? index - 1 : index + 1;
                    if (targetIndex < 0 || targetIndex >= orderedAllTabs.length) return;
                    const nextOrdered = [...orderedAllTabs];
                    const temp = nextOrdered[index];
                    nextOrdered[index] = nextOrdered[targetIndex];
                    nextOrdered[targetIndex] = temp;

                    // Preserve active tabs in the new order
                    const nextActive = nextOrdered.filter(t => currentActiveTabs.includes(t));
                    setQuickSettings(prev => ({ ...prev, sidebarTabs: nextActive }));
                  };

                  return (
                    <div className="space-y-1.5">
                      {orderedAllTabs.map((tabId, idx) => {
                        const tabInfo = ALL_TABS.find(t => t.id === tabId)!;
                        const isChecked = currentActiveTabs.includes(tabId);

                        return (
                          <div
                            key={tabId}
                            className="flex items-center justify-between p-2.5 rounded-2xl border transition-all"
                            style={{
                              backgroundColor: isChecked ? hexToRgba(theme.text, 0.04) : 'transparent',
                              borderColor: hexToRgba(theme.text, isChecked ? 0.15 : 0.08),
                              opacity: isChecked ? 1 : 0.6,
                            }}
                          >
                            {/* Checkbox and Tab info */}
                            <button
                              type="button"
                              onClick={() => handleToggleTab(tabId)}
                              className="flex items-center gap-3 flex-1 text-left cursor-pointer"
                            >
                              <div
                                className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors ${
                                  isChecked ? 'text-white' : ''
                                }`}
                                style={{
                                  backgroundColor: isChecked ? theme.accent : 'transparent',
                                  borderColor: isChecked ? theme.accent : hexToRgba(theme.text, 0.3),
                                }}
                              >
                                {isChecked && <Check size={12} strokeWidth={3} />}
                              </div>

                              <div className="flex items-center gap-2 text-xs font-bold">
                                <span style={{ color: isChecked ? theme.accent : theme.text }}>
                                  {tabInfo.icon}
                                </span>
                                <span>{tabInfo.label}</span>
                              </div>
                            </button>

                            {/* Order arrows */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveTab(idx, 'up')}
                                className="p-1.5 rounded-xl border opacity-70 hover:opacity-100 disabled:opacity-20 disabled:cursor-not-allowed transition cursor-pointer"
                                style={{
                                  borderColor: hexToRgba(theme.text, 0.12),
                                  backgroundColor: hexToRgba(theme.text, 0.04),
                                }}
                                title="Переместить выше"
                              >
                                <ArrowUp size={13} />
                              </button>
                              <button
                                type="button"
                                disabled={idx === orderedAllTabs.length - 1}
                                onClick={() => handleMoveTab(idx, 'down')}
                                className="p-1.5 rounded-xl border opacity-70 hover:opacity-100 disabled:opacity-20 disabled:cursor-not-allowed transition cursor-pointer"
                                style={{
                                  borderColor: hexToRgba(theme.text, 0.12),
                                  backgroundColor: hexToRgba(theme.text, 0.04),
                                }}
                                title="Переместить ниже"
                              >
                                <ArrowDown size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* TAB: Security */}
        {activeSettingsTab === 'security' && (
          <div className="space-y-4">
            {/* PIN Code Setting */}
            <div className="p-5 rounded-3xl border space-y-4" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <KeyRound size={24} strokeWidth={2.2} style={{ color: theme.accent }} className="shrink-0" />
                  <div>
                    <div className="text-sm font-bold tracking-tight">{tr('Пин-код на вход')}</div>
                    <div className="text-xs opacity-50 mt-0.5">
                      {appPin ? tr('Защита активна (от 1 до 12 цифр)') : tr('Блокировка при входе выключена')}
                    </div>
                  </div>
                </div>

                <div
                  className="px-3 py-1 rounded-full text-xs font-bold tracking-wide"
                  style={{
                    backgroundColor: appPin ? hexToRgba(theme.accent, 0.15) : hexToRgba(theme.text, 0.08),
                    color: appPin ? theme.accent : hexToRgba(theme.text, 0.6),
                  }}
                >
                  {appPin ? tr('Включен') : tr('Выключено')}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
                {!appPin ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPinModalTarget('app');
                      setPinModalMode('set');
                    }}
                    className="w-full py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer shadow-sm"
                    style={{
                      backgroundColor: theme.accent,
                      color: isLightColor(theme.accent) ? '#000000' : '#FFFFFF',
                    }}
                  >
                    <Lock size={15} />
                    <span>{tr('Установить пин-код')}</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setPinModalTarget('app');
                        setPinModalMode('change');
                      }}
                      className="flex-1 py-2.5 px-4 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 hover:opacity-85 active:scale-[0.98] transition cursor-pointer"
                      style={{
                        borderColor: cardBorder,
                        backgroundColor: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)',
                        color: theme.text,
                      }}
                    >
                      <span>{tr('Изменить пин-код')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPinModalTarget('app');
                        setPinModalMode('disable');
                      }}
                      className="py-2.5 px-4 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 text-red-500 hover:bg-red-500/10 active:scale-[0.98] transition cursor-pointer"
                      style={{
                        borderColor: hexToRgba('#EF4444', 0.25),
                      }}
                    >
                      <span>{tr('Отключить')}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Quick Test Lock when PIN is active */}
            {appPin && (
              <div className="p-4 rounded-3xl border flex items-center justify-between" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
                <div className="text-xs font-semibold opacity-75">
                  {tr('Заблокировать экран сейчас')}
                </div>
                <button
                  type="button"
                  onClick={lockApp}
                  className="py-2 px-3.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 hover:opacity-80 active:scale-95 transition cursor-pointer"
                  style={{ borderColor: cardBorder, color: theme.text }}
                >
                  <Lock size={13} />
                  <span>{tr('Заблокировать')}</span>
                </button>
              </div>
            )}

            {/* Private Space Security Setting */}
            <div className="p-5 rounded-3xl border space-y-4" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <Shield size={24} strokeWidth={2.2} style={{ color: theme.accent }} className="shrink-0" />
                  <div>
                    <div className="text-sm font-bold tracking-tight">{tr('Приватное пространство')}</div>
                    <div className="text-xs opacity-50 mt-0.5">
                      {privatePin ? tr('Защищено отдельным пин-кодом (от 1 до 12 цифр)') : tr('Отдельный скрытый раздел для конфиденциальных заметок')}
                    </div>
                  </div>
                </div>

                <div
                  className="px-3 py-1 rounded-full text-xs font-bold tracking-wide"
                  style={{
                    backgroundColor: privatePin ? hexToRgba(theme.accent, 0.15) : hexToRgba(theme.text, 0.08),
                    color: privatePin ? theme.accent : hexToRgba(theme.text, 0.6),
                  }}
                >
                  {privatePin ? tr('Включено') : tr('Выключено')}
                </div>
              </div>

              {/* Private Space Actions */}
              <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
                {!privatePin ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPinModalTarget('private');
                      setPinModalMode('set');
                    }}
                    className="w-full py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer shadow-sm"
                    style={{
                      backgroundColor: theme.accent,
                      color: isLightColor(theme.accent) ? '#000000' : '#FFFFFF',
                    }}
                  >
                    <Shield size={15} />
                    <span>{tr('Настроить пин-код привата')}</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setPinModalTarget('private');
                        setPinModalMode('change');
                      }}
                      className="flex-1 py-2.5 px-4 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 hover:opacity-85 active:scale-[0.98] transition cursor-pointer"
                      style={{
                        borderColor: cardBorder,
                        backgroundColor: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)',
                        color: theme.text,
                      }}
                    >
                      <span>{tr('Изменить пин')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPinModalTarget('private');
                        setPinModalMode('disable');
                      }}
                      className="py-2.5 px-4 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 text-red-500 hover:bg-red-500/10 active:scale-[0.98] transition cursor-pointer"
                      style={{
                        borderColor: hexToRgba('#EF4444', 0.25),
                      }}
                    >
                      <span>{tr('Отключить')}</span>
                    </button>
                  </>
                )}
              </div>

              {/* Private Space Quick Actions */}
              {privatePin && (
                <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: hexToRgba(theme.text, 0.08) }}>
                  <div className="text-xs font-semibold opacity-75">
                    {tr('Статус хранилища: ')}{isPrivateLocked ? tr('Заблокировано') : tr('Разблокировано')}
                  </div>
                  {!isPrivateLocked && (
                    <button
                      type="button"
                      onClick={lockPrivateSpace}
                      className="py-1.5 px-3 rounded-xl border font-bold text-xs flex items-center gap-1.5 hover:opacity-80 active:scale-95 transition cursor-pointer"
                      style={{ borderColor: cardBorder, color: theme.text }}
                    >
                      <Lock size={12} />
                      <span>{tr('Заблокировать')}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: Editor */}
        {activeSettingsTab === 'editor' && (
          <div className="space-y-4">
            {/* Workspaces Setting (Раздельные воркспейсы) - Collapsible */}
            <div className="p-5 rounded-2xl border transition-all" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setWorkspacesEnabled(!workspacesEnabled)}
              >
                <div>
                  <div className="text-sm font-bold">{tr('Раздельные воркспейсы')}</div>
                  <div className="text-xs opacity-50 font-normal mt-0.5">
                    {tr('Изолированные рабочие пространства')}
                  </div>
                </div>
                <div
                  className={`w-10 h-6 rounded-full p-1 transition-colors flex items-center shrink-0 ${
                    workspacesEnabled ? 'justify-end' : 'justify-start'
                  }`}
                  style={{
                    backgroundColor: workspacesEnabled ? theme.accent : hexToRgba(theme.text, 0.2),
                  }}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </div>
              </div>

              {workspacesEnabled && (
                <div className="pt-4 border-t mt-4 space-y-4" style={{ borderColor: cardBorder }}>
                  <button
                    type="button"
                    onClick={() => setIsWorkspacesOpen(prev => !prev)}
                    className="w-full flex items-center justify-between text-left cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span className="text-xs font-bold opacity-85">{tr('Управление воркспейсами')}</span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0"
                        style={{ backgroundColor: hexToRgba(theme.accent, 0.12), color: theme.accent }}
                      >
                        {workspaces.length}/3
                      </span>
                    </div>
                    <div className="opacity-60 hover:opacity-100 transition shrink-0">
                      <ChevronDown
                        size={16}
                        className={`transition-transform duration-200 ${isWorkspacesOpen ? 'rotate-180' : ''}`}
                        style={{ color: isWorkspacesOpen ? theme.accent : undefined }}
                      />
                    </div>
                  </button>

                  {isWorkspacesOpen && (
                    <div className="space-y-4 pt-1 animate-fadeIn">
                      {/* List of workspaces */}
                      <div className="space-y-1">
                        {workspaces.map(ws => {
                          const isActive = ws.id === activeWorkspaceId;
                          const isEditing = editingWorkspaceId === ws.id;

                          return (
                            <div
                              key={ws.id}
                              className="flex items-center justify-between py-2 px-2.5 rounded-xl transition-colors"
                              style={{
                                backgroundColor: isActive ? hexToRgba(theme.accent, 0.08) : 'transparent',
                              }}
                            >
                              {/* Left side: Pencil at the left border, followed by name/status */}
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingWorkspaceId(ws.id);
                                    setEditingWorkspaceName(ws.name);
                                  }}
                                  title={tr('Переименовать')}
                                  className="p-1.5 -ml-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-white/10 active:scale-95 transition cursor-pointer shrink-0"
                                  style={{ color: theme.text }}
                                >
                                  <Edit2 size={15} />
                                </button>

                                {isEditing ? (
                                  <form
                                    onSubmit={(e) => {
                                      e.preventDefault();
                                      if (editingWorkspaceName.trim()) {
                                        renameWorkspace(ws.id, editingWorkspaceName.trim());
                                      }
                                      setEditingWorkspaceId(null);
                                    }}
                                    className="flex items-center gap-1.5 flex-1 min-w-0"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <input
                                      autoFocus
                                      type="text"
                                      value={editingWorkspaceName}
                                      onChange={e => setEditingWorkspaceName(e.target.value)}
                                      className="py-1 px-2 text-xs font-semibold rounded-lg border outline-none bg-transparent flex-1 min-w-0"
                                      style={{
                                        borderColor: theme.accent,
                                        color: theme.text,
                                      }}
                                      onKeyDown={e => {
                                        if (e.key === 'Escape') setEditingWorkspaceId(null);
                                      }}
                                    />
                                    <button
                                      type="submit"
                                      className="p-1.5 rounded-lg text-xs font-bold cursor-pointer shrink-0 transition"
                                      style={{
                                        backgroundColor: theme.accent,
                                        color: isLightColor(theme.accent) ? '#000' : '#fff',
                                      }}
                                      title={tr('Сохранить')}
                                    >
                                      <Check size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingWorkspaceId(null)}
                                      className="p-1.5 rounded-lg text-xs opacity-60 hover:opacity-100 cursor-pointer shrink-0 transition"
                                      title={tr('Отмена')}
                                    >
                                      <X size={13} />
                                    </button>
                                  </form>
                                ) : (
                                  <div
                                    className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer select-none"
                                    onClick={() => switchWorkspace(ws.id)}
                                  >
                                    <div
                                      className="w-2.5 h-2.5 rounded-full shrink-0"
                                      style={{
                                        backgroundColor: isActive ? theme.accent : hexToRgba(theme.text, 0.25),
                                      }}
                                    />
                                    <span className={`text-sm truncate ${isActive ? 'font-bold' : 'font-medium opacity-80'}`}>
                                      {ws.name}
                                    </span>
                                    {isActive && (
                                      <span
                                        className="text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0"
                                        style={{
                                          backgroundColor: hexToRgba(theme.accent, 0.15),
                                          color: theme.accent,
                                        }}
                                      >
                                        {tr('Текущий')}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Right side: Delete button */}
                              {!isEditing && workspaces.length > 1 && (
                                <div className="flex items-center shrink-0 ml-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm(`Удалить воркспейс «${ws.name}»? Все данные будут перемещены в Основной воркспейс.`)) {
                                        deleteWorkspace(ws.id);
                                      }
                                    }}
                                    title={tr('Удалить')}
                                    className="p-1.5 rounded-lg opacity-40 hover:opacity-100 hover:bg-red-500/10 text-red-500 transition cursor-pointer"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Add workspace */}
                      {workspaces.length < 3 && (
                        isCreatingWorkspace ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (newWorkspaceName.trim()) {
                                createWorkspace(newWorkspaceName.trim());
                                setNewWorkspaceName('');
                                setIsCreatingWorkspace(false);
                              }
                            }}
                            className="flex items-center gap-1.5 p-1 rounded-xl border"
                            style={{ borderColor: theme.accent }}
                          >
                            <input
                              autoFocus
                              type="text"
                              placeholder={tr('Название нового воркспейса...')}
                              value={newWorkspaceName}
                              onChange={e => setNewWorkspaceName(e.target.value)}
                              className="py-1.5 px-2.5 text-xs font-semibold bg-transparent outline-none flex-1 min-w-0"
                              style={{ color: theme.text }}
                              onKeyDown={e => {
                                if (e.key === 'Escape') {
                                  setIsCreatingWorkspace(false);
                                  setNewWorkspaceName('');
                                }
                              }}
                            />
                            <button
                              type="submit"
                              className="py-1.5 px-3 rounded-lg text-xs font-bold cursor-pointer shrink-0 transition"
                              style={{
                                backgroundColor: theme.accent,
                                color: isLightColor(theme.accent) ? '#000' : '#fff',
                              }}
                            >
                              {tr('Создать')}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsCreatingWorkspace(false);
                                setNewWorkspaceName('');
                              }}
                              className="p-1.5 rounded-lg text-xs opacity-60 hover:opacity-100 cursor-pointer shrink-0"
                            >
                              <X size={14} />
                            </button>
                          </form>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsCreatingWorkspace(true)}
                            className="py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer opacity-80 hover:opacity-100 w-full"
                            style={{
                              color: theme.accent,
                              backgroundColor: hexToRgba(theme.accent, 0.08),
                            }}
                          >
                            <Plus size={14} />
                            <span>{tr('Создать воркспейс')} ({workspaces.length}/3)</span>
                          </button>
                        )
                      )}

                      {/* Transfer Elements Section */}
                      {workspaces.length > 1 && (
                        <div className="pt-4 space-y-3">
                          <div>
                            <div className="text-xs font-bold opacity-80">{tr('Перенос элементов')}</div>
                            <div className="text-[11px] opacity-45 mt-0.5">
                              {tr('Перемещение заметок из текущего воркспейса')} («{workspaces.find(w => w.id === activeWorkspaceId)?.name}»)
                            </div>
                          </div>

                          <div className="space-y-3 text-xs">
                            {/* Styled Dropdown: Что перенести (массовый выбор) */}
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between">
                                <label className="opacity-60 text-[11px] font-semibold">{tr('Что перенести (массовый выбор):')}</label>
                                {transferSelectedNoteIds.length > 0 && (
                                  <span
                                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                    style={{
                                      backgroundColor: hexToRgba(theme.accent, 0.15),
                                      color: theme.accent,
                                    }}
                                  >
                                    {tr('Выбрано')}: {transferSelectedNoteIds.length} {tr('из')} {notes.length}
                                  </span>
                                )}
                              </div>
                              <div className="relative" ref={transferNoteDropdownRef}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsTransferNoteSelectOpen(prev => !prev);
                                    setIsTransferWsSelectOpen(false);
                                  }}
                                  className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer hover:opacity-90 active:scale-[0.99]"
                                  style={{
                                    backgroundColor: cardBg,
                                    borderColor: isTransferNoteSelectOpen ? theme.accent : cardBorder,
                                    color: theme.text,
                                  }}
                                >
                                  <span className="truncate pr-2">
                                    {notes.length === 0
                                      ? tr('Нет заметок для переноса')
                                      : transferSelectedNoteIds.length === 0
                                      ? tr('Выберите заметки для переноса...')
                                      : transferSelectedNoteIds.length === notes.length
                                      ? `${tr('Все заметки')} (${notes.length} шт.)`
                                      : `${tr('Выбрано')}: ${transferSelectedNoteIds.length} ${tr('из')} ${notes.length}`}
                                  </span>
                                  <ChevronDown
                                    size={14}
                                    className={`shrink-0 opacity-60 transition-transform duration-200 ${
                                      isTransferNoteSelectOpen ? 'rotate-180' : ''
                                    }`}
                                  />
                                </button>

                                {isTransferNoteSelectOpen && (
                                  <div
                                    className="absolute left-0 right-0 top-full mt-1.5 p-2 rounded-2xl border shadow-2xl backdrop-blur-2xl z-50 animate-fadeIn space-y-2"
                                    style={{
                                      backgroundColor: cardBg,
                                      borderColor: cardBorder,
                                      boxShadow: `0 16px 36px ${isLight ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.6)'}`,
                                      color: theme.text,
                                    }}
                                  >
                                    {/* Quick select all / deselect toolbar */}
                                    <div
                                      className="flex items-center justify-between px-1 pb-1.5 border-b text-[11px]"
                                      style={{ borderColor: hexToRgba(theme.text, 0.08) }}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (transferSelectedNoteIds.length === notes.length) {
                                            setTransferSelectedNoteIds([]);
                                          } else {
                                            setTransferSelectedNoteIds(notes.map(n => n.id));
                                          }
                                        }}
                                        className="font-bold transition hover:opacity-80 cursor-pointer flex items-center gap-1.5"
                                        style={{ color: theme.accent }}
                                      >
                                        <CheckSquare size={13} />
                                        <span>
                                          {transferSelectedNoteIds.length === notes.length
                                            ? tr('Снять выбор со всех')
                                            : `${tr('Выбрать все')} (${notes.length})`}
                                        </span>
                                      </button>

                                      {transferSelectedNoteIds.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => setTransferSelectedNoteIds([])}
                                          className="opacity-50 hover:opacity-100 cursor-pointer font-medium"
                                        >
                                          {tr('Сбросить')} ({transferSelectedNoteIds.length})
                                        </button>
                                      )}
                                    </div>

                                    {notes.length > 4 && (
                                      <div
                                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border"
                                        style={{
                                          backgroundColor: hexToRgba(theme.text, 0.03),
                                          borderColor: hexToRgba(theme.text, 0.1),
                                        }}
                                      >
                                        <Search size={13} className="opacity-40 shrink-0" />
                                        <input
                                          type="text"
                                          value={transferNoteSearch}
                                          onChange={e => setTransferNoteSearch(e.target.value)}
                                          placeholder={tr('Поиск заметок...')}
                                          className="w-full bg-transparent text-xs font-medium outline-none placeholder:opacity-40"
                                        />
                                        {transferNoteSearch && (
                                          <button
                                            type="button"
                                            onClick={() => setTransferNoteSearch('')}
                                            className="p-0.5 opacity-40 hover:opacity-100 cursor-pointer"
                                          >
                                            <X size={12} />
                                          </button>
                                        )}
                                      </div>
                                    )}

                                    <div className="max-h-56 overflow-y-auto space-y-1 pr-0.5">
                                      {filteredTransferNotes.length === 0 ? (
                                        <div className="py-3 text-center text-xs opacity-40">
                                          {tr('Заметки не найдены')}
                                        </div>
                                      ) : (
                                        filteredTransferNotes.map(note => {
                                          const isSelected = transferSelectedNoteIds.includes(note.id);
                                          const noteTitle = stripHtmlTags(note.title || note.content).slice(0, 36) || tr('Без названия');
                                          return (
                                            <div
                                              key={note.id}
                                              onClick={() => {
                                                setTransferSelectedNoteIds(prev =>
                                                  prev.includes(note.id)
                                                    ? prev.filter(id => id !== note.id)
                                                    : [...prev, note.id]
                                                );
                                              }}
                                              className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer text-left select-none"
                                              style={{
                                                backgroundColor: isSelected ? hexToRgba(theme.accent, 0.12) : 'transparent',
                                                color: isSelected ? theme.accent : theme.text,
                                              }}
                                            >
                                              <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                                                <div
                                                  className="w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition"
                                                  style={{
                                                    backgroundColor: isSelected ? theme.accent : 'transparent',
                                                    borderColor: isSelected ? theme.accent : hexToRgba(theme.text, 0.3),
                                                    color: '#FFFFFF',
                                                  }}
                                                >
                                                  {isSelected && <Check size={11} strokeWidth={3} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <div className={`truncate ${isSelected ? 'font-bold' : 'opacity-85'}`}>
                                                    {noteTitle}
                                                  </div>
                                                  {note.tags && note.tags.length > 0 && (
                                                    <div className="text-[10px] opacity-50 truncate mt-0.5">
                                                      {note.tags.map(t => `#${t}`).join(' ')}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>

                                    {/* Footer bar in dropdown */}
                                    <div
                                      className="pt-1.5 border-t flex items-center justify-between px-1"
                                      style={{ borderColor: hexToRgba(theme.text, 0.08) }}
                                    >
                                      <span className="text-[11px] opacity-60">
                                        {tr('Выбрано')}: {transferSelectedNoteIds.length}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setIsTransferNoteSelectOpen(false)}
                                        className="px-3 py-1 rounded-lg text-xs font-bold transition hover:opacity-90 cursor-pointer"
                                        style={{
                                          backgroundColor: hexToRgba(theme.accent, 0.15),
                                          color: theme.accent,
                                        }}
                                      >
                                        {tr('Готово')}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Styled Dropdown: Куда перенести */}
                            <div className="flex flex-col gap-1.5">
                              <label className="opacity-60 text-[11px] font-semibold">{tr('Куда перенести:')}</label>
                              <div className="relative" ref={transferWsDropdownRef}>
                                {(() => {
                                  const availableTargets = workspaces.filter(ws => ws.id !== activeWorkspaceId);
                                  const selectedWs = availableTargets.find(ws => ws.id === transferTargetWsId) || availableTargets[0];

                                  return (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setIsTransferWsSelectOpen(prev => !prev);
                                          setIsTransferNoteSelectOpen(false);
                                        }}
                                        className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer hover:opacity-90 active:scale-[0.99]"
                                        style={{
                                          backgroundColor: cardBg,
                                          borderColor: isTransferWsSelectOpen ? theme.accent : cardBorder,
                                          color: theme.text,
                                        }}
                                      >
                                        <span className="truncate pr-2">
                                          {selectedWs?.name || tr('Выберите воркспейс')}
                                        </span>
                                        <ChevronDown
                                          size={14}
                                          className={`shrink-0 opacity-60 transition-transform duration-200 ${
                                            isTransferWsSelectOpen ? 'rotate-180' : ''
                                          }`}
                                        />
                                      </button>

                                      {isTransferWsSelectOpen && (
                                        <div
                                          className="absolute left-0 right-0 top-full mt-1.5 p-1.5 rounded-2xl border shadow-2xl backdrop-blur-2xl z-50 animate-fadeIn space-y-1"
                                          style={{
                                            backgroundColor: cardBg,
                                            borderColor: cardBorder,
                                            boxShadow: `0 16px 36px ${isLight ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.6)'}`,
                                            color: theme.text,
                                          }}
                                        >
                                          {availableTargets.map(ws => {
                                            const isSelected = (transferTargetWsId || availableTargets[0]?.id) === ws.id;
                                            return (
                                              <button
                                                key={ws.id}
                                                type="button"
                                                onClick={() => {
                                                  setTransferTargetWsId(ws.id);
                                                  setIsTransferWsSelectOpen(false);
                                                }}
                                                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer text-left"
                                                style={{
                                                  backgroundColor: isSelected ? hexToRgba(theme.accent, 0.15) : 'transparent',
                                                  color: isSelected ? theme.accent : theme.text,
                                                }}
                                              >
                                                <span className={isSelected ? 'font-bold' : 'opacity-85'}>{ws.name}</span>
                                                {isSelected && (
                                                  <div
                                                    className="w-4 h-4 rounded-full flex items-center justify-center text-white shrink-0"
                                                    style={{ backgroundColor: theme.accent }}
                                                  >
                                                    <Check size={10} />
                                                  </div>
                                                )}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>

                            <button
                              disabled={transferSelectedNoteIds.length === 0 || isTransferring}
                              onClick={async () => {
                                const otherWorkspaces = workspaces.filter(w => w.id !== activeWorkspaceId);
                                const targetId = transferTargetWsId || otherWorkspaces[0]?.id;
                                if (!targetId || transferSelectedNoteIds.length === 0) return;
                                setIsTransferring(true);
                                try {
                                  await moveNotesToWorkspace(transferSelectedNoteIds, targetId);
                                  setTransferSelectedNoteIds([]);
                                  setIsTransferNoteSelectOpen(false);
                                } finally {
                                  setIsTransferring(false);
                                }
                              }}
                              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                                transferSelectedNoteIds.length === 0 || isTransferring ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90 active:scale-[0.98]'
                              }`}
                              style={{
                                backgroundColor: theme.accent,
                                color: isLightColor(theme.accent) ? '#000000' : '#FFFFFF',
                              }}
                            >
                              {isTransferring ? (
                                <>
                                  <Loader2 size={13} className="animate-spin" />
                                  <span>{tr('Перенос заметок')} ({transferSelectedNoteIds.length} шт.)...</span>
                                </>
                              ) : (
                                <span>
                                  {transferSelectedNoteIds.length > 0
                                    ? `${tr('Перенести заметки')} (${transferSelectedNoteIds.length} шт.)`
                                    : tr('Выберите заметки для переноса')}
                                </span>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Launch Screen Setting (Что открывать при запуске) - Collapsible */}
            <div className="p-4 rounded-2xl border space-y-3 transition-all" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <button
                type="button"
                onClick={() => setIsLaunchScreenOpen(prev => !prev)}
                className="w-full flex items-center justify-between text-left cursor-pointer select-none"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className="text-xs font-bold opacity-85">{tr('Что открывать при запуске')}</span>
                </div>
                <div className="opacity-60 hover:opacity-100 transition shrink-0">
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${isLaunchScreenOpen ? 'rotate-180' : ''}`}
                    style={{ color: isLaunchScreenOpen ? theme.accent : undefined }}
                  />
                </div>
              </button>

              {isLaunchScreenOpen && (
                <div className="rounded-xl border overflow-hidden animate-fadeIn" style={{ borderColor: cardBorder }}>
                  {[
                    { id: 'notes', label: tr('Список заметок') },
                    { id: 'editor', label: tr('Последняя заметка') },
                    { id: 'tasks', label: tr('Список задач') },
                    { id: 'kanban', label: tr('Канбан') },
                    { id: 'anacrusa', label: 'Anacrusa' },
                  ].map((item, idx, arr) => {
                    const isSelected = launchScreen === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setLaunchScreen(item.id as any)}
                        className={`w-full flex items-center justify-between p-3.5 text-left transition cursor-pointer ${
                          idx < arr.length - 1 ? 'border-b' : ''
                        }`}
                        style={{
                          borderColor: cardBorder,
                          backgroundColor: isSelected ? hexToRgba(theme.accent, 0.15) : 'transparent',
                          color: isSelected ? theme.accent : theme.text,
                        }}
                      >
                        <div className={`text-xs ${isSelected ? 'font-bold' : 'font-semibold'}`}>
                          {item.label}
                        </div>
                        {isSelected && <Check size={16} style={{ color: theme.accent }} strokeWidth={2.5} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Typography & System Styling - Collapsible */}
            <div className="p-4 rounded-2xl border space-y-4 transition-all" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <button
                type="button"
                onClick={() => setIsTypographyOpen(prev => !prev)}
                className="w-full flex items-center justify-between text-left cursor-pointer select-none"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span className="text-xs font-bold opacity-85">{tr('Типографика и оформление')}</span>
                </div>
                <div className="opacity-60 hover:opacity-100 transition shrink-0">
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${isTypographyOpen ? 'rotate-180' : ''}`}
                    style={{ color: isTypographyOpen ? theme.accent : undefined }}
                  />
                </div>
              </button>

              {isTypographyOpen && (
                <div className="space-y-4 pt-1 animate-fadeIn">
                  {/* Font Size */}
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>{tr('Размер шрифта')}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQuickSettings(prev => ({ ...prev, fontSize: Math.max(10, prev.fontSize - 1) }))}
                        className="w-8 h-8 rounded-xl border hover:opacity-80 active:scale-95 transition flex items-center justify-center font-bold text-sm cursor-pointer"
                        style={{ borderColor: cardBorder }}
                      >
                        -
                      </button>
                      <span className="font-bold w-10 text-center text-sm">{quickSettings.fontSize}</span>
                      <button
                        onClick={() => setQuickSettings(prev => ({ ...prev, fontSize: Math.min(32, prev.fontSize + 1) }))}
                        className="w-8 h-8 rounded-xl border hover:opacity-80 active:scale-95 transition flex items-center justify-center font-bold text-sm cursor-pointer"
                        style={{ borderColor: cardBorder }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Line Height */}
                  <div className="flex items-center justify-between text-xs font-semibold pt-3 border-t" style={{ borderColor: cardBorder }}>
                    <span>{tr('Межстрочный интервал')}</span>
                    <CustomSelect
                      value={quickSettings.lineHeight || 1.6}
                      onChange={val => setQuickSettings(prev => ({ ...prev, lineHeight: val }))}
                      options={LINE_HEIGHT_OPTIONS}
                    />
                  </div>

                  {/* Font Family */}
                  <div className="flex items-center justify-between text-xs font-semibold pt-3 border-t" style={{ borderColor: cardBorder }}>
                    <span>{tr('Шрифт во всей системе')}</span>
                    <CustomSelect
                      value={quickSettings.fontFamily || 'sans'}
                      onChange={val => setQuickSettings(prev => ({ ...prev, fontFamily: val }))}
                      options={FONT_FAMILY_OPTIONS}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Note Display Metadata & Formatting - Collapsible */}
            <div className="p-4 rounded-2xl border space-y-4 transition-all" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <button
                type="button"
                onClick={() => setIsNoteDisplayOpen(prev => !prev)}
                className="w-full flex items-center justify-between text-left cursor-pointer select-none"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span className="text-xs font-bold opacity-85">{tr('Отображение в заметках')}</span>
                </div>
                <div className="opacity-60 hover:opacity-100 transition shrink-0">
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${isNoteDisplayOpen ? 'rotate-180' : ''}`}
                    style={{ color: isNoteDisplayOpen ? theme.accent : undefined }}
                  />
                </div>
              </button>

              {isNoteDisplayOpen && (
                <div className="space-y-3 pt-1 animate-fadeIn">
                  {/* Schetchik simvolov */}
                  <div
                    className="flex items-center justify-between text-xs font-semibold py-1 cursor-pointer gap-4"
                    onClick={() => setQuickSettings(prev => ({ ...prev, showCharCount: !prev.showCharCount }))}
                  >
                    <div className="flex-1 pr-4">
                      <div>{tr('Счётчик символов')}</div>
                      <div className="text-[10px] opacity-50 font-normal mt-0.5">{tr('Отображать количество символов под заголовком заметки')}</div>
                    </div>
                    <div
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                        quickSettings.showCharCount ? 'justify-end' : 'justify-start'
                      }`}
                      style={{
                        backgroundColor: quickSettings.showCharCount ? theme.accent : hexToRgba(theme.text, 0.2),
                      }}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                    </div>
                  </div>

                  {/* Schetchik slov */}
                  <div
                    className="flex items-center justify-between text-xs font-semibold pt-3 border-t cursor-pointer gap-4"
                    style={{ borderColor: cardBorder }}
                    onClick={() => setQuickSettings(prev => ({ ...prev, showWordCount: !prev.showWordCount }))}
                  >
                    <div className="flex-1 pr-4">
                      <div>{tr('Счётчик слов')}</div>
                      <div className="text-[10px] opacity-50 font-normal mt-0.5">{tr('Отображать количество слов под заголовком заметки')}</div>
                    </div>
                    <div
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                        quickSettings.showWordCount ? 'justify-end' : 'justify-start'
                      }`}
                      style={{
                        backgroundColor: quickSettings.showWordCount ? theme.accent : hexToRgba(theme.text, 0.2),
                      }}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                    </div>
                  </div>

                  {/* Data izmeneniya */}
                  <div
                    className="flex items-center justify-between text-xs font-semibold pt-3 border-t cursor-pointer gap-4"
                    style={{ borderColor: cardBorder }}
                    onClick={() => setQuickSettings(prev => ({ ...prev, showDate: !prev.showDate }))}
                  >
                    <div className="flex-1 pr-4">
                      <div>{tr('Дата изменения')}</div>
                      <div className="text-[10px] opacity-50 font-normal mt-0.5">{tr('Отображать дату последнего изменения заметки')}</div>
                    </div>
                    <div
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                        quickSettings.showDate ? 'justify-end' : 'justify-start'
                      }`}
                      style={{
                        backgroundColor: quickSettings.showDate ? theme.accent : hexToRgba(theme.text, 0.2),
                      }}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                    </div>
                  </div>

                  {/* Odnorazovoe formatirovanie */}
                  <div
                    className="flex items-center justify-between text-xs font-semibold pt-3 border-t cursor-pointer gap-4"
                    style={{ borderColor: cardBorder }}
                    onClick={() => setQuickSettings(prev => ({ ...prev, oneTimeFormatting: !prev.oneTimeFormatting }))}
                  >
                    <div className="flex-1 pr-4">
                      <div>{tr('Одноразовое форматирование')}</div>
                      <div className="text-[10px] opacity-50 font-normal mt-0.5">{tr('Сбрасывать активный инструмент форматирования после применения к тексту')}</div>
                    </div>
                    <div
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                        quickSettings.oneTimeFormatting ? 'justify-end' : 'justify-start'
                      }`}
                      style={{
                        backgroundColor: quickSettings.oneTimeFormatting ? theme.accent : hexToRgba(theme.text, 0.2),
                      }}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Formatting Toolbar Buttons (Кнопки меню форматирования) - Collapsible */}
            <div className="p-4 rounded-2xl border space-y-3 transition-all" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <button
                type="button"
                onClick={() => setIsFormattingButtonsOpen(prev => !prev)}
                className="w-full flex items-center justify-between text-left cursor-pointer select-none"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold opacity-85">{tr('Кнопки меню форматирования')}</span>
                  </div>
                  <div className="text-[10px] opacity-50 font-normal mt-0.5 line-clamp-1">
                    {tr('Выберите, какие кнопки отображать во всплывающем меню при выделении текста в заметке')}
                  </div>
                </div>
                <div className="opacity-60 hover:opacity-100 transition shrink-0">
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${isFormattingButtonsOpen ? 'rotate-180' : ''}`}
                    style={{ color: isFormattingButtonsOpen ? theme.accent : undefined }}
                  />
                </div>
              </button>

              {isFormattingButtonsOpen && (
                <div className="space-y-1 pt-2 border-t animate-fadeIn" style={{ borderColor: cardBorder }}>
                  {formattingButtonOptions.map((btn, idx) => {
                    const currentBtns = quickSettings.formattingToolbarButtons || ALL_FORMATTING_TOOLBAR_BUTTONS;
                    const isEnabled = currentBtns.includes(btn.id);
                    const IconComp = btn.icon;

                    const handleToggle = () => {
                      const next = isEnabled
                        ? currentBtns.filter(id => id !== btn.id)
                        : [...currentBtns, btn.id];
                      setQuickSettings(prev => ({ ...prev, formattingToolbarButtons: next }));
                    };

                    return (
                      <div
                        key={btn.id}
                        className={`flex items-center justify-between text-xs font-semibold py-2.5 cursor-pointer gap-4 ${
                          idx > 0 ? 'border-t' : ''
                        }`}
                        style={{ borderColor: cardBorder }}
                        onClick={handleToggle}
                      >
                        <div className="flex items-center gap-2.5 flex-1 pr-4 min-w-0">
                          {btn.letter ? (
                            <div
                              className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs border shrink-0 ${btn.letterClass || ''}`}
                              style={{ borderColor: cardBorder, backgroundColor: hexToRgba(theme.text, 0.04) }}
                            >
                              {btn.letter}
                            </div>
                          ) : IconComp ? (
                            <div
                              className="w-7 h-7 rounded-xl flex items-center justify-center border shrink-0 opacity-80"
                              style={{ borderColor: cardBorder, backgroundColor: hexToRgba(theme.text, 0.04) }}
                            >
                              <IconComp size={14} />
                            </div>
                          ) : null}
                          <div className="min-w-0">
                            <div className="truncate">{btn.label}</div>
                            <div className="text-[10px] opacity-50 font-normal mt-0.5 line-clamp-1">{btn.desc}</div>
                          </div>
                        </div>

                        <div
                          className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                            isEnabled ? 'justify-end' : 'justify-start'
                          }`}
                          style={{
                            backgroundColor: isEnabled ? theme.accent : hexToRgba(theme.text, 0.2),
                          }}
                        >
                          <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Note Action Buttons (Кнопки меню заметки) - Collapsible */}
            <div className="p-4 rounded-2xl border space-y-3 transition-all" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <button
                type="button"
                onClick={() => setIsNoteActionButtonsOpen(prev => !prev)}
                className="w-full flex items-center justify-between text-left cursor-pointer select-none"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold opacity-85">{tr('Кнопки меню заметки')}</span>
                  </div>
                  <div className="text-[10px] opacity-50 font-normal mt-0.5 line-clamp-1">
                    {tr('Выберите, какие кнопки отображать во всплывающем меню действий с заметкой')}
                  </div>
                </div>
                <div className="opacity-60 hover:opacity-100 transition shrink-0">
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${isNoteActionButtonsOpen ? 'rotate-180' : ''}`}
                    style={{ color: isNoteActionButtonsOpen ? theme.accent : undefined }}
                  />
                </div>
              </button>

              {isNoteActionButtonsOpen && (
                <div className="space-y-1 pt-2 border-t animate-fadeIn" style={{ borderColor: cardBorder }}>
                  {noteTileActionOptions.map((btn, idx) => {
                    const currentActions = quickSettings.noteTileActions || ALL_NOTE_TILE_ACTIONS;
                    const isEnabled = currentActions.includes(btn.id);
                    const IconComp = btn.icon;

                    const handleToggle = () => {
                      const next = isEnabled
                        ? currentActions.filter(id => id !== btn.id)
                        : [...currentActions, btn.id];
                      setQuickSettings(prev => ({ ...prev, noteTileActions: next }));
                    };

                    return (
                      <div
                        key={btn.id}
                        className={`flex items-center justify-between text-xs font-semibold py-2.5 cursor-pointer gap-4 ${
                          idx > 0 ? 'border-t' : ''
                        }`}
                        style={{ borderColor: cardBorder }}
                        onClick={handleToggle}
                      >
                        <div className="flex items-center gap-2.5 flex-1 pr-4 min-w-0">
                          <div
                            className="w-7 h-7 rounded-xl flex items-center justify-center border shrink-0 opacity-80"
                            style={{ borderColor: cardBorder, backgroundColor: hexToRgba(theme.text, 0.04) }}
                          >
                            <IconComp size={14} style={{ color: theme.accent }} />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate">{btn.label}</div>
                            <div className="text-[10px] opacity-50 font-normal mt-0.5 line-clamp-1">{btn.desc}</div>
                          </div>
                        </div>

                        <div
                          className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                            isEnabled ? 'justify-end' : 'justify-start'
                          }`}
                          style={{
                            backgroundColor: isEnabled ? theme.accent : hexToRgba(theme.text, 0.2),
                          }}
                        >
                          <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Editor Quick Actions (Кнопки быстрых действий) - Collapsible */}
            <div className="p-4 rounded-2xl border space-y-3 transition-all" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <button
                type="button"
                onClick={() => setIsEditorQuickActionsOpen(prev => !prev)}
                className="w-full flex items-center justify-between text-left cursor-pointer select-none"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold opacity-85">{tr('Кнопки быстрых действий')}</span>
                  </div>
                  <div className="text-[10px] opacity-50 font-normal mt-0.5 line-clamp-1">
                    {tr('Выберите, какие действия отображать в меню редактора заметки (кнопка ⋮)')}
                  </div>
                </div>
                <div className="opacity-60 hover:opacity-100 transition shrink-0">
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${isEditorQuickActionsOpen ? 'rotate-180' : ''}`}
                    style={{ color: isEditorQuickActionsOpen ? theme.accent : undefined }}
                  />
                </div>
              </button>

              {isEditorQuickActionsOpen && (
                <div className="space-y-1 pt-2 border-t animate-fadeIn" style={{ borderColor: cardBorder }}>
                  {editorQuickActionOptions.map((btn, idx) => {
                    const currentActions = quickSettings.editorQuickActions || ALL_EDITOR_QUICK_ACTIONS;
                    const isEnabled = currentActions.includes(btn.id);
                    const IconComp = btn.icon;

                    const handleToggle = () => {
                      const next = isEnabled
                        ? currentActions.filter(id => id !== btn.id)
                        : [...currentActions, btn.id];
                      setQuickSettings(prev => ({ ...prev, editorQuickActions: next }));
                    };

                    return (
                      <div
                        key={btn.id}
                        className={`flex items-center justify-between text-xs font-semibold py-2.5 cursor-pointer gap-4 ${
                          idx > 0 ? 'border-t' : ''
                        }`}
                        style={{ borderColor: cardBorder }}
                        onClick={handleToggle}
                      >
                        <div className="flex items-center gap-2.5 flex-1 pr-4 min-w-0">
                          <div
                            className="w-7 h-7 rounded-xl flex items-center justify-center border shrink-0 opacity-80"
                            style={{ borderColor: cardBorder, backgroundColor: hexToRgba(theme.text, 0.04) }}
                          >
                            <IconComp size={14} style={{ color: theme.accent }} />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate">{btn.label}</div>
                            <div className="text-[10px] opacity-50 font-normal mt-0.5 line-clamp-1">{btn.desc}</div>
                          </div>
                        </div>

                        <div
                          className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                            isEnabled ? 'justify-end' : 'justify-start'
                          }`}
                          style={{
                            backgroundColor: isEnabled ? theme.accent : hexToRgba(theme.text, 0.2),
                          }}
                        >
                          <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Custom Highlight Colors (Цвета выделения текста) */}
            <div className="p-4 rounded-2xl border space-y-3 transition-all" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold opacity-85">{tr('Цвета выделения текста', 'Text Highlight Colors')}</div>
                  <div className="text-[10px] opacity-50 font-normal mt-0.5">
                    {tr('Нажмите на цвет для выбора в палитре', 'Tap a color to customize in palette')}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResetAllHighlightColors}
                  className="px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0 opacity-75 hover:opacity-100"
                  style={{
                    borderColor: cardBorder,
                    backgroundColor: hexToRgba(theme.text, 0.04),
                    color: theme.text,
                  }}
                  title={tr('Сбросить все цвета на базовые пастельные', 'Reset all colors to default pastel')}
                >
                  <RotateCcw size={12} />
                  <span>{tr('Сбросить', 'Reset')}</span>
                </button>
              </div>

              {/* 8 Color Swatches */}
              <div className="flex items-center justify-between gap-1.5 sm:gap-2 pt-1">
                {activeHighlightColors.map((color, idx) => {
                  const defaultInfo = DEFAULT_PASTEL_HIGHLIGHT_COLORS[idx];
                  const isLight = isColorLight(color);

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditingHighlightIndex(idx)}
                      className="flex-1 aspect-square max-w-[42px] rounded-full border transition-all duration-150 cursor-pointer shadow-xs hover:scale-110 active:scale-95 flex items-center justify-center shrink-0 group"
                      style={{
                        backgroundColor: color,
                        borderColor: hexToRgba(theme.text, 0.15),
                      }}
                      title={`${defaultInfo?.label || `Цвет ${idx + 1}`}: ${color}`}
                    >
                      <span
                        className="text-[11px] font-bold select-none opacity-40 group-hover:opacity-100 transition-opacity"
                        style={{ color: isLight ? '#000000' : '#FFFFFF' }}
                      >
                        {idx + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Palette Modal for Highlight Color selection */}
            {editingHighlightIndex !== null && (
              <ColorPaletteModal
                isOpen={editingHighlightIndex !== null}
                initialColor={activeHighlightColors[editingHighlightIndex]}
                onClose={() => setEditingHighlightIndex(null)}
                onApply={(newColor) => {
                  handleSelectHighlightColor(editingHighlightIndex, newColor);
                  setEditingHighlightIndex(null);
                }}
                theme={theme}
                title={`${tr('Цвет маркера', 'Marker Color')} #${editingHighlightIndex + 1}`}
              />
            )}
          </div>
        )}

        {/* TAB: Wellbeing (Благополучие) */}
        {activeSettingsTab === 'wellbeing' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Focus Mode card */}
            <div
              className="p-5 rounded-3xl border space-y-3"
              style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            >
              <div
                className="flex items-center justify-between gap-4 cursor-pointer"
                onClick={() =>
                  setQuickSettings(prev => ({
                    ...prev,
                    pinFocusModeToBottomBar: !prev.pinFocusModeToBottomBar,
                  }))
                }
              >
                <div className="space-y-1 pr-2">
                  <span className="font-bold text-sm block">
                    {tr('Закрепить режим фокуса')}
                  </span>
                  <p className="text-xs opacity-60 leading-relaxed">
                    {tr('Переносит кнопку включения режима фокуса в нижнюю панель редактора (справа от «•••»).')}
                  </p>
                </div>
                <div
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                    quickSettings.pinFocusModeToBottomBar ? 'justify-end' : 'justify-start'
                  }`}
                  style={{
                    backgroundColor: quickSettings.pinFocusModeToBottomBar
                      ? theme.accent
                      : hexToRgba(theme.text, 0.2),
                  }}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </div>
              </div>
            </div>

            {/* Bedtime Preparation card (Подготовка ко сну) */}
            <div
              className="p-5 rounded-3xl border space-y-4"
              style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            >
              {/* Header with switch */}
              <div
                className="flex items-center justify-between gap-4 cursor-pointer"
                onClick={() =>
                  setQuickSettings(prev => ({
                    ...prev,
                    bedtimeReminderEnabled: !prev.bedtimeReminderEnabled,
                  }))
                }
              >
                <div className="space-y-0.5 pr-2">
                  <span className="font-bold text-sm block">
                    {tr('Подготовка ко сну')}
                  </span>
                  <p className="text-xs opacity-60">
                    {tr('Ежедневное напоминание завершить дела и настроиться на сон')}
                  </p>
                </div>

                <div
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                    quickSettings.bedtimeReminderEnabled ? 'justify-end' : 'justify-start'
                  }`}
                  style={{
                    backgroundColor: quickSettings.bedtimeReminderEnabled
                      ? theme.accent
                      : hexToRgba(theme.text, 0.2),
                  }}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </div>
              </div>

              {/* Collapsible/Active Details */}
              {quickSettings.bedtimeReminderEnabled && (
                <div
                  className="space-y-4 pt-3 border-t"
                  style={{ borderColor: hexToRgba(theme.text, 0.08) }}
                >
                  {/* Custom Time Picker */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold opacity-75">
                      {tr('Время напоминания')}
                    </label>
                    <CustomTimePicker
                      value={quickSettings.bedtimeReminderTime || '22:30'}
                      onChange={t =>
                        setQuickSettings(prev => ({
                          ...prev,
                          bedtimeReminderTime: t,
                        }))
                      }
                      placeholder={tr('Выберите время ко сну')}
                    />
                    <p className="text-[11px] opacity-50">
                      {tr('В указанное время появится пуш-уведомление с вашим заголовком и текстом.')}
                    </p>
                  </div>

                  {/* Custom Title Input */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold opacity-75">
                      {tr('Заголовок напоминания')}
                    </label>
                    <input
                      type="text"
                      value={
                        quickSettings.bedtimeReminderTitle !== undefined
                          ? quickSettings.bedtimeReminderTitle
                          : 'Подготовка ко сну'
                      }
                      onChange={e =>
                        setQuickSettings(prev => ({
                          ...prev,
                          bedtimeReminderTitle: e.target.value,
                        }))
                      }
                      placeholder={tr('Подготовка ко сну')}
                      className="w-full px-3.5 py-2.5 rounded-2xl border text-xs focus:outline-none transition shadow-inner"
                      style={{
                        backgroundColor: hexToRgba(theme.text, 0.03),
                        borderColor: hexToRgba(theme.text, 0.15),
                        color: theme.text,
                      }}
                    />
                  </div>

                  {/* Custom Description Textarea */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold opacity-75">
                      {tr('Описание напоминания')}
                    </label>
                    <textarea
                      rows={2}
                      value={quickSettings.bedtimeReminderDescription || ''}
                      onChange={e =>
                        setQuickSettings(prev => ({
                          ...prev,
                          bedtimeReminderDescription: e.target.value,
                        }))
                      }
                      placeholder={tr('Добавьте описание (необязательно)')}
                      className="w-full px-3.5 py-2.5 rounded-2xl border text-xs focus:outline-none transition shadow-inner resize-none"
                      style={{
                        backgroundColor: hexToRgba(theme.text, 0.03),
                        borderColor: hexToRgba(theme.text, 0.15),
                        color: theme.text,
                      }}
                    />
                  </div>

                  {/* Action buttons: Test preview + Request Browser Notification permission */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => triggerBedtimeReminderTest()}
                      className="py-2 px-3.5 rounded-2xl text-xs font-bold text-white transition active:scale-95 cursor-pointer shadow-sm flex items-center gap-2"
                      style={{ backgroundColor: theme.accent }}
                    >
                      <Bell size={14} />
                      <span>{tr('Проверить напоминание')}</span>
                    </button>

                    {typeof window !== 'undefined' &&
                      'Notification' in window &&
                      Notification.permission === 'default' && (
                        <button
                          type="button"
                          onClick={() => {
                            Notification.requestPermission().then(() => {
                              // state will update
                            });
                          }}
                          className="py-2 px-3 rounded-2xl border text-xs font-semibold transition active:scale-95 cursor-pointer opacity-70 hover:opacity-100"
                          style={{
                            borderColor: hexToRgba(theme.text, 0.2),
                            backgroundColor: hexToRgba(theme.text, 0.03),
                            color: theme.text,
                          }}
                        >
                          {tr('Разрешить системные пуш-уведомления')}
                        </button>
                      )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: Data */}
        {activeSettingsTab === 'data' && (
          <div className="space-y-4">
            {/* Plashka 1: Import Notes from multiple formats */}
            <div className="p-4 rounded-2xl border space-y-3" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <div className="text-sm font-bold">{tr('Импорт заметок и файлов', 'Import Notes and Files')}</div>

              {/* Upload Dropzone / Button */}
              <label
                className={`w-full p-4 rounded-xl border border-dashed flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition active:scale-[0.99] ${
                  isImporting ? 'opacity-50 pointer-events-none' : 'hover:bg-white/5'
                }`}
                style={{
                  borderColor: theme.accent,
                  backgroundColor: hexToRgba(theme.accent, 0.05),
                }}
              >
                <input
                  type="file"
                  multiple
                  accept=".pdf,.txt,.epub,.fb2,.docx,.md,.markdown,.html,.htm,.json,.cvt,.csv,.tsv,.tab,.rtf,.png,.jpg,.jpeg,.webp,.gif,.svg,.bmp,.avif,.ico,.tiff"
                  className="hidden"
                  onChange={e => handleFileImport(e.target.files)}
                  disabled={isImporting}
                />
                <div style={{ color: theme.accent }}>
                  {isImporting ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : (
                    <Upload size={24} />
                  )}
                </div>
                <div className="text-xs font-bold" style={{ color: theme.text }}>
                  {isImporting
                    ? tr('Импортирование файлов...', 'Importing files...')
                    : tr('Нажмите для выбора или перетащите файлы сюда', 'Click to browse or drag and drop files here')}
                </div>
              </label>

              {/* Import status notification */}
              {importNotice && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border animate-fadeIn ${
                    importNotice.type === 'success'
                      ? 'bg-green-500/15 border-green-500/30 text-green-400'
                      : 'bg-red-500/15 border-red-500/30 text-red-400'
                  }`}
                >
                  {importNotice.type === 'success' ? (
                    <CheckCircle2 size={16} className="shrink-0" />
                  ) : (
                    <AlertTriangle size={16} className="shrink-0" />
                  )}
                  <span>{importNotice.message}</span>
                </div>
              )}
            </div>

            {/* Plashka 2: Export Data */}
            <div className="p-4 rounded-2xl border space-y-2" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <div className="text-sm font-bold mb-1">{tr('Экспорт')}</div>

              <div className="space-y-1.5">
                {/* Block export button */}
                <button
                  type="button"
                  id="settings-export-block-btn"
                  onClick={() => openBatchExportModal('block')}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold hover:opacity-80 transition cursor-pointer"
                  style={{ backgroundColor: hexToRgba(theme.text, 0.03) }}
                >
                  <FolderArchive size={15} className="shrink-0" style={{ color: theme.accent }} />
                  <span>{tr('Экспорт блока', 'Export Block')}</span>
                </button>

                {/* Bulk notes export button */}
                <button
                  type="button"
                  id="settings-export-multiple-notes-btn"
                  onClick={() => openBatchExportModal('notes')}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold hover:opacity-80 transition cursor-pointer"
                  style={{ backgroundColor: hexToRgba(theme.text, 0.03) }}
                >
                  <Files size={15} className="shrink-0" style={{ color: theme.accent }} />
                  <span>{tr('Экспорт нескольких заметок', 'Export Multiple Notes')}</span>
                </button>

                {/* Single Note export button */}
                <button
                  type="button"
                  id="settings-export-single-note-btn"
                  onClick={() => openExportModal()}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold hover:opacity-80 transition cursor-pointer"
                  style={{ backgroundColor: hexToRgba(theme.text, 0.03) }}
                >
                  <Download size={15} className="shrink-0" style={{ color: theme.accent }} />
                  <span>{tr('Экспорт одной заметки', 'Export Single Note')}</span>
                </button>

                {/* Full JSON backup export button */}
                <button
                  type="button"
                  id="settings-export-full-backup-btn"
                  onClick={exportData}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold hover:opacity-80 transition cursor-pointer"
                  style={{ backgroundColor: hexToRgba(theme.text, 0.03) }}
                >
                  <Database size={15} className="shrink-0" style={{ color: theme.accent }} />
                  <span>{tr('Резервная копия (JSON)')}</span>
                </button>
              </div>
            </div>

            {/* Plashka: Trash Auto-Deletion Retention */}
            <div className="p-4 rounded-2xl border space-y-3" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold flex items-center gap-2">
                    <Trash2 size={16} className="opacity-70" />
                    <span>{tr('Очистка корзины')}</span>
                  </div>
                  <div className="text-xs opacity-60 mt-0.5">
                    {tr('Автоматическое удаление элементов через заданный срок')}
                  </div>
                </div>
                <div className="shrink-0">
                  <CustomSelect
                    value={trashRetentionDays}
                    onChange={val => setTrashRetentionDays(Number(val) as any)}
                    options={trashRetentionOptions}
                  />
                </div>
              </div>
            </div>

            {/* Storage on Device (Память на устройстве) */}
            <div className="p-4 rounded-2xl border space-y-3.5 transition-all" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <HardDrive size={18} style={{ color: theme.accent }} className="shrink-0 opacity-90" />
                  <div>
                    <div className="text-sm font-bold flex items-center gap-2">
                      <span>{tr('Память на устройстве', 'Storage on device')}</span>
                      {storageBreakdown && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-mono font-bold border"
                          style={{
                            backgroundColor: hexToRgba(theme.accent, 0.12),
                            borderColor: hexToRgba(theme.accent, 0.3),
                            color: theme.accent,
                          }}
                        >
                          {storageBreakdown.totalFormatted}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] opacity-60 font-normal mt-0.5">
                      {storageBreakdown?.quotaFormatted
                        ? `${tr('Веб-сайт занимает', 'App uses')} ${storageBreakdown.totalFormatted} ${tr('из доступных', 'of available')} ~${storageBreakdown.quotaFormatted}`
                        : tr('Объём данных, сохранённых веб-приложением на устройстве', 'Data stored by web application on this device')}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={loadStorageData}
                  disabled={isLoadingStorage}
                  className="p-2 rounded-xl border hover:bg-white/10 active:scale-95 transition cursor-pointer opacity-80 hover:opacity-100 shrink-0"
                  style={{ borderColor: cardBorder, color: theme.text }}
                  title={tr('Пересчитать размер памяти', 'Recalculate storage usage')}
                >
                  <RefreshCw size={15} className={isLoadingStorage ? 'animate-spin' : ''} />
                </button>
              </div>

              {/* Multi-segment storage bar */}
              {storageBreakdown && (
                <div className="space-y-1.5 pt-1">
                  <div className="w-full h-2.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden flex">
                    {storageBreakdown.categories
                      .filter(cat => cat.bytes > 0)
                      .map(cat => {
                        const widthPct = Math.max(1.5, cat.percentage);
                        return (
                          <div
                            key={cat.id}
                            className="h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full"
                            style={{
                              width: `${widthPct}%`,
                              backgroundColor: cat.color,
                            }}
                            title={`${cat.label}: ${cat.formattedSize} (${cat.percentage}%)`}
                          />
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Subcategories list */}
              <div className="space-y-2 pt-1">
                {storageBreakdown ? (
                  storageBreakdown.categories.map(cat => {
                    const getCategoryIcon = () => {
                      switch (cat.id) {
                        case 'notes': return <FileText size={16} style={{ color: cat.color }} />;
                        case 'tasks': return <CheckSquare size={16} style={{ color: cat.color }} />;
                        case 'webHistory': return <Globe size={16} style={{ color: cat.color }} />;
                        case 'aiDialogs': return <Sparkles size={16} style={{ color: cat.color }} />;
                        case 'semanticModel': return <Brain size={16} style={{ color: cat.color }} />;
                        case 'settings': return <SlidersHorizontal size={16} style={{ color: cat.color }} />;
                        default: return <Database size={16} style={{ color: cat.color }} />;
                      }
                    };

                    return (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between py-2 px-3 rounded-xl border transition-colors"
                        style={{
                          borderColor: cardBorder,
                          backgroundColor: hexToRgba(theme.text, 0.02),
                        }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-3">
                          <div className="shrink-0 flex items-center justify-center">
                            {getCategoryIcon()}
                          </div>
                          <span className="text-xs font-semibold truncate">{tr(cat.label)}</span>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-mono font-bold" style={{ color: theme.text }}>
                            {cat.formattedSize}
                          </div>
                          <div className="text-[10px] opacity-45 font-mono">
                            {cat.percentage}%
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-4 text-center text-xs opacity-50 flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    <span>{tr('Вычисление объёма памяти...', 'Calculating storage usage...')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Plashka 3: Reset Data */}
            <div className="p-4 rounded-2xl border space-y-3" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <div className="text-sm font-bold text-red-500">{tr('Сброс данных')}</div>
              <p className="text-xs opacity-60">
                {tr('Безвозвратно удаляет все данные')}
              </p>
              <button
                onClick={() => {
                  setResetConfirmInput('');
                  setIsResetConfirmOpen(true);
                }}
                className="w-full flex items-center justify-start gap-2 p-3 rounded-xl border text-xs font-bold text-red-500 hover:bg-red-500/10 active:scale-[0.99] transition cursor-pointer"
                style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}
              >
                <RefreshCw size={15} />
                <span>{tr('Сбросить все данные')}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB: AI Usage */}
        {activeSettingsTab === 'ai' && (
          <div className="space-y-5">
            {/* ANACRUSA AI AGENT CONFIGURATION CARD */}
            <div
              className="p-4 sm:p-5 rounded-2xl border space-y-4 shadow-xs"
              style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} style={{ color: theme.accent }} className="shrink-0" />
                  <h3 className="text-sm font-extrabold">
                    ИИ ассистент Anacrusa
                  </h3>
                </div>
              </div>

              {/* AI Provider Switcher */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold opacity-80 block">
                  Провайдер ИИ
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {/* Cohere */}
                  <button
                    type="button"
                    onClick={() =>
                      setAnacrusaSettings(prev => ({ ...prev, provider: 'cohere' }))
                    }
                    className="p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-2"
                    style={{
                      backgroundColor:
                        anacrusaSettings.provider !== 'ionet'
                          ? hexToRgba(theme.accent, 0.15)
                          : 'transparent',
                      borderColor:
                        anacrusaSettings.provider !== 'ionet'
                          ? theme.accent
                          : hexToRgba(theme.text, 0.12),
                    }}
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-bold block">Cohere</span>
                    </div>
                    {anacrusaSettings.provider !== 'ionet' && (
                      <Check size={16} className="shrink-0" style={{ color: theme.accent }} />
                    )}
                  </button>

                  {/* io.net */}
                  <button
                    type="button"
                    onClick={() =>
                      setAnacrusaSettings(prev => ({ ...prev, provider: 'ionet' }))
                    }
                    className="p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-2"
                    style={{
                      backgroundColor:
                        anacrusaSettings.provider === 'ionet'
                          ? hexToRgba(theme.accent, 0.15)
                          : 'transparent',
                      borderColor:
                        anacrusaSettings.provider === 'ionet'
                          ? theme.accent
                          : hexToRgba(theme.text, 0.12),
                    }}
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-bold block">io.net</span>
                    </div>
                    {anacrusaSettings.provider === 'ionet' && (
                      <Check size={16} className="shrink-0" style={{ color: theme.accent }} />
                    )}
                  </button>
                </div>
              </div>

              {/* COHERE SETTINGS */}
              {anacrusaSettings.provider !== 'ionet' && (
                <>
                  {/* Cohere API Key Input */}
                  <div className="space-y-2 pt-1">
                    <label className="text-xs font-bold opacity-80 block">
                      API-ключ Cohere
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showCohereKey ? 'text' : 'password'}
                        value={anacrusaSettings.cohereApiKey}
                        onChange={e =>
                          setAnacrusaSettings(prev => ({
                            ...prev,
                            cohereApiKey: e.target.value,
                          }))
                        }
                        placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        className="w-full py-2.5 pl-3.5 pr-10 rounded-xl border text-xs font-mono outline-hidden transition"
                        style={{
                          backgroundColor: hexToRgba(theme.text, 0.04),
                          borderColor: anacrusaSettings.cohereApiKey.trim()
                            ? hexToRgba(theme.accent, 0.5)
                            : cardBorder,
                          color: theme.text,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCohereKey(prev => !prev)}
                        className="absolute right-3 opacity-60 hover:opacity-100 transition cursor-pointer"
                        title={showCohereKey ? 'Скрыть ключ' : 'Показать ключ'}
                      >
                        {showCohereKey ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>

                    <div className="flex items-center justify-end text-[11px] pt-0.5">
                      <a
                        href="https://dashboard.cohere.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 font-semibold opacity-60 hover:opacity-100 hover:underline transition"
                        style={{ color: theme.text }}
                      >
                        <span>Получить ключ на cohere.com</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>

                  {/* Cohere Model Selection Dropdown */}
                  <div className="space-y-2 pt-1 relative" ref={modelDropdownRef}>
                    <label className="text-xs font-bold opacity-80 block">
                      Выбор модели Cohere
                    </label>
                    {(() => {
                      const currentModel =
                        COHERE_MODELS.find(m => m.id === anacrusaSettings.model) || COHERE_MODELS[0];
                      return (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsAiModelDropdownOpen(prev => !prev)}
                            className="w-full p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between shadow-xs hover:opacity-95"
                            style={{
                              backgroundColor: hexToRgba(theme.text, 0.04),
                              borderColor: isAiModelDropdownOpen ? theme.accent : cardBorder,
                              color: theme.text,
                            }}
                          >
                            <div className="min-w-0 pr-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold truncate">{currentModel.name}</span>
                              </div>
                            </div>
                            <ChevronDown
                              size={16}
                              className={`shrink-0 transition-transform duration-200 opacity-60 ${
                                isAiModelDropdownOpen ? 'rotate-180 opacity-100' : ''
                              }`}
                              style={{ color: isAiModelDropdownOpen ? theme.accent : undefined }}
                            />
                          </button>

                          {isAiModelDropdownOpen && (
                            <div
                              className="absolute top-full left-0 right-0 mt-1.5 p-1.5 rounded-2xl border shadow-2xl z-50 max-h-72 overflow-y-auto space-y-1 animate-fadeIn backdrop-blur-2xl"
                              style={{
                                backgroundColor: isLight ? '#FFFFFF' : hexToRgba(theme.bg, 0.98),
                                borderColor: cardBorder,
                                boxShadow: `0 16px 36px ${isLight ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.6)'}`,
                              }}
                            >
                              {COHERE_MODELS.map(model => {
                                const isSelected = anacrusaSettings.model === model.id;
                                return (
                                  <button
                                    key={model.id}
                                    type="button"
                                    onClick={() => {
                                      setAnacrusaSettings(prev => ({ ...prev, model: model.id }));
                                      setIsAiModelDropdownOpen(false);
                                    }}
                                    className="w-full p-2.5 rounded-xl flex items-center justify-between transition cursor-pointer text-left hover:bg-white/5"
                                    style={{
                                      backgroundColor: isSelected
                                        ? hexToRgba(theme.accent, 0.15)
                                        : 'transparent',
                                      borderColor: isSelected ? theme.accent : 'transparent',
                                    }}
                                  >
                                    <div className="min-w-0 pr-2">
                                      <div className="text-xs font-bold flex items-center gap-1.5">
                                        <span style={{ color: isSelected ? theme.accent : theme.text }}>
                                          {model.name}
                                        </span>
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <Check size={14} className="shrink-0" style={{ color: theme.accent }} />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}

              {/* IO.NET SETTINGS */}
              {anacrusaSettings.provider === 'ionet' && (
                <>
                  {/* io.net API Key Input */}
                  <div className="space-y-2 pt-1">
                    <label className="text-xs font-bold opacity-80 block">
                      API-ключ io.net
                    </label>

                    <div className="relative flex items-center">
                      <input
                        type={showIonetKey ? 'text' : 'password'}
                        value={anacrusaSettings.ionetApiKey || ''}
                        onChange={e =>
                          setAnacrusaSettings(prev => ({
                            ...prev,
                            ionetApiKey: e.target.value,
                          }))
                        }
                        placeholder="io_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        className="w-full py-2.5 pl-3.5 pr-10 rounded-xl border text-xs font-mono outline-hidden transition"
                        style={{
                          backgroundColor: hexToRgba(theme.text, 0.04),
                          borderColor: anacrusaSettings.ionetApiKey?.trim()
                            ? hexToRgba(theme.accent, 0.5)
                            : cardBorder,
                          color: theme.text,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowIonetKey(prev => !prev)}
                        className="absolute right-3 opacity-60 hover:opacity-100 transition cursor-pointer"
                        title={showIonetKey ? 'Скрыть ключ' : 'Показать ключ'}
                      >
                        {showIonetKey ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>

                    <div className="flex items-center justify-end text-[11px] pt-0.5">
                      <a
                        href="https://ai.io.net"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 font-semibold opacity-60 hover:opacity-100 hover:underline transition"
                        style={{ color: theme.text }}
                      >
                        <span>Получить ключ на ai.io.net</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>

                  {/* io.net Model Selection Dropdown */}
                  <div className="space-y-2 pt-1 relative" ref={modelDropdownRef}>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold opacity-80 block">
                        Выбор модели io.net
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowCustomIonetModel(prev => !prev)}
                        className="text-[11px] font-semibold opacity-60 hover:opacity-100 transition cursor-pointer"
                        style={{ color: theme.accent }}
                      >
                        {showCustomIonetModel ? 'Выбрать из списка' : 'Ввести ID вручную'}
                      </button>
                    </div>

                    {showCustomIonetModel ? (
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={anacrusaSettings.ionetModel || 'meta-llama/Llama-3.3-70B-Instruct'}
                          onChange={e =>
                            setAnacrusaSettings(prev => ({
                              ...prev,
                              ionetModel: e.target.value,
                            }))
                          }
                          placeholder="meta-llama/Llama-3.3-70B-Instruct"
                          className="w-full py-2.5 px-3.5 rounded-xl border text-xs font-mono outline-hidden transition"
                          style={{
                            backgroundColor: hexToRgba(theme.text, 0.04),
                            borderColor: cardBorder,
                            color: theme.text,
                          }}
                        />
                        <p className="text-[10px] opacity-50">
                          Укажите любой точный идентификатор модели, поддерживаемый на ai.io.net
                        </p>
                      </div>
                    ) : (
                      (() => {
                        const activeId = anacrusaSettings.ionetModel || 'meta-llama/Llama-3.3-70B-Instruct';
                        const currentModel =
                          IONET_MODELS.find(m => m.id === activeId) || {
                            id: activeId,
                            name: activeId,
                            description: 'Пользовательская модель io.net',
                          };
                        return (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setIsAiModelDropdownOpen(prev => !prev)}
                              className="w-full p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between shadow-xs hover:opacity-95"
                              style={{
                                backgroundColor: hexToRgba(theme.text, 0.04),
                                borderColor: isAiModelDropdownOpen ? theme.accent : cardBorder,
                                color: theme.text,
                              }}
                            >
                              <div className="min-w-0 pr-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold truncate">{currentModel.name}</span>
                                </div>
                              </div>
                              <ChevronDown
                                size={16}
                                className={`shrink-0 transition-transform duration-200 opacity-60 ${
                                  isAiModelDropdownOpen ? 'rotate-180 opacity-100' : ''
                                }`}
                                style={{ color: isAiModelDropdownOpen ? theme.accent : undefined }}
                              />
                            </button>

                            {isAiModelDropdownOpen && (
                              <div
                                className="absolute top-full left-0 right-0 mt-1.5 p-1.5 rounded-2xl border shadow-2xl z-50 max-h-72 overflow-y-auto space-y-1 animate-fadeIn backdrop-blur-2xl"
                                style={{
                                  backgroundColor: isLight ? '#FFFFFF' : hexToRgba(theme.bg, 0.98),
                                  borderColor: cardBorder,
                                  boxShadow: `0 16px 36px ${isLight ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.6)'}`,
                                }}
                              >
                                {IONET_MODELS.map(model => {
                                  const isSelected = (anacrusaSettings.ionetModel || 'meta-llama/Llama-3.3-70B-Instruct') === model.id;
                                  return (
                                    <button
                                      key={model.id}
                                      type="button"
                                      onClick={() => {
                                        setAnacrusaSettings(prev => ({ ...prev, ionetModel: model.id }));
                                        setIsAiModelDropdownOpen(false);
                                      }}
                                      className="w-full p-2.5 rounded-xl flex items-center justify-between transition cursor-pointer text-left hover:bg-white/5"
                                      style={{
                                        backgroundColor: isSelected
                                          ? hexToRgba(theme.accent, 0.15)
                                          : 'transparent',
                                        borderColor: isSelected ? theme.accent : 'transparent',
                                      }}
                                    >
                                      <div className="min-w-0 pr-2">
                                        <div className="text-xs font-bold flex items-center gap-1.5">
                                          <span style={{ color: isSelected ? theme.accent : theme.text }}>
                                            {model.name}
                                          </span>
                                        </div>
                                      </div>
                                      {isSelected && (
                                        <Check size={14} className="shrink-0" style={{ color: theme.accent }} />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })()
                    )}
                  </div>
                </>
              )}

              {/* Web Search Autonomy Mode Selector */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-bold opacity-80 block">
                  Веб-поиск
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Never */}
                  <button
                    type="button"
                    onClick={() =>
                      setAnacrusaSettings(prev => ({ ...prev, webSearchMode: 'never' }))
                    }
                    className="p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-2"
                    style={{
                      backgroundColor:
                        (anacrusaSettings.webSearchMode || 'ask') === 'never'
                          ? hexToRgba(theme.accent, 0.15)
                          : 'transparent',
                      borderColor:
                        (anacrusaSettings.webSearchMode || 'ask') === 'never'
                          ? theme.accent
                          : hexToRgba(theme.text, 0.12),
                    }}
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-bold block">Никогда</span>
                      <p className="text-[10px] opacity-60 mt-0.5 leading-snug">
                        ИИ не использует веб-поиск
                      </p>
                    </div>
                    {(anacrusaSettings.webSearchMode || 'ask') === 'never' && (
                      <Check size={16} className="shrink-0" style={{ color: theme.accent }} />
                    )}
                  </button>

                  {/* Ask for confirmation */}
                  <button
                    type="button"
                    onClick={() =>
                      setAnacrusaSettings(prev => ({ ...prev, webSearchMode: 'ask' }))
                    }
                    className="p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-2"
                    style={{
                      backgroundColor:
                        (anacrusaSettings.webSearchMode || 'ask') === 'ask'
                          ? hexToRgba(theme.accent, 0.15)
                          : 'transparent',
                      borderColor:
                        (anacrusaSettings.webSearchMode || 'ask') === 'ask'
                          ? theme.accent
                          : hexToRgba(theme.text, 0.12),
                    }}
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-bold block">Подтверждать</span>
                      <p className="text-[10px] opacity-60 mt-0.5 leading-snug">
                        Запрос подтверждения (Да / Нет)
                      </p>
                    </div>
                    {(anacrusaSettings.webSearchMode || 'ask') === 'ask' && (
                      <Check size={16} className="shrink-0" style={{ color: theme.accent }} />
                    )}
                  </button>

                  {/* Automatically */}
                  <button
                    type="button"
                    onClick={() =>
                      setAnacrusaSettings(prev => ({ ...prev, webSearchMode: 'auto' }))
                    }
                    className="p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-2"
                    style={{
                      backgroundColor:
                        anacrusaSettings.webSearchMode === 'auto'
                          ? hexToRgba(theme.accent, 0.15)
                          : 'transparent',
                      borderColor:
                        anacrusaSettings.webSearchMode === 'auto'
                          ? theme.accent
                          : hexToRgba(theme.text, 0.12),
                    }}
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-bold block">Автоматически</span>
                      <p className="text-[10px] opacity-60 mt-0.5 leading-snug">
                        Поиск без запроса разрешения
                      </p>
                    </div>
                    {anacrusaSettings.webSearchMode === 'auto' && (
                      <Check size={16} className="shrink-0" style={{ color: theme.accent }} />
                    )}
                  </button>
                </div>
              </div>

              {/* Temperature Slider */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold opacity-80">Креативность (Temperature)</span>
                  <span className="font-mono font-bold" style={{ color: theme.accent }}>
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
                  className="w-full accent-current cursor-pointer"
                  style={{ color: theme.accent }}
                />
                <div className="flex justify-between text-[10px] opacity-50 font-mono">
                  <span>0.0 (Строгий и точный)</span>
                  <span>1.5 (Творческий)</span>
                </div>
              </div>

              {/* System Prompt */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold opacity-80 block">
                  Пользовательские инструкции к ответам
                </label>
                <textarea
                  rows={3}
                  value={anacrusaSettings.systemPrompt}
                  onChange={e =>
                    setAnacrusaSettings(prev => ({
                      ...prev,
                      systemPrompt: e.target.value,
                    }))
                  }
                  placeholder="Например: отвечай кратко, форматируй списки, выделяй важное жирным шрифтом..."
                  className="w-full p-3 rounded-xl border text-xs outline-hidden resize-y transition"
                  style={{
                    backgroundColor: hexToRgba(theme.text, 0.04),
                    borderColor: cardBorder,
                    color: theme.text,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB: Search */}
        {activeSettingsTab === 'search' && (
          <div className="space-y-5">
            {/* Main Web Search Config Card */}
            <div
              className="p-4 sm:p-5 rounded-2xl border space-y-4 shadow-xs"
              style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe size={18} style={{ color: theme.accent }} className="shrink-0" />
                  <h3 className="text-sm font-extrabold">Веб-поиск</h3>
                </div>
              </div>

              {/* Provider Selection Tabs */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold opacity-80 block">
                  Поисковая система
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {/* Tavily Tab */}
                  <button
                    type="button"
                    onClick={() =>
                      setWebSearchSettings(prev => ({ ...prev, provider: 'tavily' }))
                    }
                    className="p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between"
                    style={{
                      backgroundColor:
                        webSearchSettings.provider === 'tavily'
                          ? hexToRgba(theme.accent, 0.15)
                          : hexToRgba(theme.text, 0.02),
                      borderColor:
                        webSearchSettings.provider === 'tavily'
                          ? theme.accent
                          : hexToRgba(theme.text, 0.12),
                    }}
                  >
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span>Tavily</span>
                        {webSearchSettings.tavilyApiKey.trim() && (
                          <span
                            className="w-1.5 h-1.5 rounded-full inline-block"
                            style={{ backgroundColor: theme.accent }}
                          />
                        )}
                      </div>
                    </div>
                    {webSearchSettings.provider === 'tavily' && (
                      <Check size={14} style={{ color: theme.accent }} />
                    )}
                  </button>

                  {/* Exa Tab */}
                  <button
                    type="button"
                    onClick={() =>
                      setWebSearchSettings(prev => ({ ...prev, provider: 'exa' }))
                    }
                    className="p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between"
                    style={{
                      backgroundColor:
                        webSearchSettings.provider === 'exa'
                          ? hexToRgba(theme.accent, 0.15)
                          : hexToRgba(theme.text, 0.02),
                      borderColor:
                        webSearchSettings.provider === 'exa'
                          ? theme.accent
                          : hexToRgba(theme.text, 0.12),
                    }}
                  >
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span>Exa</span>
                        {webSearchSettings.exaApiKey.trim() && (
                          <span
                            className="w-1.5 h-1.5 rounded-full inline-block"
                            style={{ backgroundColor: theme.accent }}
                          />
                        )}
                      </div>
                    </div>
                    {webSearchSettings.provider === 'exa' && (
                      <Check size={14} style={{ color: theme.accent }} />
                    )}
                  </button>
                </div>
              </div>

              {/* TAVILY CONFIGURATION */}
              {webSearchSettings.provider === 'tavily' && (
                <div className="space-y-4 pt-1 animate-fadeIn">
                  {/* Tavily API Key Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold opacity-80 block">
                      API-ключ Tavily
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showTavilyKey ? 'text' : 'password'}
                        value={webSearchSettings.tavilyApiKey}
                        onChange={e =>
                          setWebSearchSettings(prev => ({
                            ...prev,
                            tavilyApiKey: e.target.value,
                          }))
                        }
                        placeholder="tvly-xxxxxxxxxxxxxxxxxxxx"
                        className="w-full py-2.5 pl-3.5 pr-10 rounded-xl border text-xs font-mono outline-hidden transition"
                        style={{
                          backgroundColor: hexToRgba(theme.text, 0.04),
                          borderColor: webSearchSettings.tavilyApiKey.trim()
                            ? hexToRgba(theme.accent, 0.5)
                            : cardBorder,
                          color: theme.text,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowTavilyKey(prev => !prev)}
                        className="absolute right-3 opacity-60 hover:opacity-100 transition cursor-pointer"
                        title={showTavilyKey ? 'Скрыть ключ' : 'Показать ключ'}
                      >
                        {showTavilyKey ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>

                    <div className="flex items-center justify-end text-[11px] pt-0.5">
                      <a
                        href="https://tavily.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 font-semibold opacity-60 hover:opacity-100 hover:underline transition"
                        style={{ color: theme.text }}
                      >
                        <span>Получить ключ на tavily.com</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>

                  {/* Tavily Power & Search Depth Settings */}
                  <div
                    className="p-3.5 rounded-xl border space-y-3.5"
                    style={{
                      backgroundColor: hexToRgba(theme.text, 0.02),
                      borderColor: hexToRgba(theme.text, 0.08),
                    }}
                  >
                    <div className="text-xs font-bold opacity-90">
                      Настройки Tavily
                    </div>

                    {/* Depth setting */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold opacity-75">Глубина поиска</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setWebSearchSettings(prev => ({ ...prev, searchDepth: 'basic' }))
                          }
                          className="p-2.5 rounded-xl border text-left transition cursor-pointer"
                          style={{
                            backgroundColor:
                              webSearchSettings.searchDepth === 'basic'
                                ? hexToRgba(theme.accent, 0.15)
                                : 'transparent',
                            borderColor:
                              webSearchSettings.searchDepth === 'basic'
                                ? theme.accent
                                : hexToRgba(theme.text, 0.12),
                          }}
                        >
                          <div className="text-xs font-bold">Быстрый</div>
                          <div className="text-[10px] opacity-60 mt-0.5">1 кредит</div>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setWebSearchSettings(prev => ({ ...prev, searchDepth: 'advanced' }))
                          }
                          className="p-2.5 rounded-xl border text-left transition cursor-pointer"
                          style={{
                            backgroundColor:
                              webSearchSettings.searchDepth === 'advanced'
                                ? hexToRgba(theme.accent, 0.15)
                                : 'transparent',
                            borderColor:
                              webSearchSettings.searchDepth === 'advanced'
                                ? theme.accent
                                : hexToRgba(theme.text, 0.12),
                          }}
                        >
                          <div className="text-xs font-bold">Глубокий</div>
                          <div className="text-[10px] opacity-60 mt-0.5">2 кредита</div>
                        </button>
                      </div>
                    </div>

                    {/* Answer detail setting */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <div>
                        <div className="font-semibold opacity-75">Детализация саммари</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setWebSearchSettings(prev => ({ ...prev, answerDetail: 'basic' }))
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            webSearchSettings.answerDetail === 'basic' ? 'shadow-xs' : 'opacity-60'
                          }`}
                          style={{
                            backgroundColor:
                              webSearchSettings.answerDetail === 'basic'
                                ? theme.accent
                                : hexToRgba(theme.text, 0.08),
                            color: webSearchSettings.answerDetail === 'basic' ? '#FFFFFF' : theme.text,
                          }}
                        >
                          Кратко
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setWebSearchSettings(prev => ({ ...prev, answerDetail: 'advanced' }))
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            webSearchSettings.answerDetail === 'advanced' ? 'shadow-xs' : 'opacity-60'
                          }`}
                          style={{
                            backgroundColor:
                              webSearchSettings.answerDetail === 'advanced'
                                ? theme.accent
                                : hexToRgba(theme.text, 0.08),
                            color: webSearchSettings.answerDetail === 'advanced' ? '#FFFFFF' : theme.text,
                          }}
                        >
                          Подробно
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* EXA CONFIGURATION */}
              {webSearchSettings.provider === 'exa' && (
                <div className="space-y-4 pt-1 animate-fadeIn">
                  {/* Exa API Key Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold opacity-80 block">
                      API-ключ Exa
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showExaKey ? 'text' : 'password'}
                        value={webSearchSettings.exaApiKey}
                        onChange={e =>
                          setWebSearchSettings(prev => ({
                            ...prev,
                            exaApiKey: e.target.value,
                          }))
                        }
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        className="w-full py-2.5 pl-3.5 pr-10 rounded-xl border text-xs font-mono outline-hidden transition"
                        style={{
                          backgroundColor: hexToRgba(theme.text, 0.04),
                          borderColor: webSearchSettings.exaApiKey.trim()
                            ? hexToRgba(theme.accent, 0.5)
                            : cardBorder,
                          color: theme.text,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowExaKey(prev => !prev)}
                        className="absolute right-3 opacity-60 hover:opacity-100 transition cursor-pointer"
                        title={showExaKey ? 'Скрыть ключ' : 'Показать ключ'}
                      >
                        {showExaKey ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>

                    <div className="flex items-center justify-end text-[11px] pt-0.5">
                      <a
                        href="https://dashboard.exa.ai"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 font-semibold opacity-60 hover:opacity-100 hover:underline transition"
                        style={{ color: theme.text }}
                      >
                        <span>Получить ключ на exa.ai</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>

                  {/* Exa Model & Feature Settings */}
                  <div
                    className="p-3.5 rounded-xl border space-y-3.5"
                    style={{
                      backgroundColor: hexToRgba(theme.text, 0.02),
                      borderColor: hexToRgba(theme.text, 0.08),
                    }}
                  >
                    <div className="text-xs font-bold opacity-90">
                      Настройки Exa
                    </div>

                    {/* Model selection (Fast, Deep, Deep-reasoning) */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold opacity-75 block">
                        Модель поиска
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {/* Fast */}
                        <button
                          type="button"
                          onClick={() =>
                            setWebSearchSettings(prev => ({ ...prev, exaModel: 'fast' }))
                          }
                          className="p-2.5 rounded-xl border text-left transition cursor-pointer"
                          style={{
                            backgroundColor:
                              webSearchSettings.exaModel === 'fast'
                                ? hexToRgba(theme.accent, 0.15)
                                : 'transparent',
                            borderColor:
                              webSearchSettings.exaModel === 'fast'
                                ? theme.accent
                                : hexToRgba(theme.text, 0.12),
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">Fast</span>
                            <span
                              className="text-[10px] font-mono font-semibold"
                              style={{ color: theme.accent }}
                            >
                              7$ / 1k
                            </span>
                          </div>
                        </button>

                        {/* Deep */}
                        <button
                          type="button"
                          onClick={() =>
                            setWebSearchSettings(prev => ({ ...prev, exaModel: 'deep' }))
                          }
                          className="p-2.5 rounded-xl border text-left transition cursor-pointer"
                          style={{
                            backgroundColor:
                              webSearchSettings.exaModel === 'deep'
                                ? hexToRgba(theme.accent, 0.15)
                                : 'transparent',
                            borderColor:
                              webSearchSettings.exaModel === 'deep'
                                ? theme.accent
                                : hexToRgba(theme.text, 0.12),
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">Deep</span>
                            <span
                              className="text-[10px] font-mono font-semibold"
                              style={{ color: theme.accent }}
                            >
                              12$ / 1k
                            </span>
                          </div>
                        </button>

                        {/* Deep-reasoning */}
                        <button
                          type="button"
                          onClick={() =>
                            setWebSearchSettings(prev => ({ ...prev, exaModel: 'deep-reasoning' }))
                          }
                          className="p-2.5 rounded-xl border text-left transition cursor-pointer"
                          style={{
                            backgroundColor:
                              webSearchSettings.exaModel === 'deep-reasoning'
                                ? hexToRgba(theme.accent, 0.15)
                                : 'transparent',
                            borderColor:
                              webSearchSettings.exaModel === 'deep-reasoning'
                                ? theme.accent
                                : hexToRgba(theme.text, 0.12),
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">Deep-reasoning</span>
                            <span
                              className="text-[10px] font-mono font-semibold"
                              style={{ color: theme.accent }}
                            >
                              15$ / 1k
                            </span>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Exa Answer toggle (5$ / 1k) */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold opacity-90">Генерация ответа</span>
                        <span
                          className="text-[10px] font-mono font-semibold whitespace-nowrap"
                          style={{ color: theme.accent }}
                        >
                          +5$ / 1k
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setWebSearchSettings(prev => ({ ...prev, exaIncludeAnswer: false }))
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            !webSearchSettings.exaIncludeAnswer ? 'shadow-xs' : 'opacity-60'
                          }`}
                          style={{
                            backgroundColor:
                              !webSearchSettings.exaIncludeAnswer
                                ? theme.accent
                                : hexToRgba(theme.text, 0.08),
                            color: !webSearchSettings.exaIncludeAnswer ? '#FFFFFF' : theme.text,
                          }}
                        >
                          Выкл
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setWebSearchSettings(prev => ({ ...prev, exaIncludeAnswer: true }))
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            webSearchSettings.exaIncludeAnswer ? 'shadow-xs' : 'opacity-60'
                          }`}
                          style={{
                            backgroundColor:
                              webSearchSettings.exaIncludeAnswer
                                ? theme.accent
                                : hexToRgba(theme.text, 0.08),
                            color: webSearchSettings.exaIncludeAnswer ? '#FFFFFF' : theme.text,
                          }}
                        >
                          Вкл
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* LOCAL SEMANTIC SEARCH CARD */}
            <div
              className="p-4 sm:p-5 rounded-2xl border space-y-4 shadow-xs"
              style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            >
              {/* Header with Switch */}
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <FileSearch size={18} style={{ color: theme.accent }} className="shrink-0" />
                    <h3 className="text-sm font-bold">Семантический поиск</h3>
                  </div>
                  <p className="text-[11px] opacity-70">
                    Локальный поиск по смыслу фраз. Работает оффлайн и приватно, но может временно нагружать процессор и батарею.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={semanticSearchSettings.enabled}
                    onChange={e =>
                      setSemanticSearchSettings(prev => ({ ...prev, enabled: e.target.checked }))
                    }
                    className="sr-only peer"
                  />
                  <div
                    className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                    style={{
                      backgroundColor: semanticSearchSettings.enabled
                        ? theme.accent
                        : hexToRgba(theme.text, 0.2),
                    }}
                  />
                </label>
              </div>

              {semanticSearchSettings.enabled && (
                <div className="space-y-4 pt-1">
                  {/* Models list */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold opacity-80 block">
                      Модель эмбеддингов
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {HF_SEMANTIC_MODELS.map(model => {
                        const isSelected = semanticSearchSettings.modelRepo === model.repo;
                        const isCached = !!cachedModels[model.repo];
                        const isThisDownloading = downloadingRepo === model.repo;

                        return (
                          <div
                            key={model.id}
                            className="p-3 rounded-xl border flex flex-col justify-between gap-2.5 transition"
                            style={{
                              backgroundColor: isSelected
                                ? hexToRgba(theme.accent, 0.08)
                                : hexToRgba(theme.text, 0.02),
                              borderColor: isSelected ? theme.accent : hexToRgba(theme.text, 0.1),
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold truncate">{model.name}</span>
                                </div>
                                <span className="text-[10px] opacity-60">~{model.sizeMB} МБ</span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-1 flex items-center justify-between gap-1.5">
                              {isThisDownloading ? (
                                <div className="w-full space-y-1">
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="flex items-center gap-1 text-amber-500 font-medium">
                                      <Loader2 size={11} className="animate-spin" />
                                      Загрузка
                                    </span>
                                    <span>{modelProgress.progress}%</span>
                                  </div>
                                  <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                                    <div
                                      className="h-full transition-all duration-200"
                                      style={{
                                        width: `${modelProgress.progress}%`,
                                        backgroundColor: theme.accent,
                                      }}
                                    />
                                  </div>
                                </div>
                              ) : isCached ? (
                                <div className="flex items-center justify-between w-full gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSemanticSearchSettings(prev => ({
                                        ...prev,
                                        modelRepo: model.repo,
                                      }))
                                    }
                                    className="flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border"
                                    style={{
                                      backgroundColor: isSelected
                                        ? theme.accent
                                        : hexToRgba(theme.text, 0.05),
                                      borderColor: isSelected
                                        ? theme.accent
                                        : hexToRgba(theme.text, 0.15),
                                      color: isSelected ? '#FFFFFF' : theme.text,
                                    }}
                                  >
                                    {isSelected ? (
                                      <>
                                        <Check size={13} />
                                        <span>Активна</span>
                                      </>
                                    ) : (
                                      <span>Выбрать</span>
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteModel(model.repo)}
                                    className="p-1.5 rounded-lg opacity-50 hover:opacity-100 hover:text-red-500 transition cursor-pointer"
                                    title="Удалить модель"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleDownloadModel(model.repo)}
                                  className="w-full py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border"
                                  style={{
                                    backgroundColor: hexToRgba(theme.accent, 0.12),
                                    borderColor: hexToRgba(theme.accent, 0.3),
                                    color: theme.accent,
                                  }}
                                >
                                  <Download size={13} />
                                  <span>Скачать</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Trigger Mode */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold opacity-80 block">
                      Режим срабатывания
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSemanticSearchSettings(prev => ({ ...prev, triggerMode: 'manual' }))
                        }
                        className="p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-2"
                        style={{
                          backgroundColor:
                            semanticSearchSettings.triggerMode === 'manual'
                              ? hexToRgba(theme.accent, 0.12)
                              : 'transparent',
                          borderColor:
                            semanticSearchSettings.triggerMode === 'manual'
                              ? theme.accent
                              : hexToRgba(theme.text, 0.12),
                        }}
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-bold block">По кнопке</span>
                          <span className="text-[10px] opacity-60 block mt-0.5 leading-snug">
                            Экономит заряд батареи
                          </span>
                        </div>
                        {semanticSearchSettings.triggerMode === 'manual' && (
                          <Check size={14} className="shrink-0" style={{ color: theme.accent }} />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setSemanticSearchSettings(prev => ({ ...prev, triggerMode: 'auto' }))
                        }
                        className="p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-2"
                        style={{
                          backgroundColor:
                            semanticSearchSettings.triggerMode === 'auto'
                              ? hexToRgba(theme.accent, 0.12)
                              : 'transparent',
                          borderColor:
                            semanticSearchSettings.triggerMode === 'auto'
                              ? theme.accent
                              : hexToRgba(theme.text, 0.12),
                        }}
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-bold block">Автоматически</span>
                          <span className="text-[10px] opacity-60 block mt-0.5 leading-snug">
                            Сразу при поиске
                          </span>
                        </div>
                        {semanticSearchSettings.triggerMode === 'auto' && (
                          <Check size={14} className="shrink-0" style={{ color: theme.accent }} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Indexing Mode */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold opacity-80 block">
                      Индексация заметок
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSemanticSearchSettings(prev => ({ ...prev, indexingMode: 'auto' }))
                        }
                        className="p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-2"
                        style={{
                          backgroundColor:
                            (semanticSearchSettings.indexingMode || 'auto') === 'auto'
                              ? hexToRgba(theme.accent, 0.12)
                              : 'transparent',
                          borderColor:
                            (semanticSearchSettings.indexingMode || 'auto') === 'auto'
                              ? theme.accent
                              : hexToRgba(theme.text, 0.12),
                        }}
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-bold block">Автоматически</span>
                          <span className="text-[10px] opacity-60 block mt-0.5 leading-snug">
                            Векторы создаются на лету
                          </span>
                        </div>
                        {(semanticSearchSettings.indexingMode || 'auto') === 'auto' && (
                          <Check size={14} className="shrink-0" style={{ color: theme.accent }} />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setSemanticSearchSettings(prev => ({ ...prev, indexingMode: 'manual' }))
                        }
                        className="p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-2"
                        style={{
                          backgroundColor:
                            semanticSearchSettings.indexingMode === 'manual'
                              ? hexToRgba(theme.accent, 0.12)
                              : 'transparent',
                          borderColor:
                            semanticSearchSettings.indexingMode === 'manual'
                              ? theme.accent
                              : hexToRgba(theme.text, 0.12),
                        }}
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-bold block">Вручную</span>
                          <span className="text-[10px] opacity-60 block mt-0.5 leading-snug">
                            Только по кнопке «Индексировать»
                          </span>
                        </div>
                        {semanticSearchSettings.indexingMode === 'manual' && (
                          <Check size={14} className="shrink-0" style={{ color: theme.accent }} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Index Status & Action Row */}
                  <div
                    className="p-3 rounded-xl border flex items-center justify-between flex-wrap gap-2 text-xs"
                    style={{
                      backgroundColor: hexToRgba(theme.text, 0.02),
                      borderColor: hexToRgba(theme.text, 0.08),
                    }}
                  >
                    <div className="text-[11px] opacity-75">
                      Индекс: <strong>{indexedNotesCount}</strong> из <strong>{notes.filter(n => !n.isPrivate).length}</strong> заметок
                      {reindexMessage && (
                        <span className="ml-2 font-bold text-emerald-500">{reindexMessage}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleReindexNotes}
                        disabled={isReindexing}
                        className="py-1 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 border transition cursor-pointer hover:opacity-85 disabled:opacity-50"
                        style={{
                          backgroundColor: hexToRgba(theme.accent, 0.12),
                          borderColor: hexToRgba(theme.accent, 0.3),
                          color: theme.accent,
                        }}
                      >
                        {isReindexing ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            <span>Индексация...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw size={12} />
                            <span>Индексировать</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          await semanticSearchService.clearModelVectors(semanticSearchSettings.modelRepo);
                          setIndexedNotesCount(0);
                        }}
                        className="py-1 px-2 rounded-lg text-xs border opacity-60 hover:opacity-100 transition cursor-pointer"
                        style={{ borderColor: hexToRgba(theme.text, 0.15) }}
                        title="Очистить кэш векторов"
                      >
                        Очистить
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: Other */}
        {activeSettingsTab === 'other' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl border space-y-3" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <div className="text-sm font-bold">{tr('Наши сообщества и соцсети', 'Our Communities & Socials')}</div>

              <div className="space-y-2 pt-1">
                {/* YouTube */}
                <a
                  href="https://youtube.com/@verisnote"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 p-3 rounded-xl border text-xs font-semibold hover:opacity-85 active:scale-[0.99] transition cursor-pointer"
                  style={{
                    borderColor: cardBorder,
                    backgroundColor: hexToRgba(theme.text, 0.03),
                    color: theme.text,
                  }}
                >
                  <Youtube size={20} className="text-red-500 shrink-0" />
                  <span className="font-bold text-xs">YouTube</span>
                </a>

                {/* TikTok */}
                <a
                  href="https://www.tiktok.com/@verisnote?_r=1&_t=ZS-98wNXXyC8ON"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 p-3 rounded-xl border text-xs font-semibold hover:opacity-85 active:scale-[0.99] transition cursor-pointer"
                  style={{
                    borderColor: cardBorder,
                    backgroundColor: hexToRgba(theme.text, 0.03),
                    color: theme.text,
                  }}
                >
                  <Video size={20} className="text-cyan-400 shrink-0" />
                  <span className="font-bold text-xs">TikTok</span>
                </a>

                {/* Instagram */}
                <a
                  href="https://www.instagram.com/verisnote?igsh=MXIwbG95N3ZhOW5icg=="
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 p-3 rounded-xl border text-xs font-semibold hover:opacity-85 active:scale-[0.99] transition cursor-pointer"
                  style={{
                    borderColor: cardBorder,
                    backgroundColor: hexToRgba(theme.text, 0.03),
                    color: theme.text,
                  }}
                >
                  <Instagram size={20} className="text-pink-500 shrink-0" />
                  <span className="font-bold text-xs">Instagram</span>
                </a>

                {/* Pinterest */}
                <a
                  href="https://pin.it/1MhiRppt2"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 p-3 rounded-xl border text-xs font-semibold hover:opacity-85 active:scale-[0.99] transition cursor-pointer"
                  style={{
                    borderColor: cardBorder,
                    backgroundColor: hexToRgba(theme.text, 0.03),
                    color: theme.text,
                  }}
                >
                  <Pin size={20} className="text-red-600 shrink-0" />
                  <span className="font-bold text-xs">Pinterest</span>
                </a>

                {/* Telegram */}
                <a
                  href="https://t.me/VerisNote"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 p-3 rounded-xl border text-xs font-semibold hover:opacity-85 active:scale-[0.99] transition cursor-pointer"
                  style={{
                    borderColor: cardBorder,
                    backgroundColor: hexToRgba(theme.text, 0.03),
                    color: theme.text,
                  }}
                >
                  <Send size={20} className="text-sky-400 shrink-0" />
                  <span className="font-bold text-xs">{tr('Telegram-канал', 'Telegram Channel')}</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Reset All Data */}
      {isResetConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
          onClick={() => setIsResetConfirmOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5 shadow-2xl border backdrop-blur-2xl animate-scaleUp"
            style={{
              backgroundColor: hexToRgba(theme.bg, 0.95),
              color: theme.text,
              borderColor: cardBorder,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b" style={{ borderColor: cardBorder }}>
              <div className="flex items-center gap-2 text-red-500 font-extrabold text-sm">
                <AlertTriangle size={18} />
                <span>Подтверждение сброса</span>
              </div>
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
                style={{ color: theme.text }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-3 mb-5 text-xs">
              <p className="opacity-80 leading-relaxed">
                Вы собираетесь полностью удалить все заметки, списки задач, теги и настройки.
                Это действие <span className="font-bold text-red-400">необратимо</span>.
              </p>
              <p className="font-semibold opacity-90">
                Для подтверждения введите слово <span className="font-black text-amber-400 select-all tracking-wide">Veris</span>:
              </p>
              <input
                type="text"
                value={resetConfirmInput}
                onChange={e => setResetConfirmInput(e.target.value)}
                placeholder="Veris"
                autoFocus
                className="w-full px-3 py-2 rounded-xl border text-sm font-bold bg-transparent outline-none focus:ring-2 focus:ring-red-500/50 transition"
                style={{
                  borderColor: cardBorder,
                  color: theme.text,
                  backgroundColor: hexToRgba(theme.text, 0.05),
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && resetConfirmInput.trim().toLowerCase() === 'veris') {
                    resetAllData();
                    setIsResetConfirmOpen(false);
                    setResetConfirmInput('');
                  }
                }}
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsResetConfirmOpen(false);
                  setResetConfirmInput('');
                }}
                className="px-3.5 py-2 rounded-xl border font-bold text-xs hover:bg-white/10 active:scale-95 transition cursor-pointer"
                style={{ borderColor: cardBorder, color: theme.text }}
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={resetConfirmInput.trim().toLowerCase() !== 'veris'}
                onClick={() => {
                  if (resetConfirmInput.trim().toLowerCase() === 'veris') {
                    resetAllData();
                    setIsResetConfirmOpen(false);
                    setResetConfirmInput('');
                  }
                }}
                className={`px-4 py-2 rounded-xl font-extrabold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                  resetConfirmInput.trim().toLowerCase() === 'veris'
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg active:scale-95'
                    : 'opacity-40 cursor-not-allowed bg-red-600/30 text-red-200'
                }`}
              >
                <RefreshCw size={13} />
                <span>Подтверждаю</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Setup/Change/Disable Modal */}
      {pinModalMode && (
        <PinModal
          mode={pinModalMode}
          target={pinModalTarget}
          onClose={() => setPinModalMode(null)}
        />
      )}

      {/* Theme Registry and Filter Submenu Modal */}
      <ThemeRegistryModal
        isOpen={isThemeRegistryOpen}
        onClose={() => setIsThemeRegistryOpen(false)}
        currentTheme={theme}
        onSelectTheme={selected => {
          setTheme(selected);
        }}
        filters={themeFilters}
        onFiltersChange={setThemeFilters}
      />

      {/* Theme Scheduler Modal */}
      <ThemeSchedulerModal
        isOpen={isThemeSchedulerOpen}
        onClose={() => setIsThemeSchedulerOpen(false)}
      />
    </div>
  );
};
