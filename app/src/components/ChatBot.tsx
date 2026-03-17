"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCohort } from "@/contexts/CohortContext";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_ACTIONS = [
  { label: "의대 가려면 어떤 과목?", icon: "🏥" },
  { label: "문과인데 추천해줘", icon: "📚" },
  { label: "수능 과목 알려줘", icon: "📝" },
  { label: "3학년 과목 추천", icon: "🎓" },
];

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content:
    "안녕! 효자고 선택과목 상담 AI야. 진로에 맞는 과목 추천, 수능 정보, 대입 전략까지 도와줄 수 있어. 궁금한 거 편하게 물어봐!",
};

export default function ChatBot() {
  const { cohort, cohortLabel } = useCohort();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const sendMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          cohort,
        }),
      });

      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "미안, 지금 답변이 어려워. 잠시 후 다시 시도해줘!",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(input);
  };

  const handleQuickAction = (text: string) => {
    sendMessage(text);
  };

  const handleReset = () => {
    setMessages([INITIAL_MESSAGE]);
    setInput("");
  };

  // 빠른 질문 버튼 표시 여부: 초기 인사말만 있을 때
  const showQuickActions = messages.length === 1;

  const cohortShortLabel = cohort === "2025" ? "고2" : "고1";

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all active:scale-95",
          "bg-[var(--cta)] text-[var(--cta-foreground)]",
          "bottom-20 right-4 md:bottom-6 md:right-6"
        )}
        aria-label={isOpen ? "챗봇 닫기" : "AI 상담 챗봇 열기"}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </button>

      {/* Chat panel */}
      <div
        className={cn(
          "fixed z-50 flex flex-col overflow-hidden bg-card shadow-2xl transition-all duration-300",
          "bottom-0 left-0 right-0 h-[85dvh] rounded-t-2xl",
          "md:bottom-20 md:left-auto md:right-6 md:h-[540px] md:w-[400px] md:rounded-2xl",
          isOpen
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-full opacity-0 md:translate-y-4"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-[var(--primary)] px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-tight">
                효자고 선택과목 상담
              </span>
              <span className="text-[10px] leading-tight opacity-80">
                {cohortShortLabel} 기준
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleReset}
              className="rounded-full p-1.5 transition-colors hover:bg-white/20"
              aria-label="대화 초기화"
              title="대화 초기화"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1.5 transition-colors hover:bg-white/20"
              aria-label="챗봇 닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                  msg.role === "user"
                    ? "bg-[var(--primary)] text-white rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Quick action buttons */}
          {showQuickActions && !isLoading && (
            <div className="flex flex-wrap gap-2 pt-1">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleQuickAction(action.label)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 hover:text-[var(--primary)] active:scale-[0.97]"
                >
                  <span>{action.icon}</span>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-muted px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  생각하는 중...
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 border-t border-border px-3 py-2.5"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="궁금한 거 물어봐!"
            className="flex-1 rounded-full border border-border bg-muted/50 px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="h-10 w-10 shrink-0 rounded-full bg-[var(--primary)] hover:bg-[var(--primary)]/90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </>
  );
}
