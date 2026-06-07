'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';

function Btn({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`rounded px-2 py-1 text-xs ${active ? 'bg-brand text-neutral-950' : 'text-muted hover:bg-surface hover:text-fg'}`}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: 'prose-content min-h-[260px] focus:outline-none' },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Sync external value (e.g. when loading an existing post)
  useEffect(() => {
    if (editor && value && editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) return <div className="h-72 animate-pulse rounded-lg bg-card" />;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap gap-1 border-b border-border p-2">
        <Btn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</Btn>
        <Btn active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</Btn>
        <Btn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>B</Btn>
        <Btn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>I</Btn>
        <Btn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</Btn>
        <Btn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</Btn>
        <Btn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝</Btn>
        <Btn onClick={() => editor.chain().focus().setParagraph().run()}>¶</Btn>
      </div>
      <div className="p-3">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
