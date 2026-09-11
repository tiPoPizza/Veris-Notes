import { pipeline, env } from '@xenova/transformers';
import { Note } from '../types';
import { stripHtmlTags } from '../utils/textUtils';

// Configure browser environment for Transformers.js
if (typeof window !== 'undefined') {
  env.allowLocalModels = false;
  env.useBrowserCache = true;
}

export interface HuggingFaceModelInfo {
  id: string;
  name: string;
  repo: string;
  sizeMB: number;
  description: string;
  languages: string;
  speed: 'ultra-fast' | 'fast' | 'standard';
  dimensions: number;
}

export const HF_SEMANTIC_MODELS: HuggingFaceModelInfo[] = [
  {
    id: 'paraphrase-minilm-l3-v2',
    name: 'Paraphrase MiniLM-L3',
    repo: 'Xenova/paraphrase-MiniLM-L3-v2',
    sizeMB: 17,
    description: 'Сверхкомпактная 3-слойная модель. Практически мгновенная загрузка и минимальный расход ресурсов.',
    languages: 'English + Базовый Multilingual',
    speed: 'ultra-fast',
    dimensions: 384,
  },
  {
    id: 'all-minilm-l6-v2',
    name: 'All-MiniLM-L6-v2',
    repo: 'Xenova/all-MiniLM-L6-v2',
    sizeMB: 23,
    description: 'Самая лёгкая и сверхбыстрая модель. Минимальный расход батареи и оперативной памяти.',
    languages: 'English + Базовый Multilingual',
    speed: 'ultra-fast',
    dimensions: 384,
  },
  {
    id: 'rubert-tiny2',
    name: 'RuBERT Tiny 2',
    repo: 'Xenova/rubert-tiny2',
    sizeMB: 29,
    description: 'Специализированная мини-модель для русского языка. Отлично понимает падежи, морфологию и русский контекст.',
    languages: 'Русский, English',
    speed: 'ultra-fast',
    dimensions: 312,
  },
  {
    id: 'all-minilm-l12-v2',
    name: 'All-MiniLM-L12-v2',
    repo: 'Xenova/all-MiniLM-L12-v2',
    sizeMB: 33,
    description: 'Компактная быстрая модель с удвоенным числом слоев для повышенной точности поиска.',
    languages: 'English + Базовый Multilingual',
    speed: 'ultra-fast',
    dimensions: 384,
  },
  {
    id: 'bge-small-en-v1.5',
    name: 'BGE Small En v1.5',
    repo: 'Xenova/bge-small-en-v1.5',
    sizeMB: 33,
    description: 'Высокоточная компактная модель от BAAI с превосходным качеством ранжирования текстов.',
    languages: 'English',
    speed: 'fast',
    dimensions: 384,
  },
  {
    id: 'multilingual-e5-small',
    name: 'Multilingual E5 Small',
    repo: 'Xenova/multilingual-e5-small',
    sizeMB: 45,
    description: 'Универсальная мультиязычная модель от Microsoft. Отлично распознаёт русский язык, синонимы и смысл фраз.',
    languages: 'Русский, English + 100 языков',
    speed: 'fast',
    dimensions: 384,
  },
  {
    id: 'bge-base-en-v1.5',
    name: 'BGE Base En v1.5',
    repo: 'Xenova/bge-base-en-v1.5',
    sizeMB: 110,
    description: 'Базовая англоязычная модель BAAI для глубокого сопоставления смысловых конструкций.',
    languages: 'English',
    speed: 'standard',
    dimensions: 768,
  },
  {
    id: 'paraphrase-multilingual-minilm-l12-v2',
    name: 'Multilingual MiniLM-L12',
    repo: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
    sizeMB: 118,
    description: 'Продвинутая модель для длинных заметок, глубоких смысловых аналогий и перефразирований.',
    languages: 'Русский, English + 50 языков',
    speed: 'standard',
    dimensions: 384,
  },
  {
    id: 'multilingual-e5-base',
    name: 'Multilingual E5 Base',
    repo: 'Xenova/multilingual-e5-base',
    sizeMB: 220,
    description: 'Базовая мультиязычная модель высокой точности от Microsoft. Отличный баланс глубины и скорости.',
    languages: 'Русский, English + 100 языков',
    speed: 'standard',
    dimensions: 768,
  },
  {
    id: 'paraphrase-multilingual-mpnet-base-v2',
    name: 'Multilingual MPNet Base',
    repo: 'Xenova/paraphrase-multilingual-mpnet-base-v2',
    sizeMB: 270,
    description: 'Высокоточное векторное семантическое сопоставление сложных предложений на 50+ языках.',
    languages: 'Русский, English + 50 языков',
    speed: 'standard',
    dimensions: 768,
  },
  {
    id: 'bge-large-en-v1.5',
    name: 'BGE Large En v1.5',
    repo: 'Xenova/bge-large-en-v1.5',
    sizeMB: 335,
    description: 'Большая модель глубокого семантического анализа текста с 1024-мерными векторными представлениями.',
    languages: 'English',
    speed: 'standard',
    dimensions: 1024,
  },
  {
    id: 'multilingual-e5-large',
    name: 'Multilingual E5 Large',
    repo: 'Xenova/multilingual-e5-large',
    sizeMB: 560,
    description: 'Флагманская мультиязычная модель максимальной точности для глубинного семантического анализа.',
    languages: 'Русский, English + 100 языков',
    speed: 'standard',
    dimensions: 1024,
  },
];

export interface ModelDownloadProgress {
  status: 'idle' | 'downloading' | 'ready' | 'error';
  progress: number; // 0 - 100
  file?: string;
  loadedBytes?: number;
  totalBytes?: number;
  error?: string;
}

export interface NoteSemanticMatch {
  note: Note;
  score: number; // 0.0 - 1.0 (similarity score)
  snippet?: string;
}

export interface InNoteSemanticMatch {
  chunkIndex: number;
  text: string;
  score: number;
  startIndex: number;
  endIndex: number;
}

// Simple IndexedDB wrapper for vector caching to prevent battery drain
const DB_NAME = 'veris_semantic_vectors_db';
const DB_VERSION = 1;
const STORE_NAME = 'note_embeddings';

interface StoredEmbedding {
  key: string; // `${modelRepo}:${noteId}`
  noteId: string;
  modelRepo: string;
  textHash: string;
  updatedAt: string | number;
  vector: number[];
}

/**
 * Fast Russian & English morphological stemmer for search grounding
 */
export function stemWord(rawWord: string): string {
  const word = rawWord.toLowerCase().trim().replace(/[^a-zа-яё0-9]/gi, '');
  if (word.length <= 3) return word;

  // Russian stemming rules (prefixes/suffixes)
  const ruEndings = [
    'овский', 'евский', 'овская', 'евская', 'овское', 'евское',
    'иями', 'ями', 'ами', 'ыми', 'ими', 'ого', 'его', 'ому', 'ему',
    'ных', 'ных', 'ный', 'ное', 'ная', 'ные', 'ным', 'ном', 'ной',
    'ски', 'ское', 'ская', 'ские', 'ский',
    'ова', 'ева', 'ов', 'ев', 'ях', 'ах', 'ям', 'ам', 'ей', 'ий', 'ой', 'ем', 'ом',
    'ых', 'их', 'ую', 'юю', 'ая', 'яя', 'ое', 'ее', 'ые', 'ие',
    'ся', 'сь', 'ть', 'ет', 'ит', 'ут', 'ют', 'ат', 'ят',
    'а', 'е', 'и', 'й', 'о', 'у', 'ы', 'ь', 'ю', 'я'
  ];

  for (const end of ruEndings) {
    if (word.endsWith(end) && word.length - end.length >= 3) {
      return word.slice(0, -end.length);
    }
  }

  // English stemming rules
  const enEndings = ['ational', 'tional', 'ization', 'ement', 'ative', 'fully', 'ness', 'able', 'ible', 'ting', 'ping', 'ning', 'ing', 'tion', 'sion', 'ment', 'ence', 'ance', 'ies', 'ied', 'es', 'ed', 'ly', 'er', 'or', 'al', 's'];
  for (const end of enEndings) {
    if (word.endsWith(end) && word.length - end.length >= 3) {
      return word.slice(0, -end.length);
    }
  }

  return word;
}

/**
 * Domain semantic concept relations (Bidirectional Knowledge Graph)
 * Augments small on-device models with high-precision domain associations
 */
const CONCEPT_CLUSTERS: string[][] = [
  // Apple & Devices
  [
    'apple', 'яблоко', 'яблочный', 'купертино', 'cupertino', 'айфон', 'iphone', 'айпад',
    'ipad', 'макбук', 'macbook', 'ios', 'макось', 'macos', 'стив джобс', 'apple watch',
    'эппл', 'airpods', 'айфончик', 'айфоны'
  ],
  // Phone & Mobile
  [
    'телефон', 'телефоны', 'смартфон', 'смартфоны', 'мобильный', 'мобила', 'сотовый',
    'айфон', 'iphone', 'андроид', 'android', 'трубка', 'звонок', 'симка', 'номер',
    'гаджет', 'девайс', 'сотка'
  ],
  // Audio & Sound
  [
    'звук', 'звуки', 'звуковой', 'аудио', 'audio', 'голос', 'голосовая', 'голосовой',
    'запись', 'записи', 'диктофон', 'микрофон', 'трек', 'музыка', 'плеер', 'песня',
    'подкаст', 'громкость', 'наушники', 'динамик', 'саунд', 'вокал', 'мелодия', 'mp3', 'wav'
  ],
  // Computer & Hardware
  [
    'компьютер', 'комп', 'пк', 'ноутбук', 'ноут', 'макбук', 'macbook', 'лэптоп',
    'системник', 'монитор', 'клавиатура', 'мышь', 'процессор', 'видеокарта', 'виндовс', 'windows', 'linux'
  ],
  // Money & Finances
  [
    'деньги', 'финансы', 'рубли', 'доллары', 'евро', 'валюта', 'зарплата', 'карта',
    'банк', 'оплата', 'бюджет', 'расход', 'доход', 'счет', 'траты', 'кошелек', 'наличные',
    'кэш', 'биткоин', 'крипта', 'перевод', 'депозит', 'кредит'
  ],
  // Purchases & Stores
  [
    'покупки', 'покупка', 'магазин', 'купить', 'продукты', 'супермаркет', 'заказ',
    'чек', 'шоппинг', 'доставка', 'корзина', 'цена', 'скидка', 'товар', 'купил', 'куплю'
  ],
  // Travel & Transport
  [
    'путешествие', 'поездка', 'билеты', 'билет', 'отель', 'гостиница', 'самолет',
    'аэропорт', 'отпуск', 'море', 'тур', 'виза', 'поезд', 'пляж', 'рейс', 'курорт', 'багаж'
  ],
  // Cars & Auto
  [
    'машина', 'автомобиль', 'авто', 'тачка', 'транспорт', 'гараж', 'парковка',
    'бензин', 'запчасти', 'права', 'мотор', 'тесла', 'bmw', 'мерседес', 'audi', 'водитель', 'трасса'
  ],
  // Work & Tasks
  [
    'работа', 'проект', 'задача', 'задачи', 'таск', 'дедлайн', 'созвон', 'митинг',
    'клиент', 'офис', 'резюме', 'начальник', 'коллега', 'договор', 'встреча', 'отчет', 'план'
  ],
  // Home & Living
  [
    'дом', 'квартира', 'жилье', 'аренда', 'ремонт', 'мебель', 'уборка', 'жкх',
    'ключи', 'дача', 'комната', 'интерьер', 'новоселье'
  ],
  // Health & Medicine
  [
    'здоровье', 'врач', 'доктор', 'больница', 'аптека', 'лекарства', 'таблетки',
    'симптом', 'анализы', 'рецепт', 'спорт', 'тренировка', 'диета', 'витамины', 'пульс', 'давление'
  ],
  // Books & Learning
  [
    'книга', 'книги', 'учеба', 'курс', 'лекция', 'университет', 'экзамен', 'статья',
    'чтение', 'конспект', 'образование', 'урок', 'школа', 'семинар', 'автор'
  ],
];

// Map word -> Set of related concept terms
const CONCEPT_EXPANSION_MAP = new Map<string, Set<string>>();
for (const cluster of CONCEPT_CLUSTERS) {
  for (const term of cluster) {
    const termLower = term.toLowerCase();
    const termStem = stemWord(termLower);
    let set = CONCEPT_EXPANSION_MAP.get(termLower);
    if (!set) {
      set = new Set();
      CONCEPT_EXPANSION_MAP.set(termLower, set);
    }
    if (!CONCEPT_EXPANSION_MAP.has(termStem)) {
      CONCEPT_EXPANSION_MAP.set(termStem, set);
    }
    for (const other of cluster) {
      set.add(other.toLowerCase());
      set.add(stemWord(other.toLowerCase()));
    }
  }
}

class SemanticSearchService {
  private pipelineInstance: any = null;
  private currentLoadedRepo: string | null = null;
  private isInitializing = false;
  private progressListeners = new Set<(progress: ModelDownloadProgress) => void>();
  private currentProgress: ModelDownloadProgress = { status: 'idle', progress: 0 };
  private dbPromise: Promise<IDBDatabase> | null = null;

  // In-memory vector cache for instant < 1ms calculations
  private memoryVectorCache = new Map<string, { vector: Float32Array; textHash: string }>();

  constructor() {
    this.initDB();
  }

  private initDB(): Promise<IDBDatabase> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.reject(new Error('IndexedDB not supported'));
    }
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = event => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return this.dbPromise;
  }

  public subscribeProgress(listener: (progress: ModelDownloadProgress) => void): () => void {
    this.progressListeners.add(listener);
    listener(this.currentProgress);
    return () => this.progressListeners.delete(listener);
  }

  private notifyProgress(progress: ModelDownloadProgress) {
    this.currentProgress = progress;
    this.progressListeners.forEach(fn => {
      try {
        fn(progress);
      } catch (err) {
        console.error('Semantic search progress listener error:', err);
      }
    });
  }

  public isModelCached(repo: string): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(`veris_model_cached_${repo}`) === 'true';
  }

  public async loadModel(repo: string): Promise<boolean> {
    if (this.pipelineInstance && this.currentLoadedRepo === repo) {
      this.notifyProgress({ status: 'ready', progress: 100 });
      return true;
    }

    if (this.isInitializing) return false;
    this.isInitializing = true;

    this.notifyProgress({
      status: 'downloading',
      progress: 5,
      file: 'Инициализация модели...',
    });

    try {
      // Download or load pipeline with progress callback
      const extractor = await pipeline('feature-extraction', repo, {
        quantized: true,
        progress_callback: (data: any) => {
          if (data.status === 'progress' && typeof data.progress === 'number') {
            const pct = Math.min(99, Math.max(5, Math.round(data.progress)));
            this.notifyProgress({
              status: 'downloading',
              progress: pct,
              file: data.file || 'Загрузка весов модели...',
              loadedBytes: data.loaded,
              totalBytes: data.total,
            });
          } else if (data.status === 'initiate') {
            this.notifyProgress({
              status: 'downloading',
              progress: 10,
              file: data.file ? `Подготовка ${data.file}...` : 'Загрузка...',
            });
          } else if (data.status === 'ready') {
            this.notifyProgress({
              status: 'ready',
              progress: 100,
              file: 'Модель готова к работе',
            });
          }
        },
      });

      this.pipelineInstance = extractor;
      this.currentLoadedRepo = repo;
      localStorage.setItem(`veris_model_cached_${repo}`, 'true');

      // Warm up in-memory vector cache from IndexedDB
      this.preloadVectorCache(repo).catch(console.error);

      this.notifyProgress({
        status: 'ready',
        progress: 100,
        file: 'Модель готова к работе',
      });
      this.isInitializing = false;
      return true;
    } catch (err: any) {
      console.error('Failed to initialize semantic search model:', err);
      this.notifyProgress({
        status: 'error',
        progress: 0,
        error: err?.message || 'Не удалось загрузить модель',
      });
      this.isInitializing = false;
      return false;
    }
  }

  private async preloadVectorCache(repo: string): Promise<void> {
    try {
      const db = await this.initDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();
      req.onsuccess = event => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
        if (cursor) {
          if (cursor.value.modelRepo === repo && Array.isArray(cursor.value.vector)) {
            const memKey = `${repo}:${cursor.value.noteId}`;
            this.memoryVectorCache.set(memKey, {
              vector: new Float32Array(cursor.value.vector),
              textHash: cursor.value.textHash,
            });
          }
          cursor.continue();
        }
      };
    } catch (e) {
      console.warn('Could not preload vector cache into memory:', e);
    }
  }

  public async getEmbedding(text: string, repo: string, isQuery = false): Promise<Float32Array | null> {
    if (!text.trim()) return null;

    if (!this.pipelineInstance || this.currentLoadedRepo !== repo) {
      const ok = await this.loadModel(repo);
      if (!ok || !this.pipelineInstance) return null;
    }

    try {
      const formattedText = this.formatInputForModel(text, repo, isQuery);
      const cleanText = formattedText.slice(0, 2000).replace(/\s+/g, ' ').trim();
      const output = await this.pipelineInstance(cleanText, {
        pooling: 'mean',
        normalize: true,
      });

      return new Float32Array(output.data);
    } catch (err) {
      console.error('Embedding generation failed:', err);
      return null;
    }
  }

  private formatInputForModel(text: string, repo: string, isQuery: boolean): string {
    const trimmed = text.replace(/\s+/g, ' ').trim();
    if (!trimmed) return '';
    const lower = repo.toLowerCase();
    if (lower.includes('e5')) {
      // Microsoft E5 models strictly require "query: " and "passage: " prefixes
      return (isQuery ? 'query: ' : 'passage: ') + trimmed;
    }
    if (lower.includes('bge')) {
      return (isQuery ? 'query: ' : 'passage: ') + trimmed;
    }
    return trimmed;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return String(hash);
  }

  private async getCachedVector(noteId: string, repo: string, currentHash: string): Promise<Float32Array | null> {
    const memKey = `${repo}:${noteId}`;
    const memItem = this.memoryVectorCache.get(memKey);
    if (memItem && memItem.textHash === currentHash) {
      return memItem.vector;
    }

    try {
      const db = await this.initDB();
      return new Promise(resolve => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(memKey);
        req.onsuccess = () => {
          const item = req.result as StoredEmbedding | undefined;
          if (item && item.textHash === currentHash && Array.isArray(item.vector)) {
            const floatArr = new Float32Array(item.vector);
            this.memoryVectorCache.set(memKey, {
              vector: floatArr,
              textHash: currentHash,
            });
            resolve(floatArr);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  private async saveCachedVector(
    noteId: string,
    repo: string,
    textHash: string,
    updatedAt: number | string,
    vector: Float32Array
  ): Promise<void> {
    const memKey = `${repo}:${noteId}`;
    this.memoryVectorCache.set(memKey, {
      vector,
      textHash,
    });

    try {
      const db = await this.initDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({
        key: memKey,
        noteId,
        modelRepo: repo,
        textHash,
        updatedAt,
        vector: Array.from(vector),
      });
    } catch (err) {
      console.error('Failed to save vector cache:', err);
    }
  }

  public async deleteCachedModel(repo: string): Promise<boolean> {
    try {
      localStorage.removeItem(`veris_model_cached_${repo}`);
      await this.clearModelVectors(repo);
      if (this.currentLoadedRepo === repo) {
        this.pipelineInstance = null;
        this.currentLoadedRepo = null;
      }
      return true;
    } catch (err) {
      console.error('Failed to delete cached model:', err);
      return false;
    }
  }

  public async clearModelVectors(repo: string): Promise<void> {
    this.memoryVectorCache.clear();
    try {
      const db = await this.initDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();
      req.onsuccess = event => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
        if (cursor) {
          if (cursor.value.modelRepo === repo) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
    } catch (err) {
      console.error('Failed to clear model vectors:', err);
    }
  }

  public async getIndexedCount(repo: string): Promise<number> {
    try {
      const db = await this.initDB();
      return new Promise(resolve => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.openCursor();
        let count = 0;
        req.onsuccess = event => {
          const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
          if (cursor) {
            if (cursor.value.modelRepo === repo) {
              count++;
            }
            cursor.continue();
          } else {
            resolve(count);
          }
        };
        req.onerror = () => resolve(0);
      });
    } catch {
      return 0;
    }
  }

  /**
   * Fast Vector Dot Product & Calibrated Semantic Similarity
   */
  public computeVectorSimilarity(
    vecA: Float32Array | number[],
    vecB: Float32Array | number[],
    repo: string
  ): { rawDot: number; calibratedScore: number } {
    if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
      return { rawDot: 0, calibratedScore: 0 };
    }

    let dot = 0;
    let normA = 0;
    let normB = 0;
    const len = vecA.length;

    for (let i = 0; i < len; i++) {
      const a = vecA[i];
      const b = vecB[i];
      dot += a * b;
      normA += a * a;
      normB += b * b;
    }

    if (normA === 0 || normB === 0) {
      return { rawDot: 0, calibratedScore: 0 };
    }

    const rawDot = dot / (Math.sqrt(normA) * Math.sqrt(normB));

    const isE5 = repo.toLowerCase().includes('e5');
    // Multilingual embeddings baseline: unrelated text is ~0.68 - 0.74
    // Meaningful related concepts (e.g. Cupertino <-> iPhone, phone <-> smartphone) are ~0.76 - 0.85
    const baseline = isE5 ? 0.730 : 0.710;
    const highCeiling = isE5 ? 0.900 : 0.880;

    if (rawDot <= baseline) {
      return { rawDot, calibratedScore: 0 };
    }

    const normalized = (rawDot - baseline) / (highCeiling - baseline);
    const calibratedScore = Math.min(1, Math.max(0, normalized));

    return { rawDot, calibratedScore };
  }

  /**
   * Fast Lexical + Morphological + Concept Association Evaluator
   * Evaluates query terms, stems, and domain concept connections
   */
  public evaluateConceptMatch(
    query: string,
    title: string,
    content: string,
    tags: string[],
    attachmentNames: string[]
  ): { conceptScore: number; matchedConcepts: string[] } {
    const qClean = query.toLowerCase().trim();
    if (!qClean) return { conceptScore: 0, matchedConcepts: [] };

    const queryTokens = qClean.split(/\s+/).filter(t => t.length >= 2);
    if (queryTokens.length === 0) return { conceptScore: 0, matchedConcepts: [] };

    const titleLower = title.toLowerCase();
    const contentLower = content.toLowerCase();
    const tagsLower = tags.map(t => t.toLowerCase()).join(' ');
    const attachmentsLower = attachmentNames.map(a => a.toLowerCase()).join(' ');

    const noteAllText = `${titleLower} ${tagsLower} ${attachmentsLower} ${contentLower}`;
    const noteWords = noteAllText.split(/[^a-zа-яё0-9]+/i).filter(w => w.length >= 2);
    const noteStems = new Set(noteWords.map(w => stemWord(w)));
    const noteWordsSet = new Set(noteWords);

    let totalScore = 0;
    const matchedConcepts: string[] = [];

    for (const token of queryTokens) {
      const tokenStem = stemWord(token);
      let tokenBestScore = 0;

      // 1. Direct exact or substring in title
      if (titleLower.includes(token)) {
        tokenBestScore = Math.max(tokenBestScore, 0.75);
        matchedConcepts.push(token);
      } else if (titleLower.split(/\s+/).some(w => stemWord(w) === tokenStem)) {
        tokenBestScore = Math.max(tokenBestScore, 0.65);
        matchedConcepts.push(token);
      }

      // 2. Direct exact or substring in content/tags/attachments
      if (noteWordsSet.has(token)) {
        tokenBestScore = Math.max(tokenBestScore, 0.60);
      } else if (noteStems.has(tokenStem)) {
        tokenBestScore = Math.max(tokenBestScore, 0.50);
      }

      // 3. Concept Expansion matching (Knowledge Graph)
      // e.g. "купертино" expands to ["apple", "айфон", "iphone", "macbook", "ios"...]
      // e.g. "яблочный" -> stem "яблоч" expands to ["apple", "айфон", "iphone", "смартфон"...]
      // e.g. "телефон" expands to ["смартфон", "айфон", "iphone", "андроид"...]
      // e.g. "звук" expands to ["аудио", "голос", "запись", "микрофон", "музыка", "плеер"...]
      const directExpansions = CONCEPT_EXPANSION_MAP.get(token) || new Set();
      const stemExpansions = CONCEPT_EXPANSION_MAP.get(tokenStem) || new Set();
      const allExpansions = new Set([...directExpansions, ...stemExpansions]);

      for (const concept of allExpansions) {
        if (concept === token || concept === tokenStem) continue;

        const conceptStem = stemWord(concept);
        if (titleLower.includes(concept) || noteStems.has(conceptStem) || noteWordsSet.has(concept)) {
          tokenBestScore = Math.max(tokenBestScore, 0.45);
          matchedConcepts.push(concept);
          break;
        }
      }

      totalScore += tokenBestScore;
    }

    const avgScore = totalScore / queryTokens.length;
    return { conceptScore: Math.min(1, avgScore), matchedConcepts };
  }

  /**
   * Search notes semantically and associatively against query
   */
  public async searchNotes(
    query: string,
    notes: Note[],
    repo: string,
    minThreshold = 0.16,
    indexingMode: 'auto' | 'manual' = 'auto'
  ): Promise<NoteSemanticMatch[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery || notes.length === 0) return [];

    // 1. Get query embedding
    const queryVector = await this.getEmbedding(cleanQuery, repo, true);

    const candidates: NoteSemanticMatch[] = [];

    for (const note of notes) {
      const rawTitle = (note.title || '').trim();
      const rawContent = stripHtmlTags(note.content || '').trim();
      const tags = (note.tags || []).filter(Boolean);
      const attachmentNames = (note.attachments || []).map(a => a.name).filter(Boolean);

      const isDefaultTitle = /^(новая заметка|без названия|untitled note|untitled)$/i.test(rawTitle);
      const meaningfulTitle = isDefaultTitle && !rawContent ? '' : rawTitle;

      // Skip completely empty notes
      if (!meaningfulTitle && !rawContent && attachmentNames.length === 0 && tags.length === 0) {
        continue;
      }

      // 2. Compute concept / stem / lexical association score (0.0 to 1.0)
      const { conceptScore } = this.evaluateConceptMatch(
        cleanQuery,
        meaningfulTitle,
        rawContent,
        tags,
        attachmentNames
      );

      // 3. Compute vector similarity if vector model is active
      let vectorScore = 0;
      if (queryVector) {
        const textParts: string[] = [];
        if (meaningfulTitle) textParts.push(`${meaningfulTitle}.\n${meaningfulTitle}`);
        if (tags.length > 0) textParts.push(`Теги: ${tags.join(' ')}`);
        if (attachmentNames.length > 0) textParts.push(`Вложения и аудиозаписи: ${attachmentNames.join(', ')}`);
        if (rawContent) textParts.push(rawContent);

        const combinedText = textParts.join('\n').trim();
        const textHash = this.simpleHash(combinedText);

        let noteVector = await this.getCachedVector(note.id, repo, textHash);
        if (!noteVector && indexingMode === 'auto') {
          noteVector = await this.getEmbedding(combinedText, repo, false);
          if (noteVector) {
            await this.saveCachedVector(note.id, repo, textHash, note.updatedAt, noteVector);
          }
        }

        if (noteVector) {
          const sim = this.computeVectorSimilarity(queryVector, noteVector, repo);
          vectorScore = sim.calibratedScore;
        }
      }

      // 4. Hybrid Blended Score
      // If concept/stem association exists (e.g. Cupertino -> iPhone, apple -> iPhone, phone -> smartphone),
      // it provides high confidence grounding even on short queries!
      let finalScore = 0;
      if (conceptScore > 0 && vectorScore > 0) {
        finalScore = conceptScore * 0.55 + vectorScore * 0.45;
      } else if (conceptScore > 0) {
        finalScore = conceptScore * 0.85;
      } else if (vectorScore >= 0.20) {
        finalScore = vectorScore;
      }

      if (finalScore >= minThreshold) {
        const snippet = this.extractRelevantSnippet(rawContent || meaningfulTitle, cleanQuery);
        candidates.push({ note, score: finalScore, snippet });
      }
    }

    if (candidates.length === 0) return [];

    // Sort by composite score descending
    candidates.sort((a, b) => b.score - a.score);

    // Keep top results with meaningful score
    return candidates.slice(0, 20);
  }

  /**
   * Search within a single note's paragraphs semantically
   */
  public async searchInsideNote(
    query: string,
    noteContentHtml: string,
    repo: string,
    minCalibratedScore = 0.20
  ): Promise<InNoteSemanticMatch[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery || !noteContentHtml) return [];

    const queryVector = await this.getEmbedding(cleanQuery, repo, true);
    const plainText = stripHtmlTags(noteContentHtml);
    const paragraphs = plainText
      .split(/\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 3);

    const matches: InNoteSemanticMatch[] = [];

    for (let i = 0; i < paragraphs.length; i++) {
      const text = paragraphs[i];
      let score = 0;

      const { conceptScore } = this.evaluateConceptMatch(cleanQuery, '', text, [], []);
      if (queryVector) {
        const vec = await this.getEmbedding(text, repo, false);
        if (vec) {
          const sim = this.computeVectorSimilarity(queryVector, vec, repo);
          score = conceptScore > 0 ? conceptScore * 0.5 + sim.calibratedScore * 0.5 : sim.calibratedScore;
        }
      } else {
        score = conceptScore;
      }

      if (score >= minCalibratedScore) {
        const startIndex = plainText.indexOf(text);
        matches.push({
          chunkIndex: i,
          text,
          score,
          startIndex: Math.max(0, startIndex),
          endIndex: startIndex + text.length,
        });
      }
    }

    matches.sort((a, b) => b.score - a.score);
    return matches;
  }

  private extractRelevantSnippet(text: string, query: string): string {
    if (!text) return '';
    const qLower = query.toLowerCase();
    const words = qLower.split(/\s+/).filter(w => w.length > 2);

    let bestPos = 0;
    for (const w of words) {
      const idx = text.toLowerCase().indexOf(w);
      if (idx !== -1) {
        bestPos = idx;
        break;
      }
    }

    const start = Math.max(0, bestPos - 40);
    const end = Math.min(text.length, bestPos + 120);
    let snippet = text.slice(start, end).trim();
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';
    return snippet;
  }
}

export const semanticSearchService = new SemanticSearchService();
