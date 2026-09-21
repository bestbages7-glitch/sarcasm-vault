exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    const { query, language } = JSON.parse(event.body || "{}");
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing GROQ_API_KEY" })
      };
    }

    const targetLang = language === 'uk' ? 'Ukrainian' : 'English';

    const systemPrompt = `You are a world-class satirist.
The user provides a situation.
Generate 4 distinct, devastatingly clever, witty, and sarcastic comebacks suitable for the situation.
Output language MUST strictly be ${targetLang}.
Respond ONLY with a valid JSON object matching this exact schema:
{
  "comebacks": [
    { "text": "the comeback phrase here", "tone": "Dry Wit" },
    { "text": "the comeback phrase here", "tone": "Sharp Irony" },
    { "text": "the comeback phrase here", "tone": "Passive-Aggressive" },
    { "text": "the comeback phrase here", "tone": "Sarcastic" }
  ]
}`;

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
      return {
        statusCode: response.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: errText })
      };
    }

    const rawData = await response.json();
    const parsedContent = JSON.parse(rawData.choices[0].message.content);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsedContent.comebacks || [])
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message })
    };
  }
};
