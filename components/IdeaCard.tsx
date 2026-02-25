"use client";

import { useState, useEffect } from "react";
import { Idea, IdeaStatus } from "@/lib/types";
import CategoryTag from "./CategoryTag";
import StatusBadge from "./StatusBadge";

const statuses: IdeaStatus[] = [
  "raw",
  "developing",
  "ready",
  "shipped",
  "archived",
];

const statusColors: Record<IdeaStatus, string> = {
  raw: "bg-gray-400",
  developing: "bg-yellow-400",
  ready: "bg-blue-500",
  shipped: "bg-green-500",
  archived: "bg-gray-300",
};

function PlanProgress() {
  const [elapsed, setElapsed] = useState(0);
  const estimate = 8;

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const progress = Math.min((elapsed / estimate) * 90, 92);

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-mono text-secondary">Generating plan</span>
        <span className="text-xs font-mono text-secondary">{elapsed}s / ~{estimate}s</span>
      </div>
      <div className="h-0.5 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export default function IdeaCard({
  idea,
  showEntryLink,
  compact,
  hasWriting,
}: {
  idea: Idea;
  showEntryLink?: boolean;
  compact?: boolean;
  hasWriting?: boolean;
}) {
  const [status, setStatus] = useState<IdeaStatus>(idea.status);
  const [expanded, setExpanded] = useState(false);
  const [cardExpanded, setCardExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [planError, setPlanError] = useState(false);

  async function updateStatus(newStatus: IdeaStatus) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setStatus(newStatus);
      }
    } finally {
      setUpdating(false);
    }
  }

  async function generatePlan() {
    setPlanLoading(true);
    setPlanError(false);
    try {
      const res = await fetch(`/api/ideas/${idea.id}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: idea.title,
          description: idea.description,
          category: idea.category,
          action_items: idea.action_items,
          tags: idea.tags,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPlan(data.plan);
      } else {
        setPlanError(true);
      }
    } catch {
      setPlanError(true);
    } finally {
      setPlanLoading(false);
    }
  }

  async function copyPlan() {
    if (!plan) return;
    await navigator.clipboard.writeText(plan);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (compact && !cardExpanded) {
    return (
      <button
        onClick={() => setCardExpanded(true)}
        className="bg-card border border-border rounded-xl p-4 aspect-square flex flex-col justify-between text-left w-full hover:border-accent/40 transition-colors"
      >
        <div>
          <CategoryTag category={idea.category} />
          <h3 className="font-mono text-sm font-semibold leading-tight mt-2.5 line-clamp-2">
            {idea.title}
          </h3>
          <p className="text-xs text-secondary leading-relaxed mt-1.5 line-clamp-2">
            {idea.description}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-mono text-secondary">
            <span className={`w-1.5 h-1.5 rounded-full ${statusColors[status] || statusColors.raw}`} />
            {status}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono text-secondary">
              {Math.round(idea.confidence * 100)}%
            </span>
            {hasWriting && (
              <span className="w-2 h-2 rounded-full bg-accent" title="Has writing" />
            )}
          </div>
        </div>
      </button>
    );
  }

  if (compact && cardExpanded) {
    return (
      <>
        <div
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[6px]"
          onClick={() => setCardExpanded(false)}
        />
        <div
          className="fixed inset-0 z-50 flex justify-center"
          onClick={() => setCardExpanded(false)}
        >
          <div
            className="bg-card border border-border rounded-lg w-full max-w-md max-h-[calc(100vh-200px)] overflow-y-auto pointer-events-auto mt-[100px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-4 border-b border-border">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <CategoryTag category={idea.category} />
                  <span className="text-xs font-mono text-secondary">
                    {Math.round(idea.confidence * 100)}%
                  </span>
                </div>
                <button
                  onClick={() => setCardExpanded(false)}
                  className="text-secondary hover:text-text text-xs font-mono leading-none shrink-0"
                >
                  &times;
                </button>
              </div>
              <h3 className="font-mono text-sm font-semibold leading-tight mt-3">
                {idea.title}
              </h3>
            </div>

            <div className="px-5 py-4 space-y-4">
              <p className="text-sm text-secondary leading-relaxed">
                {idea.description}
              </p>

              <div className="flex items-center gap-2">
                <StatusBadge status={status} />
                <select
                  value={status}
                  onChange={(e) => updateStatus(e.target.value as IdeaStatus)}
                  disabled={updating}
                  className="text-xs font-mono bg-bg border border-border rounded-lg px-2 py-1.5 text-secondary focus:outline-none focus:border-accent"
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {idea.action_items.length > 0 && (
                <div>
                  <p className="label mb-2">Action Items</p>
                  <ul className="space-y-1.5">
                    {idea.action_items.map((item, i) => (
                      <li key={i} className="text-sm text-secondary flex gap-2 leading-relaxed">
                        <span className="text-accent shrink-0">-</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {idea.ai_suggestions.length > 0 && (
                <div>
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="label py-1 active:opacity-70 transition-opacity"
                  >
                    {expanded ? "- Hide" : "+"} AI Suggestions
                  </button>
                  {expanded && (
                    <ul className="mt-2 space-y-1.5">
                      {idea.ai_suggestions.map((s, i) => (
                        <li key={i} className="text-sm text-secondary flex gap-2 leading-relaxed">
                          <span className="text-accent shrink-0">*</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {idea.tags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {idea.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs font-mono text-secondary bg-bg px-1.5 py-0.5 rounded-md"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {plan && (
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="label">Plan</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={copyPlan}
                        className="text-xs font-mono text-accent active:opacity-70 transition-opacity"
                      >
                        {copied ? "Copied!" : "Copy"}
                      </button>
                      <button
                        onClick={() => setPlan(null)}
                        className="text-xs font-mono text-secondary active:opacity-70 transition-opacity"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                  <pre className="text-sm text-secondary bg-bg rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
                    {plan}
                  </pre>
                </div>
              )}
            </div>

            {planLoading ? (
              <div className="px-5 py-4 border-t border-border">
                <PlanProgress />
              </div>
            ) : (
              <div className="px-5 py-4 border-t border-border flex items-center justify-between">
                {showEntryLink ? (
                  <a
                    href={`/day/${idea.entry_id}`}
                    className="text-xs font-mono text-accent active:opacity-70"
                  >
                    View entry &rarr;
                  </a>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-2">
                  <a
                    href={`/write/${idea.id}`}
                    className="inline-block px-2.5 py-1 rounded text-xs font-mono font-medium bg-accent/10 text-accent active:opacity-70 transition-opacity"
                  >
                    write
                  </a>
                  <button
                    onClick={generatePlan}
                    disabled={!!plan}
                    className="inline-block px-2.5 py-1 rounded text-xs font-mono font-medium bg-accent/10 text-accent active:opacity-70 transition-opacity disabled:opacity-40"
                  >
                    {planError ? "retry" : "plan"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-mono text-sm font-semibold leading-tight">
          {idea.title}
        </h3>
        <CategoryTag category={idea.category} />
      </div>

      <p className="text-sm text-secondary leading-relaxed mb-3">
        {idea.description}
      </p>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <StatusBadge status={status} />
        <select
          value={status}
          onChange={(e) => updateStatus(e.target.value as IdeaStatus)}
          disabled={updating}
          className="text-xs font-mono bg-bg border border-border rounded-lg px-2 py-1.5 text-secondary focus:outline-none focus:border-accent"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className="text-xs font-mono text-secondary ml-auto">
          {Math.round(idea.confidence * 100)}%
        </span>
      </div>

      {idea.action_items.length > 0 && (
        <div className="mb-3">
          <p className="label mb-1.5">Action Items</p>
          <ul className="space-y-1.5">
            {idea.action_items.map((item, i) => (
              <li key={i} className="text-sm text-secondary flex gap-2 leading-relaxed">
                <span className="text-accent shrink-0">-</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {idea.ai_suggestions.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="label py-1 active:opacity-70 transition-opacity"
          >
            {expanded ? "- Hide" : "+"} AI Suggestions
          </button>
          {expanded && (
            <ul className="mt-1.5 space-y-1.5">
              {idea.ai_suggestions.map((s, i) => (
                <li key={i} className="text-sm text-secondary flex gap-2 leading-relaxed">
                  <span className="text-accent shrink-0">*</span>
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {showEntryLink && (
        <div className="mt-3 pt-3 border-t border-border">
          <a
            href={`/day/${idea.entry_id}`}
            className="text-sm font-mono text-accent active:opacity-70"
          >
            View entry &rarr;
          </a>
        </div>
      )}

      {idea.tags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mt-3">
          {idea.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs font-mono text-secondary bg-bg px-1.5 py-0.5 rounded-md"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {!plan && !planLoading && (
        <div className="flex justify-end gap-2 mt-3">
          <a
            href={`/write/${idea.id}`}
            className="inline-block px-2 py-0.5 rounded text-xs font-mono font-medium bg-accent/10 text-accent active:opacity-70 transition-opacity"
          >
            write
          </a>
          <button
            onClick={generatePlan}
            className="inline-block px-2 py-0.5 rounded text-xs font-mono font-medium bg-accent/10 text-accent active:opacity-70 transition-opacity"
          >
            {planError ? "retry" : "plan"}
          </button>
        </div>
      )}

      {planLoading && <PlanProgress />}

      {plan && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="label">Plan</p>
            <div className="flex items-center gap-2">
              <button
                onClick={copyPlan}
                className="text-xs font-mono text-accent active:opacity-70 transition-opacity"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={() => setPlan(null)}
                className="text-xs font-mono text-secondary active:opacity-70 transition-opacity"
              >
                &times;
              </button>
            </div>
          </div>
          <pre className="text-sm text-secondary bg-bg rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
            {plan}
          </pre>
        </div>
      )}
    </div>
  );
}
