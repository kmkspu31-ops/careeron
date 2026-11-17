"use client";

import { useState } from "react";

export function ActionButton({
  children,
  message,
  className,
  ariaLabel,
}: {
  children: React.ReactNode;
  message: string;
  className: string;
  ariaLabel?: string;
}) {
  const [notice, setNotice] = useState("");
  return (
    <span className="inline-flex flex-col items-start">
      <button type="button" aria-label={ariaLabel} onClick={() => setNotice(message)} className={className}>{children}</button>
      {notice && <span role="status" className="mt-1 max-w-56 text-[10px] leading-4 text-muted">{notice}</span>}
    </span>
  );
}
