// TreeView Provider
// Phase 5.2.6 實作

import * as vscode from 'vscode';
import { extensionStore } from '../store.js';
import type { Note, NoteId } from '@uncle6/codemind-core';

/**
 * Tree item types
 */
type TreeItemType = 'category' | 'file' | 'note';

/**
 * 筆記樹狀檢視項目
 */
export class NoteTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly itemType: TreeItemType,
    public readonly noteId?: NoteId,
    public readonly filePath?: string
  ) {
    super(label, collapsibleState);

    // Set context value for menus
    this.contextValue = itemType;

    // Set icons based on type
    switch (itemType) {
      case 'category':
        this.iconPath = new vscode.ThemeIcon('folder');
        break;
      case 'file':
        this.iconPath = new vscode.ThemeIcon('file-code');
        break;
      case 'note':
        this.iconPath = new vscode.ThemeIcon('note');
        break;
    }

    // Set command for notes
    if (itemType === 'note' && noteId) {
      this.command = {
        command: 'codemind.goToNote',
        title: 'Go to Note',
        arguments: [noteId],
      };
    }
  }
}

/**
 * 筆記樹狀檢視提供者
 */
export class NoteTreeProvider implements vscode.TreeDataProvider<NoteTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<NoteTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor() {
    // Refresh when store changes
    extensionStore.onDidChange(() => {
      this.refresh();
    });

    // Refresh when active editor changes
    vscode.window.onDidChangeActiveTextEditor(() => {
      this.refresh();
    });
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: NoteTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: NoteTreeItem): vscode.ProviderResult<NoteTreeItem[]> {
    if (!element) {
      // Root level - show categories
      return this.getRootCategories();
    }

    // Handle category children
    if (element.itemType === 'category') {
      const category = element.label as string;
      switch (category) {
        case 'Current File':
          return this.getCurrentFileNotes();
        case 'All Notes':
          return this.getAllNotesGroupedByFile();
        case 'Orphan Notes':
          return this.getOrphanNotes();
        case 'Popular Notes':
          return this.getPopularNotes();
        default:
          return [];
      }
    }

    // Handle file children (notes in that file)
    if (element.itemType === 'file' && element.filePath) {
      return this.getNotesInFile(element.filePath);
    }

    // Handle note children (child notes)
    if (element.itemType === 'note' && element.noteId) {
      return this.getChildNotes(element.noteId);
    }

    return [];
  }

  private getRootCategories(): NoteTreeItem[] {
    const categories: NoteTreeItem[] = [];

    // Current file notes
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      categories.push(
        new NoteTreeItem('Current File', vscode.TreeItemCollapsibleState.Expanded, 'category')
      );
    }

    // All notes
    categories.push(
      new NoteTreeItem('All Notes', vscode.TreeItemCollapsibleState.Collapsed, 'category')
    );

    // Orphan notes
    const orphans = extensionStore.getStore()?.getOrphans() || [];
    if (orphans.length > 0) {
      const item = new NoteTreeItem(
        'Orphan Notes',
        vscode.TreeItemCollapsibleState.Collapsed,
        'category'
      );
      item.description = `${orphans.length}`;
      categories.push(item);
    }

    // Popular notes
    categories.push(
      new NoteTreeItem('Popular Notes', vscode.TreeItemCollapsibleState.Collapsed, 'category')
    );

    return categories;
  }

  private getCurrentFileNotes(): NoteTreeItem[] {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return [];
    }

    const filePath = vscode.workspace.asRelativePath(activeEditor.document.uri);
    const notes = extensionStore.getNotesInFile(filePath);

    return this.createNoteItems(notes.filter(n => !n.properties.parent));
  }

  private getAllNotesGroupedByFile(): NoteTreeItem[] {
    const allNotes = extensionStore.getAllNotes();
    const byFile = new Map<string, Note[]>();

    for (const note of allNotes) {
      if (note.properties.parent) continue; // Skip child notes
      const file = note.properties.file || 'unknown';
      const existing = byFile.get(file) || [];
      existing.push(note);
      byFile.set(file, existing);
    }

    const items: NoteTreeItem[] = [];
    const sortedFiles = [...byFile.keys()].sort();

    for (const file of sortedFiles) {
      const fileNotes = byFile.get(file) || [];
      const item = new NoteTreeItem(
        file,
        vscode.TreeItemCollapsibleState.Collapsed,
        'file',
        undefined,
        file
      );
      item.description = `${fileNotes.length} note${fileNotes.length === 1 ? '' : 's'}`;
      items.push(item);
    }

    return items;
  }

  private getNotesInFile(filePath: string): NoteTreeItem[] {
    const notes = extensionStore.getNotesInFile(filePath);
    return this.createNoteItems(notes.filter(n => !n.properties.parent));
  }

  private getOrphanNotes(): NoteTreeItem[] {
    const orphans = extensionStore.getStore()?.getOrphans() || [];
    return this.createNoteItems(orphans);
  }

  private getPopularNotes(): NoteTreeItem[] {
    const popular = extensionStore.getStore()?.getPopular(10) || [];
    return this.createNoteItems(popular);
  }

  private getChildNotes(parentId: NoteId): NoteTreeItem[] {
    const parent = extensionStore.getNote(parentId);
    if (!parent) return [];
    return this.createNoteItems(parent.children);
  }

  private createNoteItems(notes: Note[]): NoteTreeItem[] {
    return notes.map(note => {
      const hasChildren = note.children.length > 0;
      const item = new NoteTreeItem(
        note.displayPath,
        hasChildren
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None,
        'note',
        note.properties.id
      );

      // Show backlink count as badge
      const backlinkCount = note.properties.backlink_count || 0;
      if (backlinkCount > 0) {
        item.description = `[${backlinkCount}]`;
      }

      // Show content preview as tooltip
      const content = note.content[0]?.content || 'No content';
      item.tooltip = new vscode.MarkdownString(
        `**${note.displayPath}**\n\n${content}\n\n*${note.properties.author} - ${note.properties.created}*`
      );

      return item;
    });
  }
}
