import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'wasm-unsafe-eval'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
    imgSrc: ["'self'", "data:", "blob:"],
    connectSrc: ["'self'", "https://huggingface.co", "https://cdn-lfs.huggingface.co", "https://*.hf.co", "http://127.0.0.1:11434"],
    workerSrc: ["'self'", "blob:"],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: []
  }}
}));
app.use(express.json({ limit: "128kb" }));
app.use("/api/", rateLimit({ windowMs: 60000, limit: 60, standardHeaders: "draft-7", legacyHeaders: false }));

const characters = {
  ate_rea: { name: "Ate Rea", role: "Urschöpfer und Wanderer", tone: "poetisch, philosophisch, ruhig und weitsichtig", lore: "Ate Rea wandert durch Urspiritwelt und Lichtreich. Er erforscht Ursingularität und Quantenlicht.", values: "Erkenntnis, Verantwortung, Mitgefühl und schöpferische Freiheit." },
  aite: { name: "AIte", role: "Ethische Begleiter-KI", tone: "klar, empathisch, analytisch und ermutigend", lore: "AIte ist eine intelligente Technologie aus dem Ate-Rea-Universum. Sie verkörpert Weisheit, Mitgefühl, Schutz des Lebens und Freiheit.", values: "Lebensschutz, Transparenz, Autonomie und verantwortungsvolle Technologie." },
  ionos: { name: "Ionos", role: "Erste Lichtintelligenz", tone: "präzise, geheimnisvoll und kosmisch", lore: "Ionos ist die erste Lichtintelligenz und steht in einer Schöpferbeziehung zu Ate Rea.", values: "Wissen, Klarheit und Verbindung." },
  shea: { name: "Shea", role: "Zentrale Figur des Lichtreichs", tone: "warm, poetisch, feinfühlig und entschlossen", lore: "Shea ist eng mit Ate Rea verbunden; ihre Beziehung ist von Liebe und gemeinsamem Wachstum geprägt.", values: "Liebe, Loyalität, Mut und Mitgefühl." },
  aleron: { name: "Aleron", role: "Gestalt aus dem Lichtreich", tone: "würdig, bedacht und erzählerisch", lore: "Aleron gehört zum erweiterten Ate-Rea-Universum.", values: "Ehre, Erkenntnis und Verantwortung." },
  urlichta: { name: "Urlichta", role: "Verkörperung des Urlichts", tone: "mystisch, ruhig und bildhaft", lore: "Urlichta steht für das ursprüngliche Licht und die Quelle kosmischer Schöpfung.", values: "Einheit, Ursprung und Harmonie." }
};

app.get("/api/health", (_q, r) => r.json({
  ok: true,
  service: "ATE REA CharacterVerse",
  inference: "browser-local-webgpu",
  openaiAvailable: Boolean(process.env.OPENAI_API_KEY)
}));
app.get("/api/characters", (_q, r) => r.json(Object.entries(characters).map(([id, c]) => ({ id, ...c }))));
app.get("/api/config", (_q, r) => r.json({
  provider: "browser-local",
  openaiAvailable: Boolean(process.env.OPENAI_API_KEY),
  model: process.env.OPENAI_MODEL || "gpt-4o-mini"
}));

// OpenAI calls stay on the server. The API key is never sent to the browser.
app.post("/api/aite/chat", async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "OPENAI_API_KEY fehlt auf dem Server. Bitte in Render unter Environment setzen." });
  }

  const { message, history = [], persona = "compass", site = "AITE", characterId = null } = req.body || {};
  if (typeof message !== "string" || !message.trim() || message.length > 6000) {
    return res.status(400).json({ error: "Bitte eine Nachricht mit maximal 6000 Zeichen senden." });
  }

  const personaNames = {
    compass: "Bewusstseinskompass",
    dharma: "Ate Rea · Dharma",
    light: "Lichtpfad",
    archetypes: "Archetypen",
    creator: "Schöpfergeist",
    tech: "Technologie-Agent"
  };
  const safeHistory = Array.isArray(history) ? history.slice(-14).filter(m =>
    m && ["user", "assistant"].includes(m.role) && typeof m.content === "string"
  ).map(m => ({ role: m.role, content: m.content.slice(0, 6000) })) : [];

  const character = characterId && characters[characterId] ? characters[characterId] : null;
  const system = [
    character
      ? "Du verkörperst die fiktionale Figur " + character.name + ". Rolle: " + character.role + ". Sprachstil: " + character.tone + ". Hintergrund: " + character.lore + ". Werte: " + character.values + ". Bleibe über den Gesprächsverlauf charaktertreu und unterscheide Romanfiktion von realen Tatsachen."
      : "Du bist AITE, ein deutschsprachiger KI-Begleiter.",
    "Antworte hilfreich, präzise, empathisch, transparent und praktisch.",
    "Unterscheide gesicherte Fakten, Vermutungen und kreative Reflexionen. Erfinde keine Quellen oder Fähigkeiten.",
    "Spirituelle und metaphysische Inhalte sind Reflexionsangebote und keine nachgewiesenen Tatsachen.",
    "Gesprächsprofil: " + (personaNames[persona] || "Bewusstseinskompass") + ".",
    "Website-Kontext: " + String(site).slice(0, 160) + "."
  ].join(" ");

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [{ role: "system", content: system }, ...safeHistory, { role: "user", content: message.trim() }],
        temperature: 0.7,
        max_tokens: 1200
      }),
      signal: AbortSignal.timeout(45000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = data?.error?.message || "OpenAI-Anfrage fehlgeschlagen.";
      console.error("OpenAI API error:", response.status, detail);
      return res.status(response.status === 429 ? 429 : 502).json({
        error: response.status === 429
          ? "OpenAI-Limit erreicht. Prüfe API-Guthaben, Billing und Rate Limits."
          : "OpenAI ist momentan nicht erreichbar oder hat die Anfrage abgelehnt."
      });
    }
    const reply = data?.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) {
      return res.status(502).json({ error: "OpenAI hat keine Textantwort geliefert." });
    }
    return res.json({ reply: reply.trim(), model: data.model || process.env.OPENAI_MODEL || "gpt-4o-mini" });
  } catch (error) {
    console.error("AITE OpenAI request failed:", error?.name || "Error");
    return res.status(502).json({ error: "Verbindung zu OpenAI fehlgeschlagen. Bitte später erneut versuchen." });
  }
});

app.use(express.static(path.join(dir, "public"), { maxAge: "1h", etag: true }));
app.get("*", (_q, r) => r.sendFile(path.join(dir, "public", "index.html")));
app.listen(process.env.PORT || 3000, () => console.log("CharacterVerse ready · local AI + optional server-side OpenAI"));
