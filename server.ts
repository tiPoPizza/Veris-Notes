import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Gemini client lazily
let aiClient: GoogleGenAI | null = null;
function getAIClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Anacrusa AI Endpoint (Supports Cohere & io.net / ai.io.net)
const handleAnacrusaChat = async (req: express.Request, res: express.Response) => {
  try {
    const {
      provider = (req.path.includes("ionet") ? "ionet" : "cohere"),
      apiKey,
      baseUrl,
      model,
      messages,
      temperature,
      systemPrompt,
      workspaceData,
      webSearchMode = "ask",
      webSearchSettings,
      confirmedWebSearch,
      webSearchDeclined,
      webSearchQuery,
      forceWebSearch,
    } = req.body;

    const isIonet = provider === "ionet";
    const token = apiKey || (isIonet ? process.env.IONET_API_KEY : process.env.COHERE_API_KEY);
    if (!token || !token.trim()) {
      return res.status(400).json({
        error: "NO_API_KEY",
        message: isIonet
          ? "API-ключ io.net не указан. Добавьте его в Настройках -> ИИ (Anacrusa)."
          : "API-ключ Cohere не указан. Добавьте его в Настройках -> ИИ (Anacrusa).",
      });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "INVALID_MESSAGES",
        message: "Список сообщений не может быть пустым.",
      });
    }

    const cohereMessages: Array<{ role: string; content?: string; tool_calls?: any[]; tool_call_id?: string }> = [];

    const currentDateStr = workspaceData?.currentDate || new Date().toISOString().split("T")[0];

    const coreSystemInstruction = `Ты — персональный автономный ИИ-ассистент Anacrusa в приложении заметок и продуктивности Veris.
В контексте каждого сообщения тебе передаётся актуальный снимок рабочего пространства (заметки, списки задач, события календаря, блоки, теги и текущая дата: ${currentDateStr}).
${forceWebSearch ? `\nПОЛЬЗОВАТЕЛЬ ПРИНУДИТЕЛЬНО ВКЛЮЧИЛ ВЕБ-ПОИСК ЧЕРЕЗ СЛЭШ-КОМАНДУ (/поиск).\nТы ОБЯЗАН в ПЕРВУЮ ОЧЕРЕДЬ вызвать инструмент web_search для нахождения свежей информации из интернета по запросу пользователя и ответить на основе найденного!\n` : ''}
ЯЗЫК И СТИЛЬ ОТВЕТА (КРИТИЧЕСКИ ВАЖНО):
- ВСЕГДА отвечай СТРОГО на русском языке (или языке запроса пользователя).
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО выводить текст на китайском языке (иероглифами), английском или любых других языках, если пользователь об этом прямо не просил.
- Если в результатах веб-поиска или источниках попадаются китайские, англоязычные или иные иностранные тексты — обязательно ПЕРЕВОДИ их суть на чистый и грамотный русский язык. Не дублируй иностранный текст в ответ!

ПРАВИЛА И МНОГОШАГОВОЕ ВЫПОЛНЕНИЕ (ReAct):
- Если запрос пользователя содержит несколько действий, вызывай ВСЕ необходимые инструменты по очереди.
- Если нужны полные тексты или поиск в рабочем пространстве — используй функции чтения (search_workspace, get_note_content, get_task_list, list_workspace_items, search_calendar_events).
- Если требуется актуальная информация из интернета (новости, свежие факты, погода, статьи, рецепты, справки, текущие события) — вызывай инструмент web_search.
- КРИТИЧЕСКОЕ ПРАВИЛО ДЛЯ ВЕБ-ПОИСКА (web_search): Твоя внутренняя база знаний имеет дату отсечки и устарела. Когда вызван инструмент web_search, ты ОБЯЗАН СТРОГО и БЕЗОГОВОРОЧНО строить свой ответ на основе возвращенных свежих данных (сводка и найденные источники). КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО игнорировать результаты веб-поиска и подменять их устаревшими событиями прошлых лет из своей памяти (например, событиями 2021-2022 годов). Всегда излагай именно те факты, даты, персоналии и детали, которые получены в результате веб-поиска.
- Пользователь видит каждый шаг в реальном времени и может отменить любое действие в один клик.

ДОСТУПНЫЕ ИНСТРУМЕНТЫ:
1. create_block / rename_block / delete_block: Управление блоками/разделами.
2. create_note / update_note / rename_note / delete_note / format_note: Управление заметками.
    - ВАЖНО: Если пользователь просит создать заметку в блоке (папке), передай параметр 'block_name' ('Имя блока') сразу в create_note. Блок будет найден или создан автоматически.
    - Если создаёшь заметку через create_note, а затем перемещаешь её через move_notes_to_block, обязательно передай точный заголовок созданной заметки в note_titles: ['Заголовок'].
3. create_task_list / update_task_list / rename_task_list / delete_task_list: Управление списками задач.
4. move_notes_to_block: Перемещение заметок в блок (по note_titles или note_ids).
5. pin_notes / unpin_notes: Закрепление или открепление заметок.
6. create_tag: Создание нового тега (name, color в формате HEX, например #A855F7).
7. delete_tag: Удаление тега (tag_name).
8. attach_tags: Прикрепление тегов к заметкам или спискам задач.
9. detach_tags: Снятие тегов с заметок или списков задач.
10. search_calendar_events: Поиск и получение событий календаря.
11. create_calendar_event: Создание событий/задач в календаре.
    - ПРАВИЛО ДЛЯ СОЗВОНОВ И НАПОМИНАНИЙ: Если пользователь просит напомнить про созвон или встречу (например, "созвон в 12:00"), по умолчанию создавай событие с isAllDay: true и remindOnDay: true, а точное время укажи в названии или описании ("Созвон в 12:00").
12. update_calendar_event: Обновление события календаря.
13. delete_calendar_event: Удаление события из календаря.
14. update_settings: Изменение настроек приложения: темы оформления (theme), шрифты (font_family, font_size, line_height), язык (language), раздел «Благополучие» (bedtime_reminder_enabled, bedtime_reminder_time, bedtime_reminder_title, bedtime_reminder_description, pin_focus_mode_to_bottom_bar), отображение в заметках (show_word_count, show_char_count, show_date, show_tile_metadata, show_border) и т.д.
    - СТРОГИЙ ЗАПРЕТ БЕЗОПАСНОСТИ: ИИ НЕ ИМЕЕТ ПРАВА и НЕ МОЖЕТ менять настройки безопасности (ПИН-коды, пароли), данных (импорт, экспорт, сброс/очистка всех данных) и ИИ (выбор моделей, ввод/удаление API-ключей).
15. get_social_links: Получение официальных ссылок на сообщества и социальные сети Veris Note (YouTube, TikTok, Instagram, Pinterest, Telegram-канал).
16. web_search: Поиск актуальной информации, новостей, фактов и статей в интернете.

${systemPrompt && systemPrompt.trim() ? `ДОПОЛНИТЕЛЬНЫЕ ИНСТРУКЦИИ ПОЛЬЗОВАТЕЛЯ:\n${systemPrompt.trim()}` : "Отвечай кратко, структурированно и дружелюбно. При вызове функций подтверждай действия лаконично."}`;

    cohereMessages.push({
      role: "system",
      content: coreSystemInstruction,
    });

    for (const msg of messages) {
      if (!msg.content || !msg.content.trim()) continue;
      if (msg.role === "user" || msg.role === "assistant") {
        cohereMessages.push({
          role: msg.role,
          content: msg.content.trim(),
        });
      }
    }

    if (cohereMessages.length === 0) {
      return res.status(400).json({
        error: "EMPTY_CONTENT",
        message: "Сообщение не содержит текста для отправки.",
      });
    }

    let selectedModel = model;
    if (isIonet) {
      selectedModel = model || "meta-llama/Llama-3.3-70B-Instruct";
    } else {
      // Map model aliases and safely resolve retired model IDs for Cohere
      const modelAliases: Record<string, string> = {
        "command-r7b": "command-r7b-12-2024",
        "command-r": "command-r-08-2024",
        "command-r-plus": "command-r-plus-08-2024",
        "command-a": "command-a-03-2025",
        "command-a-reasoning": "command-a-reasoning-08-2025",
        "c4ai-aya-expanse-8b": "command-r7b-12-2024", // gracefully map retired Aya 8B to Command R7B
        "c4ai-aya-expanse-32b": "command-a-03-2025", // map retired Aya 32B to Command A
      };
      selectedModel = modelAliases[model] || model || "command-r7b-12-2024";
    }

    // Define Read & Mutation tools
    const cohereTools = [
      // --- ON-DEMAND RETRIEVAL / READ TOOLS ---
      {
        type: "function",
        function: {
          name: "search_workspace",
          description: "Быстрый поиск по заметкам и спискам задач в Veris по ключевому слову, фразе или тегу. Возвращает список найденных заметок и задач с релевантными фрагментами текста, ID и тегами.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Поисковый запрос или ключевые слова (например: 'рецепт', 'бюджет', 'встреча', 'пароли')"
              },
              type: {
                type: "string",
                description: "Область поиска: 'all' (везде), 'notes' (только заметки), 'tasks' (только списки задач)"
              },
              tag: {
                type: "string",
                description: "Фильтр по конкретному тегу (например: 'Срочно', 'Работа')"
              }
            },
            required: ["query"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_note_content",
          description: "Получить полное содержимое (текст), блок и теги конкретной заметки по её ID или названию. Используй этот инструмент, чтобы прочитать заметку перед её изменением или суммаризацией.",
          parameters: {
            type: "object",
            properties: {
              note_ids: {
                type: "array",
                items: { type: "string" },
                description: "Массив ID заметок для чтения"
              },
              note_titles: {
                type: "array",
                items: { type: "string" },
                description: "Массив заголовков заметок для чтения (например: ['План на неделю', 'Рецепт'])"
              }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_task_list",
          description: "Получить подробный список задач (все пункты, статус выполнения, теги) по ID или названию списка задач.",
          parameters: {
            type: "object",
            properties: {
              task_list_id: {
                type: "string",
                description: "ID списка задач"
              },
              task_list_title: {
                type: "string",
                description: "Название списка задач (например: 'Покупки', 'Планы')"
              }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "list_workspace_items",
          description: "Получить обзорный список заголовков, ID, тегов и блоков всех заметок или списков задач с опциональной фильтрацией по тегу или блоку.",
          parameters: {
            type: "object",
            properties: {
              category: {
                type: "string",
                description: "Категория для списка: 'all', 'notes', 'tasks', 'blocks', 'tags'"
              },
              tag: {
                type: "string",
                description: "Фильтр по тегу"
              },
              block: {
                type: "string",
                description: "Фильтр по блоку (папке)"
              }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "search_calendar_events",
          description: "Получить список событий и задач календаря Veris за определенную дату, диапазон дат (сегодня, завтра, на этой неделе, за месяц) или по ключевым словам. Позволяет узнать, какие события запланированы, их время, напоминания и описания.",
          parameters: {
            type: "object",
            properties: {
              date: {
                type: "string",
                description: "Точная дата в формате 'YYYY-MM-DD' (например '2026-08-26') или относительная: 'today', 'tomorrow', 'yesterday'"
              },
              start_date: {
                type: "string",
                description: "Начальная дата диапазона в формате 'YYYY-MM-DD'"
              },
              end_date: {
                type: "string",
                description: "Конечная дата диапазона в формате 'YYYY-MM-DD'"
              },
              range: {
                type: "string",
                enum: ["today", "tomorrow", "this_week", "next_week", "this_month", "all"],
                description: "Быстрый выбор периода: 'today' (сегодня), 'tomorrow' (завтра), 'this_week' (текущая неделя), 'next_week' (следующая неделя), 'this_month' (текущий месяц), 'all' (все события)"
              },
              query: {
                type: "string",
                description: "Поисковый запрос по названию или описанию события (например: 'др', 'созвон', 'встреча')"
              }
            }
          }
        }
      },

      // --- MUTATION / ACTION TOOLS ---
      {
        type: "function",
        function: {
          name: "create_note",
          description: "Создать новую заметку и открыть её в редакторе Veris. Если пользователь просит создать заметку в определенном блоке (папке), сразу укажи параметр block_name — блок будет найден или создан автоматически.",
          parameters: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Понятный заголовок новой заметки (например: 'Рецепт римской пиццы', 'Список покупок')"
              },
              content: {
                type: "string",
                description: "Полный текст заметки с красивым форматированием (заголовки # ##, списки -, жирный шрифт **)"
              },
              block_name: {
                type: "string",
                description: "Название блока (папки/раздела), в который нужно сразу поместить созданную заметку (например: 'Кулинария', 'Работа', 'Проекты'). Если блока ещё нет, он будет создан автоматически."
              },
              confirmation_message: {
                type: "string",
                description: "Краткое понятное подтверждение для чата (например: 'Создал заметку «Рецепт римской пиццы» в блоке «Кулинария» и открыл её в редакторе.')"
              }
            },
            required: ["title", "content"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_note",
          description: "Обновить, отредактировать, изменить или дополнить текст существующей открытой или прикрепленной заметки (например: 'поменяй привет на пока', 'добавь больше мяса', 'сделай текст короче', 'исправь ошибки').",
          parameters: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Заголовок заметки"
              },
              content: {
                type: "string",
                description: "Полный обновленный текст заметки целиком со всеми внесенными изменениями"
              },
              confirmation_message: {
                type: "string",
                description: "Краткое подтверждение выполненного действия (например: 'Обновил заметку: заменил «Привет» на «Пока»')"
              }
            },
            required: ["content"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "rename_note",
          description: "Изменить название (заголовок) заметки.",
          parameters: {
            type: "object",
            properties: {
              new_title: {
                type: "string",
                description: "Новый заголовок заметки"
              },
              confirmation_message: {
                type: "string",
                description: "Краткое подтверждение (например: 'Изменил название заметки на «Новое название»')"
              }
            },
            required: ["new_title"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_task_list",
          description: "Создать новый список задач (чек-лист/todo-лист) с указанным названием и пунктами задач в разделе Задачи приложения Veris.",
          parameters: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Название списка задач (например: 'Покупки', 'Планы на неделю', 'Подготовка к релизу')"
              },
              items: {
                type: "array",
                items: { type: "string" },
                description: "Массив формулировок задач/пунктов списка (например: ['Купить молоко', 'Купить хлеб', 'Зайти в аптеку'])"
              },
              confirmation_message: {
                type: "string",
                description: "Краткое понятное подтверждение для пользователя (например: 'Создал список задач «Покупки» с 3 задачами.')"
              }
            },
            required: ["title", "items"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_task_list",
          description: "Обновить, изменить, дополнить или отредактировать существующий список задач (чек-лист/todo-лист). Позволяет добавлять новые пункты, отмечать выполненными, удалять пункты или изменять заголовок списка.",
          parameters: {
            type: "object",
            properties: {
              task_list_id: {
                type: "string",
                description: "ID списка задач (если известен из контекста, например: 'task-123456789')"
              },
              task_list_title: {
                type: "string",
                description: "Текущее название списка задач для поиска (например: 'Покупки', 'Планы')"
              },
              new_title: {
                type: "string",
                description: "Новое название списка задач (если пользователь попросил переименовать)"
              },
              add_items: {
                type: "array",
                items: { type: "string" },
                description: "Новые пункты/задачи для добавления в список (например: ['Купить яблоки', 'Купить сыр'])"
              },
              toggle_completed_items: {
                type: "array",
                items: { type: "string" },
                description: "Пункты/задачи, которые нужно отметить выполненными (или снять отметку) (например: ['Купить хлеб'])"
              },
              remove_items: {
                type: "array",
                items: { type: "string" },
                description: "Тексты или фрагменты пунктов, которые нужно удалить из списка"
              },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    text: { type: "string" },
                    completed: { type: "boolean" }
                  },
                  required: ["text"]
                },
                description: "Полный обновлённый массив задач (если список переписывается целиком)"
              },
              confirmation_message: {
                type: "string",
                description: "Краткое понятное подтверждение для пользователя (например: 'Обновил список задач «Покупки»: добавил 2 новых пункта.')"
              }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "move_notes_to_block",
          description: "Переместить одну или несколько конкретных заметок в указанный блок (папку). Если блок с таким названием ещё не существует, он будет создан автоматически. Если указано 'общие' или 'без блока', заметки выносятся из блока.",
          parameters: {
            type: "object",
            properties: {
              note_ids: {
                type: "array",
                items: { type: "string" },
                description: "Массив точных ID заметок из контекста (например: ['note-1700000000000'])"
              },
              note_titles: {
                type: "array",
                items: { type: "string" },
                description: "Массив точных названий или номеров заметок, которые необходимо переместить (например: ['Рецепт пиццы'] или ['1'])"
              },
              block_name: {
                type: "string",
                description: "Название блока/папки, куда перенести заметки (например: 'Кулинария', 'Работа', 'Проекты'). Для перемещения в общий список передай 'общие' или 'без блока'."
              },
              confirmation_message: {
                type: "string",
                description: "Краткое подтверждение выполненного перемещения (например: 'Перенёс заметку «Рецепт пиццы» в блок «Кулинария».')"
              }
            },
            required: ["block_name"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_block",
          description: "Создать новый блок (раздел/папку для заметок и задач) с указанным названием в приложении Veris.",
          parameters: {
            type: "object",
            properties: {
              block_name: {
                type: "string",
                description: "Название нового блока (например: 'Работа', 'Проекты', 'Учёба', 'Идеи')"
              },
              confirmation_message: {
                type: "string",
                description: "Краткое подтверждение (например: 'Создал блок «Работа»')"
              }
            },
            required: ["block_name"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "rename_block",
          description: "Переименовать существующий блок (раздел/папку) в приложении Veris.",
          parameters: {
            type: "object",
            properties: {
              block_name: {
                type: "string",
                description: "Текущее название блока для поиска (например: 'Работа', 'Учёба')"
              },
              new_name: {
                type: "string",
                description: "Новое название блока (например: 'Бизнес', 'Проекты')"
              },
              confirmation_message: {
                type: "string",
                description: "Краткое подтверждение (например: 'Переименовал блок «Работа» в «Бизнес»')"
              }
            },
            required: ["new_name"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "delete_block",
          description: "Удалить блок (раздел/папку) в приложении Veris. Заметки из удалённого блока переносятся в общий список.",
          parameters: {
            type: "object",
            properties: {
              block_name: {
                type: "string",
                description: "Название блока, который нужно удалить (например: 'Старый проект', 'Работа')"
              },
              confirmation_message: {
                type: "string",
                description: "Краткое подтверждение (например: 'Удалил блок «Старый проект»')"
              }
            },
            required: ["block_name"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "rename_task_list",
          description: "Переименовать список или группу задач в разделе Задачи приложения Veris.",
          parameters: {
            type: "object",
            properties: {
              task_list_id: {
                type: "string",
                description: "ID списка задач (если известен)"
              },
              task_list_title: {
                type: "string",
                description: "Текущее название списка/группы задач (например: 'Планы', 'Покупки')"
              },
              new_title: {
                type: "string",
                description: "Новое название списка/группы задач (например: 'Планы на весну')"
              },
              confirmation_message: {
                type: "string",
                description: "Краткое подтверждение (например: 'Переименовал список задач в «Планы на весну»')"
              }
            },
            required: ["new_title"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "delete_task_list",
          description: "Удалить список или группу задач (чек-лист) из раздела Задачи с возможностью отмены действия.",
          parameters: {
            type: "object",
            properties: {
              task_list_id: {
                type: "string",
                description: "ID списка задач (если известен)"
              },
              task_list_title: {
                type: "string",
                description: "Название списка или группы задач для удаления (например: 'Покупки', 'Старые задачи')"
              },
              confirmation_message: {
                type: "string",
                description: "Краткое подтверждение (например: 'Удалил список задач «Покупки»')"
              }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "delete_note",
          description: "Удалить одну или несколько заметок (поместить в корзину с возможностью мгновенного восстановления или отмены действия).",
          parameters: {
            type: "object",
            properties: {
              note_ids: {
                type: "array",
                items: { type: "string" },
                description: "Массив точных ID заметок для удаления (если известны)"
              },
              note_titles: {
                type: "array",
                items: { type: "string" },
                description: "Массив названий или номеров заметок для удаления (например: ['Черновик', '1'])"
              },
              title: {
                type: "string",
                description: "Название одиночной заметки для удаления"
              },
              confirmation_message: {
                type: "string",
                description: "Краткое подтверждение (например: 'Удалил заметку «Черновик»')"
              }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "format_note",
          description: "Отформатировать открытую или указанную заметку в редакторе с поддержкой ОДНОВРЕМЕННОГО применения нескольких стилей (мульти-форматирование): жирный шрифт (bold / <b>), курсив (italic / <i>), подчеркивание (underline / <u>), зачеркивание (strikethrough / <s>), заголовки H1-H3 (heading / <h1>, <h2>, <h3>), цитата (quote / <blockquote>), инлайн-код (code / <code>), блок кода (code_block / <pre><code>), выравнивание текста (align: left, center, right, justify), выделение цветным маркером (highlight с любым HEX-кодом цвета или названием). Можно указать массив стилей `styles`, массив правил `operations` для разных фрагментов или полный `formatted_content`.",
          parameters: {
            type: "object",
            properties: {
              note_id: {
                type: "string",
                description: "ID целевой заметки (если известен)"
              },
              note_title: {
                type: "string",
                description: "Название заметки для форматирования"
              },
              styles: {
                type: "array",
                items: {
                  type: "string",
                  enum: ["bold", "italic", "underline", "strikethrough", "heading", "quote", "code", "code_block", "align", "highlight"]
                },
                description: "Массив стилей для одновременного наложения (например: ['bold', 'italic', 'highlight', 'center'])"
              },
              format_type: {
                type: "string",
                description: "Одиночный тип форматирования (если применяется один стиль, например: 'bold', 'italic', 'highlight', 'heading', 'align')"
              },
              target_text: {
                type: "string",
                description: "Конкретный фрагмент или фраза внутри заметки, к которой применить форматирование (если пропущено — форматируется вся заметка)"
              },
              heading_level: {
                type: "number",
                description: "Уровень заголовка (1 = H1, 2 = H2, 3 = H3) при наличии стиля 'heading'"
              },
              align: {
                type: "string",
                enum: ["left", "center", "right", "justify"],
                description: "Выравнивание текста (left, center, right, justify) при наличии стиля 'align'"
              },
              color: {
                type: "string",
                description: "HEX-код цвета (например '#EF4444', '#10B981', '#3B82F6', '#EAB308', '#9E862B') или название цвета для маркера при стиле 'highlight'"
              },
              operations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    target_text: { type: "string" },
                    styles: {
                      type: "array",
                      items: { type: "string" }
                    },
                    color: { type: "string" },
                    heading_level: { type: "number" },
                    align: { type: "string" }
                  },
                  required: ["target_text"]
                },
                description: "Массив операций форматирования для применения разных стилей к разным фрагментам заметки"
              },
              formatted_content: {
                type: "string",
                description: "Полный отформатированный текст заметки целиком со всеми тегами HTML или markdown"
              },
              confirmation_message: {
                type: "string",
                description: "Краткое подтверждение (например: 'Применил мульти-форматирование: выделил заголовок жирным курсивом и подсветил ключевые мысли.')"
              }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_tag",
          description: "Создать новый тег в приложении Veris с указанием названия и HEX-кода цвета.",
          parameters: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Название нового тега (например: 'Срочно', 'Работа', 'Проект-Альфа', 'Идеи')"
              },
              color: {
                type: "string",
                description: "HEX-код цвета тега (например: '#EF4444' (красный), '#10B981' (зеленый), '#3B82F6' (синий), '#F59E0B' (янтарный), '#8B5CF6' (фиолетовый), '#EC4899' (розовый), '#14B8A6' (бирюзовый), '#9E862B' (горчичный))"
              },
              confirmation_message: {
                type: "string",
                description: "Краткое подтверждение (например: 'Создал тег «Срочно» с красным цветом.')"
              }
            },
            required: ["name"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "delete_tag",
          description: "Удалить существующий тег из приложения (тег удаляется из реестра и снимается со всех заметок и списков задач).",
          parameters: {
            type: "object",
            properties: {
              tag_name: {
                type: "string",
                description: "Название тега для удаления (например: 'Черновик', 'Старое')"
              },
              tag_names: {
                type: "array",
                items: { type: "string" },
                description: "Массив названий тегов для удаления"
              },
              confirmation_message: {
                type: "string",
                description: "Краткое подтверждение (например: 'Удалил тег «Черновик».')"
              }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "attach_tags",
          description: "Прикрепить один или несколько тегов к указанным заметкам и/или спискам задач. Если указанного тега ещё нет, он создаётся автоматически (можно указать HEX-код цвета).",
          parameters: {
            type: "object",
            properties: {
              tags: {
                type: "array",
                items: { type: "string" },
                description: "Массив названий тегов для прикрепления (например: ['Работа', 'Срочно'])"
              },
              tag_colors: {
                type: "object",
                description: "Объект маппинга 'НазваниеТега': '#HEXЦвет' для новых тегов (например: {'Срочно': '#EF4444', 'Работа': '#3B82F6'})"
              },
              note_ids: {
                type: "array",
                items: { type: "string" },
                description: "Массив ID заметок, к которым прикрепить теги"
              },
              note_titles: {
                type: "array",
                items: { type: "string" },
                description: "Массив названий заметок, к которым прикрепить теги"
              },
              task_list_ids: {
                type: "array",
                items: { type: "string" },
                description: "Массив ID списков задач, к которым прикрепить теги"
              },
              task_list_titles: {
                type: "array",
                items: { type: "string" },
                description: "Массив названий списков задач, к которым прикрепить теги"
              },
              confirmation_message: {
                type: "string",
                description: "Краткое подтверждение (например: 'Прикрепил теги «Работа» и «Срочно» к заметке «План на неделю».')"
              }
            },
            required: ["tags"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "detach_tags",
          description: "Убрать (открепить) указанные теги с заметок и/или списков задач.",
          parameters: {
            type: "object",
            properties: {
              tags: {
                type: "array",
                items: { type: "string" },
                description: "Массив названий тегов для снятия (например: ['Черновик'])"
              },
              note_ids: {
                type: "array",
                items: { type: "string" },
                description: "Массив ID заметок, с которых снять теги"
              },
              note_titles: {
                type: "array",
                items: { type: "string" },
                description: "Массив названий заметок, с которых снять теги"
              },
              task_list_ids: {
                type: "array",
                items: { type: "string" },
                description: "Массив ID списков задач, с которых снять теги"
              },
              task_list_titles: {
                type: "array",
                items: { type: "string" },
                description: "Массив названий списков задач, с которых снять теги"
              },
              confirmation_message: {
                type: "string",
                description: "Краткое подтверждение (например: 'Убрал тег «Черновик» с заметки.')"
              }
            },
            required: ["tags"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "pin_notes",
          description: "Закрепить одну или несколько заметок вверху списка заметок.",
          parameters: {
            type: "object",
            properties: {
              note_ids: {
                type: "array",
                items: { type: "string" },
                description: "Массив точных ID заметок для закрепления (если известны)"
              },
              note_titles: {
                type: "array",
                items: { type: "string" },
                description: "Массив названий или номеров заметок для закрепления (например: ['Рецепт пиццы'])"
              },
              confirmation_message: {
                type: "string",
                description: "Краткое подтверждение (например: 'Закрепил заметку «Рецепт пиццы»')"
              }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "unpin_notes",
          description: "Открепить одну или несколько заметок (убрать из закреплённых в общий список заметок).",
          parameters: {
            type: "object",
            properties: {
              note_ids: {
                type: "array",
                items: { type: "string" },
                description: "Массив точных ID заметок для открепления (если известны)"
              },
              note_titles: {
                type: "array",
                items: { type: "string" },
                description: "Массив названий или номеров заметок для открепления (например: ['Рецепт пиццы'])"
              },
              confirmation_message: {
                type: "string",
                description: "Краткое подтверждение (например: 'Открепил заметку «Рецепт пиццы»')"
              }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_calendar_event",
          description: "Создать одно или сразу несколько событий/задач в Календаре Veris. Поддерживает установку даты (YYYY-MM-DD), флага 'весь день' (isAllDay), точного времени начала и конца (startTime, endTime), напоминания в день события (remindOnDay) и подробного описания (description). ВАЖНО: Если пользователь просит напомнить о встрече/созвоне в конкретное время (например '1 сентября созвон в 12'), ставь isAllDay=true, чтобы напоминание сработало с утра, когда пользователь зайдёт в приложение, а время встречи укажи в названии/описании или в startTime.",
          parameters: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Название события (например: 'День рождения Мари', 'Созвон по проекту (12:00)')"
              },
              date: {
                type: "string",
                description: "Дата события в формате 'YYYY-MM-DD' (например: '2026-08-27' или '2026-09-01')"
              },
              isAllDay: {
                type: "boolean",
                description: "Событие на весь день (true) или в конкретные часы (false). По умолчанию true для памятных дат и напоминаний на день"
              },
              startTime: {
                type: "string",
                description: "Время начала в формате 'HH:mm' (например: '12:00', '15:30')"
              },
              endTime: {
                type: "string",
                description: "Время окончания в формате 'HH:mm' (например: '13:00', '16:30')"
              },
              remindOnDay: {
                type: "boolean",
                description: "Показывать ли всплывающее напоминание при открытии календаря в этот день (по умолчанию true, если пользователь просит напомнить)"
              },
              description: {
                type: "string",
                description: "Дополнительное описание или заметка к событию"
              },
              events: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    date: { type: "string" },
                    isAllDay: { type: "boolean" },
                    startTime: { type: "string" },
                    endTime: { type: "string" },
                    remindOnDay: { type: "boolean" },
                    description: { type: "string" }
                  },
                  required: ["title", "date"]
                },
                description: "Массив событий, если нужно создать сразу несколько событий за один раз"
              },
              confirmation_message: {
                type: "string",
                description: "Краткое подтверждение для пользователя (например: 'Создал событие «День рождения Мари» на 27 августа с напоминанием.')"
              }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_calendar_event",
          description: "Обновить или изменить существующее событие в Календаре Veris (изменить дату, время, название, описание или статус напоминания).",
          parameters: {
            type: "object",
            properties: {
              event_id: {
                type: "string",
                description: "ID события для обновления (если известен)"
              },
              event_title: {
                type: "string",
                description: "Текущее название события для поиска (например: 'Созвон')"
              },
              date_filter: {
                type: "string",
                description: "Текущая дата события для точного поиска в формате 'YYYY-MM-DD'"
              },
              new_title: {
                type: "string",
                description: "Новое название события"
              },
              new_date: {
                type: "string",
                description: "Новая дата в формате 'YYYY-MM-DD'"
              },
              isAllDay: {
                type: "boolean",
                description: "Весь день (true) или конкретное время (false)"
              },
              startTime: {
                type: "string",
                description: "Новое время начала 'HH:mm'"
              },
              endTime: {
                type: "string",
                description: "Новое время окончания 'HH:mm'"
              },
              remindOnDay: {
                type: "boolean",
                description: "Статус напоминания"
              },
              description: {
                type: "string",
                description: "Новое описание события"
              },
              confirmation_message: {
                type: "string",
                description: "Краткое подтверждение (например: 'Обновил событие: перенёс созвон на 14:00.')"
              }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "delete_calendar_event",
          description: "Удалить одно или несколько событий из Календаря Veris.",
          parameters: {
            type: "object",
            properties: {
              event_ids: {
                type: "array",
                items: { type: "string" },
                description: "Массив ID событий для удаления"
              },
              event_titles: {
                type: "array",
                items: { type: "string" },
                description: "Массив названий событий для удаления (например: ['Созвон', 'Встреча'])"
              },
              date: {
                type: "string",
                description: "Опциональный фильтр по дате 'YYYY-MM-DD' для удаления событий конкретного дня"
              },
              confirmation_message: {
                type: "string",
                description: "Краткое подтверждение (например: 'Удалил событие «Созвон» из календаря.')"
              }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_social_links",
          description: "Получить официальные ссылки на сообщества и социальные сети Veris Note из раздела «Другое» (YouTube, TikTok, Instagram, Pinterest, Telegram-канал). Используй этот инструмент всякий раз, когда пользователь спрашивает про соцсети, сообщества, каналы или раздел 'Другое'.",
          parameters: {
            type: "object",
            properties: {}
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_settings",
          description: "Изменить настройки приложения Veris. Разрешено менять: темы оформления (theme), параметры кастомизации (шрифт font_family, размер font_size, межстрочный интервал line_height, обводка плиток show_border, счетчик символов show_char_count, дата show_date, метаданные show_tile_metadata, режим плиток tile_display_mode, скрытие трех точек hide_tile_dots, порядок и состав вкладок боковой панели sidebar_tabs, меню действий action_menu_items и action_menu_display_mode), параметры редактора (one_time_formatting) и язык интерфейса (language: 'ru' | 'en' | 'es' | 'it'). СТРОГОЕ ОГРАНИЧЕНИЕ БЕЗОПАСНОСТИ: ИИ НЕ ИМЕЕТ ПРАВА и НЕ МОЖЕТ менять настройки безопасности (ПИН-коды, пароли), данных (импорт, экспорт, сброс всех заметок) и ИИ (модели, API-ключи).",
          parameters: {
            type: "object",
            properties: {
              theme: {
                type: "string",
                description: "ID или название темы (например: 'bordeaux'/'Бордо', 'marsala'/'Марсала', 'brandy'/'Бренди', 'con_yelo'/'Кон йело', 'sealing_wax'/'Сургуч', 'night_letter'/'Ночное письмо', 'rose_quartz'/'Розовый кварц', 'rose_in_dark'/'Роза во тьме', 'sapphire_clink'/'Сапфировый дзынь', 'thawed_icicle'/'Подтаявшая сосулька', 'hay_under_snow'/'Сено под снегом', 'snowdrop'/'Подснежник', 'saxophone'/'Саксофон', 'flute'/'Флейта', 'night_window'/'Ночь из окна', 'windmill'/'Мельница в поле', 'drying_blood'/'Высыхающая кровь', 'dried_sage'/'Сушёный шалфей', 'smooth_surface'/'Гладь', 'moss_on_stone'/'Мох на камне', 'graphite'/'Графит', 'tone_in_tone'/'Тон в тон', 'dark'/'темная', 'light'/'светлая')"
              },
              language: {
                type: "string",
                enum: ["ru", "en", "es", "it"],
                description: "Язык интерфейса: 'ru' (Русский), 'en' (English), 'es' (Español), 'it' (Italiano)"
              },
              launch_screen: {
                type: "string",
                enum: ["notes", "editor", "tasks"],
                description: "Экран при запуске приложения: 'notes' (заметки), 'editor' (редактор новой заметки), 'tasks' (списки задач)"
              },
              font_size: {
                type: "number",
                description: "Размер шрифта в редакторе (число от 10 до 32, например: 14, 16, 18, 20)"
              },
              line_height: {
                type: "number",
                description: "Межстрочный интервал в редакторе (1.2, 1.4, 1.6, 1.8, 2.0)"
              },
              font_family: {
                type: "string",
                enum: ["sans", "serif", "mono", "playfair", "inter", "roboto", "fira", "display", "literata"],
                description: "Семейство шрифта в редакторе: 'sans' (Без засечек), 'serif' (С засечками), 'mono' (Моноширинный), 'playfair', 'inter', 'roboto', 'fira', 'display', 'literata'"
              },
              show_border: {
                type: "boolean",
                description: "Отображать обводку плиток заметок"
              },
              show_char_count: {
                type: "boolean",
                description: "Показывать счетчик символов в заметках"
              },
              show_word_count: {
                type: "boolean",
                description: "Показывать счетчик слов в заметках"
              },
              show_date: {
                type: "boolean",
                description: "Показывать дату изменения в заметках"
              },
              pin_focus_mode_to_bottom_bar: {
                type: "boolean",
                description: "Закрепить режим фокуса в нижней панели редактора (раздел Благополучие)"
              },
              bedtime_reminder_enabled: {
                type: "boolean",
                description: "Включить или выключить напоминание о подготовке ко сну (раздел Благополучие)"
              },
              bedtime_reminder_time: {
                type: "string",
                description: "Время напоминания о подготовке ко сну в формате 'ЧЧ:ММ' (например '22:30', '23:00')"
              },
              bedtime_reminder_title: {
                type: "string",
                description: "Пользовательский заголовок напоминания о подготовке ко сну"
              },
              bedtime_reminder_description: {
                type: "string",
                description: "Пользовательское описание напоминания о подготовке ко сну"
              },
              show_tile_metadata: {
                type: "boolean",
                description: "Отображать метаданные (теги, разделы) на плитках заметок"
              },
              tile_display_mode: {
                type: "string",
                enum: ["both", "title", "content"],
                description: "Режим отображения плиток: 'both' (заголовок и текст), 'title' (только заголовок), 'content' (только текст)"
              },
              hide_tile_dots: {
                type: "boolean",
                description: "Скрыть кнопку меню с тремя точками на плитках"
              },
              one_time_formatting: {
                type: "boolean",
                description: "Однократное применение форматирования текста в редакторе"
              },
              horizontal_main_menu: {
                type: "boolean",
                description: "Горизонтальное главное меню в мобильном режиме"
              },
              pin_search_to_home_screen: {
                type: "boolean",
                description: "Закрепить строку поиска на главном экране"
              },
              sidebar_tabs: {
                type: "array",
                items: { type: "string" },
                description: "Список видимых вкладок боковой панели и их порядок. Допустимые значения элементов: 'notes', 'tasks', 'kanban', 'calendar', 'private'"
              },
              action_menu_display_mode: {
                type: "string",
                enum: ["tiles", "rows"],
                description: "Вид контекстного меню действий: 'tiles' (плитки) или 'rows' (строки)"
              },
              action_menu_items: {
                type: "array",
                items: { type: "string" },
                description: "Элементы быстрого меню действий (например: ['calendar', 'kanban', 'trash', 'settings', 'ai', 'webSearch'])"
              },
              left_panel_pos: {
                type: "string",
                description: "Позиция левой плавающей панели ('Снизу слева', 'Снизу по центру', 'Снизу справа', 'Слева по центру', 'Справа по центру')"
              },
              right_panel_pos: {
                type: "string",
                description: "Позиция правой плавающей панели ('Снизу слева', 'Снизу по центру', 'Снизу справа', 'Слева по центру', 'Справа по центру')"
              },
              bottom_panel_pos: {
                type: "string",
                description: "Позиция нижней плавающей панели ('Снизу слева', 'Снизу по центру', 'Снизу справа', 'Слева по центру', 'Справа по центру')"
              },
              confirmation_message: {
                type: "string",
                description: "Краткое подтверждение применённых настроек для пользователя (например: 'Тема изменена на «Бордо», размер шрифта установлен на 18px.')"
              }
            }
          }
        }
      },
      ...(webSearchMode !== "never" ? [{
        type: "function",
        function: {
          name: "web_search",
          description: "Выполнить веб-поиск в интернете для получения актуальной информации, свежих новостей, фактов, статей, прогноза погоды, рецептов или справок.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Поисковый запрос на русском или английском языке (например: 'погода в Москве на неделю', 'последние новости ИИ 2026', 'рецепт тирамису классический')"
              }
            },
            required: ["query"]
          }
        }
      }] : [])
    ];

    const collectedWebSearchSources: Array<{ title: string; url: string; publishedDate?: string | null; snippet?: string }> = [];

    // Helper for executing web search
    const performWebSearchBackend = async (query: string) => {
      const provider = webSearchSettings?.provider || "tavily";
      const tavilyKey = webSearchSettings?.tavilyApiKey || process.env.TAVILY_API_KEY;
      const exaKey = webSearchSettings?.exaApiKey || process.env.EXA_API_KEY;
      const tavilyDepth = (webSearchSettings?.searchDepth === "advanced" || webSearchSettings?.tavilySearchDepth === "advanced") ? "advanced" : "basic";
      const tavilyIncludeAnswer = (webSearchSettings?.answerDetail === "advanced" || tavilyDepth === "advanced") ? "advanced" : "basic";
      const tavilyMaxResults = Number(webSearchSettings?.maxResults) > 0 ? Number(webSearchSettings.maxResults) : (tavilyDepth === "advanced" ? 7 : 5);

      const exaModel = (webSearchSettings?.exaModel === "deep" || webSearchSettings?.exaModel === "deep-reasoning") ? "exa-pro" : "exa-fast";
      const exaNumResults = Number(webSearchSettings?.maxResults) > 0 ? Number(webSearchSettings.maxResults) : 5;

      try {
        if (provider === "tavily") {
          if (!tavilyKey) {
            return {
              error: "NO_API_KEY",
              message: "API-ключ Tavily не настроен. Добавьте его в Настройках -> ИИ.",
            };
          }
          const response = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: tavilyKey,
              query: query.trim(),
              search_depth: tavilyDepth,
              include_answer: tavilyIncludeAnswer,
              max_results: tavilyMaxResults,
            }),
          });
          if (!response.ok) {
            return { error: "TAVILY_ERROR", message: "Ошибка при выполнении поиска в Tavily." };
          }
          const data: any = await response.json();
          const results = (data.results || []).map((item: any) => ({
            title: item.title || "Без названия",
            url: item.url || "",
            publishedDate: item.published_date || item.publishedDate || null,
            content: (item.content || "").slice(0, 1500),
          }));

          // Track sources for user UI
          for (const r of results) {
            if (r.url && !collectedWebSearchSources.some(s => s.url === r.url)) {
              collectedWebSearchSources.push({
                title: r.title,
                url: r.url,
                publishedDate: r.publishedDate,
                snippet: r.content.slice(0, 180),
              });
            }
          }

          const sourcesText = results.map((r: any, idx: number) => 
            `[Источник ${idx + 1}]: «${r.title}» (${r.publishedDate ? `Дата: ${r.publishedDate}` : 'Актуальный веб-материал'})\nСсылка: ${r.url}\nФрагмент:\n${r.content}`
          ).join("\n\n---\n\n");

          return {
            status: "success",
            search_query: query.trim(),
            current_date: currentDateStr,
            search_mode_applied: tavilyDepth,
            direct_answer_summary: data.answer || "",
            found_sources: results,
            instruction_to_model: "ВНИМАНИЕ: Сформируй ответ исключительно на базе информации выше (direct_answer_summary и found_sources). СТРОГО на русском языке! Не используй китайские символы или иностранный текст без перевода. Не используй старые воспоминания из обучающей выборки.",
            full_search_report: `АКТУАЛЬНЫЕ РЕЗУЛЬТАТЫ ВЕБ-ПОИСКА (по состоянию на ${currentDateStr}, режим поиска: ${tavilyDepth}):\n\nСВОДКА:\n${data.answer || 'Сводка не сформирована'}\n\nСВЕЖИЕ МАТЕРИАЛЫ:\n${sourcesText}`,
          };
        }

        if (provider === "exa") {
          if (!exaKey) {
            return {
              error: "NO_API_KEY",
              message: "API-ключ Exa не настроен. Добавьте его в Настройках -> ИИ.",
            };
          }
          const response = await fetch("https://api.exa.ai/answer", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": exaKey,
            },
            body: JSON.stringify({
              query: query.trim(),
              text: true,
              model: exaModel,
              numResults: exaNumResults,
            }),
          });
          if (!response.ok) {
            return { error: "EXA_ERROR", message: "Ошибка при выполнении поиска в Exa." };
          }
          const data: any = await response.json();
          const results = (data.citations || data.results || []).map((item: any) => ({
            title: item.title || item.url || "Без названия",
            url: item.url || "",
            publishedDate: item.publishedDate || item.published_date || null,
            content: (item.text || item.summary || "").slice(0, 1500),
          }));

          // Track sources for user UI
          for (const r of results) {
            if (r.url && !collectedWebSearchSources.some(s => s.url === r.url)) {
              collectedWebSearchSources.push({
                title: r.title,
                url: r.url,
                publishedDate: r.publishedDate,
                snippet: r.content.slice(0, 180),
              });
            }
          }

          const sourcesText = results.map((r: any, idx: number) => 
            `[Источник ${idx + 1}]: «${r.title}» (${r.publishedDate ? `Дата: ${r.publishedDate}` : 'Актуальный веб-материал'})\nСсылка: ${r.url}\nФрагмент:\n${r.content}`
          ).join("\n\n---\n\n");

          return {
            status: "success",
            search_query: query.trim(),
            current_date: currentDateStr,
            search_model_applied: exaModel,
            direct_answer_summary: data.answer || "",
            found_sources: results,
            instruction_to_model: "ВНИМАНИЕ: Сформируй ответ исключительно на базе информации выше (direct_answer_summary и found_sources). СТРОГО на русском языке! Не используй китайские символы или иностранный текст без перевода. Не используй старые воспоминания из обучающей выборки.",
            full_search_report: `АКТУАЛЬНЫЕ РЕЗУЛЬТАТЫ ВЕБ-ПОИСКА (по состоянию на ${currentDateStr}, модель: ${exaModel}):\n\nСВОДКА:\n${data.answer || 'Сводка не сформирована'}\n\nСВЕЖИЕ МАТЕРИАЛЫ:\n${sourcesText}`,
          };
        }

        return { error: "UNKNOWN_PROVIDER", message: `Провайдер ${provider} не поддерживается.` };
      } catch (err: any) {
        return { error: "SEARCH_FETCH_ERROR", message: err.message || "Ошибка сети при поиске." };
      }
    };

    // Helper for executing read tools against user's workspace
    const executeReadTool = async (toolName: string, args: any) => {
      const safeArgs = (args && typeof args === 'object') ? args : {};
      const notes: any[] = Array.isArray(workspaceData?.notes) ? workspaceData.notes.filter(Boolean) : [];
      const taskLists: any[] = Array.isArray(workspaceData?.taskLists) ? workspaceData.taskLists.filter(Boolean) : [];
      const blocks: any[] = Array.isArray(workspaceData?.blocks) ? workspaceData.blocks.filter(Boolean) : [];
      const tags: any[] = Array.isArray(workspaceData?.tags) ? workspaceData.tags.filter(Boolean) : [];
      const events: any[] = Array.isArray(workspaceData?.events) ? workspaceData.events.filter(Boolean) : [];
      const currentDateStr: string = workspaceData?.currentDate || new Date().toISOString().split('T')[0];

      const cleanText = (html: string = '') => {
        return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      };

      if (toolName === 'web_search') {
        const q = safeArgs.query || safeArgs.q || webSearchQuery || '';
        return await performWebSearchBackend(q);
      }

      if (toolName === 'get_social_links' || toolName === 'get_community_links') {
        return {
          title: "Официальные сообщества и соцсети Veris Note (из раздела «Другое»):",
          channels: [
            {
              platform: "YouTube",
              handle: "@verisnote",
              url: "https://youtube.com/@verisnote",
              description: "Официальный канал YouTube с видео и обзорами обновлений"
            },
            {
              platform: "TikTok",
              handle: "@verisnote",
              url: "https://www.tiktok.com/@verisnote?_r=1&_t=ZS-98wNXXyC8ON",
              description: "Официальный TikTok аккаунт"
            },
            {
              platform: "Instagram",
              handle: "@verisnote",
              url: "https://www.instagram.com/verisnote?igsh=MXIwbG95N3ZhOW5icg==",
              description: "Официальный профиль Instagram"
            },
            {
              platform: "Pinterest",
              handle: "pin.it/1MhiRppt2",
              url: "https://pin.it/1MhiRppt2",
              description: "Официальная страница и доски Pinterest"
            },
            {
              platform: "Telegram",
              handle: "t.me/VerisNote",
              url: "https://t.me/VerisNote",
              description: "Официальный Telegram-канал с новостями и анонсами"
            }
          ]
        };
      }

      if (toolName === 'search_calendar_events') {
        const todayDate = new Date(currentDateStr);
        const formatYMD = (d: Date) => d.toISOString().split('T')[0];

        let targetDate = (safeArgs.date || '').trim();
        let startDate = (safeArgs.start_date || '').trim();
        let endDate = (safeArgs.end_date || '').trim();
        const range = (safeArgs.range || '').trim().toLowerCase();
        const query = (safeArgs.query || '').trim().toLowerCase();

        // Handle relative dates
        if (targetDate === 'today' || range === 'today') {
          targetDate = formatYMD(todayDate);
        } else if (targetDate === 'tomorrow' || range === 'tomorrow') {
          const tm = new Date(todayDate);
          tm.setDate(tm.getDate() + 1);
          targetDate = formatYMD(tm);
        } else if (targetDate === 'yesterday') {
          const yest = new Date(todayDate);
          yest.setDate(yest.getDate() - 1);
          targetDate = formatYMD(yest);
        } else if (range === 'this_week') {
          const dayOfWeek = todayDate.getDay() || 7; // 1 = Mon, 7 = Sun
          const mon = new Date(todayDate);
          mon.setDate(mon.getDate() - (dayOfWeek - 1));
          const sun = new Date(mon);
          sun.setDate(sun.getDate() + 6);
          startDate = formatYMD(mon);
          endDate = formatYMD(sun);
        } else if (range === 'next_week') {
          const dayOfWeek = todayDate.getDay() || 7;
          const nextMon = new Date(todayDate);
          nextMon.setDate(nextMon.getDate() + (8 - dayOfWeek));
          const nextSun = new Date(nextMon);
          nextSun.setDate(nextSun.getDate() + 6);
          startDate = formatYMD(nextMon);
          endDate = formatYMD(nextSun);
        } else if (range === 'this_month') {
          const firstDay = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
          const lastDay = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0);
          startDate = formatYMD(firstDay);
          endDate = formatYMD(lastDay);
        }

        const matchedEvents = events.filter((ev: any) => {
          if (!ev || typeof ev !== 'object') return false;
          const evDate = (ev.date || '').trim();
          const evTitle = (ev.title || '').toLowerCase();
          const evDesc = (ev.description || '').toLowerCase();

          // Date filtering
          if (targetDate && evDate !== targetDate) {
            return false;
          }
          if (startDate && evDate < startDate) {
            return false;
          }
          if (endDate && evDate > endDate) {
            return false;
          }

          // Keyword filtering
          if (query) {
            if (!evTitle.includes(query) && !evDesc.includes(query)) {
              return false;
            }
          }

          return true;
        });

        // Sort events chronologically
        matchedEvents.sort((a: any, b: any) => {
          const aDate = a?.date || '';
          const bDate = b?.date || '';
          if (aDate !== bDate) return aDate.localeCompare(bDate);
          if (a?.isAllDay && !b?.isAllDay) return -1;
          if (!a?.isAllDay && b?.isAllDay) return 1;
          return (a?.startTime || '').localeCompare(b?.startTime || '');
        });

        return {
          currentDate: currentDateStr,
          filterApplied: { targetDate: targetDate || undefined, startDate: startDate || undefined, endDate: endDate || undefined, range: range || undefined, query: query || undefined },
          count: matchedEvents.length,
          events: matchedEvents.map((ev: any) => ({
            id: ev?.id,
            title: ev?.title,
            date: ev?.date,
            isAllDay: ev?.isAllDay ?? true,
            startTime: ev?.startTime || null,
            endTime: ev?.endTime || null,
            remindOnDay: ev?.remindOnDay ?? false,
            description: ev?.description || '',
          })),
        };
      }

      if (toolName === 'search_workspace') {
        const rawQuery = (safeArgs.query || safeArgs.q || '').trim().toLowerCase();
        const type = (safeArgs.type || 'all').toLowerCase();
        const filterTag = (safeArgs.tag || '').trim().toLowerCase().replace(/^#/g, '');

        if (!rawQuery && !filterTag) {
          return {
            message: "Поисковый запрос пуст. Укажите ключевое слово или тег.",
            notes: [],
            tasks: [],
          };
        }

        const matchedNotes: any[] = [];
        if (type === 'all' || type === 'notes') {
          for (const n of notes) {
            const title = (n.title || '').toLowerCase();
            const plain = cleanText(n.content || '').toLowerCase();
            const noteTags = Array.isArray(n.tags) ? n.tags.map((t: string) => t.toLowerCase()) : [];
            const blockObj = blocks.find((b: any) => b.id === n.blockId);
            const blockName = blockObj ? blockObj.name.toLowerCase() : '';

            if (filterTag && !noteTags.includes(filterTag)) {
              continue;
            }

            let isMatch = false;
            let snippet = '';

            if (!rawQuery) {
              isMatch = true;
              snippet = cleanText(n.content || '').slice(0, 150);
            } else if (title.includes(rawQuery) || blockName.includes(rawQuery) || noteTags.some((t: string) => t.includes(rawQuery))) {
              isMatch = true;
              snippet = cleanText(n.content || '').slice(0, 200);
            } else if (plain.includes(rawQuery)) {
              isMatch = true;
              const idx = plain.indexOf(rawQuery);
              const start = Math.max(0, idx - 60);
              const end = Math.min(plain.length, idx + rawQuery.length + 100);
              snippet = (start > 0 ? '...' : '') + cleanText(n.content || '').slice(start, end) + (end < plain.length ? '...' : '');
            }

            if (isMatch) {
              matchedNotes.push({
                id: n.id,
                title: n.title || 'Без названия',
                block: blockObj ? blockObj.name : (n.blockId === 'pinned' ? 'Закреплённые' : 'Общие'),
                tags: n.tags || [],
                snippet: snippet || '(пустое содержимое)',
              });
            }
          }
        }

        const matchedTasks: any[] = [];
        if (type === 'all' || type === 'tasks') {
          for (const t of taskLists) {
            const title = (t.title || '').toLowerCase();
            const taskTags = Array.isArray(t.tags) ? t.tags.map((tg: string) => tg.toLowerCase()) : [];
            const items = Array.isArray(t.items) ? t.items : [];

            if (filterTag && !taskTags.includes(filterTag)) {
              continue;
            }

            let isMatch = false;
            const matchingItems: string[] = [];

            if (!rawQuery) {
              isMatch = true;
            } else if (title.includes(rawQuery) || taskTags.some((tg: string) => tg.includes(rawQuery))) {
              isMatch = true;
            }

            for (const it of items) {
              const itText = (it.text || '').toLowerCase();
              if (rawQuery && itText.includes(rawQuery)) {
                isMatch = true;
                matchingItems.push(`${it.completed ? '[x]' : '[ ]'} ${it.text}`);
              }
            }

            if (isMatch) {
              matchedTasks.push({
                id: t.id,
                title: t.title || 'Список задач',
                tags: t.tags || [],
                totalItems: items.length,
                completedItems: items.filter((it: any) => it.completed).length,
                matchingItems: matchingItems.length > 0 ? matchingItems : items.slice(0, 5).map((it: any) => `${it.completed ? '[x]' : '[ ]'} ${it.text}`),
              });
            }
          }
        }

        return {
          query: rawQuery,
          foundNotesCount: matchedNotes.length,
          notes: matchedNotes.slice(0, 10),
          foundTasksCount: matchedTasks.length,
          tasks: matchedTasks.slice(0, 10),
        };
      }

      if (toolName === 'get_note_content') {
        const rawIds: string[] = Array.isArray(safeArgs.note_ids) ? safeArgs.note_ids : (safeArgs.note_id ? [safeArgs.note_id] : (safeArgs.id ? [safeArgs.id] : []));
        const rawTitles: string[] = Array.isArray(safeArgs.note_titles) ? safeArgs.note_titles : (safeArgs.note_title ? [safeArgs.note_title] : (safeArgs.title ? [safeArgs.title] : []));

        const resultNotes: any[] = [];

        for (const id of rawIds) {
          const found = notes.find((n: any) => n.id === id);
          if (found && !resultNotes.some(r => r.id === found.id)) {
            const blockObj = blocks.find((b: any) => b.id === found.blockId);
            resultNotes.push({
              id: found.id,
              title: found.title || 'Без названия',
              content: cleanText(found.content || ''),
              rawHtml: found.content || '',
              block: blockObj ? blockObj.name : (found.blockId === 'pinned' ? 'Закреплённые' : 'Общие'),
              tags: found.tags || [],
              updatedAt: found.updatedAt,
            });
          }
        }

        for (const rawTitle of rawTitles) {
          if (!rawTitle) continue;
          const cleanTitle = String(rawTitle).trim().toLowerCase().replace(/^["'«]|["'»]$/g, '');
          const found = notes.find((n: any) => (n.title || '').toLowerCase().trim() === cleanTitle) ||
                        notes.find((n: any) => (n.title || '').toLowerCase().includes(cleanTitle));
          if (found && !resultNotes.some(r => r.id === found.id)) {
            const blockObj = blocks.find((b: any) => b.id === found.blockId);
            resultNotes.push({
              id: found.id,
              title: found.title || 'Без названия',
              content: cleanText(found.content || ''),
              rawHtml: found.content || '',
              block: blockObj ? blockObj.name : (found.blockId === 'pinned' ? 'Закреплённые' : 'Общие'),
              tags: found.tags || [],
              updatedAt: found.updatedAt,
            });
          }
        }

        if (resultNotes.length === 0 && notes.length > 0) {
          return {
            found: false,
            message: "Заметка с указанным ID или заголовком не найдена. Попробуйте выполнить search_workspace.",
          };
        }

        return {
          found: true,
          notes: resultNotes,
        };
      }

      if (toolName === 'get_task_list') {
        const rawId = safeArgs.task_list_id || safeArgs.id;
        const rawTitle = safeArgs.task_list_title || safeArgs.title;

        let targetList: any = null;
        if (rawId) {
          targetList = taskLists.find((t: any) => t.id === rawId);
        }
        if (!targetList && rawTitle) {
          const cleanTitle = String(rawTitle).trim().toLowerCase().replace(/^["'«]|["'»]$/g, '');
          targetList = taskLists.find((t: any) => (t.title || '').toLowerCase().trim() === cleanTitle) ||
                       taskLists.find((t: any) => (t.title || '').toLowerCase().includes(cleanTitle));
        }

        if (!targetList) {
          return {
            found: false,
            message: "Список задач не найден. Проверьте название или выполните search_workspace.",
          };
        }

        return {
          found: true,
          id: targetList.id,
          title: targetList.title,
          tags: targetList.tags || [],
          items: (targetList.items || []).map((it: any) => ({
            id: it.id,
            text: it.text,
            completed: Boolean(it.completed),
          })),
          totalCount: (targetList.items || []).length,
          completedCount: (targetList.items || []).filter((it: any) => it.completed).length,
        };
      }

      if (toolName === 'list_workspace_items') {
        const category = (safeArgs.category || 'all').toLowerCase();
        const filterTag = (safeArgs.tag || '').trim().toLowerCase().replace(/^#/g, '');
        const filterBlock = (safeArgs.block || '').trim().toLowerCase();

        const noteHeaders: any[] = [];
        if (category === 'all' || category === 'notes') {
          for (const n of notes) {
            const noteTags = Array.isArray(n.tags) ? n.tags.map((t: string) => t.toLowerCase()) : [];
            const blockObj = blocks.find((b: any) => b.id === n.blockId);
            const blockName = blockObj ? blockObj.name : (n.blockId === 'pinned' ? 'Закреплённые' : 'Общие');

            if (filterTag && !noteTags.includes(filterTag)) continue;
            if (filterBlock && blockName.toLowerCase() !== filterBlock) continue;

            noteHeaders.push({
              id: n.id,
              title: n.title || 'Без названия',
              block: blockName,
              tags: n.tags || [],
              pinned: n.blockId === 'pinned',
            });
          }
        }

        const taskHeaders: any[] = [];
        if (category === 'all' || category === 'tasks') {
          for (const t of taskLists) {
            const taskTags = Array.isArray(t.tags) ? t.tags.map((tg: string) => tg.toLowerCase()) : [];
            if (filterTag && !taskTags.includes(filterTag)) continue;

            taskHeaders.push({
              id: t.id,
              title: t.title || 'Список задач',
              tags: t.tags || [],
              total: (t.items || []).length,
              completed: (t.items || []).filter((it: any) => it.completed).length,
            });
          }
        }

        return {
          category,
          notes: noteHeaders.slice(0, 30),
          totalNotes: noteHeaders.length,
          tasks: taskHeaders.slice(0, 20),
          totalTasks: taskHeaders.length,
          blocks: blocks.map((b: any) => ({ id: b.id, name: b.name })),
          tags: tags.map((t: any) => ({ name: t.name, color: t.color })),
        };
      }

      return { error: `Неизвестная функция ${toolName}` };
    };

    // ReAct Multi-turn Execution Loop
    const MAX_REACT_STEPS = 5;
    const executionTrace: Array<{
      step: number;
      tool: string;
      queryOrTarget?: string;
      resultSummary?: string;
    }> = [];

    const readToolNames = new Set([
      "search_workspace",
      "get_note_content",
      "get_task_list",
      "list_workspace_items",
      "search_calendar_events",
      "get_social_links",
      "get_community_links",
      ...(webSearchMode !== "never" ? ["web_search"] : [])
    ]);
    const currentMessages: any[] = [...cohereMessages];
    let finalReplyText = "";
    const collectedMutationToolCalls: any[] = [];
    let lastUsage: any = null;

    for (let loopStep = 0; loopStep < MAX_REACT_STEPS; loopStep++) {
      let response: Response;
      if (isIonet) {
        const ionetBaseUrl = (baseUrl || "https://api.intelligence.io.solutions/api/v1").replace(/\/+$/, "");

        // Model alias / migration table for io.net
        const IONET_ALIASES: Record<string, string> = {
          "deepseek-ai/DeepSeek-V3": "deepseek-ai/DeepSeek-V3.2",
          "deepseek-ai/DeepSeek-R1": "deepseek-ai/DeepSeek-R1-0528",
          "Qwen/Qwen2.5-72B-Instruct": "Qwen/Qwen3.8-27B",
          "Qwen/Qwen2.5-Coder-32B-Instruct": "Intel/Qwen3-Coder-480B-A35B-Instruct-int4-mixed-ar",
          "meta-llama/Meta-Llama-3.1-8B-Instruct": "meta-llama/Llama-3.3-70B-Instruct",
          "mistralai/Mistral-7B-Instruct-v0.3": "mistralai/Mistral-Nemo-Instruct-2407",
        };
        let effectiveModel = IONET_ALIASES[selectedModel] || selectedModel;

        // Determine if model is reasoning (e.g. DeepSeek-R1, reasoning models) that forbids role: "system"
        const isReasoning = /r1|reasoning/i.test(effectiveModel);

        // Format messages cleanly for OpenAI standard compatibility
        const formattedMessages: any[] = [];
        let systemContentAccumulator = "";

        for (const m of currentMessages) {
          if (m.role === "system") {
            if (isReasoning) {
              systemContentAccumulator += (systemContentAccumulator ? "\n\n" : "") + (m.content || "");
            } else {
              formattedMessages.push({ role: "system", content: m.content || "" });
            }
          } else if (m.role === "user") {
            let content = m.content || "";
            if (systemContentAccumulator) {
              content = `[Инструкции системы]:\n${systemContentAccumulator}\n\n${content}`;
              systemContentAccumulator = "";
            }
            formattedMessages.push({ role: "user", content });
          } else if (m.role === "assistant") {
            const assistantMsg: any = { role: "assistant", content: m.content || "" };
            if (Array.isArray(m.tool_calls) && m.tool_calls.length > 0) {
              assistantMsg.tool_calls = m.tool_calls;
            }
            formattedMessages.push(assistantMsg);
          } else if (m.role === "tool") {
            formattedMessages.push({
              role: "tool",
              tool_call_id: m.tool_call_id,
              content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
            });
          }
        }

        if (systemContentAccumulator && formattedMessages.length === 0) {
          formattedMessages.push({ role: "user", content: systemContentAccumulator });
        }

        let requestPayload: any = {
          model: effectiveModel,
          messages: formattedMessages,
          temperature: typeof temperature === "number" ? Math.max(0.1, Math.min(1.0, temperature)) : 0.7,
          max_tokens: 4096,
        };

        // Try calling io.net with tools
        response = await fetch(`${ionetBaseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token.trim()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...requestPayload,
            tools: cohereTools,
          }),
        });

        // If io.net rejects the request with 400 or 422:
        if (!response.ok && (response.status === 400 || response.status === 422)) {
          const errClone = response.clone();
          const errBody = await errClone.json().catch(() => null);
          const rawErr = (typeof errBody?.detail === "string" ? errBody.detail : "") ||
                         (typeof errBody?.message === "string" ? errBody.message : "") ||
                         (Array.isArray(errBody?.detail) ? JSON.stringify(errBody.detail) : "") ||
                         "";

          // Check if model is not available: "The requested model is not available for Chat Completions API. Available models: [...]"
          if (rawErr.includes("The requested model is not available") || rawErr.includes("is not available for Chat Completions API")) {
            let fallbackModel = "meta-llama/Llama-3.3-70B-Instruct";
            const match = rawErr.match(/Available models:\s*\[(.*?)\]/s);
            if (match && match[1]) {
              const availableList = match[1]
                .split(",")
                .map((s: string) => s.trim().replace(/^['"]|['"]$/g, ""))
                .filter(Boolean);

              if (/deepseek.*r1/i.test(effectiveModel)) {
                fallbackModel = availableList.find((m: string) => /deepseek.*r1/i.test(m)) || fallbackModel;
              } else if (/deepseek/i.test(effectiveModel)) {
                fallbackModel = availableList.find((m: string) => /deepseek.*(v3|v4)/i.test(m)) || availableList.find((m: string) => /deepseek/i.test(m)) || fallbackModel;
              } else if (/qwen.*coder/i.test(effectiveModel)) {
                fallbackModel = availableList.find((m: string) => /qwen.*coder/i.test(m)) || availableList.find((m: string) => /qwen/i.test(m)) || fallbackModel;
              } else if (/qwen/i.test(effectiveModel)) {
                fallbackModel = availableList.find((m: string) => /qwen/i.test(m)) || fallbackModel;
              } else if (/mistral/i.test(effectiveModel)) {
                fallbackModel = availableList.find((m: string) => /mistral/i.test(m)) || fallbackModel;
              } else if (/gpt/i.test(effectiveModel)) {
                fallbackModel = availableList.find((m: string) => /gpt/i.test(m)) || fallbackModel;
              } else if (availableList.includes("meta-llama/Llama-3.3-70B-Instruct")) {
                fallbackModel = "meta-llama/Llama-3.3-70B-Instruct";
              } else if (availableList.length > 0) {
                fallbackModel = availableList[0];
              }
            }

            console.warn(`[io.net] Requested model '${effectiveModel}' unavailable. Retrying with active model: '${fallbackModel}'`);
            requestPayload.model = fallbackModel;

            let retryResp = await fetch(`${ionetBaseUrl}/chat/completions`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${token.trim()}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                ...requestPayload,
                tools: cohereTools,
              }),
            });

            if (!retryResp.ok && (retryResp.status === 400 || retryResp.status === 422)) {
              retryResp = await fetch(`${ionetBaseUrl}/chat/completions`, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${token.trim()}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(requestPayload),
              });
            }

            if (retryResp.ok) {
              response = retryResp;
            }
          } else {
            console.warn(`[io.net] Request with tools failed with HTTP ${response.status}. Retrying without tools... Details:`, rawErr);
            const retryResponse = await fetch(`${ionetBaseUrl}/chat/completions`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${token.trim()}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(requestPayload),
            });

            if (retryResponse.ok) {
              response = retryResponse;
            }
          }
        }
      } else {
        response = await fetch("https://api.cohere.com/v2/chat", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token.trim()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: currentMessages,
            tools: cohereTools,
            temperature: typeof temperature === "number" ? temperature : 0.7,
          }),
        });
      }

      const data: any = await response.json().catch(() => null);

      if (!response.ok) {
        let errorMsg = "";
        if (typeof data?.detail === "string") {
          errorMsg = data.detail;
        } else if (Array.isArray(data?.detail)) {
          errorMsg = data.detail
            .map((d: any) => (typeof d === "object" ? (d.msg || d.message || JSON.stringify(d)) : String(d)))
            .join("; ");
        } else if (typeof data?.error?.message === "string") {
          errorMsg = data.error.message;
        } else if (typeof data?.message === "string") {
          errorMsg = data.message;
        } else if (typeof data?.error === "string") {
          errorMsg = data.error;
        }

        if (response.status === 401) {
          errorMsg = isIonet
            ? "Неверный API-ключ io.net (401 Unauthorized). Проверьте ключ в Настройках -> ИИ."
            : "Неверный API-ключ Cohere (401 Unauthorized). Проверьте ключ в Настройках -> ИИ.";
        } else if (response.status === 429) {
          errorMsg = isIonet
            ? "Превышен лимит запросов io.net API (429 Rate Limit). Пожалуйста, подождите немного."
            : "Превышен лимит запросов Cohere API (429 Rate Limit). Для бесплатных ключей лимит 20 запросов в минуту. Пожалуйста, подождите немного.";
        } else if (response.status === 404) {
          errorMsg = isIonet
            ? `Выбранная модель «${selectedModel}» недоступна на io.net. Проверьте ID модели в настройках.`
            : `Выбранная модель недоступна на вашем API-ключе. Попробуйте выбрать Command R7B или Command R в настройках.`;
        } else if (!errorMsg) {
          errorMsg = `Ошибка ${isIonet ? "io.net" : "Cohere"} API (HTTP ${response.status})`;
        }

        console.error(`${isIonet ? "io.net" : "Cohere"} API Error:`, response.status, data);
        return res.status(response.status).json({
          error: isIonet ? "IONET_ERROR" : "COHERE_ERROR",
          message: errorMsg,
          status: response.status,
        });
      }

      if (data?.usage) {
        lastUsage = data.usage;
      }

      // Extract text and tool calls from response (OpenAI format for io.net / Cohere v2 format for Cohere)
      let stepText = "";
      let rawToolCalls: any[] = [];

      if (isIonet) {
        const choiceMsg = data?.choices?.[0]?.message;
        stepText = choiceMsg?.content || "";
        if (!stepText && choiceMsg?.reasoning_content) {
          stepText = choiceMsg.reasoning_content;
        }
        rawToolCalls = choiceMsg?.tool_calls || [];
      } else {
        if (data?.message?.content && Array.isArray(data.message.content)) {
          stepText = data.message.content.map((c: any) => c.text || "").join("\n");
        } else if (typeof data?.text === "string") {
          stepText = data.text;
        } else if (data?.reply) {
          stepText = data.reply;
        }
        rawToolCalls = data?.message?.tool_calls || [];
      }

      if (stepText) {
        finalReplyText = stepText;
      }

      if (!rawToolCalls || !Array.isArray(rawToolCalls) || rawToolCalls.length === 0) {
        // No more tool calls requested -> model reached final answer
        break;
      }

      // Parse tool calls
      const readToolCalls: any[] = [];
      const mutationToolCalls: any[] = [];

      for (const tc of rawToolCalls) {
        let fnArgs: any = {};
        try {
          fnArgs = typeof tc.function?.arguments === "string" ? JSON.parse(tc.function.arguments) : (tc.function?.arguments || {});
        } catch {
          fnArgs = {};
        }
        if (!fnArgs || typeof fnArgs !== "object") {
          fnArgs = {};
        }

        const parsedTc = {
          id: tc.id || `tc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: tc.function?.name,
          arguments: fnArgs,
        };

        if (readToolNames.has(parsedTc.name)) {
          readToolCalls.push(parsedTc);
        } else {
          mutationToolCalls.push(parsedTc);
          collectedMutationToolCalls.push(parsedTc);
        }
      }

      // Check if web_search was requested in 'ask' mode without confirmation (unless forced by user via slash command)
      const webSearchCall = readToolCalls.find(tc => tc.name === "web_search");
      if (webSearchCall && webSearchMode === "ask" && !confirmedWebSearch && !webSearchDeclined && !forceWebSearch) {
        const searchQuery = webSearchCall.arguments?.query || webSearchCall.arguments?.q || "";
        return res.json({
          text: stepText || `Для ответа требуется актуальная информация из интернета по запросу: «${searchQuery}». Запрашиваю подтверждение на выполнение поиска.`,
          pendingWebSearch: {
            query: searchQuery,
            toolCallId: webSearchCall.id,
          },
          executionTrace,
          model: selectedModel,
          usage: lastUsage,
        });
      }

      // If the model executed read/retrieval tools, execute them locally and feed tool results back into the ReAct loop!
      if (readToolCalls.length > 0) {
        // Append assistant message containing the tool_calls
        currentMessages.push({
          role: "assistant",
          content: stepText || "",
          tool_calls: rawToolCalls,
        });

        for (const rtc of readToolCalls) {
          let toolResult: any;
          const safeRtcArgs = (rtc?.arguments && typeof rtc.arguments === "object") ? rtc.arguments : {};
          if (rtc.name === "web_search" && webSearchDeclined) {
            toolResult = {
              status: "declined",
              message: "Пользователь отклонил веб-поиск в интернете. Ответь на вопрос без поиска, используя общие знания, и упомяни, что поиск был отклонён.",
            };
          } else {
            toolResult = await executeReadTool(rtc.name, safeRtcArgs);
          }

          const targetStr = safeRtcArgs.date || safeRtcArgs.range || safeRtcArgs.query || safeRtcArgs.note_title || safeRtcArgs.task_list_title || safeRtcArgs.category || (Array.isArray(safeRtcArgs.note_titles) ? safeRtcArgs.note_titles.join(', ') : '');

          executionTrace.push({
            step: loopStep + 1,
            tool: rtc.name,
            queryOrTarget: targetStr,
            resultSummary: typeof toolResult === 'object' ? JSON.stringify(toolResult).slice(0, 160) : String(toolResult).slice(0, 160),
          });

          // Feed result back in Cohere v2 format
          currentMessages.push({
            role: "tool",
            tool_call_id: rtc.id,
            content: JSON.stringify(toolResult),
          });
        }
        // Continue ReAct loop so model can process retrieved data
        continue;
      } else {
        // Only mutation tools or done -> finish ReAct loop
        break;
      }
    }

    if (collectedMutationToolCalls.length > 0 && !finalReplyText) {
      const confirmations = collectedMutationToolCalls.map(t => t.arguments?.confirmation_message).filter(Boolean);
      if (confirmations.length > 0) {
        finalReplyText = confirmations.join("\n");
      }
    }

    const primaryToolCall = collectedMutationToolCalls.length > 0 ? collectedMutationToolCalls[0] : null;

    res.json({
      text: finalReplyText,
      toolCall: primaryToolCall,
      toolCalls: collectedMutationToolCalls,
      executionTrace,
      webSearchSources: collectedWebSearchSources.length > 0 ? collectedWebSearchSources : undefined,
      model: selectedModel,
      usage: lastUsage,
    });
  } catch (error: any) {
    console.error("Anacrusa Chat API Error:", error);
    res.status(500).json({
      error: "SERVER_ERROR",
      message: error.message || "Не удалось связаться с сервером ИИ",
    });
  }
};

// Register chat endpoints (Cohere, io.net, unified)
app.post("/api/ai/chat", handleAnacrusaChat);
app.post("/api/ai/cohere/chat", handleAnacrusaChat);
app.post("/api/ai/ionet/chat", handleAnacrusaChat);

// Endpoint to fetch available models or verify API key on io.net
app.post("/api/ai/ionet/models", async (req, res) => {
  try {
    const { apiKey, baseUrl } = req.body;
    const token = apiKey || process.env.IONET_API_KEY;
    if (!token || !token.trim()) {
      return res.status(400).json({
        error: "NO_API_KEY",
        message: "API-ключ io.net не указан.",
      });
    }
    const ionetBaseUrl = (baseUrl || "https://api.intelligence.io.solutions/api/v1").replace(/\/+$/, "");
    const response = await fetch(`${ionetBaseUrl}/models`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token.trim()}`,
      },
    });

    if (!response.ok) {
      const errData: any = await response.json().catch(() => ({}));
      const msg = errData?.error?.message || errData?.message || `Ошибка io.net (HTTP ${response.status})`;
      return res.status(response.status).json({
        error: "MODELS_FETCH_ERROR",
        message: msg,
        status: response.status,
      });
    }

    const data: any = await response.json().catch(() => null);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({
      error: "SERVER_ERROR",
      message: err?.message || "Ошибка подключения к io.net",
    });
  }
});

// Web Search API Proxy (BYOK + Extensible Providers: Tavily, Exa)
app.post("/api/web-search", async (req, res) => {
  try {
    const {
      query,
      apiKey,
      provider = "tavily",
      searchDepth = "basic",
      answerDetail = "basic",
      maxResults = 5,
      exaModel = "fast",
      exaIncludeAnswer = true,
    } = req.body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return res.status(400).json({ error: "Поисковый запрос не может быть пустым." });
    }

    if (provider === "tavily") {
      const keyToUse = apiKey || process.env.TAVILY_API_KEY;
      if (!keyToUse) {
        return res.status(400).json({
          error: "NO_API_KEY",
          message: "API-ключ не настроен. Укажите ваш API-ключ Tavily в Настройках -> ИИ.",
        });
      }

      const tavilyResponse = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: keyToUse,
          query: query.trim(),
          search_depth: searchDepth === "advanced" ? "advanced" : "basic",
          include_answer: answerDetail === "advanced" ? "advanced" : true,
          max_results: 7,
        }),
      });

      if (!tavilyResponse.ok) {
        const errorData: any = await tavilyResponse.json().catch(() => ({}));
        const status = tavilyResponse.status;
        let userMessage = errorData.detail || errorData.message || "Ошибка при выполнении поиска в Tavily.";
        if (status === 401 || status === 403) {
          userMessage = "Неверный или недействительный API-ключ Tavily. Проверьте ключ в Настройках -> ИИ.";
        } else if (status === 429) {
          userMessage = "Превышен лимит запросов к Tavily API. Проверьте ваш тарифный план на tavily.com.";
        }
        return res.status(status).json({ error: "TAVILY_ERROR", message: userMessage });
      }

      const data: any = await tavilyResponse.json();

      const results = (data.results || []).map((item: any) => ({
        title: item.title || "Без названия",
        url: item.url || "",
        content: item.content || "",
        score: item.score || 0,
        publishedDate: item.published_date || item.publishedDate || null,
      }));

      return res.json({
        query: query.trim(),
        answer: data.answer || "",
        results,
        provider: "tavily",
        searchDepth,
      });
    }

    if (provider === "exa") {
      const keyToUse = apiKey || process.env.EXA_API_KEY;
      if (!keyToUse) {
        return res.status(400).json({
          error: "NO_API_KEY",
          message: "API-ключ не настроен. Укажите ваш API-ключ Exa (exa.ai) в Настройках -> ИИ.",
        });
      }

      const shouldIncludeAnswer = Boolean(exaIncludeAnswer);

      // Map model names to Exa API specifications
      // Exa /answer model enum: "exa" | "exa-pro" | "exa-research" | "exa-fast"
      const exaAnswerModelMap: Record<string, string> = {
        fast: "exa-fast",
        deep: "exa-pro",
        "deep-reasoning": "exa-research",
      };
      const modelForAnswer = exaAnswerModelMap[exaModel] || "exa-fast";

      // Exa /search type enum: "auto" | "fast" | "instant" | "deep" | "deep-reasoning"
      const exaSearchTypeMap: Record<string, string> = {
        fast: "fast",
        deep: "deep",
        "deep-reasoning": "deep-reasoning",
      };
      const typeForSearch = exaSearchTypeMap[exaModel] || "fast";

      let exaResponse: Response;

      if (shouldIncludeAnswer) {
        // Exa /answer endpoint
        exaResponse = await fetch("https://api.exa.ai/answer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": keyToUse,
          },
          body: JSON.stringify({
            query: query.trim(),
            text: true,
            model: modelForAnswer,
            numResults: 10,
          }),
        });
      } else {
        // Exa /search endpoint
        exaResponse = await fetch("https://api.exa.ai/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": keyToUse,
          },
          body: JSON.stringify({
            query: query.trim(),
            type: typeForSearch,
            numResults: 10,
            contents: {
              text: { maxCharacters: 1000 },
              highlights: true,
            },
          }),
        });
      }

      if (!exaResponse.ok) {
        const errorData: any = await exaResponse.json().catch(() => ({}));
        const status = exaResponse.status;
        let userMessage = errorData.error || errorData.message || errorData.detail || "Ошибка при выполнении поиска в Exa API.";
        if (status === 401 || status === 403) {
          userMessage = "Неверный или недействительный API-ключ Exa. Проверьте ключ в Настройках -> ИИ.";
        } else if (status === 429) {
          userMessage = "Превышен лимит запросов к Exa API. Проверьте баланс или тариф на exa.ai.";
        }
        return res.status(status).json({ error: "EXA_ERROR", message: userMessage });
      }

      const data: any = await exaResponse.json();

      let answerText = "";
      let rawResults: any[] = [];

      if (shouldIncludeAnswer) {
        answerText = data.answer || "";
        rawResults = data.citations || data.results || [];
      } else {
        rawResults = data.results || [];
      }

      const results = rawResults.map((item: any) => {
        let content = "";
        if (Array.isArray(item.highlights) && item.highlights.length > 0) {
          content = item.highlights.join(" ... ");
        } else if (item.text) {
          content = item.text;
        } else if (item.summary) {
          content = item.summary;
        }

        return {
          title: item.title || item.url || "Без названия",
          url: item.url || "",
          content: content || "",
          score: typeof item.score === "number" ? item.score : undefined,
          publishedDate: item.publishedDate || item.published_date || null,
        };
      });

      return res.json({
        query: query.trim(),
        answer: answerText,
        results,
        provider: "exa",
        searchDepth: exaModel || "fast",
      });
    }

    return res.status(400).json({ error: "UNSUPPORTED_PROVIDER", message: `Провайдер ${provider} пока не поддерживается.` });
  } catch (error: any) {
    console.error("Web Search error:", error);
    res.status(500).json({ error: "SERVER_ERROR", message: error.message || "Не удалось выполнить веб-поиск." });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
