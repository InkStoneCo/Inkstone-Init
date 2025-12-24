// Reference Provider
// Phase 5.2.5 實作

import * as vscode from 'vscode';
import {
  getNoteReferenceAtPosition,
  findNoteReferences,
  getNoteDefinitionLocation,
} from '../store.js';

/**
 * 筆記引用提供者 (Shift+F12)
 * Shows all references to a note in the workspace
 */
export class NoteReferenceProvider implements vscode.ReferenceProvider {
  async provideReferences(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.ReferenceContext,
    _token: vscode.CancellationToken
  ): Promise<vscode.Location[]> {
    // Check if we're on a note reference
    const ref = getNoteReferenceAtPosition(document, position);
    if (!ref) {
      return [];
    }

    // Find all references in the workspace
    const locations = await findNoteReferences(ref.id);

    // Include the definition location if requested
    if (context.includeDeclaration) {
      const defLocation = await getNoteDefinitionLocation(ref.id);
      if (defLocation) {
        // Add at the beginning
        locations.unshift(defLocation);
      }
    }

    return locations;
  }
}
