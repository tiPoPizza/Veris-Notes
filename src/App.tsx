import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { NoteEditor } from './components/NoteEditor';
import { NotesListView } from './components/NotesListView';
import { TasksView } from './components/TasksView';
import { KanbanView } from './components/KanbanView';
import { SettingsPage } from './components/SettingsPage';
import { TrashView } from './components/TrashView';
import { CalendarView } from './components/CalendarView';
import { PrivateSpaceView } from './components/PrivateSpaceView';
import { CalendarReminderPopup } from './components/CalendarReminderPopup';
import { QuickSettingsModal } from './components/QuickSettingsModal';
import { TagSearchModal } from './components/TagSearchModal';
import { AIPromptModal } from './components/AIPromptModal';
import { TaskListModal } from './components/TaskListModal';
import { KanbanCardModal } from './components/KanbanCardModal';
import { KanbanColumnModal } from './components/KanbanColumnModal';
import { KanbanQuickViewModal } from './components/KanbanQuickViewModal';
import { ExportNoteModal } from './components/ExportNoteModal';
import { CreateBlockModal } from './components/CreateBlockModal';
import { DeleteBlockModal } from './components/DeleteBlockModal';
import { WebSearchDrawer } from './components/WebSearchDrawer';
import { FloatingDock } from './components/FloatingDock';
import { LockScreen } from './components/LockScreen';
import { getFontFamilyStyle } from './utils/fonts';

const VerisAppContent: React.FC = () => {
  const { viewMode, theme, quickSettings, isAppLocked, appPin } = useApp();

  // Apply system-wide font size to root HTML element so all typography scales proportionally
  React.useEffect(() => {
    const baseFontSize = quickSettings.fontSize || 16;
    document.documentElement.style.fontSize = `${(baseFontSize / 16) * 100}%`;
  }, [quickSettings.fontSize]);

  if (isAppLocked && appPin) {
    return <LockScreen />;
  }

  return (
    <div
      className="w-screen h-screen flex overflow-hidden transition-colors duration-300 selection:bg-white/20 select-none"
      style={{
        backgroundColor: theme.bg,
        color: theme.text,
        fontFamily: getFontFamilyStyle(quickSettings.fontFamily || 'sans'),
        fontSize: `${quickSettings.fontSize || 16}px`,
      }}
    >
      {/* Full Height Left Sidebar */}
      <Sidebar />

      {/* Main Content Area (Header + View Router) */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header />

        <main className="flex-1 flex flex-col overflow-hidden relative">
          {viewMode === 'editor' && <NoteEditor />}
          {viewMode === 'notes' && <NotesListView />}
          {viewMode === 'tasks' && <TasksView />}
          {viewMode === 'kanban' && <KanbanView />}
          {viewMode === 'settings' && <SettingsPage />}
          {viewMode === 'trash' && <TrashView />}
          {viewMode === 'calendar' && <CalendarView />}
          {viewMode === 'private' && <PrivateSpaceView />}
        </main>
      </div>

      {/* Floating Reminder Banner */}
      <CalendarReminderPopup />

      {/* Floating Bottom Toolbar Dock */}
      <FloatingDock />

      {/* Popovers & Modals */}
      <QuickSettingsModal />
      <TagSearchModal />
      <AIPromptModal />
      <WebSearchDrawer />
      <TaskListModal />
      <KanbanCardModal />
      <KanbanColumnModal />
      <KanbanQuickViewModal />
      <ExportNoteModal />
      <CreateBlockModal />
      <DeleteBlockModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <VerisAppContent />
    </AppProvider>
  );
}

