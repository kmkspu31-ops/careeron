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
  | { type: "saving" }
  | { type: "done" }
  | { type: "error"; message: string };

function isServerEvent(value: unknown): value is ServerEvent {
  if (!value || typeof value !== "object" || !("type" in value)) return false;
  const event = value as Record<string, unknown>;
  if (event.type === "delta") return typeof event.text === "string";
  if (event.type === "error") return typeof event.message === "string";
  if (event.type === "done" || event.type === "saving") return true;
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
      (message.status === undefined || message.status === "streaming" || message.status === "completed" || message.status === "failed") &&
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
  const [requestStatus, setRequestStatus] = useState<"idle" | "waiting" | "streaming" | "saving" | "saved" | "failed">("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saveHistory, setSaveHistory] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [authStatus, setAuthStatus] = useState<"loading" | "guest" | "member" | "unavailable">("loading");
  const [guestConversations, setGuestConversations] = useState<AiConversation[]>([]);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
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

  const activeMessages = activeConversation?.messages ?? [];
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: busy ? "auto" : "smooth", block: "end" });
  }, [activeMessages, busy]);

  useEffect(() => {
    let localConversations: AiConversation[] = [];
    try {
      const optedIn = localStorage.getItem(consentKey) === "true";
      setSaveHistory(optedIn);
      if (optedIn) {
        const saved = localStorage.getItem(historyKey);
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          if (Array.isArray(parsed)) localConversations = parsed.filter(isStoredConversation);
        }
      }
      setGuestConversations(localConversations);
      setConversations(localConversations);
    } catch {
      setNotice("이 브라우저에서 대화 저장 상태를 확인하지 못했습니다. 저장 설정을 다시 확인해 주세요.");
    } finally {
      setStorageReady(true);
    }

    void fetch("/api/ai/conversations", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("대화 목록을 불러오지 못했습니다.");
        const payload: unknown = await response.json();
        if (!payload || typeof payload !== "object" || !("authenticated" in payload) || !("conversations" in payload)) {
          throw new Error("대화 목록 응답을 처리하지 못했습니다.");
        }
        const result = payload as { authenticated: unknown; conversations: unknown };
        if (result.authenticated === true && Array.isArray(result.conversations)) {
          setAuthStatus("member");
          setConversations(result.conversations.filter(isStoredConversation));
          if (localConversations.length) setNotice("이 기기의 비회원 대화는 자동으로 계정에 올리지 않았습니다. 대화 기록에서 직접 가져오기를 선택할 수 있습니다.");
        } else {
          setAuthStatus("guest");
        }
      })
      .catch(() => {
        setAuthStatus("unavailable");
        setNotice("서버 대화 기록을 확인하지 못했습니다. 기존 브라우저 대화는 이 기기에 유지됩니다.");
      });
  }, []);

  useEffect(() => {
    if (!storageReady || authStatus === "loading" || authStatus === "unavailable") return;
    try {
      localStorage.setItem(consentKey, String(saveHistory));
      if (saveHistory) localStorage.setItem(historyKey, JSON.stringify(guestConversations));
      else localStorage.removeItem(historyKey);
    } catch {
      setNotice("브라우저 저장 공간에 대화를 저장하지 못했습니다.");
    }
  }, [authStatus, guestConversations, saveHistory, storageReady]);

  useEffect(() => () => abortRef.current?.abort(), []);

  function updateConversation(id: string, update: (conversation: AiConversation) => AiConversation) {
    setConversations((current) => current.map((conversation) => conversation.id === id ? update(conversation) : conversation));
    if (authStatus !== "member") {
      setGuestConversations((current) => current.map((conversation) => conversation.id === id ? update(conversation) : conversation));
    }
  }

  function startNewConversation() {
    if (busy) return;
    const conversation = newConversation(initialModeSelection);
    setConversations((current) => [conversation, ...current]);
    if (authStatus !== "member") setGuestConversations((current) => [conversation, ...current]);
    setActiveId(conversation.id);
    setMode(initialModeSelection);
    setError("");
    setNotice("");
    setRequestStatus("idle");
    setDraft("");
    setMobileHistoryOpen(false);
  }

  function selectConversation(conversation: AiConversation) {
    if (busy) return;
    setActiveId(conversation.id);
    setMode(conversation.mode);
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    setRequestStatus(lastMessage?.role === "assistant" && lastMessage.status === "failed"
      ? "failed"
      : lastMessage?.role === "assistant" ? "saved" : "idle");
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
    const userMessageId = regenerate ? current?.messages[lastUserIndex]?.id : crypto.randomUUID();
    const requestId = crypto.randomUUID();
    let history = conversation.messages;
    let nextMessages: AiMessage[];

    if (regenerate) {
      if (lastUserIndex < 0) return;
      history = history.slice(0, lastUserIndex);
      nextMessages = [
        ...conversation.messages.slice(0, lastUserIndex + 1),
        { id: assistantId, role: "assistant", content: "", status: "streaming" },
      ];
    } else {
      nextMessages = [
        ...history,
        { id: userMessageId ?? crypto.randomUUID(), role: "user", content, status: "completed" },
        { id: assistantId, role: "assistant", content: "", status: "streaming" },
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
    if (authStatus !== "member") {
      setGuestConversations((currentConversations) => [
        updatedConversation,
        ...currentConversations.filter((item) => item.id !== conversationId),
      ]);
    }
    setActiveId(conversationId);
    setDraft("");
    setError("");
    setNotice("");
    setBusy(true);
    setRequestStatus("waiting");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: selectedMode,
          message: content,
          conversationId,
          requestId,
          userMessageId,
          assistantMessageId: assistantId,
          regenerate,
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

      setRequestStatus("streaming");
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
              message.id === assistantId ? { ...message, content: message.content + eventValue.text, status: "streaming" } : message,
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
          setRequestStatus("failed");
          updateConversation(conversationId, (item) => ({
            ...item,
            messages: item.messages.map((message) => message.id === assistantId ? { ...message, status: "failed" } : message),
          }));
        } else if (eventValue.type === "saving") {
          setRequestStatus("saving");
        } else if (eventValue.type === "done") {
          finished = true;
          setRequestStatus("saved");
          updateConversation(conversationId, (item) => ({
            ...item,
            messages: item.messages.map((message) => message.id === assistantId ? { ...message, status: "completed" } : message),
          }));
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
      if (requestError instanceof Error && requestError.name === "AbortError") {
        setRequestStatus("failed");
        updateConversation(conversationId, (item) => ({
          ...item,
          messages: item.messages.map((message) => message.id === assistantId ? { ...message, status: "failed" } : message),
        }));
        return;
      }
      setRequestStatus("failed");
      setError(requestError instanceof Error ? requestError.message : "AI 요청 중 오류가 발생했습니다.");
      updateConversation(conversationId, (item) => ({
        ...item,
        messages: item.messages
          .filter((message) => message.id !== assistantId || message.content.length > 0)
          .map((message) => message.id === assistantId ? { ...message, status: "failed" } : message),
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

  async function renameConversation(conversation: AiConversation) {
    const title = window.prompt("대화 제목을 입력하세요.", conversation.title)?.trim();
    if (!title) return;
    if (authStatus === "member") {
      try {
        const response = await fetch("/api/ai/conversations", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: conversation.id, title: title.slice(0, 80) }),
        });
        if (!response.ok) {
          setNotice("대화 제목을 서버에 저장하지 못했습니다.");
          return;
        }
      } catch {
        setNotice("대화 제목을 서버에 저장하지 못했습니다.");
        return;
      }
    }
    updateConversation(conversation.id, (item) => ({ ...item, title: title.slice(0, 80), updatedAt: Date.now() }));
  }

  function deleteConversation(conversation: AiConversation) {
    if (!window.confirm(`"${conversation.title}" 대화를 삭제할까요?`)) return;
    const remove = () => {
      setConversations((current) => current.filter((item) => item.id !== conversation.id));
      setGuestConversations((current) => current.filter((item) => item.id !== conversation.id));
      if (activeId === conversation.id) {
        setActiveId(null);
        setMode(initialModeSelection);
      }
    };
    if (authStatus !== "member") {
      remove();
      return;
    }
    void fetch("/api/ai/conversations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: conversation.id }),
    }).then((response) => {
      if (response.ok) remove();
      else setNotice("대화를 서버에서 삭제하지 못했습니다.");
    }).catch(() => setNotice("대화를 서버에서 삭제하지 못했습니다."));
  }

  async function importGuestConversations() {
    if (authStatus !== "member" || guestConversations.length === 0) return;
    if (!window.confirm("이 기기에 저장된 대화를 계정으로 가져올까요? 가져온 뒤에도 기기 내 기록은 유지됩니다.")) return;
    try {
      const response = await fetch("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversations: guestConversations }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : "대화를 가져오지 못했습니다.";
        setNotice(message);
        return;
      }
      if (payload && typeof payload === "object" && "conversations" in payload && Array.isArray(payload.conversations)) {
        const imported = payload.conversations.filter(isStoredConversation);
        setConversations((current) => [
          ...imported.filter((item) => !current.some((existing) => existing.id === item.id)),
          ...current,
        ]);
      }
      const importedCount = payload && typeof payload === "object" && "conversations" in payload && Array.isArray(payload.conversations)
        ? payload.conversations.length
        : 0;
      setNotice(importedCount ? `${importedCount}개 대화를 계정에 가져왔습니다.` : "가져올 새 대화가 없습니다. 이미 계정에 있는 기록일 수 있습니다.");
    } catch {
      setNotice("대화를 가져오지 못했습니다. 연결 상태를 확인해 주세요.");
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
        {authStatus === "member" && guestConversations.length > 0 && (
          <button type="button" onClick={() => void importGuestConversations()} className="mt-2 rounded-lg border border-blue-200 px-3 py-2 text-left text-xs font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-500/30 dark:text-blue-300 dark:hover:bg-blue-500/10">
            이 기기 대화 {guestConversations.length}개 가져오기
          </button>
        )}
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
              <button type="button" disabled={busy} onClick={() => void renameConversation(conversation)} aria-label={`${conversation.title} 이름 변경`} className="hidden p-1.5 text-muted hover:text-blue-600 group-hover:inline-flex">⋯</button>
              <button type="button" disabled={busy} onClick={() => deleteConversation(conversation)} aria-label={`${conversation.title} 삭제`} className="hidden p-1.5 pr-2 text-muted hover:text-red-600 group-hover:inline-flex"><Trash2 size={13} /></button>
            </div>
          ))}
          {filteredConversations.length === 0 && <p className="px-2 py-4 text-xs text-muted">{conversations.length ? "검색 결과가 없습니다." : "아직 대화가 없습니다."}</p>}
        </div>
        <label className="mt-3 flex items-start gap-2 border-t border-[var(--border)] pt-3 text-[11px] leading-5 text-muted">
          <input type="checkbox" checked={saveHistory} onChange={(event) => {
            setSaveHistory(event.target.checked);
            if (!event.target.checked) setGuestConversations([]);
            setNotice(event.target.checked
              ? "이 기기에 대화 저장을 켰습니다."
              : "이 기기에 저장된 CAREERON AI 대화를 삭제했습니다.");
          }} className="mt-1 accent-blue-600" />
          <span>{authStatus === "member" ? "비회원 기록 보관" : "이 기기에 대화 저장"}<br />끄면 기기에 저장된 비회원 기록도 삭제됩니다.</span>
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
            <p className="text-[11px] text-muted">{currentModeLabel} · {busy
              ? requestStatus === "waiting" ? "AI 응답 대기" : requestStatus === "saving" ? "대화 저장 중" : "답변 스트리밍 중"
              : requestStatus === "saved" ? authStatus === "member" ? "답변 완료 · 대화 저장 완료" : "답변 완료"
                : requestStatus === "failed" ? "답변 실패" : authStatus === "member" ? "회원 대화는 서버에 저장" : "비회원 대화는 저장 동의 시 브라우저에 저장"}</p>
            {authStatus === "guest" && <a href="/login" className="text-[10px] font-medium text-blue-700 hover:underline dark:text-blue-300">로그인하면 회원 대화를 동기화할 수 있습니다</a>}
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
                {message.status === "failed" && <p className="mt-2 text-[11px] text-red-600 dark:text-red-300">응답을 완료하지 못했습니다. 다시 생성해 주세요.</p>}
                {message.role === "assistant" && message.content && index === messages.length - 1 && !busy && (
                  <div className="mt-2 flex gap-2 border-t border-[var(--border)] pt-2">
                    <button type="button" onClick={() => void copyMessage(message.content)} aria-label="답변 복사" className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-blue-600"><Copy size={12} /> 복사</button>
                    <button type="button" onClick={() => void sendMessage("", true)} disabled={busy} className="text-[11px] text-muted hover:text-blue-600">다시 생성</button>
                  </div>
                )}
              </div>
            </article>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {(error || notice) && (
          <p role={error ? "alert" : "status"} className={`mx-4 mb-2 rounded-lg px-3 py-2 text-xs ${error ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300" : "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"}`}>
            {error || notice}
            {error && <button type="button" onClick={() => setError("")} aria-label="오류 메시지 닫기" className="float-right"><X size={14} /></button>}
          </p>
        )}

        <form onSubmit={submit} className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-4 lg:pb-3">
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
            질문과 대화 맥락은 답변 생성을 위해 OpenAI로 전송됩니다. 회원 대화는 계정 서버에, 비회원 대화는 저장 동의 시 이 브라우저에만 보관됩니다. AI 답변은 참고용이며 최신 공식 자료 검색은 연결되지 않았습니다.
          </p>
        </form>
      </section>
    </div>
  );
}
