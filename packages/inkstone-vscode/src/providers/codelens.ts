// CodeLens Provider
// Phase 5.2.3 實作

import * as vscode from 'vscode';
import { extensionStore, NOTE_REFERENCE_PATTERN } from '../store.js';
import type { NoteId } from '@inkstone/codemind-core';

/**
 * 筆記 CodeLens 提供者
 * Shows reference count above note references
 */
export class NoteCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  constructor() {
    // Refresh code lenses when store changes
    extensionStore.onDidChange(() => {
      this._onDidChangeCodeLenses.fire();
    });
  }

  provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();
    const pattern = new RegExp(NOTE_REFERENCE_PATTERN.source, 'g');
    const seenIds = new Set<string>();
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const noteId = match[1] as NoteId;

      // Only show one CodeLens per note ID per document
      if (seenIds.has(noteId)) {
        continue;
      }
      seenIds.add(noteId);

      const pos = document.positionAt(match.index);
      const range = new vscode.Range(pos, pos);

      // Get note info
      const note = extensionStore.getNote(noteId);
      const backlinks = extensionStore.getBacklinks(noteId);

      // Debug logging
      const allNotes = extensionStore.getAllNotes();
      console.log(`[CodeLens] Looking for ${noteId}, store has ${allNotes.length} notes, found: ${!!note}`);

      if (note) {
        // Create CodeLens with reference count
        const lens = new vscode.CodeLens(range, {
          title: `${backlinks.length} reference${backlinks.length === 1 ? '' : 's'}`,
          command: 'codemind.findReferences',
          arguments: [noteId],
          tooltip: `Show all references to ${note.displayPath}`,
        });
        codeLenses.push(lens);

        // Add go to definition lens
        const defLens = new vscode.CodeLens(range, {
          title: '↗ Definition',
          command: 'codemind.goToNote',
          arguments: [noteId],
          tooltip: `Go to definition of ${note.displayPath}`,
        });
        codeLenses.push(defLens);
      } else {
        // Note not found
        const lens = new vscode.CodeLens(range, {
          title: '⚠ Note not found',
          command: '',
          tooltip: `Note ${noteId} does not exist in codemind.md`,
        });
        codeLenses.push(lens);
      }
    }

    return codeLenses;
  }
}
