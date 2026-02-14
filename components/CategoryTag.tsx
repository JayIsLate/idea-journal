import { IdeaCategory } from "@/lib/types";

const categoryColors: Record<IdeaCategory, { bg: string; text: string }> = {
  product: { bg: "bg-blue-50", text: "text-blue-700" },
  content: { bg: "bg-purple-50", text: "text-purple-700" },
  business: { bg: "bg-green-50", text: "text-green-700" },
  personal: { bg: "bg-amber-50", text: "text-amber-700" },
  technical: { bg: "bg-slate-100", text: "text-slate-700" },
  creative: { bg: "bg-pink-50", text: "text-pink-700" },
};

export default function CategoryTag({ category }: { category: IdeaCategory }) {
  const colors = categoryColors[category] || categoryColors.personal;

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-medium ${colors.bg} ${colors.text}`}
    >
      {category}
    </span>
  );
}
