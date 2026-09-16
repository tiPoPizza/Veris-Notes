import React from 'react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../i18n';
import { TaskList } from '../types';
import {
  CheckSquare,
  Square,
  Trash2,
  Edit2,
  Trophy,
  Heart,
  Tag as TagIcon,
  X,
  Search,
} from 'lucide-react';
import { hexToRgba, isLightColor } from '../themes';
import { PinnedSearchBar } from './PinnedSearchBar';

export const TasksView: React.FC = () => {
  const {
    taskLists,
    tags,
    priorities,
    selectedTagFilter,
    setSelectedTagFilter,
    taskSortOrder,
    searchQuery,
    setSearchQuery,
    searchTarget,
    toggleTaskItem,
    deleteTaskItem,
    deleteTaskList,
    openCreateTaskListModal,
    openEditTaskListModal,
    sidebarOpen,
    isTagSearchOpen,
    theme,
    language,
    quickSettings,
  } = useApp();

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

  const cardBg = isLight ? '#FFFFFF' : hexToRgba(theme.text, 0.05);
  const cardBorder = hexToRgba(theme.text, 0.12);
  const isHorizontal = !!quickSettings.horizontalMainMenu;

  // Filter task lists by active tag and search query
  const filteredTaskLists = taskLists.filter(list => {
    const matchesTag =
      !selectedTagFilter ||
      (list.tags || []).some(t => t.toLowerCase() === selectedTagFilter.toLowerCase());
    if (!matchesTag) return false;

    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase().trim();
    const titleMatch = (list.title || '').toLowerCase().includes(q);
    const itemsMatch = list.items.some(i => (i.text || '').toLowerCase().includes(q));

    if (searchTarget === 'title') {
      return titleMatch;
    }
    if (searchTarget === 'content') {
      return itemsMatch;
    }
    // searchTarget === 'all'
    return titleMatch || itemsMatch;
  });

  const getPriorityWeight = (list: TaskList): number => {
    if (!list.priority) return 9999;
    if (typeof list.priority.level === 'number') return list.priority.level;
    const match = priorities.find(
      p => p.id === list.priority?.id || p.name.toLowerCase() === list.priority?.name.toLowerCase()
    );
    if (match && typeof match.level === 'number') return match.level;
    const idx = priorities.findIndex(
      p => p.id === list.priority?.id || p.name.toLowerCase() === list.priority?.name.toLowerCase()
    );
    return idx !== -1 ? idx + 1 : 999;
  };

  const getPriorityInfoForList = (list: TaskList) => {
    if (list.priority && list.priority.name) {
      const level = list.priority.level ?? getPriorityWeight(list);
      return {
        id: list.priority.id || list.priority.name,
        name: list.priority.name,
        color: list.priority.color || '#EF4444',
        level,
        weight: level,
      };
    }
    if (list.badgeText) {
      const matched = priorities.find(p => p.name.toLowerCase() === list.badgeText?.toLowerCase());
      if (matched) {
        return {
          id: matched.id,
          name: matched.name,
          color: matched.color,
          level: matched.level || 1,
          weight: matched.level || 1,
        };
      }
    }
    return {
      id: 'no_priority',
      name: language === 'en' ? 'No Priority' : 'Без важности',
      color: hexToRgba(theme.text, 0.4),
      level: 9999,
      weight: 9999,
    };
  };

  const getStartOfDayTimestamp = (timestamp: number) => {
    const d = new Date(timestamp || Date.now());
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };

  const getDayLabel = (timestamp: number) => {
    const target = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();

    if (targetDay === today) {
      return language === 'en' ? 'Today' : 'Сегодня';
    }
    if (targetDay === yesterday) {
      return language === 'en' ? 'Yesterday' : 'Вчера';
    }

    const monthsRu = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    const monthsEn = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const months = language === 'en' ? monthsEn : monthsRu;
    const isCurrentYear = target.getFullYear() === now.getFullYear();

    if (language === 'en') {
      return isCurrentYear
        ? `${months[target.getMonth()]} ${target.getDate()}`
        : `${months[target.getMonth()]} ${target.getDate()}, ${target.getFullYear()}`;
    } else {
      return isCurrentYear
        ? `${target.getDate()} ${months[target.getMonth()]}`
        : `${target.getDate()} ${months[target.getMonth()]} ${target.getFullYear()}`;
    }
  };

  // Standard vertical sorted list
  const sortedTaskLists = [...filteredTaskLists].sort((a, b) => {
    if (taskSortOrder === 'newest') {
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    }
    if (taskSortOrder === 'oldest') {
      return (a.updatedAt || 0) - (b.updatedAt || 0);
    }
    if (taskSortOrder === 'most_important') {
      const weightA = getPriorityWeight(a);
      const weightB = getPriorityWeight(b);
      if (weightA !== weightB) {
        return weightA - weightB;
      }
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    }
    if (taskSortOrder === 'least_important') {
      const weightA = getPriorityWeight(a);
      const weightB = getPriorityWeight(b);
      if (weightA !== weightB) {
        return weightB - weightA;
      }
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    }
    return 0;
  });

  // Grouping for Horizontal Main Screen
  interface TaskGroupColumn {
    id: string;
    name: string;
    badge?: {
      text: string;
      color: string;
      level?: number;
    };
    lists: TaskList[];
    sortKey: number;
  }

  const horizontalColumns: TaskGroupColumn[] = React.useMemo(() => {
    if (!isHorizontal || filteredTaskLists.length === 0) return [];

    if (taskSortOrder === 'most_important' || taskSortOrder === 'least_important') {
      // Group by priority
      const groupMap = new Map<string, TaskGroupColumn>();

      filteredTaskLists.forEach(list => {
        const info = getPriorityInfoForList(list);
        if (!groupMap.has(info.id)) {
          groupMap.set(info.id, {
            id: info.id,
            name: info.name,
            badge:
              info.id !== 'no_priority'
                ? {
                    text: String(info.level),
                    color: info.color,
                    level: info.level,
                  }
                : undefined,
            lists: [],
            sortKey: info.weight,
          });
        }
        groupMap.get(info.id)!.lists.push(list);
      });

      const cols = Array.from(groupMap.values());

      // Sort tasks within each column: "В 1 столбике выше будут более новые группы"
      cols.forEach(col => {
        col.lists.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      });

      // Sort columns left to right:
      if (taskSortOrder === 'most_important') {
        // "более высокий приоритет — слева, низкий — справа" (1, 2, 3... 9999)
        cols.sort((a, b) => a.sortKey - b.sortKey);
      } else {
        // "Низкий — слева, высокий — справа" (9999... 3, 2, 1)
        cols.sort((a, b) => b.sortKey - a.sortKey);
      }

      return cols;
    } else {
      // Group by day for 'newest' and 'oldest'
      const groupMap = new Map<number, TaskGroupColumn>();

      filteredTaskLists.forEach(list => {
        const dayTime = getStartOfDayTimestamp(list.updatedAt || 0);
        if (!groupMap.has(dayTime)) {
          groupMap.set(dayTime, {
            id: String(dayTime),
            name: getDayLabel(dayTime),
            lists: [],
            sortKey: dayTime,
          });
        }
        groupMap.get(dayTime)!.lists.push(list);
      });

      const cols = Array.from(groupMap.values());

      if (taskSortOrder === 'newest') {
        // "Сегодняшние — слева. Более поздние - справа. В 1 столбике выше будут более новые группы"
        cols.sort((a, b) => b.sortKey - a.sortKey);
        cols.forEach(col => {
          col.lists.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        });
      } else {
        // 'oldest': "Самые поздние (старые) — слева. Сегодняшние — справа. В 1 столбике выше будут более старые группы"
        cols.sort((a, b) => a.sortKey - b.sortKey);
        cols.forEach(col => {
          col.lists.sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
        });
      }

      return cols;
    }
  }, [isHorizontal, filteredTaskLists, taskSortOrder, priorities, language, theme.text]);

  const renderTaskCard = (list: TaskList) => {
    const completedCount = list.items.filter(i => i.completed).length;
    const totalCount = list.items.length;
    const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const allCompleted = totalCount > 0 && completedCount === totalCount;

    // Determine priority to display (custom/base priority object or legacy badgeText)
    const priorityToDisplay = list.priority?.name
      ? list.priority
      : list.badgeText && list.badgeText !== `${pct}%`
      ? {
          name: list.badgeText,
          color:
            list.badgeColor === 'red'
              ? '#EF4444'
              : list.badgeColor === 'green'
              ? '#22C55E'
              : list.badgeColor === 'gold'
              ? '#EAB308'
              : list.badgeColor === 'blue'
              ? '#3B82F6'
              : list.badgeColor === 'purple'
              ? '#A855F7'
              : hexToRgba(theme.text, 0.4),
        }
      : null;

    return (
      <div
        key={list.id}
        className="p-5 rounded-2xl border shadow-xs transition-all flex flex-col justify-between"
        style={{
          backgroundColor: cardBg,
          borderColor: quickSettings.showBorder ? cardBorder : 'transparent',
        }}
      >
        {/* Top Title & Badges */}
        <div>
          <div className="flex items-start justify-between gap-2.5 mb-2">
            <div
              className="flex items-start gap-2 flex-1 min-w-0 cursor-pointer group"
              onClick={() => openEditTaskListModal(list.id)}
            >
              <div className="mt-0.5 shrink-0">
                {allCompleted ? (
                  <Heart size={18} style={{ color: theme.accent }} />
                ) : (
                  <CheckSquare size={18} style={{ color: theme.accent }} />
                )}
              </div>
              <h3
                className={`text-base sm:text-lg font-bold break-words line-clamp-2 leading-snug group-hover:underline ${
                  allCompleted ? 'line-through opacity-60' : ''
                }`}
                title={list.title}
              >
                {list.title || 'Без названия'}
              </h3>
            </div>

            {/* Importance badge is displayed LEFT of the percentage, neatly positioned without overflowing */}
            <div className="flex items-center gap-1.5 shrink-0 pt-0.5 max-w-[50%] flex-wrap justify-end">
              {priorityToDisplay && (
                <span
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 max-w-[120px] truncate"
                  style={{
                    backgroundColor: priorityToDisplay.color || '#EF4444',
                    color: '#FFFFFF',
                  }}
                  title={priorityToDisplay.name}
                >
                  {priorityToDisplay.name}
                </span>
              )}
              <span
                className="px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0"
                style={{
                  backgroundColor: hexToRgba(theme.text, 0.1),
                  color: theme.text,
                }}
              >
                {pct}%
              </span>
            </div>
          </div>

          <div className="text-[11px] opacity-60 font-medium mb-3">
            {totalCount} {totalCount === 1 ? 'задача' : 'задачи'} · {completedCount} выполнено
          </div>

          {/* Progress bar */}
          <div
            className="w-full h-1 rounded-full overflow-hidden mb-3"
            style={{ backgroundColor: hexToRgba(theme.text, 0.1) }}
          >
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${pct}%`,
                backgroundColor: theme.accent,
              }}
            />
          </div>

          {Boolean(quickSettings.showTileMetadata) && (
            <div className="text-[10px] opacity-40 font-medium mb-4">
              {formatDate(list.updatedAt)}
            </div>
          )}

          {/* Task Items List with horizontal scroll for long names without truncation dots */}
          {list.items.length > 0 && (
            <div className="space-y-1.5 mb-2 max-h-60 overflow-y-auto pr-1">
              {list.items.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-xl transition gap-2"
                  style={{ backgroundColor: hexToRgba(theme.text, 0.04) }}
                >
                  <button
                    type="button"
                    onClick={() => toggleTaskItem(list.id, item.id)}
                    className="shrink-0 cursor-pointer p-0.5"
                  >
                    {item.completed ? (
                      <CheckSquare size={16} style={{ color: theme.accent }} />
                    ) : (
                      <Square size={16} className="opacity-40" />
                    )}
                  </button>

                  <div
                    className="flex-1 min-w-0 overflow-x-auto scrollbar-none py-0.5 cursor-pointer touch-pan-x"
                    onClick={() => toggleTaskItem(list.id, item.id)}
                  >
                    <span
                      className={`text-xs whitespace-nowrap inline-block font-medium select-none ${
                        item.completed ? 'line-through opacity-50' : 'opacity-90'
                      }`}
                    >
                      {item.text}
                    </span>
                  </div>

                  <button
                    onClick={() => deleteTaskItem(list.id, item.id)}
                    className="p-1 rounded-md opacity-40 hover:opacity-100 hover:text-red-500 transition cursor-pointer shrink-0"
                    title="Удалить"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card Footer Buttons: Trash on the left, Edit on the right (without dividing border line) */}
        <div className="flex items-center justify-between pt-2 text-xs font-medium">
          {/* Left Side: Trash Button */}
          <button
            onClick={() => deleteTaskList(list.id)}
            className="p-2 rounded-xl hover:bg-red-500/15 text-red-500 hover:text-red-400 transition cursor-pointer"
            title={t('delete')}
          >
            <Trash2 size={14} />
          </button>

          {/* Right Side: Edit Button */}
          <button
            onClick={() => openEditTaskListModal(list.id)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border hover:opacity-80 transition cursor-pointer"
            style={{
              backgroundColor: hexToRgba(theme.text, 0.05),
              borderColor: quickSettings.showBorder ? cardBorder : 'transparent',
            }}
          >
            <Edit2 size={12} />
            <span>{t('edit')}</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`flex-1 flex flex-col h-full relative select-none ${
        isHorizontal
          ? 'overflow-hidden px-4 md:px-10 pt-4 pb-20'
          : 'overflow-y-auto px-6 md:px-12 pt-6 pb-28'
      }`}
    >
      {/* Centered Top Heading */}
      <div className={`w-full text-center shrink-0 ${isHorizontal ? 'mb-3 pt-1' : 'mb-6 pt-2'}`}>
        <h1
          className={`${
            isHorizontal ? 'text-2xl md:text-3xl' : 'text-3xl md:text-4xl'
          } font-extrabold tracking-tight inline-block`}
        >
          {t('tasks')}
        </h1>
      </div>

      {/* Pinned Search Bar (if enabled in settings) */}
      {quickSettings.pinSearchToHomeScreen && (
        <PinnedSearchBar isTasksMode />
      )}

      {/* Active Search & Tag Filter Indicators */}
      {(selectedTagFilter || (!quickSettings.pinSearchToHomeScreen && searchQuery.trim())) && (
        <div className={`w-full flex flex-wrap items-center justify-center gap-2 shrink-0 ${isHorizontal ? 'mb-3' : 'mb-6'} animate-in fade-in duration-150`}>
          {!quickSettings.pinSearchToHomeScreen && searchQuery.trim() && (
            <div
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-bold shadow-xs backdrop-blur-md"
              style={{
                backgroundColor: hexToRgba(theme.accent, 0.15),
                borderColor: hexToRgba(theme.accent, 0.35),
                color: theme.accent,
              }}
            >
              <Search size={12} />
              <span>
                «{searchQuery}» ({searchTarget === 'title' ? 'Название' : searchTarget === 'content' ? 'Задачи' : 'Все'})
              </span>
              <button
                onClick={() => setSearchQuery('')}
                className="opacity-70 hover:opacity-100 hover:scale-110 transition cursor-pointer p-0.5 ml-0.5"
                title="Очистить поиск"
              >
                <X size={13} />
              </button>
            </div>
          )}
          {selectedTagFilter && (
            <div
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-bold shadow-xs backdrop-blur-md"
              style={{
                backgroundColor: hexToRgba(theme.accent, 0.15),
                borderColor: hexToRgba(theme.accent, 0.35),
                color: theme.accent,
              }}
            >
              <TagIcon size={12} />
              <span>#{selectedTagFilter}</span>
              <button
                onClick={() => setSelectedTagFilter(null)}
                className="opacity-70 hover:opacity-100 hover:scale-110 transition cursor-pointer p-0.5"
                title="Сбросить фильтр"
              >
                <X size={13} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Task Content: Empty State / Horizontal Layout / Vertical Grid Layout */}
      <div className="flex-1 flex flex-col min-h-0">
        {filteredTaskLists.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-70 space-y-3">
          <Trophy size={48} className="stroke-[1.6]" style={{ color: theme.text }} />
          <p className="text-sm font-semibold tracking-tight text-center">
            {searchQuery.trim()
              ? `По запросу «${searchQuery}» ничего не найдено`
              : selectedTagFilter
              ? `Нет групп задач с тегом #${selectedTagFilter}`
              : t('noTasksYet')}
          </p>
          {(selectedTagFilter || searchQuery.trim()) && (
            <button
              onClick={() => {
                setSelectedTagFilter(null);
                setSearchQuery('');
              }}
              className="px-4 py-1.5 rounded-xl border text-xs font-bold hover:opacity-80 transition cursor-pointer"
              style={{
                backgroundColor: hexToRgba(theme.accent, 0.15),
                borderColor: theme.accent,
                color: theme.accent,
              }}
            >
              Сбросить фильтры
            </button>
          )}
        </div>
      ) : isHorizontal ? (
        /* HORIZONTAL LAYOUT: Columns side by side, cards scroll within each column */
        <div className="flex-1 flex flex-row overflow-x-auto overflow-y-hidden gap-4 sm:gap-6 items-stretch pb-2">
          {horizontalColumns.map(col => {
            if (col.lists.length === 0) return null;

            return (
              <div
                key={col.id}
                className="w-[280px] sm:w-[320px] md:w-[360px] shrink-0 flex flex-col h-full rounded-3xl p-3.5 sm:p-4 border shadow-xs"
                style={{
                  backgroundColor: isLight ? '#FFFFFF' : hexToRgba(theme.text, 0.03),
                  borderColor: hexToRgba(theme.text, 0.1),
                }}
              >
                {/* Column Header */}
                <div
                  className="flex items-center justify-between pb-2.5 border-b shrink-0 relative"
                  style={{ borderColor: hexToRgba(theme.text, 0.08) }}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    {col.badge && (
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-mono font-black shrink-0"
                        style={{
                          backgroundColor: hexToRgba(col.badge.color, 0.2),
                          color: col.badge.color,
                        }}
                      >
                        {col.badge.level ?? col.badge.text}
                      </span>
                    )}
                    <h2
                      className="text-xs font-bold uppercase tracking-wider truncate"
                      style={{ color: theme.text }}
                    >
                      {col.name}
                    </h2>
                    <span className="text-[11px] font-semibold opacity-50 ml-0.5 shrink-0">
                      {col.lists.length}
                    </span>
                  </div>
                </div>

                {/* Cards List in Column */}
                <div className="flex-1 overflow-y-auto space-y-4 pt-3 pr-1">
                  {col.lists.map(list => renderTaskCard(list))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VERTICAL GRID LAYOUT */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedTaskLists.map(list => renderTaskCard(list))}
        </div>
      )}
      </div>

      {/* Floating Bottom Center Create Button */}
      {!sidebarOpen && !isTagSearchOpen && (
        <div className="fixed bottom-6 inset-x-0 z-30 pointer-events-none flex justify-center px-4">
          <button
            onClick={() => openCreateTaskListModal()}
            className="pointer-events-auto flex items-center justify-center px-6 py-3 rounded-2xl text-xs font-extrabold shadow-xl backdrop-blur-xl border hover:opacity-80 active:scale-95 transition cursor-pointer"
            style={{
              backgroundColor: hexToRgba(theme.text, 0.08),
              borderColor: quickSettings.showBorder ? theme.accent : 'transparent',
              color: theme.text,
            }}
          >
            <span>{t('createList')}</span>
          </button>
        </div>
      )}
    </div>
  );
};
