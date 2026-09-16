import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../i18n';
import {
  Search,
  X,
  Tag as TagIcon,
  Check,
  Trash2,
  ArrowUpDown,
  FileSearch,
  Sparkles,
  History,
  AlertCircle,
  ArrowDown,
  Plus,
  Edit2,
} from 'lucide-react';
import { hexToRgba, isLightColor } from '../themes';
import { TaskSortOrder, Tag } from '../types';
import { ColorSelectGroup } from './ColorSelectGroup';
import { stripHtmlTags } from '../utils/textUtils';

export const TagSearchModal: React.FC = () => {
  const {
    isTagSearchOpen,
    setIsTagSearchOpen,
    tags,
    createTag,
    updateTag,
    notes,
    taskLists,
    viewMode,
    previousViewMode,
    selectedTagFilter,
    setSelectedTagFilter,
    taskSortOrder,
    setTaskSortOrder,
    searchQuery,
    setSearchQuery,
    searchTarget,
    setSearchTarget,
    semanticSearchSettings,
    isSemanticSearchActive,
    setIsSemanticSearchActive,
    deleteTagByName,
    theme,
    language,
    setViewMode,
    quickSettings,
  } = useApp();

  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [tagNameInput, setTagNameInput] = useState('');
  const [tagColorInput, setTagColorInput] = useState('#3B82F6');
  const [tagFilterQuery, setTagFilterQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  if (!isTagSearchOpen) return null;

  const t = (key: string) => getTranslation(language, key);
  const isLight = isLightColor(theme.bg);
  const isTasksMode = viewMode === 'tasks';
  const isPinnedOnHome = !!quickSettings.pinSearchToHomeScreen;

  // Collect unique tag names from default tags, notes and task lists
  const collectedTagNames = new Set<string>();
  notes.forEach(n => {
    (n.tags || []).forEach(t => collectedTagNames.add(t));
  });
  taskLists.forEach(tl => {
    (tl.tags || []).forEach(t => collectedTagNames.add(t));
  });

  const allTagList = [...tags];
  collectedTagNames.forEach(tagName => {
    if (!allTagList.some(t => t.name.toLowerCase() === tagName.toLowerCase())) {
      allTagList.push({
        id: `tag-${tagName}`,
        name: tagName,
        color: theme.accent,
      });
    }
  });

  const filteredTags = allTagList.filter(tag =>
    tag.name.toLowerCase().includes(tagFilterQuery.toLowerCase())
  );

  const sortOptions: {
    id: TaskSortOrder;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  }[] = [
    { id: 'newest', label: 'Новые', icon: Sparkles },
    { id: 'oldest', label: 'Старые', icon: History },
    { id: 'most_important', label: 'Более важные', icon: AlertCircle },
    { id: 'least_important', label: 'Менее важные', icon: ArrowDown },
  ];

  // Calculate matching items count live
  const targetNotes = viewMode === 'private' ? notes.filter(n => n.isPrivate) : notes.filter(n => !n.isPrivate);
  const matchingNotesCount = targetNotes.filter(n => {
    const matchesTag = viewMode === 'private' || !selectedTagFilter || (n.tags || []).includes(selectedTagFilter);
    if (!matchesTag) return false;
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase().trim();
    const titleMatch = (n.title || '').toLowerCase().includes(q);
    const contentMatch = stripHtmlTags(n.content || '').toLowerCase().includes(q);

    if (searchTarget === 'title') return titleMatch;
    if (searchTarget === 'content') return contentMatch;
    return titleMatch || contentMatch;
  }).length;

  const matchingTasksCount = taskLists.filter(list => {
    const matchesTag =
      !selectedTagFilter ||
      (list.tags || []).some(t => t.toLowerCase() === selectedTagFilter.toLowerCase());
    if (!matchesTag) return false;
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase().trim();
    const titleMatch = (list.title || '').toLowerCase().includes(q);
    const itemsMatch = list.items.some(i => (i.text || '').toLowerCase().includes(q));

    if (searchTarget === 'title') return titleMatch;
    if (searchTarget === 'content') return itemsMatch;
    return titleMatch || itemsMatch;
  }).length;

  const handleStartCreateTag = () => {
    setIsCreatingTag(true);
    setEditingTagId(null);
    setTagNameInput('');
    setTagColorInput(theme.accent || '#3B82F6');
  };

  const handleStartEditTag = (tag: Tag) => {
    setIsCreatingTag(true);
    setEditingTagId(tag.id);
    setTagNameInput(tag.name);
    setTagColorInput(tag.color || theme.accent);
  };

  const handleSaveTag = () => {
    const trimmed = tagNameInput.trim();
    if (!trimmed) return;

    if (editingTagId) {
      updateTag(editingTagId, {
        name: trimmed,
        color: tagColorInput,
      });
      if (selectedTagFilter) {
        const oldTag = allTagList.find(t => t.id === editingTagId);
        if (oldTag && oldTag.name.toLowerCase() === selectedTagFilter.toLowerCase()) {
          setSelectedTagFilter(trimmed);
        }
      }
    } else {
      createTag(trimmed, tagColorInput);
    }
    setTagNameInput('');
    setIsCreatingTag(false);
    setEditingTagId(null);
  };

  // Search and Tags Card
  const cardBg = isLight ? '#FFFFFF' : theme.bg;

  const renderSearchAndTagsCard = () => (
    <div
      className="w-full rounded-2xl p-3.5 sm:p-4 shadow-xl border transition-all space-y-3 shrink-0 overflow-hidden"
      style={{
        backgroundColor: cardBg,
        color: theme.text,
        borderColor: hexToRgba(theme.text, 0.15),
        boxShadow: isLight ? '0 10px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04)' : '0 20px 25px -5px rgba(0,0,0,0.4)',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* If Search Bar is NOT pinned on home screen, show search inputs in this modal */}
      {!isPinnedOnHome && (
        <>
          {/* Search Input */}
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isTasksMode ? 'Поиск задач...' : 'Поиск заметок...'}
              className="w-full py-2 pl-8.5 pr-8 rounded-xl text-xs font-medium border outline-hidden transition"
              style={{
                backgroundColor: hexToRgba(theme.text, 0.06),
                borderColor: hexToRgba(theme.text, 0.14),
                color: theme.text,
              }}
            />
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none opacity-50">
              <Search size={14} style={{ color: theme.accent }} />
            </div>
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg opacity-60 hover:opacity-100 cursor-pointer flex items-center justify-center transition"
                title="Очистить"
              >
                <X size={13} />
              </button>
            ) : null}
          </div>

          {/* Target Filter Segmented Buttons - Clean transparent container */}
          <div className="flex items-center gap-1.5 w-full">
            <div
              className="grid grid-cols-3 gap-1.5 p-1 rounded-xl border flex-1"
              style={{
                backgroundColor: 'transparent',
                borderColor: hexToRgba(theme.text, 0.08),
              }}
            >
              <button
                type="button"
                onClick={() => setSearchTarget('all')}
                className={`py-1.5 px-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer select-none truncate min-w-0 border ${
                  searchTarget === 'all'
                    ? 'border-solid shadow-xs'
                    : 'border-transparent opacity-65 hover:opacity-100'
                }`}
                style={{
                  borderColor: searchTarget === 'all' ? theme.accent : 'transparent',
                  backgroundColor:
                    searchTarget === 'all'
                      ? hexToRgba(theme.accent, isLight ? 0.14 : 0.18)
                      : 'transparent',
                  color: searchTarget === 'all' ? theme.accent : theme.text,
                }}
                title={isTasksMode ? 'По названию группы и тексту задач' : 'По названию и тексту'}
              >
                Все
              </button>

              <button
                type="button"
                onClick={() => setSearchTarget('title')}
                className={`py-1.5 px-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer select-none truncate min-w-0 border ${
                  searchTarget === 'title'
                    ? 'border-solid shadow-xs'
                    : 'border-transparent opacity-65 hover:opacity-100'
                }`}
                style={{
                  borderColor: searchTarget === 'title' ? theme.accent : 'transparent',
                  backgroundColor:
                    searchTarget === 'title'
                      ? hexToRgba(theme.accent, isLight ? 0.14 : 0.18)
                      : 'transparent',
                  color: searchTarget === 'title' ? theme.accent : theme.text,
                }}
                title={isTasksMode ? 'По названию группы' : 'Только по названию'}
              >
                Название
              </button>

              <button
                type="button"
                onClick={() => setSearchTarget('content')}
                className={`py-1.5 px-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer select-none truncate min-w-0 border ${
                  searchTarget === 'content'
                    ? 'border-solid shadow-xs'
                    : 'border-transparent opacity-65 hover:opacity-100'
                }`}
                style={{
                  borderColor: searchTarget === 'content' ? theme.accent : 'transparent',
                  backgroundColor:
                    searchTarget === 'content'
                      ? hexToRgba(theme.accent, isLight ? 0.14 : 0.18)
                      : 'transparent',
                  color: searchTarget === 'content' ? theme.accent : theme.text,
                }}
                title={isTasksMode ? 'По тексту задач' : 'Только по тексту заметки'}
              >
                {isTasksMode ? 'Задачи' : 'Текст'}
              </button>
            </div>

            {!isTasksMode && semanticSearchSettings.enabled && (
              <button
                type="button"
                onClick={() => {
                  if (semanticSearchSettings.triggerMode === 'manual') {
                    setIsSemanticSearchActive(!isSemanticSearchActive);
                  }
                }}
                className={`p-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1 shrink-0 ${
                  semanticSearchSettings.triggerMode === 'auto' || isSemanticSearchActive
                    ? 'shadow-xs cursor-pointer'
                    : 'opacity-65 hover:opacity-100 cursor-pointer'
                }`}
                style={{
                  backgroundColor:
                    semanticSearchSettings.triggerMode === 'auto' || isSemanticSearchActive
                      ? hexToRgba(theme.accent, 0.2)
                      : hexToRgba(theme.text, 0.03),
                  borderColor:
                    semanticSearchSettings.triggerMode === 'auto' || isSemanticSearchActive
                      ? theme.accent
                      : hexToRgba(theme.text, 0.08),
                  color:
                    semanticSearchSettings.triggerMode === 'auto' || isSemanticSearchActive
                      ? theme.accent
                      : theme.text,
                }}
                title={
                  semanticSearchSettings.triggerMode === 'manual'
                    ? isSemanticSearchActive
                    ? 'Семантический поиск активен (нажмите для выключения)'
                    : 'Включить поиск по смыслу'
                  : 'Семантический поиск работает автоматически'
                }
              >
                <FileSearch size={14} style={{ color: theme.accent }} />
                <span className="text-[11px] font-mono hidden sm:inline">Смысл</span>
              </button>
            )}
          </div>

          {/* Live search match counter */}
          {searchQuery.trim().length > 0 && (
            <div className="flex items-center justify-between text-[11px] font-semibold px-1 opacity-75">
              <span>Результаты:</span>
              <span
                className="px-2 py-0.5 rounded-md font-bold text-[10px]"
                style={{
                  backgroundColor: hexToRgba(theme.accent, 0.15),
                  color: theme.accent,
                }}
              >
                {isTasksMode
                  ? matchingTasksCount > 0
                    ? `Найдено: ${matchingTasksCount}`
                    : 'Ничего не найдено'
                  : matchingNotesCount > 0
                  ? `Найдено: ${matchingNotesCount}`
                  : 'Ничего не найдено'}
              </span>
            </div>
          )}
        </>
      )}

      {/* Tags Section Header (Hidden in Private Mode) */}
      {viewMode !== 'private' && (
        <div className="pt-0.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold opacity-75">
              <span>Теги</span>
            </span>

            {!isCreatingTag && (
              <button
                type="button"
                onClick={handleStartCreateTag}
                className="p-1 rounded-lg border flex items-center justify-center opacity-65 hover:opacity-100 transition cursor-pointer"
                style={{
                  backgroundColor: hexToRgba(theme.text, 0.04),
                  borderColor: hexToRgba(theme.text, 0.12),
                  color: theme.text,
                }}
                title="Создать новый тег"
              >
                <Plus size={13} />
              </button>
            )}
          </div>

          {/* Tag Creator / Editor Form */}
          {isCreatingTag && (
            <div
              className="p-2.5 mb-2.5 rounded-xl border space-y-2 animate-in fade-in duration-150"
              style={{
                backgroundColor: hexToRgba(theme.text, 0.04),
                borderColor: hexToRgba(theme.text, 0.15),
              }}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span>
                  {editingTagId ? 'Настройка тега' : 'Новый тег'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingTag(false);
                    setEditingTagId(null);
                  }}
                  className="opacity-60 hover:opacity-100 p-0.5 cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>

              <input
                type="text"
                value={tagNameInput}
                onChange={e => setTagNameInput(e.target.value)}
                placeholder="Название тега..."
                className="w-full px-2.5 py-1 rounded-lg text-xs font-semibold border outline-hidden"
                style={{
                  backgroundColor: hexToRgba(theme.text, 0.06),
                  borderColor: hexToRgba(theme.text, 0.12),
                  color: theme.text,
                }}
                autoFocus
              />

              <ColorSelectGroup
                selectedColor={tagColorInput}
                onChange={setTagColorInput}
                theme={theme}
                label="Цвет тега"
              />

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingTag(false);
                    setEditingTagId(null);
                  }}
                  className="px-2 py-0.5 rounded-lg text-xs opacity-70 hover:opacity-100 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSaveTag}
                  disabled={!tagNameInput.trim()}
                  className="px-2.5 py-0.5 rounded-lg text-xs font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs active:scale-95 border"
                  style={{
                    borderColor: tagColorInput,
                    backgroundColor: hexToRgba(tagColorInput, 0.2),
                    color: tagColorInput,
                  }}
                >
                  {editingTagId ? 'Сохранить' : 'Добавить'}
                </button>
              </div>
            </div>
          )}

          {/* Tag List */}
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {selectedTagFilter && (
              <button
                onClick={() => {
                  setSelectedTagFilter(null);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium hover:opacity-90 transition mb-1 border cursor-pointer"
                style={{
                  backgroundColor: hexToRgba(theme.accent, 0.15),
                  borderColor: hexToRgba(theme.accent, 0.3),
                  color: theme.accent,
                }}
              >
                <span>Сбросить тег #{selectedTagFilter}</span>
                <X size={13} />
              </button>
            )}

            {filteredTags.map(tag => {
              const isSelected = selectedTagFilter === tag.name;
              return (
                <div
                  key={tag.id}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer group border ${
                    isSelected ? 'shadow-xs' : 'hover:opacity-90'
                  }`}
                  style={{
                    backgroundColor: isSelected
                      ? hexToRgba(tag.color, 0.22)
                      : hexToRgba(theme.text, 0.04),
                    borderColor: isSelected ? tag.color : hexToRgba(theme.text, 0.08),
                    color: theme.text,
                  }}
                >
                  {/* Tag select and name */}
                  <div
                    className="flex items-center gap-2 truncate pr-1 flex-1 cursor-pointer"
                    onClick={() => {
                      setSelectedTagFilter(isSelected ? null : tag.name);
                      if (viewMode === 'notes' || viewMode === 'editor') {
                        setViewMode('notes');
                      } else if (viewMode !== 'tasks') {
                        setViewMode(previousViewMode === 'tasks' ? 'tasks' : 'notes');
                      }
                    }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className={`truncate ${isSelected ? 'font-bold' : ''}`}>{tag.name}</span>
                    {isSelected && (
                      <Check size={12} style={{ color: tag.color }} className="shrink-0" />
                    )}

                    {/* Pencil right next to name */}
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleStartEditTag(tag);
                      }}
                      title={`Настроить цвет «${tag.name}»`}
                      className="p-0.5 rounded-md opacity-40 group-hover:opacity-80 hover:!opacity-100 hover:bg-black/10 transition cursor-pointer shrink-0"
                      style={{ color: tag.color }}
                    >
                      <Edit2 size={11} />
                    </button>
                  </div>

                  {/* Delete button on the right */}
                  <div className="flex items-center shrink-0">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        deleteTagByName(tag.name);
                        if (selectedTagFilter?.toLowerCase() === tag.name.toLowerCase()) {
                          setSelectedTagFilter(null);
                        }
                      }}
                      title="Удалить тег"
                      className="p-1 rounded-md opacity-40 group-hover:opacity-70 hover:!opacity-100 hover:bg-red-500/20 hover:text-red-400 transition cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredTags.length === 0 && (
              <div className="text-center py-3 text-xs opacity-50">Теги не найдены</div>
            )}
          </div>
        </div>
      )}

      {/* Global Clear All Filters if active */}
      {(searchQuery.trim() || selectedTagFilter) && (
        <button
          type="button"
          onClick={() => {
            setSearchQuery('');
            setSelectedTagFilter(null);
          }}
          className="w-full py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center justify-center gap-1.5 hover:opacity-80"
          style={{
            backgroundColor: hexToRgba(theme.text, 0.05),
            borderColor: hexToRgba(theme.text, 0.12),
            color: theme.text,
          }}
        >
          <X size={12} />
          <span>Сбросить все фильтры</span>
        </button>
      )}
    </div>
  );

  // Task Sorting / Display Filter Options Card - Outline style only
  const renderTaskSortCard = () => (
    <div
      className="w-full rounded-2xl p-3.5 sm:p-4 shadow-xl border transition-all space-y-2.5 shrink-0 overflow-hidden"
      style={{
        backgroundColor: cardBg,
        color: theme.text,
        borderColor: hexToRgba(theme.text, 0.15),
        boxShadow: isLight ? '0 10px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04)' : '0 20px 25px -5px rgba(0,0,0,0.4)',
      }}
      onClick={e => e.stopPropagation()}
    >
      <div className="text-xs font-bold uppercase tracking-wider opacity-60 flex items-center justify-between">
        <span>Отображать сначала задачи</span>
        <ArrowUpDown size={13} style={{ color: theme.accent }} />
      </div>

      <div className="space-y-1.5">
        {sortOptions.map(opt => {
          const isSelected = taskSortOrder === opt.id;
          const IconComponent = opt.icon;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                setTaskSortOrder(opt.id);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer text-left border ${
                isSelected ? 'shadow-xs' : 'hover:opacity-90'
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
                <IconComponent
                  size={14}
                  style={{ color: isSelected ? theme.accent : hexToRgba(theme.text, 0.5) }}
                />
                <span className={isSelected ? 'font-bold' : 'font-normal'}>{opt.label}</span>
              </div>
              {isSelected && <Check size={13} style={{ color: theme.accent }} />}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end p-3 sm:p-6 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.25)' }}
      onClick={e => {
        if (e.target === e.currentTarget) {
          setIsTagSearchOpen(false);
        }
      }}
    >
      <div
        className={`flex flex-col gap-2.5 w-full max-w-xs sm:w-80 transition-transform duration-200 ease-out max-h-[calc(100vh-3rem)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          isSearchFocused ? '-translate-y-16 sm:translate-y-0' : 'translate-y-0'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Search & Tags Card */}
        {renderSearchAndTagsCard()}

        {/* In Tasks View: Sort/Filter Menu is rendered BELOW search + tags */}
        {isTasksMode && renderTaskSortCard()}
      </div>
    </div>
  );
};
