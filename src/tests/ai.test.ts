import request from "supertest";
import mongoose from "mongoose";
import initApp from "../app";
import { Express } from "express";
import postsModel from "../model/postsModel";
import Embedding from "../model/embeddingModel";
import {
  chunkText,
  cosineSimilarity,
  generateEmbedding,
  generateAndStoreEmbeddings,
} from "../services/embeddingService";
import * as ragService from "../services/ragService";
import { queryRAG, ValidationError } from "../services/ragService";
import { getLogedInUser, UserData } from "./utils";

// ---------------------------------------------------------------------------
// Mock the Gemini SDK
// ---------------------------------------------------------------------------

// Stable fake embedding vector (768 dims)
const FAKE_VECTOR = Array.from({ length: 768 }, (_, i) => i / 768);

const mockEmbedContent = jest.fn().mockResolvedValue({
  embedding: { values: FAKE_VECTOR },
});

const mockGenerateContent = jest.fn().mockResolvedValue({
  response: { text: () => "Here is your AI-generated travel answer." },
});

const mockGetGenerativeModel = jest.fn((opts: { model: string }) => {
  if (opts.model === "gemini-embedding-001") {
    return { embedContent: mockEmbedContent };
  }
  return { generateContent: mockGenerateContent };
});

jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
}));

// ---------------------------------------------------------------------------
// App + shared state
// ---------------------------------------------------------------------------

let app: Express;
let loggedInUser: UserData;

beforeAll(async () => {
  app = await initApp();
  await postsModel.deleteMany();
  await Embedding.deleteMany();
  loggedInUser = await getLogedInUser(app);
});

afterAll((done) => {
  done();
});

beforeEach(() => {
  jest.clearAllMocks();
  // Re-apply default mock behaviour after clearAllMocks
  mockEmbedContent.mockResolvedValue({ embedding: { values: FAKE_VECTOR } });
  mockGenerateContent.mockResolvedValue({
    response: { text: () => "Here is your AI-generated travel answer." },
  });
});

// ===========================================================================
// 1. chunkText unit tests
// ===========================================================================

describe("chunkText", () => {
  // Verifies text chunking behavior for empty, short, long, and overlap cases.
  test("returns empty array for empty string", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   ")).toEqual([]);
  });

  test("returns single chunk when text is shorter than chunkSize", () => {
    const text = "A short travel note about Paris.";
    const chunks = chunkText(text);
    expect(chunks.length).toBe(1);
    expect(chunks[0]).toContain("Paris");
  });

  test("splits long text into multiple overlapping chunks", () => {
    // Build a text that is clearly longer than 900 characters
    const sentence = "Visited the beautiful beaches of Thailand. ";
    const longText = sentence.repeat(30); // ~1320 chars

    const chunks = chunkText(longText, 900, 125);
    expect(chunks.length).toBeGreaterThan(1);

    // Each chunk should be ≤ chunkSize + one extra sentence tolerance
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(1100);
    }
  });

  test("overlap content appears at start of next chunk", () => {
    const sentence = "Explored the ancient ruins of Rome every day. ";
    const longText = sentence.repeat(25);

    const chunks = chunkText(longText, 900, 125);
    if (chunks.length >= 2) {
      // The tail of chunk[0] should appear at the start of chunk[1]
      const tailOfFirst = chunks[0].slice(-60).trim();
      expect(chunks[1]).toContain(tailOfFirst.split(" ").slice(-3).join(" "));
    }
  });
});

// ===========================================================================
// 2. cosineSimilarity unit tests
// ===========================================================================

describe("cosineSimilarity", () => {
  // Verifies vector similarity math across normal and edge-case inputs.
  test("identical vectors yield score 1", () => {
    const v = [1, 2, 3, 4];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  test("orthogonal vectors yield score 0", () => {
    const a = [1, 0];
    const b = [0, 1];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
  });

  test("opposite vectors yield score -1", () => {
    const a = [1, 0];
    const b = [-1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 5);
  });

  test("zero vector returns 0 without throwing", () => {
    const zero = [0, 0, 0];
    const v = [1, 2, 3];
    expect(cosineSimilarity(zero, v)).toBe(0);
  });

  test("throws when vector lengths differ", () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow();
  });
});

// ===========================================================================
// 3. generateEmbedding unit tests (Gemini mocked)
// ===========================================================================

describe("generateEmbedding", () => {
  // Verifies embedding generation with retry logic against mocked Gemini SDK.
  test("calls Gemini embedding model and returns a number array", async () => {
    const result = await generateEmbedding("Nice trip to Tokyo");
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(768);
    expect(result).toEqual(FAKE_VECTOR);
    expect(mockEmbedContent).toHaveBeenCalledTimes(1);
  });

  test("retries on transient error and succeeds on second attempt", async () => {
    mockEmbedContent
      .mockRejectedValueOnce(new Error("rate limit"))
      .mockResolvedValueOnce({ embedding: { values: FAKE_VECTOR } });

    const result = await generateEmbedding("Retry test");
    expect(result).toEqual(FAKE_VECTOR);
    expect(mockEmbedContent).toHaveBeenCalledTimes(2);
  });

  test("throws after exhausting all retries", async () => {
    mockEmbedContent.mockRejectedValue(new Error("persistent error"));
    await expect(generateEmbedding("fail text")).rejects.toThrow();
  });
});

// ===========================================================================
// 4. generateAndStoreEmbeddings unit tests
// ===========================================================================

describe("generateAndStoreEmbeddings", () => {
  // Verifies embedding persistence, re-indexing behavior, and invalid post handling.
  let savedPostId: string;

  beforeEach(async () => {
    await postsModel.deleteMany();
    await Embedding.deleteMany();
  });

  test("stores embedding documents for a created post", async () => {
    const post = await postsModel.create({
      title: "Backpacking Through Southeast Asia",
      content:
        "We started our journey in Bangkok, then moved to Chiang Mai. " +
        "The temples were breathtaking. After a week we flew to Hanoi and cycled through rice paddies.",
      sender: new mongoose.Types.ObjectId(),
    });

    savedPostId = post._id.toString();

    await generateAndStoreEmbeddings(savedPostId);

    const docs = await Embedding.find({ postId: post._id });
    expect(docs.length).toBeGreaterThan(0);
    expect(docs[0].chunkText.length).toBeGreaterThan(0);
    expect(docs[0].embedding).toEqual(FAKE_VECTOR);
    expect(docs[0].metadata.title).toBe("Backpacking Through Southeast Asia");
  });

  test("re-indexes (replaces) embeddings when called again for the same post", async () => {
    const post = await postsModel.create({
      title: "Island Hopping in Greece",
      content: "Santorini sunsets are magical. Mykonos has great nightlife.",
      sender: new mongoose.Types.ObjectId(),
    });

    await generateAndStoreEmbeddings(post._id.toString());
    const firstCount = await Embedding.countDocuments({ postId: post._id });

    // Call again (simulates an edit)
    await generateAndStoreEmbeddings(post._id.toString());
    const secondCount = await Embedding.countDocuments({ postId: post._id });

    // No duplicates — count should be the same
    expect(secondCount).toBe(firstCount);
  });

  test("throws for non-existent post id", async () => {
    await expect(
      generateAndStoreEmbeddings("000000000000000000000000"),
    ).rejects.toThrow();
  });
});

// ===========================================================================
// 5. queryRAG — input validation
// ===========================================================================

describe("queryRAG — input validation", () => {
  // Verifies request validation rules before retrieval/generation pipeline runs.
  test("throws ValidationError for empty string", async () => {
    await expect(queryRAG("")).rejects.toThrow(ValidationError);
  });

  test("throws ValidationError for whitespace-only string", async () => {
    await expect(queryRAG("   ")).rejects.toThrow(ValidationError);
  });

  test("throws ValidationError for query shorter than 3 characters", async () => {
    await expect(queryRAG("Hi")).rejects.toThrow(ValidationError);
  });

  test("throws ValidationError for query exceeding 500 characters", async () => {
    const longQuery = "a".repeat(501);
    await expect(queryRAG(longQuery)).rejects.toThrow(ValidationError);
  });

  test("throws ValidationError when question is not a string", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(queryRAG(42 as any)).rejects.toThrow(ValidationError);
  });
});

// ===========================================================================
// 6. queryRAG — no-results / threshold filtering
// ===========================================================================

describe("queryRAG — no results scenario", () => {
  // Verifies fallback answer contract when retrieval yields no relevant context.
  beforeEach(async () => {
    await Embedding.deleteMany();
    // When there are no embeddings, findSimilarChunks returns [] which
    // automatically passes the threshold filter as an empty set.
  });

  test("returns fallback answer with empty sources when no embeddings exist", async () => {
    const result = await queryRAG("What are the best beaches in the world?");
    expect(result.answer).toMatch(/couldn't find|try asking/i);
    expect(result.sources).toEqual([]);
    // Query expansion calls the generative model, but answer generation is
    // short-circuited when no relevant chunks are found.
  });
});

// ===========================================================================
// 7. queryRAG — happy path (mocked Gemini, seeded embeddings)
// ===========================================================================

describe("queryRAG — happy path", () => {
  // Verifies successful retrieval+generation path and source de-duplication.
  let postId: string;

  beforeAll(async () => {
    await postsModel.deleteMany();
    await Embedding.deleteMany();

    const post = await postsModel.create({
      title: "Hidden Gems in Portugal",
      content:
        "Portugal's Alentejo region hides some of Europe's most unspoiled landscapes. " +
        "Rolling plains dotted with cork oaks stretch to the horizon. The local cuisine " +
        "features hearty black pork dishes and exceptional wines.",
      sender: new mongoose.Types.ObjectId(),
    });

    postId = post._id.toString();

    // Seed embeddings: use vectors close to FAKE_VECTOR so cosine similarity ≥ 0.3
    await Embedding.create({
      postId: post._id,
      chunkText: "Portugal's Alentejo region has unspoiled landscapes.",
      chunkIndex: 0,
      embedding: FAKE_VECTOR,
      metadata: {
        title: "Hidden Gems in Portugal",
        author: "testuser",
        createdAt: new Date(),
      },
    });
  });

  test("returns AI answer and source references for a valid question", async () => {
    const result = await queryRAG("Tell me about Portugal landscapes");

    expect(typeof result.answer).toBe("string");
    expect(result.answer.length).toBeGreaterThan(0);
    expect(Array.isArray(result.sources)).toBe(true);

    // Because we seeded exactly one chunk with a similarity of 1.0 (same
    // vector as the query embedding), it should pass the 0.3 threshold.
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.sources[0].postId).toBe(postId);
    expect(result.sources[0].title).toBe("Hidden Gems in Portugal");

    // Generative model is called at least twice: once for query expansion
    // and once for the final answer generation.
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  test("deduplicates sources when multiple chunks come from the same post", async () => {
    // Add a second chunk for the same post
    const post = await postsModel.findById(postId);
    await Embedding.create({
      postId: post!._id,
      chunkText: "Local cuisine features black pork and exceptional wines.",
      chunkIndex: 1,
      embedding: FAKE_VECTOR,
      metadata: {
        title: "Hidden Gems in Portugal",
        author: "testuser",
        createdAt: new Date(),
      },
    });

    const result = await queryRAG("What food is Portugal known for?");

    // Multiple chunks from same post → only one source entry
    const sourceIds = result.sources.map((s) => s.postId);
    const uniqueIds = new Set(sourceIds);
    expect(uniqueIds.size).toBe(sourceIds.length);
  });
});

// ===========================================================================
// 8. POST /ai/ask HTTP endpoint tests
// ===========================================================================

describe("POST /ai/ask — HTTP endpoint", () => {
  // Verifies auth, validation, and response shape at REST API layer.
  test("returns 401 when no auth token provided", async () => {
    const response = await request(app)
      .post("/ai/ask")
      .send({ question: "Best destination in Europe?" });
    expect(response.status).toBe(401);
  });

  test("returns 400 for an empty question", async () => {
    const response = await request(app)
      .post("/ai/ask")
      .set("Authorization", "Bearer " + loggedInUser.token)
      .send({ question: "" });
    expect(response.status).toBe(400);
  });

  test("returns 400 for a question that is too long", async () => {
    const response = await request(app)
      .post("/ai/ask")
      .set("Authorization", "Bearer " + loggedInUser.token)
      .send({ question: "q".repeat(501) });
    expect(response.status).toBe(400);
  });

  test("returns 200 with answer and sources for a valid question", async () => {
    const response = await request(app)
      .post("/ai/ask")
      .set("Authorization", "Bearer " + loggedInUser.token)
      .send({ question: "What hidden gems exist in Portugal?" });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("answer");
    expect(response.body).toHaveProperty("sources");
    expect(typeof response.body.answer).toBe("string");
    expect(Array.isArray(response.body.sources)).toBe(true);
  });

  test("returns 500 when queryRAG throws a non-validation error", async () => {
    const errorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const querySpy = jest
      .spyOn(ragService, "queryRAG")
      .mockRejectedValueOnce(new Error("Unexpected RAG failure"));

    const response = await request(app)
      .post("/ai/ask")
      .set("Authorization", "Bearer " + loggedInUser.token)
      .send({ question: "What are good destinations in Italy?" });

    expect(querySpy).toHaveBeenCalledWith(
      "What are good destinations in Italy?",
    );
    expect(response.status).toBe(500);
    expect(response.body).toBe("Error processing AI query");
    expect(errorSpy).toHaveBeenCalled();

    querySpy.mockRestore();
    errorSpy.mockRestore();
  });
});
