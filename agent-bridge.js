import { timingSafeEqual } from "node:crypto";

function authorized(req) {
  const expected = process.env.ULTIMA_AGENT_SHARED_TOKEN || "";
  const supplied = req.get("X-ULTIMA-AGENT-TOKEN") || "";
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function registerAgentBridge(app, { agentId, displayName, persona }) {
  app.get("/api/agent/health", (req, res) => {
    if (!authorized(req)) return res.status(401).json({ error: "agent_authentication_required" });
    const ready = Boolean(process.env.OPENAI_API_KEY);
    return res.json({ agent_id: agentId, name: displayName, status: ready ? "ready" : "provider_not_configured",
      provider_configured: ready, actions: "analysis_only" });
  });

  app.post("/api/agent/analyze", async (req, res) => {
    if (!authorized(req)) return res.status(401).json({ error: "agent_authentication_required" });
    const task = typeof req.body?.task === "string" ? req.body.task.trim() : "";
    if (!task) return res.status(400).json({ error: "task_required" });
    if (task.length > 8000) return res.status(413).json({ error: "task_too_large" });
    const apiKey = (process.env.OPENAI_API_KEY || "").trim();
    if (!apiKey) return res.status(503).json({ error: "provider_not_configured" });
    const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    try {
      const response = await fetch(baseUrl + "/chat/completions", {
        method: "POST",
        headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ model, temperature: 0.25, messages: [
          { role: "system", content: "Du bist " + displayName + " im ULTIMA-Agentennetzwerk. " + persona +
            " Analysiere nur den Auftrag. Liefere Befunde, Vorschläge, Risiken und überprüfbare Tests. " +
            "Führe keine Codeänderungen, GitHub-Aktionen, Deployments, Zahlungen, Wallet-Signaturen oder Hardwaresteuerung aus." },
          { role: "user", content: task }
        ] }),
        signal: AbortSignal.timeout(40000)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return res.status(502).json({ error: "provider_request_failed", provider_status: response.status });
      const answer = data?.choices?.[0]?.message?.content;
      if (typeof answer !== "string" || !answer.trim()) return res.status(502).json({ error: "provider_empty_response" });
      return res.json({ agent_id: agentId, name: displayName, answer: answer.slice(0, 9000),
        model: data.model || model, actions_executed: [] });
    } catch {
      return res.status(502).json({ error: "agent_provider_unavailable" });
    }
  });
}
