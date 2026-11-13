# Security and local AI notes
- No OpenAI SDK, OpenAI key, or third-party inference API is used by the roleplay path.
- Inference is performed in the user's browser with WebLLM/WebGPU.
- The first model download requires internet and several GB of storage; offline use depends on browser cache retention, device memory and WebGPU support.
- A service worker caches the app shell and same-origin public endpoints.
- Express Helmet applies security headers and a restrictive Content Security Policy.
- API rate limiting and a 128 KB JSON request limit are enabled.
- Chat prompts and generated replies remain in the browser; no chat endpoint is required.
- This is a small local model, not equivalent to GPT/Grok/Claude frontier-scale systems.
- Before production admin uploads: add authenticated admin roles, encrypted persistent storage, malware scanning, backups, dependency auditing and security review.
