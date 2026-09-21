exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  let query = "";
  let language = "uk";

  try {
    if (event.body) {
      const parsed = JSON.parse(event.body);
      query = parsed.query || "";
      language = parsed.language || "uk";
    }
  } catch (parseErr) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid JSON in body" })
    };
  }

  if (!query.trim()) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Empty query" })
    };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Missing GROQ_API_KEY" })
    };
  }

  const targetLang = language === 'uk' ? 'Ukrainian' : 'English';

  const systemPrompt = `You are an elite satirist. The user will provide an annoying or absurd situation.
Return 4 biting, witty, sarcastic comebacks in ${targetLang}.
Respond with a JSON object containing a "comebacks" array with "text" and "tone" fields.
Available tones: "Dry Wit", "Sharp Irony", "Passive-Aggressive", "Sarcastic".`;

  // Ланцюжок моделей на випадок, якщо одна з них вимкнена або обмежена
  const candidateModels = [
    "openai/gpt-oss-120b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
    "gemma2-9b-it"
  ];

  let lastError = null;

  for (const model of candidateModels) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey.trim()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Situation: ${query}` }
          ],
          temperature: 0.8,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        lastError = `Model ${model} failed: ${errorText}`;
        continue; // Пробуємо наступну модель
      }

      const rawData = await response.json();
      const content = rawData.choices?.[0]?.message?.content;
      if (!content) continue;

      const parsedContent = JSON.parse(content);
      const comebacks = parsedContent.comebacks || parsedContent.results || [];

      if (Array.isArray(comebacks) && comebacks.length > 0) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(comebacks)
        };
      }
    } catch (err) {
      lastError = err.message;
    }
  }

  // Якщо всі моделі Groq відхилили запит, повертаємо якісний резервний сарказм без помилки
  const fallbacks = language === 'uk' ? [
    { text: `Щодо "${query}": це настільки геніально, що я б навіть аплодував, якби не був зайнятий фейспалмом.`, tone: "Sharp Irony" },
    { text: `Коли відбувається "${query}", десь у світі сумує один здоровий глузд.`, tone: "Dry Wit" },
    { text: `Я щиро сподіваюся, що за перформанс із "${query}" вам випишуть якусь міжнародну премію за хаос.`, tone: "Sarcastic" },
    { text: `З кожною згадкою про "${query}" моє терпіння зменшується в геометричній прогресії.`, tone: "Passive-Aggressive" }
  ] : [
    { text: `Regarding "${query}": That is so brilliant that common sense just left the room.`, tone: "Sharp Irony" },
    { text: `Dealing with "${query}" makes me appreciate complete solitude more than ever.`, tone: "Dry Wit" },
    { text: `I hope your dedication to "${query}" comes with free therapy for everyone around.`, tone: "Sarcastic" },
    { text: `Every second spent on "${query}" is another moment I will never get back.`, tone: "Passive-Aggressive" }
  ];

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(fallbacks)
  };
};
