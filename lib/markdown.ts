import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: true });

export function renderMarkdown(md: string): string {
  if (!md) return "";
  return marked.parse(md) as string;
}
