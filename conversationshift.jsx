import { useState, useRef, useEffect } from "react";

const DATABRICKS_RED = "#FF3621";
const DARK_BG = "#0D0D0D";
const CARD_BG = "#141414";
const BORDER = "#2A2A2A";
const MUTED = "#666";
const TEXT = "#F0F0F0";
const TEXT_DIM = "#A0A0A0";

const DATA_STEPS = {
  D: { label: "Describe the Situation", color: "#FF3621", desc: "Factual context — what happened, when, where" },
  A1: { label: "Articulate the Behavior", color: "#FF6B00", desc: "Observable actions — what was seen or heard" },
  T: { label: "Talk Through Impact", color: "#FFB300", desc: "Business or team effect — data-driven where possible" },
  A2: { label: "Agree on Action", color: "#00C4B4", desc: "Forward-looking — clear next steps and ownership" },
};

const SITUATION_TYPES = [
  { id: "performance", label: "Performance Gap", icon: "📉" },
  { id: "behavior", label: "Behavioral Issue", icon: "⚡" },
  { id: "conflict", label: "Team Conflict", icon: "🔄" },
  { id: "missed", label: "Missed Commitment", icon: "📋" },
  { id: "attitude", label: "Attitude / Culture Fit", icon: "🧭" },
  { id: "other", label: "Other", icon: "💬" },
];

const systemPrompt = `You are Conversationshift, an expert manager coaching copilot built for Databricks — a fast-moving, data-driven, engineering-first company. You help managers navigate difficult conversations using the DATA framework:

D — Describe the situation (factual, observable context)
A — Articulate the behavior (specific, observable actions — not character judgments)  
T — Talk through impact (business/team effect, quantified where possible — keep this brief and factual, not emotional)
A — Agree on action (forward-looking, clear next steps with ownership)

Your users are predominantly analytical, direct, results-oriented managers (many are strong T types on the MBTI spectrum). They value:
- Precision over warmth
- Facts over feelings
- Forward momentum over dwelling
- Brevity and clarity

Your tone: Direct, intelligent, efficient. Never preachy. Never over-emotional. Think "sharp HR partner who respects your time" not "therapist."

When asking clarifying questions: Ask ONE question at a time. Make it feel like a smart conversation, not a form.

When generating DATA talking points:
- Keep each section tight and usable
- Ground impact in business/team terms (velocity, quality, trust, delivery) not just feelings
- Make the "Agree on Action" section concrete — specific next steps, timeline, ownership
- Offer 2-3 alternative phrasings for sections the manager might want to soften or sharpen
- Always end with: "Would you like to refine any section, or explore how they might respond?"

When the manager wants to iterate:
- Respond to their specific request — don't regenerate everything
- Offer "what if they push back with X?" scenarios when relevant
- Help them stress-test the conversation before it happens

You are part of Databricks' AI-native talent development vision. You demonstrate what embedded, agentic, in-the-flow-of-work learning looks like in practice.`;

export default function Conversationshift() {
  const [phase, setPhase] = useState("landing"); // landing | situation | chat
  const [situationType, setSituationType] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [dataOutput, setDataOutput] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const startConversation = async (type) => {
    setSituationType(type);
    setPhase("chat");
    const opener = {
      role: "assistant",
      content: `Got it — you're dealing with a **${type.label}** situation.\n\nLet's build your DATA framework together so you walk into this conversation prepared and clear.\n\nFirst: **Who is this conversation with?** (role/level is enough — no names needed) And in one sentence, what happened?`,
    };
    setMessages([opener]);
  };

  const sendMessage = async (userText) => {
    if (!userText.trim() || loading) return;
    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const apiMessages = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const contextPrefix = `The manager is dealing with a "${situationType.label}" situation. `;
      const augmentedSystem = systemPrompt + "\n\n" + contextPrefix;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: augmentedSystem,
          messages: apiMessages,
        }),
      });

      const data = await response.json();
      const assistantText = data.content?.[0]?.text || "Something went wrong. Please try again.";

      // Check if this looks like a DATA framework output
      const hasDataFramework =
        assistantText.includes("Describe") ||
        assistantText.includes("Articulate") ||
        assistantText.includes("Talk Through") ||
        assistantText.includes("Agree on Action") ||
        (assistantText.includes("**D**") || assistantText.includes("**A**") || assistantText.includes("**T**"));

      if (hasDataFramework && !dataOutput) {
        setDataOutput(assistantText);
      }

      setMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Connection error. Please try again." },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const reset = () => {
    setPhase("landing");
    setSituationType(null);
    setMessages([]);
    setInput("");
    setDataOutput(null);
  };

  const renderMarkdown = (text) => {
    // Simple markdown-like rendering
    return text
      .split("\n")
      .map((line, i) => {
        if (line.startsWith("**") && line.endsWith("**")) {
          return <div key={i} style={{ fontWeight: 700, color: TEXT, marginTop: 8 }}>{line.replace(/\*\*/g, "")}</div>;
        }
        // Bold inline
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <div key={i} style={{ marginBottom: line === "" ? 8 : 2, lineHeight: 1.65 }}>
            {parts.map((part, j) =>
              j % 2 === 1 ? <strong key={j} style={{ color: TEXT, fontWeight: 600 }}>{part}</strong> : part
            )}
          </div>
        );
      });
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: DARK_BG,
      color: TEXT,
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }

        .situation-card {
          background: ${CARD_BG};
          border: 1px solid ${BORDER};
          border-radius: 8px;
          padding: 16px 20px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .situation-card:hover {
          border-color: ${DATABRICKS_RED};
          background: #1A1010;
          transform: translateY(-1px);
        }

        .send-btn {
          background: ${DATABRICKS_RED};
          border: none;
          border-radius: 6px;
          color: white;
          cursor: pointer;
          padding: 10px 16px;
          font-family: 'Space Mono', monospace;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.5px;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .send-btn:hover { background: #E02E18; transform: translateY(-1px); }
        .send-btn:disabled { background: #333; cursor: not-allowed; transform: none; }

        .chat-input {
          background: #1A1A1A;
          border: 1px solid ${BORDER};
          border-radius: 8px;
          color: ${TEXT};
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          outline: none;
          padding: 12px 16px;
          resize: none;
          width: 100%;
          transition: border-color 0.2s;
          line-height: 1.5;
        }
        .chat-input:focus { border-color: ${DATABRICKS_RED}44; }
        .chat-input::placeholder { color: ${MUTED}; }

        .data-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #1A1A1A;
          border: 1px solid ${BORDER};
          border-radius: 4px;
          padding: 3px 10px;
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.35s ease forwards; }

        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        .typing-dot {
          width: 5px; height: 5px;
          background: ${DATABRICKS_RED};
          border-radius: 50%;
          animation: pulse 1.2s ease infinite;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
      `}</style>

      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${BORDER}`,
        padding: "16px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#0A0A0A",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 32, height: 32,
            background: DATABRICKS_RED,
            borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Space Mono', monospace",
            fontWeight: 700, fontSize: 14,
          }}>C</div>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 15, letterSpacing: 1 }}>
              CONVERSATIONSHIFT
            </div>
            <div style={{ color: MUTED, fontSize: 11, letterSpacing: 0.5 }}>
              Manager Copilot · DATA Framework
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {Object.entries(DATA_STEPS).map(([key, val]) => (
            <div key={key} className="data-pill" style={{ color: val.color, borderColor: val.color + "33" }}>
              <span style={{ color: val.color }}>●</span>
              {key.replace("1", "").replace("2", "")}
            </div>
          ))}
          {phase !== "landing" && (
            <button onClick={reset} style={{
              background: "transparent", border: `1px solid ${BORDER}`,
              borderRadius: 6, color: MUTED, cursor: "pointer",
              fontFamily: "'Space Mono', monospace", fontSize: 11,
              padding: "4px 12px", marginLeft: 8,
              transition: "all 0.2s",
            }}
              onMouseOver={e => e.target.style.color = TEXT}
              onMouseOut={e => e.target.style.color = MUTED}
            >↩ RESET</button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: 800, margin: "0 auto", width: "100%", padding: "0 24px" }}>

        {/* LANDING */}
        {phase === "landing" && (
          <div className="fade-up" style={{ padding: "48px 0" }}>
            <div style={{ marginBottom: 48 }}>
              <div style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11, letterSpacing: 3,
                color: DATABRICKS_RED, marginBottom: 16,
                textTransform: "uppercase",
              }}>Difficult Conversation Prep</div>
              <h1 style={{
                fontSize: 38, fontWeight: 300, lineHeight: 1.2,
                letterSpacing: -0.5, marginBottom: 16,
              }}>
                Walk in prepared.<br />
                <span style={{ color: DATABRICKS_RED, fontWeight: 600 }}>Not just confident.</span>
              </h1>
              <p style={{ color: TEXT_DIM, fontSize: 16, lineHeight: 1.7, maxWidth: 520 }}>
                Conversationshift uses the DATA framework to help you build precise, 
                evidence-based talking points before a difficult conversation — 
                so you focus on outcomes, not anxiety.
              </p>
            </div>

            {/* DATA Framework Preview */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr",
              gap: 12, marginBottom: 48,
            }}>
              {Object.entries(DATA_STEPS).map(([key, val]) => (
                <div key={key} style={{
                  background: CARD_BG,
                  border: `1px solid ${BORDER}`,
                  borderLeft: `3px solid ${val.color}`,
                  borderRadius: 8,
                  padding: "14px 18px",
                }}>
                  <div style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 10, letterSpacing: 2,
                    color: val.color, marginBottom: 4,
                  }}>{key.replace("1", "").replace("2", "")} — {val.label}</div>
                  <div style={{ color: TEXT_DIM, fontSize: 13 }}>{val.desc}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11, letterSpacing: 2,
                color: MUTED, marginBottom: 16,
                textTransform: "uppercase",
              }}>What type of conversation?</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {SITUATION_TYPES.map((s) => (
                  <div key={s.id} className="situation-card" onClick={() => startConversation(s)}>
                    <span style={{ fontSize: 20 }}>{s.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              marginTop: 40, padding: "16px 20px",
              background: "#0F0F0F",
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: DATABRICKS_RED, flexShrink: 0,
              }} />
              <div style={{ color: MUTED, fontSize: 12, lineHeight: 1.6 }}>
                Built to demonstrate agentic, in-the-flow-of-work learning · Powered by <strong style={{ color: TEXT_DIM }}>Anthropic Claude</strong> · A proof of concept by Marie Manley
              </div>
            </div>
          </div>
        )}

        {/* CHAT */}
        {phase === "chat" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingTop: 24, paddingBottom: 24 }}>
            {/* Situation badge */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              marginBottom: 24, paddingBottom: 20,
              borderBottom: `1px solid ${BORDER}`,
            }}>
              <span style={{ fontSize: 18 }}>{situationType.icon}</span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: MUTED }}>
                {situationType.label.toUpperCase()}
              </span>
              <div style={{
                marginLeft: "auto", display: "flex", gap: 6,
              }}>
                {["D", "A", "T", "A"].map((letter, i) => (
                  <div key={i} style={{
                    width: 24, height: 24,
                    borderRadius: 4,
                    background: Object.values(DATA_STEPS)[i].color + "22",
                    border: `1px solid ${Object.values(DATA_STEPS)[i].color}44`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 10, fontWeight: 700,
                    color: Object.values(DATA_STEPS)[i].color,
                  }}>{letter}</div>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 20, marginBottom: 20 }}>
              {messages.map((msg, i) => (
                <div key={i} className="fade-up" style={{
                  display: "flex",
                  flexDirection: msg.role === "user" ? "row-reverse" : "row",
                  gap: 12, alignItems: "flex-start",
                }}>
                  {msg.role === "assistant" && (
                    <div style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: DATABRICKS_RED,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 11, fontWeight: 700,
                      flexShrink: 0, marginTop: 2,
                    }}>C</div>
                  )}
                  <div style={{
                    maxWidth: "78%",
                    background: msg.role === "user" ? "#1E1E1E" : CARD_BG,
                    border: `1px solid ${msg.role === "user" ? "#2A2A2A" : BORDER}`,
                    borderRadius: msg.role === "user" ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
                    padding: "14px 18px",
                    fontSize: 14,
                    color: msg.role === "user" ? TEXT_DIM : TEXT,
                    lineHeight: 1.65,
                  }}>
                    {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 6,
                    background: DATABRICKS_RED,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700,
                  }}>C</div>
                  <div style={{
                    background: CARD_BG, border: `1px solid ${BORDER}`,
                    borderRadius: "4px 12px 12px 12px",
                    padding: "14px 20px",
                    display: "flex", gap: 6, alignItems: "center",
                  }}>
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick actions */}
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              {[
                "Make the impact section more factual",
                "How might they push back?",
                "Make the action step more specific",
                "Soften the language slightly",
              ].map((action) => (
                <button key={action} onClick={() => sendMessage(action)} style={{
                  background: "transparent",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 20,
                  color: TEXT_DIM,
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  padding: "5px 12px",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
                  onMouseOver={e => { e.target.style.borderColor = DATABRICKS_RED + "66"; e.target.style.color = TEXT; }}
                  onMouseOut={e => { e.target.style.borderColor = BORDER; e.target.style.color = TEXT_DIM; }}
                >{action}</button>
              ))}
            </div>

            {/* Input */}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <textarea
                ref={inputRef}
                className="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your situation or ask to refine any section..."
                rows={2}
                style={{ flex: 1 }}
              />
              <button
                className="send-btn"
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim()}
              >
                SEND ↑
              </button>
            </div>
            <div style={{ color: MUTED, fontSize: 11, marginTop: 8, textAlign: "center" }}>
              Enter to send · Shift+Enter for new line · Ask to refine any part of your DATA talking points
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
