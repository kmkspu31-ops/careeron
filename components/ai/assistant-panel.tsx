"use client";

import {
  ArrowUp,
  Bot,
  BriefcaseBusiness,
  Check,
  Copy,
  FileText,
  Menu,
  MessageSquareText,
  Mic2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { AiConversation, AiExpertMode, AiMessage, AiMode } from "@/lib/ai/types";

const historyKey = "careeron-ai-conversations";
const consentKey = "careeron-ai-save-history";

const modeOptions: Array<{ id: AiMode; label: string; icon: typeof Sparkles }> = [
  { id: "auto", label: "자동 상담", icon: Sparkles },
  { id: "career", label: "진로 상담", icon: UserRound },
  { id: "resume", label: "자기소개서", icon: FileText },
  { id: "interview", label: "면접 연습", icon: Mic2 },
  { id: "job-analysis", label: "공고 분석", icon: BriefcaseBusiness },
  { id: "certification", label: "자격증 추천", icon: Check },
  { id: "roadmap", label: "취업 로드맵", icon: MessageSquareText },
];

const expertModeLabels: Record<AiExpertMode, string> = {
  general: "일반 상담",
  career: "진로 상담",
  resume: "자기소개서",
  interview: "면접 연습",
  "job-analysis": "공고 분석",
  certification: "자격증 추천",
  roadmap: "취업 로드맵",
};

const suggestedQuestions = [
  "관심 있는 분야와 맞는 직업을 비교해줘",
  "이 자기소개서 문장을 더 명확하게 다듬어줘",
  "전기 분야 취업에 필요한 자격증을 알려줘",
];

type ServerEvent =
  | { type: "meta"; mode: AiExpertMode }
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

function isServerEvent(value: unknown): value is ServerEvent {
  if (!value || typeof value !== "object" || !("type" in value)) return false;
  const event = value as Record<string, unknown>;
  if (event.type === "delta") return typeof event.text === "string";
  if (event.type === "error") return typeof event.message === "string";
  if (event.type === "done") return true;
  return event.type === "meta" && typeof event.mode === "string" && event.mode in expertModeLabels;
}

function isStoredConversation(value: unknown): value is AiConversation {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const conversation = value as Record<string, unknown>;
  if (
    typeof conversation.id !== "string" ||
    typeof conversation.title !== "string" ||
    typeof conversation.mode !== "string" ||
    !modeOptions.some((option) => option.id === conversation.mode) ||
    typeof conversation.updatedAt !== "number" ||
    !Array.isArray(conversation.messages)
  ) return false;

  return conversation.messages.every((item: unknown) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const message = item as Record<string, unknown>;
    return (
      typeof message.id === "string" &&
      (message.role === "user" || message.role === "assistant") &&
      typeof message.content === "string" &&
      (message.mode === undefined || (typeof message.mode === "string" && message.mode in expertModeLabels))
    );
  });
}

function newConversation(mode: AiMode): AiConversation {
  return {
    id: crypto.randomUUID(),
    title: "새 대화",
    mode,
    messages: [],
    updatedAt: Date.now(),
  };
}

export function AssistantPanel({ mode: initialMode }: { mode: "career" | "employment" }) {
  const initialModeSelection: AiMode = initialMode === "employment" ? "resume" : "career";
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<AiMode>(initialModeSelection);
  const [draft, setDraft] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saveHistory, setSaveHistory] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const activeConversation = conversations.find((conversation) => conversation.id === activeId);

  const filteredConversations = useMemo(() => {
    const query = historySearch.trim().toLocaleLowerCase();
    if (!query) return conversations;
    return conversations.filter((conversation) =>
      `${conversation.title} ${conversation.messages.map((message) => message.content).join(" ")}`
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [conversations, historySearch]);

  useEffect(() => {
    try {
      const optedIn = localStorage.getItem(consentKey) === "true";
      setSaveHistory(optedIn);
      if (optedIn) {
        const saved = localStorage.getItem(historyKey);
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          if (Array.isArray(parsed)) setConversations(parsed.filter(isStoredConversation));
        }
      }
    } catch {
      setNotice("이 브라우저에서 대화 저장 상태를 확인하지 못했습니다. 저장 설정을 다시 확인해 주세요.");
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      localStorage.setItem(consentKey, String(saveHistory));
      if (saveHistory) localStorage.setItem(historyKey, JSON.stringify(conversations));
      else localStorage.removeItem(historyKey);
    } catch {
      setNotice("브라우저 저장 공간에 대화를 저장하지 못했습니다.");
    }
  }, [conversations, saveHistory, storageReady]);

  useEffect(() => () => abortRef.current?.abort(), []);

  function updateConversation(id: string, update: (conversation: AiConversation) => AiConversation) {
    setConversations((current) => current.map((conversation) => conversation.id === id ? update(conversation) : conversation));
  }

  function startNewConversation() {
    if (busy) return;
    const conversation = newConversation(initialModeSelection);
    setConversations((current) => [conversation, ...current]);
    setActiveId(conversation.id);
    setMode(initialModeSelection);
    setError("");
    setNotice("");
    setDraft("");
    setMobileHistoryOpen(false);
  }

  function selectConversation(conversation: AiConversation) {
    if (busy) return;
    setActiveId(conversation.id);
    setMode(conversation.mode);
    setError("");
    setMobileHistoryOpen(false);
  }

  function selectMode(nextMode: AiMode) {
    setMode(nextMode);
    if (activeId) {
      updateConversation(activeId, (conversation) => ({ ...conversation, mode: nextMode, updatedAt: Date.now() }));
    }
  }

  async function sendMessage(text: string, regenerate = false) {
    const current = conversations.find((conversation) => conversation.id === activeId);
    const lastUserIndex = current?.messages.map((message) => message.role).lastIndexOf("user") ?? -1;
    const content = regenerate
      ? current?.messages[lastUserIndex]?.content.trim() ?? ""
      : text.trim();
    if (!content || busy) return;

    const conversation = current ?? newConversation(mode);
    const assistantId = crypto.randomUUID();
    let history = conversation.messages;
    let nextMessages: AiMessage[];

    if (regenerate) {
      if (lastUserIndex < 0) return;
      history = history.slice(0, lastUserIndex);
      nextMessages = [
        ...conversation.messages.slice(0, lastUserIndex + 1),
        { id: assistantId, role: "assistant", content: "" },
      ];
    } else {
      nextMessages = [
        ...history,
        { id: crypto.randomUUID(), role: "user", content },
        { id: assistantId, role: "assistant", content: "" },
      ];
    }

    const conversationId = conversation.id;
    const selectedMode = conversation.mode;
    const title = conversation.messages.length === 0 && !regenerate
      ? content.slice(0, 42)
      : conversation.title;
    const updatedConversation: AiConversation = {
      ...conversation,
      title,
      mode: selectedMode,
      messages: nextMessages,
      updatedAt: Date.now(),
    };
    setConversations((currentConversations) => [
      updatedConversation,
      ...currentConversations.filter((item) => item.id !== conversationId),
    ]);
    setActiveId(conversationId);
    setDraft("");
    setError("");
    setNotice("");
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: selectedMode,
          message: content,
          history: history.slice(-20).reverse().reduce<Array<{ role: "user" | "assistant"; content: string }>>((recent, message) => {
            const previousLength = recent.reduce((total, item) => total + item.content.length, 0);
            if (previousLength + message.content.length > 24_000) return recent;
            recent.unshift({ role: message.role, content: message.content });
            return recent;
          }, []),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : "AI 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
        throw new Error(message);
      }
      if (!response.body) throw new Error("AI 스트리밍 응답을 읽을 수 없습니다.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamError = "";
      let finished = false;

      function handleFrame(frame: string) {
        const dataLine = frame.split(/\r?\n/).find((line) => line.startsWith("data: "));
        if (!dataLine) return;
        const eventValue: unknown = JSON.parse(dataLine.slice(6));
        if (!isServerEvent(eventValue)) return;
        if (eventValue.type === "delta") {
          updateConversation(conversationId, (item) => ({
            ...item,
            messages: item.messages.map((message) =>
              message.id === assistantId ? { ...message, content: message.content + eventValue.text } : message,
            ),
          }));
        } else if (eventValue.type === "meta") {
          updateConversation(conversationId, (item) => ({
            ...item,
            messages: item.messages.map((message) =>
              message.id === assistantId ? { ...message, mode: eventValue.mode } : message,
            ),
          }));
        } else if (eventValue.type === "error") {
          streamError = eventValue.message;
        } else if (eventValue.type === "done") {
          finished = true;
        }
      }

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        let separator = buffer.indexOf("\n\n");
        while (separator >= 0) {
          handleFrame(buffer.slice(0, separator));
          buffer = buffer.slice(separator + 2);
          separator = buffer.indexOf("\n\n");
        }
        if (done) break;
      }

      if (buffer.trim()) handleFrame(buffer);
      if (streamError) throw new Error(streamError);
      if (!finished) throw new Error("AI 응답 연결이 예기치 않게 종료됐습니다. 다시 시도해 주세요.");
    } catch (requestError) {
      if (requestError instanceof Error && requestError.name === "AbortError") return;
      setError(requestError instanceof Error ? requestError.message : "AI 요청 중 오류가 발생했습니다.");
      updateConversation(conversationId, (item) => ({
        ...item,
        messages: item.messages.filter((message) => message.id !== assistantId || message.content.length > 0),
      }));
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(draft);
  }

  async function copyMessage(message: string) {
    try {
      await navigator.clipboard.writeText(message);
      setNotice("답변을 복사했습니다.");
    } catch {
      setNotice("클립보드에 복사하지 못했습니다. 브라우저 권한을 확인해 주세요.");
    }
  }

  function renameConversation(conversation: AiConversation) {
    const title = window.prompt("대화 제목을 입력하세요.", conversation.title)?.trim();
    if (!title) return;
    updateConversation(conversation.id, (item) => ({ ...item, title: title.slice(0, 80), updatedAt: Date.now() }));
  }

  function deleteConversation(conversation: AiConversation) {
    if (!window.confirm(`"${conversation.title}" 대화를 삭제할까요?`)) return;
    setConversations((current) => current.filter((item) => item.id !== conversation.id));
    if (activeId === conversation.id) {
      setActiveId(null);
      setMode(initialModeSelection);
    }
  }

  function renderHistory() {
    return (
      <>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold">대화 기록</p>
          <button type="button" onClick={startNewConversation} disabled={busy} className="inline-flex h-8 items-center gap-1 rounded-lg bg-blue-600 px-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            <Plus size={14} /> 새 대화
          </button>
        </div>
        <label className="mt-3 flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] px-2.5 text-muted">
          <Search size={14} />
          <input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} aria-label="대화 검색" placeholder="대화 검색" className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted" />
        </label>
        <div className="mt-3 flex-1 space-y-1 overflow-y-auto">
          {filteredConversations.map((conversation) => (
            <div key={conversation.id} className={`group flex items-center rounded-lg ${activeId === conversation.id ? "bg-blue-50 text-blue-800 dark:bg-blue-500/10 dark:text-blue-200" : "hover:bg-[var(--surface-subtle)]"}`}>
              <button type="button" disabled={busy} onClick={() => selectConversation(conversation)} className="min-w-0 flex-1 truncate px-3 py-2 text-left text-xs disabled:opacity-50">
                {conversation.title}
              </button>
              <button type="button" disabled={busy} onClick={() => renameConversation(conversation)} aria-label={`${conversation.title} 이름 변경`} className="hidden p-1.5 text-muted hover:text-blue-600 group-hover:inline-flex">⋯</button>
              <button type="button" disabled={busy} onClick={() => deleteConversation(conversation)} aria-label={`${conversation.title} 삭제`} className="hidden p-1.5 pr-2 text-muted hover:text-red-600 group-hover:inline-flex"><Trash2 size={13} /></button>
            </div>
          ))}
          {filteredConversations.length === 0 && <p className="px-2 py-4 text-xs text-muted">{conversations.length ? "검색 결과가 없습니다." : "아직 대화가 없습니다."}</p>}
        </div>
        <label className="mt-3 flex items-start gap-2 border-t border-[var(--border)] pt-3 text-[11px] leading-5 text-muted">
          <input type="checkbox" checked={saveHistory} onChange={(event) => {
            setSaveHistory(event.target.checked);
            setNotice(event.target.checked
              ? "이 기기에 대화 저장을 켰습니다."
              : "이 기기에 저장된 CAREERON AI 대화를 삭제했습니다.");
          }} className="mt-1 accent-blue-600" />
          <span>이 기기에 대화 저장<br />끄면 저장된 대화도 삭제됩니다.</span>
        </label>
      </>
    );
  }

  const messages = activeConversation?.messages ?? [];
  const currentModeLabel = modeOptions.find((option) => option.id === mode)?.label ?? "자동 상담";

  return (
    <div className="grid gap-4 lg:grid-cols-[252px_minmax(0,1fr)]">
      <aside className="app-surface hidden min-h-[690px] flex-col rounded-2xl p-3 lg:flex">
        {renderHistory()}
        <a href="/ai/employment" className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-muted hover:bg-[var(--surface-subtle)]">
          <Sparkles size={14} /> 취업 준비 체크리스트
        </a>
      </aside>

      {mobileHistoryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 lg:hidden" onMouseDown={() => setMobileHistoryOpen(false)}>
          <aside className="app-surface flex h-full w-[min(86vw,340px)] flex-col rounded-r-2xl p-4 shadow-xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="mb-4 flex justify-end"><button type="button" onClick={() => setMobileHistoryOpen(false)} aria-label="대화 기록 닫기"><X size={20} /></button></div>
            {renderHistory()}
          </aside>
        </div>
      )}

      <section className="app-surface flex h-[calc(100dvh-300px)] min-h-[420px] min-w-0 flex-col overflow-hidden rounded-2xl lg:h-[calc(100vh-216px)] lg:min-h-[690px]">
        <header className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-5">
          <button type="button" onClick={() => setMobileHistoryOpen(true)} aria-label="대화 기록 열기" className="rounded-lg p-2 text-muted hover:bg-[var(--surface-subtle)] lg:hidden"><Menu size={18} /></button>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"><Bot size={19} /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{activeConversation?.title ?? "CAREERON AI"}</p>
            <p className="text-[11px] text-muted">{currentModeLabel} · {busy ? "답변 작성 중" : "AI 연결 상태는 요청 시 확인"}</p>
          </div>
          <button type="button" onClick={startNewConversation} disabled={busy} aria-label="새 대화" className="rounded-lg p-2 text-muted hover:bg-[var(--surface-subtle)] disabled:opacity-50"><Plus size={18} /></button>
        </header>

        <div className="border-b border-[var(--border)] px-3 py-3 sm:px-5">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {modeOptions.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" onClick={() => selectMode(id)} aria-pressed={mode === id} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition ${mode === id ? "border-blue-600 bg-blue-600 text-white" : "border-[var(--border)] text-muted hover:border-blue-300 hover:text-blue-600"}`}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>
          {(mode === "job-analysis" || mode === "certification") && (
            <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300">
              실제 채용·공식 자격 데이터 검색은 아직 연결되지 않았습니다. 분석할 공고나 공식 자료를 함께 입력해 주세요.
            </p>
          )}
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
          {messages.length === 0 && (
            <div className="mx-auto max-w-xl py-6 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"><Sparkles size={23} /></span>
              <h2 className="mt-4 text-lg font-bold">진로와 취업 준비, 함께 시작해요</h2>
              <p className="mt-2 text-sm text-muted">AI 연결 설정 후 전문 기능을 선택하거나 질문을 입력하면 알맞은 상담을 받을 수 있어요.</p>
              <div className="mt-5 grid gap-2 sm:grid-cols-1">
                {suggestedQuestions.map((question) => (
                  <button key={question} type="button" onClick={() => void sendMessage(question)} disabled={busy} className="rounded-xl border border-[var(--border)] px-4 py-3 text-left text-xs text-muted transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-50">
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <article key={message.id} className={`flex gap-2.5 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${message.role === "assistant" ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                {message.role === "assistant" ? <Bot size={16} /> : <UserRound size={16} />}
              </span>
              <div className={`max-w-[88%] min-w-0 rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "assistant" ? "bg-[var(--surface-subtle)]" : "bg-blue-600 text-white"}`}>
                {message.role === "assistant" && message.mode && <p className="mb-1 text-[10px] font-semibold text-blue-700 dark:text-blue-300">{expertModeLabels[message.mode]}</p>}
                <p className="whitespace-pre-wrap break-words">{message.content || (busy && index === messages.length - 1 ? "답변을 작성하고 있어요…" : "")}</p>
                {message.role === "assistant" && message.content && index === messages.length - 1 && !busy && (
                  <div className="mt-2 flex gap-2 border-t border-[var(--border)] pt-2">
                    <button type="button" onClick={() => void copyMessage(message.content)} aria-label="답변 복사" className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-blue-600"><Copy size={12} /> 복사</button>
                    <button type="button" onClick={() => void sendMessage("", true)} disabled={busy} className="text-[11px] text-muted hover:text-blue-600">다시 생성</button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>

        {(error || notice) && (
          <p role={error ? "alert" : "status"} className={`mx-4 mb-2 rounded-lg px-3 py-2 text-xs ${error ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300" : "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"}`}>
            {error || notice}
            {error && <button type="button" onClick={() => setError("")} aria-label="오류 메시지 닫기" className="float-right"><X size={14} /></button>}
          </p>
        )}

        <form onSubmit={submit} className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)] p-3 sm:px-4">
          <div className="flex items-end gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 focus-within:border-blue-500">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage(draft);
                }
              }}
              maxLength={6_000}
              rows={1}
              disabled={busy}
              aria-label="상담 질문 입력"
              placeholder="궁금한 내용을 입력해보세요"
              className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted disabled:opacity-60"
            />
            <button type="submit" disabled={!draft.trim() || busy} aria-label="메시지 전송" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">
              <ArrowUp size={18} />
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] leading-4 text-muted">
            질문과 대화 맥락은 답변 생성을 위해 OpenAI로 전송됩니다. 대화는 CAREERON 서버에 저장되지 않으며, 저장을 켜면 이 브라우저에만 보관됩니다. AI 답변은 참고용이며 최신 공식 자료 검색은 아직 연결되지 않았습니다.
          </p>
        </form>
      </section>
    </div>
  );
}
