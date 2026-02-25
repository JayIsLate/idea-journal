import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { MutableRefObject } from "react";

const focusModeKey = new PluginKey("focus-mode");

/**
 * Create focus mode plugin that reads enabled state from a ref.
 */
export function createFocusModePlugin(
  enabledRef: MutableRefObject<boolean>
): Plugin {
  return new Plugin({
    key: focusModeKey,
    props: {
      decorations(state) {
        if (!enabledRef.current) return DecorationSet.empty;

        const { doc, selection } = state;
        const decorations: Decoration[] = [];
        const cursorPos = selection.from;

        let activeFrom = -1;
        let activeTo = -1;
        doc.forEach((node, offset) => {
          const from = offset;
          const to = offset + node.nodeSize;
          if (cursorPos >= from && cursorPos <= to) {
            activeFrom = from;
            activeTo = to;
          }
        });

        doc.forEach((node, offset) => {
          const from = offset;
          const to = offset + node.nodeSize;
          const isActive = from === activeFrom && to === activeTo;
          decorations.push(
            Decoration.node(from, to, {
              class: isActive ? "focus-mode-active" : "",
            })
          );
        });

        return DecorationSet.create(doc, decorations);
      },
    },
  });
}
