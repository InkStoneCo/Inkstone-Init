// Swarm Module - Sprint 7 實作
// 提供 Hive-Mind 蜂群初始化和監控功能

import * as vscode from 'vscode';

/**
 * Swarm 拓撲類型
 */
export interface SwarmTopology {
  id: string;
  name: string;
  description: string;
  icon: string;
  recommended?: boolean;
}

/**
 * 可用的拓撲類型
 */
export const SWARM_TOPOLOGIES: SwarmTopology[] = [
  {
    id: 'mesh',
    name: 'Mesh（網狀）',
    description: '所有 Agent 互相連接，適合需要高度協作的任務',
    icon: 'type-hierarchy',
    recommended: true,
  },
  {
    id: 'hierarchical',
    name: 'Hierarchical（階層式）',
    description: '主從架構，由一個主 Agent 協調其他 Agent',
    icon: 'organization',
  },
  {
    id: 'ring',
    name: 'Ring（環狀）',
    description: 'Agent 形成環狀連接，適合流水線處理',
    icon: 'sync',
  },
  {
    id: 'star',
    name: 'Star（星狀）',
    description: '中心 Agent 連接所有其他 Agent，適合集中協調',
    icon: 'star-full',
  },
];

/**
 * Swarm 狀態
 */
export type SwarmState = 'idle' | 'initializing' | 'running' | 'stopping' | 'error';

/**
 * Swarm 狀態資訊
 */
export interface SwarmStatus {
  state: SwarmState;
  topology?: string;
  agentCount?: number;
  activeAgents?: number;
  lastUpdate?: Date;
  errorMessage?: string;
}

// 全域狀態
let currentStatus: SwarmStatus = { state: 'idle' };
let statusBarItem: vscode.StatusBarItem | null = null;
let statusUpdateInterval: NodeJS.Timeout | null = null;

// 狀態變更事件
const _onStatusChange = new vscode.EventEmitter<SwarmStatus>();
export const onSwarmStatusChange = _onStatusChange.event;

/**
 * 取得當前狀態
 */
export function getSwarmStatus(): SwarmStatus {
  return { ...currentStatus };
}

/**
 * 更新狀態
 */
function updateStatus(status: Partial<SwarmStatus>): void {
  currentStatus = { ...currentStatus, ...status, lastUpdate: new Date() };
  _onStatusChange.fire(currentStatus);
  updateStatusBar();
}

/**
 * 更新狀態列
 */
function updateStatusBar(): void {
  if (!statusBarItem) return;

  const icons: Record<SwarmState, string> = {
    idle: '$(circle-outline)',
    initializing: '$(loading~spin)',
    running: '$(pass-filled)',
    stopping: '$(loading~spin)',
    error: '$(error)',
  };

  const colors: Record<SwarmState, string | undefined> = {
    idle: undefined,
    initializing: 'statusBarItem.warningBackground',
    running: undefined,
    stopping: 'statusBarItem.warningBackground',
    error: 'statusBarItem.errorBackground',
  };

  statusBarItem.text = `${icons[currentStatus.state]} Swarm`;

  if (currentStatus.state === 'running' && currentStatus.activeAgents !== undefined) {
    statusBarItem.text += ` (${currentStatus.activeAgents}/${currentStatus.agentCount})`;
  }

  const bgColor = colors[currentStatus.state];
  statusBarItem.backgroundColor = bgColor ? new vscode.ThemeColor(bgColor) : undefined;

  statusBarItem.tooltip = createStatusTooltip();
  statusBarItem.show();
}

/**
 * 建立狀態 Tooltip
 */
function createStatusTooltip(): vscode.MarkdownString {
  const tooltip = new vscode.MarkdownString();
  tooltip.appendMarkdown('### Hive-Mind Swarm 狀態\n\n');

  const stateLabels: Record<SwarmState, string> = {
    idle: '閒置',
    initializing: '初始化中...',
    running: '運行中',
    stopping: '停止中...',
    error: '錯誤',
  };

  tooltip.appendMarkdown(`**狀態**: ${stateLabels[currentStatus.state]}\n\n`);

  if (currentStatus.topology) {
    const topo = SWARM_TOPOLOGIES.find(t => t.id === currentStatus.topology);
    tooltip.appendMarkdown(`**拓撲**: ${topo?.name || currentStatus.topology}\n\n`);
  }

  if (currentStatus.agentCount !== undefined) {
    tooltip.appendMarkdown(`**Agent 數量**: ${currentStatus.activeAgents || 0}/${currentStatus.agentCount}\n\n`);
  }

  if (currentStatus.errorMessage) {
    tooltip.appendMarkdown(`**錯誤**: ${currentStatus.errorMessage}\n\n`);
  }

  if (currentStatus.lastUpdate) {
    tooltip.appendMarkdown(`*更新時間: ${currentStatus.lastUpdate.toLocaleTimeString('zh-TW')}*`);
  }

  tooltip.isTrusted = true;
  return tooltip;
}

/**
 * Init Swarm 指令處理器
 */
export async function initSwarmHandler(): Promise<void> {
  // 選擇拓撲
  interface TopologyQuickPickItem extends vscode.QuickPickItem {
    topology: SwarmTopology;
  }

  const topologyItems: TopologyQuickPickItem[] = SWARM_TOPOLOGIES.map(t => {
    const item: TopologyQuickPickItem = {
      label: `$(${t.icon}) ${t.name}`,
      detail: t.description,
      topology: t,
    };
    if (t.recommended) {
      item.description = '(推薦)';
    }
    return item;
  });

  const selectedTopology = await vscode.window.showQuickPick(topologyItems, {
    placeHolder: '選擇 Swarm 拓撲結構',
    matchOnDetail: true,
  });

  if (!selectedTopology) return;

  // 設定 Agent 數量
  const agentCount = await vscode.window.showInputBox({
    prompt: '設定 Agent 數量',
    placeHolder: '輸入數字（建議 3-5）',
    value: '3',
    validateInput: (value) => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 1) {
        return 'Agent 數量必須至少為 1';
      }
      if (num > 10) {
        return 'Agent 數量建議不超過 10';
      }
      return null;
    },
  });

  if (!agentCount) return;

  // 確認執行
  const confirm = await vscode.window.showQuickPick(
    [
      { label: '$(check) 確認執行', value: true },
      { label: '$(close) 取消', value: false },
    ],
    {
      placeHolder: `初始化 ${selectedTopology.topology.name} 拓撲，${agentCount} 個 Agent？`,
    }
  );

  if (!confirm || !confirm.value) return;

  // 更新狀態
  updateStatus({
    state: 'initializing',
    topology: selectedTopology.topology.id,
    agentCount: parseInt(agentCount, 10),
    activeAgents: 0,
  });

  // 執行初始化
  const terminal = vscode.window.createTerminal({
    name: 'Hive-Mind Init',
    iconPath: new vscode.ThemeIcon('rocket'),
  });

  terminal.sendText(
    `claude-flow hive init --topology ${selectedTopology.topology.id} --agents ${agentCount}`
  );
  terminal.show();

  // 監聽終端關閉
  const disposable = vscode.window.onDidCloseTerminal((closedTerminal) => {
    if (closedTerminal === terminal) {
      // 假設成功（實際應該解析輸出）
      updateStatus({ state: 'running', activeAgents: parseInt(agentCount, 10) });
      disposable.dispose();
    }
  });

  vscode.window.showInformationMessage(
    `Swarm 初始化中：${selectedTopology.topology.name}，${agentCount} 個 Agent`
  );
}

/**
 * Swarm 狀態指令處理器
 */
export async function swarmStatusHandler(): Promise<void> {
  // 如果 Swarm 未運行
  if (currentStatus.state === 'idle') {
    const action = await vscode.window.showInformationMessage(
      'Swarm 目前未運行',
      '初始化 Swarm',
      '取消'
    );
    if (action === '初始化 Swarm') {
      vscode.commands.executeCommand('inkstone.swarm.init');
    }
    return;
  }

  // 顯示狀態選單
  const actions = [
    { label: '$(terminal) 查看終端輸出', command: 'terminal' },
    { label: '$(refresh) 刷新狀態', command: 'refresh' },
    { label: '$(debug-stop) 停止 Swarm', command: 'stop' },
  ];

  const selected = await vscode.window.showQuickPick(actions, {
    placeHolder: `Swarm 狀態: ${currentStatus.state}`,
  });

  if (!selected) return;

  switch (selected.command) {
    case 'terminal':
      const terminal = vscode.window.createTerminal({
        name: 'Swarm Status',
        iconPath: new vscode.ThemeIcon('pulse'),
      });
      terminal.sendText('claude-flow hive status');
      terminal.show();
      break;

    case 'refresh':
      await refreshSwarmStatus();
      break;

    case 'stop':
      await stopSwarm();
      break;
  }
}

/**
 * 刷新狀態
 */
async function refreshSwarmStatus(): Promise<void> {
  vscode.window.showInformationMessage('正在刷新 Swarm 狀態...');

  // 執行狀態查詢（實際應該解析輸出）
  const terminal = vscode.window.createTerminal({
    name: 'Swarm Status',
    iconPath: new vscode.ThemeIcon('pulse'),
  });
  terminal.sendText('claude-flow hive status');
  terminal.show();
}

/**
 * 停止 Swarm
 */
async function stopSwarm(): Promise<void> {
  const confirm = await vscode.window.showWarningMessage(
    '確定要停止 Swarm 嗎？',
    { modal: true },
    '停止'
  );

  if (confirm !== '停止') return;

  updateStatus({ state: 'stopping' });

  const terminal = vscode.window.createTerminal({
    name: 'Swarm Stop',
    iconPath: new vscode.ThemeIcon('debug-stop'),
  });
  terminal.sendText('claude-flow hive stop');
  terminal.show();

  // 模擬停止完成
  setTimeout(() => {
    // 重置狀態（清除所有屬性）
    currentStatus = { state: 'idle' };
    _onStatusChange.fire(currentStatus);
    updateStatusBar();
    vscode.window.showInformationMessage('Swarm 已停止');
  }, 2000);
}

/**
 * 註冊 Swarm 指令
 */
export function registerSwarmCommands(context: vscode.ExtensionContext): void {
  // 建立狀態列項目
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    90
  );
  statusBarItem.command = 'inkstone.swarm.status';
  context.subscriptions.push(statusBarItem);

  // 初始化狀態列
  updateStatusBar();

  // 註冊指令
  context.subscriptions.push(
    vscode.commands.registerCommand('inkstone.swarm.init', initSwarmHandler)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('inkstone.swarm.status', swarmStatusHandler)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('inkstone.swarm.stop', stopSwarm)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('inkstone.swarm.refresh', refreshSwarmStatus)
  );
}

/**
 * 清理資源
 */
export function disposeSwarm(): void {
  if (statusUpdateInterval) {
    clearInterval(statusUpdateInterval);
    statusUpdateInterval = null;
  }
  statusBarItem?.dispose();
  statusBarItem = null;
}
