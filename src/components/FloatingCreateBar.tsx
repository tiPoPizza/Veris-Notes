import React from 'react';
import {
  Sparkles,
  Globe,
  Settings,
  Calendar as CalendarIcon,
  ChevronDown,
  ListTodo,
  FileText,
  FolderPlus,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { hexToRgba } from '../themes';
import { CreateBarActionId } from '../types';

interface FloatingCreateBarProps {
  onCreate: () => void;
  label: string;
  currentView: 'notes' | 'tasks' | 'kanban' | 'private';
}

export const FloatingCreateBar: React.FC<FloatingCreateBarProps> = ({
  onCreate,
  label,
  currentView,
}) => {
  const {
    theme,
    quickSettings,
    openAnacrusaDrawer,
    setIsWebSearchOpen,
    setViewMode,
    openCreateTaskListModal,
    createNote,
    setActiveNoteId,
    openCreateBlockModal,
  } = useApp();

  const getActionConfig = (actionId?: CreateBarActionId) => {
    if (!actionId || actionId === 'none') return null;

    switch (actionId) {
      case 'aiChat':
        return {
          icon: Sparkles,
          title: 'ИИ чат Anacrusa',
          onClick: () => openAnacrusaDrawer(),
        };
      case 'webSearch':
        return {
          icon: Globe,
          title: 'Веб-поиск',
          onClick: () => setIsWebSearchOpen(true),
        };
      case 'settings':
        return {
          icon: Settings,
          title: 'Настройки',
          onClick: () => setViewMode('settings'),
        };
      case 'calendar':
        return {
          icon: CalendarIcon,
          title: 'Календарь',
          onClick: () => setViewMode('calendar'),
        };
      case 'calendarChevron':
        return {
          icon: ChevronDown,
          title: 'Календарь',
          onClick: () => setViewMode('calendar'),
        };
      case 'dynamicNewItem':
        if (currentView === 'tasks') {
          return {
            icon: FileText,
            title: 'Новая заметка',
            onClick: () => {
              const newNote = createNote();
              setActiveNoteId(newNote.id);
              setViewMode('editor');
            },
          };
        } else {
          return {
            icon: ListTodo,
            title: 'Новая задача',
            onClick: () => openCreateTaskListModal(),
          };
        }
      case 'newBlock':
        return {
          icon: FolderPlus,
          title: 'Новый блок',
          onClick: () => openCreateBlockModal(),
        };
      default:
        return null;
    }
  };

  const renderSideButton = (actionId?: CreateBarActionId, side: 'left' | 'right' = 'left') => {
    const config = getActionConfig(actionId);
    if (!config) return null;

    const IconComp = config.icon;

    return (
      <button
        type="button"
        id={`floating-create-bar-${side}-btn`}
        onClick={config.onClick}
        className="pointer-events-auto flex items-center justify-center p-3 rounded-2xl shadow-xl backdrop-blur-xl border hover:opacity-80 active:scale-95 transition cursor-pointer shrink-0"
        style={{
          backgroundColor: hexToRgba(theme.text, 0.08),
          borderColor: quickSettings.showBorder ? theme.accent : 'transparent',
          color: theme.text,
        }}
        title={config.title}
        aria-label={config.title}
      >
        <IconComp size={16} style={{ color: theme.accent }} />
      </button>
    );
  };

  return (
    <div
      id="floating-create-action-bar"
      className="fixed bottom-6 inset-x-0 z-30 pointer-events-none flex items-center justify-center gap-2 px-4"
    >
      {renderSideButton(quickSettings.createBarLeftAction, 'left')}

      <button
        type="button"
        id="floating-create-bar-main-btn"
        onClick={onCreate}
        className="pointer-events-auto flex items-center justify-center px-6 py-3 rounded-2xl text-xs font-extrabold shadow-xl backdrop-blur-xl border hover:opacity-80 active:scale-95 transition cursor-pointer"
        style={{
          backgroundColor: hexToRgba(theme.text, 0.08),
          borderColor: quickSettings.showBorder ? theme.accent : 'transparent',
          color: theme.text,
        }}
      >
        <span>{label}</span>
      </button>

      {renderSideButton(quickSettings.createBarRightAction, 'right')}
    </div>
  );
};
