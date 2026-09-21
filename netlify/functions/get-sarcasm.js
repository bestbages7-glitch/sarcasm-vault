exports.handler = async function (event) {
  // Дозволяємо CORS-запити з браузера
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
      body: JSON.stringify({ error: "Method Not Allowed. Send a POST request." })
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
    console.error("JSON parse error on request body:", parseErr);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid JSON format in request body" })
    };
  }

  if (!query.trim()) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Search query is empty" })
    };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("Missing GROQ_API_KEY in environment variables");
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server missing GROQ_API_KEY" })
    };
  }

  const targetLang = language === 'uk' ? 'Ukrainian' : 'English';

  const systemPrompt = `You are a world-class satirist and master of sharp wit.
Generate 4 distinct, devastatingly clever, witty, and sarcastic comebacks suitable for the situation.
Output language MUST strictly be ${targetLang}.
Respond ONLY with a valid JSON object matching this schema:
{
  "comebacks": [
    { "text": "punchline here", "tone": "Dry Wit" },
    { "text": "punchline here", "tone": "Sharp Irony" },
    { "text": "punchline here", "tone": "Passive-Aggressive" },
    { "text": "punchline here", "tone": "Sarcastic" }
  ]
}`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Situation: ${query}` }
        ],
        temperature: 0.85,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Groq API error response:", response.status, errText);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: errText })
      };
    }

    const rawData = await response.json();
    const parsedContent = JSON.parse(rawData.choices[0].message.content);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(parsedContent.comebacks || [])
    };
  } catch (err) {
    console.error("Execution exception:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
