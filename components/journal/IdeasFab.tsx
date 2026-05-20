"use client";

interface Props {
  count: number;
  onClick: () => void;
}

export default function IdeasFab({ count, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      aria-label="Open ideas panel"
      className="md:hidden fixed right-4 z-40 bg-text text-card rounded-full h-11 w-11 flex items-center justify-center shadow-sm active:scale-95 transition-transform"
      style={{ bottom: "calc(56px + env(safe-area-inset-bottom) + 16px)" }}
    >
      <span className="font-mono text-[9px] uppercase tracking-wider">Ideas</span>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-accent text-card font-mono text-[10px] rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
          {count}
        </span>
      )}
    </button>
  );
}
