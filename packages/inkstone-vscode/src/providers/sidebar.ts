// Inkstone Sidebar Providers
// Sprint 1.2 + Sprint 6 + Sprint 7 + Sprint 8 + Sprint 10 實作

import * as vscode from 'vscode';
import { getCoreModes, getExtendedModes, type SparcMode } from '../sparc/index.js';
import { onSwarmStatusChange, getSwarmStatus, type SwarmStatus, type SwarmState } from '../swarm/index.js';
import {
  onWorkflowProgressChange,
  getWorkflowProgress,
  WORKFLOW_STAGES,
  type WorkflowProgress,
} from '../vibe-coding/index.js';
import {
  onRequirementsChange,
  getRequirements,
  REQUIREMENT_TYPES,
  type Requirement,
} from '../requirements/index.js';

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
 * Sprint 7 增強：整合 swarm 模組狀態事件
 */
export class SwarmTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private disposables: vscode.Disposable[] = [];

  constructor() {
    // 訂閱狀態變更事件
    this.disposables.push(
      onSwarmStatusChange(() => this.refresh())
    );
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): vscode.TreeItem[] {
    const status = getSwarmStatus();
    const items: vscode.TreeItem[] = [];

    // 狀態指示器
    items.push(this.createStatusItem(status));

    // 根據狀態顯示不同的操作
    if (status.state === 'idle') {
      items.push(
        new ActionItem(
          'Init Swarm',
          { command: 'inkstone.swarm.init', title: 'Init Swarm' },
          '初始化新的 Hive-Mind 蜂群',
          'rocket'
        )
      );
    } else if (status.state === 'running') {
      items.push(
        new ActionItem(
          'View Status',
          { command: 'inkstone.swarm.status', title: 'View Status' },
          '查看當前蜂群狀態',
          'dashboard'
        ),
        new ActionItem(
          'Refresh',
          { command: 'inkstone.swarm.refresh', title: 'Refresh' },
          '刷新狀態',
          'refresh'
        ),
        new ActionItem(
          'Stop Swarm',
          { command: 'inkstone.swarm.stop', title: 'Stop Swarm' },
          '停止蜂群',
          'debug-stop'
        )
      );

      // 顯示 Agent 資訊
      if (status.agentCount !== undefined) {
        const agentItem = new vscode.TreeItem(
          `Agents: ${status.activeAgents || 0}/${status.agentCount}`,
          vscode.TreeItemCollapsibleState.None
        );
        agentItem.iconPath = new vscode.ThemeIcon('account');
        agentItem.tooltip = `活躍 Agent: ${status.activeAgents || 0}，總數: ${status.agentCount}`;
        items.push(agentItem);
      }

      // 顯示拓撲資訊
      if (status.topology) {
        const topoItem = new vscode.TreeItem(
          `Topology: ${status.topology}`,
          vscode.TreeItemCollapsibleState.None
        );
        topoItem.iconPath = new vscode.ThemeIcon('type-hierarchy');
        topoItem.tooltip = `拓撲結構: ${status.topology}`;
        items.push(topoItem);
      }
    } else if (status.state === 'initializing' || status.state === 'stopping') {
      const loadingItem = new vscode.TreeItem(
        status.state === 'initializing' ? '初始化中...' : '停止中...',
        vscode.TreeItemCollapsibleState.None
      );
      loadingItem.iconPath = new vscode.ThemeIcon('loading~spin');
      items.push(loadingItem);
    } else if (status.state === 'error') {
      items.push(
        new ActionItem(
          'Retry Init',
          { command: 'inkstone.swarm.init', title: 'Retry Init' },
          '重新初始化蜂群',
          'refresh'
        )
      );
      if (status.errorMessage) {
        const errorItem = new vscode.TreeItem(
          `Error: ${status.errorMessage}`,
          vscode.TreeItemCollapsibleState.None
        );
        errorItem.iconPath = new vscode.ThemeIcon('warning');
        items.push(errorItem);
      }
    }

    return items;
  }

  /**
   * 建立狀態指示器項目
   */
  private createStatusItem(status: SwarmStatus): vscode.TreeItem {
    const stateLabels: Record<SwarmState, string> = {
      idle: '閒置',
      initializing: '初始化中',
      running: '運行中',
      stopping: '停止中',
      error: '錯誤',
    };

    const stateIcons: Record<SwarmState, string> = {
      idle: 'circle-outline',
      initializing: 'loading~spin',
      running: 'pass-filled',
      stopping: 'loading~spin',
      error: 'error',
    };

    const item = new vscode.TreeItem(
      `狀態: ${stateLabels[status.state]}`,
      vscode.TreeItemCollapsibleState.None
    );
    item.iconPath = new vscode.ThemeIcon(stateIcons[status.state]);
    item.command = { command: 'inkstone.swarm.status', title: 'View Status' };
    item.tooltip = this.createStatusTooltip(status);
    item.contextValue = `swarmStatus-${status.state}`;

    return item;
  }

  /**
   * 建立狀態 Tooltip
   */
  private createStatusTooltip(status: SwarmStatus): vscode.MarkdownString {
    const tooltip = new vscode.MarkdownString();
    tooltip.appendMarkdown('### Hive-Mind Swarm\n\n');

    const stateLabels: Record<SwarmState, string> = {
      idle: '閒置',
      initializing: '初始化中...',
      running: '運行中',
      stopping: '停止中...',
      error: '錯誤',
    };

    tooltip.appendMarkdown(`**狀態**: ${stateLabels[status.state]}\n\n`);

    if (status.topology) {
      tooltip.appendMarkdown(`**拓撲**: ${status.topology}\n\n`);
    }

    if (status.agentCount !== undefined) {
      tooltip.appendMarkdown(`**Agent**: ${status.activeAgents || 0}/${status.agentCount}\n\n`);
    }

    if (status.errorMessage) {
      tooltip.appendMarkdown(`**錯誤**: ${status.errorMessage}\n\n`);
    }

    if (status.lastUpdate) {
      tooltip.appendMarkdown(`*更新: ${status.lastUpdate.toLocaleTimeString('zh-TW')}*`);
    }

    tooltip.isTrusted = true;
    return tooltip;
  }
}

/**
 * Vibe Coding TreeView Provider
 * Sprint 8 增強：整合 workflow 進度事件
 */
export class VibeCodingTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private disposables: vscode.Disposable[] = [];

  constructor() {
    // 訂閱進度變更事件
    this.disposables.push(
      onWorkflowProgressChange(() => this.refresh())
    );
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): vscode.TreeItem[] {
    const progress = getWorkflowProgress();
    const items: vscode.TreeItem[] = [];

    // 開始按鈕
    const startItem = new ActionItem(
      progress.state === 'idle' ? 'Start Vibe Coding' : 'Continue Vibe Coding',
      { command: 'inkstone.startVibeCoding', title: 'Start Vibe Coding' },
      progress.state === 'idle' ? '開始 Vibe Coding 工作流程' : '繼續上次的進度',
      progress.state === 'idle' ? 'play' : 'debug-continue'
    );
    items.push(startItem);

    // 進度指示器
    if (progress.state !== 'idle') {
      const progressItem = new vscode.TreeItem(
        `進度: ${progress.completedStages.filter(s => s).length}/5 階段`,
        vscode.TreeItemCollapsibleState.None
      );
      progressItem.iconPath = new vscode.ThemeIcon('pie-chart');
      progressItem.tooltip = this.createProgressTooltip(progress);
      items.push(progressItem);
    }

    // 階段列表
    WORKFLOW_STAGES.forEach((stage, index) => {
      const completed = progress.completedStages[index] ?? false;
      const isCurrent = index === progress.currentStage && progress.state === 'active';

      const icon = completed ? 'pass' : isCurrent ? 'arrow-right' : 'circle-outline';
      const item = this.createStageItem(stage, index, icon, completed, isCurrent);
      items.push(item);
    });

    // 檢測進度按鈕
    const detectItem = new ActionItem(
      'Detect Progress',
      { command: 'inkstone.vibeCoding.detectProgress', title: 'Detect Progress' },
      '檢測專案中的 RFP 進度',
      'search'
    );
    items.push(detectItem);

    return items;
  }

  /**
   * 建立階段項目
   */
  private createStageItem(
    stage: typeof WORKFLOW_STAGES[number],
    index: number,
    icon: string,
    completed: boolean,
    isCurrent: boolean
  ): vscode.TreeItem {
    const item = new vscode.TreeItem(
      `${index + 1}. ${stage.name}`,
      vscode.TreeItemCollapsibleState.None
    );

    item.iconPath = new vscode.ThemeIcon(icon);
    item.command = {
      command: 'inkstone.vibeCoding.goToStage',
      title: stage.name,
      arguments: [index],
    };

    // 建立 Markdown Tooltip
    const tooltip = new vscode.MarkdownString();
    tooltip.appendMarkdown(`### $(${stage.icon}) ${stage.name}\n\n`);
    tooltip.appendMarkdown(`${stage.description}\n\n`);

    if (stage.outputFile) {
      tooltip.appendMarkdown(`**輸出文件**: \`${stage.outputFile}\`\n\n`);
    }

    if (completed) {
      tooltip.appendMarkdown(`✓ **已完成**`);
    } else if (isCurrent) {
      tooltip.appendMarkdown(`→ **當前階段**`);
    } else {
      tooltip.appendMarkdown(`○ 待進行`);
    }

    tooltip.isTrusted = true;
    item.tooltip = tooltip;

    // 設定 contextValue 用於右鍵選單
    if (completed) {
      item.contextValue = 'vibeCodingStage-completed';
      item.description = '✓';
    } else if (isCurrent) {
      item.contextValue = 'vibeCodingStage-current';
      item.description = '←';
    } else {
      item.contextValue = 'vibeCodingStage-pending';
    }

    return item;
  }

  /**
   * 建立進度 Tooltip
   */
  private createProgressTooltip(progress: WorkflowProgress): vscode.MarkdownString {
    const tooltip = new vscode.MarkdownString();
    tooltip.appendMarkdown('### Vibe Coding 進度\n\n');

    WORKFLOW_STAGES.forEach((stage, index) => {
      const status = progress.completedStages[index] ? '✓' :
        (index === progress.currentStage ? '→' : '○');
      tooltip.appendMarkdown(`${status} ${index + 1}. ${stage.name}\n\n`);
    });

    tooltip.isTrusted = true;
    return tooltip;
  }
}

/**
 * Requirements TreeView Provider
 * Sprint 10 實作：需求管理列表
 */
export class RequirementsTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private disposables: vscode.Disposable[] = [];

  constructor() {
    // 訂閱需求列表變更事件
    this.disposables.push(
      onRequirementsChange(() => this.refresh())
    );
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): vscode.TreeItem[] {
    const requirements = getRequirements();
    const items: vscode.TreeItem[] = [];

    // 新增需求按鈕
    items.push(
      new ActionItem(
        'New Requirement',
        { command: 'inkstone.requirements.new', title: 'New Requirement' },
        '建立新的需求',
        'add'
      )
    );

    // 刷新按鈕
    items.push(
      new ActionItem(
        'Refresh',
        { command: 'inkstone.requirements.refresh', title: 'Refresh' },
        '刷新需求列表',
        'refresh'
      )
    );

    // 需求計數
    if (requirements.length > 0) {
      const countItem = new vscode.TreeItem(
        `共 ${requirements.length} 個需求`,
        vscode.TreeItemCollapsibleState.None
      );
      countItem.iconPath = new vscode.ThemeIcon('folder-library');
      items.push(countItem);
    }

    // 需求列表
    for (const req of requirements) {
      const item = this.createRequirementItem(req);
      items.push(item);
    }

    // 如果沒有需求，顯示提示
    if (requirements.length === 0) {
      const emptyItem = new vscode.TreeItem(
        '尚無任何需求',
        vscode.TreeItemCollapsibleState.None
      );
      emptyItem.iconPath = new vscode.ThemeIcon('info');
      emptyItem.tooltip = '點擊 "New Requirement" 建立第一個需求';
      items.push(emptyItem);
    }

    return items;
  }

  /**
   * 建立需求項目
   */
  private createRequirementItem(req: Requirement): vscode.TreeItem {
    const typeInfo = REQUIREMENT_TYPES.find(t => t.id === req.type);
    const icon = typeInfo?.icon || 'file';

    const item = new vscode.TreeItem(
      req.name,
      vscode.TreeItemCollapsibleState.None
    );

    item.iconPath = new vscode.ThemeIcon(icon);
    item.command = {
      command: 'inkstone.requirements.open',
      title: 'Open Requirement',
      arguments: [req],
    };

    // 狀態指示
    const statusParts: string[] = [];
    if (req.hasProposal) statusParts.push('Proposal');
    if (req.hasGherkin) statusParts.push('Gherkin');
    item.description = statusParts.length > 0 ? statusParts.join(', ') : 'RFP';

    // Tooltip
    item.tooltip = this.createRequirementTooltip(req, typeInfo);

    // Context value for menus
    item.contextValue = 'requirement';

    return item;
  }

  /**
   * 建立需求 Tooltip
   */
  private createRequirementTooltip(
    req: Requirement,
    typeInfo: typeof REQUIREMENT_TYPES[number] | undefined
  ): vscode.MarkdownString {
    const tooltip = new vscode.MarkdownString();

    tooltip.appendMarkdown(`### $(${typeInfo?.icon || 'file'}) ${req.name}\n\n`);
    tooltip.appendMarkdown(`**類型**: ${typeInfo?.name || req.type}\n\n`);
    tooltip.appendMarkdown(`**建立日期**: ${req.createdAt.toLocaleDateString('zh-TW')}\n\n`);

    tooltip.appendMarkdown('**狀態**:\n');
    tooltip.appendMarkdown(`- RFP: ${req.hasRfp ? '✓' : '○'}\n`);
    tooltip.appendMarkdown(`- Proposal: ${req.hasProposal ? '✓' : '○'}\n`);
    tooltip.appendMarkdown(`- Gherkin: ${req.hasGherkin ? '✓' : '○'}\n\n`);

    tooltip.appendMarkdown(`*ID: ${req.id}*`);

    tooltip.isTrusted = true;
    return tooltip;
  }
}
