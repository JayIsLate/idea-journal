"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function IdeasDrawer({ open, onClose, children }: Props) {
  const startY = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function onTouchStart(e: React.TouchEvent) {
    startY.current = e.touches[0].clientY;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (startY.current == null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) setDragOffset(delta);
  }
  function onTouchEnd() {
    if (dragOffset > 80) {
      onClose();
    }
    setDragOffset(0);
    startY.current = null;
  }

  return (
    <div
      className={`md:hidden fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/20 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      {/* Sheet */}
      <div
        className="absolute left-0 right-0 bottom-0 bg-card border-t border-border rounded-t-2xl transition-transform duration-200 max-h-[65vh] flex flex-col"
        style={{
          transform: open
            ? `translateY(${dragOffset}px)`
            : "translateY(100%)",
        }}
      >
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="flex justify-center pt-2.5 pb-1 cursor-grab"
        >
          <div className="w-8 h-[3px] bg-secondary/40 rounded-full" />
        </div>
        <div
          className="overflow-y-auto px-5 pb-6 pt-2"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
