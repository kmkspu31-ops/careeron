"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 px-4 pt-[15vh]" onMouseDown={onClose}>
      <section role="dialog" aria-modal="true" aria-label={title} className="app-surface w-full max-w-xl rounded-2xl p-4 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold">{title}</h2><button type="button" onClick={onClose} aria-label="닫기" className="rounded-md p-2 text-muted hover:bg-[var(--surface-subtle)]"><X size={17} /></button></div>
        {children}
      </section>
    </div>
  );
}
