import {initLocalAI,generateLocalReply,localAIState} from "./local-ai.bundle.js";
let selected="ate_rea",history=[],characterList=[],openAIAvailable=false,selectedCustom=null;
const cards=document.querySelector("#cards"),messages=document.querySelector("#messages"),provider=document.querySelector("#ai-provider"),providerStatus=document.querySelector("#provider-status"),esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function load(){
 try{const r=await fetch("/api/characters");if(!r.ok)throw Error("Charaktere konnten nicht geladen werden");characterList=await r.json();}catch(e){document.querySelector("#ai-status").textContent="● SERVERFEHLER";providerStatus.textContent=e.message;return}
 const customCharacters=JSON.parse(localStorage.getItem("ate-rea-custom-characters")||"[]").filter(c=>c&&c.userGenerated===true&&typeof c.id==="string");
 cards.innerHTML=characterList.map(c=>'<article class="character '+(c.id===selected?'active':'')+'" data-id="'+c.id+'"><div class="avatar">✧</div><h3>'+esc(c.name)+'</h3><p>'+esc(c.role)+' · '+esc(c.tone)+'</p><button>Mit dieser Figur sprechen ↗</button></article>').join("")+customCharacters.map(c=>'<article class="character custom-character" data-id="'+esc(c.id)+'"><div class="avatar">✦</div><h3>'+esc(c.name)+'</h3><p>'+esc(c.role||"Eigener Charakter")+' · Eigene KI-Figur</p><button>Eigene Figur verwenden ↗</button></article>').join("");
 cards.querySelectorAll(".character").forEach(el=>el.onclick=()=>choose(characterList.find(c=>c.id===el.dataset.id)||customCharacters.find(c=>c.id===el.dataset.id)));
 choose(characterList.find(c=>c.id===selected)||characterList[0],false);
 try{const r=await fetch("/api/config",{cache:"no-store"});const cfg=await r.json();openAIAvailable=!!cfg.openaiAvailable;provider.value=openAIAvailable?"openai":"offline";
  const openaiOption=provider.querySelector('option[value="openai"]'); if(openaiOption)openaiOption.disabled=!openAIAvailable;
  const webgpuAvailable=!!navigator.gpu;
  const localOption=provider.querySelector('option[value="local"]'); if(localOption)localOption.disabled=!webgpuAvailable;
  document.querySelector("#load-local").hidden=!webgpuAvailable;
  providerStatus.textContent=openAIAvailable?"OpenAI-Server konfiguriert":webgpuAvailable?"OpenAI-Key fehlt · lokale Browser-KI verfügbar":"Server-KI nicht konfiguriert · Offline-Reflexion aktiv";
  document.querySelector("#ai-status").textContent=openAIAvailable?"● ONLINE-KI VERFÜGBAR":webgpuAvailable?"● LOKALE KI VERFÜGBAR · NOCH NICHT GELADEN":"● OFFLINE-REFLEXION · API-KEY FEHLT";
  document.querySelector("#model-status").textContent=openAIAvailable?"Serverseitige KI ist bereit.":webgpuAvailable?"Du kannst ein lokales Sprachmodell im Browser laden. Der erste Download kann mehrere GB umfassen.":"Offline-Reflexion ist aktiv. Für generative Antworten benötigst du OPENAI_API_KEY in Render oder einen Browser mit WebGPU-Unterstützung.";
 }catch{provider.value="local";providerStatus.textContent="Serverstatus nicht verfügbar";}
}
function choose(c,reset=true){
 if(!c)return;selected=c.id;selectedCustom=c.userGenerated===true?c:null;document.querySelector("#chat-name").textContent=c.name;document.querySelector("#chat-role").textContent=c.role;document.querySelector("#selected-label").textContent=c.name.toUpperCase();
 if(reset){history=[];messages.innerHTML='<div class="bubble assistant">'+esc(c.name)+' erwartet deine Nachricht.</div>'}
 cards.querySelectorAll(".character").forEach(el=>el.classList.toggle("active",el.dataset.id===selected));
}
document.querySelector("#load-local").onclick=async()=>{
 try{document.querySelector("#ai-status").textContent="● MODELL WIRD GELADEN";document.querySelector("#model-status").textContent="Lokales Modell wird initialisiert. Der erste Download kann mehrere GB umfassen.";await initLocalAI(p=>document.querySelector("#model-progress").textContent=p.text||p.status||"Lädt …");document.querySelector("#model-status").textContent=localAIState.provider==="ollama"?"Lokales Ollama-Modell verbunden.":"Lokale Browser-KI bereit.";document.querySelector("#ai-status").textContent="● LOKALE KI BEREIT";provider.value="local";providerStatus.textContent="Lokales Modell bereit";}
 catch(e){document.querySelector("#model-status").textContent="Lokales Modell nicht verfügbar: "+e.message+" Du kannst stattdessen OpenAI online wählen.";document.querySelector("#ai-status").textContent="● LOKAL NICHT VERFÜGBAR";providerStatus.textContent="Lokales Modell nicht erreichbar";}
};
function offlineReply(c,message){
 const mode=c.id==="ate_rea"?"poetisch und philosophisch":c.id==="aite"?"klar, ethisch und empathisch":c.id==="ionos"?"präzise und kosmisch":c.id==="shea"?"warm und feinfühlig":c.id==="aleron"?"würdig und bedacht":"mystisch und bildhaft";
 return c.name+" – "+c.role+"\n\nIch kann im Offline-Reflexionsmodus keine neue generative Antwort berechnen. Deine Frage lautet: „"+message+"“\n\nBetrachte sie aus meiner Perspektive ("+mode+"): Was ist gesichert, was ist Deutung und welcher nächste Schritt passt zu meinen Werten: "+c.values+"?\n\nFür frei formulierte Antworten wähle OpenAI online oder starte ein lokales Sprachmodell.";
}
document.querySelector("#chat-form").onsubmit=async e=>{
 e.preventDefault();const input=document.querySelector("#message"),message=input.value.trim();if(!message)return;input.value="";
 messages.insertAdjacentHTML("beforeend",'<div class="bubble user">'+esc(message)+'</div>');
 const wait=document.createElement("div");wait.className="bubble assistant";wait.textContent="Die Figur denkt nach …";messages.append(wait);
 const c=selectedCustom||characterList.find(x=>x.id===selected);
 try{
  let reply;
  if(provider.value==="openai"){
   if(!openAIAvailable)throw Error("OpenAI ist auf diesem Render-Dienst nicht konfiguriert. OPENAI_API_KEY in Render setzen.");
   providerStatus.textContent="OpenAI verarbeitet deine Anfrage …";
   const r=await fetch("/api/aite/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message,history:history.slice(-14),characterId:selectedCustom?null:selected,customCharacter:selectedCustom,site:"ATE REA CharacterVerse"})});
   const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||"OpenAI-Anfrage fehlgeschlagen ("+r.status+")");reply=data.reply;providerStatus.textContent="OpenAI online · "+(data.model||"Modell aktiv");
  }else if(provider.value==="local"){if(!localAIState.ready)throw Error("Bitte zuerst „Lokale KI laden“ wählen.");reply=await generateLocalReply({character:c,message,history});providerStatus.textContent="Lokales Sprachmodell · Browser-WebGPU";}else{reply=offlineReply(c,message);providerStatus.textContent="Offline-Reflexion aktiv · kein Sprachmodell";}
  wait.textContent=reply;history.push({role:"user",content:message},{role:"assistant",content:reply});try{localStorage.setItem("ate-rea-history-"+selected,JSON.stringify(history.slice(-30)))}catch{}
 }catch(err){wait.textContent="Fehler: "+err.message;providerStatus.textContent="Verbindung / Modell nicht verfügbar";}
 messages.scrollTop=messages.scrollHeight;
};
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(console.warn));
load();
