// Inkstone VSCode Extension entry point
// Sprint 1-12 實作：Sidebar, Init, Code-Mind, Memory, SPARC, Swarm, Vibe Coding, Gherkin, Requirements, AI Tools, Testing & Optimization

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
  MemoryTreeProvider,
  SparcTreeProvider,
  SwarmTreeProvider,
  VibeCodingTreeProvider,
  RequirementsTreeProvider,
  clearHoverCache,
} from './providers/index.js';
import { registerDaemonCommands } from './daemon-manager.js';
import { scaffoldProject, type AITool } from './init/index.js';
import { saveMemoryHandler, restoreMemoryHandler, searchMemoryHandler } from './memory/index.js';
import { registerSparcCommands } from './sparc/index.js';
import { registerSwarmCommands, disposeSwarm } from './swarm/index.js';
import { registerVibeCodingCommands } from './vibe-coding/index.js';
import { registerGherkinCommands } from './gherkin/index.js';
import { registerRequirementCommands } from './requirements/index.js';
import { registerAIToolCommands } from './ai-tools/index.js';
import { registerWebviewCommands } from './webview/index.js';
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
  console.log('Inkstone extension is activating...');

  // Register sidebar TreeViews (always available)
  registerSidebarViews(context);

  // Register basic commands (always available)
  registerBasicCommands(context);

  // Register Daemon commands (always available)
  registerDaemonCommands(context);

  // Initialize the note store
  const initialized = await extensionStore.initialize();
  if (!initialized) {
    console.log('Inkstone: No codemind.md found in workspace');
    // Register fallback commands for notes
    registerFallbackNoteCommands(context);
    vscode.window.showInformationMessage(
      'Inkstone: Ready! Run "Inkstone: Initialize Project" to get started.'
    );
    return;
  }

  console.log('Inkstone extension is now active with Code-Mind support');

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

  // Register language providers
  registerLanguageProviders(context, documentSelector);

  // Register Notes TreeView
  registerNotesTreeView(context);

  // Register note commands
  registerNoteCommands(context);

  // Show welcome message
  vscode.window.showInformationMessage(
    `Inkstone: Found ${extensionStore.getAllNotes().length} notes`
  );
}

/**
 * Register sidebar TreeViews
 */
function registerSidebarViews(context: vscode.ExtensionContext) {
  // Memory TreeView
  const memoryProvider = new MemoryTreeProvider();
  const memoryView = vscode.window.createTreeView('inkstone-memory', {
    treeDataProvider: memoryProvider,
  });

  // SPARC TreeView
  const sparcProvider = new SparcTreeProvider();
  const sparcView = vscode.window.createTreeView('inkstone-sparc', {
    treeDataProvider: sparcProvider,
  });

  // Swarm TreeView
  const swarmProvider = new SwarmTreeProvider();
  const swarmView = vscode.window.createTreeView('inkstone-swarm', {
    treeDataProvider: swarmProvider,
  });

  // Vibe Coding TreeView
  const vibeCodingProvider = new VibeCodingTreeProvider();
  const vibeCodingView = vscode.window.createTreeView('inkstone-vibe-coding', {
    treeDataProvider: vibeCodingProvider,
  });

  // Requirements TreeView (Sprint 10)
  const requirementsProvider = new RequirementsTreeProvider();
  const requirementsView = vscode.window.createTreeView('inkstone-requirements', {
    treeDataProvider: requirementsProvider,
  });

  context.subscriptions.push(memoryView, sparcView, swarmView, vibeCodingView, requirementsView);
}

/**
 * Register basic commands (always available)
 */
function registerBasicCommands(context: vscode.ExtensionContext) {
  // Init Project
  context.subscriptions.push(
    vscode.commands.registerCommand('inkstone.initProject', async () => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage('Inkstone: No workspace folder open');
        return;
      }

      const result = await vscode.window.showQuickPick(
        [
          { label: 'Claude', description: 'Initialize with Claude Code settings', picked: true },
          { label: 'Gemini', description: 'Initialize with Gemini CLI settings' },
          { label: 'Codex', description: 'Initialize with OpenAI Codex settings' },
        ],
        {
          placeHolder: 'Select AI tools to configure',
          canPickMany: true,
        }
      );

      if (result && result.length > 0) {
        const tools: AITool[] = result.map(r => r.label.toLowerCase() as AITool);

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Inkstone: Initializing project...',
            cancellable: false,
          },
          async () => {
            await scaffoldProject({
              tools,
              workspaceRoot: workspaceFolder.uri.fsPath,
            });
          }
        );

        vscode.window.showInformationMessage(
          `Inkstone: Project initialized with ${result.map(r => r.label).join(', ')}`
        );

        // Reload the extension to pick up new codemind.md
        const reloadAnswer = await vscode.window.showInformationMessage(
          'Inkstone: Reload window to activate Code-Mind features?',
          'Reload',
          'Later'
        );
        if (reloadAnswer === 'Reload') {
          vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
      }
    })
  );

  // Vibe Coding commands (Sprint 8 實作)
  registerVibeCodingCommands(context);

  // Memory commands (Sprint 5 實作)
  context.subscriptions.push(
    vscode.commands.registerCommand('inkstone.saveMemory', saveMemoryHandler)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('inkstone.restoreMemory', restoreMemoryHandler)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('inkstone.searchMemory', searchMemoryHandler)
  );

  // SPARC commands (Sprint 6 實作)
  registerSparcCommands(context);

  // Swarm commands (Sprint 7 實作)
  registerSwarmCommands(context);

  // Gherkin commands (Sprint 9 實作)
  registerGherkinCommands(context);

  // Requirements commands (Sprint 10 實作)
  registerRequirementCommands(context);

  // AI Tools commands (Sprint 11 實作)
  registerAIToolCommands(context);

  // Webview commands (Sprint 12 實作)
  registerWebviewCommands(context);
}

/**
 * Register fallback note commands when no codemind.md is found
 */
function registerFallbackNoteCommands(context: vscode.ExtensionContext) {
  const showWarning = () => {
    vscode.window.showWarningMessage(
      'Inkstone: No codemind.md found. Run "Inkstone: Initialize Project" first.'
    );
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('inkstone.addNote', showWarning),
    vscode.commands.registerCommand('inkstone.goToNote', showWarning),
    vscode.commands.registerCommand('inkstone.findReferences', showWarning),
    vscode.commands.registerCommand('inkstone.refreshNotes', showWarning)
  );
}

/**
 * Register language providers for Code-Mind features
 */
function registerLanguageProviders(
  context: vscode.ExtensionContext,
  documentSelector: vscode.DocumentSelector
) {
  // Completion Provider
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      documentSelector,
      new NoteCompletionProvider(),
      '['
    )
  );

  // Hover Provider
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(documentSelector, new NoteHoverProvider())
  );

  // CodeLens Provider
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(documentSelector, new NoteCodeLensProvider())
  );

  // Definition Provider
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(documentSelector, new NoteDefinitionProvider())
  );

  // Reference Provider
  context.subscriptions.push(
    vscode.languages.registerReferenceProvider(documentSelector, new NoteReferenceProvider())
  );
}

/**
 * Register Notes TreeView
 */
function registerNotesTreeView(context: vscode.ExtensionContext) {
  const treeProvider = new NoteTreeProvider();
  const treeView = vscode.window.createTreeView('inkstone-notes', {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
  });

  context.subscriptions.push(
    treeView,
    vscode.commands.registerCommand('inkstone.refreshNotes', () => treeProvider.refresh()),
    extensionStore.onDidChange(() => clearHoverCache())
  );
}

/**
 * Register note commands
 */
function registerNoteCommands(context: vscode.ExtensionContext) {
  // Add Note
  context.subscriptions.push(
    vscode.commands.registerCommand('inkstone.addNote', addNoteHandler)
  );

  // Go to Note
  context.subscriptions.push(
    vscode.commands.registerCommand('inkstone.goToNote', goToNoteHandler)
  );

  // Find References
  context.subscriptions.push(
    vscode.commands.registerCommand('inkstone.findReferences', findReferencesHandler)
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

  const selection = editor.selection;
  let content = '';

  if (!selection.isEmpty) {
    content = editor.document.getText(selection);
  } else {
    content =
      (await vscode.window.showInputBox({
        prompt: 'Enter note content',
        placeHolder: 'Note content...',
      })) || '';
  }

  if (!content) {
    return;
  }

  const filePath = getRelativeFilePath(editor.document.uri.fsPath);
  const note = extensionStore.addNote(filePath, content);

  if (note) {
    vscode.window.showInformationMessage(`Created note: [[${note.properties.id}]]`);

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
  if (!noteId) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active editor');
      return;
    }

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

  const locations = await findNoteReferences(noteId);

  if (locations.length === 0) {
    vscode.window.showInformationMessage(`No references found for ${noteId}`);
    return;
  }

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
  console.log('Inkstone extension is deactivating...');
  extensionStore.dispose();
  disposeSwarm();
  console.log('Inkstone extension deactivated');
}
