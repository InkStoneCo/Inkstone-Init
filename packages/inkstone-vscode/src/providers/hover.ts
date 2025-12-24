// Hover Provider
// Phase 5.2.2 實作

import * as vscode from 'vscode';
import { extensionStore, getNoteReferenceAtPosition } from '../store.js';
import type { NoteId } from '@inkstone/codemind-core';

/**
 * Simple cache for hover content
 */
const hoverCache = new Map<string, { content: vscode.MarkdownString; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

/**
 * 筆記懸停提供者
 * Shows note preview on hover over [[cm.xxx]] references
 */
export class NoteHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    // Check if we're hovering over a note reference
    const ref = getNoteReferenceAtPosition(document, position);
    if (!ref) {
      return null;
    }

    // Check cache
    const cached = hoverCache.get(ref.id);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return new vscode.Hover(cached.content, ref.range);
    }

    // Get the note
    const note = extensionStore.getNote(ref.id);
    if (!note) {
      const notFound = new vscode.MarkdownString(
        `**Note not found:** \`${ref.id}\`\n\n*This note ID does not exist in codemind.md*`
      );
      return new vscode.Hover(notFound, ref.range);
    }

    // Build hover content
    const content = buildHoverContent(ref.id, note);

    // Cache the content
    hoverCache.set(ref.id, { content, timestamp: Date.now() });

    return new vscode.Hover(content, ref.range);
  }
}

/**
 * Build the hover markdown content for a note
 */
function buildHoverContent(
  id: NoteId,
  note: {
    displayPath: string;
    properties: {
      file?: string;
      line?: number;
      author?: string;
      created?: string;
      backlink_count?: number;
    };
    content: Array<{ content: string; indent: number }>;
  }
): vscode.MarkdownString {
  const md = new vscode.MarkdownString();
  md.isTrusted = true;
  md.supportHtml = true;

  // Header
  md.appendMarkdown(`### 📝 ${note.displayPath}\n\n`);

  // Properties
  md.appendMarkdown('| Property | Value |\n|---|---|\n');
  md.appendMarkdown(`| **ID** | \`${id}\` |\n`);
  if (note.properties.file) {
    md.appendMarkdown(`| **File** | ${note.properties.file} |\n`);
  }
  if (note.properties.line) {
    md.appendMarkdown(`| **Line** | ${note.properties.line} |\n`);
  }
  if (note.properties.author) {
    md.appendMarkdown(`| **Author** | ${note.properties.author} |\n`);
  }
  if (note.properties.created) {
    md.appendMarkdown(`| **Created** | ${note.properties.created} |\n`);
  }
  md.appendMarkdown('\n');

  // Content preview (first few lines)
  if (note.content.length > 0) {
    md.appendMarkdown('**Content:**\n\n');
    const maxLines = 5;
    const lines = note.content.slice(0, maxLines);
    for (const line of lines) {
      const indent = '  '.repeat(line.indent);
      md.appendMarkdown(`${indent}- ${line.content}\n`);
    }
    if (note.content.length > maxLines) {
      md.appendMarkdown(`\n*... and ${note.content.length - maxLines} more lines*\n`);
    }
    md.appendMarkdown('\n');
  }

  // Backlinks info
  const backlinks = extensionStore.getBacklinks(id);
  if (backlinks.length > 0) {
    md.appendMarkdown(`**Referenced by:** ${backlinks.length} note(s)\n\n`);
    const maxBacklinks = 3;
    for (const bl of backlinks.slice(0, maxBacklinks)) {
      md.appendMarkdown(`- \`[[${bl.properties.id}]]\` ${bl.displayPath}\n`);
    }
    if (backlinks.length > maxBacklinks) {
      md.appendMarkdown(`- *... and ${backlinks.length - maxBacklinks} more*\n`);
    }
  } else {
    md.appendMarkdown('**No references** (orphan note)\n');
  }

  // Actions
  md.appendMarkdown('\n---\n');
  md.appendMarkdown(
    `[Go to Definition](command:codemind.goToNote?${encodeURIComponent(JSON.stringify(id))}) | `
  );
  md.appendMarkdown(
    `[Find References](command:codemind.findReferences?${encodeURIComponent(JSON.stringify(id))})`
  );

  return md;
}

/**
 * Clear the hover cache
 */
export function clearHoverCache(): void {
  hoverCache.clear();
}
