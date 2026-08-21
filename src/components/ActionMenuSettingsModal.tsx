import React from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import {
  X,
  Calendar as CalendarIcon,
  Columns3,
  Trash2,
  Settings as SettingsIcon,
  Sparkles,
  Globe,
  FileText,
  CheckSquare,
  Shield,
  ChevronUp,
  ChevronDown,
  LayoutGrid,
  List,
} from 'lucide-react';
import { hexToRgba, isLightColor } from '../themes';
import { ActionMenuItemId, ActionMenuDisplayMode } from '../types';

interface ActionMenuSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ActionItemDef {
  id: ActionMenuItemId;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
}

const ALL_ACTION_ITEMS: ActionItemDef[] = [
  { id: 'calendar', label: 'Календарь', icon: CalendarIcon },
  { id: 'kanban', label: 'Канбан', icon: Columns3 },
  { id: 'private', label: 'Приват', icon: Shield },
  { id: 'trash', label: 'Корзина', icon: Trash2 },
  { id: 'settings', label: 'Настройки', icon: SettingsIcon },
  { id: 'ai', label: 'Anacrusa', icon: Sparkles },
  { id: 'webSearch', label: 'Веб поиск', icon: Globe },
  { id: 'notes', label: 'Заметки', icon: FileText },
  { id: 'tasks', label: 'Задачи', icon: CheckSquare },
];

export const ActionMenuSettingsModal: React.FC<ActionMenuSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { theme, quickSettings, updateQuickSettings } = useApp();

  if (!isOpen) return null;

  const isLight = isLightColor(theme.bg);
  const modalBg = isLight ? '#FFFFFF' : theme.bg;
  const cardBorder = hexToRgba(theme.text, 0.14);

  const displayMode: ActionMenuDisplayMode =
    quickSettings.actionMenuDisplayMode === 'rows' ? 'rows' : 'tiles';

  const currentItems: ActionMenuItemId[] =
    quickSettings.actionMenuItems && quickSettings.actionMenuItems.length > 0
      ? quickSettings.actionMenuItems
      : ['calendar', 'kanban', 'trash', 'settings', 'ai', 'webSearch'];

  // Full list preserved in order with missing ones appended
  const orderedAllItemIds: ActionMenuItemId[] = [
    ...currentItems,
    ...ALL_ACTION_ITEMS.map(i => i.id).filter(id => !currentItems.includes(id)),
  ];

  const handleToggleMode = (mode: ActionMenuDisplayMode) => {
    updateQuickSettings({ actionMenuDisplayMode: mode });
  };

  const handleToggleItem = (itemId: ActionMenuItemId) => {
    const isCurrentlyActive = currentItems.includes(itemId);
    let newItems: ActionMenuItemId[];
    if (isCurrentlyActive) {
      newItems = currentItems.filter(id => id !== itemId);
    } else {
      newItems = [...currentItems, itemId];
    }
    updateQuickSettings({ actionMenuItems: newItems });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= orderedAllItemIds.length) return;

    const newOrder = [...orderedAllItemIds];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    // Filter to preserve active ones in the new sequence
    const updatedActive = newOrder.filter(id => currentItems.includes(id));
    updateQuickSettings({ actionMenuItems: updatedActive });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border transition-all space-y-5 max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: modalBg,
          color: theme.text,
          borderColor: cardBorder,
          boxShadow: `0 24px 48px ${isLight ? 'rgba(0,0,0,0.14)' : 'rgba(0,0,0,0.6)'}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-black tracking-tight">
              Настроить меню боковой панели
            </h2>
            <p className="text-xs opacity-60 font-medium leading-relaxed">
              Выберите, какие действия показывать в этом меню.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl opacity-60 hover:opacity-100 hover:bg-white/10 active:scale-95 transition cursor-pointer"
            style={{ color: theme.text }}
          >
            <X size={18} />
          </button>
        </div>

        {/* View Mode Switcher (Плитки / Строки) */}
        <div className="space-y-2">
          <label className="block text-[11px] font-extrabold uppercase tracking-wider opacity-60">
            Вид меню
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {/* 1. Плитки */}
            <button
              type="button"
              onClick={() => handleToggleMode('tiles')}
              className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center transition cursor-pointer ${
                displayMode === 'tiles' ? 'shadow-md scale-101' : 'opacity-70 hover:opacity-100'
              }`}
              style={{
                backgroundColor:
                  displayMode === 'tiles'
                    ? hexToRgba(theme.accent, isLight ? 0.12 : 0.18)
                    : hexToRgba(theme.text, 0.03),
                borderColor: displayMode === 'tiles' ? theme.accent : cardBorder,
                color: displayMode === 'tiles' ? theme.accent : theme.text,
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-2"
                style={{
                  backgroundColor:
                    displayMode === 'tiles'
                      ? hexToRgba(theme.accent, 0.2)
                      : hexToRgba(theme.text, 0.06),
                  color: displayMode === 'tiles' ? theme.accent : theme.text,
                }}
              >
                <LayoutGrid size={20} />
              </div>
              <span className="text-xs font-black">Плитки</span>
            </button>

            {/* 2. Строки */}
            <button
              type="button"
              onClick={() => handleToggleMode('rows')}
              className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center transition cursor-pointer ${
                displayMode === 'rows' ? 'shadow-md scale-101' : 'opacity-70 hover:opacity-100'
              }`}
              style={{
                backgroundColor:
                  displayMode === 'rows'
                    ? hexToRgba(theme.accent, isLight ? 0.12 : 0.18)
                    : hexToRgba(theme.text, 0.03),
                borderColor: displayMode === 'rows' ? theme.accent : cardBorder,
                color: displayMode === 'rows' ? theme.accent : theme.text,
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-2"
                style={{
                  backgroundColor:
                    displayMode === 'rows'
                      ? hexToRgba(theme.accent, 0.2)
                      : hexToRgba(theme.text, 0.06),
                  color: displayMode === 'rows' ? theme.accent : theme.text,
                }}
              >
                <List size={20} />
              </div>
              <span className="text-xs font-black">Строки</span>
            </button>
          </div>
        </div>

        {/* Actions List with Order and Toggle */}
        <div className="space-y-2">
          <label className="block text-[11px] font-extrabold uppercase tracking-wider opacity-60">
            Действия и порядок
          </label>
          <div className="space-y-1.5">
            {orderedAllItemIds.map((itemId, idx) => {
              const itemDef = ALL_ACTION_ITEMS.find(i => i.id === itemId);
              if (!itemDef) return null;
              const IconComponent = itemDef.icon;
              const isEnabled = currentItems.includes(itemId);

              return (
                <div
                  key={itemId}
                  className="flex items-center justify-between p-2.5 rounded-2xl border transition"
                  style={{
                    backgroundColor: isEnabled
                      ? hexToRgba(theme.text, 0.04)
                      : hexToRgba(theme.text, 0.015),
                    borderColor: isEnabled ? hexToRgba(theme.text, 0.12) : hexToRgba(theme.text, 0.06),
                    opacity: isEnabled ? 1 : 0.55,
                  }}
                >
                  {/* Icon & Title */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: isEnabled
                          ? hexToRgba(theme.accent, 0.14)
                          : hexToRgba(theme.text, 0.06),
                        color: isEnabled ? theme.accent : theme.text,
                      }}
                    >
                      <IconComponent size={16} />
                    </div>
                    <span className="text-xs font-bold truncate" style={{ color: theme.text }}>
                      {itemDef.label}
                    </span>
                  </div>

                  {/* Reorder and Switch Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Reorder Buttons */}
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleMove(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded-lg hover:bg-white/10 active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed transition cursor-pointer"
                        style={{ color: theme.text }}
                        title="Поднять выше"
                      >
                        <ChevronUp size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(idx, 'down')}
                        disabled={idx === orderedAllItemIds.length - 1}
                        className="p-1 rounded-lg hover:bg-white/10 active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed transition cursor-pointer"
                        style={{ color: theme.text }}
                        title="Опустить ниже"
                      >
                        <ChevronDown size={15} />
                      </button>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggleItem(itemId)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        isEnabled ? 'bg-accent' : 'bg-gray-400/30'
                      }`}
                      style={{
                        backgroundColor: isEnabled
                          ? theme.accent
                          : hexToRgba(theme.text, 0.2),
                      }}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Done Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl text-xs font-black transition active:scale-98 cursor-pointer shadow-md text-center"
            style={{
              backgroundColor: theme.accent,
              color: isLightColor(theme.accent) ? '#000000' : '#FFFFFF',
            }}
          >
            Готово
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
