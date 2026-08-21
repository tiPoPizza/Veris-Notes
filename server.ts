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

// AI API Endpoints for Veris Notes
app.post("/api/ai/process", async (req, res) => {
  try {
    const { action, text, prompt: userPrompt, noteTitle } = req.body;
    const ai = getAIClient();

    let systemInstruction = "Ты — встроенный ассистент приложения заметок Veris. Отвечай прямо, красиво, без лишнего оформления, сохраняя тон и язык запроса пользователя.";
    let promptText = "";

    if (action === "continue") {
      promptText = `Продолжи следующую заметку (Заголовок: "${noteTitle || ''}") изящно и логично на 2-4 предложения:\n\n${text}`;
    } else if (action === "fix") {
      promptText = `Улучши стиль, орфографию и пунктуацию следующего текста, сохранив исходный смысл:\n\n${text}`;
    } else if (action === "summarize") {
      promptText = `Сделай краткое содержание этой заметки в 1-3 предложениях:\n\n${text}`;
    } else if (action === "generate-tasks") {
      systemInstruction = "Ты помощник по планированию. Создай список задач в формате JSON массивом строк из заметки.";
      promptText = `Выдели конкретные действия и создай список задач из текста:\n\n${text}`;
    } else if (action === "custom") {
      promptText = `${userPrompt || 'Помоги сформулировать мысли'}\n\nКонтекст заметки:\n${text}`;
    } else {
      promptText = text || userPrompt;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: promptText,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ result: response.text || "" });
  } catch (error: any) {
    console.error("AI processing error:", error);
    res.status(500).json({ error: error.message || "Failed to process AI request" });
  }
});

// Web Search API Proxy (BYOK + Extensible Providers)
app.post("/api/web-search", async (req, res) => {
  try {
    const {
      query,
      apiKey,
      provider = "tavily",
      searchDepth = "basic",
      answerDetail = "basic",
      maxResults = 5,
    } = req.body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return res.status(400).json({ error: "Поисковый запрос не может быть пустым." });
    }

    const keyToUse = apiKey || process.env.TAVILY_API_KEY;
    if (!keyToUse) {
      return res.status(400).json({
        error: "NO_API_KEY",
        message: "API-ключ не настроен. Укажите ваш API-ключ Tavily в Настройках -> ИИ.",
      });
    }

    if (provider === "tavily") {
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
          max_results: Math.min(Math.max(Number(maxResults) || 5, 1), 15),
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
