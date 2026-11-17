"use client";

import { CalendarDays, Check, Clock3, Flame, Plus, Target } from "lucide-react";
import { useState } from "react";
import { PageHeading, SectionHeading, StatCard, Surface, Tag } from "@/components/common/ui";

const week = [
  { day: "월", date: 16, hours: 1.5 },
  { day: "화", date: 17, hours: 2 },
  { day: "수", date: 18, hours: 0.8 },
  { day: "목", date: 19, hours: 1.2 },
  { day: "금", date: 20, hours: 0 },
  { day: "토", date: 21, hours: 2.5 },
  { day: "일", date: 22, hours: 0.5 },
];

const plan = [
  { id: "1", title: "정보처리기사 필기 - 데이터베이스", time: "09:00 - 10:30", tag: "자격증", done: false },
  { id: "2", title: "포트폴리오 프로젝트 정리", time: "14:00 - 15:00", tag: "포트폴리오", done: false },
  { id: "3", title: "관심 직무 채용 요건 살펴보기", time: "19:00 - 19:30", tag: "커리어", done: true },
];

export default function StudyPage() {
  const [completed, setCompleted] = useState(plan.filter((item) => item.done).map((item) => item.id));
  const [notice, setNotice] = useState("");
  const total = completed.length;
  return (
    <div className="content-width">
      {notice && <p role="status" className="mb-4 rounded-lg bg-blue-50 px-4 py-2 text-xs text-blue-800 dark:bg-blue-500/10 dark:text-blue-200">{notice}</p>}
      <PageHeading eyebrow="STUDY PLANNER" title="꾸준한 준비가 실력이 돼요" description="학습 시간과 목표를 기록하고 나만의 루틴을 만들어보세요. 이 화면의 일정은 샘플입니다." action={<button type="button" onClick={() => setNotice("일정 추가 기능은 준비 중입니다.")} className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"><Plus size={16} /> 일정 추가</button>} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="이번 주 학습 시간" value="8.5시간" detail="지난주보다 1.5시간 더 공부했어요" icon={Clock3} /><StatCard label="목표 달성률" value="71%" detail="주간 목표 12시간 기준" icon={Target} tone="green" /><StatCard label="연속 학습일" value="4일" detail="꾸준히 이어가고 있어요" icon={Flame} tone="amber" /><StatCard label="완료한 일정" value={`${total}개`} detail="오늘 계획한 학습 일정" icon={CalendarDays} tone="violet" /></div>
      <div className="section-gap grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section><SectionHeading title="주간 학습 시간" description="목표 12시간 · 기록 예시" /><Surface className="p-5 sm:p-6"><div className="mb-6 flex items-baseline gap-2"><strong className="text-3xl">8.5</strong><span className="text-sm text-muted">시간</span><Tag tone="green">목표의 71%</Tag></div><div className="grid h-44 grid-cols-7 items-end gap-3 sm:gap-5">{week.map((item) => <div key={item.day} className="flex h-full flex-col items-center justify-end gap-2"><div className="flex h-full w-full items-end"><div title={`${item.hours}시간`} className={`w-full rounded-t-md ${item.day === "화" ? "bg-blue-600" : "bg-blue-200 dark:bg-blue-900"}`} style={{ height: `${Math.max(4, item.hours / 3 * 100)}%` }} /></div><span className="text-[11px] text-muted">{item.day}</span></div>)}</div></Surface></section>
        <section><SectionHeading title="오늘의 학습 일정" description="2026년 11월 17일 화요일" /><Surface className="divide-y divide-[var(--border)]">{plan.map((item) => { const done = completed.includes(item.id); return <button key={item.id} onClick={() => setCompleted((current) => done ? current.filter((id) => id !== item.id) : [...current, item.id])} aria-pressed={done} className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-[var(--surface-subtle)]"><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${done ? "border-blue-600 bg-blue-600 text-white" : "border-[var(--border)]"}`}>{done && <Check size={13} />}</span><span className="min-w-0 flex-1"><span className={`block text-sm font-semibold ${done ? "text-muted line-through" : ""}`}>{item.title}</span><span className="mt-1 block text-xs text-muted">{item.time}</span><span className="mt-2 inline-flex"><Tag>{item.tag}</Tag></span></span></button>; })}</Surface></section>
      </div>
      <section className="section-gap"><SectionHeading title="공부하는 자격증" description="진도를 기록하며 목표에 가까워져요." /><div className="grid gap-3 md:grid-cols-2"><Surface className="p-5"><div className="flex items-start justify-between"><div><Tag tone="blue">국가기술자격</Tag><h3 className="mt-3 font-bold">정보처리기사</h3></div><span className="text-sm font-bold text-blue-600">62%</span></div><div className="mt-4 h-2 rounded-full bg-[var(--surface-subtle)]"><div className="h-full w-[62%] rounded-full bg-blue-600" /></div><p className="mt-3 text-xs text-muted">필기 4개 과목 중 3개 과목 학습 중</p></Surface><Surface className="p-5"><div className="flex items-start justify-between"><div><Tag tone="violet" >민간자격</Tag><h3 className="mt-3 font-bold">데이터분석 준전문가</h3></div><span className="text-sm font-bold text-blue-600">35%</span></div><div className="mt-4 h-2 rounded-full bg-[var(--surface-subtle)]"><div className="h-full w-[35%] rounded-full bg-blue-600" /></div><p className="mt-3 text-xs text-muted">데이터 이해 영역 학습 중</p></Surface></div></section>
      <section className="section-gap"><SectionHeading title="이번 달" description="간단한 월간 캘린더 미리보기" /><Surface className="p-4 sm:p-6"><div className="mb-3 flex items-center justify-between"><button disabled aria-label="이전 달" className="rounded-lg px-3 py-1 text-muted opacity-40">‹</button><h3 className="font-semibold">2026년 11월</h3><button disabled aria-label="다음 달" className="rounded-lg px-3 py-1 text-muted opacity-40">›</button></div><div className="grid grid-cols-7 gap-1 text-center">{["일", "월", "화", "수", "목", "금", "토"].map((day) => <span key={day} className="py-2 text-xs font-semibold text-muted">{day}</span>)}{Array.from({ length: 35 }, (_, index) => { const day = index + 1; const valid = day <= 30; return <div key={index} className={`relative mx-auto flex h-10 w-full max-w-12 items-center justify-center rounded-lg text-sm ${day === 17 ? "bg-blue-600 font-bold text-white" : valid ? "hover:bg-[var(--surface-subtle)]" : "text-muted/40"}`}>{valid ? day : day - 30}{[5, 12, 17, 21, 28].includes(day) && <span className={`absolute bottom-1 h-1 w-1 rounded-full ${day === 17 ? "bg-white" : "bg-blue-500"}`} />}</div>; })}</div></Surface></section>
    </div>
  );
}
