import { IdeaStatus } from "@/lib/types";

const statusConfig: Record<IdeaStatus, { color: string; label: string }> = {
  raw: { color: "bg-gray-400", label: "Raw" },
  developing: { color: "bg-yellow-400", label: "Developing" },
  ready: { color: "bg-blue-500", label: "Ready" },
  shipped: { color: "bg-green-500", label: "Shipped" },
  archived: { color: "bg-gray-300", label: "Archived" },
};

export default function StatusBadge({ status }: { status: IdeaStatus }) {
  const config = statusConfig[status] || statusConfig.raw;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-mono text-secondary">
      <span className={`w-2 h-2 rounded-full ${config.color}`} />
      {config.label}
    </span>
  );
}
