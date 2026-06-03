import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { PageShell } from '../../shared/components/layout/PageShell';
import { getGuideDocuments, updateGuideDocument } from '../../features/guide/guide.api';
import { colors } from '../../shared/styles/tokens/colors';
import {
  buildGuideTree,
  contentTokens,
  guideDocuments,
  type GuideDocument,
  type GuideTreeNode,
  pageTokens,
  permissionMockConfig,
  treeTokens,
} from './aboutData';
import styles from './AboutPage.module.css';
import { useAdminPermissionMock } from './useAdminPermissionMock';

type VisibleTreeItem = {
  node: GuideTreeNode;
  parentId?: string;
};

type EditableGuideLeafSection = {
  id: string;
  title: string;
  markdown: string;
};

type EditableGuideCategory = {
  id: string;
  title: string;
  sections: EditableGuideLeafSection[];
};

type EditableGuideDocument = {
  id: string;
  title: string;
  categories: EditableGuideCategory[];
};

type GuidePageStatus = 'loading' | 'ready' | 'saving' | 'error' | 'success' | 'empty';

type ParsedSection = {
  title: string;
  lines: string[];
};

type ParsedCategory = {
  title: string;
  sections: ParsedSection[];
};

type ToolbarAction =
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bold'
  | 'italic'
  | 'link'
  | 'image'
  | 'inlineCode'
  | 'codeBlock'
  | 'unorderedList'
  | 'orderedList'
  | 'blockquote';

type ToolbarButtonConfig = {
  action: ToolbarAction;
  label: string;
  title: string;
};

type ToolbarSelectOption = {
  action: ToolbarAction;
  label: string;
};

const structureOptions: ToolbarSelectOption[] = [
  { action: 'heading1', label: 'H1 제목' },
  { action: 'heading2', label: 'H2 제목' },
  { action: 'heading3', label: 'H3 제목' },
];

const insertOptions: ToolbarSelectOption[] = [
  { action: 'link', label: '링크' },
  { action: 'image', label: '이미지' },
  { action: 'codeBlock', label: '코드 블록' },
  { action: 'unorderedList', label: '목록' },
  { action: 'orderedList', label: '번호 목록' },
];

const editorIconButtons: ToolbarButtonConfig[] = [
  { action: 'bold', label: 'B', title: '굵게' },
  { action: 'italic', label: 'I', title: '기울임' },
  { action: 'inlineCode', label: '</>', title: '인라인 코드' },
  { action: 'blockquote', label: '"', title: '인용문' },
];

type ToolbarSelectValue = '' | ToolbarAction;

function sanitizeTree(nodes: GuideTreeNode[], maxDepth: number, currentDepth = 1): GuideTreeNode[] {
  if (currentDepth > maxDepth) {
    return [];
  }

  return nodes.map((node) => ({
    ...node,
    children:
      currentDepth < maxDepth && node.children ? sanitizeTree(node.children, maxDepth, currentDepth + 1) : undefined,
  }));
}

function flattenVisibleTree(nodes: GuideTreeNode[], expandedIds: Set<string>, parentId?: string): VisibleTreeItem[] {
  return nodes.flatMap((node) => {
    const currentItem = { node, parentId };
    const children = node.children && expandedIds.has(node.id)
      ? flattenVisibleTree(node.children, expandedIds, node.id)
      : [];

    return [currentItem, ...children];
  });
}

function findFirstLeafId(nodes: GuideTreeNode[]): string | undefined {
  for (const node of nodes) {
    if (!node.children?.length) {
      return node.targetId ?? node.id;
    }

    const nestedLeafId = findFirstLeafId(node.children);
    if (nestedLeafId) {
      return nestedLeafId;
    }
  }

  return undefined;
}

function collectAncestorIds(nodes: GuideTreeNode[], targetId: string, ancestry: string[] = []): string[] {
  for (const node of nodes) {
    if (node.id === targetId || node.targetId === targetId) {
      return ancestry;
    }

    if (node.children?.length) {
      const nextAncestry = collectAncestorIds(node.children, targetId, [...ancestry, node.id]);

      if (nextAncestry.length > 0) {
        return nextAncestry;
      }
    }
  }

  return [];
}

function isAncestorOfTarget(node: GuideTreeNode, targetId: string): boolean {
  if (!node.children?.length) {
    return false;
  }

  return node.children.some((child) => child.id === targetId || child.targetId === targetId || isAncestorOfTarget(child, targetId));
}

function createEditableDocuments(documents: GuideDocument[]): EditableGuideDocument[] {
  return documents.map((document) => ({
    id: document.id,
    title: document.title,
    categories: document.categories.map((category) => ({
      id: category.id,
      title: category.title,
      sections: category.sections.map((section) => ({
        id: section.id,
        title: section.title,
        markdown: section.body.join('\n\n'),
      })),
    })),
  }));
}

function toGuideTreeDocuments(documents: EditableGuideDocument[]): GuideDocument[] {
  return documents.map((document) => ({
    id: document.id,
    title: document.title,
    categories: document.categories.map((category) => ({
      id: category.id,
      title: category.title,
      sections: category.sections.map((section) => ({
        id: section.id,
        title: section.title,
        body: [section.markdown],
      })),
    })),
  }));
}

function serializeDocumentToMarkdown(document: EditableGuideDocument): string {
  const blocks: string[] = [`# ${document.title}`];

  document.categories.forEach((category) => {
    blocks.push(`## ${category.title}`);

    category.sections.forEach((section) => {
      blocks.push(`### ${section.title}`);
      blocks.push(section.markdown.trim() ? section.markdown : '');
    });
  });

  return blocks.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

function buildDocumentMarkdownMap(documents: EditableGuideDocument[]) {
  return documents.reduce<Record<string, string>>((markdownByDocument, document) => {
    markdownByDocument[document.id] = serializeDocumentToMarkdown(document);
    return markdownByDocument;
  }, {});
}

function slugify(value: string, fallback: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || fallback;
}

function trimBoundaryEmptyLines(lines: string[]) {
  let start = 0;
  let end = lines.length;

  while (start < end && !(lines[start] ?? '').trim()) {
    start += 1;
  }

  while (end > start && !(lines[end - 1] ?? '').trim()) {
    end -= 1;
  }

  return lines.slice(start, end);
}

function parseMarkdownToDocument(existingDocument: EditableGuideDocument, markdown: string): EditableGuideDocument {
  const lines = markdown.split(/\r?\n/);
  const parsedCategories: ParsedCategory[] = [];
  let nextTitle = existingDocument.title;
  let currentCategory: ParsedCategory | undefined;
  let currentSection: ParsedSection | undefined;
  let isInCodeBlock = false;

  function ensureCategory() {
    if (!currentCategory) {
      currentCategory = {
        title: existingDocument.categories[parsedCategories.length]?.title ?? '새 섹션',
        sections: [],
      };
      parsedCategories.push(currentCategory);
    }

    return currentCategory;
  }

  function ensureSection() {
    const category = ensureCategory();

    if (!currentSection) {
      const categoryIndex = parsedCategories.length - 1;
      currentSection = {
        title: existingDocument.categories[categoryIndex]?.sections[category.sections.length]?.title ?? '새 항목',
        lines: [],
      };
      category.sections.push(currentSection);
    }

    return currentSection;
  }

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (line.startsWith('```')) {
      ensureSection().lines.push(rawLine);
      isInCodeBlock = !isInCodeBlock;
      return;
    }

    if (!isInCodeBlock) {
      if (/^#\s+/.test(line) && !/^##\s+/.test(line)) {
        nextTitle = line.replace(/^#\s+/, '').trim() || existingDocument.title;
        currentCategory = undefined;
        currentSection = undefined;
        return;
      }

      if (/^##\s+/.test(line) && !/^###\s+/.test(line)) {
        currentCategory = {
          title: line.replace(/^##\s+/, '').trim() || `섹션 ${parsedCategories.length + 1}`,
          sections: [],
        };
        parsedCategories.push(currentCategory);
        currentSection = undefined;
        return;
      }

      if (/^###\s+/.test(line)) {
        const category = ensureCategory();
        currentSection = {
          title: line.replace(/^###\s+/, '').trim() || `항목 ${category.sections.length + 1}`,
          lines: [],
        };
        category.sections.push(currentSection);
        return;
      }
    }

    ensureSection().lines.push(rawLine);
  });

  const normalizedCategories = (parsedCategories.length > 0 ? parsedCategories : existingDocument.categories.map((category) => ({
    title: category.title,
    sections: category.sections.map((section) => ({
      title: section.title,
      lines: [section.markdown],
    })),
  }))).map((category, categoryIndex) => ({
    id: existingDocument.categories[categoryIndex]?.id ?? slugify(category.title, `category-${categoryIndex + 1}`),
    title: category.title,
    sections: (category.sections.length > 0 ? category.sections : [{
      title: existingDocument.categories[categoryIndex]?.sections[0]?.title ?? '새 항목',
      lines: [],
    }]).map((section, sectionIndex) => ({
      id:
        existingDocument.categories[categoryIndex]?.sections[sectionIndex]?.id
        ?? slugify(section.title, `section-${categoryIndex + 1}-${sectionIndex + 1}`),
      title: section.title,
      markdown: trimBoundaryEmptyLines(section.lines).join('\n').trim(),
    })),
  }));

  return {
    id: existingDocument.id,
    title: nextTitle,
    categories: normalizedCategories,
  };
}

function findDocumentIdByLeafId(documents: EditableGuideDocument[], leafId: string) {
  for (const document of documents) {
    for (const category of document.categories) {
      for (const section of category.sections) {
        if (section.id === leafId) {
          return document.id;
        }
      }
    }
  }

  return undefined;
}

function findFirstLeafIdInDocument(document?: EditableGuideDocument) {
  if (!document) {
    return undefined;
  }

  for (const category of document.categories) {
    for (const section of category.sections) {
      return section.id;
    }
  }

  return undefined;
}

function findFirstLeafIdInDocuments(documents: EditableGuideDocument[]) {
  for (const document of documents) {
    const leafId = findFirstLeafIdInDocument(document);
    if (leafId) {
      return leafId;
    }
  }

  return undefined;
}

function stripPrefix(line: string, pattern: RegExp) {
  return line.replace(pattern, '').trim();
}

function normalizeListLine(line: string) {
  return line.replace(/^[-*+]\s+/, '').replace(/^\d+\.\s+/, '').trim();
}

function applyTextReplacement(
  textarea: HTMLTextAreaElement,
  buildNextValue: (selectedText: string) => { text: string; selectionStart?: number; selectionEnd?: number },
) {
  const value = textarea.value;
  const selectionStart = textarea.selectionStart;
  const selectionEnd = textarea.selectionEnd;
  const selectedText = value.slice(selectionStart, selectionEnd);
  const nextSelection = buildNextValue(selectedText);
  const nextValue = `${value.slice(0, selectionStart)}${nextSelection.text}${value.slice(selectionEnd)}`;

  return {
    nextValue,
    selectionStart: typeof nextSelection.selectionStart === 'number'
      ? selectionStart + nextSelection.selectionStart
      : selectionStart,
    selectionEnd: typeof nextSelection.selectionEnd === 'number'
      ? selectionStart + nextSelection.selectionEnd
      : selectionStart + nextSelection.text.length,
  };
}

function renderMarkdownPreview(markdown: string, paragraphClassName?: string): ReactNode {
  if (!markdown.trim()) {
    return <p className={styles.previewEmpty}>표시할 미리보기 내용이 없습니다.</p>;
  }

  const markdownComponents: Components = {
    h1: ({ children }) => <h2 className={styles.previewHeadingLarge}>{children}</h2>,
    h2: ({ children }) => <h3 className={styles.previewHeadingMedium}>{children}</h3>,
    h3: ({ children }) => <h4 className={styles.previewHeadingSmall}>{children}</h4>,
    p: ({ children }) => <p className={paragraphClassName ?? styles.markdownParagraph}>{children}</p>,
    a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className={styles.markdownLink}>{children}</a>,
    strong: ({ children }) => <strong className={styles.markdownStrong}>{children}</strong>,
    em: ({ children }) => <em className={styles.markdownEmphasis}>{children}</em>,
    ul: ({ children }) => <ul className={styles.previewList}>{children}</ul>,
    ol: ({ children }) => <ol className={styles.previewOrderedList}>{children}</ol>,
    li: ({ children }) => <li className={styles.previewListItem}>{children}</li>,
    img: ({ src, alt }) => <img src={src ?? ''} alt={alt ?? ''} loading="lazy" className={styles.markdownImage} />,
  };

  return (
    <div className={styles.markdownContent}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={styles.treeIcon} aria-hidden="true">
      <path
        d={expanded ? 'm6 14 6-6 6 6' : 'm9 6 6 6-6 6'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AboutPage() {
  const { isAdmin } = useAdminPermissionMock();
  const initialDocuments = useMemo(() => createEditableDocuments(guideDocuments), []);
  const [savedDocuments, setSavedDocuments] = useState<EditableGuideDocument[]>(initialDocuments);
  const [draftMarkdownByDocument, setDraftMarkdownByDocument] = useState<Record<string, string>>(() => buildDocumentMarkdownMap(initialDocuments));
  const [isEditMode, setIsEditMode] = useState(false);
  const [isEditorHelpOpen, setIsEditorHelpOpen] = useState(false);
  const [isGuideMenuOpen, setIsGuideMenuOpen] = useState(false);
  const [pageStatus, setPageStatus] = useState<GuidePageStatus>('loading');
  const [statusMessage, setStatusMessage] = useState('');

  const sanitizedTree = useMemo(
    () => sanitizeTree(buildGuideTree(toGuideTreeDocuments(savedDocuments)), treeTokens.maxDepth),
    [savedDocuments],
  );

  const defaultLeafId = useMemo(
    () => findFirstLeafIdInDocuments(savedDocuments) ?? findFirstLeafId(sanitizedTree),
    [savedDocuments, sanitizedTree],
  );

  const [activeLeafId, setActiveLeafId] = useState(defaultLeafId ?? '');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(defaultLeafId ? collectAncestorIds(sanitizedTree, defaultLeafId) : []));
  const treeItemRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());
  const sectionRefs = useRef<Map<string, HTMLElement | null>>(new Map());
  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  const activeDocumentId = useMemo(
    () => (activeLeafId ? findDocumentIdByLeafId(savedDocuments, activeLeafId) : undefined) ?? savedDocuments[0]?.id,
    [activeLeafId, savedDocuments],
  );

  const activeSavedDocument = useMemo(
    () => savedDocuments.find((document) => document.id === activeDocumentId),
    [activeDocumentId, savedDocuments],
  );

  const activeDraftMarkdown = useMemo(
    () => (activeDocumentId ? draftMarkdownByDocument[activeDocumentId] : undefined)
      ?? (activeSavedDocument ? serializeDocumentToMarkdown(activeSavedDocument) : ''),
    [activeDocumentId, activeSavedDocument, draftMarkdownByDocument],
  );

  const editorLineCount = useMemo(
    () => (activeDraftMarkdown ? activeDraftMarkdown.split(/\r?\n/).length : 0),
    [activeDraftMarkdown],
  );

  const editorCharacterCount = activeDraftMarkdown.length;

  useEffect(() => {
    let isMounted = true;

    async function loadGuideDocuments() {
      try {
        const documents = await getGuideDocuments();

        if (!isMounted) {
          return;
        }

        if (!documents.length) {
          setSavedDocuments([]);
          setDraftMarkdownByDocument({});
          setPageStatus('empty');
          setStatusMessage('');
          return;
        }

        const nextDocuments = createEditableDocuments(documents);
        const nextLeafId = findFirstLeafIdInDocuments(nextDocuments);

        setSavedDocuments(nextDocuments);
        setDraftMarkdownByDocument(buildDocumentMarkdownMap(nextDocuments));
        if (nextLeafId) {
          setActiveLeafId(nextLeafId);
        }
        setPageStatus('ready');
        setStatusMessage('');
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPageStatus('error');
        setStatusMessage(error instanceof Error ? error.message : '가이드 문서를 불러오지 못했습니다.');
      }
    }

    void loadGuideDocuments();

    return () => {
      isMounted = false;
    };
  }, []);

  function handleStructureSelectChange(nextValue: ToolbarSelectValue) {
    if (!nextValue) {
      return;
    }

    applyToolbarAction(nextValue);
  }

  function handleInsertSelectChange(nextValue: ToolbarSelectValue) {
    if (!nextValue) {
      return;
    }

    applyToolbarAction(nextValue);
  }

  useEffect(() => {
    if (!activeLeafId) {
      return;
    }

    const nextAncestorIds = collectAncestorIds(sanitizedTree, activeLeafId);
    setExpandedIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextAncestorIds.forEach((id) => nextIds.add(id));
      return nextIds;
    });
  }, [activeLeafId, sanitizedTree]);

  useEffect(() => {
    if (!activeLeafId && defaultLeafId) {
      setActiveLeafId(defaultLeafId);
    }
  }, [activeLeafId, defaultLeafId]);

  const visibleTreeItems = useMemo(
    () => flattenVisibleTree(sanitizedTree, expandedIds),
    [expandedIds, sanitizedTree],
  );

  const pageStyle = {
    '--about-page-background': pageTokens.colors.pageBackground,
    '--about-sidebar-background': pageTokens.colors.sidebarBackground,
    '--about-content-background': pageTokens.colors.contentBackground,
    '--about-sidebar-width': `${pageTokens.layout.sidebarWidth}px`,
    '--about-content-padding-top': `${pageTokens.layout.contentPaddingTop}px`,
    '--about-content-padding-bottom': `${pageTokens.layout.contentPaddingBottom}px`,
    '--about-content-padding-inline': `${pageTokens.layout.contentPaddingInline}px`,
    '--about-tree-item-height': `${treeTokens.itemHeights[1]}px`,
    '--about-tree-item-padding-x': `${treeTokens.itemPaddingX}px`,
    '--about-tree-icon-size': `${treeTokens.iconSize}px`,
    '--about-tree-text-size': `${treeTokens.textSize}px`,
    '--about-tree-indent-1': `${treeTokens.indent[1]}px`,
    '--about-tree-indent-2': `${treeTokens.indent[2]}px`,
    '--about-tree-indent-3': `${treeTokens.indent[3]}px`,
    '--about-tree-default-background': treeTokens.state.default.background,
    '--about-tree-default-border': treeTokens.state.default.border,
    '--about-tree-default-text': treeTokens.state.default.text,
    '--about-tree-hover-background': treeTokens.state.hover.background,
    '--about-tree-hover-border': treeTokens.state.hover.border,
    '--about-tree-hover-text': treeTokens.state.hover.text,
    '--about-tree-pressed-background': treeTokens.state.pressed.background,
    '--about-tree-pressed-border': treeTokens.state.pressed.border,
    '--about-tree-pressed-text': treeTokens.state.pressed.text,
    '--about-tree-active-parent-background': treeTokens.state.activeParent.background,
    '--about-tree-active-parent-border': treeTokens.state.activeParent.border,
    '--about-tree-active-parent-text': treeTokens.state.activeParent.text,
    '--about-tree-active-leaf-background': treeTokens.state.activeLeaf.background,
    '--about-tree-active-leaf-border': treeTokens.state.activeLeaf.border,
    '--about-tree-active-leaf-text': treeTokens.state.activeLeaf.text,
    '--about-tree-focus-ring': treeTokens.state.activeLeaf.border,
    '--about-h1-size': `${contentTokens.heading1.fontSize}px`,
    '--about-h1-weight': contentTokens.heading1.fontWeight,
    '--about-h2-size': `${contentTokens.heading2.fontSize}px`,
    '--about-h2-weight': contentTokens.heading2.fontWeight,
    '--about-h3-size': `${contentTokens.heading3.fontSize}px`,
    '--about-h3-weight': contentTokens.heading3.fontWeight,
    '--about-content-section-gap': `${contentTokens.sectionGap}px`,
    '--about-edit-button-width': `${contentTokens.editButton.width}px`,
    '--about-edit-button-height': `${contentTokens.editButton.height}px`,
    '--about-edit-button-radius': `${contentTokens.editButton.radius}px`,
    '--about-edit-button-border': contentTokens.editButton.borderColor,
    '--about-editor-split-gap': `${contentTokens.editor.splitGap}px`,
    '--about-editor-panel-padding': `${contentTokens.editor.panelPadding}px`,
    '--about-editor-min-height': `${contentTokens.editor.minHeight}px`,
    '--about-editor-border': contentTokens.editor.borderColor,
    '--about-editor-background': contentTokens.editor.background,
    '--about-editor-textarea-background': contentTokens.editor.textareaBackground,
    '--about-editor-toolbar-gap': `${contentTokens.editor.toolbarGap}px`,
    '--about-editor-toolbar-button-height': `${contentTokens.editor.toolbarButtonHeight}px`,
    '--about-editor-toolbar-button-min-width': `${contentTokens.editor.toolbarButtonMinWidth}px`,
    '--about-editor-control-radius': `${contentTokens.editor.controlRadius}px`,
    '--about-content-paragraph': colors.text.secondary,
  } as CSSProperties;

  function toggleExpanded(nodeId: string) {
    setExpandedIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(nodeId)) {
        nextIds.delete(nodeId);
      } else {
        nextIds.add(nodeId);
      }

      return nextIds;
    });
  }

  function focusTreeItem(nodeId: string) {
    treeItemRefs.current.get(nodeId)?.focus();
  }

  function scrollToLeaf(targetId: string) {
    sectionRefs.current.get(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleTreeAction(node: GuideTreeNode) {
    if (node.children?.length) {
      toggleExpanded(node.id);
      return;
    }

    const targetId = node.targetId ?? node.id;
    setActiveLeafId(targetId);
    setIsGuideMenuOpen(false);

    if (!isEditMode) {
      scrollToLeaf(targetId);
    }
  }

  function handleEditorMarkdownChange(nextMarkdown: string) {
    if (!activeDocumentId) {
      return;
    }

    setDraftMarkdownByDocument((currentState) => ({
      ...currentState,
      [activeDocumentId]: nextMarkdown,
    }));
  }

  function applyToolbarAction(action: ToolbarAction) {
    const textarea = editorRef.current;

    if (!textarea || !activeDocumentId) {
      return;
    }

    const replacement = applyTextReplacement(textarea, (selectedText) => {
      const fallbackText = selectedText || '텍스트';

      switch (action) {
        case 'heading1': {
          const lines = (selectedText || '1Depth 제목').split(/\r?\n/).map((line) => `# ${stripPrefix(line, /^#{1,3}\s+/) || '1Depth 제목'}`);
          return { text: lines.join('\n') };
        }
        case 'heading2': {
          const lines = (selectedText || '2Depth 제목').split(/\r?\n/).map((line) => `## ${stripPrefix(line, /^#{1,3}\s+/) || '2Depth 제목'}`);
          return { text: lines.join('\n') };
        }
        case 'heading3': {
          const lines = (selectedText || '3Depth 제목').split(/\r?\n/).map((line) => `### ${stripPrefix(line, /^#{1,3}\s+/) || '3Depth 제목'}`);
          return { text: lines.join('\n') };
        }
        case 'bold': {
          return {
            text: `**${fallbackText}**`,
            selectionStart: 2,
            selectionEnd: 2 + fallbackText.length,
          };
        }
        case 'italic': {
          return {
            text: `*${fallbackText}*`,
            selectionStart: 1,
            selectionEnd: 1 + fallbackText.length,
          };
        }
        case 'link': {
          const href = window.prompt('링크 URL을 입력하세요.', 'https://');
          if (!href) {
            return { text: selectedText };
          }
          const label = selectedText || window.prompt('링크 텍스트를 입력하세요.', '링크') || '링크';
          return {
            text: `[${label}](${href})`,
            selectionStart: 1,
            selectionEnd: 1 + label.length,
          };
        }
        case 'image': {
          const src = window.prompt('이미지 URL을 입력하세요.', 'https://');
          if (!src) {
            return { text: selectedText };
          }
          const alt = window.prompt('대체 텍스트를 입력하세요.', '이미지') || '이미지';
          return { text: `![${alt}](${src})` };
        }
        case 'inlineCode': {
          return {
            text: `\`${fallbackText}\``,
            selectionStart: 1,
            selectionEnd: 1 + fallbackText.length,
          };
        }
        case 'codeBlock': {
          const blockText = selectedText || 'const example = true;';
          return {
            text: `\`\`\`\n${blockText}\n\`\`\``,
            selectionStart: 4,
            selectionEnd: 4 + blockText.length,
          };
        }
        case 'unorderedList': {
          const lines = (selectedText || '항목 1\n항목 2')
            .split(/\r?\n/)
            .filter((line) => line.trim())
            .map((line) => `- ${normalizeListLine(line)}`);
          return { text: lines.join('\n') };
        }
        case 'orderedList': {
          const lines = (selectedText || '항목 1\n항목 2')
            .split(/\r?\n/)
            .filter((line) => line.trim())
            .map((line, index) => `${index + 1}. ${normalizeListLine(line)}`);
          return { text: lines.join('\n') };
        }
        case 'blockquote': {
          const lines = (selectedText || '인용문').split(/\r?\n/).map((line) => `> ${line.replace(/^>\s?/, '').trim() || '인용문'}`);
          return { text: lines.join('\n') };
        }
        default:
          return { text: selectedText };
      }
    });

    handleEditorMarkdownChange(replacement.nextValue);
    requestAnimationFrame(() => {
      editorRef.current?.focus();
      editorRef.current?.setSelectionRange(replacement.selectionStart, replacement.selectionEnd);
    });
  }

  function handleStartEditing() {
    setDraftMarkdownByDocument(buildDocumentMarkdownMap(savedDocuments));
    setIsEditorHelpOpen(false);
    setIsEditMode(true);
  }

  function handleCancelEditing() {
    setDraftMarkdownByDocument(buildDocumentMarkdownMap(savedDocuments));
    setIsEditorHelpOpen(false);
    setIsEditMode(false);
  }

  async function handleApplyEditing() {
    const nextDocuments = savedDocuments.map((document) => {
      const nextMarkdown = draftMarkdownByDocument[document.id] ?? serializeDocumentToMarkdown(document);
      return parseMarkdownToDocument(document, nextMarkdown);
    });

    const nextActiveDocument = nextDocuments.find((document) => document.id === activeDocumentId) ?? nextDocuments[0];
    const nextLeafId = findFirstLeafIdInDocument(nextActiveDocument) ?? findFirstLeafIdInDocuments(nextDocuments);

    if (!nextActiveDocument) {
      setPageStatus('empty');
      setStatusMessage('');
      return;
    }

    setPageStatus('saving');
    setStatusMessage('');

    try {
      const savedDocument = await updateGuideDocument({
        slug: nextActiveDocument.id,
        title: nextActiveDocument.title,
        content: nextActiveDocument.categories.map((category) => ({
          id: category.id,
          title: category.title,
          sections: category.sections.map((section) => ({
            id: section.id,
            title: section.title,
            body: [section.markdown],
          })),
        })),
      });

      const editableSavedDocument = createEditableDocuments([savedDocument])[0]!;
      const nextSavedDocuments = nextDocuments.map((document) => (
        document.id === savedDocument.id ? editableSavedDocument : document
      ));

      setSavedDocuments(nextSavedDocuments);
      setDraftMarkdownByDocument(buildDocumentMarkdownMap(nextSavedDocuments));
      if (nextLeafId) {
        setActiveLeafId(nextLeafId);
      }
      setPageStatus('success');
      setStatusMessage('가이드 문서가 저장되었습니다.');
      setIsEditorHelpOpen(false);
      setIsEditMode(false);
    } catch (error) {
      setPageStatus('error');
      setStatusMessage(error instanceof Error ? error.message : '가이드 문서 저장에 실패했습니다.');
    }
  }

  function handleTreeKeyDown(item: VisibleTreeItem, event: ReactKeyboardEvent<HTMLButtonElement>) {
    const currentIndex = visibleTreeItems.findIndex((candidate) => candidate.node.id === item.node.id);

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        const nextItem = visibleTreeItems[currentIndex + 1];
        if (nextItem) {
          focusTreeItem(nextItem.node.id);
        }
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        const previousItem = visibleTreeItems[currentIndex - 1];
        if (previousItem) {
          focusTreeItem(previousItem.node.id);
        }
        break;
      }
      case 'ArrowRight': {
        if (item.node.children?.length) {
          event.preventDefault();
          if (!expandedIds.has(item.node.id)) {
            toggleExpanded(item.node.id);
          } else if (item.node.children[0]) {
            focusTreeItem(item.node.children[0].id);
          }
        }
        break;
      }
      case 'ArrowLeft': {
        if (item.node.children?.length && expandedIds.has(item.node.id)) {
          event.preventDefault();
          toggleExpanded(item.node.id);
          break;
        }

        if (item.parentId) {
          event.preventDefault();
          focusTreeItem(item.parentId);
        }
        break;
      }
      case 'Home': {
        event.preventDefault();
        const firstItem = visibleTreeItems[0];
        if (firstItem) {
          focusTreeItem(firstItem.node.id);
        }
        break;
      }
      case 'End': {
        event.preventDefault();
        const lastItem = visibleTreeItems[visibleTreeItems.length - 1];
        if (lastItem) {
          focusTreeItem(lastItem.node.id);
        }
        break;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        handleTreeAction(item.node);
        break;
      }
      default:
        break;
    }
  }

  function renderTree(nodes: GuideTreeNode[], parentId?: string) {
    return (
      <ul role={parentId ? 'group' : 'tree'} className={parentId ? styles.treeGroup : styles.treeList}>
        {nodes.map((node) => {
          const isParent = Boolean(node.children?.length);
          const isExpanded = isParent ? expandedIds.has(node.id) : false;
          const isLeafActive = !isParent && activeLeafId === (node.targetId ?? node.id);
          const isParentActive = isParent && activeLeafId ? isAncestorOfTarget(node, activeLeafId) : false;

          return (
            <li key={node.id} role="none" className={styles.treeItem}>
              <button
                ref={(element) => {
                  treeItemRefs.current.set(node.id, element);
                }}
                type="button"
                role="treeitem"
                aria-level={node.depth}
                aria-expanded={isParent ? isExpanded : undefined}
                aria-selected={!isParent ? isLeafActive : undefined}
                className={[
                  styles.treeButton,
                  node.depth === 1 ? styles.treeButtonDepth1 : '',
                  node.depth === 2 ? styles.treeButtonDepth2 : '',
                  node.depth === 3 ? styles.treeButtonDepth3 : '',
                  isParentActive ? styles.treeButtonParentActive : '',
                  isLeafActive ? styles.treeButtonLeafActive : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => handleTreeAction(node)}
                onKeyDown={(event) => handleTreeKeyDown({ node, parentId }, event)}
              >
                <span className={styles.treeIconSlot} aria-hidden="true">
                  {isParent ? <Chevron expanded={isExpanded} /> : <span className={styles.treeIconPlaceholder} />}
                </span>
                <span className={styles.treeLabel}>{node.label}</span>
              </button>
              {isParent && isExpanded ? renderTree(node.children ?? [], node.id) : null}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <PageShell>
      <section className={styles.page} style={pageStyle}>
        <button
          type="button"
          className={styles.mobileMenuButton}
          onClick={() => setIsGuideMenuOpen(true)}
          aria-label="가이드 메뉴 열기"
        >
          <span className={styles.mobileMenuIcon} aria-hidden="true" />
        </button>

        {isGuideMenuOpen ? (
          <button
            type="button"
            className={styles.menuBackdrop}
            onClick={() => setIsGuideMenuOpen(false)}
            aria-label="가이드 메뉴 닫기"
          />
        ) : null}

        <aside className={`${styles.sidebar} ${isGuideMenuOpen ? styles.sidebarOpen : ''}`.trim()}>
          <nav className={styles.tree} aria-label="가이드 트리 메뉴">
            {renderTree(sanitizedTree)}
          </nav>
        </aside>

        <div className={styles.content}>
          <div className={styles.contentInner}>
            <div className={styles.contentHeader}>
              {isAdmin && !isEditMode ? (
                <div className={styles.editActions}>
                  <button type="button" className={styles.editButton} onClick={handleStartEditing}>
                    {permissionMockConfig.editLabel}
                  </button>
                </div>
              ) : null}
            </div>

            {pageStatus === 'loading' ? (
              <p className={styles.previewEmpty}>가이드 문서를 불러오는 중입니다.</p>
            ) : null}

            {pageStatus !== 'loading' && statusMessage ? (
              <p className={styles.previewEmpty} role={pageStatus === 'error' ? 'alert' : 'status'}>
                {statusMessage}
              </p>
            ) : null}

            {isEditMode && activeSavedDocument ? (
              <section className={styles.editorWorkspace} aria-label="가이드 문서 편집기">
                <div className={styles.editorTopBar}>
                  <div className={styles.editorTopMeta}>
                    <div className={styles.editorStatusRow}>
                      <span className={styles.editorBadge}>Editing</span>
                      <span className={styles.editorBadgeMuted}>Markdown Workspace</span>
                      <button
                        type="button"
                        className={styles.editorHelpButton}
                        aria-expanded={isEditorHelpOpen}
                        onClick={() => setIsEditorHelpOpen((currentState) => !currentState)}
                      >
                        <span className={styles.editorHelpIcon} aria-hidden="true">?</span>
                        도움말
                      </button>
                    </div>
                  </div>

                  <div className={styles.editorTopActions}>
                    <div className={styles.editorMetrics} aria-label="문서 통계">
                      <span className={styles.editorMetric}>줄 {editorLineCount}</span>
                      <span className={styles.editorMetric}>문자 {editorCharacterCount}</span>
                    </div>
                    <div className={styles.editActions}>
                      <button type="button" className={styles.editorActionButtonSecondary} onClick={handleCancelEditing}>
                        취소
                      </button>
                      <button
                        type="button"
                        className={styles.editorActionButtonPrimary}
                        onClick={handleApplyEditing}
                        disabled={pageStatus === 'saving'}
                      >
                        {pageStatus === 'saving' ? '저장 중' : '적용'}
                      </button>
                    </div>
                  </div>
                </div>

                {isEditorHelpOpen ? (
                  <div className={styles.editorHelpPanel} role="note" aria-label="편집 도움말">
                    <p className={styles.editorHelpText}>현재 선택된 1depth 문서 전체를 하나의 markdown 문서로 편집합니다.</p>
                    <p className={styles.editorHelpText}>저장 시 # / ## / ### 구조를 다시 1depth / 2depth / 3depth 데이터로 변환합니다.</p>
                  </div>
                ) : null}

                <div className={styles.editorLayout}>
                  <div className={styles.editorPanel}>
                    <div className={styles.editorSurfaceHeader}>
                      <div className={styles.editorPanelHeader}>
                        <p className={styles.editorEyebrow}>Writing</p>
                        <h3 className={styles.editorTitle}>문서 작성 캔버스</h3>
                      </div>

                      <div className={styles.editorToolbar} role="toolbar" aria-label="문서 서식 도구">
                        <label className={styles.editorToolbarSelectWrap}>
                          <span className={styles.editorToolbarSelectLabel}>서식</span>
                          <select
                            className={styles.editorToolbarSelect}
                            value=""
                            onChange={(event) => handleStructureSelectChange(event.target.value as ToolbarSelectValue)}
                            aria-label="제목 서식 선택"
                          >
                            <option value="">서식</option>
                            {structureOptions.map((option) => (
                              <option key={option.action} value={option.action}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className={styles.editorToolbarIconGroup}>
                          {editorIconButtons.map((button) => (
                            <button
                              key={button.action}
                              type="button"
                              className={styles.editorToolbarIconButton}
                              title={button.title}
                              aria-label={button.title}
                              onClick={() => applyToolbarAction(button.action)}
                            >
                              {button.label}
                            </button>
                          ))}
                        </div>

                        <label className={styles.editorToolbarSelectWrap}>
                          <span className={styles.editorToolbarSelectLabel}>삽입</span>
                          <select
                            className={styles.editorToolbarSelect}
                            value=""
                            onChange={(event) => handleInsertSelectChange(event.target.value as ToolbarSelectValue)}
                            aria-label="삽입 도구 선택"
                          >
                            <option value="">삽입</option>
                            {insertOptions.map((option) => (
                              <option key={option.action} value={option.action}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>

                    <div className={styles.editorCanvasWrap}>
                      <label htmlFor="about-document-editor" className={styles.editorLabel}>
                        1depth 문서 전체 편집
                      </label>
                      <textarea
                        id="about-document-editor"
                        ref={editorRef}
                        className={styles.editorTextarea}
                        value={activeDraftMarkdown}
                        onChange={(event) => handleEditorMarkdownChange(event.target.value)}
                        placeholder="# 제목을 입력하고 내용을 작성해보세요"
                        spellCheck={false}
                      />
                    </div>
                  </div>

                  <div className={styles.previewPanel} aria-live="polite">
                    <div className={styles.editorSurfaceHeader}>
                      <div className={styles.editorPanelHeader}>
                        <p className={styles.editorEyebrow}>Preview</p>
                        <h3 className={styles.editorTitle}>라이브 미리보기</h3>
                        <p className={styles.editorHint}>작성 중인 문서가 실제 가이드 본문에서 어떤 리듬으로 보이는지 바로 확인할 수 있습니다.</p>
                      </div>

                      <div className={styles.previewMetaCard}>
                        <span className={styles.previewMetaLabel}>문서</span>
                        <strong className={styles.previewMetaTitle}>{activeSavedDocument.title}</strong>
                      </div>
                    </div>

                    <div className={styles.previewContent}>
                      {renderMarkdownPreview(activeDraftMarkdown, styles.paragraph)}
                    </div>
                  </div>
                </div>
              </section>
            ) : activeSavedDocument ? (
              <div className={styles.document}>
                <section key={activeSavedDocument.id} className={styles.documentSection} aria-labelledby={`${activeSavedDocument.id}-title`}>
                  <h1 id={`${activeSavedDocument.id}-title`} className={styles.documentTitle}>
                    {activeSavedDocument.title}
                  </h1>

                  {activeSavedDocument.categories.map((category) => (
                    <section key={category.id} className={styles.categorySection} aria-labelledby={`${category.id}-title`}>
                      <h2 id={`${category.id}-title`} className={styles.categoryTitle}>
                        {category.title}
                      </h2>

                      {category.sections.map((section) => (
                        <section
                          key={section.id}
                          id={section.id}
                          ref={(element) => {
                            sectionRefs.current.set(section.id, element);
                          }}
                          className={styles.leafSection}
                          aria-labelledby={`${section.id}-title`}
                        >
                          <h3 id={`${section.id}-title`} className={styles.leafTitle}>
                            {section.title}
                          </h3>
                          {renderMarkdownPreview(section.markdown, styles.paragraph)}
                        </section>
                      ))}
                    </section>
                  ))}
                </section>
              </div>
            ) : (
              <p className={styles.previewEmpty}>표시할 문서가 없습니다.</p>
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
