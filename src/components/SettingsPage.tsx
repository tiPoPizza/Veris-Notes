import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../i18n';
import { THEME_CATEGORIES, isLightColor, hexToRgba } from '../themes';
import { LanguageCode, SidebarTabId } from '../types';
import {
  Globe,
  Lock,
  Palette,
  Edit3,
  Sparkles,
  Database,
  MoreHorizontal,
  Check,
  RefreshCw,
  Download,
  Upload,
  FileText,
  CheckSquare,
  Columns3,
  Calendar as CalendarIcon,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
  X,
  Loader2,
  SlidersHorizontal,
  KeyRound,
  Shield,
  Youtube,
  Instagram,
  Pin,
  Video,
  Send,
  ExternalLink,
  Eye,
  EyeOff,
  Compass,
} from 'lucide-react';
import { CustomSelect } from './CustomSelect';
import { PinModal, PinModalMode } from './PinModal';
import { FONT_FAMILY_OPTIONS } from '../utils/fonts';

const LINE_HEIGHT_OPTIONS = [
  { value: 1.2, label: '1.2' },
  { value: 1.4, label: '1.4' },
  { value: 1.6, label: '1.6' },
  { value: 1.8, label: '1.8' },
  { value: 2.0, label: '2.0' },
];

const TILE_DISPLAY_OPTIONS = [
  { value: 'both', label: 'Название + текст' },
  { value: 'title', label: 'Название' },
  { value: 'content', label: 'Текст' },
];

export const SettingsPage: React.FC = () => {
  const {
    theme,
    setTheme,
    language,
    setLanguage,
    launchScreen,
    setLaunchScreen,
    quickSettings,
    setQuickSettings,
    webSearchSettings,
    setWebSearchSettings,
    notes,
    taskLists,
    resetAllData,
    importFiles,
    activeSettingsTab,
    setActiveSettingsTab,
    openExportModal,
    appPin,
    lockApp,
    privatePin,
    lockPrivateSpace,
    resetPrivateSpace,
    isPrivateLocked,
  } = useApp();

  const [pinModalMode, setPinModalMode] = useState<PinModalMode | null>(null);
  const [pinModalTarget, setPinModalTarget] = useState<'app' | 'private'>('app');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importNotice, setImportNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showTavilyKey, setShowTavilyKey] = useState(false);

  const t = (key: string) => getTranslation(language, key);
  const isLight = isLightColor(theme.bg);

  const handleFileImport = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsImporting(true);
    setImportNotice(null);

    try {
      const { count, errors } = await importFiles(files);
      if (count > 0) {
        setImportNotice({
          type: 'success',
          message: `Успешно импортировано заметок: ${count}${errors.length > 0 ? ` (ошибок: ${errors.length})` : ''}`,
        });
      } else if (errors.length > 0) {
        setImportNotice({
          type: 'error',
          message: `Не удалось импортировать файлы: ${errors.join(', ')}`,
        });
      }
    } catch (e: any) {
      setImportNotice({
        type: 'error',
        message: e?.message || 'Ошибка импорта файлов',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const languages: { code: LanguageCode; name: string }[] = [
    { code: 'ru', name: 'Русский' },
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'it', name: 'Italiano' },
  ];

  const exportData = () => {
    const dataStr = JSON.stringify({ notes, taskLists, theme, language }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veris-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const cardBg = isLight ? '#FFFFFF' : hexToRgba(theme.text, 0.05);
  const cardBorder = hexToRgba(theme.text, 0.12);

  const categories = [
    { id: 'themes', title: t('themes'), icon: <Palette size={18} /> },
    { id: 'customization', title: t('customization') || 'Кастомизация', icon: <SlidersHorizontal size={18} /> },
    { id: 'editor', title: t('editor'), icon: <Edit3 size={18} /> },
    { id: 'language', title: t('language'), icon: <Globe size={18} /> },
    { id: 'security', title: t('security'), icon: <Lock size={18} /> },
    { id: 'data', title: t('data'), icon: <Database size={18} /> },
    { id: 'ai', title: t('aiUsage'), icon: <Sparkles size={18} /> },
    { id: 'other', title: t('other'), icon: <MoreHorizontal size={18} /> },
  ];

  // If no category selected, render Category List
  if (!activeSettingsTab) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 md:p-12">
        <div className="max-w-md mx-auto w-full pt-4 pb-12">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-6 text-center">
            {t('settings')}
          </h1>

          <div className="space-y-2.5">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveSettingsTab(cat.id)}
                className="w-full flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer hover:opacity-90 active:scale-[0.99]"
                style={{
                  backgroundColor: cardBg,
                  borderColor: cardBorder,
                  color: theme.text,
                }}
              >
                <div className="flex items-center gap-3.5">
                  <div className="opacity-80 flex items-center justify-center">
                    {cat.icon}
                  </div>
                  <span className="font-bold text-sm sm:text-base">{cat.title}</span>
                </div>
                <ChevronRight size={18} className="opacity-40" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Category Detail View
  const currentCategory = categories.find(c => c.id === activeSettingsTab);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 md:p-12">
      <div className="max-w-2xl mx-auto w-full pt-4 pb-12">
        {/* Category Header */}
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-center mb-6">
          {currentCategory?.title || t('settings')}
        </h1>

        {/* TAB: Themes */}
        {activeSettingsTab === 'themes' && (
          <div className="space-y-6">
            <div>
              <p className="text-xs opacity-60">
                Текущая тема: <span className="font-bold">{theme.name}</span> ({theme.category})
              </p>
            </div>

            {THEME_CATEGORIES.map(category => (
              <div key={category.id} className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider opacity-60">
                  • {category.name}
                </h3>

                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  {category.themes.map(preset => {
                    const isActive = theme.id === preset.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => setTheme(preset)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer relative shadow-xs hover:shadow-md ${
                          isActive ? 'ring-2 shadow-lg' : 'hover:scale-[1.01]'
                        }`}
                        style={{
                          backgroundColor: preset.bg,
                          borderColor: isActive ? preset.accent : hexToRgba(preset.text, 0.2),
                          color: preset.text,
                        }}
                      >
                        {/* Mini Screen Header */}
                        <div
                          className="flex items-center justify-between pb-1.5 mb-2 border-b"
                          style={{ borderColor: hexToRgba(preset.text, 0.15) }}
                        >
                          <span className="font-bold text-xs truncate">{preset.name}</span>
                          {isActive && (
                            <div
                              className="w-4 h-4 rounded-full flex items-center justify-center text-white shrink-0"
                              style={{ backgroundColor: preset.accent }}
                            >
                              <Check size={10} />
                            </div>
                          )}
                        </div>

                        {/* Mini Screen Body Preview */}
                        <div
                          className="p-2 rounded-xl border space-y-1"
                          style={{
                            backgroundColor: hexToRgba(preset.text, 0.04),
                            borderColor: hexToRgba(preset.text, 0.1),
                          }}
                        >
                          <div className="font-bold text-[11px] opacity-90 truncate">
                            Заголовок
                          </div>
                          <div className="text-[10px] opacity-70 leading-tight truncate">
                            Текст заметки
                          </div>
                          <div className="pt-1 flex items-center justify-between">
                            <span
                              className="px-1.5 py-0.5 rounded-md text-[9px] font-bold"
                              style={{
                                backgroundColor: hexToRgba(preset.accent, 0.2),
                                color: preset.accent,
                              }}
                            >
                              Акцент
                            </span>
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: preset.accent }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB: Language */}
        {activeSettingsTab === 'language' && (
          <div>
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            >
              {languages.map(lang => {
                const isSelected = language === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className="w-full flex items-center justify-between p-4 border-b last:border-0 text-sm font-semibold hover:opacity-80 transition text-left cursor-pointer"
                    style={{ borderColor: cardBorder }}
                  >
                    <span>{lang.name}</span>
                    {isSelected && <Check size={16} style={{ color: theme.accent }} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB: Customization */}
        {activeSettingsTab === 'customization' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl border space-y-4" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              {/* Gorizontalnoe glavnoe menu (Horizontal main menu) */}
              <div
                className="flex items-center justify-between text-xs font-semibold py-1 cursor-pointer gap-4"
                onClick={() => setQuickSettings(prev => ({ ...prev, horizontalMainMenu: !prev.horizontalMainMenu }))}
              >
                <div className="flex-1 pr-4">
                  <div>Горизонтальное главное меню</div>
                  <div className="text-[10px] opacity-50 font-normal mt-0.5">
                    Располагать блоки заметок и задач горизонтально (слева направо)
                  </div>
                </div>
                <div
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                    quickSettings.horizontalMainMenu ? 'justify-end' : 'justify-start'
                  }`}
                  style={{
                    backgroundColor: quickSettings.horizontalMainMenu ? theme.accent : hexToRgba(theme.text, 0.2),
                  }}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </div>
              </div>

              {/* Obvodka paneley (Panel border) */}
              <div
                className="flex items-center justify-between text-xs font-semibold pt-3 border-t cursor-pointer gap-4"
                style={{ borderColor: cardBorder }}
                onClick={() => setQuickSettings(prev => ({ ...prev, showBorder: !prev.showBorder }))}
              >
                <div className="flex-1 pr-4">
                  <div>Обводка панелей</div>
                  <div className="text-[10px] opacity-50 font-normal mt-0.5">Отображать тонкую рамку вокруг боковой панели, редактора и плиток</div>
                </div>
                <div
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                    quickSettings.showBorder ? 'justify-end' : 'justify-start'
                  }`}
                  style={{
                    backgroundColor: quickSettings.showBorder ? theme.accent : hexToRgba(theme.text, 0.2),
                  }}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </div>
              </div>

              {/* Metadata na plitkakh (Tile metadata toggle for notes and tasks) */}
              <div
                className="flex items-center justify-between text-xs font-semibold pt-3 border-t cursor-pointer gap-4"
                style={{ borderColor: cardBorder }}
                onClick={() => setQuickSettings(prev => ({ ...prev, showTileMetadata: !prev.showTileMetadata }))}
              >
                <div className="flex-1 pr-4">
                  <div>Метаданные на плитках</div>
                  <div className="text-[10px] opacity-50 font-normal mt-0.5">Отображать дату и время обновления на карточках заметок и задач</div>
                </div>
                <div
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                    quickSettings.showTileMetadata ? 'justify-end' : 'justify-start'
                  }`}
                  style={{
                    backgroundColor: quickSettings.showTileMetadata ? theme.accent : hexToRgba(theme.text, 0.2),
                  }}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </div>
              </div>

              {/* Hide 3-dots on tiles (Скрыть 3 точки на плитках) */}
              <div
                className="flex items-center justify-between text-xs font-semibold pt-3 border-t cursor-pointer gap-4"
                style={{ borderColor: cardBorder }}
                onClick={() => setQuickSettings(prev => ({ ...prev, hideTileDots: !prev.hideTileDots }))}
              >
                <div className="flex-1 pr-4">
                  <div>Скрыть 3 точки на плитках</div>
                  <div className="text-[10px] opacity-50 font-normal mt-0.5">Меню действий будет вызываться через зажатие плитки</div>
                </div>
                <div
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                    quickSettings.hideTileDots ? 'justify-end' : 'justify-start'
                  }`}
                  style={{
                    backgroundColor: quickSettings.hideTileDots ? theme.accent : hexToRgba(theme.text, 0.2),
                  }}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </div>
              </div>

              {/* Pinned Search Bar on Home Screen */}
              <div
                className="flex items-center justify-between text-xs font-semibold pt-3 border-t cursor-pointer gap-4"
                style={{ borderColor: cardBorder }}
                onClick={() => setQuickSettings(prev => ({ ...prev, pinSearchToHomeScreen: !prev.pinSearchToHomeScreen }))}
              >
                <div className="flex-1 pr-4">
                  <div>Панель поиска на главном экране</div>
                  <div className="text-[10px] opacity-50 font-normal mt-0.5">Закрепить панель поиска между оглавлением и списком заметок/задач</div>
                </div>
                <div
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                    quickSettings.pinSearchToHomeScreen ? 'justify-end' : 'justify-start'
                  }`}
                  style={{
                    backgroundColor: quickSettings.pinSearchToHomeScreen ? theme.accent : hexToRgba(theme.text, 0.2),
                  }}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </div>
              </div>

              {/* Tile Display Mode (Отображение плиток) */}
              <div className="flex flex-wrap sm:flex-nowrap items-center justify-between text-xs font-semibold pt-3 border-t gap-3" style={{ borderColor: cardBorder }}>
                <div className="flex-1 min-w-[140px] pr-2">
                  <div>Отображение плиток</div>
                  <div className="text-[10px] opacity-50 font-normal mt-0.5">Выберите, что показывать на карточках заметок</div>
                </div>
                <div className="shrink-0">
                  <CustomSelect
                    value={quickSettings.tileDisplayMode || 'both'}
                    onChange={val => setQuickSettings(prev => ({ ...prev, tileDisplayMode: val }))}
                    options={TILE_DISPLAY_OPTIONS}
                  />
                </div>
              </div>

              {/* Sidebar Tabs Display & Sequence (Вкладки бокового меню: Заметки / Задачи / Канбан / Календарь) */}
              <div className="pt-4 border-t space-y-3" style={{ borderColor: cardBorder }}>
                <div>
                  <div className="text-xs font-bold">Вкладки бокового меню</div>
                  <div className="text-[10px] opacity-50 font-normal mt-0.5">
                    Выберите отображаемые вкладки и настройте их последовательность стрелками. Отключенные вкладки будут доступны через меню «...»
                  </div>
                </div>

                {(() => {
                  const ALL_TABS: { id: SidebarTabId; label: string; icon: React.ReactNode }[] = [
                    { id: 'notes', label: 'Заметки', icon: <FileText size={14} /> },
                    { id: 'tasks', label: 'Задачи', icon: <CheckSquare size={14} /> },
                    { id: 'kanban', label: 'Канбан', icon: <Columns3 size={14} /> },
                    { id: 'calendar', label: 'Календарь', icon: <CalendarIcon size={14} /> },
                    { id: 'private', label: 'Приват', icon: <Shield size={14} /> },
                  ];

                  const currentActiveTabs: SidebarTabId[] =
                    quickSettings.sidebarTabs && quickSettings.sidebarTabs.length > 0
                      ? quickSettings.sidebarTabs
                      : ['notes', 'tasks'];

                  // Build complete ordered list including inactive ones at the end
                  const orderedAllTabs: SidebarTabId[] = [
                    ...currentActiveTabs,
                    ...(['notes', 'tasks', 'kanban', 'calendar', 'private'] as SidebarTabId[]).filter(
                      t => !currentActiveTabs.includes(t)
                    ),
                  ];

                  const handleToggleTab = (tabId: SidebarTabId) => {
                    const isCurrentlyActive = currentActiveTabs.includes(tabId);
                    if (isCurrentlyActive) {
                      if (currentActiveTabs.length <= 1) return; // Keep at least 1 tab
                      const nextTabs = currentActiveTabs.filter(t => t !== tabId);
                      setQuickSettings(prev => ({ ...prev, sidebarTabs: nextTabs }));
                    } else {
                      const nextTabs = [...currentActiveTabs, tabId];
                      setQuickSettings(prev => ({ ...prev, sidebarTabs: nextTabs }));
                    }
                  };

                  const handleMoveTab = (index: number, direction: 'up' | 'down') => {
                    const targetIndex = direction === 'up' ? index - 1 : index + 1;
                    if (targetIndex < 0 || targetIndex >= orderedAllTabs.length) return;
                    const nextOrdered = [...orderedAllTabs];
                    const temp = nextOrdered[index];
                    nextOrdered[index] = nextOrdered[targetIndex];
                    nextOrdered[targetIndex] = temp;

                    // Preserve active tabs in the new order
                    const nextActive = nextOrdered.filter(t => currentActiveTabs.includes(t));
                    setQuickSettings(prev => ({ ...prev, sidebarTabs: nextActive }));
                  };

                  return (
                    <div className="space-y-1.5">
                      {orderedAllTabs.map((tabId, idx) => {
                        const tabInfo = ALL_TABS.find(t => t.id === tabId)!;
                        const isChecked = currentActiveTabs.includes(tabId);

                        return (
                          <div
                            key={tabId}
                            className="flex items-center justify-between p-2.5 rounded-2xl border transition-all"
                            style={{
                              backgroundColor: isChecked ? hexToRgba(theme.text, 0.04) : 'transparent',
                              borderColor: hexToRgba(theme.text, isChecked ? 0.15 : 0.08),
                              opacity: isChecked ? 1 : 0.6,
                            }}
                          >
                            {/* Checkbox and Tab info */}
                            <button
                              type="button"
                              onClick={() => handleToggleTab(tabId)}
                              className="flex items-center gap-3 flex-1 text-left cursor-pointer"
                            >
                              <div
                                className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors ${
                                  isChecked ? 'text-white' : ''
                                }`}
                                style={{
                                  backgroundColor: isChecked ? theme.accent : 'transparent',
                                  borderColor: isChecked ? theme.accent : hexToRgba(theme.text, 0.3),
                                }}
                              >
                                {isChecked && <Check size={12} strokeWidth={3} />}
                              </div>

                              <div className="flex items-center gap-2 text-xs font-bold">
                                <span style={{ color: isChecked ? theme.accent : theme.text }}>
                                  {tabInfo.icon}
                                </span>
                                <span>{tabInfo.label}</span>
                              </div>
                            </button>

                            {/* Order arrows */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveTab(idx, 'up')}
                                className="p-1.5 rounded-xl border opacity-70 hover:opacity-100 disabled:opacity-20 disabled:cursor-not-allowed transition cursor-pointer"
                                style={{
                                  borderColor: hexToRgba(theme.text, 0.12),
                                  backgroundColor: hexToRgba(theme.text, 0.04),
                                }}
                                title="Переместить выше"
                              >
                                <ArrowUp size={13} />
                              </button>
                              <button
                                type="button"
                                disabled={idx === orderedAllTabs.length - 1}
                                onClick={() => handleMoveTab(idx, 'down')}
                                className="p-1.5 rounded-xl border opacity-70 hover:opacity-100 disabled:opacity-20 disabled:cursor-not-allowed transition cursor-pointer"
                                style={{
                                  borderColor: hexToRgba(theme.text, 0.12),
                                  backgroundColor: hexToRgba(theme.text, 0.04),
                                }}
                                title="Переместить ниже"
                              >
                                <ArrowDown size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* TAB: Security */}
        {activeSettingsTab === 'security' && (
          <div className="space-y-4">
            {/* PIN Code Setting */}
            <div className="p-5 rounded-3xl border space-y-4" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
                    style={{
                      backgroundColor: hexToRgba(theme.accent, isLight ? 0.12 : 0.18),
                      color: theme.accent,
                    }}
                  >
                    <KeyRound size={22} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="text-sm font-bold tracking-tight">Пин-код на вход</div>
                    <div className="text-xs opacity-50 mt-0.5">
                      {appPin ? 'Защита активна (от 1 до 12 цифр)' : 'Блокировка при входе выключена'}
                    </div>
                  </div>
                </div>

                <div
                  className="px-3 py-1 rounded-full text-xs font-bold tracking-wide"
                  style={{
                    backgroundColor: appPin ? hexToRgba(theme.accent, 0.15) : hexToRgba(theme.text, 0.08),
                    color: appPin ? theme.accent : hexToRgba(theme.text, 0.6),
                  }}
                >
                  {appPin ? 'Включен' : 'Выключено'}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 border-t flex flex-col sm:flex-row gap-2.5" style={{ borderColor: cardBorder }}>
                {!appPin ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPinModalTarget('app');
                      setPinModalMode('set');
                    }}
                    className="w-full py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer shadow-sm"
                    style={{
                      backgroundColor: theme.accent,
                      color: isLightColor(theme.accent) ? '#000000' : '#FFFFFF',
                    }}
                  >
                    <Lock size={15} />
                    <span>Установить пин-код</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setPinModalTarget('app');
                        setPinModalMode('change');
                      }}
                      className="flex-1 py-2.5 px-4 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 hover:opacity-85 active:scale-[0.98] transition cursor-pointer"
                      style={{
                        borderColor: cardBorder,
                        backgroundColor: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)',
                        color: theme.text,
                      }}
                    >
                      <span>Изменить пин-код</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPinModalTarget('app');
                        setPinModalMode('disable');
                      }}
                      className="py-2.5 px-4 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 text-red-500 hover:bg-red-500/10 active:scale-[0.98] transition cursor-pointer"
                      style={{
                        borderColor: hexToRgba('#EF4444', 0.25),
                      }}
                    >
                      <span>Отключить</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Quick Test Lock when PIN is active */}
            {appPin && (
              <div className="p-4 rounded-3xl border flex items-center justify-between" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
                <div className="text-xs font-semibold opacity-75">
                  Заблокировать экран сейчас
                </div>
                <button
                  type="button"
                  onClick={lockApp}
                  className="py-2 px-3.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 hover:opacity-80 active:scale-95 transition cursor-pointer"
                  style={{ borderColor: cardBorder, color: theme.text }}
                >
                  <Lock size={13} />
                  <span>Заблокировать</span>
                </button>
              </div>
            )}

            {/* Private Space Security Setting */}
            <div className="p-5 rounded-3xl border space-y-4" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
                    style={{
                      backgroundColor: hexToRgba(theme.accent, isLight ? 0.12 : 0.18),
                      color: theme.accent,
                    }}
                  >
                    <Shield size={22} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="text-sm font-bold tracking-tight">Приватное пространство</div>
                    <div className="text-xs opacity-50 mt-0.5">
                      {privatePin ? 'Защищено отдельным пин-кодом (от 1 до 12 цифр)' : 'Отдельный скрытый раздел для конфиденциальных заметок'}
                    </div>
                  </div>
                </div>

                <div
                  className="px-3 py-1 rounded-full text-xs font-bold tracking-wide"
                  style={{
                    backgroundColor: privatePin ? hexToRgba(theme.accent, 0.15) : hexToRgba(theme.text, 0.08),
                    color: privatePin ? theme.accent : hexToRgba(theme.text, 0.6),
                  }}
                >
                  {privatePin ? 'Включено' : 'Выключено'}
                </div>
              </div>

              {/* Private Space Actions */}
              <div className="pt-2 border-t flex flex-col sm:flex-row gap-2.5" style={{ borderColor: cardBorder }}>
                {!privatePin ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPinModalTarget('private');
                      setPinModalMode('set');
                    }}
                    className="w-full py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer shadow-sm"
                    style={{
                      backgroundColor: theme.accent,
                      color: isLightColor(theme.accent) ? '#000000' : '#FFFFFF',
                    }}
                  >
                    <Shield size={15} />
                    <span>Настроить пин-код привата</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setPinModalTarget('private');
                        setPinModalMode('change');
                      }}
                      className="flex-1 py-2.5 px-4 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 hover:opacity-85 active:scale-[0.98] transition cursor-pointer"
                      style={{
                        borderColor: cardBorder,
                        backgroundColor: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)',
                        color: theme.text,
                      }}
                    >
                      <span>Изменить пин</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPinModalTarget('private');
                        setPinModalMode('disable');
                      }}
                      className="py-2.5 px-4 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 text-red-500 hover:bg-red-500/10 active:scale-[0.98] transition cursor-pointer"
                      style={{
                        borderColor: hexToRgba('#EF4444', 0.25),
                      }}
                    >
                      <span>Отключить</span>
                    </button>
                  </>
                )}
              </div>

              {/* Private Space Quick Actions */}
              {privatePin && (
                <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: hexToRgba(theme.text, 0.08) }}>
                  <div className="text-xs font-semibold opacity-75">
                    Статус хранилища: {isPrivateLocked ? 'Заблокировано' : 'Разблокировано'}
                  </div>
                  {!isPrivateLocked && (
                    <button
                      type="button"
                      onClick={lockPrivateSpace}
                      className="py-1.5 px-3 rounded-xl border font-bold text-xs flex items-center gap-1.5 hover:opacity-80 active:scale-95 transition cursor-pointer"
                      style={{ borderColor: cardBorder, color: theme.text }}
                    >
                      <Lock size={12} />
                      <span>Заблокировать</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: Editor */}
        {activeSettingsTab === 'editor' && (
          <div className="space-y-4">
            {/* Launch Screen Setting (Что открывать при запуске) */}
            <div className="p-4 rounded-2xl border space-y-3" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <div className="text-xs font-bold opacity-80">Что открывать при запуске</div>
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: cardBorder }}>
                {/* Option 1: Список заметок */}
                <button
                  onClick={() => setLaunchScreen('notes')}
                  className="w-full flex items-center justify-between p-3.5 border-b text-left hover:opacity-80 transition cursor-pointer"
                  style={{ borderColor: cardBorder, backgroundColor: launchScreen === 'notes' ? hexToRgba(theme.accent, 0.08) : 'transparent' }}
                >
                  <div className="text-xs font-semibold">Список заметок</div>
                  {launchScreen === 'notes' && <Check size={16} style={{ color: theme.accent }} />}
                </button>

                {/* Option 2: Последняя заметка */}
                <button
                  onClick={() => setLaunchScreen('editor')}
                  className="w-full flex items-center justify-between p-3.5 border-b text-left hover:opacity-80 transition cursor-pointer"
                  style={{ borderColor: cardBorder, backgroundColor: launchScreen === 'editor' ? hexToRgba(theme.accent, 0.08) : 'transparent' }}
                >
                  <div className="text-xs font-semibold">Последняя заметка</div>
                  {launchScreen === 'editor' && <Check size={16} style={{ color: theme.accent }} />}
                </button>

                {/* Option 3: Список задач */}
                <button
                  onClick={() => setLaunchScreen('tasks')}
                  className="w-full flex items-center justify-between p-3.5 text-left hover:opacity-80 transition cursor-pointer"
                  style={{ backgroundColor: launchScreen === 'tasks' ? hexToRgba(theme.accent, 0.08) : 'transparent' }}
                >
                  <div className="text-xs font-semibold">Список задач</div>
                  {launchScreen === 'tasks' && <Check size={16} style={{ color: theme.accent }} />}
                </button>
              </div>
            </div>

            {/* Typography & System Styling */}
            <div className="p-4 rounded-2xl border space-y-4" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              {/* Font Size */}
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>Размер шрифта</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuickSettings(prev => ({ ...prev, fontSize: Math.max(10, prev.fontSize - 1) }))}
                    className="w-8 h-8 rounded-xl border hover:opacity-80 active:scale-95 transition flex items-center justify-center font-bold text-sm cursor-pointer"
                    style={{ borderColor: cardBorder }}
                  >
                    -
                  </button>
                  <span className="font-bold w-10 text-center text-sm">{quickSettings.fontSize}</span>
                  <button
                    onClick={() => setQuickSettings(prev => ({ ...prev, fontSize: Math.min(32, prev.fontSize + 1) }))}
                    className="w-8 h-8 rounded-xl border hover:opacity-80 active:scale-95 transition flex items-center justify-center font-bold text-sm cursor-pointer"
                    style={{ borderColor: cardBorder }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Line Height */}
              <div className="flex items-center justify-between text-xs font-semibold pt-3 border-t" style={{ borderColor: cardBorder }}>
                <span>Межстрочный интервал</span>
                <CustomSelect
                  value={quickSettings.lineHeight || 1.6}
                  onChange={val => setQuickSettings(prev => ({ ...prev, lineHeight: val }))}
                  options={LINE_HEIGHT_OPTIONS}
                />
              </div>

              {/* Font Family */}
              <div className="flex items-center justify-between text-xs font-semibold pt-3 border-t" style={{ borderColor: cardBorder }}>
                <span>Шрифт во всей системе</span>
                <CustomSelect
                  value={quickSettings.fontFamily || 'sans'}
                  onChange={val => setQuickSettings(prev => ({ ...prev, fontFamily: val }))}
                  options={FONT_FAMILY_OPTIONS}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB: AI Usage */}
        {activeSettingsTab === 'ai' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl border space-y-3" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>ИИ Модель</span>
                <span className="font-bold" style={{ color: theme.accent }}>Gemini 3.6 Flash</span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>Режим обработки</span>
                <span className="opacity-60">Серверный прокси (/api/ai/process)</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Data */}
        {activeSettingsTab === 'data' && (
          <div className="space-y-4">
            {/* Plashka 1: Import Notes from multiple formats */}
            <div className="p-4 rounded-2xl border space-y-3" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <div className="text-sm font-bold">Импорт заметок и файлов</div>
              <p className="text-xs opacity-70 leading-relaxed">
                Импортируйте документы, книги, таблицы и изображения с автоматическим распознаванием структуры и вложений.
              </p>

              {/* Upload Dropzone / Button */}
              <label
                className={`w-full p-4 rounded-xl border border-dashed flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition active:scale-[0.99] ${
                  isImporting ? 'opacity-50 pointer-events-none' : 'hover:bg-white/5'
                }`}
                style={{
                  borderColor: theme.accent,
                  backgroundColor: hexToRgba(theme.accent, 0.05),
                }}
              >
                <input
                  type="file"
                  multiple
                  accept=".pdf,.txt,.epub,.fb2,.docx,.md,.markdown,.html,.htm,.json,.cvt,.csv,.tsv,.tab,.rtf,.png,.jpg,.jpeg,.webp,.gif,.svg,.bmp,.avif,.ico,.tiff"
                  className="hidden"
                  onChange={e => handleFileImport(e.target.files)}
                  disabled={isImporting}
                />
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: hexToRgba(theme.accent, 0.2), color: theme.accent }}
                >
                  {isImporting ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Upload size={20} />
                  )}
                </div>
                <div className="text-xs font-bold" style={{ color: theme.text }}>
                  {isImporting ? 'Импортирование файлов...' : 'Нажмите для выбора или перетащите файлы сюда'}
                </div>
                <div className="text-[10px] opacity-60">
                  Поддерживается выбор нескольких файлов одновременно
                </div>
              </label>

              {/* Import status notification */}
              {importNotice && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border animate-fadeIn ${
                    importNotice.type === 'success'
                      ? 'bg-green-500/15 border-green-500/30 text-green-400'
                      : 'bg-red-500/15 border-red-500/30 text-red-400'
                  }`}
                >
                  {importNotice.type === 'success' ? (
                    <CheckCircle2 size={16} className="shrink-0" />
                  ) : (
                    <AlertTriangle size={16} className="shrink-0" />
                  )}
                  <span>{importNotice.message}</span>
                </div>
              )}
            </div>

            {/* Plashka 2: Export Data */}
            <div className="p-4 rounded-2xl border space-y-3" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <div className="text-sm font-bold">Экспорт данных</div>
              <p className="text-xs opacity-70 leading-relaxed">
                Экспортируйте выбранную заметку в любой текстовый формат или сохраните полный резервный файл.
              </p>

              <div className="space-y-2 pt-1">
                {/* Note export button (triggers Note selection modal) */}
                <button
                  onClick={() => openExportModal()}
                  className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl border text-xs font-bold transition active:scale-[0.99] cursor-pointer hover:opacity-90"
                  style={{
                    backgroundColor: hexToRgba(theme.accent, 0.12),
                    borderColor: hexToRgba(theme.accent, 0.35),
                    color: theme.accent,
                  }}
                >
                  <Download size={16} />
                  <span>Экспорт заметки в файл...</span>
                </button>

                {/* Full JSON backup export button */}
                <button
                  onClick={exportData}
                  className="w-full flex items-center justify-between p-3 rounded-xl border text-xs font-semibold hover:opacity-80 transition cursor-pointer"
                  style={{ borderColor: cardBorder, backgroundColor: hexToRgba(theme.text, 0.02) }}
                >
                  <span className="flex items-center gap-2 opacity-85">
                    <Download size={14} /> Полный бэкап приложения (JSON)
                  </span>
                  <span className="opacity-50 text-[11px]">Скачать всё</span>
                </button>
              </div>
            </div>

            {/* Plashka 3: Reset Data */}
            <div className="p-4 rounded-2xl border space-y-3" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <div className="text-sm font-bold text-red-500">Сброс данных</div>
              <p className="text-xs opacity-60">
                Удаляет все заметки, списки задач, теги и всю сохраненную историю.
              </p>
              <button
                onClick={() => {
                  setResetConfirmInput('');
                  setIsResetConfirmOpen(true);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold text-red-500 hover:bg-red-500/10 active:scale-[0.99] transition cursor-pointer"
                style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}
              >
                <span className="flex items-center gap-2">
                  <RefreshCw size={15} /> Сбросить все данные
                </span>
                <span>Сбросить</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB: AI & Web Search */}
        {activeSettingsTab === 'ai' && (
          <div className="space-y-4">
            {/* Web Search Engine (Tavily BYOK) */}
            <div
              className="p-4 sm:p-5 rounded-2xl border space-y-4 shadow-xs"
              style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="p-2 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: hexToRgba(theme.accent, 0.15),
                      color: theme.accent,
                    }}
                  >
                    <Globe size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold">Веб-поиск</h3>
                    <p className="text-xs opacity-60 mt-0.5">
                      Поиск информации и формирование саммари через Tavily API (BYOK)
                    </p>
                  </div>
                </div>

                <div
                  className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold shrink-0"
                  style={{
                    backgroundColor: webSearchSettings.tavilyApiKey.trim()
                      ? 'rgba(34, 197, 94, 0.15)'
                      : hexToRgba(theme.text, 0.08),
                    color: webSearchSettings.tavilyApiKey.trim() ? '#22C55E' : hexToRgba(theme.text, 0.6),
                  }}
                >
                  {webSearchSettings.tavilyApiKey.trim() ? 'Ключ активен' : 'Ключ не задан'}
                </div>
              </div>

              {/* API Key Input */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-bold opacity-80 block">
                  API-ключ Tavily (BYOK)
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showTavilyKey ? 'text' : 'password'}
                    value={webSearchSettings.tavilyApiKey}
                    onChange={e =>
                      setWebSearchSettings(prev => ({
                        ...prev,
                        tavilyApiKey: e.target.value,
                      }))
                    }
                    placeholder="tvly-xxxxxxxxxxxxxxxxxxxx"
                    className="w-full py-2.5 pl-3.5 pr-10 rounded-xl border text-xs font-mono outline-hidden transition"
                    style={{
                      backgroundColor: hexToRgba(theme.text, 0.04),
                      borderColor: webSearchSettings.tavilyApiKey.trim()
                        ? hexToRgba(theme.accent, 0.5)
                        : cardBorder,
                      color: theme.text,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowTavilyKey(prev => !prev)}
                    className="absolute right-3 opacity-60 hover:opacity-100 transition cursor-pointer"
                    title={showTavilyKey ? 'Скрыть ключ' : 'Показать ключ'}
                  >
                    {showTavilyKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-0.5">
                  <span className="opacity-60">Ключ сохраняется локально в вашем браузере</span>
                  <a
                    href="https://tavily.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-bold hover:underline transition"
                    style={{ color: theme.accent }}
                  >
                    <span>Получить ключ на tavily.com</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
              </div>

              {/* Tavily Power & Search Depth Settings */}
              <div
                className="p-3.5 rounded-xl border space-y-3.5"
                style={{
                  backgroundColor: hexToRgba(theme.text, 0.02),
                  borderColor: hexToRgba(theme.text, 0.08),
                }}
              >
                <div className="text-xs font-bold opacity-90">
                  Настройки мощности поиска
                </div>

                {/* Depth setting */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold opacity-75">Глубина поиска:</span>
                    <span className="font-mono text-[11px] opacity-60">
                      {webSearchSettings.searchDepth === 'advanced' ? '2 кредита / запрос' : '1 кредит / запрос'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setWebSearchSettings(prev => ({ ...prev, searchDepth: 'basic' }))
                      }
                      className="p-2.5 rounded-xl border text-left transition cursor-pointer"
                      style={{
                        backgroundColor:
                          webSearchSettings.searchDepth === 'basic'
                            ? hexToRgba(theme.accent, 0.15)
                            : 'transparent',
                        borderColor:
                          webSearchSettings.searchDepth === 'basic'
                            ? theme.accent
                            : hexToRgba(theme.text, 0.12),
                      }}
                    >
                      <div className="text-xs font-bold">Быстрый</div>
                      <div className="text-[10px] opacity-60 mt-0.5">1 кредит • Стандартный поиск</div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setWebSearchSettings(prev => ({ ...prev, searchDepth: 'advanced' }))
                      }
                      className="p-2.5 rounded-xl border text-left transition cursor-pointer"
                      style={{
                        backgroundColor:
                          webSearchSettings.searchDepth === 'advanced'
                            ? hexToRgba(theme.accent, 0.15)
                            : 'transparent',
                        borderColor:
                          webSearchSettings.searchDepth === 'advanced'
                            ? theme.accent
                            : hexToRgba(theme.text, 0.12),
                      }}
                    >
                      <div className="text-xs font-bold">Глубокий</div>
                      <div className="text-[10px] opacity-60 mt-0.5">2 кредита • Анализ источников</div>
                    </button>
                  </div>
                </div>

                {/* Answer detail setting */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <div>
                    <div className="font-semibold opacity-75">Детализация саммари:</div>
                    <div className="text-[10px] opacity-50">Уровень подробности сгенерированного ответа</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setWebSearchSettings(prev => ({ ...prev, answerDetail: 'basic' }))
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        webSearchSettings.answerDetail === 'basic' ? 'shadow-xs' : 'opacity-60'
                      }`}
                      style={{
                        backgroundColor:
                          webSearchSettings.answerDetail === 'basic'
                            ? theme.accent
                            : hexToRgba(theme.text, 0.08),
                        color: webSearchSettings.answerDetail === 'basic' ? '#FFFFFF' : theme.text,
                      }}
                    >
                      Кратко
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setWebSearchSettings(prev => ({ ...prev, answerDetail: 'advanced' }))
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        webSearchSettings.answerDetail === 'advanced' ? 'shadow-xs' : 'opacity-60'
                      }`}
                      style={{
                        backgroundColor:
                          webSearchSettings.answerDetail === 'advanced'
                            ? theme.accent
                            : hexToRgba(theme.text, 0.08),
                        color: webSearchSettings.answerDetail === 'advanced' ? '#FFFFFF' : theme.text,
                      }}
                    >
                      Подробно
                    </button>
                  </div>
                </div>

                {/* Max Results setting */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <div>
                    <div className="font-semibold opacity-75">Количество источников:</div>
                    <div className="text-[10px] opacity-50">Число отображаемых ссылок на сайты</div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[3, 5, 7, 10].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() =>
                          setWebSearchSettings(prev => ({ ...prev, maxResults: num }))
                        }
                        className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                          webSearchSettings.maxResults === num ? 'shadow-xs' : 'opacity-60'
                        }`}
                        style={{
                          backgroundColor:
                            webSearchSettings.maxResults === num
                              ? theme.accent
                              : hexToRgba(theme.text, 0.08),
                          color: webSearchSettings.maxResults === num ? '#FFFFFF' : theme.text,
                        }}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Other */}
        {activeSettingsTab === 'other' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl border space-y-3" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <div className="text-sm font-bold">Наши сообщества и соцсети</div>
              <p className="text-xs opacity-70 leading-relaxed">
                Следите за обновлениями, новостями и делитесь впечатлениями на официальных страницах Veris Note.
              </p>

              <div className="space-y-2 pt-1">
                {/* YouTube */}
                <a
                  href="https://youtube.com/@verisnote"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between p-3 rounded-xl border text-xs font-semibold hover:opacity-85 active:scale-[0.99] transition cursor-pointer"
                  style={{
                    borderColor: cardBorder,
                    backgroundColor: hexToRgba(theme.text, 0.03),
                    color: theme.text,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/15 text-red-500 shrink-0">
                      <Youtube size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-xs">YouTube</div>
                      <div className="text-[10px] opacity-60">@verisnote</div>
                    </div>
                  </div>
                  <ExternalLink size={14} className="opacity-40" />
                </a>

                {/* TikTok */}
                <a
                  href="https://www.tiktok.com/@verisnote?_r=1&_t=ZS-98wNXXyC8ON"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between p-3 rounded-xl border text-xs font-semibold hover:opacity-85 active:scale-[0.99] transition cursor-pointer"
                  style={{
                    borderColor: cardBorder,
                    backgroundColor: hexToRgba(theme.text, 0.03),
                    color: theme.text,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-cyan-500/15 text-cyan-400 shrink-0">
                      <Video size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-xs">TikTok</div>
                      <div className="text-[10px] opacity-60">@verisnote</div>
                    </div>
                  </div>
                  <ExternalLink size={14} className="opacity-40" />
                </a>

                {/* Instagram */}
                <a
                  href="https://www.instagram.com/verisnote?igsh=MXIwbG95N3ZhOW5icg=="
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between p-3 rounded-xl border text-xs font-semibold hover:opacity-85 active:scale-[0.99] transition cursor-pointer"
                  style={{
                    borderColor: cardBorder,
                    backgroundColor: hexToRgba(theme.text, 0.03),
                    color: theme.text,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-pink-500/15 text-pink-500 shrink-0">
                      <Instagram size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-xs">Instagram</div>
                      <div className="text-[10px] opacity-60">@verisnote</div>
                    </div>
                  </div>
                  <ExternalLink size={14} className="opacity-40" />
                </a>

                {/* Pinterest */}
                <a
                  href="https://pin.it/1MhiRppt2"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between p-3 rounded-xl border text-xs font-semibold hover:opacity-85 active:scale-[0.99] transition cursor-pointer"
                  style={{
                    borderColor: cardBorder,
                    backgroundColor: hexToRgba(theme.text, 0.03),
                    color: theme.text,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-600/15 text-red-600 shrink-0">
                      <Pin size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-xs">Pinterest</div>
                      <div className="text-[10px] opacity-60">pin.it/1MhiRppt2</div>
                    </div>
                  </div>
                  <ExternalLink size={14} className="opacity-40" />
                </a>

                {/* Telegram */}
                <a
                  href="https://t.me/VerisNote"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between p-3 rounded-xl border text-xs font-semibold hover:opacity-85 active:scale-[0.99] transition cursor-pointer"
                  style={{
                    borderColor: cardBorder,
                    backgroundColor: hexToRgba(theme.text, 0.03),
                    color: theme.text,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-sky-500/15 text-sky-400 shrink-0">
                      <Send size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-xs">Telegram-канал</div>
                      <div className="text-[10px] opacity-60">t.me/VerisNote</div>
                    </div>
                  </div>
                  <ExternalLink size={14} className="opacity-40" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Reset All Data */}
      {isResetConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
          onClick={() => setIsResetConfirmOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5 shadow-2xl border backdrop-blur-2xl animate-scaleUp"
            style={{
              backgroundColor: hexToRgba(theme.bg, 0.95),
              color: theme.text,
              borderColor: cardBorder,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b" style={{ borderColor: cardBorder }}>
              <div className="flex items-center gap-2 text-red-500 font-extrabold text-sm">
                <AlertTriangle size={18} />
                <span>Подтверждение сброса</span>
              </div>
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
                style={{ color: theme.text }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-3 mb-5 text-xs">
              <p className="opacity-80 leading-relaxed">
                Вы собираетесь полностью удалить все заметки, списки задач, теги и настройки.
                Это действие <span className="font-bold text-red-400">необратимо</span>.
              </p>
              <p className="font-semibold opacity-90">
                Для подтверждения введите слово <span className="font-black text-amber-400 select-all tracking-wide">Veris</span>:
              </p>
              <input
                type="text"
                value={resetConfirmInput}
                onChange={e => setResetConfirmInput(e.target.value)}
                placeholder="Veris"
                autoFocus
                className="w-full px-3 py-2 rounded-xl border text-sm font-bold bg-transparent outline-none focus:ring-2 focus:ring-red-500/50 transition"
                style={{
                  borderColor: cardBorder,
                  color: theme.text,
                  backgroundColor: hexToRgba(theme.text, 0.05),
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && resetConfirmInput.trim().toLowerCase() === 'veris') {
                    resetAllData();
                    setIsResetConfirmOpen(false);
                    setResetConfirmInput('');
                  }
                }}
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsResetConfirmOpen(false);
                  setResetConfirmInput('');
                }}
                className="px-3.5 py-2 rounded-xl border font-bold text-xs hover:bg-white/10 active:scale-95 transition cursor-pointer"
                style={{ borderColor: cardBorder, color: theme.text }}
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={resetConfirmInput.trim().toLowerCase() !== 'veris'}
                onClick={() => {
                  if (resetConfirmInput.trim().toLowerCase() === 'veris') {
                    resetAllData();
                    setIsResetConfirmOpen(false);
                    setResetConfirmInput('');
                  }
                }}
                className={`px-4 py-2 rounded-xl font-extrabold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                  resetConfirmInput.trim().toLowerCase() === 'veris'
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg active:scale-95'
                    : 'opacity-40 cursor-not-allowed bg-red-600/30 text-red-200'
                }`}
              >
                <RefreshCw size={13} />
                <span>Подтверждаю</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Setup/Change/Disable Modal */}
      {pinModalMode && (
        <PinModal
          mode={pinModalMode}
          target={pinModalTarget}
          onClose={() => setPinModalMode(null)}
        />
      )}
    </div>
  );
};
