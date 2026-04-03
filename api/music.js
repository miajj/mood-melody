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

  const { mood, apiKey } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: "Missing apiKey" });
  }

  const moodPrompts = {
    sad:       "solo piano, melancholic, slow tempo, minor key. Opens with a soft tender melody, gently builds with quiet emotion, fades to a peaceful resolution.",
    anxious:   "solo piano, tense and searching, moderate pace, minor key. Begins hesitantly, grows more unsettled, then gradually finds calm and resolves softly.",
    irritated: "solo piano, restless and dynamic, strong accents. Opens with sharp tension, builds to an expressive peak, then eases to a quiet close.",
    calm:      "solo piano, peaceful and serene, slow flowing, major key. Opens gently, unfolds with quiet warmth, fades to a still and soft ending.",
    okay:      "solo piano, pleasant and light, moderate tempo, major key. Begins simply, develops with easy warmth, closes with a gentle satisfying cadence.",
    happy:     "solo piano, joyful and bright, upbeat, major key. Opens with a cheerful melody, builds with playful energy, ends with a warm uplifting resolution.",
    touched:   "solo piano, deeply tender and warm, slow, major key. Begins softly, swells with heartfelt emotion, fades to a gentle and intimate close.",
    energetic: "solo piano, vibrant and lively, fast tempo, major key. Opens with rhythmic energy, builds to an expressive peak, ends with a bright satisfying finish.",
  };

  const safePrompt = moodPrompts[mood] || "solo piano, gentle and warm. Opens softly, builds with quiet emotion, fades to a peaceful resolution.";

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/lyria-3-clip-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: safePrompt }] }],
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
