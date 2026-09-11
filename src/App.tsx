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
import { BedtimeReminderPopup } from './components/BedtimeReminderPopup';
import { QuickSettingsModal } from './components/QuickSettingsModal';
import { TagSearchModal } from './components/TagSearchModal';
import { AnacrusaDrawer } from './components/AnacrusaDrawer';
import { TaskListModal } from './components/TaskListModal';
import { KanbanCardModal } from './components/KanbanCardModal';
import { KanbanColumnModal } from './components/KanbanColumnModal';
import { KanbanQuickViewModal } from './components/KanbanQuickViewModal';
import { ExportNoteModal } from './components/ExportNoteModal';
import { BatchExportModal } from './components/BatchExportModal';
import { CreateBlockModal } from './components/CreateBlockModal';
import { DeleteBlockModal } from './components/DeleteBlockModal';
import { WebSearchDrawer } from './components/WebSearchDrawer';
import { FloatingDock } from './components/FloatingDock';
import { LockScreen } from './components/LockScreen';
import { WorkspaceModal } from './components/WorkspaceModal';
import { getFontFamilyStyle } from './utils/fonts';
import { hexToRgba, isLightColor } from './themes';

const VerisAppContent: React.FC = () => {
  const {
    viewMode,
    theme,
    quickSettings,
    isAppLocked,
    appPin,
    isTagSearchOpen,
    isBatchExportModalOpen,
    setIsBatchExportModalOpen,
    batchExportInitialMode,
    batchExportInitialBlockId,
    workspaceToast,
  } = useApp();

  const isLight = isLightColor(theme.bg);

  // Apply system-wide font size, theme accent, caret and selection highlight colors to root HTML element
  React.useEffect(() => {
    const baseFontSize = quickSettings.fontSize || 16;
    document.documentElement.style.fontSize = `${(baseFontSize / 16) * 100}%`;
    document.documentElement.style.setProperty('--theme-accent', theme.accent);
    document.documentElement.style.setProperty(
      '--theme-accent-highlight',
      hexToRgba(theme.accent, 0.35)
    );
    document.documentElement.style.accentColor = theme.accent;
    document.documentElement.style.caretColor = theme.accent;

    // Update mobile browser / WebView theme color meta tag
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', theme.bg);
  }, [quickSettings.fontSize, theme.accent, theme.bg]);

  if (isAppLocked && appPin) {
    return <LockScreen />;
  }

  return (
    <div
      className="w-screen h-screen flex overflow-hidden transition-colors duration-300 select-none"
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

        <main
          className={`flex-1 flex flex-col overflow-hidden relative transition-opacity duration-200 ${
            isTagSearchOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
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
      <BedtimeReminderPopup />

      {/* Floating Bottom Toolbar Dock */}
      <FloatingDock />

      {/* Popovers & Modals */}
      <QuickSettingsModal />
      <TagSearchModal />
      <AnacrusaDrawer />
      <WebSearchDrawer />
      <TaskListModal />
      <KanbanCardModal />
      <KanbanColumnModal />
      <KanbanQuickViewModal />
      <ExportNoteModal />
      <BatchExportModal
        isOpen={isBatchExportModalOpen}
        onClose={() => setIsBatchExportModalOpen(false)}
        initialMode={batchExportInitialMode}
        initialBlockId={batchExportInitialBlockId}
      />
      <CreateBlockModal />
      <DeleteBlockModal />
      <WorkspaceModal />

      {/* Floating Workspace Notification */}
      {workspaceToast && (
        <div
          className="fixed bottom-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl shadow-xl text-xs sm:text-sm font-medium border animate-fadeIn transition-all pointer-events-none select-none max-w-sm text-center"
          style={{
            backgroundColor: isLight ? 'rgba(255, 255, 255, 0.96)' : hexToRgba(theme.bg, 0.96),
            color: theme.text,
            borderColor: hexToRgba(theme.accent, 0.4),
            boxShadow: `0 8px 30px ${hexToRgba(theme.accent, 0.15)}`,
            backdropFilter: 'blur(16px)',
          }}
        >
          {workspaceToast}
        </div>
      )}
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

