import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = "You are a fast personal second-brain router. Return only JSON.";

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

const parseBody = (req) =>
  new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });

const sendJson = (res, status, payload) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
};

const serveStatic = async (res, urlPath) => {
  const filePath = urlPath === "/" ? "/index.html" : urlPath;
  const resolved = path.join(__dirname, filePath);
  try {
    const data = await readFile(resolved);
    const ext = path.extname(resolved).toLowerCase();
    const contentType =
      ext === ".html"
        ? "text/html"
        : ext === ".css"
        ? "text/css"
        : ext === ".js"
        ? "text/javascript"
        : "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  } catch (error) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
};

const handleRouteRequest = async (req, res) => {
  if (!OPENAI_API_KEY) {
    sendJson(res, 500, { error: "OPENAI_API_KEY is not set on the server." });
    return;
  }

  let payload;
  try {
    payload = await parseBody(req);
  } catch (error) {
    sendJson(res, 400, { error: "Invalid JSON." });
    return;
  }

  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  if (!text) {
    sendJson(res, 400, { error: "Missing text." });
    return;
  }

  const body = {
    model: "gpt-4o-mini",
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
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    sendJson(res, response.status, { error: errorText });
    return;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    sendJson(res, 502, { error: "Empty LLM response." });
    return;
  }

  try {
    const structured = coerceResponse(content);
    sendJson(res, 200, { data: structured });
  } catch (error) {
    sendJson(res, 502, { error: "Failed to parse JSON." });
  }
};

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/api/route") {
    await handleRouteRequest(req, res);
    return;
  }

  if (req.method === "GET") {
    await serveStatic(res, req.url);
    return;
  }

  res.writeHead(405, { "Content-Type": "text/plain" });
  res.end("Method not allowed");
});

server.listen(PORT, () => {
  console.log(`Second-Brain server running on http://localhost:${PORT}`);
});
