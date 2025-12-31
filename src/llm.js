const MODEL = "gpt-4o-mini";
const SYSTEM_PROMPT = `You are a fast personal second-brain router. Return only JSON.`;

const buildUserPrompt = (text) => `Classify the input and return a JSON object with this exact shape:
{
  "type": "note" | "event" | "reminder",
  "text": string,
  "datetime": string | null,
  "reminderKind": "time" | "context" | null,
  "trigger": string | null,
  "tags": string[]
}

Rules:
- Use type "event" only if a concrete date/time is present.
- Use type "reminder" for action verbs or explicit reminder phrasing.
- For reminders, set reminderKind to "context" if the text contains a context trigger ("when ..."), otherwise "time".
- datetime must be ISO 8601 or null.
- tags should include topic/person/date tags if present.

Input:
"""
${text}
"""`;

const coerceResponse = (rawText) => {
  const firstBrace = rawText.indexOf("{");
  const lastBrace = rawText.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("No JSON found in LLM response.");
  }
  const jsonText = rawText.slice(firstBrace, lastBrace + 1);
  return JSON.parse(jsonText);
};

export const requestStructuredEntry = async ({ apiKey, text }) => {
  const body = {
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(text) },
    ],
    temperature: 0.2,
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Empty LLM response.");
  }

  return coerceResponse(content);
};
