# Second-Brain

Second-Brain is a fast, opinionated personal capture tool: one input, zero friction. Type anything, and the system routes it to notes, calendar events, or reminders.

## Architecture

The app is intentionally minimal and split into clear modules:

- `index.html` + `styles.css`: static shell and visual layout.
- `src/app.js`: input orchestration, routing, and UI wiring.
- `src/llm.js`: OpenAI API call + structured response parsing.
- `src/inference.js`: rule-based intent + date parsing.
- `src/tags.js`: auto-tagging (dates, topics, people).
- `src/storage.js`: localStorage persistence.
- `src/settings.js`: local settings (API key).
- `src/ui.js`: pure rendering helpers.
- `src/markdown.js`: lightweight markdown rendering.

### Inference rules (v0.1)

- **LLM routing (preferred)**: send the raw input to OpenAI and expect a JSON payload with `type`, `datetime`, `tags`, and reminder metadata.
- **Fallback rules** (no API key or error):
  - **Reminder**: starts with action verbs (call, pay, send, etc.) or includes “remind me / remember to”.
  - **Calendar event**: any recognizable date/time phrase (“tomorrow”, “next Friday”, “4/12”, “3pm”).
  - **Note**: everything else.

### Tags

- `date:YYYY-MM-DD` when a date is mentioned.
- `topic:...` from hashtags.
- `person:...` from `@` mentions or capitalized words.

## Running locally

No build step required.

```bash
# from the repo root
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

## OpenAI setup

Enter your API key in the header settings. The key is stored locally in `localStorage` and used to request a structured JSON response for routing.

## Product Principles

- One universal input, no manual classification.
- Speed over aesthetics and features.
- Remove friction by default.
