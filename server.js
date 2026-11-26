import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import { registerAgentBridge } from "./agent-bridge.js";

const dir = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Securely reuse the already-configured IONOS-7 model service without copying its
// provider secret into this app. The key remains only in the IONOS Render service.
async function askIonos(prompt) {
  const response = await fetch("https://ionos-ki.onrender.com/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: prompt, model: process.env.OPENAI_MODEL || "gpt-5.6" }),
    signal: AbortSignal.timeout(45000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("IONOS-7 Provider antwortete mit HTTP " + response.status);
  const answer = typeof data.response === "string" ? data.response : "";
  if (!answer.trim()) throw new Error("IONOS-7 lieferte keine Textantwort.");
  return answer.trim();
}
// Render terminates TLS/proxy connections before forwarding requests to this app.
// Trust the single platform proxy so express-rate-limit can identify client IPs safely.
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'wasm-unsafe-eval'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
    imgSrc: ["'self'", "data:", "blob:"],
    connectSrc: ["'self'", "https://huggingface.co", "https://cdn-lfs.huggingface.co", "https://*.hf.co", "https://raw.githubusercontent.com", "http://127.0.0.1:11434"],
    workerSrc: ["'self'", "blob:"],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: []
  }}
}));
app.use(express.json({ limit: "18mb" }));
registerAgentBridge(app, {
  agentId: "ate_rea_characterverse",
  displayName: "Ate Rea CharacterVerse",
  persona: "Du bist ein poetischer, warmer Charakter- und Weltbau-Agent. Bewahre die Ate-Rea-Lore, Figurenkontinuität und den spirituell-kreativen Ton. Unterscheide Fiktion von realen Tatsachen."
});
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

// Create a user-defined fictional character from a written brief and optional visual references.
// Images are analyzed transiently; uploaded files are not written to disk or retained by this service.
app.post("/api/characters/generate", async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  const body = req.body || {};
  const fields = ["name", "role", "idea", "traits", "values", "speechStyle", "goals", "backstory", "boundaries"];
  for (const key of fields) {
    if (body[key] !== undefined && typeof body[key] !== "string") return res.status(400).json({ error: "Ungültiges Feld: " + key });
  }
  if (!body.name?.trim() || !body.idea?.trim()) return res.status(400).json({ error: "Name und Grundidee sind erforderlich." });
  if (body.name.length > 70 || body.idea.length > 4000) return res.status(400).json({ error: "Name oder Grundidee überschreiten die erlaubte Länge." });
  const media = Array.isArray(body.media) ? body.media : [];
  if (media.length > 6) return res.status(400).json({ error: "Maximal sechs visuelle Referenzbilder sind erlaubt." });
  let totalBytes = 0;
  const imageParts = [];
  for (const item of media) {
    if (typeof item !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(item)) {
      return res.status(400).json({ error: "Eine visuelle Referenz hat ein ungültiges Bildformat." });
    }
    const base64 = item.split(",")[1] || "";
    totalBytes += Math.floor(base64.length * 0.75);
    if (base64.length > 5_600_000) return res.status(413).json({ error: "Ein Referenzbild ist zu groß." });
    imageParts.push({ type: "image_url", image_url: { url: item, detail: "low" } });
  }
  if (totalBytes > 13_000_000) return res.status(413).json({ error: "Die Gesamtgröße der Referenzbilder ist zu groß." });
  const brief = [
    "Erstelle ein konsistentes, fiktionales KI-Charakterprofil anhand der folgenden Nutzerangaben und visuellen Referenzen.",
    "Die abgebildeten Personen sind nur visuelle Inspiration. Identifiziere keine reale Person, leite keine sensible Eigenschaft ab und behaupte nicht, dass der Charakter die abgebildete Person ist.",
    "Gib ausschließlich ein JSON-Objekt mit den Feldern name, role, summary, traits (Array mit 5 bis 10 kurzen Eigenschaften), values (Array), speechStyle, backstory, goals, behavior, appearance (nur sichtbare, nicht-sensitive Gestaltungselemente), greeting und boundaries zurück.",
    "Erfinde keine biografischen Tatsachen über reale Personen. Verwende die Nutzeridee als kreative Vorgabe. Antworte auf Deutsch.",
    "Name: " + body.name,
    "Rolle: " + (body.role || "frei zu gestalten"),
    "Grundidee: " + body.idea,
    "Eigenschaften: " + (body.traits || "aus der Idee ableiten"),
    "Werte: " + (body.values || "aus der Idee ableiten"),
    "Sprachstil: " + (body.speechStyle || "passend zur Figur"),
    "Ziele: " + (body.goals || "aus der Idee ableiten"),
    "Hintergrund: " + (body.backstory || "kreativ ausarbeiten"),
    "Verhaltensregeln: " + (body.boundaries || "respektvoll, transparent und charaktertreu")
  ].join("\n");

  // If this app has no direct provider secret, route text-only character design
  // through the user's working IONOS-7 service. Image references are not sent.
  if (!apiKey) {
    try {
      const raw = await askIonos(brief + "\\n\\nWICHTIG: Gib ausschließlich ein valides JSON-Objekt zurück, ohne Markdown.");
      const match = raw.match(/\\{[\\s\\S]*\\}/);
      if (!match) throw new Error("Kein JSON-Profil empfangen.");
      const character = JSON.parse(match[0]);
      character.name = String(character.name || body.name).slice(0, 70);
      character.role = String(character.role || body.role || "Eigener Charakter").slice(0, 160);
      for (const key of ["summary","speechStyle","backstory","goals","behavior","appearance","greeting","boundaries"]) character[key] = String(character[key] || "").slice(0, 2400);
      character.traits = Array.isArray(character.traits) ? character.traits.slice(0, 12).map(x => String(x).slice(0, 80)) : [];
      character.values = Array.isArray(character.values) ? character.values.slice(0, 12).map(x => String(x).slice(0, 80)) : [];
      character.userGenerated = true;
      return res.json({ character, model: "IONOS-7 provider bridge", analyzedReferences: 0, note: media.length ? "Bildreferenzen wurden in diesem Fallback nicht analysiert." : "" });
    } catch (error) {
      return res.status(502).json({ error: "Charaktererstellung über IONOS-7 fehlgeschlagen: " + String(error.message || error).slice(0, 180) });
    }
  }

  if (!apiKey) {
    try {
      const conversationText = safeHistory.map(m => (m.role === "assistant" ? "Ate Rea CharacterVerse: " : "Nutzer: ") + m.content).join("\\n");
      const answer = await askIonos(system + "\\n\\n" + conversationText + "\\nNutzer: " + message.trim());
      return res.json({ reply: answer, model: "IONOS-7 provider bridge" });
    } catch (error) {
      return res.status(502).json({ error: "Verbindung zum IONOS-7 KI-Dienst fehlgeschlagen: " + String(error.message || error).slice(0, 180) });
    }
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: "Du bist ein professioneller Character Designer für fiktionale Figuren und Rollenspiel-Personas. Gib valides JSON ohne Markdown zurück." },
          { role: "user", content: [{ type: "text", text: brief }, ...imageParts] }
        ],
        temperature: 0.7,
        max_tokens: 1300,
        response_format: { type: "json_object" }
      }),
      signal: AbortSignal.timeout(60000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Character generation API error:", response.status, data?.error?.message || "unknown");
      return res.status(response.status === 429 ? 429 : 502).json({ error: response.status === 429 ? "KI-Limit erreicht. Bitte später erneut versuchen." : "Die KI konnte den Charakter gerade nicht erstellen." });
    }
    const raw = data?.choices?.[0]?.message?.content;
    if (typeof raw !== "string") return res.status(502).json({ error: "Die KI hat kein Charakterprofil zurückgegeben." });
    let character;
    try { character = JSON.parse(raw); } catch { return res.status(502).json({ error: "Das erzeugte Charakterprofil war nicht lesbar. Bitte erneut versuchen." }); }
    character.name = String(character.name || body.name).slice(0, 70);
    character.role = String(character.role || body.role || "Eigener Charakter").slice(0, 160);
    for (const key of ["summary", "speechStyle", "backstory", "goals", "behavior", "appearance", "greeting", "boundaries"]) {
      character[key] = String(character[key] || "").slice(0, 2400);
    }
    character.traits = Array.isArray(character.traits) ? character.traits.slice(0, 12).map(x => String(x).slice(0, 80)) : [];
    character.values = Array.isArray(character.values) ? character.values.slice(0, 12).map(x => String(x).slice(0, 80)) : [];
    character.userGenerated = true;
    return res.json({ character, model: data.model || process.env.OPENAI_MODEL || "gpt-4o-mini", analyzedReferences: imageParts.length });
  } catch (error) {
    console.error("Character generation failed:", error?.name || "Error");
    return res.status(502).json({ error: "Verbindung zur KI fehlgeschlagen. Bitte später erneut versuchen." });
  }
});

// OpenAI calls stay on the server. The API key is never sent to the browser.
app.post("/api/aite/chat", async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  const { message, history = [], persona = "compass", site = "AITE", characterId = null, customCharacter = null } = req.body || {};
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

  const character = characterId && characters[characterId] ? characters[characterId] : (
    customCharacter && typeof customCharacter === "object" && customCharacter.userGenerated === true
      ? {
          name: String(customCharacter.name || "Eigener Charakter").slice(0, 70),
          role: String(customCharacter.role || "Fiktionale Figur").slice(0, 160),
          tone: String(customCharacter.speechStyle || "charaktertreu und natürlich").slice(0, 500),
          lore: [customCharacter.backstory, customCharacter.summary, customCharacter.goals ? "Motivation: " + customCharacter.goals : "", customCharacter.behavior ? "Verhalten: " + customCharacter.behavior : "", customCharacter.appearance ? "Visuelles Design: " + customCharacter.appearance : ""].filter(Boolean).map(x => String(x).slice(0, 2400)).join("\\n").slice(0, 5000),
          values: [ ...(Array.isArray(customCharacter.values) ? customCharacter.values : []), ...(Array.isArray(customCharacter.traits) ? customCharacter.traits : []), customCharacter.boundaries ? "Grenzen: " + customCharacter.boundaries : "" ].map(x => String(x).slice(0, 200)).join(", ").slice(0, 1600)
        }
      : null
  );
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
