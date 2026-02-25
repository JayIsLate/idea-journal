"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Markdown } from "tiptap-markdown";
import { useEffect, useRef } from "react";
import type { Editor } from "@tiptap/core";

function getMarkdown(editor: Editor): string {
  const storage = editor.storage as unknown as Record<
    string,
    { getMarkdown: () => string }
  >;
  return storage.markdown.getMarkdown();
}

/** Fix escaped markdown that tiptap-markdown serializer produces in nested lists */
function cleanMarkdown(md: string): string {
  return md
    .replace(/\\\*\\\*/g, "**")
    .replace(/\\\*/g, "*")
    .replace(/\\\[/g, "[")
    .replace(/\\\]/g, "]")
    .replace(/\\\\/g, "")          // stray backslashes
    .replace(/([^\n])\\$/gm, "$1") // trailing \ on lines
    .replace(/\)\\/g, ")")         // )\ → )
    .replace(/\?\\/g, "?")         // ?\ → ?
    .replace(/^\\-/gm, "-");       // \- → - (escaped list markers)
}

interface WritingEditorProps {
  /** Unique key that changes when the tab switches (e.g. the page key) */
  tabKey: string;
  content: string;
  onUpdate: (markdown: string) => void;
  placeholder?: string;
  onEditorReady?: (editor: Editor) => void;
  enableImages?: boolean;
  onImageDrop?: (file: File) => Promise<string | null>;
}

export default function WritingEditor({
  tabKey,
  content,
  onUpdate,
  placeholder = "Start writing...",
  onEditorReady,
  enableImages,
  onImageDrop,
}: WritingEditorProps) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const onImageDropRef = useRef(onImageDrop);
  onImageDropRef.current = onImageDrop;
  const enableImagesRef = useRef(enableImages);
  enableImagesRef.current = enableImages;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-accent underline" },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: { class: "writing-image" },
      }),
      Markdown.configure({
        html: true,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap-editor",
      },
      handleDrop(view, event, _slice, moved) {
        if (
          !enableImagesRef.current ||
          moved ||
          !event.dataTransfer?.files?.length
        ) {
          return false;
        }
        const file = event.dataTransfer.files[0];
        if (!file.type.startsWith("image/")) return false;
        event.preventDefault();
        onImageDropRef.current?.(file).then((url) => {
          if (url) {
            const { schema } = view.state;
            const node = schema.nodes.image.create({ src: url });
            const pos = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });
            if (pos) {
              view.dispatch(view.state.tr.insert(pos.pos, node));
            }
          }
        });
        return true;
      },
      handlePaste(view, event) {
        if (!enableImagesRef.current) return false;
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) return true;
            onImageDropRef.current?.(file).then((url) => {
              if (url) {
                const { schema } = view.state;
                const node = schema.nodes.image.create({ src: url });
                view.dispatch(view.state.tr.replaceSelectionWith(node));
              }
            });
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const md = cleanMarkdown(getMarkdown(editor));
      onUpdateRef.current(md);
    },
  });

  // Notify parent when editor is ready
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // Set content on initial load and when tabKey changes (tab switch), NOT on every content prop change
  const prevTabKey = useRef<string | null>(null);
  useEffect(() => {
    if (!editor) return;
    if (tabKey === prevTabKey.current) return;
    prevTabKey.current = tabKey;
    editor.commands.setContent(cleanMarkdown(content) || "");
  }, [editor, tabKey, content]);

  if (!editor) return null;

  return <EditorContent editor={editor} />;
}
