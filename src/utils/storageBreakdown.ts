/**
 * Storage Breakdown Utility
 * Measures the live disk and memory footprint of the web application
 * categorized by notes, tasks, web history, AI dialogs, semantic search models, and settings.
 */

export interface StorageCategoryItem {
  id: 'notes' | 'tasks' | 'webHistory' | 'aiDialogs' | 'semanticModel' | 'settings' | 'other';
  label: string;
  description: string;
  bytes: number;
  formattedSize: string;
  percentage: number;
  countInfo?: string;
  color: string;
}

export interface StorageBreakdownResult {
  totalBytes: number;
  totalFormatted: string;
  quotaBytes?: number;
  quotaFormatted?: string;
  usagePercentOfQuota?: number;
  categories: StorageCategoryItem[];
  lastCalculatedAt: number;
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 Б';
  const k = 1024;
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : (val => (val >= 100 ? 0 : 1))(bytes / Math.pow(k, i))));
  return `${val} ${sizes[i]}`;
}

function getSafeStringBytes(str: string): number {
  try {
    return new Blob([str]).size;
  } catch {
    return str.length * 2;
  }
}

/**
 * Measure the size of an IndexedDB database
 */
async function measureIndexedDBSize(dbName: string): Promise<number> {
  if (typeof indexedDB === 'undefined') return 0;
  return new Promise<number>((resolve) => {
    try {
      const request = indexedDB.open(dbName);
      request.onerror = () => resolve(0);
      request.onupgradeneeded = (e: any) => {
        // If it doesn't exist yet, abort creating it empty
        e.target.transaction?.abort();
        resolve(0);
      };
      request.onsuccess = () => {
        const db = request.result;
        try {
          const storeNames = Array.from(db.objectStoreNames);
          if (storeNames.length === 0) {
            db.close();
            return resolve(0);
          }
          const tx = db.transaction(storeNames, 'readonly');
          let totalBytes = 0;
          let pending = storeNames.length;

          storeNames.forEach(storeName => {
            try {
              const store = tx.objectStore(storeName);
              const getAllReq = store.getAll();
              getAllReq.onsuccess = () => {
                try {
                  const data = getAllReq.result;
                  if (data) {
                    const jsonStr = JSON.stringify(data);
                    totalBytes += getSafeStringBytes(jsonStr);
                  }
                } catch {}
                pending--;
                if (pending === 0) {
                  db.close();
                  resolve(totalBytes);
                }
              };
              getAllReq.onerror = () => {
                pending--;
                if (pending === 0) {
                  db.close();
                  resolve(totalBytes);
                }
              };
            } catch {
              pending--;
              if (pending === 0) {
                db.close();
                resolve(totalBytes);
              }
            }
          });
        } catch {
          db.close();
          resolve(0);
        }
      };
    } catch {
      resolve(0);
    }
  });
}

/**
 * Measure Cache API usage (e.g. HuggingFace / Transformers.js model weights)
 */
async function measureCacheApiSize(): Promise<{ totalCacheBytes: number; modelCacheBytes: number }> {
  let totalCacheBytes = 0;
  let modelCacheBytes = 0;

  if (typeof caches === 'undefined') {
    return { totalCacheBytes, modelCacheBytes };
  }

  try {
    const cacheKeys = await caches.keys();
    for (const key of cacheKeys) {
      try {
        const cache = await caches.open(key);
        const requests = await cache.keys();
        const isModelCache = key.toLowerCase().includes('transformers') || key.toLowerCase().includes('xenova') || key.toLowerCase().includes('onnx');

        for (const req of requests) {
          try {
            const resp = await cache.match(req);
            if (resp) {
              const blob = await resp.clone().blob();
              totalCacheBytes += blob.size;
              if (isModelCache) {
                modelCacheBytes += blob.size;
              }
            }
          } catch {}
        }
      } catch {}
    }
  } catch {}

  return { totalCacheBytes, modelCacheBytes };
}

export async function calculateStorageBreakdown(): Promise<StorageBreakdownResult> {
  let notesBytes = 0;
  let tasksBytes = 0;
  let webHistoryBytes = 0;
  let aiDialogsBytes = 0;
  let semanticModelBytes = 0;
  let settingsBytes = 0;
  let otherBytes = 0;

  let notesCount = 0;
  let tasksCount = 0;
  let webHistoryCount = 0;
  let aiSessionsCount = 0;

  // 1. Scan all LocalStorage items
  if (typeof localStorage !== 'undefined') {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const val = localStorage.getItem(key) || '';
      const itemBytes = getSafeStringBytes(key) + getSafeStringBytes(val);

      if (key.startsWith('veris_notes') || key.startsWith('veris_deleted_notes') || key.startsWith('veris_blocks') || key.startsWith('veris_tags') || key.startsWith('veris_priorities')) {
        notesBytes += itemBytes;
        if (key.startsWith('veris_notes') && !key.includes('deleted')) {
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) notesCount += parsed.length;
          } catch {}
        }
      } else if (key.startsWith('veris_task') || key.startsWith('veris_deleted_task') || key.startsWith('veris_kanban') || key.startsWith('veris_deleted_kanban') || key.startsWith('veris_calendar') || key.startsWith('veris_deleted_calendar')) {
        tasksBytes += itemBytes;
        if (key.startsWith('veris_task_lists') && !key.includes('deleted')) {
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) {
              parsed.forEach((list: any) => {
                tasksCount += (list.tasks?.length || 0);
              });
            }
          } catch {}
        }
      } else if (key.startsWith('veris_web_search')) {
        webHistoryBytes += itemBytes;
        if (key.startsWith('veris_web_search_history')) {
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) webHistoryCount += parsed.length;
          } catch {}
        }
      } else if (key.startsWith('veris_anacrusa') || key.startsWith('veris_ai')) {
        aiDialogsBytes += itemBytes;
        if (key.startsWith('veris_anacrusa_sessions')) {
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) aiSessionsCount += parsed.length;
          } catch {}
        }
      } else if (key.startsWith('veris_semantic')) {
        semanticModelBytes += itemBytes;
      } else if (
        key.startsWith('veris_theme') ||
        key.startsWith('veris_quick_settings') ||
        key.startsWith('veris_custom_themes') ||
        key.startsWith('veris_workspaces') ||
        key.startsWith('veris_language') ||
        key.startsWith('veris_shortcuts') ||
        key.startsWith('veris_sidebar') ||
        key.startsWith('veris_pin') ||
        key.startsWith('veris_trash')
      ) {
        settingsBytes += itemBytes;
      } else {
        otherBytes += itemBytes;
      }
    }
  }

  // 2. Measure IndexedDB databases
  const mainDbBytes = await measureIndexedDBSize('veris_notes_storage_db');
  notesBytes += mainDbBytes;

  const vectorDbBytes = await measureIndexedDBSize('veris_semantic_vectors_db');
  semanticModelBytes += vectorDbBytes;

  // 3. Measure Cache API (Transformers.js ONNX weights & cache)
  const { totalCacheBytes, modelCacheBytes } = await measureCacheApiSize();
  semanticModelBytes += modelCacheBytes;
  const nonModelCache = Math.max(0, totalCacheBytes - modelCacheBytes);
  otherBytes += nonModelCache;

  // 4. Query navigator.storage.estimate() for true total origin usage
  let systemEstimatedTotal: number | undefined;
  let quotaBytes: number | undefined;

  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      if (typeof estimate.usage === 'number' && estimate.usage > 0) {
        systemEstimatedTotal = estimate.usage;
      }
      if (typeof estimate.quota === 'number' && estimate.quota > 0) {
        quotaBytes = estimate.quota;
      }
    } catch {}
  }

  const measuredSum = notesBytes + tasksBytes + webHistoryBytes + aiDialogsBytes + semanticModelBytes + settingsBytes + otherBytes;
  let totalBytes = measuredSum;

  if (systemEstimatedTotal && systemEstimatedTotal > measuredSum) {
    // Difference is browser overhead, web fonts, service worker scripts, app shell
    const difference = systemEstimatedTotal - measuredSum;
    otherBytes += difference;
    totalBytes = systemEstimatedTotal;
  } else if (systemEstimatedTotal && systemEstimatedTotal < measuredSum) {
    totalBytes = measuredSum;
  }

  if (totalBytes === 0) {
    totalBytes = 1024; // baseline min display
  }

  const calcPercentage = (bytes: number) => {
    return totalBytes > 0 ? Math.round((bytes / totalBytes) * 100) : 0;
  };

  const categories: StorageCategoryItem[] = [
    {
      id: 'notes',
      label: 'Заметки',
      description: 'Тексты заметок, блоки, теги и вложения',
      bytes: notesBytes,
      formattedSize: formatBytes(notesBytes),
      percentage: calcPercentage(notesBytes),
      countInfo: notesCount > 0 ? `${notesCount} заметок` : undefined,
      color: '#3B82F6', // Blue
    },
    {
      id: 'tasks',
      label: 'Задачи',
      description: 'Списки дел, чек-листы, канбан и календарь',
      bytes: tasksBytes,
      formattedSize: formatBytes(tasksBytes),
      percentage: calcPercentage(tasksBytes),
      countInfo: tasksCount > 0 ? `${tasksCount} задач` : undefined,
      color: '#10B981', // Emerald
    },
    {
      id: 'webHistory',
      label: 'Веб-история',
      description: 'История веб-поиска, превью страниц и кэш',
      bytes: webHistoryBytes,
      formattedSize: formatBytes(webHistoryBytes),
      percentage: calcPercentage(webHistoryBytes),
      countInfo: webHistoryCount > 0 ? `${webHistoryCount} запросов` : undefined,
      color: '#06B6D4', // Cyan
    },
    {
      id: 'aiDialogs',
      label: 'ИИ диалоги',
      description: 'Сессии и сообщения ассистента Anacrusa',
      bytes: aiDialogsBytes,
      formattedSize: formatBytes(aiDialogsBytes),
      percentage: calcPercentage(aiDialogsBytes),
      countInfo: aiSessionsCount > 0 ? `${aiSessionsCount} сессий` : undefined,
      color: '#8B5CF6', // Purple
    },
    {
      id: 'semanticModel',
      label: 'Семантическая модель',
      description: 'Векторная база знаний и кэш нейромоделей',
      bytes: semanticModelBytes,
      formattedSize: formatBytes(semanticModelBytes),
      percentage: calcPercentage(semanticModelBytes),
      color: '#EC4899', // Pink
    },
    {
      id: 'settings',
      label: 'Настройки',
      description: 'Темы оформления, палитры и профили',
      bytes: settingsBytes,
      formattedSize: formatBytes(settingsBytes),
      percentage: calcPercentage(settingsBytes),
      color: '#F59E0B', // Amber
    },
    {
      id: 'other',
      label: 'Системные данные',
      description: 'Кэш приложения, шрифты и служебные индексы',
      bytes: otherBytes,
      formattedSize: formatBytes(otherBytes),
      percentage: calcPercentage(otherBytes),
      color: '#64748B', // Slate
    },
  ];

  return {
    totalBytes,
    totalFormatted: formatBytes(totalBytes),
    quotaBytes,
    quotaFormatted: quotaBytes ? formatBytes(quotaBytes) : undefined,
    usagePercentOfQuota: quotaBytes && quotaBytes > 0 ? Math.min(100, Math.round((totalBytes / quotaBytes) * 100)) : undefined,
    categories,
    lastCalculatedAt: Date.now(),
  };
}
