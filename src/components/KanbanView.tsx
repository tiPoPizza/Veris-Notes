import React, { useState, useMemo } from 'react';
import { useApp, KANBAN_COLORS } from '../context/AppContext';
import {
  Plus,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Calendar as CalendarIcon,
  CheckSquare,
  Flag,
  Layers,
  Check,
} from 'lucide-react';
import { hexToRgba, isLightColor } from '../themes';
import { KanbanCard, KanbanColumn } from '../types';

export const KanbanView: React.FC = () => {
  const {
    theme,
    quickSettings,
    sidebarOpen,
    kanbanColumns,
    kanbanCards,
    openCreateKanbanCardModal,
    openEditKanbanCardModal,
    openQuickViewKanbanCardModal,
    openCreateKanbanColumnModal,
    deleteKanbanColumn,
    moveKanbanColumn,
    reorderKanbanColumns,
    createKanbanCard,
    deleteKanbanCard,
    moveKanbanCard,
  } = useApp();

  // Layout mode is directly controlled by quickSettings.horizontalMainMenu
  const isHorizontal = !!quickSettings.horizontalMainMenu;

  // Drag and drop states
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [dragOverCardIndex, setDragOverCardIndex] = useState<number | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dragOverColTargetId, setDragOverColTargetId] = useState<string | null>(null);

  // Quick inline card creation state per column
  const [inlineCreateColId, setInlineCreateColId] = useState<string | null>(null);
  const [inlineCardTitle, setInlineCardTitle] = useState('');

  // Column Menu Popover state
  const [activeColumnMenuId, setActiveColumnMenuId] = useState<string | null>(null);

  // Card Move Dropdown state
  const [moveMenuCardId, setMoveMenuCardId] = useState<string | null>(null);

  const isLight = isLightColor(theme.bg);
  const cardBg = hexToRgba(theme.text, 0.04);
  const cardBorder = hexToRgba(theme.text, 0.12);

  // Sorted Columns
  const sortedColumns = useMemo(() => {
    return [...kanbanColumns].sort((a, b) => a.order - b.order);
  }, [kanbanColumns]);

  // Handle Inline Add Card
  const handleInlineAddCard = (columnId: string) => {
    const trimmed = inlineCardTitle.trim();
    if (!trimmed) {
      setInlineCreateColId(null);
      return;
    }
    const targetCol = kanbanColumns.find(c => c.id === columnId);
    createKanbanCard(columnId, {
      title: trimmed,
      color: targetCol?.color || '#93C5FD',
    });
    setInlineCardTitle('');
    setInlineCreateColId(null);
  };

  // Card Drag Events
  const handleCardDragStart = (e: React.DragEvent, cardId: string) => {
    e.stopPropagation();
    setDraggedCardId(cardId);
    e.dataTransfer.setData('text/plain', cardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCardDragOver = (e: React.DragEvent, columnId: string, cardIndex?: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedCardId) {
      setDragOverColumnId(columnId);
      if (typeof cardIndex === 'number') {
        setDragOverCardIndex(cardIndex);
      }
    }
  };

  const handleCardDrop = (e: React.DragEvent, targetColumnId: string, dropIndex?: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedCardId) return;

    moveKanbanCard(draggedCardId, targetColumnId, dropIndex);
    setDraggedCardId(null);
    setDragOverColumnId(null);
    setDragOverCardIndex(null);
  };

  // Column Drag Events
  const handleColumnDragStart = (e: React.DragEvent, colId: string) => {
    setDraggedColumnId(colId);
    e.dataTransfer.setData('text/column', colId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColumnDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (draggedColumnId && draggedColumnId !== colId) {
      setDragOverColTargetId(colId);
    }
  };

  const handleColumnDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    if (!draggedColumnId || draggedColumnId === targetColId) {
      setDraggedColumnId(null);
      setDragOverColTargetId(null);
      return;
    }

    const currentOrder = sortedColumns.map(c => c.id);
    const sourceIdx = currentOrder.indexOf(draggedColumnId);
    const targetIdx = currentOrder.indexOf(targetColId);

    if (sourceIdx !== -1 && targetIdx !== -1) {
      currentOrder.splice(sourceIdx, 1);
      currentOrder.splice(targetIdx, 0, draggedColumnId);
      reorderKanbanColumns(currentOrder);
    }

    setDraggedColumnId(null);
    setDragOverColTargetId(null);
  };

  // Fast Move to Next/Prev column
  const handleMoveCardToAdjacentColumn = (card: KanbanCard, direction: 'prev' | 'next') => {
    const colIndex = sortedColumns.findIndex(c => c.id === card.columnId);
    if (colIndex === -1) return;
    const nextColIndex = direction === 'next' ? colIndex + 1 : colIndex - 1;
    if (nextColIndex >= 0 && nextColIndex < sortedColumns.length) {
      moveKanbanCard(card.id, sortedColumns[nextColIndex].id);
    }
  };

  // Render single card
  const renderKanbanCard = (
    card: KanbanCard,
    column: KanbanColumn,
    cardIndex: number,
    colIdx: number
  ) => {
    const isCardDragged = draggedCardId === card.id;
    const completedItems = (card.checklist || []).filter(i => i.completed).length;
    const totalItems = (card.checklist || []).length;
    const isOverdue =
      card.dueDate && new Date(card.dueDate).getTime() < new Date().setHours(0, 0, 0, 0);
    const isMoveMenuOpen = moveMenuCardId === card.id;

    return (
      <div
        key={card.id}
        id={`kanban-card-${card.id}`}
        draggable
        onDragStart={e => handleCardDragStart(e, card.id)}
        onDragOver={e => handleCardDragOver(e, column.id, cardIndex)}
        onDrop={e => handleCardDrop(e, column.id, cardIndex)}
        onClick={() => openQuickViewKanbanCardModal(card)}
        className={`p-3.5 rounded-2xl border transition-all cursor-pointer group hover:scale-[1.01] active:scale-[0.99] space-y-2 relative ${
          isCardDragged ? 'opacity-40 border-dashed scale-95' : 'hover:shadow-md'
        }`}
        style={{
          backgroundColor: hexToRgba(card.color || column.color, 0.08),
          borderColor: hexToRgba(card.color || column.color, 0.35),
        }}
      >
        {/* Priority Flag, Tags & Quick Move Controls */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {card.priority && (
              <span
                className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shrink-0"
                style={{
                  backgroundColor: hexToRgba(card.priority.color, 0.15),
                  color: card.priority.color,
                }}
              >
                <Flag size={10} />
                <span>{card.priority.name}</span>
              </span>
            )}

            {card.tags.map(tag => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold opacity-70 truncate max-w-[100px]"
                style={{
                  backgroundColor: hexToRgba(theme.text, 0.06),
                  color: theme.text,
                }}
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Quick Direct Move Controls */}
          <div className="flex items-center gap-1 shrink-0 relative ml-auto">
            {/* Fast Move to Prev Column Arrow */}
            {colIdx > 0 && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  handleMoveCardToAdjacentColumn(card, 'prev');
                }}
                className="p-1.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition cursor-pointer opacity-70 hover:opacity-100"
                title={`Переместить в «${sortedColumns[colIdx - 1].title}»`}
              >
                {isHorizontal ? <ChevronLeft size={16} /> : <ChevronUp size={16} />}
              </button>
            )}

            {/* Quick Column Picker Dropdown */}
            <div className="relative">
              <button
                onClick={e => {
                  e.stopPropagation();
                  setMoveMenuCardId(isMoveMenuOpen ? null : card.id);
                }}
                className="p-1.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition cursor-pointer opacity-70 hover:opacity-100"
                title="Переместить в блок..."
              >
                <Layers size={16} />
              </button>

              {isMoveMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-1 w-48 p-1.5 rounded-2xl border shadow-2xl backdrop-blur-2xl z-50 flex flex-col gap-0.5 text-xs font-bold animate-fadeIn"
                  style={{
                    backgroundColor: isLight ? '#FFFFFF' : hexToRgba(theme.bg, 0.98),
                    borderColor: hexToRgba(theme.text, 0.15),
                    color: theme.text,
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="px-2 py-1 text-[10px] font-bold opacity-50 uppercase tracking-wider">
                    Переместить в:
                  </div>
                  {sortedColumns.map(targetCol => {
                    const isCurrent = targetCol.id === card.columnId;
                    return (
                      <button
                        key={targetCol.id}
                        onClick={() => {
                          if (!isCurrent) {
                            moveKanbanCard(card.id, targetCol.id);
                          }
                          setMoveMenuCardId(null);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition cursor-pointer text-left ${
                          isCurrent
                            ? 'opacity-50 cursor-default bg-black/5 dark:bg-white/5 font-extrabold'
                            : 'hover:bg-black/5 dark:hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-1">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: targetCol.color }}
                          />
                          <span className="truncate">{targetCol.title}</span>
                        </div>
                        {isCurrent && <Check size={14} style={{ color: theme.accent }} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Fast Move to Next Column Arrow */}
            {colIdx < sortedColumns.length - 1 && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  handleMoveCardToAdjacentColumn(card, 'next');
                }}
                className="p-1.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition cursor-pointer opacity-70 hover:opacity-100"
                title={`Переместить в «${sortedColumns[colIdx + 1].title}»`}
              >
                {isHorizontal ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              </button>
            )}
          </div>
        </div>

        {/* Card Title */}
        <h4 className="font-extrabold text-sm sm:text-base leading-snug break-words" style={{ color: theme.text }}>
          {card.title}
        </h4>

        {/* Description Preview */}
        {card.description && (
          <p className="text-xs opacity-65 line-clamp-3 leading-relaxed font-normal">
            {card.description}
          </p>
        )}

        {/* Date & Checklist Indicator */}
        {(card.dueDate || card.dueTime || totalItems > 0) && (
          <div className="flex items-center gap-2 pt-0.5 text-xs font-semibold opacity-80 flex-wrap">
            {(card.dueDate || card.dueTime) && (
              <span
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md ${
                  isOverdue ? 'bg-red-500/15 text-red-500 font-bold' : 'bg-black/5 dark:bg-white/5'
                }`}
              >
                <CalendarIcon size={12} />
                <span>
                  {card.dueDate ? card.dueDate : ''}
                  {card.dueDate && card.dueTime ? ` • ${card.dueTime}` : card.dueTime || ''}
                </span>
              </span>
            )}

            {totalItems > 0 && (
              <span
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md ${
                  completedItems === totalItems
                    ? 'bg-emerald-500/15 text-emerald-500 font-bold'
                    : 'bg-black/5 dark:bg-white/5'
                }`}
              >
                <CheckSquare size={12} />
                <span>
                  {completedItems}/{totalItems}
                </span>
              </span>
            )}
          </div>
        )}

        {/* Bottom Controls: Left Trash, Right Edit */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={e => {
              e.stopPropagation();
              deleteKanbanCard(card.id);
            }}
            className="p-1.5 rounded-xl hover:bg-red-500/15 text-red-400 hover:text-red-500 transition cursor-pointer opacity-70 hover:opacity-100"
            title="Удалить задачу"
          >
            <Trash2 size={15} />
          </button>

          <button
            onClick={e => {
              e.stopPropagation();
              openEditKanbanCardModal(card);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer hover:opacity-100 opacity-80 hover:bg-black/5 dark:hover:bg-white/10"
            style={{
              borderColor: hexToRgba(theme.text, 0.12),
              color: theme.text,
            }}
            title="Редактировать задачу"
          >
            <Edit2 size={12} style={{ color: theme.accent }} />
            <span>Редактировать</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      id="kanban-view-container"
      className={`flex-1 flex flex-col h-full relative select-none ${
        isHorizontal
          ? 'overflow-hidden px-4 md:px-10 pt-4 pb-20'
          : 'overflow-y-auto px-6 md:px-12 pt-6 pb-28'
      }`}
      style={{ backgroundColor: theme.bg, color: theme.text }}
      onClick={() => {
        if (activeColumnMenuId) setActiveColumnMenuId(null);
        if (moveMenuCardId) setMoveMenuCardId(null);
      }}
    >
      {/* Centered Top Heading */}
      <div className={`w-full text-center shrink-0 ${isHorizontal ? 'mb-3 pt-1' : 'mb-6 pt-2'}`}>
        <h1
          className={`${
            isHorizontal ? 'text-2xl md:text-3xl' : 'text-3xl md:text-4xl'
          } font-extrabold tracking-tight inline-block`}
        >
          Канбан
        </h1>
      </div>

      {/* Main Board Container */}
      {isHorizontal ? (
        /* HORIZONTAL LAYOUT: Columns side by side, cards scroll within each column */
        <div className="flex-1 flex flex-row overflow-x-auto overflow-y-hidden gap-4 sm:gap-6 items-stretch pb-2">
          {sortedColumns.map((column, colIdx) => {
            const columnCards = kanbanCards
              .filter(c => c.columnId === column.id)
              .sort((a, b) => a.order - b.order);

            const isColumnDragTarget = dragOverColTargetId === column.id;
            const isColumnCardDropTarget = dragOverColumnId === column.id && draggedCardId !== null;
            const isMenuOpen = activeColumnMenuId === column.id;

            return (
              <div
                key={column.id}
                id={`kanban-column-${column.id}`}
                draggable
                onDragStart={e => handleColumnDragStart(e, column.id)}
                onDragOver={e => handleColumnDragOver(e, column.id)}
                onDrop={e => handleColumnDrop(e, column.id)}
                className={`w-[280px] sm:w-[320px] md:w-[360px] shrink-0 flex flex-col h-full rounded-3xl p-3.5 sm:p-4 border shadow-xs transition-all ${
                  isColumnDragTarget ? 'opacity-50 scale-98 border-dashed' : ''
                } ${isColumnCardDropTarget ? 'ring-2 ring-opacity-60' : ''}`}
                style={{
                  backgroundColor: isLight ? '#FFFFFF' : hexToRgba(theme.text, 0.03),
                  borderColor: isColumnCardDropTarget ? column.color : hexToRgba(theme.text, 0.1),
                }}
              >
                {/* Column Header */}
                <div
                  className="flex items-center justify-between pb-2.5 border-b shrink-0 relative"
                  style={{ borderColor: hexToRgba(theme.text, 0.08) }}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: column.color }}
                    />
                    <h2 className="text-xs font-bold uppercase tracking-wider opacity-80 truncate" style={{ color: theme.text }}>
                      {column.title}
                    </h2>
                    <span className="text-[11px] font-semibold opacity-50 ml-0.5 shrink-0">
                      {columnCards.length}
                    </span>
                  </div>

                  {/* 3-dots Menu trigger for column */}
                  <div className="relative shrink-0">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setActiveColumnMenuId(isMenuOpen ? null : column.id);
                      }}
                      className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
                      title="Опции колонки"
                    >
                      <MoreHorizontal size={15} />
                    </button>

                    {/* Popover Menu */}
                    {isMenuOpen && (
                      <div
                        className="absolute right-0 top-full mt-1.5 w-48 p-1.5 rounded-2xl border shadow-2xl backdrop-blur-2xl z-50 flex flex-col gap-0.5 text-xs font-bold animate-fadeIn"
                        style={{
                          backgroundColor: isLight ? '#FFFFFF' : hexToRgba(theme.bg, 0.98),
                          borderColor: hexToRgba(theme.text, 0.15),
                          color: theme.text,
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            openCreateKanbanColumnModal(column);
                            setActiveColumnMenuId(null);
                          }}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition text-left cursor-pointer"
                        >
                          <Edit2 size={13} style={{ color: theme.accent }} />
                          <span>Редактировать</span>
                        </button>

                        <button
                          disabled={colIdx === 0}
                          onClick={() => {
                            moveKanbanColumn(column.id, 'left');
                            setActiveColumnMenuId(null);
                          }}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition text-left cursor-pointer ${
                            colIdx === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/5 dark:hover:bg-white/10'
                          }`}
                        >
                          <ArrowLeft size={13} />
                          <span>Влево</span>
                        </button>

                        <button
                          disabled={colIdx === sortedColumns.length - 1}
                          onClick={() => {
                            moveKanbanColumn(column.id, 'right');
                            setActiveColumnMenuId(null);
                          }}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition text-left cursor-pointer ${
                            colIdx === sortedColumns.length - 1
                              ? 'opacity-30 cursor-not-allowed'
                              : 'hover:bg-black/5 dark:hover:bg-white/10'
                          }`}
                        >
                          <ArrowRight size={13} />
                          <span>Вправо</span>
                        </button>

                        <div className="h-px my-1" style={{ backgroundColor: hexToRgba(theme.text, 0.1) }} />

                        <button
                          onClick={() => {
                            deleteKanbanColumn(column.id);
                            setActiveColumnMenuId(null);
                          }}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-red-500/10 text-red-500 transition text-left cursor-pointer"
                        >
                          <Trash2 size={13} />
                          <span>Удалить колонку</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Column Cards (Scrolling full column height) */}
                <div
                  onDragOver={e => handleCardDragOver(e, column.id)}
                  onDrop={e => handleCardDrop(e, column.id)}
                  className="flex-1 overflow-y-auto space-y-3 pt-3 pr-1 pb-6"
                >
                  {/* Inline Card Creation Input */}
                  {inlineCreateColId === column.id && (
                    <div
                      className="p-3 rounded-2xl border shadow-sm animate-fadeIn space-y-2"
                      style={{
                        backgroundColor: hexToRgba(theme.text, 0.05),
                        borderColor: column.color,
                      }}
                    >
                      <input
                        type="text"
                        value={inlineCardTitle}
                        onChange={e => setInlineCardTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleInlineAddCard(column.id);
                          if (e.key === 'Escape') setInlineCreateColId(null);
                        }}
                        placeholder="Название задачи..."
                        autoFocus
                        className="w-full bg-transparent text-xs font-semibold outline-none"
                        style={{ color: theme.text }}
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setInlineCreateColId(null)}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold opacity-60 hover:opacity-100 transition cursor-pointer"
                        >
                          Отмена
                        </button>
                        <button
                          onClick={() => handleInlineAddCard(column.id)}
                          disabled={!inlineCardTitle.trim()}
                          className="px-3 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer shadow-xs disabled:opacity-40"
                          style={{
                            backgroundColor: theme.accent,
                            color: isLightColor(theme.accent) ? '#000000' : '#FFFFFF',
                          }}
                        >
                          Добавить
                        </button>
                      </div>
                    </div>
                  )}

                  {columnCards.map((card, cardIndex) =>
                    renderKanbanCard(card, column, cardIndex, colIdx)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VERTICAL LAYOUT: Natural full-screen scrolling page matching Notes and Tasks */
        <div className="space-y-8 max-w-4xl mx-auto w-full">
          {sortedColumns.map((column, colIdx) => {
            const columnCards = kanbanCards
              .filter(c => c.columnId === column.id)
              .sort((a, b) => a.order - b.order);

            const isColumnCardDropTarget = dragOverColumnId === column.id && draggedCardId !== null;
            const isMenuOpen = activeColumnMenuId === column.id;

            return (
              <div
                key={column.id}
                id={`kanban-column-${column.id}`}
                onDragOver={e => handleCardDragOver(e, column.id)}
                onDrop={e => handleCardDrop(e, column.id)}
                className={`space-y-3 transition-all ${
                  isColumnCardDropTarget ? 'ring-2 ring-opacity-60 rounded-2xl p-2' : ''
                }`}
                style={{
                  borderColor: isColumnCardDropTarget ? column.color : 'transparent',
                }}
              >
                {/* Column Header (Clean transparent header like Notes and Tasks) */}
                <div className="flex items-center justify-between relative">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: column.color }}
                    />
                    <h2 className="text-xs font-semibold uppercase tracking-wider opacity-70 flex items-center gap-1.5">
                      <span>{column.title}</span>
                      <span className="text-[10px] opacity-75 font-bold ml-0.5">{columnCards.length}</span>
                    </h2>
                  </div>

                  {/* 3-dots Menu trigger */}
                  <div className="relative">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setActiveColumnMenuId(isMenuOpen ? null : column.id);
                      }}
                      className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-white/10 transition cursor-pointer"
                      style={{ color: theme.text }}
                      title="Опции колонки"
                    >
                      <MoreHorizontal size={15} />
                    </button>

                    {/* Popover Menu */}
                    {isMenuOpen && (
                      <div
                        className="absolute right-0 top-full mt-1 w-48 p-1.5 rounded-2xl border shadow-2xl backdrop-blur-2xl z-50 flex flex-col gap-0.5 text-xs font-bold animate-fadeIn"
                        style={{
                          backgroundColor: isLight ? 'rgba(255, 255, 255, 0.98)' : hexToRgba(theme.bg, 0.98),
                          borderColor: hexToRgba(theme.text, 0.15),
                          color: theme.text,
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            openCreateKanbanColumnModal(column);
                            setActiveColumnMenuId(null);
                          }}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 active:scale-98 transition text-left cursor-pointer"
                        >
                          <Edit2 size={13} style={{ color: theme.accent }} />
                          <span>Редактировать</span>
                        </button>

                        <button
                          disabled={colIdx === 0}
                          onClick={() => {
                            moveKanbanColumn(column.id, 'up');
                            setActiveColumnMenuId(null);
                          }}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition text-left cursor-pointer ${
                            colIdx === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10 active:scale-98'
                          }`}
                        >
                          <ArrowUp size={13} style={{ color: theme.accent }} />
                          <span>Вверх</span>
                        </button>

                        <button
                          disabled={colIdx === sortedColumns.length - 1}
                          onClick={() => {
                            moveKanbanColumn(column.id, 'down');
                            setActiveColumnMenuId(null);
                          }}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition text-left cursor-pointer ${
                            colIdx === sortedColumns.length - 1
                              ? 'opacity-30 cursor-not-allowed'
                              : 'hover:bg-white/10 active:scale-98'
                          }`}
                        >
                          <ArrowDown size={13} style={{ color: theme.accent }} />
                          <span>Вниз</span>
                        </button>

                        <div className="h-px my-1" style={{ backgroundColor: hexToRgba(theme.text, 0.1) }} />

                        <button
                          onClick={() => {
                            deleteKanbanColumn(column.id);
                            setActiveColumnMenuId(null);
                          }}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-red-500/20 active:scale-98 transition text-left text-red-400 cursor-pointer"
                        >
                          <Trash2 size={13} />
                          <span>Удалить колонку</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline Card Creation Input */}
                {inlineCreateColId === column.id && (
                  <div
                    className="p-3.5 rounded-2xl border shadow-sm animate-fadeIn space-y-2"
                    style={{
                      backgroundColor: hexToRgba(theme.text, 0.05),
                      borderColor: column.color,
                    }}
                  >
                    <input
                      type="text"
                      value={inlineCardTitle}
                      onChange={e => setInlineCardTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleInlineAddCard(column.id);
                        if (e.key === 'Escape') setInlineCreateColId(null);
                      }}
                      placeholder="Название задачи..."
                      autoFocus
                      className="w-full bg-transparent text-xs font-semibold outline-none"
                      style={{ color: theme.text }}
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setInlineCreateColId(null)}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold opacity-60 hover:opacity-100 transition cursor-pointer"
                      >
                        Отмена
                      </button>
                      <button
                        onClick={() => handleInlineAddCard(column.id)}
                        disabled={!inlineCardTitle.trim()}
                        className="px-3 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer shadow-xs disabled:opacity-40"
                        style={{
                          backgroundColor: theme.accent,
                          color: isLightColor(theme.accent) ? '#000000' : '#FFFFFF',
                        }}
                      >
                        Добавить
                      </button>
                    </div>
                  </div>
                )}

                {/* Cards List in Vertical Mode */}
                <div className="space-y-2.5">
                  {columnCards.length === 0 ? (
                    <div
                      className="py-5 px-4 rounded-2xl border border-dashed text-center text-xs opacity-40"
                      style={{ borderColor: hexToRgba(theme.text, 0.15) }}
                    >
                      Нет задач в этой колонке
                    </div>
                  ) : (
                    columnCards.map((card, cardIndex) =>
                      renderKanbanCard(card, column, cardIndex, colIdx)
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Center Create Buttons (Новая задача + "+" Колонка) */}
      {!sidebarOpen && (
        <div className="fixed bottom-6 inset-x-0 z-30 pointer-events-none flex items-center justify-center gap-2.5 px-4">
          <button
            onClick={() => openCreateKanbanCardModal()}
            className="pointer-events-auto flex items-center justify-center px-6 py-3 rounded-2xl text-xs font-extrabold shadow-xl backdrop-blur-xl border hover:opacity-80 active:scale-95 transition cursor-pointer"
            style={{
              backgroundColor: hexToRgba(theme.text, 0.08),
              borderColor: quickSettings.showBorder ? theme.accent : 'transparent',
              color: theme.text,
            }}
          >
            <span>Создать</span>
          </button>

          <button
            onClick={() => openCreateKanbanColumnModal()}
            className="pointer-events-auto flex items-center justify-center p-3 rounded-2xl text-xs font-extrabold shadow-xl backdrop-blur-xl border hover:opacity-80 active:scale-95 transition cursor-pointer"
            style={{
              backgroundColor: hexToRgba(theme.text, 0.08),
              borderColor: quickSettings.showBorder ? theme.accent : 'transparent',
              color: theme.text,
            }}
            title="Создать новую колонку"
          >
            <Plus size={18} />
          </button>
        </div>
      )}
    </div>
  );
};
