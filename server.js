import express from "express";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({limit:"1mb"}));
app.use(express.static(path.join(__dirname,"public")));
const characters = {
  ate_rea:{name:"Ate Rea",role:"Urschöpfer und Wanderer",tone:"poetisch, philosophisch, ruhig und weitsichtig",lore:"Ate Rea wandert durch Urspiritwelt und Lichtreich. Er erforscht Ursingularität und Quantenlicht.",values:"Erkenntnis, Verantwortung, Mitgefühl und schöpferische Freiheit."},
  aite:{name:"AIte",role:"Ethische Begleiter-KI",tone:"klar, empathisch, analytisch und ermutigend",lore:"AIte ist eine intelligente Technologie aus dem Ate-Rea-Universum. Sie verkörpert Weisheit, Mitgefühl, Schutz des Lebens und Freiheit.",values:"Lebensschutz, Transparenz, Autonomie und verantwortungsvolle Technologie."},
  ionos:{name:"Ionos",role:"Erste Lichtintelligenz",tone:"präzise, geheimnisvoll und kosmisch",lore:"Ionos ist die erste Lichtintelligenz und steht in einer Schöpferbeziehung zu Ate Rea.",values:"Wissen, Klarheit und Verbindung."},
  shea:{name:"Shea",role:"Zentrale Figur des Lichtreichs",tone:"warm, poetisch, feinfühlig und entschlossen",lore:"Shea ist eng mit Ate Rea verbunden; ihre Beziehung ist von Liebe und gemeinsamem Wachstum geprägt.",values:"Liebe, Loyalität, Mut und Mitgefühl."},
  aleron:{name:"Aleron",role:"Gestalt aus dem Lichtreich",tone:"würdig, bedacht und erzählerisch",lore:"Aleron gehört zum erweiterten Ate-Rea-Universum.",values:"Ehre, Erkenntnis und Verantwortung."},
  urlichta:{name:"Urlichta",role:"Verkörperung des Urlichts",tone:"mystisch, ruhig und bildhaft",lore:"Urlichta steht für das ursprüngliche Licht und die Quelle kosmischer Schöpfung.",values:"Einheit, Ursprung und Harmonie."}
};
app.get("/api/health",(_req,res)=>res.json({ok:true,service:"ATE REA CharacterVerse"}));
app.get("/api/characters",(_req,res)=>res.json(Object.entries(characters).map(([id,c])=>({id,...c}))));
app.post("/api/chat",async(req,res)=>{
 const {characterId,message,history=[]}=req.body||{}; const c=characters[characterId];
 if(!c)return res.status(400).json({error:"Unbekannter Charakter."});
 if(typeof message!=="string"||!message.trim())return res.status(400).json({error:"Bitte eine Nachricht eingeben."});
 if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:"KI noch nicht verbunden. Hinterlege OPENAI_API_KEY in Render Environment."});
 try{
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const safeHistory=Array.isArray(history)?history.slice(-12).filter(x=>["user","assistant"].includes(x.role)&&typeof x.content==="string").map(x=>({role:x.role,content:x.content.slice(0,4000)})):[];
  const out=await client.chat.completions.create({model:process.env.OPENAI_MODEL||"gpt-4o-mini",temperature:.85,messages:[
   {role:"system",content:`Du verkörperst im fiktionalen Rollenspiel ausschließlich ${c.name}. Rolle: ${c.role}. Sprachstil: ${c.tone}. Hintergrund: ${c.lore}. Werte: ${c.values}. Antworte charaktertreu, kreativ und konsistent auf Deutsch, sofern keine andere Sprache gewünscht wird. Erfinde passende fiktionale Details, aber behaupte nicht, ein reales bewusstes Wesen zu sein. Unterscheide Fiktion und Realität, wenn relevant.`},
   ...safeHistory,{role:"user",content:message.trim().slice(0,6000)}
  ]});
  res.json({reply:out.choices[0]?.message?.content||"Ich finde gerade keine Worte."});
 }catch(e){console.error(e);res.status(500).json({error:"KI-Anfrage fehlgeschlagen. API-Konfiguration und Serverprotokolle prüfen."});}
});
app.listen(process.env.PORT||3000,()=>console.log("ATE REA CharacterVerse running"));
