import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { FaRobot, FaUser, FaPaperPlane, FaTrash } from "react-icons/fa";
import aiService from "../services/aiService";
import type { IAISource } from "../services/aiService";
import { useAuth } from "../context/AuthContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IMessage {
  role: "user" | "assistant";
  text: string;
  sources?: IAISource[];
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
  const storageKey = user ? `ai_chat_${user._id}` : null;

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<IMessage[]>(() => {
    if (!storageKey) return [];
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? (JSON.parse(saved) as IMessage[]) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  const handleClearChat = () => {
    setMessages([]);
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

    // Append user message immediately
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);

    setIsLoading(true);
    try {
      const result = await aiService.ask(trimmed);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: result.answer, sources: result.sources },
      ]);
      // Scroll to bottom after render
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        50,
      );
    } catch {
      setError("Failed to get a response. Please try again.");
      // Remove the user message if the request failed so the user can retry
      setMessages((prev) => prev.slice(0, -1));
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

  return (
    <div className="container py-4" style={{ maxWidth: 800 }}>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-1">
        <div className="d-flex align-items-center gap-2">
          <FaRobot size={28} className="text-primary" />
          <h2 className="fw-bold mb-0">AI Travel Assistant</h2>
        </div>
        {messages.length > 0 && (
          <button
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
            onClick={handleClearChat}
            title="Clear chat history"
          >
            <FaTrash size={12} /> Clear chat
          </button>
        )}
      </div>
      <p className="text-muted mb-4">
        Ask me anything about travel destinations — I'll answer based on the
        community's real travel stories.
      </p>

      {/* Chat window */}
      <div
        className="border rounded-3 bg-white shadow-sm mb-3"
        style={{ minHeight: 420, maxHeight: 560, overflowY: "auto" }}
      >
        {messages.length === 0 ? (
          <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted py-5">
            <FaRobot size={48} className="mb-3 opacity-25" />
            <p className="mb-1 fw-semibold">No messages yet</p>
            <p className="small">
              Ask about a destination and I'll search our travel posts for you.
            </p>
          </div>
        ) : (
          <div className="p-3 d-flex flex-column gap-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`d-flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div
                  className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${
                    msg.role === "user" ? "bg-primary" : "bg-secondary"
                  }`}
                  style={{ width: 36, height: 36 }}
                >
                  {msg.role === "user" ? (
                    <FaUser size={16} className="text-white" />
                  ) : (
                    <FaRobot size={16} className="text-white" />
                  )}
                </div>

                {/* Bubble */}
                <div style={{ maxWidth: "80%" }}>
                  <div
                    className={`rounded-3 px-3 py-2 ${
                      msg.role === "user"
                        ? "bg-primary text-white"
                        : "bg-light text-dark"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <p className="mb-0">{msg.text}</p>
                    ) : (
                      <div className="small">{renderMarkdown(msg.text)}</div>
                    )}
                  </div>

                  {/* Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2">
                      <p className="text-muted small mb-1 fw-semibold">
                        Sources:
                      </p>
                      <div className="d-flex flex-wrap gap-1">
                        {msg.sources.map((src) => (
                          <Link
                            key={src.postId}
                            to={`/post/${src.postId}`}
                            className="badge text-bg-light border text-decoration-none text-truncate"
                            style={{ maxWidth: 200 }}
                            title={src.title}
                          >
                            📖 {src.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading bubble */}
            {isLoading && (
              <div className="d-flex gap-2">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 bg-secondary"
                  style={{ width: 36, height: 36 }}
                >
                  <FaRobot size={16} className="text-white" />
                </div>
                <div className="bg-light rounded-3 px-3 py-2">
                  <div
                    className="d-flex gap-1 align-items-center"
                    style={{ height: 24 }}
                  >
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="rounded-circle bg-secondary"
                        style={{
                          width: 8,
                          height: 8,
                          display: "inline-block",
                          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="alert alert-danger py-2 small mb-2" role="alert">
          {error}
        </div>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit}>
        <div className="d-flex gap-2 align-items-end">
          <div className="flex-grow-1">
            <textarea
              className={`form-control ${validationError ? "is-invalid" : ""}`}
              rows={2}
              placeholder="Ask about a travel destination… (Enter to send, Shift+Enter for newline)"
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
            className="btn btn-primary"
            disabled={!canSubmit}
            style={{ height: 58 }}
            title="Send"
          >
            <FaPaperPlane />
          </button>
        </div>
      </form>

      {/* Bounce animation keyframes */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}

export default AiAssistantPage;
