import { getGenAI, findSimilarChunksHybrid } from "./embeddingService";
import type { IEmbedding } from "../model/embeddingModel";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIMILARITY_THRESHOLD = 0.6;
const DYNAMIC_THRESHOLD_MARGIN = 0.05;
const FALLBACK_TOP_K = 2;
const TOP_K = 5;
const RETRIEVAL_TOP_K = 8;
const QUERY_EXPANSION_COUNT = 3;
const RERANK_TOP_N = 12;
const MAX_CONTEXT_CHARS = 8000;
const MIN_QUESTION_LENGTH = 3;
const MAX_QUESTION_LENGTH = 500;
const GENERATION_MODEL = "gemini-3-flash-preview";
const TEMPERATURE = 0.3;
const MAX_OUTPUT_TOKENS = 2048;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RAGSource {
  postId: string;
  title: string;
}

export interface RAGResult {
  answer: string;
  sources: RAGSource[];
  usedSources?: RAGSource[];
  allSources?: RAGSource[];
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are TravelTales AI Assistant — a helpful, friendly travel expert.
Your job is to answer travel-related questions using ONLY the context provided below, which comes from real travel posts written by TravelTales users.

Rules:
- Base your answer strictly on the provided context. Do not invent facts.
- If the context does not contain enough information to answer, say so honestly.
- Keep answers concise but informative (2-4 paragraphs max).
- When referencing specific experiences, mention the post title and author in bold.
- Use a warm, encouraging tone appropriate for travel enthusiasts.`;

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

function validateQuestion(question: unknown): string {
  if (typeof question !== "string") {
    throw new ValidationError("Question must be a string");
  }

  const cleaned = question.trim();

  if (cleaned.length < MIN_QUESTION_LENGTH) {
    throw new ValidationError(
      `Question must be at least ${MIN_QUESTION_LENGTH} characters`,
    );
  }

  if (cleaned.length > MAX_QUESTION_LENGTH) {
    throw new ValidationError(
      `Question must be at most ${MAX_QUESTION_LENGTH} characters`,
    );
  }

  return cleaned;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

// ---------------------------------------------------------------------------
// Query expansion
// ---------------------------------------------------------------------------

function parseJsonArray(text: string): unknown[] | null {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");

  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function expandQueryWithGemini(question: string): Promise<string[]> {
  const model = getGenAI().getGenerativeModel({
    model: GENERATION_MODEL,
    generationConfig: { temperature: 0.2, maxOutputTokens: 256 },
  });

  const prompt =
    "Generate " +
    QUERY_EXPANSION_COUNT +
    " short search queries or keyword variants for a travel question. " +
    "Return ONLY a JSON array of strings, no extra text.\n\n" +
    "Question: " +
    question;

  const result = await model.generateContent(prompt);
  const raw = result.response.text();
  const parsed = parseJsonArray(raw) ?? [];

  const deduped = new Set<string>();
  for (const item of parsed) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (trimmed.length > 0) deduped.add(trimmed);
  }

  return Array.from(deduped);
}

// ---------------------------------------------------------------------------
// Reranking
// ---------------------------------------------------------------------------

type CandidateChunk = {
  chunk: IEmbedding;
  score: number;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars).trimEnd() + "...";
}

async function rerankWithGemini(
  question: string,
  candidates: CandidateChunk[],
): Promise<CandidateChunk[]> {
  if (candidates.length <= 1) return candidates;

  const model = getGenAI().getGenerativeModel({
    model: GENERATION_MODEL,
    generationConfig: { temperature: 0, maxOutputTokens: 256 },
  });

  const list = candidates
    .map((c, idx) => {
      const snippet = truncateText(c.chunk.chunkText, 320);
      return (
        idx +
        ". Title: " +
        c.chunk.metadata.title +
        " | Author: " +
        c.chunk.metadata.author +
        " | Text: " +
        snippet
      );
    })
    .join("\n");

  const prompt =
    "You are ranking snippets for relevance to a question. " +
    "Return ONLY a JSON array of the snippet indices in best-to-worst order.\n\n" +
    "Question: " +
    question +
    "\n\nSnippets:\n" +
    list;

  const result = await model.generateContent(prompt);
  const raw = result.response.text();
  const parsed = parseJsonArray(raw);

  if (!parsed) return candidates;

  const order: number[] = [];
  for (const item of parsed) {
    const num = Number(item);
    if (Number.isInteger(num) && num >= 0 && num < candidates.length) {
      order.push(num);
    }
  }

  if (order.length === 0) return candidates;

  const seen = new Set<number>();
  const reranked: CandidateChunk[] = [];

  for (const idx of order) {
    if (!seen.has(idx)) {
      seen.add(idx);
      reranked.push(candidates[idx]);
    }
  }

  for (let i = 0; i < candidates.length; i++) {
    if (!seen.has(i)) reranked.push(candidates[i]);
  }

  return reranked;
}

// ---------------------------------------------------------------------------
// RAG pipeline
// ---------------------------------------------------------------------------

/**
 * Full Retrieval-Augmented Generation pipeline:
 *  1. Validate & clean user question
 *  2. Generate embedding for the question & retrieve top-K similar chunks
 *  3. Filter by similarity threshold
 *  4. Build augmented prompt (system + context + question)
 *  5. Call Gemini generative model
 *  6. Return answer text + deduplicated source references
 */
export async function queryRAG(userQuestion: string): Promise<RAGResult> {
  // 1. Validate input
  const question = validateQuestion(userQuestion);

  // 2. Retrieve similar chunks
  let expansions: string[] = [];
  try {
    expansions = await expandQueryWithGemini(question);
  } catch (err) {
    console.warn("[rag] query expansion failed", err);
  }

  const queries = [question, ...expansions].filter((q) => q.trim().length > 0);
  const uniqueQueries = Array.from(new Set(queries));
  const merged = new Map<string, CandidateChunk>();

  for (const q of uniqueQueries) {
    const candidates = await findSimilarChunksHybrid(q, RETRIEVAL_TOP_K, {
      vectorTopK: RETRIEVAL_TOP_K,
      textTopK: RETRIEVAL_TOP_K,
    });

    for (const c of candidates) {
      const id = c.chunk._id.toString();
      const existing = merged.get(id);
      if (!existing || c.score > existing.score) {
        merged.set(id, { chunk: c.chunk, score: c.score });
      }
    }
  }

  let results = Array.from(merged.values()).sort((a, b) => b.score - a.score);
  if (results.length > RERANK_TOP_N) {
    results = results.slice(0, RERANK_TOP_N);
  }

  results = await rerankWithGemini(question, results);

  if (results.length > TOP_K) {
    results = results.slice(0, TOP_K);
  }

  // 3. Apply similarity threshold (with dynamic fallback)
  let relevant = results.filter((r) => r.score >= SIMILARITY_THRESHOLD);
  let usedFallback = false;

  if (relevant.length === 0 && results.length > 0) {
    const dynamicThreshold = Math.max(
      SIMILARITY_THRESHOLD - DYNAMIC_THRESHOLD_MARGIN,
      0,
    );
    relevant = results.filter((r) => r.score >= dynamicThreshold);
  }

  if (relevant.length === 0 && results.length > 0) {
    relevant = results.slice(0, FALLBACK_TOP_K);
    usedFallback = true;
  }

  if (relevant.length === 0) {
    return {
      answer:
        "I couldn't find any relevant travel content to answer your question. " +
        "Try asking about destinations or experiences that other travelers have posted about!",
      sources: [],
    };
  }

  // 4. Build context block (respect MAX_CONTEXT_CHARS)
  let contextBlock = "";
  const includedChunks: typeof relevant = [];

  for (const r of relevant) {
    const entry =
      `[Post: "${r.chunk.metadata.title}" by ${r.chunk.metadata.author}]\n` +
      `${r.chunk.chunkText}\n\n`;

    if (contextBlock.length + entry.length > MAX_CONTEXT_CHARS) break;
    contextBlock += entry;
    includedChunks.push(r);
  }

  // 5. Build full prompt
  const prompt = [
    SYSTEM_PROMPT,
    "",
    "--- Context from TravelTales posts ---",
    contextBlock.trim(),
    "--- End of context ---",
    "",
    `User question: ${question}`,
  ].join("\n");

  // 6. Call Gemini
  const model = getGenAI().getGenerativeModel({
    model: GENERATION_MODEL,
    generationConfig: {
      temperature: TEMPERATURE,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
  });

  const result = await model.generateContent(prompt);
  let answer = result.response.text();

  if (usedFallback) {
    answer =
      "I could not find strong matches, but here are the closest related posts. " +
      "If you can share a destination, season, or budget, I can refine this.\n\n" +
      answer;
  }

  // 7. Deduplicate source references
  const seenPostIds = new Set<string>();
  const allSources: RAGSource[] = [];

  for (const r of includedChunks) {
    const postId = r.chunk.postId.toString();
    if (!seenPostIds.has(postId)) {
      seenPostIds.add(postId);
      allSources.push({ postId, title: r.chunk.metadata.title });
    }
  }

  const usedSources = allSources.filter((source) => {
    const titlePattern = new RegExp(`\\b${escapeRegExp(source.title)}\\b`, "i");
    return titlePattern.test(answer);
  });

  const sources = usedSources.length > 0 ? usedSources : allSources;

  return { answer, sources, usedSources, allSources };
}
