"use client";

import {
  PageKey,
  PAGE_KEYS,
  PAGE_COLORS,
  PAGE_BORDER_COLORS,
  PAGE_LABELS,
} from "@/lib/writing-types";
import type { Pages } from "@/lib/writing-types";

interface PageTabsProps {
  activeKey: PageKey;
  pages: Pages;
  onChange: (key: PageKey) => void;
}

export default function PageTabs({ activeKey, pages, onChange }: PageTabsProps) {
  return (
    <div className="flex gap-1">
      {PAGE_KEYS.map((key) => {
        const hasContent = pages[key]?.trim().length > 0;
        const isActive = key === activeKey;

        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`
              flex items-center gap-1.5 px-3 py-2 font-mono text-xs transition-colors
              border-b-2
              ${isActive ? PAGE_BORDER_COLORS[key] + " text-text" : "border-transparent text-secondary hover:text-text"}
            `}
          >
            <span
              className={`w-2 h-2 rounded-full ${PAGE_COLORS[key]} ${hasContent ? "opacity-100" : "opacity-30"}`}
            />
            {PAGE_LABELS[key]}
          </button>
        );
      })}
    </div>
  );
}
