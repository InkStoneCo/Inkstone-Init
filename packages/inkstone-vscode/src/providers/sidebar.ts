// Inkstone Sidebar Providers
// Sprint 1.2 + Sprint 6 實作

import * as vscode from 'vscode';
import { getCoreModes, getExtendedModes, type SparcMode } from '../sparc/index.js';

/**
 * Action item for sidebar buttons
 */
export class ActionItem extends vscode.TreeItem {
  constructor(
    label: string,
    command: vscode.Command,
    tooltip?: string | vscode.MarkdownString,
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
 * SPARC Action item with rich tooltip
 */
class SparcActionItem extends vscode.TreeItem {
  constructor(mode: SparcMode) {
    super(mode.name, vscode.TreeItemCollapsibleState.None);

    this.command = {
      command: 'inkstone.sparc.execute',
      title: mode.name,
      arguments: [mode.id],
    };

    // Rich Markdown tooltip
    this.tooltip = new vscode.MarkdownString();
    this.tooltip.appendMarkdown(`### $(${mode.icon}) ${mode.name}\n\n`);
    this.tooltip.appendMarkdown(`${mode.description}\n\n`);
    this.tooltip.appendMarkdown(`---\n`);
    this.tooltip.appendMarkdown(`*點擊執行此模式*`);
    this.tooltip.isTrusted = true;

    this.iconPath = new vscode.ThemeIcon(mode.icon);
    this.contextValue = 'sparcMode';
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
 * Sprint 6 增強：支援更多模式和 Hover 提示
 */
export class SparcTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): vscode.TreeItem[] {
    const items: vscode.TreeItem[] = [];

    // 核心模式（前三個）
    for (const mode of getCoreModes()) {
      items.push(new SparcActionItem(mode));
    }

    // More... 按鈕展開更多模式
    const moreItem = new ActionItem(
      'More...',
      { command: 'inkstone.sparc.more', title: 'More SPARC Modes' },
      createMoreTooltip(),
      'ellipsis'
    );
    items.push(moreItem);

    return items;
  }
}

/**
 * 建立 More 按鈕的 Tooltip
 */
function createMoreTooltip(): vscode.MarkdownString {
  const tooltip = new vscode.MarkdownString();
  tooltip.appendMarkdown('### 更多 SPARC 模式\n\n');

  for (const mode of getExtendedModes()) {
    tooltip.appendMarkdown(`- **${mode.name}**: ${mode.description}\n`);
  }

  tooltip.appendMarkdown('\n*點擊查看完整列表*');
  tooltip.isTrusted = true;
  return tooltip;
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
