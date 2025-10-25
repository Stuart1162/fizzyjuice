import React, { useEffect, useRef } from 'react';
import '../../styles/editor.css';
import { Box, ToggleButton, ToggleButtonGroup, Tooltip, Divider } from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import StrikethroughSIcon from '@mui/icons-material/StrikethroughS';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import CodeIcon from '@mui/icons-material/Code';
import CodeOffIcon from '@mui/icons-material/CodeOff';
import LinkIcon from '@mui/icons-material/Link';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import LooksOneIcon from '@mui/icons-material/LooksOne';
import LooksTwoIcon from '@mui/icons-material/LooksTwo';
import Looks3Icon from '@mui/icons-material/Looks3';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight, common } from 'lowlight';
// Use tiptap-markdown package (since @tiptap/extension-markdown isn't published on npm)
import { Markdown } from 'tiptap-markdown';

export interface RichMarkdownEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  height?: number;
  getValueRef?: (getter: () => string) => void;
}

const RichMarkdownEditor: React.FC<RichMarkdownEditorProps> = ({ value, onChange, height = 420, getValueRef }) => {
  const isSyncingRef = useRef(false);

  const editor = useEditor({
    extensions: [
      // Put Markdown first so its parser/serializer and commands are registered early
      Markdown.configure({ html: false }) as any,
      StarterKit.configure({
        codeBlock: false,
        heading: false,
        // Some builds may include link in StarterKit; disable defensively
        // @ts-ignore
        link: false,
      }),
      CodeBlockLowlight.configure({ lowlight: createLowlight(common) }),
      Heading.configure({ levels: [1, 2, 3, 4] }),
      Link.configure({ openOnClick: true, autolink: true }),
      Placeholder.configure({ placeholder: 'Write the job description…' }),
    ],
    content: '',
    autofocus: false,
    onUpdate({ editor }: { editor: any }) {
      // Skip emitting while we're programmatically syncing value -> editor
      if (isSyncingRef.current) return;
      try {
        // @ts-ignore markdown storage helper
        const md = editor.storage.markdown?.getMarkdown?.() ?? '';
        onChange(md);
      } catch {
        // fallback: plain text
        onChange(editor.getText());
      }
    },
    editorProps: {
      attributes: {
        style: `min-height:${height}px; padding:12px; border:1px solid var(--mui-palette-divider); border-radius:8px; background: var(--mui-palette-background-paper);`,
      },
    },
  });

  // Expose a getter so parents can synchronously read current markdown on demand
  useEffect(() => {
    if (!editor || !getValueRef) return;
    const getter = () => {
      try {
        // @ts-ignore markdown storage helper
        return editor.storage.markdown?.getMarkdown?.() ?? '';
      } catch {
        return editor.getText() || '';
      }
    };
    // Intentionally only run when the editor instance changes to avoid parent setState loops
    getValueRef(getter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Set initial markdown value
  useEffect(() => {
    if (!editor) return;
    try {
      // Prevent cursor jump if already equal
      // @ts-ignore markdown helper
      const current = editor.storage.markdown?.getMarkdown?.();
      if (current === value) return;
      // @ts-ignore markdown helper
      isSyncingRef.current = true;
      console.info('[RME] syncing value -> editor. len=', (value || '').length);
      try {
        // @ts-ignore markdown command
        editor.commands.setMarkdown(value || '');
      } catch (e) {
        // Fallback: set plain text content so at least it appears
        const doc = (value && value.length)
          ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: value }]}] }
          : { type: 'doc', content: [] as any };
        editor.commands.setContent(doc as any);
      }
    } catch {
      isSyncingRef.current = true;
      // Last-resort fallback to plain text paragraph
      const doc = (value && value.length)
        ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: value }]}] }
        : { type: 'doc', content: [] as any };
      editor.commands.setContent(doc as any);
    }
    // Allow tiptap to apply the change before re-enabling updates
    const t = setTimeout(() => {
      try {
        const txt = editor.getText() || '';
        const vlen = (value || '').length;
        console.info('[RME] after sync editor text len=', txt.length, 'value len=', vlen);
        if (txt.length === 0 && vlen > 0) {
          // As a last resort, inject plain paragraph so content is visible
          const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: value }]}] } as any;
          isSyncingRef.current = true;
          editor.commands.setContent(doc);
        }
      } catch {}
      isSyncingRef.current = false;
    }, 0);
    return () => clearTimeout(t);
  }, [editor, value]);

  if (!editor) return null;

  const toggleLink = () => {
    const url = window.prompt('Enter URL');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const isActive = (name: string, attrs?: any) => editor.isActive(name as any, attrs);

  return (
    <Box className="rme" sx={{
      border: 1,
      borderColor: 'divider',
      borderRadius: 2,
      bgcolor: 'background.paper',
    }}>
      <Box sx={{
        px: 1,
        py: 0.5,
        borderBottom: 1,
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
        position: 'sticky',
        top: 0,
        zIndex: 1,
        bgcolor: 'background.paper',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
      }}>
        <ToggleButtonGroup size="small" exclusive sx={{ flexWrap: 'wrap' }}>
          <Tooltip title="Heading 1">
            <ToggleButton value="h1" selected={isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
              <LooksOneIcon fontSize="small" />
            </ToggleButton>
          </Tooltip>
          <Tooltip title="Heading 2">
            <ToggleButton value="h2" selected={isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              <LooksTwoIcon fontSize="small" />
            </ToggleButton>
          </Tooltip>
          <Tooltip title="Heading 3">
            <ToggleButton value="h3" selected={isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
              <Looks3Icon fontSize="small" />
            </ToggleButton>
          </Tooltip>
        </ToggleButtonGroup>
        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
        <ToggleButtonGroup size="small" exclusive sx={{ flexWrap: 'wrap' }}>
          <Tooltip title="Bold">
            <ToggleButton value="bold" selected={isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
              <FormatBoldIcon fontSize="small" />
            </ToggleButton>
          </Tooltip>
          <Tooltip title="Italic">
            <ToggleButton value="italic" selected={isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
              <FormatItalicIcon fontSize="small" />
            </ToggleButton>
          </Tooltip>
          <Tooltip title="Strikethrough">
            <ToggleButton value="strike" selected={isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
              <StrikethroughSIcon fontSize="small" />
            </ToggleButton>
          </Tooltip>
        </ToggleButtonGroup>
        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
        <ToggleButtonGroup size="small" exclusive sx={{ flexWrap: 'wrap' }}>
          <Tooltip title="Bullet List">
            <ToggleButton value="bullet" selected={isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
              <FormatListBulletedIcon fontSize="small" />
            </ToggleButton>
          </Tooltip>
          <Tooltip title="Numbered List">
            <ToggleButton value="ordered" selected={isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
              <FormatListNumberedIcon fontSize="small" />
            </ToggleButton>
          </Tooltip>
          <Tooltip title="Quote">
            <ToggleButton value="quote" selected={isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
              <FormatQuoteIcon fontSize="small" />
            </ToggleButton>
          </Tooltip>
        </ToggleButtonGroup>
        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
        <ToggleButtonGroup size="small" exclusive sx={{ flexWrap: 'wrap' }}>
          <Tooltip title="Inline Code">
            <ToggleButton value="code" selected={isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>
              <CodeIcon fontSize="small" />
            </ToggleButton>
          </Tooltip>
          <Tooltip title="Code Block">
            <ToggleButton value="codeBlock" selected={isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
              <CodeOffIcon fontSize="small" />
            </ToggleButton>
          </Tooltip>
          <Tooltip title="Link">
            <ToggleButton value="link" selected={isActive('link')} onClick={toggleLink}>
              <LinkIcon fontSize="small" />
            </ToggleButton>
          </Tooltip>
          <Tooltip title="Horizontal Rule">
            <ToggleButton value="hr" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
              <HorizontalRuleIcon fontSize="small" />
            </ToggleButton>
          </Tooltip>
        </ToggleButtonGroup>
        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
        <ToggleButtonGroup size="small" exclusive sx={{ flexWrap: 'wrap' }}>
          <Tooltip title="Undo">
            <ToggleButton value="undo" onClick={() => editor.chain().focus().undo().run()}>
              <UndoIcon fontSize="small" />
            </ToggleButton>
          </Tooltip>
          <Tooltip title="Redo">
            <ToggleButton value="redo" onClick={() => editor.chain().focus().redo().run()}>
              <RedoIcon fontSize="small" />
            </ToggleButton>
          </Tooltip>
        </ToggleButtonGroup>
      </Box>
      <EditorContent editor={editor} />
    </Box>
  );
};

export default RichMarkdownEditor;
