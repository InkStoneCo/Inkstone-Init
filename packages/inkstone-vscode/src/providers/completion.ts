// Autocomplete Provider
// Phase 5.2.1 實作

import * as vscode from 'vscode';
import { extensionStore, getRelativeFilePath } from '../store.js';

/**
 * 筆記自動完成提供者
 * Triggers on [[ to provide note references
 */
export class NoteCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext
  ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
    // Check if we're in a [[ context
    const linePrefix = document.lineAt(position).text.substring(0, position.character);
    if (!linePrefix.includes('[[')) {
      return [];
    }

    // Find the start of the current reference
    const lastBrackets = linePrefix.lastIndexOf('[[');
    if (lastBrackets === -1) {
      return [];
    }

    // Get the text after [[
    const searchText = linePrefix.substring(lastBrackets + 2);

    // Don't complete if already closed
    if (searchText.includes(']]')) {
      return [];
    }

    const items: vscode.CompletionItem[] = [];
    const notes = extensionStore.getAllNotes();
    const currentFile = getRelativeFilePath(document.uri.fsPath);

    // Sort notes: current file first, then by backlink count
    const sortedNotes = [...notes].sort((a, b) => {
      const aInCurrentFile = a.properties.file === currentFile;
      const bInCurrentFile = b.properties.file === currentFile;

      if (aInCurrentFile && !bInCurrentFile) return -1;
      if (!aInCurrentFile && bInCurrentFile) return 1;

      // Sort by backlink count
      return (b.properties.backlink_count || 0) - (a.properties.backlink_count || 0);
    });

    // Add completion items for each note
    for (let i = 0; i < sortedNotes.length; i++) {
      const note = sortedNotes[i]!;

      // Skip if doesn't match search
      if (searchText && !note.displayPath.toLowerCase().includes(searchText.toLowerCase())) {
        continue;
      }

      const item = new vscode.CompletionItem(note.displayPath, vscode.CompletionItemKind.Reference);

      // Insert the full reference with display text
      item.insertText = `${note.properties.id}|${note.displayPath}]]`;

      // Replace from [[ to cursor
      const range = new vscode.Range(
        position.line,
        lastBrackets + 2,
        position.line,
        position.character
      );
      item.range = range;

      // Show note content in detail
      const summary = note.content[0]?.content || 'No content';
      item.detail = `${note.properties.file || 'unknown'} - ${note.properties.author}`;
      item.documentation = new vscode.MarkdownString(
        `**${note.displayPath}**\n\n${summary}\n\n*References: ${note.properties.backlink_count || 0}*`
      );

      // Sort order
      item.sortText = String(i).padStart(5, '0');

      // Highlight notes in current file
      if (note.properties.file === currentFile) {
        item.label = `★ ${note.displayPath}`;
      }

      items.push(item);
    }

    // Add "Create new note" option if searching
    if (searchText && searchText.length > 2) {
      const createItem = new vscode.CompletionItem(
        `Create: "${searchText}"`,
        vscode.CompletionItemKind.Event
      );
      createItem.insertText = `codemind: ${searchText}}}`;
      createItem.range = new vscode.Range(
        position.line,
        lastBrackets,
        position.line,
        position.character
      );
      createItem.detail = 'Create a new Code-Mind note';
      createItem.documentation = new vscode.MarkdownString(
        'Insert a marker to create a new note. The daemon will process this and generate an ID.'
      );
      createItem.sortText = 'zzz'; // Put at end
      items.push(createItem);
    }

    return items;
  }
}
