// VSCode Extension entry point
// Phase 5.1 實作

import * as vscode from 'vscode';
import {
  extensionStore,
  getNoteDefinitionLocation,
  findNoteReferences,
  getRelativeFilePath,
} from './store.js';
import {
  NoteCompletionProvider,
  NoteHoverProvider,
  NoteCodeLensProvider,
  NoteDefinitionProvider,
  NoteReferenceProvider,
  NoteTreeProvider,
  clearHoverCache,
} from './providers/index.js';
import type { NoteId } from '@inkstone/codemind-core';

/**
 * Quick pick item with note ID
 */
interface NoteQuickPickItem extends vscode.QuickPickItem {
  noteId: NoteId;
}

/**
 * Extension activation
 */
export async function activate(context: vscode.ExtensionContext) {
  console.log('Code-Mind extension is activating...');

  // Initialize the store
  const initialized = await extensionStore.initialize();
  if (!initialized) {
    console.log('Code-Mind: No codemind.md found in workspace');
    // Still register commands but show warning when used
    registerFallbackCommands(context);
    return;
  }

  console.log('Code-Mind extension is now active');

  // Document selector for all supported file types
  const documentSelector: vscode.DocumentSelector = [
    { scheme: 'file', language: 'markdown' },
    { scheme: 'file', language: 'typescript' },
    { scheme: 'file', language: 'typescriptreact' },
    { scheme: 'file', language: 'javascript' },
    { scheme: 'file', language: 'javascriptreact' },
    { scheme: 'file', language: 'python' },
    { scheme: 'file', language: 'go' },
    { scheme: 'file', language: 'rust' },
    { scheme: 'file', language: 'java' },
  ];

  // Register Completion Provider
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    documentSelector,
    new NoteCompletionProvider(),
    '[' // Trigger on [
  );

  // Register Hover Provider
  const hoverProvider = vscode.languages.registerHoverProvider(
    documentSelector,
    new NoteHoverProvider()
  );

  // Register CodeLens Provider
  const codeLensProvider = vscode.languages.registerCodeLensProvider(
    documentSelector,
    new NoteCodeLensProvider()
  );

  // Register Definition Provider
  const definitionProvider = vscode.languages.registerDefinitionProvider(
    documentSelector,
    new NoteDefinitionProvider()
  );

  // Register Reference Provider
  const referenceProvider = vscode.languages.registerReferenceProvider(
    documentSelector,
    new NoteReferenceProvider()
  );

  // Register Tree View
  const treeProvider = new NoteTreeProvider();
  const treeView = vscode.window.createTreeView('codemind-notes', {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
  });

  // Register Commands
  const addNoteCommand = vscode.commands.registerCommand('codemind.addNote', addNoteHandler);

  const goToNoteCommand = vscode.commands.registerCommand('codemind.goToNote', goToNoteHandler);

  const findReferencesCommand = vscode.commands.registerCommand(
    'codemind.findReferences',
    findReferencesHandler
  );

  const refreshTreeCommand = vscode.commands.registerCommand('codemind.refreshTree', () =>
    treeProvider.refresh()
  );

  // Subscribe all disposables
  context.subscriptions.push(
    completionProvider,
    hoverProvider,
    codeLensProvider,
    definitionProvider,
    referenceProvider,
    treeView,
    addNoteCommand,
    goToNoteCommand,
    findReferencesCommand,
    refreshTreeCommand,
    // Cleanup on store change
    extensionStore.onDidChange(() => clearHoverCache())
  );

  // Show welcome message
  vscode.window.showInformationMessage(
    `Code-Mind: Found ${extensionStore.getAllNotes().length} notes`
  );
}

/**
 * Register fallback commands when no codemind.md is found
 */
function registerFallbackCommands(context: vscode.ExtensionContext) {
  const showWarning = () => {
    vscode.window.showWarningMessage(
      'Code-Mind: No codemind.md found. Run "codemind init" in terminal.'
    );
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('codemind.addNote', showWarning),
    vscode.commands.registerCommand('codemind.goToNote', showWarning),
    vscode.commands.registerCommand('codemind.findReferences', showWarning)
  );
}

/**
 * Add Note command handler
 */
async function addNoteHandler() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor');
    return;
  }

  // Get the content to use for the note
  const selection = editor.selection;
  let content = '';

  if (!selection.isEmpty) {
    content = editor.document.getText(selection);
  } else {
    // Prompt for content
    content =
      (await vscode.window.showInputBox({
        prompt: 'Enter note content',
        placeHolder: 'Note content...',
      })) || '';
  }

  if (!content) {
    return;
  }

  // Get the file path
  const filePath = getRelativeFilePath(editor.document.uri.fsPath);

  // Add the note
  const note = extensionStore.addNote(filePath, content);
  if (note) {
    vscode.window.showInformationMessage(`Created note: [[${note.properties.id}]]`);

    // Insert reference at cursor if no selection
    if (selection.isEmpty) {
      editor.edit(editBuilder => {
        editBuilder.insert(selection.active, `[[${note.properties.id}|${note.displayPath}]]`);
      });
    }
  } else {
    vscode.window.showErrorMessage('Failed to create note');
  }
}

/**
 * Go to Note command handler
 */
async function goToNoteHandler(noteId?: NoteId) {
  // If no ID provided, show quick pick
  if (!noteId) {
    const notes = extensionStore.getAllNotes();
    const items: NoteQuickPickItem[] = notes.map(note => ({
      label: note.displayPath,
      description: note.properties.file || '',
      detail: note.content[0]?.content || 'No content',
      noteId: note.properties.id,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a note to go to',
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (!selected) {
      return;
    }

    noteId = selected.noteId;
  }

  // Navigate to the note definition
  const location = await getNoteDefinitionLocation(noteId);
  if (location) {
    const document = await vscode.workspace.openTextDocument(location.uri);
    const editor = await vscode.window.showTextDocument(document);
    editor.selection = new vscode.Selection(location.range.start, location.range.start);
    editor.revealRange(location.range, vscode.TextEditorRevealType.InCenter);
  } else {
    vscode.window.showWarningMessage(`Note not found: ${noteId}`);
  }
}

/**
 * Find References command handler
 */
async function findReferencesHandler(noteId?: NoteId) {
  // If no ID provided, try to get from cursor position
  if (!noteId) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active editor');
      return;
    }

    // Try to find note ID at cursor
    const position = editor.selection.active;
    const line = editor.document.lineAt(position.line).text;
    const pattern = /\[\[(cm\.[a-z0-9]+)(?:\|[^\]]+)?\]\]/g;
    let match;

    while ((match = pattern.exec(line)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (position.character >= start && position.character <= end) {
        noteId = match[1] as NoteId;
        break;
      }
    }

    if (!noteId) {
      // Show quick pick to select a note
      const notes = extensionStore.getAllNotes();
      const items: NoteQuickPickItem[] = notes.map(note => ({
        label: note.displayPath,
        description: `${note.properties.backlink_count || 0} references`,
        noteId: note.properties.id,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a note to find references',
      });

      if (!selected) {
        return;
      }

      noteId = selected.noteId;
    }
  }

  // Find all references
  const locations = await findNoteReferences(noteId);

  if (locations.length === 0) {
    vscode.window.showInformationMessage(`No references found for ${noteId}`);
    return;
  }

  // Show peek view with references
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    await vscode.commands.executeCommand(
      'editor.action.peekLocations',
      editor.document.uri,
      editor.selection.active,
      locations,
      'peek'
    );
  }
}

/**
 * Extension deactivation
 */
export function deactivate() {
  console.log('Code-Mind extension is deactivating...');
  extensionStore.dispose();
  console.log('Code-Mind extension deactivated');
}
