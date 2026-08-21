import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../i18n';
import {
  FileText,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Sparkles,
  LayoutGrid,
  MoreHorizontal,
  Settings,
  Globe,
  Trash2,
  Calendar as CalendarIcon,
  Pin,
  Tag as TagIcon,
  Check,
  X,
  Search,
  Plus,
  Layers,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Edit2,
  FolderPlus,
  Columns3,
  SlidersHorizontal,
  Shield,
} from 'lucide-react';
import { hexToRgba, isLightColor } from '../themes';
import { NoteBlock, ActionMenuItemId, SidebarTabId } from '../types';
import { ActionMenuSettingsModal } from './ActionMenuSettingsModal';

export const Sidebar: React.FC = () => {
  const {
    notes,
    taskLists,
    tags,
    blocks,
    viewMode,
    setViewMode,
    activeNoteId,
    setActiveNoteId,
    activeTaskId,
    setActiveTaskId,
    createNote,
    createTaskList,
    openCreateTaskListModal,
    updateNote,
    deleteNote,
    createTag,
    sidebarOpen,
    setSidebarOpen,
    theme,
    language,
    quickSettings,
    setIsAIPromptOpen,
    setIsWebSearchOpen,
    createBlock,
    moveBlock,
    deleteBlock,
    openDeleteBlockModal,
    openCreateBlockModal,
    moveNotesToBlock,
    kanbanColumns,
    kanbanCards,
    openCreateKanbanCardModal,
    openCreateKanbanColumnModal,
    openEditKanbanCardModal,
    events,
  } = useApp();

  const [collapsedBlocks, setCollapsedBlocks] = useState<Record<string, boolean>>({});
  const [tasksOpen, setTasksOpen] = useState(true);
  const [kanbanOpen, setKanbanOpen] = useState(true);
  const [showActionTiles, setShowActionTiles] = useState(false);
  const [isActionMenuSettingsOpen, setIsActionMenuSettingsOpen] = useState(false);
  const [isCreateDropdownOpen, setIsCreateDropdownOpen] = useState(false);
  const [activeBlockMenuId, setActiveBlockMenuId] = useState<string | null>(null);

  // Multi-selection state for notes in sidebar
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [isBulkTagOpen, setIsBulkTagOpen] = useState(false);
  const [isBulkBlockOpen, setIsBulkBlockOpen] = useState(false);
  const [bulkTagSearch, setBulkTagSearch] = useState('');
  const [isBulkTrashConfirmOpen, setIsBulkTrashConfirmOpen] = useState(false);

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll scrollable list when bulk selection starts or submenus expand
  React.useEffect(() => {
    if (selectedNoteIds.length > 0 && scrollContainerRef.current) {
      const el = scrollContainerRef.current;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      if (isNearBottom) {
        el.scrollBy({ top: 60, behavior: 'smooth' });
      }
    }
  }, [selectedNoteIds.length, isBulkBlockOpen, isBulkTagOpen]);

  if (!sidebarOpen) return null;

  const t = (key: string) => getTranslation(language, key);
  const isLight = isLightColor(theme.bg);

  // Card background and border styles matching the theme & quickSettings
  const cardBg = hexToRgba(theme.text, 0.05);
  const cardBorder = quickSettings.showBorder
    ? theme.accent
    : hexToRgba(theme.text, 0.12);

  const createBtnBorder = quickSettings.showBorder
    ? (isLight ? hexToRgba(theme.text, 0.35) : 'rgba(255, 255, 255, 0.5)')
    : 'transparent';

  const toggleBlockCollapse = (blockId: string) => {
    setCollapsedBlocks(prev => ({
      ...prev,
      [blockId]: !prev[blockId],
    }));
  };

  // Helper to get notes for a specific block (excluding private notes)
  const getNotesForBlock = (block: NoteBlock) => {
    const publicNotes = notes.filter(n => !n.isPrivate);
    if (block.id === 'pinned' || block.type === 'pinned') {
      return publicNotes.filter(n => n.pinned);
    }
    if (block.id === 'general' || block.type === 'general') {
      return publicNotes.filter(n => !n.pinned && (!n.blockId || n.blockId === 'general'));
    }
    return publicNotes.filter(n => !n.pinned && n.blockId === block.id);
  };

  return (
    <>
      {/* Backdrop overlay for closing sidebar when clicking outside */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          setSidebarOpen(false);
          setIsCreateDropdownOpen(false);
          setActiveBlockMenuId(null);
        }}
      />

      {/* Sidebar Panel Drawer */}
      <aside
        className="fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] h-full z-50 flex flex-col p-3.5 border-r transition-all shrink-0 select-none overflow-hidden shadow-2xl"
        style={{
          backgroundColor: theme.bg,
          borderColor: hexToRgba(theme.text, 0.12),
          color: theme.text,
        }}
        onClick={() => {
          if (isCreateDropdownOpen) setIsCreateDropdownOpen(false);
          if (activeBlockMenuId) setActiveBlockMenuId(null);
        }}
      >
        {/* Top Fixed Section */}
        <div className="shrink-0 space-y-3">
          {/* Top Header */}
          <div className="flex items-center justify-between pt-1 px-1">
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {viewMode === 'tasks'
                  ? t('tasks')
                  : viewMode === 'kanban'
                  ? 'Канбан'
                  : viewMode === 'trash'
                  ? 'Корзина'
                  : viewMode === 'settings'
                  ? 'Настройки'
                  : t('notes')}
              </h2>
            </div>
            <div className="flex items-center gap-1 opacity-70">
              <button
                onClick={() => setShowActionTiles(!showActionTiles)}
                className={`p-1.5 rounded-full transition border cursor-pointer ${
                  showActionTiles
                    ? 'bg-white/20 border-white/20'
                    : 'hover:bg-white/10 border-transparent hover:border-white/10'
                }`}
                title="Плитки действий"
              >
                <MoreHorizontal size={18} />
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 transition border border-transparent hover:border-white/10 cursor-pointer"
                title="Закрыть боковую панель"
              >
                <LayoutGrid size={18} />
              </button>
            </div>
          </div>

          {/* View Switcher Tabs - Dynamic Capsule with Horizontal Scroll and No Text Truncation */}
          {(() => {
            const tabsOrder: ('notes' | 'tasks' | 'kanban' | 'calendar')[] =
              quickSettings.sidebarTabs && quickSettings.sidebarTabs.length > 0
                ? quickSettings.sidebarTabs
                : ['notes', 'tasks'];

            return (
              <div
                className="flex items-center gap-1 p-1 rounded-2xl border shrink-0 overflow-x-auto no-scrollbar scroll-smooth"
                style={{
                  backgroundColor: cardBg,
                  borderColor: cardBorder,
                }}
              >
                {tabsOrder.map(tabId => {
                  if (tabId === 'notes') {
                    const isSelected = viewMode === 'notes' || viewMode === 'editor';
                    return (
                      <button
                        key="notes"
                        onClick={() => {
                          setViewMode('notes');
                          setShowActionTiles(false);
                        }}
                        className={`flex-1 min-w-[76px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                          isSelected ? 'shadow-xs' : 'opacity-60 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: isSelected
                            ? isLight
                              ? '#FFFFFF'
                              : 'rgba(255, 255, 255, 0.14)'
                            : 'transparent',
                          color: isSelected ? theme.accent : theme.text,
                        }}
                      >
                        <FileText size={14} className="shrink-0" />
                        <span className="whitespace-nowrap">{t('notes')}</span>
                      </button>
                    );
                  }

                  if (tabId === 'tasks') {
                    const isSelected = viewMode === 'tasks';
                    return (
                      <button
                        key="tasks"
                        onClick={() => {
                          setViewMode('tasks');
                          setShowActionTiles(false);
                        }}
                        className={`flex-1 min-w-[76px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                          isSelected ? 'shadow-xs' : 'opacity-60 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: isSelected
                            ? isLight
                              ? '#FFFFFF'
                              : 'rgba(255, 255, 255, 0.14)'
                            : 'transparent',
                          color: isSelected ? theme.accent : theme.text,
                        }}
                      >
                        <CheckSquare size={14} className="shrink-0" />
                        <span className="whitespace-nowrap">{t('tasks')}</span>
                      </button>
                    );
                  }

                  if (tabId === 'kanban') {
                    const isSelected = viewMode === 'kanban';
                    return (
                      <button
                        key="kanban"
                        onClick={() => {
                          setViewMode('kanban');
                          setShowActionTiles(false);
                        }}
                        className={`flex-1 min-w-[76px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                          isSelected ? 'shadow-xs' : 'opacity-60 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: isSelected
                            ? isLight
                              ? '#FFFFFF'
                              : 'rgba(255, 255, 255, 0.14)'
                            : 'transparent',
                          color: isSelected ? theme.accent : theme.text,
                        }}
                      >
                        <Columns3 size={14} className="shrink-0" />
                        <span className="whitespace-nowrap">Канбан</span>
                      </button>
                    );
                  }

                  if (tabId === 'calendar') {
                    const isSelected = viewMode === 'calendar';
                    return (
                      <button
                        key="calendar"
                        onClick={() => {
                          setViewMode('calendar');
                          setShowActionTiles(false);
                        }}
                        className={`flex-1 min-w-[76px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                          isSelected ? 'shadow-xs' : 'opacity-60 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: isSelected
                            ? isLight
                              ? '#FFFFFF'
                              : 'rgba(255, 255, 255, 0.14)'
                            : 'transparent',
                          color: isSelected ? theme.accent : theme.text,
                        }}
                      >
                        <CalendarIcon size={14} className="shrink-0" />
                        <span className="whitespace-nowrap">Календарь</span>
                      </button>
                    );
                  }

                  if (tabId === 'private') {
                    const isSelected = viewMode === 'private';
                    return (
                      <button
                        key="private"
                        onClick={() => {
                          setViewMode('private');
                          setShowActionTiles(false);
                        }}
                        className={`flex-1 min-w-[76px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                          isSelected ? 'shadow-xs' : 'opacity-60 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: isSelected
                            ? isLight
                              ? '#FFFFFF'
                              : 'rgba(255, 255, 255, 0.14)'
                            : 'transparent',
                          color: isSelected ? theme.accent : theme.text,
                        }}
                      >
                        <Shield size={14} className="shrink-0" />
                        <span className="whitespace-nowrap">Приват</span>
                      </button>
                    );
                  }

                  return null;
                })}
              </div>
            );
          })()}

          {/* Action Tiles / Rows Menu OR Create Button */}
          {showActionTiles ? (
            <div className="pt-2 space-y-2">
              {(() => {
                const isRowsMode = quickSettings.actionMenuDisplayMode === 'rows';
                const activeItemIds: ActionMenuItemId[] =
                  quickSettings.actionMenuItems && quickSettings.actionMenuItems.length > 0
                    ? quickSettings.actionMenuItems
                    : ['calendar', 'kanban', 'trash', 'settings', 'ai', 'webSearch'];

                const actionItemMap: Record<
                  ActionMenuItemId,
                  {
                    id: ActionMenuItemId;
                    label: string;
                    icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
                    onClick: () => void;
                  }
                > = {
                  calendar: {
                    id: 'calendar',
                    label: 'Календарь',
                    icon: CalendarIcon,
                    onClick: () => {
                      setViewMode('calendar');
                      setShowActionTiles(false);
                      setSidebarOpen(false);
                    },
                  },
                  kanban: {
                    id: 'kanban',
                    label: 'Канбан',
                    icon: Columns3,
                    onClick: () => {
                      setViewMode('kanban');
                      setShowActionTiles(false);
                    },
                  },
                  private: {
                    id: 'private',
                    label: 'Приват',
                    icon: Shield,
                    onClick: () => {
                      setViewMode('private');
                      setShowActionTiles(false);
                    },
                  },
                  trash: {
                    id: 'trash',
                    label: 'Корзина',
                    icon: Trash2,
                    onClick: () => {
                      setViewMode('trash');
                      setShowActionTiles(false);
                    },
                  },
                  settings: {
                    id: 'settings',
                    label: 'Настройки',
                    icon: Settings,
                    onClick: () => {
                      setViewMode('settings');
                      setShowActionTiles(false);
                    },
                  },
                  ai: {
                    id: 'ai',
                    label: 'Anacrusa',
                    icon: Sparkles,
                    onClick: () => {
                      setIsAIPromptOpen(true);
                      setShowActionTiles(false);
                    },
                  },
                  webSearch: {
                    id: 'webSearch',
                    label: 'Веб поиск',
                    icon: Globe,
                    onClick: () => {
                      setIsWebSearchOpen(true);
                      setShowActionTiles(false);
                    },
                  },
                  notes: {
                    id: 'notes',
                    label: t('notes'),
                    icon: FileText,
                    onClick: () => {
                      setViewMode('notes');
                      setShowActionTiles(false);
                    },
                  },
                  tasks: {
                    id: 'tasks',
                    label: t('tasks'),
                    icon: CheckSquare,
                    onClick: () => {
                      setViewMode('tasks');
                      setShowActionTiles(false);
                    },
                  },
                };

                return isRowsMode ? (
                  <div className="flex flex-col gap-2">
                    {activeItemIds.map(itemId => {
                      const item = actionItemMap[itemId];
                      if (!item) return null;
                      const IconComp = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={item.onClick}
                          className="w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition hover:scale-[1.01] active:scale-[0.99] cursor-pointer group"
                          style={{ backgroundColor: cardBg, borderColor: cardBorder }}
                        >
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center transition group-hover:scale-105 shrink-0"
                            style={{ backgroundColor: hexToRgba(theme.text, 0.08), color: theme.text }}
                          >
                            <IconComp size={18} />
                          </div>
                          <span className="text-xs font-extrabold truncate" style={{ color: theme.text }}>
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    {activeItemIds.map(itemId => {
                      const item = actionItemMap[itemId];
                      if (!item) return null;
                      const IconComp = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={item.onClick}
                          className="p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center transition hover:scale-102 active:scale-98 cursor-pointer group"
                          style={{ backgroundColor: cardBg, borderColor: cardBorder }}
                        >
                          <div
                            className="w-11 h-11 rounded-full flex items-center justify-center mb-2 transition group-hover:scale-110 opacity-80 group-hover:opacity-100"
                            style={{ backgroundColor: hexToRgba(theme.text, 0.08), color: theme.text }}
                          >
                            <IconComp size={20} />
                          </div>
                          <span className="text-xs font-extrabold" style={{ color: theme.text }}>
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Configure Button ("Настроить") */}
              <button
                type="button"
                onClick={() => setIsActionMenuSettingsOpen(true)}
                className="w-full py-2.5 px-3 rounded-2xl border flex items-center justify-center gap-2 text-xs font-black transition cursor-pointer hover:opacity-90 active:scale-98 shadow-xs"
                style={{
                  backgroundColor: hexToRgba(theme.text, 0.04),
                  borderColor: cardBorder,
                  color: theme.text,
                }}
              >
                <SlidersHorizontal size={14} style={{ color: theme.accent }} />
                <span>Настроить</span>
              </button>
            </div>
          ) : (
            <>
              {/* Create Button with Chevron Dropdown */}
              <div className="relative">
                <div
                  className="w-full flex items-center rounded-2xl border font-extrabold text-xs shadow-md transition overflow-hidden"
                  style={{
                    backgroundColor: theme.accent,
                    borderColor: createBtnBorder,
                    color: isLightColor(theme.accent) ? '#000000' : '#FFFFFF',
                  }}
                >
                  <button
                    onClick={() => {
                      if (viewMode === 'tasks') {
                        openCreateTaskListModal();
                      } else if (viewMode === 'kanban') {
                        openCreateKanbanCardModal();
                      } else {
                        const newNote = createNote();
                        setActiveNoteId(newNote.id);
                        setViewMode('editor');
                      }
                    }}
                    className="flex-1 flex items-center gap-2 p-3.5 hover:opacity-90 active:scale-98 transition cursor-pointer text-left truncate"
                  >
                    {viewMode === 'tasks' ? (
                      <>
                        <CheckSquare size={16} className="shrink-0" />
                        <span className="truncate">Новая задача</span>
                      </>
                    ) : viewMode === 'kanban' ? (
                      <>
                        <Columns3 size={16} className="shrink-0" />
                        <span className="truncate">Новая задача</span>
                      </>
                    ) : (
                      <>
                        <FileText size={16} className="shrink-0" />
                        <span className="truncate">Создать заметку</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCreateDropdownOpen(!isCreateDropdownOpen);
                    }}
                    className="p-3.5 hover:bg-black/10 transition cursor-pointer border-l"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}
                    title="Меню создания"
                  >
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-200 ${isCreateDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>

                {/* Create Dropdown Menu */}
                {isCreateDropdownOpen && (
                  <div
                    className="absolute top-full left-0 right-0 mt-1.5 p-1.5 rounded-2xl border shadow-2xl backdrop-blur-2xl z-50 flex flex-col gap-1 text-xs font-bold animate-fadeIn"
                    style={{
                      backgroundColor: isLight ? 'rgba(255, 255, 255, 0.95)' : hexToRgba(theme.bg, 0.95),
                      borderColor: hexToRgba(theme.text, 0.15),
                      color: theme.text,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        const newNote = createNote();
                        setActiveNoteId(newNote.id);
                        setViewMode('editor');
                        setIsCreateDropdownOpen(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 active:scale-98 transition cursor-pointer text-left"
                    >
                      <FileText size={14} style={{ color: theme.accent }} />
                      <span>Новая заметка</span>
                    </button>

                    <button
                      onClick={() => {
                        openCreateTaskListModal();
                        setIsCreateDropdownOpen(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 active:scale-98 transition cursor-pointer text-left"
                    >
                      <CheckSquare size={14} style={{ color: theme.accent }} />
                      <span>Новая задача</span>
                    </button>

                    <button
                      onClick={() => {
                        openCreateKanbanCardModal();
                        setViewMode('kanban');
                        setIsCreateDropdownOpen(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 active:scale-98 transition cursor-pointer text-left"
                    >
                      <Columns3 size={14} style={{ color: theme.accent }} />
                      <span>Карточка канбана</span>
                    </button>

                    <button
                      onClick={() => {
                        openCreateKanbanColumnModal();
                        setViewMode('kanban');
                        setIsCreateDropdownOpen(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 active:scale-98 transition cursor-pointer text-left"
                    >
                      <FolderPlus size={14} style={{ color: theme.accent }} />
                      <span>Колонка канбана</span>
                    </button>

                    <button
                      onClick={() => {
                        openCreateBlockModal();
                        setIsCreateDropdownOpen(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 active:scale-98 transition cursor-pointer text-left"
                    >
                      <Layers size={14} style={{ color: theme.accent }} />
                      <span>Новый блок</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Scrollable Middle List for Notes, Tasks, or Kanban */}
        {!showActionTiles && (
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto min-h-0 space-y-2.5 mt-3 pr-1 pb-16"
          >
            {/* Kanban View: Columns & Cards Overview */}
            {viewMode === 'kanban' ? (
              <div
                className="p-3 rounded-2xl border space-y-2"
                style={{ backgroundColor: cardBg, borderColor: cardBorder }}
              >
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setKanbanOpen(!kanbanOpen)}
                    className="flex items-center gap-1.5 text-xs font-bold opacity-90 hover:opacity-100 transition cursor-pointer"
                  >
                    {kanbanOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span>Колонки доски</span>
                  </button>
                  <span className="text-[10px] opacity-50 font-bold">{kanbanColumns.length}</span>
                </div>

                {kanbanOpen && (
                  <div className="pt-1 space-y-1 max-h-64 overflow-y-auto pr-1">
                    {kanbanColumns.length === 0 ? (
                      <div className="text-center py-3 text-xs opacity-40 font-medium">
                        Нет колонок
                      </div>
                    ) : (
                      [...kanbanColumns]
                        .sort((a, b) => a.order - b.order)
                        .map(col => {
                          const colCards = kanbanCards.filter(c => c.columnId === col.id);
                          return (
                            <button
                              key={col.id}
                              onClick={() => {
                                setViewMode('kanban');
                                setSidebarOpen(false);
                              }}
                              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer opacity-80 hover:opacity-100 hover:bg-white/5"
                              style={{ color: theme.text }}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <div
                                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                                  style={{ backgroundColor: col.color }}
                                />
                                <span className="truncate font-semibold">{col.title}</span>
                              </div>
                              <span className="text-[10px] opacity-50 font-normal ml-1">
                                {colCards.length}
                              </span>
                            </button>
                          );
                        })
                    )}

                    <div className="pt-1">
                      <button
                        onClick={() => openCreateKanbanColumnModal()}
                        className="w-full flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold opacity-70 hover:opacity-100 transition cursor-pointer"
                        style={{ color: theme.accent }}
                      >
                        <Plus size={13} />
                        <span>Новая колонка</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : viewMode === 'tasks' ? (
                <div
                  className="p-3 rounded-2xl border space-y-2"
                  style={{ backgroundColor: cardBg, borderColor: cardBorder }}
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setTasksOpen(!tasksOpen)}
                      className="flex items-center gap-1.5 text-xs font-bold opacity-90 hover:opacity-100 transition cursor-pointer"
                    >
                      {tasksOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <span>{t('tasks')}</span>
                    </button>
                    <span className="text-[10px] opacity-50 font-bold">{taskLists.length}</span>
                  </div>

                  {tasksOpen && (
                    <div className="pt-1 space-y-1 max-h-64 overflow-y-auto pr-2">
                      {taskLists.length === 0 ? (
                        <div className="text-center py-3 text-xs opacity-40 font-medium">
                          Нет задач
                        </div>
                      ) : (
                        taskLists.map(list => {
                          const isSelected = activeTaskId === list.id && viewMode === 'tasks';
                          const completedCount = list.items.filter(i => i.completed).length;
                          return (
                            <button
                              key={list.id}
                              onClick={() => {
                                setActiveTaskId(list.id);
                                setViewMode('tasks');
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                                isSelected
                                  ? 'border'
                                  : 'opacity-80 hover:opacity-100 hover:bg-white/5'
                              }`}
                              style={{
                                backgroundColor: isSelected
                                  ? hexToRgba(theme.text, 0.08)
                                  : 'transparent',
                                borderColor: isSelected
                                  ? hexToRgba(theme.text, 0.14)
                                  : 'transparent',
                                color: theme.text,
                              }}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <CheckSquare
                                  size={14}
                                  className="shrink-0"
                                  style={{ color: isSelected ? theme.accent : 'inherit' }}
                                />
                                <span className="truncate font-semibold">{list.title || 'Без названия'}</span>
                              </div>
                              <span className="text-[10px] opacity-50 font-normal ml-1">
                                {completedCount}/{list.items.length}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              ) : viewMode === 'calendar' ? (
                <div
                  className="p-3 rounded-2xl border space-y-2.5"
                  style={{ backgroundColor: cardBg, borderColor: cardBorder }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold opacity-90">
                      <CalendarIcon size={14} style={{ color: theme.accent }} />
                      <span>Календарь</span>
                    </div>
                    <span className="text-[10px] opacity-50 font-bold">
                      {events.filter(e => !e.deleted).length}
                    </span>
                  </div>
                  <div className="text-xs opacity-75 font-medium leading-relaxed">
                    Всего событий: {events.filter(e => !e.deleted).length}
                  </div>
                  <button
                    onClick={() => {
                      setViewMode('calendar');
                      setSidebarOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer hover:opacity-90 active:scale-98"
                    style={{
                      backgroundColor: hexToRgba(theme.accent, 0.15),
                      color: theme.accent,
                    }}
                  >
                    <CalendarIcon size={14} />
                    <span>Открыть календарь</span>
                  </button>
                </div>
              ) : (
                /* Notes View: Dynamic Blocks Rendering */
                <div className="space-y-2.5">
                  {blocks.map((block, blockIndex) => {
                    const blockNotes = getNotesForBlock(block);
                    // RULE 1: If block has no notes, do not display it!
                    if (blockNotes.length === 0) return null;

                    const isCollapsed = collapsedBlocks[block.id] || false;
                    const isMenuOpen = activeBlockMenuId === block.id;

                    return (
                      <div
                        key={block.id}
                        className="p-3 rounded-2xl border space-y-2 relative"
                        style={{ backgroundColor: cardBg, borderColor: cardBorder }}
                      >
                        {/* Block Header */}
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => toggleBlockCollapse(block.id)}
                            className="flex items-center gap-1.5 text-xs font-bold opacity-90 hover:opacity-100 transition cursor-pointer truncate flex-1 pr-1"
                          >
                            {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                            <span className="truncate">{block.name}</span>
                            <span className="text-[10px] opacity-50 ml-1 font-semibold">{blockNotes.length}</span>
                          </button>

                          {/* 3-dots Menu trigger for block */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveBlockMenuId(isMenuOpen ? null : block.id);
                              }}
                              className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-white/10 transition cursor-pointer"
                              title="Опции блока"
                            >
                              <MoreHorizontal size={14} />
                            </button>

                            {/* Block Action Menu Popover */}
                            {isMenuOpen && (
                              <div
                                className={`absolute right-0 ${
                                  blockIndex >= Math.max(1, blocks.length - 2)
                                    ? 'bottom-full mb-1'
                                    : 'top-full mt-1'
                                } w-44 p-1.5 rounded-2xl border shadow-2xl backdrop-blur-2xl z-50 flex flex-col gap-0.5 text-xs font-bold animate-fadeIn`}
                                style={{
                                  backgroundColor: isLight ? 'rgba(255, 255, 255, 0.98)' : hexToRgba(theme.bg, 0.98),
                                  borderColor: hexToRgba(theme.text, 0.15),
                                  color: theme.text,
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  disabled={blockIndex === 0}
                                  onClick={() => {
                                    moveBlock(block.id, 'up');
                                    setActiveBlockMenuId(null);
                                  }}
                                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition text-left cursor-pointer ${
                                    blockIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10 active:scale-98'
                                  }`}
                                >
                                  {quickSettings.horizontalMainMenu ? (
                                    <ArrowLeft size={13} style={{ color: theme.accent }} />
                                  ) : (
                                    <ArrowUp size={13} style={{ color: theme.accent }} />
                                  )}
                                  <span>{quickSettings.horizontalMainMenu ? 'Переместить влево' : 'Переместить вверх'}</span>
                                </button>

                                <button
                                  disabled={blockIndex === blocks.length - 1}
                                  onClick={() => {
                                    moveBlock(block.id, 'down');
                                    setActiveBlockMenuId(null);
                                  }}
                                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition text-left cursor-pointer ${
                                    blockIndex === blocks.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10 active:scale-98'
                                  }`}
                                >
                                  {quickSettings.horizontalMainMenu ? (
                                    <ArrowRight size={13} style={{ color: theme.accent }} />
                                  ) : (
                                    <ArrowDown size={13} style={{ color: theme.accent }} />
                                  )}
                                  <span>{quickSettings.horizontalMainMenu ? 'Переместить вправо' : 'Переместить вниз'}</span>
                                </button>

                                {block.type === 'custom' && (
                                  <>
                                    <div className="h-px my-0.5" style={{ backgroundColor: hexToRgba(theme.text, 0.1) }} />
                                    
                                    <button
                                      onClick={() => {
                                        openCreateBlockModal([], block);
                                        setActiveBlockMenuId(null);
                                      }}
                                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 active:scale-98 transition text-left cursor-pointer"
                                    >
                                      <Edit2 size={13} style={{ color: theme.accent }} />
                                      <span>Переименовать</span>
                                    </button>

                                    <button
                                      onClick={() => {
                                        openDeleteBlockModal(block);
                                        setActiveBlockMenuId(null);
                                      }}
                                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-red-500/20 active:scale-98 transition text-left text-red-400 cursor-pointer"
                                    >
                                      <Trash2 size={13} />
                                      <span>Удалить блок</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Notes in Block */}
                        {!isCollapsed && (
                          <div className="pt-1 space-y-1 max-h-48 overflow-y-auto pr-1">
                            {blockNotes.map(note => {
                              const isSelected = activeNoteId === note.id && viewMode === 'editor';
                              const isMultiSelected = selectedNoteIds.includes(note.id);
                              return (
                                <div
                                  key={note.id}
                                  onClick={() => {
                                    setActiveNoteId(note.id);
                                    setViewMode('editor');
                                  }}
                                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                                    isSelected
                                      ? 'border'
                                      : 'opacity-80 hover:opacity-100 hover:bg-white/5'
                                  }`}
                                  style={{
                                    backgroundColor: isSelected
                                      ? hexToRgba(theme.text, 0.08)
                                      : 'transparent',
                                    borderColor: isSelected
                                      ? hexToRgba(theme.text, 0.14)
                                      : 'transparent',
                                    color: theme.text,
                                  }}
                                >
                                  {note.pinned ? (
                                    <Pin size={13} className="shrink-0 fill-current" style={{ color: theme.accent }} />
                                  ) : (
                                    <FileText size={13} className="shrink-0 opacity-70" />
                                  )}
                                  <span className="truncate flex-1 font-semibold">{note.title || 'Без названия'}</span>

                                  {/* Circle Selection Button */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedNoteIds(prev =>
                                        prev.includes(note.id)
                                          ? prev.filter(id => id !== note.id)
                                          : [...prev, note.id]
                                      );
                                    }}
                                    className="shrink-0 p-0.5 rounded-full hover:scale-110 transition cursor-pointer ml-1"
                                    title={isMultiSelected ? "Снять выделение" : "Выделить заметку"}
                                  >
                                    <div
                                      className="w-4 h-4 rounded-full border flex items-center justify-center transition"
                                      style={{
                                        backgroundColor: isMultiSelected ? theme.accent : 'transparent',
                                        borderColor: isMultiSelected ? theme.accent : hexToRgba(theme.text, 0.3),
                                        color: isMultiSelected ? '#000000' : 'transparent',
                                      }}
                                    >
                                      {isMultiSelected && <Check size={10} strokeWidth={3} />}
                                    </div>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        )}

        {/* Bottom Section: Multi-Selection Actions ONLY when items are selected */}
        {!showActionTiles && selectedNoteIds.length > 0 && viewMode !== 'tasks' && (
          <div className="shrink-0 pt-2 pb-0.5 flex justify-center w-full relative z-30 mt-auto">
            {/* Bulk Actions Menu at the bottom */}
              <div
                className="w-full p-2.5 rounded-2xl border shadow-xl space-y-2 backdrop-blur-xl animate-fadeIn transition-all"
                style={{
                  backgroundColor: isLight ? 'rgba(255, 255, 255, 0.95)' : hexToRgba(theme.bg, 0.95),
                  borderColor: quickSettings.showBorder ? theme.accent : hexToRgba(theme.text, 0.2),
                  color: theme.text,
                }}
              >
                {/* Line 1: Выделено: X */}
                <div className="text-center font-bold text-[11px] opacity-75">
                  Выделено: {selectedNoteIds.length}
                </div>

                {/* Line 2: Row: Trash - Divider - In Block - Pin - Tag - Cancel */}
                <div className="flex items-center justify-between gap-1">
                  {/* Trash Button */}
                  <button
                    onClick={() => setIsBulkTrashConfirmOpen(true)}
                    className="w-8 h-8 shrink-0 flex items-center justify-center rounded-xl border transition cursor-pointer hover:opacity-80 active:scale-95 text-red-400"
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.12)',
                      borderColor: 'rgba(239, 68, 68, 0.25)',
                    }}
                    title="Корзина"
                  >
                    <Trash2 size={14} />
                  </button>

                  {/* Vertical Divider */}
                  <div className="w-px h-5 mx-0.5" style={{ backgroundColor: hexToRgba(theme.text, 0.15) }} />

                  {/* "В блок" Button */}
                  <button
                    onClick={() => {
                      setIsBulkBlockOpen(!isBulkBlockOpen);
                      setIsBulkTagOpen(false);
                    }}
                    className="h-8 px-2 shrink-0 flex items-center gap-1 rounded-xl border text-[11px] font-bold transition cursor-pointer hover:opacity-80 active:scale-95"
                    style={{
                      backgroundColor: isBulkBlockOpen ? theme.accent : 'transparent',
                      borderColor: isBulkBlockOpen ? theme.accent : hexToRgba(theme.text, 0.25),
                      color: isBulkBlockOpen ? (isLightColor(theme.accent) ? '#000000' : '#ffffff') : theme.text,
                    }}
                    title="В блок"
                  >
                    <Layers size={13} />
                    <span className="hidden sm:inline">В блок</span>
                  </button>

                  {/* Pin / Unpin Button */}
                  {(() => {
                    const selectedNotesList = notes.filter(n => selectedNoteIds.includes(n.id));
                    const allPinned = selectedNotesList.length > 0 && selectedNotesList.every(n => n.pinned);
                    const textColor = isLightColor(theme.accent) ? '#000000' : '#ffffff';
                    return (
                      <button
                        onClick={() => {
                          selectedNoteIds.forEach(id => {
                            updateNote(id, { pinned: !allPinned });
                          });
                        }}
                        className="w-8 h-8 shrink-0 flex items-center justify-center rounded-xl border transition cursor-pointer hover:opacity-80 active:scale-95"
                        style={{
                          backgroundColor: allPinned ? theme.accent : 'transparent',
                          borderColor: allPinned ? theme.accent : hexToRgba(theme.text, 0.25),
                          color: allPinned ? textColor : theme.text,
                        }}
                        title={allPinned ? "Открепить" : "Закрепить"}
                      >
                        <Pin size={14} className={allPinned ? "fill-current" : ""} />
                      </button>
                    );
                  })()}

                  {/* Tag Button (# only) */}
                  <button
                    onClick={() => {
                      setIsBulkTagOpen(!isBulkTagOpen);
                      setIsBulkBlockOpen(false);
                    }}
                    className="w-8 h-8 shrink-0 flex items-center justify-center rounded-xl border font-black text-xs transition cursor-pointer hover:opacity-80 active:scale-95"
                    style={{
                      backgroundColor: isBulkTagOpen ? theme.accent : 'transparent',
                      borderColor: isBulkTagOpen ? theme.accent : hexToRgba(theme.text, 0.25),
                      color: isBulkTagOpen ? (isLightColor(theme.accent) ? '#000000' : '#ffffff') : theme.text,
                    }}
                    title="Добавить тег"
                  >
                    #
                  </button>

                  {/* Cross Button (Deselect / Отмена) */}
                  <button
                    onClick={() => {
                      setSelectedNoteIds([]);
                      setIsBulkTagOpen(false);
                      setIsBulkBlockOpen(false);
                    }}
                    className="w-8 h-8 shrink-0 flex items-center justify-center rounded-xl border transition cursor-pointer hover:opacity-80 active:scale-95 opacity-75 hover:opacity-100"
                    style={{
                      backgroundColor: 'transparent',
                      borderColor: hexToRgba(theme.text, 0.25),
                      color: theme.text,
                    }}
                    title="Отмена"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Inline "В блок" Popover */}
                {isBulkBlockOpen && (
                  <div className="pt-2 border-t space-y-1 animate-fadeIn max-h-36 overflow-y-auto" style={{ borderColor: hexToRgba(theme.text, 0.1) }}>
                    <div className="text-[10px] font-bold uppercase opacity-50 px-1">Выберите блок:</div>
                    {blocks.map(b => (
                      <button
                        key={b.id}
                        onClick={() => {
                          moveNotesToBlock(selectedNoteIds, b.id);
                          setIsBulkBlockOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-white/10 active:scale-98 transition text-left cursor-pointer"
                      >
                        <Layers size={12} style={{ color: theme.accent }} />
                        <span className="truncate flex-1 font-semibold">{b.name}</span>
                      </button>
                    ))}

                    {/* Private Space Option */}
                    <button
                      onClick={() => {
                        selectedNoteIds.forEach(id => {
                          updateNote(id, { isPrivate: true });
                        });
                        setSelectedNoteIds([]);
                        setIsBulkBlockOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-white/10 active:scale-98 transition text-left cursor-pointer"
                    >
                      <Shield size={12} style={{ color: theme.accent }} />
                      <span className="truncate flex-1 font-semibold">Приватное пространство</span>
                    </button>

                    <div className="h-px my-1" style={{ backgroundColor: hexToRgba(theme.text, 0.1) }} />

                    <button
                      onClick={() => {
                        openCreateBlockModal(selectedNoteIds);
                        setIsBulkBlockOpen(false);
                      }}
                      className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold hover:bg-white/10 transition cursor-pointer"
                      style={{ color: theme.accent }}
                    >
                      <Plus size={13} />
                      <span>Создать новый</span>
                    </button>
                  </div>
                )}

                {/* Inline Tag Selector Popover */}
                {isBulkTagOpen && (
                  <div className="pt-2 border-t space-y-1.5 animate-fadeIn" style={{ borderColor: hexToRgba(theme.text, 0.1) }}>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl border text-xs" style={{ backgroundColor: hexToRgba(theme.text, 0.05), borderColor: hexToRgba(theme.text, 0.12) }}>
                      <Search size={12} className="opacity-50 shrink-0" />
                      <input
                        type="text"
                        placeholder="Поиск тега..."
                        value={bulkTagSearch}
                        onChange={e => setBulkTagSearch(e.target.value)}
                        className="w-full bg-transparent outline-none text-xs"
                        style={{ color: theme.text }}
                      />
                    </div>

                    <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                      {tags
                        .filter(t => t.name.toLowerCase().includes(bulkTagSearch.toLowerCase()))
                        .map(t => {
                          const selectedNotesList = notes.filter(n => selectedNoteIds.includes(n.id));
                          const allHaveTag = selectedNotesList.length > 0 && selectedNotesList.every(n => (n.tags || []).includes(t.name));
                          return (
                            <button
                              key={t.id}
                              onClick={() => {
                                selectedNoteIds.forEach(id => {
                                  const note = notes.find(n => n.id === id);
                                  if (note) {
                                    const currentTags = note.tags || [];
                                    const hasTag = currentTags.includes(t.name);
                                    const updatedTags = hasTag
                                      ? currentTags.filter(tg => tg !== t.name)
                                      : [...currentTags, t.name];
                                    updateNote(id, { tags: updatedTags });
                                  }
                                });
                              }}
                              className="w-full flex items-center justify-between px-2 py-1 rounded-lg text-xs hover:bg-white/10 transition cursor-pointer"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color || theme.accent }} />
                                <span className="truncate">{t.name}</span>
                              </div>
                              {allHaveTag && <Check size={12} style={{ color: theme.accent }} />}
                            </button>
                          );
                        })}
                    </div>

                    {bulkTagSearch.trim() && !tags.some(t => t.name.toLowerCase() === bulkTagSearch.trim().toLowerCase()) && (
                      <button
                        onClick={() => {
                          const newTag = createTag(bulkTagSearch.trim());
                          selectedNoteIds.forEach(id => {
                            const note = notes.find(n => n.id === id);
                            if (note) {
                              const currentTags = note.tags || [];
                              if (!currentTags.includes(newTag.name)) {
                                updateNote(id, { tags: [...currentTags, newTag.name] });
                              }
                            }
                          });
                          setBulkTagSearch('');
                        }}
                        className="w-full flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold hover:bg-white/10 transition cursor-pointer"
                        style={{ color: theme.accent }}
                      >
                        <Plus size={12} />
                        <span className="truncate">Создать "{bulkTagSearch.trim()}"</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
          </div>
        )}

        {/* Bulk Trash Confirmation Modal */}
        {isBulkTrashConfirmOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={() => setIsBulkTrashConfirmOpen(false)}
          >
            <div
              className="w-full max-w-sm rounded-3xl p-6 shadow-2xl border backdrop-blur-2xl transition-all space-y-4"
              style={{
                backgroundColor: isLight ? '#FFFFFF' : hexToRgba(theme.bg, 0.95),
                color: theme.text,
                borderColor: hexToRgba(theme.text, 0.2),
                boxShadow: `0 25px 50px ${isLight ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.5)'}`,
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className="p-3 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    color: '#EF4444',
                  }}
                >
                  <Trash2 size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Переместить в корзину?</h3>
                  <p className="text-xs opacity-60 mt-0.5">
                    {selectedNoteIds.length === 1
                      ? 'Заметку можно будет восстановить из корзины.'
                      : `Выделенные заметки (${selectedNoteIds.length}) можно будет восстановить из корзины.`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setIsBulkTrashConfirmOpen(false)}
                  className="flex-1 py-3 px-4 rounded-2xl border font-bold text-xs hover:opacity-80 active:scale-98 transition cursor-pointer"
                  style={{
                    borderColor: hexToRgba(theme.text, 0.15),
                    backgroundColor: hexToRgba(theme.text, 0.05),
                    color: theme.text,
                  }}
                >
                  Нет
                </button>
                <button
                  onClick={() => {
                    selectedNoteIds.forEach(id => deleteNote(id));
                    setSelectedNoteIds([]);
                    setIsBulkTagOpen(false);
                    setIsBulkTrashConfirmOpen(false);
                  }}
                  className="flex-1 py-3 px-4 rounded-2xl font-bold text-xs text-white bg-red-500 hover:bg-red-600 active:scale-98 transition cursor-pointer shadow-lg shadow-red-500/20"
                >
                  Да
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Action Menu Settings Submenu Modal */}
        <ActionMenuSettingsModal
          isOpen={isActionMenuSettingsOpen}
          onClose={() => setIsActionMenuSettingsOpen(false)}
        />
      </aside>
    </>
  );
};

