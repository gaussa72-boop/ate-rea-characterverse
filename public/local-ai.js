import { CreateMLCEngine } from "@mlc-ai/web-llm";
export const localAIState={ready:false,engine:null,modelId:"Llama-3.2-1B-Instruct-q4f16_1-MLC"};
export async function initLocalAI(onProgress=()=>{}){
 if(localAIState.ready)return localAIState.engine;
 if(!("gpu" in navigator))throw new Error("Dieser Browser unterstützt WebGPU nicht. Bitte einen aktuellen Browser mit WebGPU verwenden.");
 localAIState.engine=await CreateMLCEngine(localAIState.modelId,{initProgressCallback:onProgress});
 localAIState.ready=true;return localAIState.engine;
}
export async function generateLocalReply({character,message,history=[]}){
 if(!localAIState.ready)throw new Error("Lokales Modell wurde noch nicht geladen.");
 const system=`Du spielst ausschließlich die fiktionale Figur ${character.name}. Rolle: ${character.role}. Sprachstil: ${character.tone}. Lore: ${character.lore}. Werte: ${character.values}. Bleibe charaktertreu, kreativ, konsistent und antworte standardmäßig auf Deutsch. Du bist eine KI, die eine Figur darstellt, kein reales bewusstes Wesen. Trenne Fakten und Fiktion, wenn nötig.`;
 const messages=[{role:"system",content:system},...history.slice(-10).filter(x=>["user","assistant"].includes(x.role)),{role:"user",content:message}];
 const out=await localAIState.engine.chat.completions.create({messages,temperature:.8,max_tokens:700});
 return out.choices?.[0]?.message?.content||"Ich suche noch nach den richtigen Worten.";
}
