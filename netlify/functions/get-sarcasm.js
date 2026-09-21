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
      body: JSON.stringify({ error: "Invalid JSON format in request body" })
    };
  }

  if (!query.trim()) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Порожній запит" })
    };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Відсутній GROQ_API_KEY у налаштуваннях" })
    };
  }

  const targetLang = language === 'uk' ? 'Ukrainian' : 'English';

  const systemPrompt = `You are a world-class satirist and master of sharp wit.
Generate 4 distinct, devastatingly clever, witty, and sarcastic comebacks suitable for the situation.
Output language MUST strictly be ${targetLang}.
Respond ONLY with a valid JSON object matching this exact schema:
{
  "comebacks": [
    { "text": "дотепний панч тут", "tone": "Dry Wit" },
    { "text": "дотепний панч тут", "tone": "Sharp Irony" },
    { "text": "дотепний панч тут", "tone": "Passive-Aggressive" },
    { "text": "дотепний панч тут", "tone": "Sarcastic" }
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
        "model": "llama-3.3-70b-versatile",
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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
