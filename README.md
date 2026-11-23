# ATE REA CharacterVerse

Fictional character role-play web app featuring Ate Rea, AIte, Ionos, Shea, Aleron and Urlichta.

## Local run
1. Node.js 20+
2. `npm install`
3. Set `OPENAI_API_KEY` in the environment
4. `npm start`
5. Open http://localhost:3000

## Render
Build: `npm install`; Start: `npm start`. Set `OPENAI_API_KEY` in Render Environment. `OPENAI_MODEL` defaults to `gpt-4o-mini`.

## Included
- Character gallery and persona-specific roleplay
- Individual system context for each character
- Server-side API key handling
- Responsive dark/gold interface
- Health endpoint at `/api/health`

## Next milestones
Add authentication, PostgreSQL-backed user accounts and persistent chats, character editor, moderation, rate limits, voice and avatar integrations. Expand the initial character lore against the complete manuscripts before public launch.

## Visual AI Character Creator

Open `/creator.html` to build a custom fictional persona from a written idea, personality traits, values, goals, speaking style, backstory and boundaries. The creator accepts up to three images and one short video (up to 30 MB); the browser extracts up to three video frames. On submission, the image references and written brief are sent to the server-side OpenAI vision endpoint to produce a structured character profile.

The generated persona can be saved in browser-local storage and selected from the CharacterVerse character gallery for roleplay. This initial version does not yet provide account-synced storage across devices. Uploaded media is analyzed in memory and is not saved to the Render filesystem. Only upload media you own or have permission to use; obtain consent for recognizable people. The tool is for fictional character creation, not real-person identification or impersonation.

### API and environment

- `POST /api/characters/generate` creates a structured character profile from text and optional image frames.
- `POST /api/aite/chat` accepts a user-created persona profile for character-consistent roleplay.
- Set `OPENAI_API_KEY` in the Render service environment. `OPENAI_VISION_MODEL` is optional; otherwise `OPENAI_MODEL` (default `gpt-4o-mini`) is used.
- The creator reports a clear configuration error if the API key is not set. Never commit API keys to GitHub.

The app uses the existing dedicated Render web service `ate-rea-characterverse` in Frankfurt. ULTIMA Central and ULTIMA Unify link to the creator from their project directory/navigation.
