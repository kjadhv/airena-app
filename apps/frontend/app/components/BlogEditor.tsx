// app/components/BlogEditor.tsx
"use client";
import React, { useState, useCallback } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import TiptapLink from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { mergeAttributes, Node } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Heading2,
  Quote,
  ImageIcon,
  Link2,
  Twitter,
  Table as TableIcon,
  Code,
  Minus,
  Heading1,
  Heading3,
} from "lucide-react";

// --- Custom Tiptap Extension for Social Media Embeds ---
interface SocialEmbedOptions {
  src: string;
  type: "twitter" | "youtube" | "instagram";
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    socialEmbed: {
      setSocialEmbed: (options: SocialEmbedOptions) => ReturnType;
    };
  }
}

const SocialEmbed = Node.create({
  name: "socialEmbed",
  group: "block",
  atom: true,
  draggable: true,
  
  addAttributes() {
    return { 
      src: { default: null }, 
      type: { default: "twitter" }
    };
  },
  
  parseHTML() {
    return [{ tag: 'div[data-embed-type]' }];
  },
  
  renderHTML({ node, HTMLAttributes }) {
    const { type, src } = node.attrs;
    
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-embed-type': type,
        'data-embed-src': src,
        'class': 'embed-container',
      }),
      [
        'div',
        { class: 'embed-preview' },
        0
      ]
    ];
  },
  
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.className = 'embed-wrapper';
      dom.setAttribute('data-embed-type', node.attrs.type);
      
      const content = document.createElement('div');
      content.className = 'embed-content';
      
      const { type, src } = node.attrs;
      
      if (type === 'youtube') {
        const videoId = extractYoutubeId(src);
        if (videoId) {
          content.innerHTML = `
            <div class="video-embed">
              <iframe 
                src="https://www.youtube.com/embed/${videoId}" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen
              ></iframe>
            </div>
          `;
        }
      } else if (type === 'twitter') {
        content.innerHTML = `
          <div class="twitter-card">
            <div class="twitter-icon">𝕏</div>
            <div class="twitter-content">
              <div class="twitter-title">Twitter Post</div>
              <a href="${src}" target="_blank" rel="noopener noreferrer" class="twitter-link">${src}</a>
            </div>
          </div>
        `;
      } else if (type === 'instagram') {
        content.innerHTML = `
          <div class="instagram-card">
            <div class="instagram-icon">📷</div>
            <div class="instagram-content">
              <div class="instagram-title">Instagram Post</div>
              <a href="${src}" target="_blank" rel="noopener noreferrer" class="instagram-link">${src}</a>
            </div>
          </div>
        `;
      }
      
      dom.appendChild(content);
      
      return {
        dom,
        contentDOM: null,
      };
    };
  },
  
  addCommands() {
    return {
      setSocialEmbed:
        (options: SocialEmbedOptions) =>
        ({ commands }) => {
          return commands.insertContent({ 
            type: this.name, 
            attrs: options 
          });
        },
    };
  },
});

// Helper function to extract YouTube video ID
function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Helper function to detect embed type from URL
function detectEmbedType(url: string): "twitter" | "youtube" | "instagram" | null {
  const trimmedUrl = url.trim();
  
  if (trimmedUrl.includes("youtube.com") || trimmedUrl.includes("youtu.be")) {
    return "youtube";
  }
  if (trimmedUrl.includes("twitter.com") || trimmedUrl.includes("x.com")) {
    return "twitter";
  }
  if (trimmedUrl.includes("instagram.com")) {
    return "instagram";
  }
  return null;
}

// --- Editor Toolbar Component ---
const EditorToolbar = ({ editor }: { editor: Editor | null }) => {
  const [showImageModal, setShowImageModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");

  const addImage = useCallback(() => {
    if (imageUrl && editor) {
      editor.chain().focus().setImage({ src: imageUrl, alt: imageAlt }).run();
      setShowImageModal(false);
      setImageUrl("");
      setImageAlt("");
    }
  }, [editor, imageUrl, imageAlt]);

  const addLink = useCallback(() => {
    if (!editor) return;
    
    // Check if URL is a social media embed
    const embedType = detectEmbedType(linkUrl);
    
    if (embedType && !linkText) {
      // Insert as embed
      editor
        .chain()
        .focus()
        .setSocialEmbed({ src: linkUrl, type: embedType })
        .run();
    } else {
      // Insert as regular link
      if (linkText) {
        editor
          .chain()
          .focus()
          .insertContent(`<a href="${linkUrl}">${linkText}</a>`)
          .run();
      } else {
        editor.chain().focus().setLink({ href: linkUrl }).run();
      }
    }
    
    setShowLinkModal(false);
    setLinkUrl("");
    setLinkText("");
  }, [editor, linkUrl, linkText]);

  const insertTable = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  }, [editor]);

  const addHorizontalRule = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().setHorizontalRule().run();
  }, [editor]);

  const toggleCodeBlock = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleCodeBlock().run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  const buttonClass = (name: string, opts?: Record<string, unknown>) =>
    `p-2 rounded-lg transition-all duration-200 ${
      editor.isActive(name, opts)
        ? "bg-emerald-500/30 text-emerald-300 shadow-lg"
        : "text-gray-400 hover:bg-gray-700/50 hover:text-white"
    }`;

  return (
    <>
      <div className="flex items-center gap-1 p-3 border-b border-gray-700/50 flex-wrap bg-gray-800/30 backdrop-blur-sm sticky top-0 z-10">
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={buttonClass("heading", { level: 1 })}
          title="Heading 1"
        >
          <Heading1 size={18} />
        </button>
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={buttonClass("heading", { level: 2 })}
          title="Heading 2"
        >
          <Heading2 size={18} />
        </button>
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className={buttonClass("heading", { level: 3 })}
          title="Heading 3"
        >
          <Heading3 size={18} />
        </button>
        <div className="w-px h-6 bg-gray-600/50 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={buttonClass("bold")}
          title="Bold"
        >
          <Bold size={18} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={buttonClass("italic")}
          title="Italic"
        >
          <Italic size={18} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={buttonClass("strike")}
          title="Strikethrough"
        >
          <Strikethrough size={18} />
        </button>
        <button
          type="button"
          onClick={toggleCodeBlock}
          className={buttonClass("codeBlock")}
          title="Code Block"
        >
          <Code size={18} />
        </button>
        <div className="w-px h-6 bg-gray-600/50 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={buttonClass("blockquote")}
          title="Quote"
        >
          <Quote size={18} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={buttonClass("bulletList")}
          title="Bullet List"
        >
          <List size={18} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={buttonClass("orderedList")}
          title="Ordered List"
        >
          <ListOrdered size={18} />
        </button>
        <div className="w-px h-6 bg-gray-600/50 mx-1" />
        <button
          type="button"
          onClick={insertTable}
          className={buttonClass("table")}
          title="Insert Table"
        >
          <TableIcon size={18} />
        </button>
        <button
          type="button"
          onClick={() => setShowImageModal(true)}
          className={buttonClass("image")}
          title="Add Image"
        >
          <ImageIcon size={18} />
        </button>
        <button
          type="button"
          onClick={() => setShowLinkModal(true)}
          className="p-2 rounded-lg transition-all duration-200 text-gray-400 hover:bg-gray-700/50 hover:text-white"
          title="Add Link or Embed"
        >
          <Link2 size={18} />
        </button>
        <button
          type="button"
          onClick={addHorizontalRule}
          className="p-2 rounded-lg transition-all duration-200 text-gray-400 hover:bg-gray-700/50 hover:text-white"
          title="Horizontal Line"
        >
          <Minus size={18} />
        </button>
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl w-[500px] max-w-[90vw] shadow-2xl border border-gray-700/50">
            <h3 className="text-2xl font-bold mb-6 text-white bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Add Image</h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Image URL
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-3 bg-gray-700/50 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Alt Text (optional)
                </label>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="Description of the image"
                  className="w-full px-4 py-3 bg-gray-700/50 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-8">
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="px-6 py-2.5 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addImage}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-lg transition-all shadow-lg hover:shadow-emerald-500/50"
              >
                Add Image
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link/Embed Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl w-[500px] max-w-[90vw] shadow-2xl border border-gray-700/50">
            <h3 className="text-2xl font-bold mb-6 text-white bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Add Link or Embed</h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  URL
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com or YouTube/Twitter/Instagram URL"
                  className="w-full px-4 py-3 bg-gray-700/50 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Link Text (optional - leave empty for embed)
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Click here"
                  className="w-full px-4 py-3 bg-gray-700/50 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
              <p className="text-xs text-gray-400 bg-gray-700/30 p-3 rounded-lg">
                💡 <strong>Tip:</strong> Paste a YouTube, Twitter, or Instagram URL without text to create an embed preview!
              </p>
            </div>
            <div className="flex gap-3 justify-end mt-8">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="px-6 py-2.5 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addLink}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-lg transition-all shadow-lg hover:shadow-emerald-500/50"
              >
                {detectEmbedType(linkUrl) && !linkText ? 'Create Embed' : 'Add Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// --- Main Blog Editor Component ---
interface BlogEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const BlogEditor: React.FC<BlogEditorProps> = ({ value, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ 
        heading: { levels: [1, 2, 3] },
        codeBlock: {
          HTMLAttributes: {
            class: 'code-block-custom',
          },
        },
      }),
      TiptapImage.configure({ 
        inline: false, 
        allowBase64: true,
        HTMLAttributes: {
          class: 'editor-image',
        },
      }),
      TiptapLink.configure({ 
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'editor-table',
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      SocialEmbed,
      Placeholder.configure({
        placeholder: '✨ Start writing your amazing story... Press / for commands',
      }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-lg max-w-none p-8 min-h-[500px] focus:outline-none",
      },
    },
  });

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden">
      <EditorToolbar editor={editor} />
      <div className="max-h-[600px] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default BlogEditor;