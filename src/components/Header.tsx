import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../i18n';
import {
  Pin,
  Sparkles,
  Globe,
  Settings,
  Trash2,
  ArrowLeft,
  LayoutGrid,
  X,
  SlidersHorizontal,
  Copy,
  Tag as TagIcon,
  Check,
  Search,
  Menu,
  Download,
  Share2,
  Shield,
  Maximize2,
  ChevronRight,
  Layers,
  Plus,
} from 'lucide-react';
import { hexToRgba, isLightColor } from '../themes';
import { stripHtmlTags } from '../utils/textUtils';
import { PinModal } from './PinModal';
import { ALL_EDITOR_QUICK_ACTIONS } from '../types';

export const Header: React.FC = () => {
  const {
    viewMode,
    setViewMode,
    previousViewMode,
    activeSettingsTab,
    setActiveSettingsTab,
    activeNoteId,
    activeTaskId,
    notes,
    tags,
    togglePinNote,
    updateNote,
    deleteNote,
    createTag,
    toggleNoteTag,
    deleteTaskList,
    searchQuery,
    selectedTagFilter,
    setIsAIPromptOpen,
    setIsWebSearchOpen,
    setIsTagSearchOpen,
    setIsQuickSettingsOpen,
    openExportModal,
    sidebarOpen,
    setSidebarOpen,
    privatePin,
    trashPrivacyMode,
    theme,
    language,
    quickSettings,
    isFocusMode,
    setIsFocusMode,
    workspacesEnabled,
    workspaces,
    activeWorkspaceId,
    activeWorkspace,
    switchWorkspace,
    moveNoteToWorkspace,
    setIsWorkspaceModalOpen,
    blocks,
    openCreateBlockModal,
  } = useApp();

  const [isEditorMenuOpen, setIsEditorMenuOpen] = useState(false);
  const [isQuickActionsMenuOpen, setIsQuickActionsMenuOpen] = useState(false);
  const [editorMenuTab, setEditorMenuTab] = useState<'main' | 'tags' | 'blocks'>('main');
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [isTrashConfirmOpen, setIsTrashConfirmOpen] = useState(false);
  const [copiedToast, setCopiedToast] = useState<string | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const quickActionsMenuRef = useRef<HTMLDivElement>(null);

  // Close editor menu & quick actions menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsEditorMenuOpen(false);
      }
      if (quickActionsMenuRef.current && !quickActionsMenuRef.current.contains(e.target as Node)) {
        setIsQuickActionsMenuOpen(false);
      }
    };
    if (isEditorMenuOpen || isQuickActionsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditorMenuOpen, isQuickActionsMenuOpen]);

  const buttonBorder = quickSettings.showBorder ? theme.accent : hexToRgba(theme.text, 0.12);
  const isLight = isLightColor(theme.bg);

  // Pure Glass styling matching the "Создать" button & theme palette
  const glassBg = hexToRgba(theme.text, 0.08);
  const glassBorder = buttonBorder;

  // Popover / Dropdown background derived from active theme palette
  const popupBg = hexToRgba(theme.bg, 0.88);
  const popupBorder = buttonBorder;

  const t = (key: string) => getTranslation(language, key);
  const activeNote = notes.find(n => n.id === activeNoteId);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedToast('Ссылка скопирована!');
      setTimeout(() => setCopiedToast(null), 2500);
    }
  };

  // Collect all unique tag names from default tags and public notes
  const noteTagNames = new Set<string>();
  notes.filter(n => !n.isPrivate).forEach(n => {
    (n.tags || []).forEach(t => noteTagNames.add(t));
  });

  const allTagList = [...tags];
  noteTagNames.forEach(tagName => {
    if (!allTagList.some(t => t.name.toLowerCase() === tagName.toLowerCase())) {
      allTagList.push({
        id: `tag-${tagName}`,
        name: tagName,
        color: theme.accent,
      });
    }
  });

  return (
    <>
      {/* Toast Notice */}
      {copiedToast && (
        <div
          className="fixed top-16 right-4 z-50 px-4 py-2.5 rounded-2xl border shadow-xl backdrop-blur-xl text-xs font-bold animate-fadeIn flex items-center gap-2"
          style={{
            backgroundColor: glassBg,
            borderColor: glassBorder,
            color: theme.text,
          }}
        >
          <Check size={16} style={{ color: theme.accent }} />
          <span>{copiedToast}</span>
        </div>
      )}

      {/* Trash Confirmation Modal */}
      {isTrashConfirmOpen && activeNote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setIsTrashConfirmOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 shadow-2xl border backdrop-blur-2xl transition-all space-y-4"
            style={{
              backgroundColor: popupBg,
              color: theme.text,
              borderColor: popupBorder,
              boxShadow: `0 25px 50px ${isLight ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.5)'}`,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3.5">
              <Trash2 size={24} style={{ color: theme.accent }} className="shrink-0" />
              <div>
                <h3 className="font-extrabold text-base">Переместить в корзину?</h3>
                <p className="text-xs opacity-60 mt-0.5">
                  Заметку можно будет восстановить из корзины.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setIsTrashConfirmOpen(false)}
                className="flex-1 py-3 px-4 rounded-2xl border font-bold text-xs hover:opacity-80 active:scale-98 transition cursor-pointer"
                style={{
                  borderColor: glassBorder,
                  backgroundColor: hexToRgba(theme.text, 0.05),
                  color: theme.text,
                }}
              >
                Нет
              </button>
              <button
                onClick={() => {
                  const wasPrivate = Boolean(activeNote?.isPrivate || previousViewMode === 'private');
                  deleteNote(activeNote.id);
                  setViewMode(wasPrivate ? 'private' : 'notes');
                  setIsTrashConfirmOpen(false);
                }}
                className="flex-1 py-3 px-4 rounded-2xl font-bold text-xs active:scale-98 transition cursor-pointer shadow-lg hover:opacity-90"
                style={{
                  backgroundColor: theme.accent,
                  color: isLightColor(theme.accent) ? '#000000' : '#FFFFFF',
                }}
              >
                Да
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Top-Left Floating Controls */}
      {!isFocusMode && (
        <div className="fixed top-4 left-4 z-40 flex items-center pointer-events-auto">
          <div
            className="flex items-center gap-1 p-1 rounded-2xl border shadow-lg backdrop-blur-xl"
            style={{
              backgroundColor: glassBg,
              borderColor: glassBorder,
            }}
          >
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-xl hover:bg-white/10 active:scale-95 transition flex items-center justify-center cursor-pointer"
                style={{ color: theme.text }}
                title="Открыть боковое меню"
              >
                <LayoutGrid size={18} />
              </button>
            )}

            {viewMode === 'editor' && (
              <button
                onClick={() => {
                  if (activeNote?.isPrivate || previousViewMode === 'private') {
                    setViewMode('private');
                  } else {
                    setViewMode('notes');
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-white/10 active:scale-95 text-xs font-bold transition cursor-pointer"
                style={{ color: theme.text }}
              >
                <ArrowLeft size={14} />
                <span>{activeNote?.isPrivate || previousViewMode === 'private' ? 'Приват' : t('notes')}</span>
              </button>
            )}

            {viewMode === 'trash' && (
              <button
                onClick={() => {
                  if (trashPrivacyMode === 'private' || previousViewMode === 'private') {
                    setViewMode('private');
                  } else {
                    setViewMode('notes');
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-white/10 active:scale-95 text-xs font-bold transition cursor-pointer"
                style={{ color: theme.text }}
              >
                <ArrowLeft size={14} />
                <span>{trashPrivacyMode === 'private' || previousViewMode === 'private' ? 'Приват' : t('notes')}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Focus Mode Exit Floating Button (Top Right) */}
      {viewMode === 'editor' && isFocusMode && (
        <div className="fixed top-4 right-4 z-50 flex items-center pointer-events-auto animate-fadeIn">
          <button
            onClick={() => setIsFocusMode(false)}
            className="p-2.5 rounded-2xl border shadow-lg backdrop-blur-xl hover:opacity-80 active:scale-95 transition flex items-center justify-center cursor-pointer"
            style={{
              backgroundColor: glassBg,
              borderColor: glassBorder,
              color: theme.text,
            }}
            title="Выйти из режима фокуса"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Fixed Top-Right Floating Controls */}
      {!sidebarOpen && !isFocusMode && (
        <div className="fixed top-4 right-4 z-40 flex items-center gap-2 pointer-events-auto">
          {/* Editor Actions in Note Editor */}
          {viewMode === 'editor' && activeNote && (
            <div className="relative" ref={menuRef}>
              <div
                className="flex items-center gap-1 p-1 rounded-2xl border shadow-lg backdrop-blur-xl"
                style={{
                  backgroundColor: glassBg,
                  borderColor: glassBorder,
                }}
              >
                <button
                  onClick={() => setIsAIPromptOpen(true)}
                  className="p-2 rounded-xl hover:bg-white/10 transition cursor-pointer"
                  style={{ color: theme.text }}
                  title={t('aiAssistant')}
                >
                  <Sparkles size={16} />
                </button>
                <button
                  onClick={() => setIsWebSearchOpen(true)}
                  className="p-2 rounded-xl hover:bg-white/10 transition cursor-pointer"
                  style={{ color: theme.text }}
                  title="Веб-поиск"
                >
                  <Globe size={16} />
                </button>
                <button
                  onClick={() => setIsQuickSettingsOpen(true)}
                  className="p-2 rounded-xl hover:bg-white/10 transition cursor-pointer"
                  style={{ color: theme.text }}
                  title={t('quickSettings')}
                >
                  <Settings size={16} />
                </button>

                {/* Editor Action Submenu Button */}
                <button
                  onClick={() => {
                    setIsEditorMenuOpen(prev => !prev);
                    setEditorMenuTab('main');
                    setTagSearchQuery('');
                  }}
                  className="p-2 rounded-xl transition cursor-pointer"
                  style={{
                    backgroundColor: isEditorMenuOpen ? hexToRgba(theme.accent, 0.22) : 'transparent',
                    color: isEditorMenuOpen ? theme.accent : theme.text,
                  }}
                  title="Опции заметки"
                >
                  <SlidersHorizontal size={16} />
                </button>
              </div>

              {/* Submenu Dropdown */}
              {isEditorMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-52 sm:w-60 p-2 rounded-2xl border shadow-2xl backdrop-blur-2xl transition-all z-50 animate-fadeIn"
                  style={{
                    backgroundColor: popupBg,
                    borderColor: popupBorder,
                    color: theme.text,
                    boxShadow: `0 20px 40px ${isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(0, 0, 0, 0.5)'}`,
                  }}
                >
                  {editorMenuTab === 'main' ? (
                    /* Main Action Menu */
                    (() => {
                      const currentActions = quickSettings.editorQuickActions || ALL_EDITOR_QUICK_ACTIONS;
                      const showFocusMode = currentActions.includes('focusMode') && !quickSettings.pinFocusModeToBottomBar;
                      const showPin = currentActions.includes('pin');
                      const showTag = currentActions.includes('tag');
                      const showBlock = currentActions.includes('block');
                      const showExport = currentActions.includes('export');
                      const showPrivate = currentActions.includes('private') && Boolean(privatePin);
                      const showDelete = currentActions.includes('delete');
                      const hasItemsAbove = showFocusMode || showPin || showTag || showBlock || showExport || showPrivate;
                      const hasAnyItems = hasItemsAbove || showDelete;

                      return (
                        <div className="flex flex-col gap-0.5 text-xs font-bold">
                          {!hasAnyItems && (
                            <div className="px-3 py-3 text-[11px] opacity-40 font-normal text-center select-none">
                              {language === 'ru' ? 'Все действия скрыты' : 'All actions hidden'}
                            </div>
                          )}

                          {/* Focus Mode item (Only shown if NOT pinned to bottom dock) */}
                          {showFocusMode && (
                            <button
                              onClick={() => {
                                setIsFocusMode(true);
                                setIsEditorMenuOpen(false);
                              }}
                              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/10 active:scale-98 transition cursor-pointer text-left"
                            >
                              <Maximize2 size={15} style={{ color: theme.accent }} />
                              <span>Фокус мод</span>
                            </button>
                          )}

                          {/* 1. Закрепить */}
                          {showPin && (
                            <button
                              onClick={() => {
                                togglePinNote(activeNote.id);
                                setIsEditorMenuOpen(false);
                              }}
                              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/10 active:scale-98 transition cursor-pointer text-left"
                            >
                              <Pin
                                size={15}
                                style={{ color: theme.accent }}
                                className={activeNote.pinned ? 'fill-current' : ''}
                              />
                              <span>{activeNote.pinned ? 'Открепить' : 'Закрепить'}</span>
                            </button>
                          )}

                          {/* 2. Добавить тег */}
                          {showTag && (
                            <button
                              onClick={() => {
                                setEditorMenuTab('tags');
                                setTagSearchQuery('');
                              }}
                              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/10 active:scale-98 transition cursor-pointer text-left"
                            >
                              <TagIcon size={15} style={{ color: theme.accent }} />
                              <span>Добавить тег</span>
                            </button>
                          )}

                          {/* 2.5. В блок */}
                          {showBlock && (
                            <button
                              onClick={() => {
                                setEditorMenuTab('blocks');
                              }}
                              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/10 active:scale-98 transition cursor-pointer text-left"
                            >
                              <Layers size={15} style={{ color: theme.accent }} />
                              <span>В блок</span>
                            </button>
                          )}

                          {/* 3. Экспорт */}
                          {showExport && (
                            <button
                              onClick={() => {
                                setIsEditorMenuOpen(false);
                                openExportModal(activeNote.id);
                              }}
                              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/10 active:scale-98 transition cursor-pointer text-left"
                            >
                              <Download size={15} style={{ color: theme.accent }} />
                              <span>Экспорт</span>
                            </button>
                          )}

                          {/* 4. В приватное пространство (Only if privatePin is set) */}
                          {showPrivate && (
                            <button
                              onClick={() => {
                                const newPrivate = !activeNote.isPrivate;
                                updateNote(activeNote.id, { isPrivate: newPrivate });
                                if (newPrivate) {
                                  setViewMode('private');
                                }
                                setIsEditorMenuOpen(false);
                              }}
                              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/10 active:scale-98 transition cursor-pointer text-left"
                            >
                              <Shield size={15} style={{ color: theme.accent }} />
                              <span>{activeNote.isPrivate ? 'Убрать из привата' : 'В приват'}</span>
                            </button>
                          )}

                          {hasItemsAbove && showDelete && (
                            <div
                              className="h-px my-1"
                              style={{ backgroundColor: hexToRgba(theme.text, 0.1) }}
                            />
                          )}

                          {/* 6. В корзину */}
                          {showDelete && (
                            <button
                              onClick={() => {
                                setIsTrashConfirmOpen(true);
                                setIsEditorMenuOpen(false);
                              }}
                              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-red-500/15 text-red-500 active:scale-98 transition cursor-pointer text-left"
                            >
                              <Trash2 size={15} />
                              <span>В корзину</span>
                            </button>
                          )}
                        </div>
                      );
                    })()
                  ) : editorMenuTab === 'tags' ? (
                    /* Tag Selection Submenu */
                    <div className="flex flex-col gap-2 text-xs">
                      {/* Submenu Header */}
                      <div
                        className="flex items-center justify-between pb-2 border-b"
                        style={{ borderColor: hexToRgba(theme.text, 0.1) }}
                      >
                        <button
                          onClick={() => setEditorMenuTab('main')}
                          className="flex items-center gap-1.5 font-bold hover:opacity-80 transition cursor-pointer"
                        >
                          <ArrowLeft size={14} />
                          <span>Назад</span>
                        </button>
                        <span className="font-extrabold text-xs">Теги заметки</span>
                        <button
                          onClick={() => setIsEditorMenuOpen(false)}
                          className="p-1 rounded-lg hover:bg-white/10 transition cursor-pointer opacity-60"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {/* Tag search input */}
                      <div className="relative">
                        <input
                          type="text"
                          value={tagSearchQuery}
                          onChange={e => setTagSearchQuery(e.target.value)}
                          placeholder="Поиск или новый тег..."
                          className="w-full py-1.5 pl-2.5 pr-7 rounded-xl text-xs border outline-hidden transition"
                          style={{
                            backgroundColor: hexToRgba(theme.text, 0.06),
                            borderColor: hexToRgba(theme.text, 0.12),
                            color: theme.text,
                          }}
                        />
                        {tagSearchQuery ? (
                          <button
                            onClick={() => setTagSearchQuery('')}
                            className="absolute right-2 top-2 opacity-60 hover:opacity-100 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        ) : (
                          <Search size={12} className="absolute right-2 top-2 opacity-40" />
                        )}
                      </div>

                      {/* Tag list */}
                      <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
                        {allTagList
                          .filter(t => t.name.toLowerCase().includes(tagSearchQuery.toLowerCase()))
                          .map(tag => {
                            const isAttached = (activeNote.tags || []).some(
                              t => t.toLowerCase() === tag.name.toLowerCase()
                            );
                            return (
                              <button
                                key={tag.id}
                                onClick={() => {
                                  toggleNoteTag(activeNote.id, tag.name);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition cursor-pointer text-left ${
                                  isAttached ? 'font-bold' : 'font-medium hover:bg-white/10'
                                }`}
                                style={{
                                  backgroundColor: isAttached ? hexToRgba(theme.accent, 0.2) : 'transparent',
                                  color: theme.text,
                                }}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <div
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: tag.color || theme.accent }}
                                  />
                                  <span className="truncate">#{tag.name}</span>
                                </div>
                                {isAttached && <Check size={14} style={{ color: theme.accent }} />}
                              </button>
                            );
                          })}

                        {/* Create new tag if query doesn't match */}
                        {tagSearchQuery.trim() &&
                          !allTagList.some(
                            t => t.name.toLowerCase() === tagSearchQuery.trim().toLowerCase()
                          ) && (
                            <button
                              onClick={() => {
                                const newTag = createTag(tagSearchQuery.trim());
                                toggleNoteTag(activeNote.id, newTag.name);
                                setTagSearchQuery('');
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl border border-dashed transition cursor-pointer text-left font-bold"
                              style={{
                                borderColor: theme.accent,
                                color: theme.accent,
                                backgroundColor: hexToRgba(theme.accent, 0.1),
                              }}
                            >
                              <span>+ Создать #{tagSearchQuery.trim()}</span>
                            </button>
                          )}
                      </div>
                    </div>
                  ) : (
                    /* Block Selection Submenu */
                    <div className="flex flex-col gap-2 text-xs">
                      {/* Submenu Header */}
                      <div
                        className="flex items-center justify-between pb-2 border-b"
                        style={{ borderColor: hexToRgba(theme.text, 0.1) }}
                      >
                        <button
                          onClick={() => setEditorMenuTab('main')}
                          className="flex items-center gap-1.5 font-bold hover:opacity-80 transition cursor-pointer"
                        >
                          <ArrowLeft size={14} />
                          <span>Назад</span>
                        </button>
                        <span className="font-extrabold text-xs">В блок</span>
                        <button
                          onClick={() => setIsEditorMenuOpen(false)}
                          className="p-1 rounded-lg hover:bg-white/10 transition cursor-pointer opacity-60"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {/* Block list */}
                      <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
                        {blocks.map(b => {
                          let isCurrentBlock = false;
                          if (b.id === 'pinned' || b.type === 'pinned') {
                            isCurrentBlock = activeNote.pinned;
                          } else if (b.id === 'general' || b.type === 'general') {
                            isCurrentBlock = !activeNote.pinned && (!activeNote.blockId || activeNote.blockId === 'general');
                          } else {
                            isCurrentBlock = !activeNote.pinned && activeNote.blockId === b.id;
                          }

                          return (
                            <button
                              key={b.id}
                              onClick={() => {
                                if (b.id === 'pinned' || b.type === 'pinned') {
                                  updateNote(activeNote.id, { pinned: true, isPrivate: false });
                                } else if (b.id === 'general' || b.type === 'general') {
                                  updateNote(activeNote.id, { pinned: false, blockId: 'general', isPrivate: false });
                                } else {
                                  updateNote(activeNote.id, { pinned: false, blockId: b.id, isPrivate: false });
                                }
                                setIsEditorMenuOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition cursor-pointer text-left ${
                                isCurrentBlock ? 'font-bold' : 'font-medium hover:bg-white/10'
                              }`}
                              style={{
                                backgroundColor: isCurrentBlock ? hexToRgba(theme.accent, 0.18) : 'transparent',
                                color: theme.text,
                              }}
                            >
                              <div className="flex items-center gap-2 truncate pr-1">
                                <Layers size={13} style={{ color: theme.accent }} className="shrink-0" />
                                <span className="truncate">{b.name}</span>
                              </div>
                              {isCurrentBlock && <Check size={14} style={{ color: theme.accent }} className="shrink-0" />}
                            </button>
                          );
                        })}

                        {/* Option to move directly to Private Space - only if private space is enabled */}
                        {Boolean(privatePin) && (
                          <button
                            onClick={() => {
                              updateNote(activeNote.id, { isPrivate: true });
                              setIsEditorMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition cursor-pointer text-left ${
                              activeNote.isPrivate ? 'font-bold' : 'font-medium hover:bg-white/10'
                            }`}
                            style={{
                              backgroundColor: activeNote.isPrivate ? hexToRgba(theme.accent, 0.18) : 'transparent',
                              color: theme.text,
                            }}
                          >
                            <div className="flex items-center gap-2 truncate pr-1">
                              <Shield size={13} style={{ color: theme.accent }} className="shrink-0" />
                              <span className="truncate">Приватное пространство</span>
                            </div>
                            {activeNote.isPrivate && <Check size={14} style={{ color: theme.accent }} className="shrink-0" />}
                          </button>
                        )}
                      </div>

                      <div className="h-px my-0.5" style={{ backgroundColor: hexToRgba(theme.text, 0.1) }} />

                      {/* Create new block button */}
                      <button
                        onClick={() => {
                          setIsEditorMenuOpen(false);
                          openCreateBlockModal([activeNote.id]);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/10 active:scale-98 transition text-left cursor-pointer font-bold"
                        style={{ color: theme.accent }}
                      >
                        <Plus size={14} />
                        <span>Создать блок</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Settings Close/Back X Button */}
          {viewMode === 'settings' && (
            <button
              onClick={() => {
                if (activeSettingsTab !== null) {
                  setActiveSettingsTab(null);
                } else {
                  setViewMode(previousViewMode || 'notes');
                }
              }}
              className="p-2.5 rounded-2xl border shadow-lg backdrop-blur-xl hover:opacity-80 active:scale-95 transition flex items-center justify-center cursor-pointer"
              style={{
                backgroundColor: glassBg,
                borderColor: glassBorder,
                color: theme.text,
              }}
              title={activeSettingsTab ? "Назад к категориям" : "Закрыть настройки"}
            >
              <X size={18} />
            </button>
          )}

          {/* Main Views: Burger Menu (Quick Actions: Settings, AI, Web Search) & Tag Search Button */}
          {viewMode !== 'editor' && viewMode !== 'trash' && viewMode !== 'settings' && viewMode !== 'calendar' && (
            <div className="flex items-center gap-2">
              {/* Tag & Search Button (#) - Hidden in Private Mode */}
              {viewMode !== 'private' ? (
                <button
                  onClick={() => setIsTagSearchOpen(true)}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl border shadow-lg backdrop-blur-xl text-xs font-extrabold hover:opacity-80 active:scale-95 transition cursor-pointer"
                  style={{
                    backgroundColor: searchQuery.trim() || selectedTagFilter ? hexToRgba(theme.accent, 0.22) : glassBg,
                    borderColor: searchQuery.trim() || selectedTagFilter ? theme.accent : glassBorder,
                    color: searchQuery.trim() || selectedTagFilter ? theme.accent : theme.text,
                  }}
                  title="Поиск и теги (#)"
                >
                  <span className="text-sm font-black">#</span>
                  <span className="hidden sm:inline font-bold">
                    {searchQuery.trim() ? `«${searchQuery}»` : selectedTagFilter ? `#${selectedTagFilter}` : t('searchTags')}
                  </span>
                </button>
              ) : (
                /* In Private Mode: do not show '#', show note search button if search is not pinned to home screen */
                !quickSettings.pinSearchToHomeScreen && (
                  <button
                    onClick={() => setIsTagSearchOpen(true)}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl border shadow-lg backdrop-blur-xl text-xs font-extrabold hover:opacity-80 active:scale-95 transition cursor-pointer"
                    style={{
                      backgroundColor: searchQuery.trim() ? hexToRgba(theme.accent, 0.22) : glassBg,
                      borderColor: searchQuery.trim() ? theme.accent : glassBorder,
                      color: searchQuery.trim() ? theme.accent : theme.text,
                    }}
                    title="Поиск заметок"
                  >
                    <Search size={15} />
                    {searchQuery.trim() && (
                      <span className="hidden sm:inline font-bold">«{searchQuery}»</span>
                    )}
                  </button>
                )
              )}

              {/* Quick Actions Burger Menu */}
              <div className="relative" ref={quickActionsMenuRef}>
                <button
                  onClick={() => setIsQuickActionsMenuOpen(prev => !prev)}
                  className="p-2.5 rounded-2xl border shadow-lg backdrop-blur-xl hover:opacity-80 active:scale-95 transition flex items-center justify-center cursor-pointer"
                  style={{
                    backgroundColor: isQuickActionsMenuOpen ? hexToRgba(theme.accent, 0.22) : glassBg,
                    borderColor: isQuickActionsMenuOpen ? theme.accent : glassBorder,
                    color: isQuickActionsMenuOpen ? theme.accent : theme.text,
                  }}
                  title="Быстрые действия (Настройки, ИИ, Поиск)"
                >
                  <Menu size={18} />
                </button>

                {/* Dropdown Menu */}
                {isQuickActionsMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-52 sm:w-56 p-2 rounded-2xl border shadow-2xl backdrop-blur-2xl transition-all z-50 animate-fadeIn"
                    style={{
                      backgroundColor: popupBg,
                      borderColor: popupBorder,
                      color: theme.text,
                      boxShadow: `0 20px 40px ${isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(0, 0, 0, 0.5)'}`,
                    }}
                  >
                    <div className="flex flex-col gap-0.5 text-xs font-bold">
                      {/* 1. Настройки */}
                      <button
                        onClick={() => {
                          setViewMode('settings');
                          setIsQuickActionsMenuOpen(false);
                        }}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/10 active:scale-98 transition cursor-pointer text-left"
                      >
                        <Settings size={16} style={{ color: theme.accent }} />
                        <span>{t('settings')}</span>
                      </button>

                      {/* 2. Anacrusa */}
                      <button
                        onClick={() => {
                          setIsAIPromptOpen(true);
                          setIsQuickActionsMenuOpen(false);
                        }}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/10 active:scale-98 transition cursor-pointer text-left"
                      >
                        <Sparkles size={16} style={{ color: theme.accent }} />
                        <span>Anacrusa</span>
                      </button>

                      {/* 3. Веб-поиск */}
                      <button
                        onClick={() => {
                          setIsWebSearchOpen(true);
                          setIsQuickActionsMenuOpen(false);
                        }}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/10 active:scale-98 transition cursor-pointer text-left"
                      >
                        <Globe size={16} style={{ color: theme.accent }} />
                        <span>Веб-поиск</span>
                      </button>

                      {/* 4. Воркспейсы */}
                      {workspacesEnabled && (
                        <>
                          <div
                            className="h-px my-1"
                            style={{ backgroundColor: hexToRgba(theme.text, 0.1) }}
                          />
                          {workspaces.map(ws => {
                            const isActive = ws.id === activeWorkspaceId;
                            return (
                              <button
                                key={ws.id}
                                onClick={() => {
                                  if (!isActive) switchWorkspace(ws.id);
                                  setIsQuickActionsMenuOpen(false);
                                }}
                                className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 active:scale-98 transition cursor-pointer text-left"
                                style={{
                                  backgroundColor: isActive ? hexToRgba(theme.accent, 0.12) : 'transparent',
                                  color: isActive ? theme.accent : theme.text,
                                }}
                              >
                                <span className={`truncate ${isActive ? 'font-bold' : 'font-medium opacity-80'}`}>
                                  {ws.name}
                                </span>
                                {isActive && <Check size={14} style={{ color: theme.accent }} />}
                              </button>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Calendar Floating Back Button */}
          {viewMode === 'calendar' && (
            <button
              onClick={() => {
                const target = previousViewMode && previousViewMode !== viewMode ? previousViewMode : 'notes';
                setViewMode(target);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border shadow-lg backdrop-blur-xl text-xs font-bold transition hover:bg-white/10 active:scale-95 cursor-pointer"
              style={{
                backgroundColor: glassBg,
                borderColor: glassBorder,
                color: theme.text,
              }}
              title="Назад"
            >
              <ArrowLeft size={14} />
              <span>Назад</span>
            </button>
          )}
        </div>
      )}

      {isPinModalOpen && (
        <PinModal
          target="private"
          mode="set"
          onClose={() => setIsPinModalOpen(false)}
          onSuccess={() => {
            setIsPinModalOpen(false);
            if (activeNote) {
              updateNote(activeNote.id, { isPrivate: true });
              setViewMode('private');
            }
          }}
        />
      )}
    </>
  );
};

