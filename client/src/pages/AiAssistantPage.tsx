import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { FaRobot, FaTrash, FaSearch } from "react-icons/fa";
import aiService from "../services/aiService";
import type { IAISource } from "../services/aiService";
import { useAuth } from "../context/AuthContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IQAPair {
  question: string;
  answer: string;
  sources: IAISource[];
  timestamp: string; // ISO string
}

// ---------------------------------------------------------------------------
// Simple markdown renderer
// Handles: **bold**, *italic*, `code`, bullet lists, numbered lists, paragraphs
// ---------------------------------------------------------------------------

function renderMarkdown(text: string): ReactElement {
  const lines = text.split("\n");
  const elements: ReactElement[] = [];
  let key = 0;

  const parseInline = (line: string): ReactNode[] => {
    // Process **bold**, *italic*, `code` inline
    const parts: ReactNode[] = [];
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(line)) !== null) {
      if (m.index > last) parts.push(line.slice(last, m.index));
      if (m[2] !== undefined) {
        parts.push(<strong key={key++}>{m[2]}</strong>);
      } else if (m[3] !== undefined) {
        parts.push(<em key={key++}>{m[3]}</em>);
      } else if (m[4] !== undefined) {
        parts.push(
          <code key={key++} className="bg-light px-1 rounded small">
            {m[4]}
          </code>,
        );
      }
      last = m.index + m[0].length;
    }
    if (last < line.length) parts.push(line.slice(last));
    return parts;
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Blank line → paragraph break (skip)
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Bullet list item
    if (/^[-*]\s+/.test(line)) {
      const items: ReactElement[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(
          <li key={key++}>{parseInline(lines[i].replace(/^[-*]\s+/, ""))}</li>,
        );
        i++;
      }
      elements.push(
        <ul key={key++} className="mb-2 ps-4">
          {items}
        </ul>,
      );
      continue;
    }

    // Numbered list item
    if (/^\d+\.\s+/.test(line)) {
      const items: ReactElement[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(
          <li key={key++}>{parseInline(lines[i].replace(/^\d+\.\s+/, ""))}</li>,
        );
        i++;
      }
      elements.push(
        <ol key={key++} className="mb-2 ps-4">
          {items}
        </ol>,
      );
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.*)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const Tag = `h${level + 3}` as "h4" | "h5" | "h6";
      elements.push(
        <Tag key={key++} className="fw-semibold mt-2 mb-1">
          {parseInline(headingMatch[2])}
        </Tag>,
      );
      i++;
      continue;
    }

    // Default: paragraph line
    elements.push(
      <p key={key++} className="mb-1">
        {parseInline(line)}
      </p>,
    );
    i++;
  }

  return <>{elements}</>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_QUESTION_LENGTH = 500;
const MIN_QUESTION_LENGTH = 3;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function AiAssistantPage() {
  const { user } = useAuth();
  const storageKey = user ? `ai_qa_${user._id}` : null;

  const [question, setQuestion] = useState("");
  const [pairs, setPairs] = useState<IQAPair[]>(() => {
    if (!storageKey) return [];
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? (JSON.parse(saved) as IQAPair[]) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRef = useRef<HTMLDivElement>(null);

  // Persist Q&A history to localStorage whenever it changes
  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(pairs));
  }, [pairs, storageKey]);

  const handleClearHistory = () => {
    setPairs([]);
    if (storageKey) localStorage.removeItem(storageKey);
  };

  // Client-side validation mirrors backend rules
  const validationError =
    question.trim().length > 0 && question.trim().length < MIN_QUESTION_LENGTH
      ? `Question must be at least ${MIN_QUESTION_LENGTH} characters`
      : question.trim().length > MAX_QUESTION_LENGTH
        ? `Question must be at most ${MAX_QUESTION_LENGTH} characters`
        : null;

  const canSubmit =
    question.trim().length >= MIN_QUESTION_LENGTH &&
    question.trim().length <= MAX_QUESTION_LENGTH &&
    !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const trimmed = question.trim();
    setQuestion("");
    setError(null);
    setIsLoading(true);

    try {
      const result = await aiService.ask(trimmed);
      setPairs((prev) => [
        {
          question: trimmed,
          answer: result.answer,
          sources: result.sources,
          timestamp: new Date().toISOString(),
        },
        ...prev, // newest first
      ]);
      setTimeout(
        () =>
          latestRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        50,
      );
    } catch {
      setError("Failed to get a response. Please try again.");
      setQuestion(trimmed);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="container py-4" style={{ maxWidth: 800 }}>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-1">
        <div className="d-flex align-items-center gap-2">
          <FaRobot size={28} className="text-primary" />
          <h2 className="fw-bold mb-0">AI Travel Assistant</h2>
        </div>
        {pairs.length > 0 && (
          <button
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
            onClick={handleClearHistory}
          >
            <FaTrash size={12} /> Clear history
          </button>
        )}
      </div>
      <p className="text-muted mb-4">
        Search the community's travel knowledge — each question is answered
        independently using real travel posts.
      </p>

      {/* Search / ask form */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="d-flex gap-2 align-items-start">
          <div className="flex-grow-1">
            <textarea
              className={`form-control ${validationError ? "is-invalid" : ""}`}
              rows={2}
              placeholder="Ask about a destination, activity, or travel tip… (Enter to ask)"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              maxLength={MAX_QUESTION_LENGTH + 10}
            />
            {validationError ? (
              <div className="invalid-feedback">{validationError}</div>
            ) : (
              <div className="form-text text-end">
                {question.trim().length}/{MAX_QUESTION_LENGTH}
              </div>
            )}
          </div>
          <button
            type="submit"
            className="btn btn-primary d-flex align-items-center gap-2 flex-shrink-0"
            disabled={!canSubmit}
          >
            {isLoading ? (
              <span
                className="spinner-border spinner-border-sm"
                role="status"
              />
            ) : (
              <FaSearch />
            )}
            Ask
          </button>
        </div>
      </form>

      {/* Error banner */}
      {error && (
        <div className="alert alert-danger py-2 small mb-3" role="alert">
          {error}
        </div>
      )}

      {/* Loading skeleton for the incoming answer */}
      {isLoading && (
        <div className="card border-0 shadow-sm mb-3 placeholder-glow">
          <div className="card-body">
            <p className="placeholder col-8 mb-2" />
            <p className="placeholder col-12 mb-1" />
            <p className="placeholder col-10 mb-1" />
            <p className="placeholder col-6" />
          </div>
        </div>
      )}

      {/* Q&A result cards — newest first */}
      {pairs.length === 0 && !isLoading ? (
        <div className="text-center text-muted py-5">
          <FaRobot size={48} className="mb-3 opacity-25" />
          <p className="fw-semibold mb-1">No questions yet</p>
          <p className="small">
            Ask anything about travel and I'll search our community posts for
            answers.
          </p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {pairs.map((pair, idx) => (
            <div
              key={idx}
              ref={idx === 0 ? latestRef : undefined}
              className="card border-0 shadow-sm"
            >
              {/* Question bar */}
              <div className="card-header bg-primary bg-opacity-10 border-0 d-flex justify-content-between align-items-start gap-2">
                <div className="d-flex align-items-start gap-2">
                  <FaSearch className="text-primary mt-1 flex-shrink-0" />
                  <span className="fw-semibold text-primary">
                    {pair.question}
                  </span>
                </div>
                <span className="text-muted small flex-shrink-0">
                  {formatTime(pair.timestamp)}
                </span>
              </div>

              {/* Answer body */}
              <div className="card-body">
                <div className="d-flex gap-2 mb-3">
                  <div
                    className="rounded-circle bg-secondary d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 28, height: 28 }}
                  >
                    <FaRobot size={13} className="text-white" />
                  </div>
                  <div className="small text-dark flex-grow-1">
                    {renderMarkdown(pair.answer)}
                  </div>
                </div>

                {/* Sources */}
                {pair.sources.length > 0 && (
                  <div className="border-top pt-2 mt-1">
                    <span className="text-muted small fw-semibold me-2">
                      Sources:
                    </span>
                    {pair.sources.map((src) => (
                      <Link
                        key={src.postId}
                        to={`/post/${src.postId}`}
                        className="badge text-bg-light border text-decoration-none me-1 text-truncate"
                        style={{ maxWidth: 220 }}
                        title={src.title}
                      >
                        📖 {src.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AiAssistantPage;
