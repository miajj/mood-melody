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
    sad:       "an original contemporary piano composition, introspective and subdued, slow rubato, sparse voicing. Fades in with a single melodic line, expands into fuller texture, dissolves into silence.",
    anxious:   "an original contemporary piano piece, irregular rhythms, unresolved harmonies, moderate pace. Emerges tentatively, grows in complexity, settles into stillness.",
    irritated: "an original contemporary piano work, percussive attack, dissonant clusters, driven rhythm. Erupts with intensity, reaches a climax, subsides to quiet.",
    calm:      "an original contemporary piano composition, open voicing, consonant harmonies, unhurried pace. Emerges from silence, breathes and expands, returns to stillness.",
    okay:      "an original contemporary piano piece, balanced phrasing, moderate tempo, neutral affect. Begins plainly, develops with simple ornamentation, closes cleanly.",
    happy:     "an original contemporary piano composition, bright upper register, syncopated rhythm, brisk tempo. Sparks to life, dances forward, lands with finality.",
    touched:   "an original contemporary piano work, lyrical phrasing, warm middle register, slow and expressive. Emerges softly, swells with feeling, fades to a whisper.",
    energetic: "an original contemporary piano piece, driving rhythm, full voicing, fast tempo. Launches boldly, builds momentum, arrives at a decisive close.",
  };

  const safePrompt = moodPrompts[mood] || "an original contemporary piano composition, expressive and atmospheric. Fades in softly, develops organically, resolves to silence.";

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
