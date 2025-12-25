// Requirements Management Module - Sprint 10 實作
// 提供新需求分類和版本資料夾管理

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 需求類型
 */
export type RequirementType = 'feature' | 'fix' | 'enhancement' | 'refactor';

/**
 * 需求類型定義
 */
export interface RequirementTypeInfo {
  id: RequirementType;
  name: string;
  description: string;
  icon: string;
  prefix: string;
}

/**
 * 可用的需求類型
 */
export const REQUIREMENT_TYPES: RequirementTypeInfo[] = [
  {
    id: 'feature',
    name: '新功能 (Feature)',
    description: '全新的功能需求',
    icon: 'sparkle',
    prefix: 'feat',
  },
  {
    id: 'fix',
    name: '修正 (Fix)',
    description: '修復現有問題或錯誤',
    icon: 'tools',
    prefix: 'fix',
  },
  {
    id: 'enhancement',
    name: '增強 (Enhancement)',
    description: '改進現有功能',
    icon: 'arrow-up',
    prefix: 'enhance',
  },
  {
    id: 'refactor',
    name: '重構 (Refactor)',
    description: '程式碼重構，不改變功能',
    icon: 'refresh',
    prefix: 'refactor',
  },
];

/**
 * 需求項目
 */
export interface Requirement {
  id: string;
  name: string;
  type: RequirementType;
  path: string;
  createdAt: Date;
  hasRfp: boolean;
  hasProposal: boolean;
  hasGherkin: boolean;
}

// 狀態變更事件
const _onRequirementsChange = new vscode.EventEmitter<Requirement[]>();
export const onRequirementsChange = _onRequirementsChange.event;

// 快取的需求列表
let cachedRequirements: Requirement[] = [];

/**
 * 掃描需求目錄
 */
export async function scanRequirements(): Promise<Requirement[]> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return [];
  }

  const requirementsDir = path.join(workspaceFolder.uri.fsPath, 'requirements');
  const requirements: Requirement[] = [];

  // 檢查 requirements 目錄是否存在
  if (!fs.existsSync(requirementsDir)) {
    cachedRequirements = [];
    _onRequirementsChange.fire(cachedRequirements);
    return [];
  }

  // 掃描子目錄
  const entries = fs.readdirSync(requirementsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const reqPath = path.join(requirementsDir, entry.name);
    const rfpPath = path.join(reqPath, 'rfp');
    const proposalPath = path.join(reqPath, 'proposal');
    const gherkinPath = path.join(rfpPath, 'Gherkin');

    // 解析需求類型和名稱
    const match = entry.name.match(/^(\d{8})-([a-z]+)-(.+)$/);
    let type: RequirementType = 'feature';
    let name = entry.name;

    if (match) {
      const prefix = match[2];
      name = match[3]!.replace(/-/g, ' ');
      const typeInfo = REQUIREMENT_TYPES.find(t => t.prefix === prefix);
      if (typeInfo) {
        type = typeInfo.id;
      }
    }

    // 獲取創建時間
    const stats = fs.statSync(reqPath);

    requirements.push({
      id: entry.name,
      name,
      type,
      path: reqPath,
      createdAt: stats.birthtime,
      hasRfp: fs.existsSync(rfpPath),
      hasProposal: fs.existsSync(proposalPath),
      hasGherkin: fs.existsSync(gherkinPath),
    });
  }

  // 按時間排序（最新的在前）
  requirements.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  cachedRequirements = requirements;
  _onRequirementsChange.fire(cachedRequirements);
  return requirements;
}

/**
 * 取得快取的需求列表
 */
export function getRequirements(): Requirement[] {
  return [...cachedRequirements];
}

/**
 * 生成需求 ID
 */
function generateRequirementId(type: RequirementTypeInfo, name: string): string {
  const date = new Date().toISOString().split('T')[0]!.replace(/-/g, '');
  const sanitizedName = name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${date}-${type.prefix}-${sanitizedName}`;
}

/**
 * 建立需求目錄結構
 */
async function createRequirementStructure(reqPath: string, type: RequirementTypeInfo, name: string): Promise<void> {
  // 建立主目錄
  fs.mkdirSync(reqPath, { recursive: true });

  // 建立 rfp 目錄
  const rfpPath = path.join(reqPath, 'rfp');
  fs.mkdirSync(rfpPath, { recursive: true });

  // 建立 proposal 目錄
  const proposalPath = path.join(reqPath, 'proposal');
  fs.mkdirSync(proposalPath, { recursive: true });

  // 建立 Gherkin 目錄
  const gherkinPath = path.join(rfpPath, 'Gherkin');
  fs.mkdirSync(gherkinPath, { recursive: true });

  // 生成 README.md
  const readmeContent = generateReadme(type, name);
  fs.writeFileSync(path.join(reqPath, 'README.md'), readmeContent, 'utf-8');

  // 生成 initial-requirements.md 模板
  const initialReqContent = generateInitialRequirements(type, name);
  fs.writeFileSync(path.join(rfpPath, 'initial-requirements.md'), initialReqContent, 'utf-8');
}

/**
 * 生成 README.md
 */
function generateReadme(type: RequirementTypeInfo, name: string): string {
  return `# ${name}

> 類型: ${type.name}
> 建立日期: ${new Date().toISOString().split('T')[0]}
> 狀態: Draft

## 概述

[請描述此需求的概述]

## 目錄結構

\`\`\`
${name}/
├── README.md              # 本文件
├── rfp/                   # 需求文件
│   ├── initial-requirements.md  # 原始需求
│   └── Gherkin/          # Gherkin 測試腳本
└── proposal/             # 提案文件
    ├── requirements.md   # User Stories + EARS
    ├── design.md         # 系統設計
    ├── tasks.md          # 任務分解
    └── test-cases.md     # 測試案例
\`\`\`

## 工作流程

使用 Vibe Coding 工作流程完成需求分析：

1. **理解需求** - 編輯 \`rfp/initial-requirements.md\`
2. **User Story Mapping** - 生成 \`proposal/requirements.md\`
3. **EARS 驗收標準** - 更新 \`proposal/requirements.md\`
4. **系統設計** - 生成 \`proposal/design.md\`
5. **任務分解** - 生成 \`proposal/tasks.md\`

## 相關連結

- [返回需求列表](../README.md)
`;
}

/**
 * 生成 initial-requirements.md
 */
function generateInitialRequirements(type: RequirementTypeInfo, name: string): string {
  return `# ${name} - 初始需求

> 類型: ${type.name}
> 日期: ${new Date().toISOString().split('T')[0]}

## 背景

[請描述此需求的背景和動機]

## 目標

[請描述期望達成的目標]

## 功能需求

[列出主要功能需求]

1.
2.
3.

## 非功能需求

[列出效能、安全、相容性等需求]

- 效能：
- 安全：
- 相容性：

## 限制條件

[列出任何限制或約束]

## 驗收標準

[初步的驗收標準，後續會轉換為 EARS 格式]

## 備註

[其他備註事項]
`;
}

/**
 * 新增需求指令處理器
 */
export async function newRequirementHandler(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('請先開啟一個工作區');
    return;
  }

  // 選擇需求類型
  interface TypeQuickPickItem extends vscode.QuickPickItem {
    typeInfo: RequirementTypeInfo;
  }

  const typeItems: TypeQuickPickItem[] = REQUIREMENT_TYPES.map(t => ({
    label: `$(${t.icon}) ${t.name}`,
    detail: t.description,
    typeInfo: t,
  }));

  const selectedType = await vscode.window.showQuickPick(typeItems, {
    placeHolder: '選擇需求類型',
    matchOnDetail: true,
  });

  if (!selectedType) return;

  // 輸入需求名稱
  const name = await vscode.window.showInputBox({
    prompt: '輸入需求名稱',
    placeHolder: '例如：用戶登入功能',
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return '名稱不能為空';
      }
      if (value.length > 50) {
        return '名稱不能超過 50 個字元';
      }
      return null;
    },
  });

  if (!name) return;

  // 生成需求 ID
  const reqId = generateRequirementId(selectedType.typeInfo, name);
  const requirementsDir = path.join(workspaceFolder.uri.fsPath, 'requirements');
  const reqPath = path.join(requirementsDir, reqId);

  // 檢查是否已存在
  if (fs.existsSync(reqPath)) {
    vscode.window.showErrorMessage(`需求 "${reqId}" 已存在`);
    return;
  }

  // 建立結構
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: '建立需求結構...',
      cancellable: false,
    },
    async () => {
      await createRequirementStructure(reqPath, selectedType.typeInfo, name);
    }
  );

  // 刷新需求列表
  await scanRequirements();

  // 開啟 initial-requirements.md
  const initialReqPath = path.join(reqPath, 'rfp', 'initial-requirements.md');
  const doc = await vscode.workspace.openTextDocument(initialReqPath);
  await vscode.window.showTextDocument(doc);

  // 詢問是否啟動 Vibe Coding
  const action = await vscode.window.showInformationMessage(
    `已建立需求「${name}」`,
    '開始 Vibe Coding',
    '稍後'
  );

  if (action === '開始 Vibe Coding') {
    vscode.commands.executeCommand('inkstone.startVibeCoding');
  }
}

/**
 * 開啟需求指令處理器
 */
export async function openRequirementHandler(requirement?: Requirement): Promise<void> {
  if (!requirement) {
    // 如果沒有指定需求，顯示選擇對話框
    const requirements = getRequirements();
    if (requirements.length === 0) {
      const action = await vscode.window.showInformationMessage(
        '尚無任何需求',
        '新增需求'
      );
      if (action === '新增需求') {
        await newRequirementHandler();
      }
      return;
    }

    interface ReqQuickPickItem extends vscode.QuickPickItem {
      requirement: Requirement;
    }

    const items: ReqQuickPickItem[] = requirements.map(req => {
      const typeInfo = REQUIREMENT_TYPES.find(t => t.id === req.type);
      const item: ReqQuickPickItem = {
        label: `$(${typeInfo?.icon || 'file'}) ${req.name}`,
        detail: `建立於 ${req.createdAt.toLocaleDateString('zh-TW')}`,
        requirement: req,
      };
      if (typeInfo?.name) {
        item.description = typeInfo.name;
      }
      return item;
    });

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: '選擇要開啟的需求',
      matchOnDetail: true,
    });

    if (!selected) return;
    requirement = selected.requirement;
  }

  // 顯示操作選單
  const actions = [
    { label: '$(file) 開啟 README', value: 'readme' },
    { label: '$(edit) 編輯初始需求', value: 'initial' },
    { label: '$(list-tree) 查看 User Stories', value: 'requirements' },
    { label: '$(symbol-structure) 查看設計文件', value: 'design' },
    { label: '$(tasklist) 查看任務列表', value: 'tasks' },
    { label: '$(folder) 在檔案總管開啟', value: 'reveal' },
  ];

  const action = await vscode.window.showQuickPick(actions, {
    placeHolder: `${requirement.name} - 選擇操作`,
  });

  if (!action) return;

  const reqPath = requirement.path;

  switch (action.value) {
    case 'readme':
      await openFile(path.join(reqPath, 'README.md'));
      break;
    case 'initial':
      await openFile(path.join(reqPath, 'rfp', 'initial-requirements.md'));
      break;
    case 'requirements':
      await openFile(path.join(reqPath, 'proposal', 'requirements.md'));
      break;
    case 'design':
      await openFile(path.join(reqPath, 'proposal', 'design.md'));
      break;
    case 'tasks':
      await openFile(path.join(reqPath, 'proposal', 'tasks.md'));
      break;
    case 'reveal':
      const uri = vscode.Uri.file(reqPath);
      vscode.commands.executeCommand('revealInExplorer', uri);
      break;
  }
}

/**
 * 開啟文件（如果不存在則建立）
 */
async function openFile(filePath: string): Promise<void> {
  if (!fs.existsSync(filePath)) {
    // 建立空白文件
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, `# ${path.basename(filePath, '.md')}\n\n[請填寫內容]\n`, 'utf-8');
  }

  const doc = await vscode.workspace.openTextDocument(filePath);
  await vscode.window.showTextDocument(doc);
}

/**
 * 刷新需求列表
 */
export async function refreshRequirementsHandler(): Promise<void> {
  await scanRequirements();
  vscode.window.showInformationMessage(`找到 ${cachedRequirements.length} 個需求`);
}

/**
 * 註冊需求管理指令
 */
export function registerRequirementCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('inkstone.requirements.new', newRequirementHandler)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('inkstone.requirements.open', openRequirementHandler)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('inkstone.requirements.refresh', refreshRequirementsHandler)
  );

  // 初始掃描
  scanRequirements();
}
