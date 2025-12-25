// Vibe Coding Module - Sprint 8 實作
// 提供階段式需求分析和文件生成功能

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Vibe Coding 工作流程階段
 */
export interface WorkflowStage {
  id: number;
  name: string;
  description: string;
  icon: string;
  outputFile?: string;
}

/**
 * 5 個工作流程階段
 */
export const WORKFLOW_STAGES: WorkflowStage[] = [
  {
    id: 0,
    name: '理解需求',
    description: '與 AI 對話，理解並總結原始需求',
    icon: 'comment-discussion',
    outputFile: 'initial-requirements.md',
  },
  {
    id: 1,
    name: 'User Story Mapping',
    description: '將需求轉換為用戶故事映射',
    icon: 'list-tree',
    outputFile: 'requirements.md',
  },
  {
    id: 2,
    name: 'EARS 驗收標準',
    description: '為每個 User Story 添加 EARS 格式驗收標準',
    icon: 'checklist',
    outputFile: 'requirements.md',
  },
  {
    id: 3,
    name: '系統設計',
    description: '建立架構、組件、接口設計',
    icon: 'symbol-structure',
    outputFile: 'design.md',
  },
  {
    id: 4,
    name: '任務分解',
    description: '生成可執行的任務列表',
    icon: 'tasklist',
    outputFile: 'tasks.md',
  },
];

/**
 * 工作流程狀態
 */
export type WorkflowState = 'idle' | 'active' | 'completed';

/**
 * 工作流程進度
 */
export interface WorkflowProgress {
  state: WorkflowState;
  currentStage: number;
  completedStages: boolean[];
  rfpPath: string;
}

// 全域狀態
let currentProgress: WorkflowProgress = {
  state: 'idle',
  currentStage: 0,
  completedStages: [false, false, false, false, false],
  rfpPath: '',
};

// 狀態變更事件
const _onProgressChange = new vscode.EventEmitter<WorkflowProgress>();
export const onWorkflowProgressChange = _onProgressChange.event;

/**
 * 取得當前進度
 */
export function getWorkflowProgress(): WorkflowProgress {
  return { ...currentProgress, completedStages: [...currentProgress.completedStages] };
}

/**
 * 更新進度
 */
function updateProgress(progress: Partial<WorkflowProgress>): void {
  currentProgress = { ...currentProgress, ...progress };
  _onProgressChange.fire(currentProgress);
}

/**
 * 檢測專案中的 RFP 進度
 */
export async function detectProgress(): Promise<WorkflowProgress> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return currentProgress;
  }

  const rfpPath = path.join(workspaceFolder.uri.fsPath, 'rfp');
  const proposalPath = path.join(rfpPath, 'proposal');

  // 檢查各階段文件是否存在
  const completedStages = [false, false, false, false, false];

  // Stage 0: initial-requirements.md
  const initialReqPath = path.join(rfpPath, 'initial-requirements.md');
  if (fs.existsSync(initialReqPath)) {
    completedStages[0] = true;
  }

  // Stage 1 & 2: requirements.md (with User Stories and EARS)
  const reqPath = path.join(proposalPath, 'requirements.md');
  if (fs.existsSync(reqPath)) {
    const content = fs.readFileSync(reqPath, 'utf-8');
    // Stage 1: Has User Stories
    if (content.includes('As a') || content.includes('作為')) {
      completedStages[1] = true;
    }
    // Stage 2: Has EARS criteria
    if (content.includes('When') || content.includes('當') || content.includes('the system shall')) {
      completedStages[2] = true;
    }
  }

  // Stage 3: design.md
  const designPath = path.join(proposalPath, 'design.md');
  if (fs.existsSync(designPath)) {
    completedStages[3] = true;
  }

  // Stage 4: tasks.md
  const tasksPath = path.join(proposalPath, 'tasks.md');
  if (fs.existsSync(tasksPath)) {
    completedStages[4] = true;
  }

  // 計算當前階段
  let currentStage = 0;
  for (let i = 0; i < completedStages.length; i++) {
    if (completedStages[i]) {
      currentStage = i + 1;
    } else {
      break;
    }
  }

  // 確定狀態
  const allCompleted = completedStages.every(s => s);
  const state: WorkflowState = allCompleted ? 'completed' :
    completedStages.some(s => s) ? 'active' : 'idle';

  updateProgress({
    state,
    currentStage: Math.min(currentStage, 4),
    completedStages,
    rfpPath,
  });

  return currentProgress;
}

/**
 * 開始 Vibe Coding 工作流程
 */
export async function startVibeCodingHandler(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('請先開啟一個工作區');
    return;
  }

  // 檢測現有進度
  await detectProgress();

  // 如果已有進度，詢問是否繼續
  if (currentProgress.state !== 'idle') {
    const stage = WORKFLOW_STAGES[currentProgress.currentStage]!;
    const action = await vscode.window.showQuickPick(
      [
        { label: `$(arrow-right) 繼續階段 ${currentProgress.currentStage + 1}: ${stage.name}`, value: 'continue' },
        { label: '$(refresh) 從頭開始', value: 'restart' },
        { label: '$(list-ordered) 選擇特定階段', value: 'select' },
      ],
      { placeHolder: `檢測到現有進度：階段 ${currentProgress.currentStage + 1}` }
    );

    if (!action) return;

    if (action.value === 'restart') {
      updateProgress({ currentStage: 0, state: 'active' });
    } else if (action.value === 'select') {
      await goToStageHandler();
      return;
    }
  } else {
    updateProgress({ state: 'active', currentStage: 0 });
  }

  // 執行當前階段
  await executeStage(currentProgress.currentStage);
}

/**
 * 跳轉到特定階段
 */
export async function goToStageHandler(stageId?: number): Promise<void> {
  if (stageId !== undefined) {
    await executeStage(stageId);
    return;
  }

  // 顯示階段選擇選單
  interface StageQuickPickItem extends vscode.QuickPickItem {
    stage: WorkflowStage;
  }

  const stageItems: StageQuickPickItem[] = WORKFLOW_STAGES.map((stage, index) => {
    const completed = currentProgress.completedStages[index];
    const isCurrent = index === currentProgress.currentStage;

    const item: StageQuickPickItem = {
      label: `$(${completed ? 'pass' : isCurrent ? 'arrow-right' : 'circle-outline'}) ${index + 1}. ${stage.name}`,
      detail: stage.description,
      stage,
    };

    if (completed) {
      item.description = '✓ 已完成';
    } else if (isCurrent) {
      item.description = '← 當前';
    }

    return item;
  });

  const selected = await vscode.window.showQuickPick(stageItems, {
    placeHolder: '選擇要前往的階段',
    matchOnDetail: true,
  });

  if (selected) {
    await executeStage(selected.stage.id);
  }
}

/**
 * 執行特定階段
 */
async function executeStage(stageId: number): Promise<void> {
  const stage = WORKFLOW_STAGES[stageId];
  if (!stage) {
    vscode.window.showErrorMessage(`無效的階段 ID: ${stageId}`);
    return;
  }
  updateProgress({ currentStage: stageId, state: 'active' });

  // 顯示階段資訊
  const panel = vscode.window.createOutputChannel('Vibe Coding', { log: true });
  panel.show();
  panel.appendLine(`\n${'='.repeat(60)}`);
  panel.appendLine(`階段 ${stageId + 1}: ${stage.name}`);
  panel.appendLine(`${'='.repeat(60)}`);
  panel.appendLine(`\n${stage.description}\n`);

  // 根據階段顯示對應的 prompt
  const prompt = getStagePrompt(stageId);
  panel.appendLine(`提示詞:\n${prompt}\n`);

  // 在終端執行 /vibe-coding 或直接開啟 AI 對話
  const action = await vscode.window.showQuickPick(
    [
      { label: '$(terminal) 在終端執行 /vibe-coding', value: 'terminal' },
      { label: '$(copy) 複製提示詞到剪貼簿', value: 'copy' },
      { label: '$(file-text) 查看/編輯輸出文件', value: 'edit' },
      { label: '$(check) 標記此階段完成', value: 'complete' },
    ],
    { placeHolder: `階段 ${stageId + 1}: ${stage.name} - 選擇操作` }
  );

  if (!action) return;

  switch (action.value) {
    case 'terminal':
      const terminal = vscode.window.createTerminal({
        name: `Vibe Coding - Stage ${stageId + 1}`,
        iconPath: new vscode.ThemeIcon('lightbulb'),
      });
      terminal.sendText(`# 階段 ${stageId + 1}: ${stage.name}`);
      terminal.sendText(`# ${stage.description}`);
      terminal.sendText(`# 請在 Claude Code 中執行 /vibe-coding`);
      terminal.show();
      break;

    case 'copy':
      await vscode.env.clipboard.writeText(prompt);
      vscode.window.showInformationMessage('提示詞已複製到剪貼簿');
      break;

    case 'edit':
      await openOutputFile(stageId);
      break;

    case 'complete':
      await markStageComplete(stageId);
      break;
  }
}

/**
 * 取得階段提示詞
 */
function getStagePrompt(stageId: number): string {
  const prompts = [
    // Stage 0: 理解需求
    `請幫我分析以下需求，總結出：
1. 專案目標和範圍
2. 主要功能需求
3. 非功能需求（效能、安全、相容性等）
4. 潛在的技術挑戰

請將總結保存到 rfp/initial-requirements.md`,

    // Stage 1: User Story Mapping
    `基於 rfp/initial-requirements.md 的需求，請生成 User Story Mapping：

格式範例：
## Epic 1: [Epic 名稱]

### Story 1.1: [Story 標題]
**As a** [角色]
**I want** [功能]
**So that** [目的]

請將結果保存到 rfp/proposal/requirements.md`,

    // Stage 2: EARS 驗收標準
    `請為 rfp/proposal/requirements.md 中的每個 User Story 添加 EARS 格式驗收標準：

EARS 格式範例：
**When** [觸發條件]
**the system shall** [系統行為]
**within** [時間/效能限制] (選填)

請更新 rfp/proposal/requirements.md，在每個 Story 下添加 Acceptance Criteria`,

    // Stage 3: 系統設計
    `基於 rfp/proposal/requirements.md 的需求，請生成系統設計文件：

內容包含：
1. 系統架構圖（使用 Mermaid）
2. 組件設計
3. API 接口設計
4. 資料模型設計
5. 技術棧選擇

請將結果保存到 rfp/proposal/design.md`,

    // Stage 4: 任務分解
    `基於 rfp/proposal/requirements.md 和 rfp/proposal/design.md，請生成任務分解：

格式範例：
## Sprint N: [Sprint 名稱]
- [ ] **任務 N.1**: [任務描述]
  - 子任務 1
  - 子任務 2
  - _需求: Story X.Y_

請將結果保存到 rfp/proposal/tasks.md`,
  ];

  return prompts[stageId] || '';
}

/**
 * 開啟輸出文件
 */
async function openOutputFile(stageId: number): Promise<void> {
  const stage = WORKFLOW_STAGES[stageId];
  if (!stage || !stage.outputFile) return;

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) return;

  let filePath: string;
  if (stageId === 0) {
    filePath = path.join(workspaceFolder.uri.fsPath, 'rfp', stage.outputFile);
  } else {
    filePath = path.join(workspaceFolder.uri.fsPath, 'rfp', 'proposal', stage.outputFile);
  }

  // 如果文件不存在，建立目錄和空白文件
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    const template = getFileTemplate(stageId);
    fs.writeFileSync(filePath, template, 'utf-8');
  }

  const doc = await vscode.workspace.openTextDocument(filePath);
  await vscode.window.showTextDocument(doc);
}

/**
 * 取得文件模板
 */
function getFileTemplate(stageId: number): string {
  const templates = [
    // Stage 0: initial-requirements.md
    `# 初始需求文件

> 日期: ${new Date().toISOString().split('T')[0]}

## 專案概述

[請在此描述專案目標和範圍]

## 功能需求

[列出主要功能需求]

## 非功能需求

[列出效能、安全、相容性等需求]

## 技術挑戰

[列出潛在的技術挑戰]
`,

    // Stage 1 & 2: requirements.md
    `# 需求規格文件

> 版本: 1.0.0
> 日期: ${new Date().toISOString().split('T')[0]}
> 狀態: Draft

---

## Epic 1: [Epic 名稱]

### Story 1.1: [Story 標題]

**As a** [角色]
**I want** [功能]
**So that** [目的]

#### Acceptance Criteria

- **When** [條件]
  **the system shall** [行為]

---
`,

    // Stage 2 shares template with Stage 1
    ``,

    // Stage 3: design.md
    `# 系統設計文件

> 版本: 1.0.0
> 日期: ${new Date().toISOString().split('T')[0]}

---

## 系統架構

\`\`\`mermaid
graph TD
    A[Client] --> B[API Gateway]
    B --> C[Service Layer]
    C --> D[Database]
\`\`\`

## 組件設計

### 組件 1: [名稱]

**職責**: [描述]

**接口**:
- \`method1()\`: 描述

## API 設計

### Endpoint 1

- **Path**: \`/api/v1/resource\`
- **Method**: GET
- **Description**: [描述]

## 資料模型

### Entity 1

| 欄位 | 類型 | 說明 |
|-----|------|-----|
| id | string | 唯一識別碼 |

---
`,

    // Stage 4: tasks.md
    `# 任務分解清單

> 版本: 1.0.0
> 日期: ${new Date().toISOString().split('T')[0]}
> 狀態: Draft

---

## 開發策略

採用增量式 Sprint 開發，每個 Sprint 包含可測試的功能。

---

## Sprint 0: 專案初始化

**目標**: 建立專案結構和開發環境

### 任務 0.1: 環境設置

- [ ] **0.1.1 建立專案結構**
  - [子任務說明]
  - _需求: Story X.Y_

---
`,
  ];

  return templates[stageId] || '';
}

/**
 * 標記階段完成
 */
async function markStageComplete(stageId: number): Promise<void> {
  const newCompleted = [...currentProgress.completedStages];
  newCompleted[stageId] = true;

  // 更新進度
  const nextStage = Math.min(stageId + 1, 4);
  updateProgress({
    completedStages: newCompleted,
    currentStage: nextStage,
    state: newCompleted.every(s => s) ? 'completed' : 'active',
  });

  vscode.window.showInformationMessage(
    `階段 ${stageId + 1} 已完成！${stageId < 4 ? `下一步：階段 ${stageId + 2}` : '所有階段已完成！'}`
  );

  // 如果還有下一階段，詢問是否繼續
  if (stageId < 4) {
    const continueAction = await vscode.window.showQuickPick(
      [
        { label: '$(arrow-right) 繼續下一階段', value: true },
        { label: '$(close) 稍後繼續', value: false },
      ],
      { placeHolder: `前往階段 ${stageId + 2}？` }
    );

    if (continueAction?.value) {
      await executeStage(stageId + 1);
    }
  }
}

/**
 * 註冊 Vibe Coding 指令
 */
export function registerVibeCodingCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('inkstone.startVibeCoding', startVibeCodingHandler)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('inkstone.vibeCoding.goToStage', goToStageHandler)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('inkstone.vibeCoding.detectProgress', detectProgress)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('inkstone.vibeCoding.markComplete', async (stageId: number) => {
      await markStageComplete(stageId);
    })
  );

  // 初始檢測進度
  detectProgress();
}
