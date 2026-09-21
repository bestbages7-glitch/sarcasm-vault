exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    const { query, language } = JSON.parse(event.body || "{}");
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing GROQ_API_KEY in environment variables" })
      };
    }

    const targetLang = language === 'uk' ? 'Ukrainian' : 'English';

    const systemPrompt = `You are a world-class satirist.
