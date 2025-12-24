// Shared Store module for VSCode extension
// Phase 5.1 實作

import * as vscode from 'vscode';
import * as path from 'path';
import { createNoteStore, type NoteStore, type Note, type NoteId, type NoteProperties } from '@inkstone/codemind-core';

/**
 * Extension store manager
 * Provides a singleton NoteStore instance for all providers
 */
class ExtensionStore {
  private store: NoteStore | null = null;
  private codemindPath: string | null = null;
  private watcher: vscode.FileSystemWatcher | null = null;
  private _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChange = this._onDidChange.event;

  /**
   * Initialize the store with the workspace codemind.md path
   */
  async initialize(): Promise<boolean> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return false;
    }

    // Find codemind.md in workspace
    for (const folder of workspaceFolders) {
      const codemindPath = path.join(folder.uri.fsPath, 'codemind.md');
      try {
        await vscode.workspace.fs.stat(vscode.Uri.file(codemindPath));
        this.codemindPath = codemindPath;
        break;
      } catch {
        // File doesn't exist, try next folder
      }
    }

    if (!this.codemindPath) {
      return false;
    }

    // Create the NoteStore
    this.store = createNoteStore(this.codemindPath, { autoSave: true });

    // Debug: log loaded notes
    const allNotes = this.store.getAllNotes();
    console.log(`[ExtensionStore] Initialized with ${allNotes.length} notes from ${this.codemindPath}`);
    if (allNotes.length > 0) {
      console.log(`[ExtensionStore] First 3 note IDs:`, allNotes.slice(0, 3).map(n => n.properties.id));
    }

    // Watch for changes to codemind.md
    this.watcher = vscode.workspace.createFileSystemWatcher(this.codemindPath);
    this.watcher.onDidChange(() => this.reload());
    this.watcher.onDidCreate(() => this.reload());
    this.watcher.onDidDelete(() => this.dispose());

    return true;
  }

  /**
   * Reload the store
   */
  reload(): void {
    if (this.codemindPath) {
      this.store = createNoteStore(this.codemindPath, { autoSave: true });
      this._onDidChange.fire();
    }
  }

  /**
   * Get the NoteStore instance
   */
  getStore(): NoteStore | null {
    return this.store;
  }

  /**
   * Get the codemind.md path
   */
  getCodemindPath(): string | null {
    return this.codemindPath;
  }

  /**
   * Get all notes
   */
  getAllNotes(): Note[] {
    return this.store?.getAllNotes() || [];
  }

  /**
   * Get a note by ID
   */
  getNote(id: NoteId): Note | null {
    return this.store?.getNote(id) || null;
  }

  /**
   * Get notes in a specific file
   */
  getNotesInFile(filePath: string): Note[] {
    return this.store?.getNotesInFile(filePath) || [];
  }

  /**
   * Get backlinks for a note
   */
  getBacklinks(id: NoteId): Note[] {
    return this.store?.getBacklinks(id) || [];
  }

  /**
   * Search notes
   */
  search(query: string, limit: number = 20) {
    return this.store?.search(query, limit) || [];
  }

  /**
   * Add a new note
   */
  addNote(file: string, content: string, parentId?: NoteId): Note | null {
    const note = this.store?.addNote(file, content, parentId);
    if (note) {
      this._onDidChange.fire();
    }
    return note || null;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.watcher?.dispose();
    this.watcher = null;
    this.store = null;
    this.codemindPath = null;
  }
}

// Singleton instance
export const extensionStore = new ExtensionStore();

/**
 * Reference pattern for matching [[cm.xxx]] or [[cm.xxx|display]]
 */
export const NOTE_REFERENCE_PATTERN = /\[\[(cm\.[a-z0-9]+)(?:\|([^\]]+))?\]\]/g;

/**
 * Get the note reference at a position in the document
 */
export function getNoteReferenceAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position
): { id: NoteId; range: vscode.Range; displayText?: string } | null {
  const line = document.lineAt(position.line);
  const text = line.text;

  // Find all references in the line
  const pattern = new RegExp(NOTE_REFERENCE_PATTERN.source, 'g');
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const startCol = match.index;
    const endCol = match.index + match[0].length;

    if (position.character >= startCol && position.character <= endCol) {
      const result: { id: NoteId; range: vscode.Range; displayText?: string } = {
        id: match[1] as NoteId,
        range: new vscode.Range(position.line, startCol, position.line, endCol),
      };
      if (match[2] !== undefined) {
        result.displayText = match[2];
      }
      return result;
    }
  }

  return null;
}

/**
 * Get the location of a note definition in codemind.md
 */
export async function getNoteDefinitionLocation(id: NoteId): Promise<vscode.Location | null> {
  const codemindPath = extensionStore.getCodemindPath();
  if (!codemindPath) return null;

  const uri = vscode.Uri.file(codemindPath);
  try {
    const document = await vscode.workspace.openTextDocument(uri);
    const text = document.getText();

    // Search for the note definition line: - [[id]] or - [[id|display]] (with optional leading whitespace)
    const pattern = new RegExp(`^\\s*-\\s*\\[\\[${id}(?:\\|[^\\]]+)?\\]\\]`, 'm');
    const match = pattern.exec(text);

    if (match) {
      const pos = document.positionAt(match.index);
      return new vscode.Location(uri, pos);
    }
  } catch {
    // File not found
  }

  return null;
}

/**
 * Find all references to a note in the workspace
 */
export async function findNoteReferences(id: NoteId): Promise<vscode.Location[]> {
  const locations: vscode.Location[] = [];
  const pattern = new RegExp(`\\[\\[${id}(?:\\|[^\\]]+)?\\]\\]`, 'g');

  // Search in all workspace files
  const files = await vscode.workspace.findFiles('**/*.{md,ts,js,tsx,jsx}', '**/node_modules/**');

  for (const file of files) {
    try {
      const document = await vscode.workspace.openTextDocument(file);
      const text = document.getText();
      let match;

      while ((match = pattern.exec(text)) !== null) {
        const pos = document.positionAt(match.index);
        locations.push(new vscode.Location(file, pos));
      }
    } catch {
      // Skip files that can't be opened
    }
  }

  return locations;
}

/**
 * Get relative file path from workspace root
 */
export function getRelativeFilePath(filePath: string): string {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (workspaceFolder) {
    return path.relative(workspaceFolder.uri.fsPath, filePath);
  }
  return filePath;
}
