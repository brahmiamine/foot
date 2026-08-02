"use client";

import { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import "./rich-text-editor.css";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Rich Text Editor Component using Tiptap
 * Compatible with React 19
 */
export function RichTextEditor({ value, onChange, placeholder = "Rédigez votre contenu ici..." }: RichTextEditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3],
          },
        }),
        Underline,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: "text-primary",
          },
        }),
        Image.configure({
          inline: true,
          allowBase64: true,
        }),
      ],
      content: mounted ? value : "", // Only set content when mounted
      immediatelyRender: false, // Prevent SSR hydration issues
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML());
      },
      editorProps: {
        attributes: {
          class: "ProseMirror",
        },
      },
    },
    [mounted] // Dependencies array for useEditor
  );

  // Update editor content when value prop changes (for edit mode)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!mounted) {
    // Render a placeholder that matches the structure on server and client
    return (
      <div
        className="rich-text-editor-placeholder"
        style={{ minHeight: "300px", marginBottom: "50px" }}
        suppressHydrationWarning
      >
        <div className="form-control" style={{ minHeight: "300px", padding: "12px" }}>
          <p className="text-muted mb-0">{placeholder}</p>
        </div>
      </div>
    );
  }

  if (!editor) {
    return (
      <div className="form-control" style={{ minHeight: "300px", padding: "12px" }}>
        <p className="text-muted mb-0">Chargement de l'éditeur...</p>
      </div>
    );
  }

  return (
    <div className="rich-text-editor-wrapper" style={{ marginBottom: "50px" }}>
      {/* Toolbar */}
      <div className="border rounded-top p-2 bg-light" style={{ borderBottom: "none" }}>
        <div className="btn-group me-2 mb-2" role="group">
          <button
            type="button"
            className={`btn btn-sm btn-outline-secondary ${editor.isActive("heading", { level: 1 }) ? "active" : ""}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Titre 1"
          >
            <strong>H1</strong>
          </button>
          <button
            type="button"
            className={`btn btn-sm btn-outline-secondary ${editor.isActive("heading", { level: 2 }) ? "active" : ""}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Titre 2"
          >
            <strong>H2</strong>
          </button>
          <button
            type="button"
            className={`btn btn-sm btn-outline-secondary ${editor.isActive("heading", { level: 3 }) ? "active" : ""}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Titre 3"
          >
            <strong>H3</strong>
          </button>
        </div>

        <div className="btn-group me-2 mb-2" role="group">
          <button
            type="button"
            className={`btn btn-sm btn-outline-secondary ${editor.isActive("bold") ? "active" : ""}`}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Gras"
          >
            <i className="fas fa-bold" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`btn btn-sm btn-outline-secondary ${editor.isActive("italic") ? "active" : ""}`}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italique"
          >
            <i className="fas fa-italic" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`btn btn-sm btn-outline-secondary ${editor.isActive("underline") ? "active" : ""}`}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Souligné"
          >
            <i className="fas fa-underline" aria-hidden="true" />
          </button>
        </div>

        <div className="btn-group me-2 mb-2" role="group">
          <button
            type="button"
            className={`btn btn-sm btn-outline-secondary ${editor.isActive("bulletList") ? "active" : ""}`}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Liste à puces"
          >
            <i className="fas fa-list-ul" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`btn btn-sm btn-outline-secondary ${editor.isActive("orderedList") ? "active" : ""}`}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Liste numérotée"
          >
            <i className="fas fa-list-ol" aria-hidden="true" />
          </button>
        </div>

        <div className="btn-group me-2 mb-2" role="group">
          <button
            type="button"
            className={`btn btn-sm btn-outline-secondary ${editor.isActive("link") ? "active" : ""}`}
            onClick={() => {
              const url = window.prompt("Entrez l'URL du lien:");
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              }
            }}
            title="Lien"
          >
            <i className="fas fa-link" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => {
              const url = window.prompt("Entrez l'URL de l'image:");
              if (url) {
                editor.chain().focus().setImage({ src: url }).run();
              }
            }}
            title="Image"
          >
            <i className="fas fa-image" aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          title="Effacer le formatage"
        >
          <i className="fas fa-eraser" aria-hidden="true" />
        </button>
      </div>

      {/* Editor Content */}
      <div className="border rounded-bottom" style={{ minHeight: "300px" }}>
        <EditorContent editor={editor} />
      </div>

    </div>
  );
}

