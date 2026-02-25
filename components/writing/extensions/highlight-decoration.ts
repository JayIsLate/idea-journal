import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node } from "@tiptap/pm/model";
import type { Highlight, HighlightType } from "@/lib/writing-types";
import type { MutableRefObject } from "react";

export const highlightPluginKey = new PluginKey("highlight-decoration");

const TYPE_CLASSES: Record<HighlightType, string> = {
  question: "highlight-decoration border-b-2 border-blue-400 bg-blue-50/50",
  suggestion:
    "highlight-decoration border-b-2 border-emerald-400 bg-emerald-50/50",
  edit: "highlight-decoration border-b-2 border-amber-400 bg-amber-50/50",
  voice: "highlight-decoration border-b-2 border-purple-400 bg-purple-50/50",
  weakness: "highlight-decoration border-b-2 border-red-400 bg-red-50/50",
  evidence: "highlight-decoration border-b-2 border-cyan-400 bg-cyan-50/50",
  wordiness:
    "highlight-decoration border-b-2 border-orange-400 bg-orange-50/50",
  factcheck: "highlight-decoration border-b-2 border-pink-400 bg-pink-50/50",
};

function getDocFlatText(doc: Node): string {
  let text = "";
  doc.descendants((node) => {
    if (node.isText) {
      text += node.text;
    } else if (node.isBlock && text.length > 0 && !text.endsWith("\n")) {
      text += "\n";
    }
  });
  return text;
}

function flatOffsetToPos(doc: Node, offset: number): number | null {
  let currentOffset = 0;
  let result: number | null = null;

  doc.descendants((node, pos) => {
    if (result !== null) return false;
    if (node.isText) {
      const len = node.text?.length || 0;
      if (currentOffset + len > offset) {
        result = pos + (offset - currentOffset);
        return false;
      }
      currentOffset += len;
    } else if (node.isBlock && currentOffset > 0) {
      if (currentOffset === offset) {
        result = pos;
        return false;
      }
      currentOffset += 1;
    }
  });

  return result;
}

function buildDecorations(doc: Node, highlights: Highlight[]): DecorationSet {
  const decorations: Decoration[] = [];
  const flatText = getDocFlatText(doc);

  for (const highlight of highlights) {
    const index = flatText.indexOf(highlight.matchText);
    if (index === -1) continue;

    const from = flatOffsetToPos(doc, index);
    const to = flatOffsetToPos(doc, index + highlight.matchText.length);
    if (from === null || to === null) continue;

    decorations.push(
      Decoration.inline(from, to, {
        class: TYPE_CLASSES[highlight.type] || "highlight-decoration",
        "data-highlight-id": highlight.id,
      })
    );
  }

  return DecorationSet.create(doc, decorations);
}

/**
 * Create a highlight plugin that reads from a ref (created once, reads current data each time).
 */
export function createHighlightPlugin(
  highlightsRef: MutableRefObject<Highlight[]>,
  onClickRef: MutableRefObject<
    ((highlightId: string, rect: DOMRect) => void) | undefined
  >
): Plugin {
  return new Plugin({
    key: highlightPluginKey,
    state: {
      init(_, { doc }) {
        return buildDecorations(doc, highlightsRef.current);
      },
      apply(tr, old) {
        // Rebuild on every transaction so ref changes are picked up
        return buildDecorations(tr.doc, highlightsRef.current);
      },
    },
    props: {
      decorations(state) {
        return this.getState(state);
      },
      handleClick(view, pos, event) {
        const target = event.target as HTMLElement;
        const highlightEl = target.closest("[data-highlight-id]");
        if (highlightEl && onClickRef.current) {
          const id = highlightEl.getAttribute("data-highlight-id");
          if (id) {
            const rect = highlightEl.getBoundingClientRect();
            onClickRef.current(id, rect);
            return true;
          }
        }
        return false;
      },
    },
  });
}
