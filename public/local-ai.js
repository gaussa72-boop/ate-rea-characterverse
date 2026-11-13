import {CreateMLCEngine} from "@mlc-ai/web-llm";
export const localAIState={ready:false,engine:null,provider:null,modelId:"Llama-3.2-1B-Instruct-q4f16_1-MLC",ollamaModel:"qwen2.5:1.5b"};
async function initOllama(){const r=await fetch("http://127.0.0.1:11434/api/tags",{signal:AbortSignal.timeout(2500)});if(!r.ok)throw new Error("Ollama lokal nicht erreichbar.");const data=await r.json();const models=(data.models||[]).map(x=>x.name);if(!models.some(x=>x.startsWith(localAIState.ollamaModel)))throw new Error("Ollama ist aktiv, aber qwen2.5:1.5b fehlt. Im Terminal: ollama pull qwen2.5:1.5b");localAIState.provider="ollama";localAIState.ready=true;return localAIState}
export async function initLocalAI(onProgress=()=>{}){
 if(localAIState.ready)return localAIState;
 if(navigator.gpu){try{localAIState.engine=await CreateMLCEngine(localAIState.modelId,{initProgressCallback:onProgress});localAIState.provider="webgpu";localAIState.ready=true;return localAIState}catch(e){console.warn("WebGPU unavailable; trying local Ollama",e)}}
 return initOllama();
}
export async function generateLocalReply({character,message,history=[]}){
 if(!localAIState.ready)throw new Error("Lokales Modell wurde noch nicht geladen.");
 const system="Du spielst ausschließlich die fiktionale Figur "+character.name+". Rolle: "+character.role+". Stil: "+character.tone+". Hintergrund: "+character.lore+". Werte: "+character.values+". Antworte charaktertreu, kreativ und konsistent, standardmäßig auf Deutsch. Du bist eine KI, die eine Figur darstellt, kein reales bewusstes Wesen. Trenne Fakten und Fiktion, wenn nötig.";
 const messages=[{role:"system",content:system},...history.slice(-10).filter(x=>["user","assistant"].includes(x.role)),{role:"user",content:message}];
 if(localAIState.provider==="ollama"){const r=await fetch("http://127.0.0.1:11434/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:localAIState.ollamaModel,messages,stream:false,options:{temperature:.8}})});if(!r.ok)throw new Error("Ollama-Chat fehlgeschlagen. Lokalen Dienst und CORS prüfen.");const data=await r.json();return data.message?.content||"Keine lokale Antwort erhalten."}
 const out=await localAIState.engine.chat.completions.create({messages,temperature:.8,max_tokens:700});
 return out.choices?.[0]?.message?.content||"Ich suche noch nach den richtigen Worten.";
}
