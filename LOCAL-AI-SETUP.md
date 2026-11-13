# Lokale KI ohne OpenAI

## Variante A: Browser/WebGPU
1. Öffne CharacterVerse und wähle „Lokale KI laden / Offline-Modus“.
2. Beim ersten Mal werden die Modellgewichte (ca. 0,9 GB plus Cache) heruntergeladen.
3. Nach erfolgreichem Download kann das Modell lokal im Browser rechnen, wenn Browsercache, WebGPU und ausreichend GPU-Speicher verfügbar bleiben.
4. Browserdaten oder Cache nicht löschen, wenn das Modell offline verfügbar bleiben soll.

## Variante B: Lokales Ollama (für Geräte ohne WebGPU)
1. Installiere Ollama lokal von https://ollama.com/download.
2. Lade ein Modell: ollama pull qwen2.5:1.5b
3. Starte Ollama mit erlaubtem Website-Ursprung. Beispiel im Terminal:
   OLLAMA_ORIGINS=https://ate-rea-characterverse.onrender.com ollama serve
4. Öffne die Website und wähle „Lokale KI laden / Offline-Modus“. Die App prüft WebGPU zuerst und verwendet Ollama als lokale Alternative.
5. Der lokale Ollama-Dienst muss während der Nutzung laufen. Die Modellgewichte bleiben auf deinem Gerät.

Hinweis: Browserzugriffe auf localhost können je nach Browser zusätzliche lokale Netzwerk-/CORS-Freigaben verlangen. Dieses Fallback wurde im Cloud-Build kompiliert, aber nicht auf deinem Mac getestet.
