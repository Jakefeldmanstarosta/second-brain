import { parseDateTime } from "./inference.js";

const isCapitalized = (word) => /^[A-Z][a-z]+$/.test(word);

export const extractTags = (text) => {
  const tags = new Set();
  const dateInfo = parseDateTime(text);
  if (dateInfo) {
    tags.add(`date:${dateInfo.date.toISOString().slice(0, 10)}`);
  }

  const hashTags = text.match(/#[\w-]+/g) ?? [];
  hashTags.forEach((tag) => tags.add(`topic:${tag.slice(1).toLowerCase()}`));

  const mentionTags = text.match(/@[\w-]+/g) ?? [];
  mentionTags.forEach((tag) => tags.add(`person:${tag.slice(1)}`));

  const words = text.replace(/[^\w\s]/g, "").split(/\s+/);
  words.forEach((word, index) => {
    if (index === 0) {
      return;
    }
    if (isCapitalized(word)) {
      tags.add(`person:${word}`);
    }
  });

  if (tags.size === 0) {
    tags.add("topic:general");
  }

  return Array.from(tags);
};
