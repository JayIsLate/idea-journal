"use client";

import { useState } from "react";
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

export default function IdeaCard({
  idea,
  showEntryLink,
}: {
  idea: Idea;
  showEntryLink?: boolean;
}) {
  const [status, setStatus] = useState<IdeaStatus>(idea.status);
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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
      }
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

      <div className="mt-3 pt-3 border-t border-border">
        {!plan && (
          <button
            onClick={generatePlan}
            disabled={planLoading}
            className="text-sm font-mono text-accent active:opacity-70 transition-opacity disabled:opacity-40"
          >
            {planLoading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                Generating plan...
              </span>
            ) : (
              "Plan"
            )}
          </button>
        )}

        {plan && (
          <div>
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
    </div>
  );
}
