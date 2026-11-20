(() => {
"use strict";
const RAW = "https://raw.githubusercontent.com/gaussa72-boop/Ate-Rea-Verm-chtnis/main/";
const books = {
  gesamt:{title:"Die Gesamtausgabe · Die Chronik des Ewigen Lichts",meta:"ATE REA · MASTER-MANUSKRIPT",url:RAW+"ATE_REA_GESAMT_MASTER.txt"},
  weg:{title:"Der Weg des Lichtes",meta:"ROMAN · LANGFASSUNG",url:RAW+"Ate_Rea_Der_Weg_des_Lichtes_Langfassung.txt"}
};
const $ = id => document.getElementById(id);
let activeBook="gesamt", chapters=[], index=0, voices=[], chosenVoice=null, speechQueue=[], speaking=false, generation=0;
const key=()=> "ate-rea-reader:"+activeBook;
function status(t){$("readerStatus").textContent=t;}
function headingLine(s){
 const t=s.trim().replace(/^[✦*#\s]+/,"");
 return /^(PROLOG|EPILOG|VORWORT|NACHWORT|KAPITEL\b|KAP\.\s*\d|TEIL\s+[IVXLCDM0-9]+|BUCH\s+[IVXLCDM0-9]+|SZENE\s+\d+|ABSCHNITT\s+\d+|DAS\s+BUCH\s+DER\s+)/i.test(t);
}
function splitBook(raw){
 const lines=raw.replace(/\r/g,"").split("\n"), sections=[]; let current=null, pre=[];
 for(const line of lines){
   if(headingLine(line)){
     if(current) sections.push(current);
     else if(pre.join("").trim()) sections.push({title:"Auftakt",text:pre.join("\n").trim()});
     current={title:line.trim().replace(/^[✦*#\s]+/,""),text:""};
   } else if(current) current.text += line+"\n";
   else pre.push(line);
 }
 if(current) sections.push(current);
 if(!sections.length || sections.length<2){
   const text=raw.trim(), paras=text.split(/\n\s*\n/).filter(Boolean), max=8;
   const chunk=Math.ceil(paras.length/max);
   for(let i=0;i<paras.length;i+=chunk) sections.push({title:"Abschnitt "+(sections.length+1),text:paras.slice(i,i+chunk).join("\n\n")});
 }
 return sections.map((s,i)=>({title:s.title||"Kapitel "+(i+1),text:s.text.trim()})).filter(s=>s.text);
}
async function loadBook(id){
 stopSpeech(); activeBook=id; index=0; chapters=[];
 document.querySelectorAll("[data-book]").forEach(b=>b.classList.toggle("active",b.dataset.book===id));
 const b=books[id]; $("bookTitle").textContent=b.title; $("bookMeta").textContent=b.meta;
 $("chapterText").innerHTML='<p class="chapter-empty">Das Manuskript wird aus dem Archiv geladen …</p>';
 $("chapterCount").textContent="Lade …"; status("Verbinde mit dem Manuskriptarchiv …");
 try{
  const res=await fetch(b.url,{cache:"no-cache"});
  if(!res.ok) throw new Error("Quelle nicht erreichbar ("+res.status+")");
  const raw=await res.text(); chapters=splitBook(raw);
  if(!chapters.length) throw new Error("Im Manuskript wurden keine lesbaren Kapitel gefunden.");
  const saved=Number(localStorage.getItem(key())||0); index=Math.min(Math.max(saved,0),chapters.length-1);
  $("chapterCount").textContent=chapters.length+" Kapitel / Abschnitte";
  $("chapterSelect").innerHTML="";
  chapters.forEach((c,i)=>{const o=document.createElement("option");o.value=String(i);o.textContent=(i+1)+". "+c.title;$("chapterSelect").appendChild(o);});
  renderChapter(); status("Das Buch ist bereit. Wähle ein Kapitel oder starte die Lesung.");
 }catch(e){
  $("chapterText").innerHTML='<p class="chapter-empty">Das Manuskript konnte gerade nicht geladen werden. Bitte lade die Seite erneut oder öffne die Archivdatei über die Links links.</p>';
  $("chapterCount").textContent="Quelle nicht verfügbar"; status(e.message||"Ladefehler");
 }
}
function renderChapter(){
 if(!chapters.length)return;
 const c=chapters[index]; $("chapterTitle").textContent=c.title;
 $("chapterText").textContent=c.text;
 $("chapterSelect").value=String(index);
 $("chapterPosition").textContent="Kapitel / Abschnitt "+(index+1)+" von "+chapters.length;
 $("progressFill").style.width=((index+1)/chapters.length*100)+"%";
 $("prevBtn").disabled=$("bottomPrev").disabled=index===0;
 $("nextBtn").disabled=$("bottomNext").disabled=index===chapters.length-1;
 localStorage.setItem(key(),String(index));
}
function moveTo(n,continueReading=false){
 if(!chapters.length)return;
 index=Math.max(0,Math.min(n,chapters.length-1)); renderChapter();
 if(continueReading) speakChapter();
}
function loadVoices(){
 if(!("speechSynthesis" in window)){ $("voiceSelect").innerHTML="<option>Vorlesen wird nicht unterstützt</option>"; $("playBtn").disabled=true; return; }
 voices=window.speechSynthesis.getVoices().filter(v=>/^de(-|_|$)/i.test(v.lang));
 const female=voices.filter(v=>/(anna|katja|petra|heike|marlene|vicki|helena|siri|female|frau|june|nina|samantha)/i.test(v.name));
 const preferred=female.length?female:voices;
 $("voiceSelect").innerHTML="";
 if(!preferred.length){const o=document.createElement("option");o.textContent="Keine deutsche Systemstimme verfügbar";$("voiceSelect").appendChild(o);return;}
 preferred.forEach(v=>{const o=document.createElement("option");o.value=v.name;o.textContent=v.name+" · "+v.lang;$("voiceSelect").appendChild(o);});
 chosenVoice=preferred[0]; $("voiceSelect").value=chosenVoice.name;
 if(!female.length) status("Keine eindeutig weibliche deutsche Systemstimme gefunden. Bitte in den Geräteeinstellungen eine weibliche deutsche Stimme laden.");
}
function selectedVoice(){return voices.find(v=>v.name===$("voiceSelect").value)||chosenVoice||voices[0]||null;}
function stopSpeech(){generation++; speaking=false; speechQueue=[]; if("speechSynthesis" in window) window.speechSynthesis.cancel();}
function speakChapter(){
 if(!chapters.length)return;
 if(!("speechSynthesis" in window)){status("Die Vorlesefunktion wird von diesem Browser nicht unterstützt.");return;}
 stopSpeech(); const token=generation; const voice=selectedVoice();
 const text=chapters[index].text; speechQueue=text.match(/[\s\S]{1,1700}(?:\s|$)/g)||[text];
 let part=0; speaking=true; status("Die Chronik wird mit ruhiger, warmer Stimme vorgelesen …");
 const next=()=>{
  if(token!==generation||!speaking)return;
  if(part>=speechQueue.length){speaking=false; if(index<chapters.length-1){moveTo(index+1); speakChapter();}else status("Das letzte Kapitel dieses Buches ist zu Ende gelesen.");return;}
  const u=new SpeechSynthesisUtterance(speechQueue[part++]);
  u.lang="de-DE"; u.rate=0.88; u.pitch=1.08; u.volume=1;
  if(voice)u.voice=voice;
  u.onend=next; u.onerror=()=>{speaking=false;status("Die Systemstimme konnte nicht fortsetzen. Bitte erneut starten.");};
  window.speechSynthesis.speak(u);
 };
 next();
}
document.querySelectorAll("[data-book]").forEach(b=>b.addEventListener("click",()=>loadBook(b.dataset.book)));
$("playBtn").addEventListener("click",speakChapter);
$("pauseBtn").addEventListener("click",()=>{if(!("speechSynthesis" in window))return;if(window.speechSynthesis.paused){window.speechSynthesis.resume();status("Lesung fortgesetzt.");}else{window.speechSynthesis.pause();status("Lesung pausiert.");}});
$("stopBtn").addEventListener("click",()=>{stopSpeech();status("Lesung beendet.");});
$("prevBtn").addEventListener("click",()=>{stopSpeech();moveTo(index-1);});
$("bottomPrev").addEventListener("click",()=>{stopSpeech();moveTo(index-1);});
$("nextBtn").addEventListener("click",()=>{stopSpeech();moveTo(index+1);});
$("bottomNext").addEventListener("click",()=>{stopSpeech();moveTo(index+1);});
$("chapterSelect").addEventListener("change",e=>{stopSpeech();moveTo(Number(e.target.value));});
$("voiceSelect").addEventListener("change",()=>{chosenVoice=selectedVoice();status("Stimme gewählt: "+(chosenVoice?.name||"Systemstimme"));});
if("speechSynthesis" in window){loadVoices();window.speechSynthesis.addEventListener?.("voiceschanged",loadVoices);}
loadBook("gesamt");
})();