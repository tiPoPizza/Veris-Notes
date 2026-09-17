import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../i18n';
import { Note, NoteBlock, ALL_NOTE_TILE_ACTIONS } from '../types';
import { Pin, Search, Plus, Tag as TagIcon, X, Trash2, MoreHorizontal, Copy, CopyPlus, Check, Download, Layers, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Edit2, Shield, Sparkles, FileSearch, Loader2 } from 'lucide-react';
import { hexToRgba, isLightColor } from '../themes';
import { stripHtmlTags } from '../utils/textUtils';
import { getFontFamilyStyle } from '../utils/fonts';
import { PinnedSearchBar } from './PinnedSearchBar';
import { PinModal } from './PinModal';
import { FloatingCreateBar } from './FloatingCreateBar';
import { semanticSearchService, NoteSemanticMatch } from '../services/semanticSearch';

// Persist main screen scroll position across note opening/closing
let savedMainScrollTop = 0;
let savedHorizontalScrollLeft = 0;
const savedColumnScrollTops: Record<string, number> = {};

export const NotesListView: React.FC = () => {
  const {
    notes,
    tags,
    blocks,
    activeNoteId,
    setActiveNoteId,
    setViewMode,
    togglePinNote,
    deleteNote,
    duplicateNote,
    createNote,
    createTag,
    toggleNoteTag,
    updateNote,
    selectedTagFilter,
    setSelectedTagFilter,
    searchQuery,
    setSearchQuery,
    searchTarget,
    semanticSearchSettings,
    isSemanticSearchActive,
    setIsSemanticSearchActive,
    isTagSearchOpen,
    setIsTagSearchOpen,
    sidebarOpen,
    privatePin,
    theme,
    language,
    quickSettings,
    openExportModal,
    openCreateBlockModal,
    openDeleteBlockModal,
    moveBlock,
    moveNoteInBlock,
    moveNotesToBlock,
  } = useApp();

  const mainContainerRef = useRef<HTMLDivElement>(null);
  const horizontalContainerRef = useRef<HTMLDivElement>(null);

  const [openMenuNoteId, setOpenMenuNoteId] = useState<string | null>(null);
  const [tagSubmenuNoteId, setTagSubmenuNoteId] = useState<string | null>(null);
  const [blockSubmenuNoteId, setBlockSubmenuNoteId] = useState<string | null>(null);
  const [activeBlockHeaderMenuId, setActiveBlockHeaderMenuId] = useState<string | null>(null);
  const [tagSearchQuery, setTagSearchQuery] = useState<string>('');
  const [newTagName, setNewTagName] = useState<string>('');
  const [newTagColor, setNewTagColor] = useState<string>('#A855F7');
  const [isCreatingCustomTag, setIsCreatingCustomTag] = useState<boolean>(false);
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [targetPrivateNoteId, setTargetPrivateNoteId] = useState<string | null>(null);

  // Semantic search results state
  const [semanticMatches, setSemanticMatches] = useState<NoteSemanticMatch[]>([]);
  const [isSemanticSearching, setIsSemanticSearching] = useState<boolean>(false);

  const isSemanticEffectiveActive =
    semanticSearchSettings.enabled &&
    (semanticSearchSettings.triggerMode === 'auto' || isSemanticSearchActive);

  useEffect(() => {
    if (!searchQuery.trim() || !isSemanticEffectiveActive) {
      setSemanticMatches([]);
      setIsSemanticSearching(false);
      return;
    }

    let isCancelled = false;
    setIsSemanticSearching(true);

    const timer = setTimeout(async () => {
      try {
        const nonPrivateNotes = notes.filter(n => !n.isPrivate);
        const results = await semanticSearchService.searchNotes(
          searchQuery,
          nonPrivateNotes,
          semanticSearchSettings.modelRepo,
          0.16,
          semanticSearchSettings.indexingMode || 'auto'
        );
        if (!isCancelled) {
          setSemanticMatches(results);
        }
      } catch (e) {
        console.error('Semantic search error:', e);
      } finally {
        if (!isCancelled) {
          setIsSemanticSearching(false);
        }
      }
    }, 180);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, isSemanticEffectiveActive, notes, semanticSearchSettings.modelRepo, semanticSearchSettings.indexingMode]);

  const semanticScoresMap = React.useMemo(() => {
    const map = new Map<string, number>();
    semanticMatches.forEach(m => map.set(m.note.id, m.score));
    return map;
  }, [semanticMatches]);

  const isHorizontal = !!quickSettings.horizontalMainMenu;

  const handleOpenNote = (noteId: string) => {
    if (mainContainerRef.current) {
      savedMainScrollTop = mainContainerRef.current.scrollTop;
    }
    if (horizontalContainerRef.current) {
      savedHorizontalScrollLeft = horizontalContainerRef.current.scrollLeft;
    }
    setActiveNoteId(noteId);
    setViewMode('editor');
  };

  useEffect(() => {
    const restoreScroll = () => {
      if (!isHorizontal && mainContainerRef.current && savedMainScrollTop > 0) {
        mainContainerRef.current.scrollTop = savedMainScrollTop;
      }
      if (isHorizontal && horizontalContainerRef.current && savedHorizontalScrollLeft > 0) {
        horizontalContainerRef.current.scrollLeft = savedHorizontalScrollLeft;
      }
      if (isHorizontal) {
        Object.entries(savedColumnScrollTops).forEach(([blockId, top]) => {
          const colEl = document.getElementById(`notes-block-col-${blockId}`);
          if (colEl && top > 0) {
            colEl.scrollTop = top;
          }
        });
      }
    };

    restoreScroll();
    const r1 = requestAnimationFrame(restoreScroll);
    const t1 = setTimeout(restoreScroll, 50);
    const t2 = setTimeout(restoreScroll, 150);

    return () => {
      cancelAnimationFrame(r1);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isHorizontal]);

  const longPressTimerRef = React.useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({});
  const isLongPressRef = React.useRef<boolean>(false);

  const handlePointerDown = (noteId: string) => {
    isLongPressRef.current = false;
    longPressTimerRef.current[noteId] = setTimeout(() => {
      isLongPressRef.current = true;
      setTagSubmenuNoteId(null);
      setBlockSubmenuNoteId(null);
      setOpenMenuNoteId(noteId);
    }, 500);
  };

  const handlePointerUpOrLeave = (noteId: string) => {
    if (longPressTimerRef.current[noteId]) {
      clearTimeout(longPressTimerRef.current[noteId]);
      delete longPressTimerRef.current[noteId];
    }
  };

  const handleContextMenu = (e: React.MouseEvent, noteId: string) => {
    e.preventDefault();
    setTagSubmenuNoteId(null);
    setBlockSubmenuNoteId(null);
    setOpenMenuNoteId(noteId);
  };

  const t = (key: string) => getTranslation(language, key);
  const isLight = isLightColor(theme.bg);

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const months = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `Обновлено ${day} ${month}, ${hours}:${minutes}`;
  };

  const getNoteTags = (note: Note): string[] => {
    return note.tags || [];
  };

  const filteredNotes = notes.filter(n => {
    if (n.isPrivate) return false;

    const matchesTag = !selectedTagFilter || getNoteTags(n).includes(selectedTagFilter);
    if (!matchesTag) return false;

    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase().trim();
    const titleMatch = (n.title || '').toLowerCase().includes(q);
    const contentPlain = stripHtmlTags(n.content || '').toLowerCase();
    const contentMatch = contentPlain.includes(q);
    const hasSemanticMatch = isSemanticEffectiveActive && semanticScoresMap.has(n.id);

    if (searchTarget === 'title') {
      return titleMatch || hasSemanticMatch;
    }
    if (searchTarget === 'content') {
      return contentMatch || hasSemanticMatch;
    }
    // searchTarget === 'all'
    return titleMatch || contentMatch || hasSemanticMatch;
  });

  // Helper to get notes for a block with search relevance ranking
  const getNotesForBlock = (block: NoteBlock, notesList: Note[]) => {
    const list = notesList.filter(n => !n.isPrivate);
    let blockNotes: Note[] = [];
    if (block.id === 'pinned' || block.type === 'pinned') {
      blockNotes = list.filter(n => n.pinned);
    } else if (block.id === 'general' || block.type === 'general') {
      blockNotes = list.filter(n => !n.pinned && (!n.blockId || n.blockId === 'general'));
    } else {
      blockNotes = list.filter(n => !n.pinned && n.blockId === block.id);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return [...blockNotes].sort((a, b) => {
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        const contentA = stripHtmlTags(a.content || '').toLowerCase();
        const contentB = stripHtmlTags(b.content || '').toLowerCase();

        let rankA = 0;
        let rankB = 0;

        if (titleA.includes(q)) rankA += 3.0;
        else if (contentA.includes(q)) rankA += 1.5;
        if (semanticScoresMap.has(a.id)) {
          rankA += (semanticScoresMap.get(a.id) || 0) * 2.5;
        }

        if (titleB.includes(q)) rankB += 3.0;
        else if (contentB.includes(q)) rankB += 1.5;
        if (semanticScoresMap.has(b.id)) {
          rankB += (semanticScoresMap.get(b.id) || 0) * 2.5;
        }

        if (Math.abs(rankB - rankA) > 0.001) {
          return rankB - rankA;
        }
        return b.updatedAt - a.updatedAt;
      });
    }

    return blockNotes;
  };

  const cardBg = isLight ? '#FFFFFF' : hexToRgba(theme.text, 0.05);
  const cardBorder = hexToRgba(theme.text, 0.12);

  const renderNoteActionModal = () => {
    const activeNoteId = openMenuNoteId || tagSubmenuNoteId || blockSubmenuNoteId;
    if (!activeNoteId) return null;

    const activeNote = notes.find(n => n.id === activeNoteId);
    if (!activeNote) return null;

    const isTagSubmenuOpen = tagSubmenuNoteId === activeNote.id;
    const isBlockSubmenuOpen = blockSubmenuNoteId === activeNote.id;

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

    const filteredTags = allTagList.filter(tag =>
      tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase())
    );

    const noteTagsLower = (activeNote.tags || []).map(t => t.toLowerCase());

    const isPinned = activeNote.pinned;
    const blockId = activeNote.blockId || 'general';
    const notesInCurrentBlock = notes.filter(n => {
      if (isPinned) return n.pinned;
      if (blockId === 'general') return !n.pinned && (!n.blockId || n.blockId === 'general');
      return !n.pinned && n.blockId === blockId;
    });
    const noteIndexInBlock = notesInCurrentBlock.findIndex(n => n.id === activeNote.id);
    const canMoveUp = noteIndexInBlock > 0;
    const canMoveDown = noteIndexInBlock !== -1 && noteIndexInBlock < notesInCurrentBlock.length - 1;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.25)' }}
        onClick={e => {
          e.stopPropagation();
          setOpenMenuNoteId(null);
          setTagSubmenuNoteId(null);
          setBlockSubmenuNoteId(null);
        }}
      >
        <div
          className={`w-full ${isTagSubmenuOpen || isBlockSubmenuOpen ? 'max-w-[240px]' : 'max-w-[165px]'} p-2.5 rounded-2xl border shadow-2xl backdrop-blur-2xl transition-all`}
          style={{
            backgroundColor: isLight ? 'rgba(255, 255, 255, 0.88)' : hexToRgba(theme.bg, 0.88),
            borderColor: hexToRgba(theme.text, 0.15),
            color: theme.text,
            boxShadow: isLight ? '0 10px 30px rgba(0, 0, 0, 0.12)' : '0 10px 30px rgba(0, 0, 0, 0.5)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {isBlockSubmenuOpen ? (
            /* "В блок" Submenu */
            <div className="flex flex-col gap-2 text-xs font-bold">
              {/* Submenu Header */}
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: hexToRgba(theme.text, 0.1) }}>
                <div className="flex items-center gap-2">
                  <Layers size={14} style={{ color: theme.accent }} />
                  <span>В блок</span>
                </div>
                <button
                  onClick={() => {
                    setBlockSubmenuNoteId(null);
                    setOpenMenuNoteId(activeNote.id);
                  }}
                  className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-white/10 cursor-pointer"
                  title="Назад"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Block List */}
              <div className="max-h-48 overflow-y-auto space-y-1 pr-0.5">
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
                      onClick={e => {
                        e.stopPropagation();
                        if (b.id === 'pinned' || b.type === 'pinned') {
                          updateNote(activeNote.id, { pinned: true, isPrivate: false });
                        } else if (b.id === 'general' || b.type === 'general') {
                          updateNote(activeNote.id, { pinned: false, blockId: 'general', isPrivate: false });
                        } else {
                          updateNote(activeNote.id, { pinned: false, blockId: b.id, isPrivate: false });
                        }
                        setBlockSubmenuNoteId(null);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs hover:bg-white/10 active:scale-98 transition text-left cursor-pointer"
                      style={{
                        backgroundColor: isCurrentBlock ? hexToRgba(theme.accent, 0.18) : 'transparent',
                      }}
                    >
                      <span className="truncate pr-1">{b.name}</span>
                      {isCurrentBlock && <Check size={14} style={{ color: theme.accent }} className="shrink-0 ml-auto" />}
                    </button>
                  );
                })}

                {/* Option to move directly to Private Space - only if private space is enabled */}
                {Boolean(privatePin) && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      updateNote(activeNote.id, { isPrivate: true });
                      setBlockSubmenuNoteId(null);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs hover:bg-white/10 active:scale-98 transition text-left cursor-pointer"
                    style={{
                      backgroundColor: activeNote.isPrivate ? hexToRgba(theme.accent, 0.18) : 'transparent',
                    }}
                  >
                    <span className="truncate pr-1">Приватное пространство</span>
                    {activeNote.isPrivate && <Check size={14} style={{ color: theme.accent }} className="shrink-0 ml-auto" />}
                  </button>
                )}
              </div>

              <div className="h-px my-0.5" style={{ backgroundColor: hexToRgba(theme.text, 0.1) }} />

              {/* Create new block button */}
              <button
                onClick={e => {
                  e.stopPropagation();
                  setBlockSubmenuNoteId(null);
                  openCreateBlockModal([activeNote.id]);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold hover:bg-white/10 active:scale-98 transition cursor-pointer text-left w-full"
                style={{ color: theme.accent }}
              >
                <Plus size={14} />
                <span>Создать новый</span>
              </button>
            </div>
          ) : !isTagSubmenuOpen ? (
            /* Main Actions List */
            (() => {
              const currentActions = quickSettings.noteTileActions || ALL_NOTE_TILE_ACTIONS;
              const hasReorder = currentActions.includes('reorder');
              const hasPin = currentActions.includes('pin');
              const hasDuplicate = currentActions.includes('duplicate');
              const hasBlock = currentActions.includes('block');
              const hasTag = currentActions.includes('tag');
              const hasExport = currentActions.includes('export');
              const hasDelete = currentActions.includes('delete');
              const hasAnyBeforeDelete = hasReorder || hasPin || hasDuplicate || hasBlock || hasTag || hasExport;

              return (
                <div className="flex flex-col gap-0.5 text-xs font-bold">
                  {/* Up / Down Reorder in 1 row (2 buttons) at the top */}
                  {hasReorder && (
                    <div className="grid grid-cols-2 gap-1 mb-1">
                      <button
                        disabled={!canMoveUp}
                        onClick={e => {
                          e.stopPropagation();
                          moveNoteInBlock(activeNote.id, 'up');
                        }}
                        className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl transition cursor-pointer text-xs ${
                          !canMoveUp
                            ? 'opacity-30 cursor-not-allowed bg-white/5'
                            : 'hover:bg-white/10 active:scale-95 bg-white/5'
                        }`}
                        title="Переместить вверх"
                      >
                        <ArrowUp size={14} style={{ color: theme.accent }} />
                        <span>Вверх</span>
                      </button>

                      <button
                        disabled={!canMoveDown}
                        onClick={e => {
                          e.stopPropagation();
                          moveNoteInBlock(activeNote.id, 'down');
                        }}
                        className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl transition cursor-pointer text-xs ${
                          !canMoveDown
                            ? 'opacity-30 cursor-not-allowed bg-white/5'
                            : 'hover:bg-white/10 active:scale-95 bg-white/5'
                        }`}
                        title="Переместить вниз"
                      >
                        <ArrowDown size={14} style={{ color: theme.accent }} />
                        <span>Вниз</span>
                      </button>
                    </div>
                  )}

                  {hasPin && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        togglePinNote(activeNote.id);
                        setOpenMenuNoteId(null);
                      }}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/10 active:scale-98 transition cursor-pointer text-left whitespace-nowrap"
                    >
                      <Pin size={14} style={{ color: theme.accent }} className={activeNote.pinned ? 'fill-current' : ''} />
                      <span>{activeNote.pinned ? 'Открепить' : 'Закрепить'}</span>
                    </button>
                  )}

                  {hasDuplicate && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        duplicateNote(activeNote.id);
                        setOpenMenuNoteId(null);
                      }}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/10 active:scale-98 transition cursor-pointer text-left whitespace-nowrap"
                    >
                      <CopyPlus size={14} style={{ color: theme.accent }} />
                      <span>Дублировать</span>
                    </button>
                  )}

                  {/* "В блок" Action */}
                  {hasBlock && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setBlockSubmenuNoteId(activeNote.id);
                        setOpenMenuNoteId(null);
                      }}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/10 active:scale-98 transition cursor-pointer text-left whitespace-nowrap"
                    >
                      <Layers size={14} style={{ color: theme.accent }} />
                      <span>В блок</span>
                    </button>
                  )}

                  {hasTag && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setTagSubmenuNoteId(activeNote.id);
                        setOpenMenuNoteId(null);
                        setTagSearchQuery('');
                        setNewTagName('');
                        setIsCreatingCustomTag(false);
                      }}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/10 active:scale-98 transition cursor-pointer text-left whitespace-nowrap"
                    >
                      <TagIcon size={14} style={{ color: theme.accent }} />
                      <span>Добавить тег</span>
                    </button>
                  )}

                  {hasExport && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setOpenMenuNoteId(null);
                        openExportModal(activeNote.id);
                      }}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/10 active:scale-98 transition cursor-pointer text-left whitespace-nowrap"
                    >
                      <Download size={14} style={{ color: theme.accent }} />
                      <span>Экспорт</span>
                    </button>
                  )}

                  {hasDelete && (
                    <>
                      {hasAnyBeforeDelete && (
                        <div className="h-px my-0.5" style={{ backgroundColor: hexToRgba(theme.text, 0.1) }} />
                      )}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          deleteNote(activeNote.id);
                          setOpenMenuNoteId(null);
                        }}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-red-500/20 active:scale-98 transition cursor-pointer text-left text-red-500 whitespace-nowrap"
                      >
                        <Trash2 size={14} />
                        <span>Корзина</span>
                      </button>
                    </>
                  )}
                </div>
              );
            })()
          ) : (
            /* Tag Submenu */
            <div className="flex flex-col gap-2 text-xs">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: hexToRgba(theme.text, 0.1) }}>
                <div className="flex items-center gap-2 font-extrabold text-xs">
                  <TagIcon size={14} style={{ color: theme.accent }} />
                  <span>Теги заметки</span>
                </div>
                <button
                  onClick={() => {
                    setTagSubmenuNoteId(null);
                    setOpenMenuNoteId(activeNote.id);
                  }}
                  className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-white/10 cursor-pointer"
                  title="Назад"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Search Input (No autoFocus) */}
              <div className="relative my-0.5">
                <input
                  type="text"
                  value={tagSearchQuery}
                  onChange={e => setTagSearchQuery(e.target.value)}
                  placeholder="Поиск тегов..."
                  className="w-full py-1.5 pl-2.5 pr-7 rounded-xl text-xs border outline-none transition"
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

              {/* List of existing tags */}
              <div className="max-h-40 overflow-y-auto space-y-1 pr-0.5">
                {filteredTags.map(tag => {
                  const isAttached = noteTagsLower.includes(tag.name.toLowerCase());
                  return (
                    <button
                      key={tag.id}
                      onClick={e => {
                        e.stopPropagation();
                        toggleNoteTag(activeNote.id, tag.name);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium hover:bg-white/10 transition cursor-pointer text-left"
                      style={{
                        backgroundColor: isAttached ? hexToRgba(tag.color, 0.18) : 'transparent',
                      }}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="truncate">{tag.name}</span>
                      </div>
                      {isAttached && <Check size={14} style={{ color: tag.color }} className="flex-shrink-0" />}
                    </button>
                  );
                })}

                {filteredTags.length === 0 && !isCreatingCustomTag && (
                  <div className="text-center py-3 text-[11px] opacity-50">
                    Теги не найдены
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="h-px my-0.5" style={{ backgroundColor: hexToRgba(theme.text, 0.1) }} />

              {/* Create new tag section */}
              {!isCreatingCustomTag ? (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setIsCreatingCustomTag(true);
                    if (tagSearchQuery.trim()) {
                      setNewTagName(tagSearchQuery.trim());
                    }
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold hover:bg-white/10 active:scale-98 transition cursor-pointer text-left w-full"
                  style={{ color: theme.accent }}
                >
                  <Plus size={14} />
                  <span>Создать новый тег</span>
                </button>
              ) : (
                <div className="space-y-2 pt-0.5">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={e => setNewTagName(e.target.value)}
                    placeholder="Название тега..."
                    className="w-full py-1.5 px-2.5 rounded-xl text-xs border outline-none"
                    style={{
                      backgroundColor: hexToRgba(theme.text, 0.06),
                      borderColor: hexToRgba(theme.text, 0.12),
                      color: theme.text,
                    }}
                  />

                  {/* Color selection palette */}
                  <div className="flex items-center justify-between gap-1 px-0.5">
                    {['#A855F7', '#EC4899', '#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#6366F1'].map(color => (
                      <button
                        key={color}
                        onClick={e => {
                          e.stopPropagation();
                          setNewTagColor(color);
                        }}
                        className={`w-5 h-5 rounded-full transition cursor-pointer flex items-center justify-center ${
                          newTagColor === color ? 'ring-2 ring-offset-1 scale-110' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (newTagName.trim()) {
                          createTag(newTagName.trim(), newTagColor);
                          toggleNoteTag(activeNote.id, newTagName.trim());
                          setNewTagName('');
                          setIsCreatingCustomTag(false);
                        }
                      }}
                      disabled={!newTagName.trim()}
                      className="flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-40"
                      style={{
                        backgroundColor: theme.accent,
                        color: '#FFFFFF',
                      }}
                    >
                      Добавить
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setIsCreatingCustomTag(false);
                      }}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-medium hover:bg-white/10 transition cursor-pointer"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderNoteCard = (note: Note) => {
    const displayMode = quickSettings.tileDisplayMode || 'both';
    const plainContent = stripHtmlTags(note.content) || 'Пустая заметка';
    const titleText = note.title?.trim() || 'Без названия';
    const hideDots = !!quickSettings.hideTileDots;
    const semanticScore = semanticScoresMap.get(note.id);

    // Mode 2: Title only — compact card, title and 3-dots on the same level/row, zero wasted space
    if (displayMode === 'title') {
      return (
        <div
          key={note.id}
          onPointerDown={() => handlePointerDown(note.id)}
          onPointerUp={() => handlePointerUpOrLeave(note.id)}
          onPointerLeave={() => handlePointerUpOrLeave(note.id)}
          onContextMenu={e => handleContextMenu(e, note.id)}
          onClick={() => {
            if (isLongPressRef.current) {
              isLongPressRef.current = false;
              return;
            }
            handleOpenNote(note.id);
          }}
          className="group relative p-3.5 sm:p-4 rounded-2xl border shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          style={{
            backgroundColor: cardBg,
            borderColor: quickSettings.showBorder ? cardBorder : 'transparent',
          }}
        >
          {Boolean(quickSettings.showTileMetadata) && (
            <div className="text-[9px] sm:text-[10px] font-medium opacity-50 mb-1.5 flex items-center justify-between gap-1">
              <span>{formatDate(note.updatedAt)}</span>
              {semanticScore !== undefined && (
                <span
                  className="px-1.5 py-0.5 rounded-md text-[9px] font-bold flex items-center gap-0.5"
                  style={{
                    backgroundColor: hexToRgba(theme.accent, 0.18),
                    color: theme.accent,
                  }}
                >
                  <Sparkles size={9} />
                  <span>{Math.round(semanticScore * 100)}%</span>
                </span>
              )}
            </div>
          )}

          <div className="flex items-start justify-between gap-2.5">
            <h3
              className="text-sm sm:text-base font-bold group-hover:underline line-clamp-2 leading-snug flex-1 pt-0.5"
              style={{ fontFamily: note.titleFont ? getFontFamilyStyle(note.titleFont) : undefined }}
            >
              {titleText}
            </h3>
            {!hideDots && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  setTagSubmenuNoteId(null);
                  setBlockSubmenuNoteId(null);
                  setOpenMenuNoteId(openMenuNoteId === note.id ? null : note.id);
                }}
                className="p-1 -mr-1 rounded-lg opacity-60 hover:opacity-100 transition cursor-pointer shrink-0"
                style={{ color: theme.text }}
                title="Действия"
              >
                <MoreHorizontal size={18} />
              </button>
            )}
          </div>
        </div>
      );
    }

    // Mode 1: Title + Content — balanced padding, accommodates more text (3-4 lines), compact bottom gap
    if (displayMode === 'both') {
      return (
        <div
          key={note.id}
          onPointerDown={() => handlePointerDown(note.id)}
          onPointerUp={() => handlePointerUpOrLeave(note.id)}
          onPointerLeave={() => handlePointerUpOrLeave(note.id)}
          onContextMenu={e => handleContextMenu(e, note.id)}
          onClick={() => {
            if (isLongPressRef.current) {
              isLongPressRef.current = false;
              return;
            }
            handleOpenNote(note.id);
          }}
          className="group relative p-3.5 sm:p-4 rounded-2xl border shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          style={{
            backgroundColor: cardBg,
            borderColor: quickSettings.showBorder ? cardBorder : 'transparent',
          }}
        >
          <div className="flex-1">
            <div className="flex items-center justify-between gap-1 mb-1.5">
              {Boolean(quickSettings.showTileMetadata) ? (
                <div className="text-[9px] sm:text-[10px] font-medium opacity-50">
                  {formatDate(note.updatedAt)}
                </div>
              ) : <div />}
              {semanticScore !== undefined && (
                <span
                  className="px-1.5 py-0.5 rounded-md text-[9px] font-bold flex items-center gap-0.5 shrink-0"
                  style={{
                    backgroundColor: hexToRgba(theme.accent, 0.18),
                    color: theme.accent,
                  }}
                >
                  <Sparkles size={9} />
                  <span>По смыслу {Math.round(semanticScore * 100)}%</span>
                </span>
              )}
            </div>
            <h3
              className="text-xs sm:text-sm font-bold mb-1 group-hover:underline line-clamp-1 pt-0.5"
              style={{ fontFamily: note.titleFont ? getFontFamilyStyle(note.titleFont) : undefined }}
            >
              {titleText}
            </h3>
            <p className="text-[11px] sm:text-xs opacity-70 line-clamp-3 sm:line-clamp-4 leading-snug sm:leading-relaxed">
              {plainContent}
            </p>
          </div>

          {!hideDots && (
            <div className="flex items-center justify-end mt-1.5 sm:mt-2 relative">
              <button
                onClick={e => {
                  e.stopPropagation();
                  setTagSubmenuNoteId(null);
                  setBlockSubmenuNoteId(null);
                  setOpenMenuNoteId(openMenuNoteId === note.id ? null : note.id);
                }}
                className="p-1 -mr-1 rounded-lg opacity-60 hover:opacity-100 transition cursor-pointer"
                style={{ color: theme.text }}
                title="Действия"
              >
                <MoreHorizontal size={18} />
              </button>
            </div>
          )}
        </div>
      );
    }

    // Mode 3: Content only — preserved exactly as requested
    return (
      <div
        key={note.id}
        onPointerDown={() => handlePointerDown(note.id)}
        onPointerUp={() => handlePointerUpOrLeave(note.id)}
        onPointerLeave={() => handlePointerUpOrLeave(note.id)}
        onContextMenu={e => handleContextMenu(e, note.id)}
        onClick={() => {
          if (isLongPressRef.current) {
            isLongPressRef.current = false;
            return;
          }
          handleOpenNote(note.id);
        }}
        className="group relative p-3 sm:p-5 rounded-2xl border shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between min-h-[100px] sm:min-h-[120px]"
        style={{
          backgroundColor: cardBg,
          borderColor: quickSettings.showBorder ? cardBorder : 'transparent',
        }}
      >
        <div className="flex-1">
          <div className="flex items-center justify-between gap-1 mb-1 sm:mb-1.5">
            {Boolean(quickSettings.showTileMetadata) ? (
              <div className="text-[9px] sm:text-[10px] font-medium opacity-50">
                {formatDate(note.updatedAt)}
              </div>
            ) : <div />}
            {semanticScore !== undefined && (
              <span
                className="px-1.5 py-0.5 rounded-md text-[9px] font-bold flex items-center gap-0.5 shrink-0"
                style={{
                  backgroundColor: hexToRgba(theme.accent, 0.18),
                  color: theme.accent,
                }}
              >
                <Sparkles size={9} />
                <span>{Math.round(semanticScore * 100)}%</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm opacity-80 line-clamp-4 sm:line-clamp-6 leading-snug sm:leading-relaxed">
            {plainContent}
          </p>
        </div>

        {!hideDots && (
          <div className="flex items-center justify-end mt-2.5 sm:mt-4 relative">
            <button
              onClick={e => {
                e.stopPropagation();
                setTagSubmenuNoteId(null);
                setBlockSubmenuNoteId(null);
                setOpenMenuNoteId(openMenuNoteId === note.id ? null : note.id);
              }}
              className="p-1 -mr-1 rounded-lg opacity-60 hover:opacity-100 transition cursor-pointer"
              style={{ color: theme.text }}
              title="Действия"
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={mainContainerRef}
      onScroll={e => {
        if (!isHorizontal) {
          savedMainScrollTop = e.currentTarget.scrollTop;
        }
      }}
      className={`flex-1 flex flex-col h-full relative select-none ${
        isHorizontal
          ? 'overflow-hidden px-4 md:px-10 pt-4 pb-20'
          : 'overflow-y-auto px-6 md:px-12 pt-6 pb-28'
      }`}
      onClick={() => setActiveBlockHeaderMenuId(null)}
    >
      {/* Toast Notification */}
      {copiedNotice && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-black/80 backdrop-blur-md text-white text-xs font-bold shadow-2xl flex items-center gap-2 animate-bounce">
          <Check size={14} className="text-green-400" />
          <span>{copiedNotice}</span>
        </div>
      )}

      {/* Centered Top Heading */}
      <div className={`w-full text-center shrink-0 ${isHorizontal ? 'mb-3 pt-1' : 'mb-6 pt-2'}`}>
        <h1 className={`${isHorizontal ? 'text-2xl md:text-3xl' : 'text-3xl md:text-4xl'} font-extrabold tracking-tight inline-block`}>
          {t('notes')}
        </h1>
      </div>

      {/* Pinned Search Bar (if enabled in settings) */}
      {quickSettings.pinSearchToHomeScreen && (
        <PinnedSearchBar />
      )}

      {/* Active Search & Tag Filter Banners */}
      {(selectedTagFilter || (!quickSettings.pinSearchToHomeScreen && searchQuery.trim())) && (
        <div className="flex flex-wrap items-center gap-2 mb-4 shrink-0 animate-fadeIn">
          <span className="text-xs opacity-60">Фильтр:</span>
          {!quickSettings.pinSearchToHomeScreen && searchQuery.trim() && (
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold"
              style={{
                backgroundColor: hexToRgba(theme.accent, 0.2),
                color: theme.accent,
              }}
            >
              <Search size={12} />
              <span>
                «{searchQuery}» ({searchTarget === 'title' ? 'Название' : searchTarget === 'content' ? 'Текст' : 'Все'})
              </span>
              <button
                onClick={() => setSearchQuery('')}
                className="hover:opacity-75 cursor-pointer ml-0.5"
                title="Очистить поиск"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Semantic Search Mode / Manual Trigger Button */}
          {searchQuery.trim() && semanticSearchSettings.enabled && (
            <button
              type="button"
              onClick={() => {
                if (semanticSearchSettings.triggerMode === 'manual') {
                  setIsSemanticSearchActive(!isSemanticSearchActive);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
                isSemanticEffectiveActive
                  ? 'shadow-xs cursor-pointer'
                  : 'opacity-70 hover:opacity-100 cursor-pointer'
              }`}
              style={{
                backgroundColor: isSemanticEffectiveActive
                  ? hexToRgba(theme.accent, 0.25)
                  : hexToRgba(theme.text, 0.05),
                borderColor: isSemanticEffectiveActive
                  ? theme.accent
                  : hexToRgba(theme.text, 0.15),
                color: isSemanticEffectiveActive ? theme.accent : theme.text,
              }}
              title={
                semanticSearchSettings.triggerMode === 'manual'
                  ? isSemanticSearchActive
                    ? 'Семантический поиск активен (нажмите, чтобы отключить для экономии батареи)'
                    : 'Включить локальный семантический поиск по смыслу'
                  : 'Семантический поиск работает автоматически'
              }
            >
              {isSemanticSearching ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <FileSearch size={12} style={{ color: theme.accent }} />
              )}
              <span>
                {isSemanticEffectiveActive
                  ? semanticMatches.length > 0
                    ? `По смыслу (${semanticMatches.length})`
                    : 'Поиск по смыслу...'
                  : 'Искать по смыслу'}
              </span>
            </button>
          )}
          {selectedTagFilter && (
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold"
              style={{
                backgroundColor: hexToRgba(theme.accent, 0.2),
                color: theme.accent,
              }}
            >
              <span>#{selectedTagFilter}</span>
              <button
                onClick={() => setSelectedTagFilter(null)}
                className="hover:opacity-75 cursor-pointer"
                title="Сбросить тег"
              >
                <X size={13} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Dynamic Blocks Rendering */}
      <div className="flex-1 flex flex-col min-h-0">
        {filteredNotes.length === 0 ? (
        <div className="text-center py-16 opacity-50">
          <p className="text-sm font-medium">
            {searchQuery.trim()
              ? `По запросу «${searchQuery}» ничего не найдено`
              : selectedTagFilter
              ? 'Заметки с этим тегом не найдены'
              : t('noNotesYet')}
          </p>
        </div>
      ) : isHorizontal ? (
        /* HORIZONTAL LAYOUT: Blocks arranged horizontally (columns side by side), notes scroll full height */
        <div
          ref={horizontalContainerRef}
          onScroll={e => {
            savedHorizontalScrollLeft = e.currentTarget.scrollLeft;
          }}
          className="flex-1 flex flex-row overflow-x-auto overflow-y-hidden gap-4 sm:gap-6 items-stretch pb-2"
        >
          {blocks.map((block, blockIndex) => {
            const blockNotes = getNotesForBlock(block, filteredNotes);
            if (blockNotes.length === 0) return null;

            const isMenuOpen = activeBlockHeaderMenuId === block.id;

            return (
              <div
                key={block.id}
                className="w-[280px] sm:w-[320px] md:w-[360px] shrink-0 flex flex-col h-full rounded-3xl p-3.5 sm:p-4 border shadow-xs"
                style={{
                  backgroundColor: isLight ? '#FFFFFF' : hexToRgba(theme.text, 0.03),
                  borderColor: hexToRgba(theme.text, 0.1),
                }}
              >
                {/* Block Header with Actions */}
                <div className="flex items-center justify-between pb-1.5 shrink-0 relative">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-semibold tracking-wider opacity-60 flex items-center gap-1.5">
                      <span>{block.name}</span>
                      <span className="text-[11px] font-normal opacity-60 ml-0.5">{blockNotes.length}</span>
                    </h2>
                  </div>

                  {/* 3-dots Menu trigger for block */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveBlockHeaderMenuId(isMenuOpen ? null : block.id);
                      }}
                      className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-white/10 transition cursor-pointer"
                      style={{ color: theme.text }}
                      title="Опции блока"
                    >
                      <MoreHorizontal size={15} />
                    </button>

                    {/* Block Action Menu Popover */}
                    {isMenuOpen && (
                      <div
                        className="absolute right-0 top-full mt-1 w-48 p-1.5 rounded-2xl border shadow-2xl backdrop-blur-2xl z-40 flex flex-col gap-0.5 text-xs font-bold animate-fadeIn"
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
                            setActiveBlockHeaderMenuId(null);
                          }}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition text-left cursor-pointer ${
                            blockIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10 active:scale-98'
                          }`}
                        >
                          <ArrowLeft size={13} style={{ color: theme.accent }} />
                          <span>Переместить влево</span>
                        </button>

                        <button
                          disabled={blockIndex === blocks.length - 1}
                          onClick={() => {
                            moveBlock(block.id, 'down');
                            setActiveBlockHeaderMenuId(null);
                          }}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition text-left cursor-pointer ${
                            blockIndex === blocks.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10 active:scale-98'
                          }`}
                        >
                          <ArrowRight size={13} style={{ color: theme.accent }} />
                          <span>Переместить вправо</span>
                        </button>

                        {block.type === 'custom' && (
                          <>
                            <button
                              onClick={() => {
                                openCreateBlockModal([], block);
                                setActiveBlockHeaderMenuId(null);
                              }}
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 active:scale-98 transition text-left cursor-pointer"
                            >
                              <Edit2 size={13} style={{ color: theme.accent }} />
                              <span>Переименовать</span>
                            </button>

                            <div className="h-px my-0.5" style={{ backgroundColor: hexToRgba(theme.text, 0.1) }} />

                            <button
                              onClick={() => {
                                openDeleteBlockModal(block);
                                setActiveBlockHeaderMenuId(null);
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

                {/* Notes in this block column (scrolling full column height) */}
                <div
                  id={`notes-block-col-${block.id}`}
                  onScroll={e => {
                    savedColumnScrollTops[block.id] = e.currentTarget.scrollTop;
                  }}
                  className="flex-1 overflow-y-auto space-y-3 pr-1 pt-3 pb-8"
                >
                  {blockNotes.map(note => renderNoteCard(note))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VERTICAL LAYOUT (Standard) */
        <div className="space-y-8">
          {blocks.map((block, blockIndex) => {
            const blockNotes = getNotesForBlock(block, filteredNotes);
            if (blockNotes.length === 0) return null;

            const isMenuOpen = activeBlockHeaderMenuId === block.id;

            return (
              <div key={block.id} className="space-y-3">
                {/* Block Header with Actions */}
                <div className="flex items-center justify-between relative">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-semibold tracking-wider opacity-60 flex items-center gap-1.5">
                      <span>{block.name}</span>
                      <span className="text-[10px] opacity-75 font-bold ml-0.5">{blockNotes.length}</span>
                    </h2>
                  </div>

                  {/* 3-dots Menu trigger for block in NotesListView */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveBlockHeaderMenuId(isMenuOpen ? null : block.id);
                      }}
                      className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-white/10 transition cursor-pointer"
                      style={{ color: theme.text }}
                      title="Опции блока"
                    >
                      <MoreHorizontal size={15} />
                    </button>

                    {/* Block Action Menu Popover */}
                    {isMenuOpen && (
                      <div
                        className="absolute right-0 top-full mt-1 w-48 p-1.5 rounded-2xl border shadow-2xl backdrop-blur-2xl z-40 flex flex-col gap-0.5 text-xs font-bold animate-fadeIn"
                        style={{
                          backgroundColor: isLight ? 'rgba(255, 255, 255, 0.95)' : hexToRgba(theme.bg, 0.95),
                          borderColor: hexToRgba(theme.text, 0.15),
                          color: theme.text,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          disabled={blockIndex === 0}
                          onClick={() => {
                            moveBlock(block.id, 'up');
                            setActiveBlockHeaderMenuId(null);
                          }}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition text-left cursor-pointer ${
                            blockIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10 active:scale-98'
                          }`}
                        >
                          <ArrowUp size={13} style={{ color: theme.accent }} />
                          <span>Переместить вверх</span>
                        </button>

                        <button
                          disabled={blockIndex === blocks.length - 1}
                          onClick={() => {
                            moveBlock(block.id, 'down');
                            setActiveBlockHeaderMenuId(null);
                          }}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition text-left cursor-pointer ${
                            blockIndex === blocks.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10 active:scale-98'
                          }`}
                        >
                          <ArrowDown size={13} style={{ color: theme.accent }} />
                          <span>Переместить вниз</span>
                        </button>

                        {block.type === 'custom' && (
                          <>
                            <button
                              onClick={() => {
                                openCreateBlockModal([], block);
                                setActiveBlockHeaderMenuId(null);
                              }}
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 active:scale-98 transition text-left cursor-pointer"
                            >
                              <Edit2 size={13} style={{ color: theme.accent }} />
                              <span>Переименовать</span>
                            </button>

                            <div className="h-px my-0.5" style={{ backgroundColor: hexToRgba(theme.text, 0.1) }} />

                            <button
                              onClick={() => {
                                openDeleteBlockModal(block);
                                setActiveBlockHeaderMenuId(null);
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

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
                  {blockNotes.map(note => renderNoteCard(note))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* Action Modal (Centered, safely bounded inside viewport) */}
      {renderNoteActionModal()}

      {/* Floating Bottom Center Create Button */}
      {!sidebarOpen && !isTagSearchOpen && (
        <FloatingCreateBar
          onCreate={() => createNote()}
          label={t('create')}
          currentView="notes"
        />
      )}

      {isPinModalOpen && (
        <PinModal
          target="private"
          mode="set"
          onClose={() => {
            setIsPinModalOpen(false);
            setTargetPrivateNoteId(null);
          }}
          onSuccess={() => {
            setIsPinModalOpen(false);
            if (targetPrivateNoteId) {
              updateNote(targetPrivateNoteId, { isPrivate: true });
              setTargetPrivateNoteId(null);
            }
          }}
        />
      )}
    </div>
  );
};

