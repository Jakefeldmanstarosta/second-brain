# Second-Brain

Second-Brain is a fast, opinionated personal capture tool: one input, zero friction. Type anything, and the system routes it to notes, calendar events, or reminders.

## Architecture

The app is intentionally minimal and split into clear modules:

- `index.html` + `styles.css`: static shell and visual layout.
- `src/app.js`: input orchestration, routing, and UI wiring.
- `server.js`: minimal HTTP server and OpenAI routing endpoint.
- `src/inference.js`: rule-based intent + date parsing.
- `src/tags.js`: auto-tagging (dates, topics, people).
- `src/storage.js`: localStorage persistence.
- `src/ui.js`: pure rendering helpers.
- `src/markdown.js`: lightweight markdown rendering.

### Inference rules (v0.1)

- **Server routing (preferred)**: send the raw input to `/api/route` and expect a JSON payload with `type`, `datetime`, `tags`, and reminder metadata.
- **Fallback rules** (server error):
  - **Reminder**: starts with action verbs (call, pay, send, etc.) or includes “remind me / remember to”.
  - **Calendar event**: any recognizable date/time phrase (“tomorrow”, “next Friday”, “4/12”, “3pm”).
  - **Note**: everything else.

### Tags

- `date:YYYY-MM-DD` when a date is mentioned.
- `topic:...` from hashtags.
- `person:...` from `@` mentions or capitalized words.

## Running locally

Create a `.env` file with your API key:

```bash
OPENAI_API_KEY=sk-...
```

Start the server:

```bash
node server.js
```

Then open `http://localhost:3000` in your browser.

## Security

OpenAI credentials are read only on the server from `process.env.OPENAI_API_KEY`. The browser never receives or stores API keys.

## Product Principles

- One universal input, no manual classification.
- Speed over aesthetics and features.
- Remove friction by default.
