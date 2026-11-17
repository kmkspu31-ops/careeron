"use client";

import { Check, ClipboardList } from "lucide-react";
import { useState } from "react";
import { Surface, Tag } from "@/components/common/ui";

const checklistItems = ["관심 직무 3개 찾아보기", "이력서 기본 정보 정리하기", "프로젝트 경험 한 가지 기록하기", "관심 기업의 채용 요건 읽어보기"];

export function EmploymentTools() {
  const [checked, setChecked] = useState<string[]>([]);
  return (
    <Surface className="p-5 sm:p-6">
        <div className="flex items-start justify-between"><div><div className="flex items-center gap-2"><ClipboardList size={18} className="text-blue-600" /><h3 className="font-bold">취업 준비 체크리스트</h3></div><p className="mt-2 text-xs text-muted">작은 항목부터 하나씩 완료해보세요.</p></div><Tag tone="blue">{checked.length}/{checklistItems.length}</Tag></div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${checked.length / checklistItems.length * 100}%` }} /></div>
        <ul className="mt-4 space-y-1">{checklistItems.map((item) => { const done = checked.includes(item); return <li key={item}><button type="button" aria-pressed={done} onClick={() => setChecked((current) => done ? current.filter((value) => value !== item) : [...current, item])} className="flex w-full items-center gap-3 rounded-lg p-3 text-left text-sm transition hover:bg-[var(--surface-subtle)]"><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${done ? "border-blue-600 bg-blue-600 text-white" : "border-[var(--border)]"}`}>{done && <Check size={13} />}</span><span className={done ? "text-muted line-through" : ""}>{item}</span></button></li>; })}</ul>
        <p className="mt-3 text-[11px] text-muted">체크 상태는 현재 브라우저 화면에서만 유지됩니다.</p>
    </Surface>
  );
}
