import { GoogleGenerativeAI } from "@google/generative-ai";
import Embedding, { IEmbedding } from "../model/embeddingModel";
import Post from "../model/postsModel";

// ---------------------------------------------------------------------------
// Gemini client (lazy-initialized)
// ---------------------------------------------------------------------------

let genAI: GoogleGenerativeAI | null = null;

export function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in environment variables");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

// ---------------------------------------------------------------------------
// Text chunking
// ---------------------------------------------------------------------------

/**
 * Split text into chunks of approximately `chunkSize` characters with
 * `overlap` characters of overlap between consecutive chunks.
 *
 * The function splits on sentence boundaries (`. `, `! `, `? `, or newlines)
 * to avoid cutting mid-sentence, then merges sentences into chunks that stay
 * within the size limit.
 *
 * Defaults: chunkSize = 900, overlap = 125  (within the 800-1000 / 100-150 spec)
 */
export function chunkText(
  text: string,
  chunkSize: number = 900,
  overlap: number = 125,
): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // Split into sentences — keep the delimiter attached to the sentence
  const sentenceRegex = /[^.!?\n]+(?:[.!?](?:\s|$)|\n|$)/g;
  const sentences: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = sentenceRegex.exec(text)) !== null) {
    const s = match[0].trim();
    if (s.length > 0) {
      sentences.push(s);
    }
  }

  // If regex yields nothing (e.g. text has no punctuation), fall back to the
  // full text and do a simple character-based split.
  if (sentences.length === 0) {
    sentences.push(text.trim());
  }

  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    // If adding this sentence exceeds chunkSize, finalize current chunk
    if (
      currentChunk.length > 0 &&
      currentChunk.length + sentence.length + 1 > chunkSize
    ) {
      chunks.push(currentChunk.trim());

      // Build overlap prefix from the tail of the current chunk
      const overlapText = currentChunk.slice(-overlap).trim();
      currentChunk = overlapText ? overlapText + " " + sentence : sentence;
    } else {
      currentChunk += (currentChunk.length > 0 ? " " : "") + sentence;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  // Edge case: if the entire text fits in one chunk, return it as-is
  return chunks;
}

// ---------------------------------------------------------------------------
// Embedding generation (Gemini embedding-001)
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

/**
 * Generate a 768-dimensional embedding vector for a piece of text using
 * Google Gemini's `embedding-001` model.
 *
 * Includes simple exponential backoff for transient / rate-limit errors.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const model = getGenAI().getGenerativeModel({ model: "embedding-001" });

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (err: unknown) {
      const isLast = attempt === MAX_RETRIES - 1;
      if (isLast) throw err;

      // Exponential backoff: 1s, 2s, 4s …
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      console.warn(
        `Embedding attempt ${attempt + 1} failed, retrying in ${delay}ms…`,
        err instanceof Error ? err.message : err,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  // TypeScript: should never reach here, but satisfies the compiler
  throw new Error("generateEmbedding: exceeded max retries");
}

// ---------------------------------------------------------------------------
// Generate & store embeddings for a post
// ---------------------------------------------------------------------------

/**
 * For the given post:
 *  1. Fetch the post (with populated sender for the author name)
 *  2. Concatenate title + content and chunk it
 *  3. Generate an embedding for each chunk
 *  4. Upsert Embedding documents (delete stale ones first so edits are clean)
 */
export async function generateAndStoreEmbeddings(
  postId: string,
): Promise<void> {
  const post = await Post.findById(postId).populate("sender", "username");
  if (!post) {
    throw new Error(`Post not found: ${postId}`);
  }

  const fullText = `${post.title}\n\n${post.content}`;
  const chunks = chunkText(fullText);

  if (chunks.length === 0) {
    // Nothing to embed — clean up any existing embeddings for this post
    await Embedding.deleteMany({ postId: post._id });
    return;
  }

  // Generate embeddings for all chunks
  const embeddings: number[][] = [];
  for (const chunk of chunks) {
    const vec = await generateEmbedding(chunk);
    embeddings.push(vec);
  }

  // Delete previous embeddings for this post (handles edits / re-indexing)
  await Embedding.deleteMany({ postId: post._id });

  // Build sender metadata
  const senderDoc = post.sender as unknown as { username?: string };
  const authorName = senderDoc?.username ?? "Unknown";

  // Bulk-insert new embeddings
  const docs = chunks.map((chunkText, idx) => ({
    postId: post._id,
    chunkText,
    chunkIndex: idx,
    embedding: embeddings[idx],
    metadata: {
      title: post.title,
      author: authorName,
      createdAt: (post as unknown as { createdAt: Date }).createdAt,
    },
  }));

  await Embedding.insertMany(docs);
}

// ---------------------------------------------------------------------------
// Cosine similarity
// ---------------------------------------------------------------------------

/**
 * Compute cosine similarity between two vectors:
 *   cos(a, b) = (a · b) / (|a| × |b|)
 * Returns a value in [-1, 1], where 1 = identical direction.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `Vector length mismatch: ${a.length} vs ${b.length}`,
    );
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;

  return dot / denom;
}

// ---------------------------------------------------------------------------
// Similarity search (in-app vector search for local MongoDB)
// ---------------------------------------------------------------------------

/**
 * Find the top-K most similar embedding chunks to the given query text.
 *
 * Since we use local MongoDB (not Atlas with $vectorSearch), we:
 *  1. Generate an embedding for the query
 *  2. Fetch ALL stored embeddings from the database
 *  3. Compute cosine similarity for each
 *  4. Return the top-K results sorted by score descending
 *
 * This approach is fine for course-project scale (hundreds to low-thousands
 * of chunks).
 */
export async function findSimilarChunks(
  queryText: string,
  topK: number = 5,
): Promise<Array<{ chunk: IEmbedding; score: number }>> {
  const queryEmbedding = await generateEmbedding(queryText);

  const allEmbeddings = await Embedding.find({});

  const scored = allEmbeddings.map((emb) => ({
    chunk: emb,
    score: cosineSimilarity(queryEmbedding, emb.embedding),
  }));

  // Sort descending by similarity score
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topK);
}

// ---------------------------------------------------------------------------
// Utility: remove all embeddings for a deleted post
// ---------------------------------------------------------------------------

export async function deleteEmbeddingsForPost(postId: string): Promise<void> {
  await Embedding.deleteMany({ postId });
}
