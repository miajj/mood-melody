export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt, apiKey } = req.body;

  if (!prompt || !apiKey) {
    return res.status(400).json({ error: "Missing prompt or apiKey" });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/lyria-3-clip-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["AUDIO", "TEXT"] },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || "Lyria API error" });
    }

    const parts = data?.candidates?.[0]?.content?.parts || [];
    const audioPart = parts.find((p) => p.inlineData?.mimeType?.startsWith("audio/"));

    if (!audioPart) {
      const raw = JSON.stringify(data).slice(0, 500);
      console.error("No audio part found:", raw);
      return res.status(500).json({ error: "No audio in response: " + raw });
    }

    return res.status(200).json({
      audioData: audioPart.inlineData.data,
      mimeType: audioPart.inlineData.mimeType,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
