import { getGenAI, findSimilarChunks } from "./embeddingService";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIMILARITY_THRESHOLD = 0.3;
const TOP_K = 5;
const MAX_CONTEXT_CHARS = 4000;
const MIN_QUESTION_LENGTH = 3;
const MAX_QUESTION_LENGTH = 500;
const GENERATION_MODEL = "gemini-3-flash-preview";
const TEMPERATURE = 0.3;
const MAX_OUTPUT_TOKENS = 1024;

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
- When referencing specific experiences, mention the post title and author.
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
  const results = await findSimilarChunks(question, TOP_K);

  // 3. Apply similarity threshold
  const relevant = results.filter((r) => r.score >= SIMILARITY_THRESHOLD);

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
  const answer = result.response.text();

  // 7. Deduplicate source references
  const seenPostIds = new Set<string>();
  const sources: RAGSource[] = [];

  for (const r of includedChunks) {
    const postId = r.chunk.postId.toString();
    if (!seenPostIds.has(postId)) {
      seenPostIds.add(postId);
      sources.push({ postId, title: r.chunk.metadata.title });
    }
  }

  return { answer, sources };
}
