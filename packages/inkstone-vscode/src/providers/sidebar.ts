// Inkstone Sidebar Providers
// Sprint 1.2 實作

import * as vscode from 'vscode';

/**
 * Action item for sidebar buttons
 */
export class ActionItem extends vscode.TreeItem {
  constructor(
    label: string,
    command: vscode.Command,
    tooltip?: string,
    icon?: string
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.command = command;
    this.tooltip = tooltip || label;
    if (icon) {
      this.iconPath = new vscode.ThemeIcon(icon);
    }
  }
}

/**
 * Memory TreeView Provider
 */
export class MemoryTreeProvider implements vscode.TreeDataProvider<ActionItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ActionItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ActionItem): vscode.TreeItem {
    return element;
  }

  getChildren(): ActionItem[] {
    return [
      new ActionItem(
        'Save Memory',
        { command: 'inkstone.saveMemory', title: 'Save Memory' },
        'Save current context to memory',
        'save'
      ),
      new ActionItem(
        'Restore Memory',
        { command: 'inkstone.restoreMemory', title: 'Restore Memory' },
        'Restore saved memories',
        'history'
      ),
      new ActionItem(
        'Search Memory',
        { command: 'inkstone.searchMemory', title: 'Search Memory' },
        'Search through memories',
        'search'
      ),
    ];
  }
}

/**
 * SPARC TreeView Provider
 */
export class SparcTreeProvider implements vscode.TreeDataProvider<ActionItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ActionItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ActionItem): vscode.TreeItem {
    return element;
  }

  getChildren(): ActionItem[] {
    return [
      new ActionItem(
        'Architect',
        { command: 'inkstone.sparc.architect', title: 'Architect Mode' },
        'Run SPARC Architect mode for system design',
        'symbol-structure'
      ),
      new ActionItem(
        'Coder',
        { command: 'inkstone.sparc.coder', title: 'Coder Mode' },
        'Run SPARC Coder mode for implementation',
        'code'
      ),
      new ActionItem(
        'TDD',
        { command: 'inkstone.sparc.tdd', title: 'TDD Mode' },
        'Run SPARC TDD mode for test-driven development',
        'beaker'
      ),
    ];
  }
}

/**
 * Swarm TreeView Provider
 */
export class SwarmTreeProvider implements vscode.TreeDataProvider<ActionItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ActionItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private swarmStatus: 'idle' | 'running' | 'error' = 'idle';

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  setStatus(status: 'idle' | 'running' | 'error'): void {
    this.swarmStatus = status;
    this.refresh();
  }

  getTreeItem(element: ActionItem): vscode.TreeItem {
    return element;
  }

  getChildren(): ActionItem[] {
    const items: ActionItem[] = [
      new ActionItem(
        'Init Swarm',
        { command: 'inkstone.swarm.init', title: 'Init Swarm' },
        'Initialize a new Hive-Mind swarm',
        'rocket'
      ),
      new ActionItem(
        'View Status',
        { command: 'inkstone.swarm.status', title: 'View Status' },
        'View current swarm status',
        'dashboard'
      ),
    ];

    // Add status indicator
    const statusItem = new ActionItem(
      `Status: ${this.swarmStatus}`,
      { command: 'inkstone.swarm.status', title: 'View Status' },
      `Swarm is ${this.swarmStatus}`,
      this.swarmStatus === 'running' ? 'pass-filled' : 'circle-outline'
    );
    items.push(statusItem);

    return items;
  }
}

/**
 * Vibe Coding TreeView Provider
 */
export class VibeCodingTreeProvider implements vscode.TreeDataProvider<ActionItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ActionItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private currentStage: number = 0;
  private stages = [
    '理解需求',
    'User Story Mapping',
    'EARS 驗收標準',
    '系統設計',
    '任務分解',
  ];

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  setStage(stage: number): void {
    this.currentStage = stage;
    this.refresh();
  }

  getTreeItem(element: ActionItem): vscode.TreeItem {
    return element;
  }

  getChildren(): ActionItem[] {
    const items: ActionItem[] = [
      new ActionItem(
        'Start Vibe Coding',
        { command: 'inkstone.startVibeCoding', title: 'Start Vibe Coding' },
        'Start the Vibe Coding workflow',
        'play'
      ),
    ];

    // Add stage indicators
    this.stages.forEach((stage, index) => {
      const icon = index < this.currentStage ? 'pass' :
                   index === this.currentStage ? 'arrow-right' : 'circle-outline';
      const item = new ActionItem(
        `${index + 1}. ${stage}`,
        { command: 'inkstone.vibeCoding.goToStage', title: stage, arguments: [index] },
        `Stage ${index + 1}: ${stage}`,
        icon
      );
      items.push(item);
    });

    return items;
  }
}
