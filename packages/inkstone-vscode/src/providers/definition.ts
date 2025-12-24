// Definition Provider
// Phase 5.2.4 實作

import * as vscode from 'vscode';
import { getNoteReferenceAtPosition, getNoteDefinitionLocation } from '../store.js';

/**
 * 筆記定義提供者 (F12 跳轉)
 * Navigates to the note definition in codemind.md
 */
export class NoteDefinitionProvider implements vscode.DefinitionProvider {
  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): Promise<vscode.Definition | vscode.LocationLink[] | null> {
    // Check if we're on a note reference
    const ref = getNoteReferenceAtPosition(document, position);
    if (!ref) {
      return null;
    }

    // Get the definition location
    const location = await getNoteDefinitionLocation(ref.id);
    if (!location) {
      vscode.window.showWarningMessage(`Note definition not found: ${ref.id}`);
      return null;
    }

    return location;
  }
}
