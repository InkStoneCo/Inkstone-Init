// Gherkin Generator Module - Sprint 9 實作
// 提供 EARS 轉 Gherkin 和測試案例生成功能

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * EARS 驗收標準結構
 */
export interface EARSCriteria {
  when: string;
  shall: string;
  within?: string;
}

/**
 * User Story 結構
 */
export interface UserStory {
  id: string;
  title: string;
  asA: string;
  iWant: string;
  soThat: string;
  acceptanceCriteria: EARSCriteria[];
}

/**
 * Epic 結構
 */
export interface Epic {
  id: string;
  name: string;
  stories: UserStory[];
}

/**
 * Gherkin Scenario 結構
 */
export interface GherkinScenario {
  name: string;
  given: string[];
  when: string[];
  then: string[];
}

/**
 * Gherkin Feature 結構
 */
export interface GherkinFeature {
  name: string;
  description: string;
  scenarios: GherkinScenario[];
}

/**
 * 解析 requirements.md 中的 EARS 驗收標準
 */
export function parseRequirementsFile(content: string): Epic[] {
  const epics: Epic[] = [];
  let currentEpic: Epic | null = null;
  let currentStory: UserStory | null = null;

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();

    // 解析 Epic (## Epic N: Name)
    const epicMatch = line.match(/^##\s+Epic\s+(\d+):\s*(.+)$/i);
    if (epicMatch) {
      if (currentEpic) {
        if (currentStory) {
          currentEpic.stories.push(currentStory);
          currentStory = null;
        }
        epics.push(currentEpic);
      }
      currentEpic = {
        id: epicMatch[1]!,
        name: epicMatch[2]!.trim(),
        stories: [],
      };
      continue;
    }

    // 解析 Story (### Story N.M: Title)
    const storyMatch = line.match(/^###\s+Story\s+([\d.]+):\s*(.+)$/i);
    if (storyMatch) {
      if (currentStory && currentEpic) {
        currentEpic.stories.push(currentStory);
      }
      currentStory = {
        id: storyMatch[1]!,
        title: storyMatch[2]!.trim(),
        asA: '',
        iWant: '',
        soThat: '',
        acceptanceCriteria: [],
      };
      continue;
    }

    // 解析 As a / I want / So that
    if (currentStory) {
      const asAMatch = line.match(/^\*\*As a\*\*\s*(.+)$/i) || line.match(/^As a\s+(.+)$/i);
      if (asAMatch) {
        currentStory.asA = asAMatch[1]!.trim();
        continue;
      }

      const iWantMatch = line.match(/^\*\*I want\*\*\s*(.+)$/i) || line.match(/^I want\s+(.+)$/i);
      if (iWantMatch) {
        currentStory.iWant = iWantMatch[1]!.trim();
        continue;
      }

      const soThatMatch = line.match(/^\*\*So that\*\*\s*(.+)$/i) || line.match(/^So that\s+(.+)$/i);
      if (soThatMatch) {
        currentStory.soThat = soThatMatch[1]!.trim();
        continue;
      }

      // 解析 EARS: When ... the system shall ...
      const earsMatch = line.match(/^\*?\*?When\*?\*?\s+(.+?),?\s+\*?\*?the system shall\*?\*?\s+(.+)$/i);
      if (earsMatch) {
        const criteria: EARSCriteria = {
          when: earsMatch[1]!.trim(),
          shall: earsMatch[2]!.trim(),
        };

        // 檢查是否有 within 限制
        const withinMatch = criteria.shall.match(/(.+?)\s+within\s+(.+)$/i);
        if (withinMatch) {
          criteria.shall = withinMatch[1]!.trim();
          criteria.within = withinMatch[2]!.trim();
        }

        currentStory.acceptanceCriteria.push(criteria);
        continue;
      }

      // 也支援 - When ... 格式
      const bulletEarsMatch = line.match(/^-\s+\*?\*?When\*?\*?\s+(.+?),?\s+\*?\*?the system shall\*?\*?\s+(.+)$/i);
      if (bulletEarsMatch) {
        currentStory.acceptanceCriteria.push({
          when: bulletEarsMatch[1]!.trim(),
          shall: bulletEarsMatch[2]!.trim(),
        });
        continue;
      }
    }
  }

  // 加入最後的 story 和 epic
  if (currentStory && currentEpic) {
    currentEpic.stories.push(currentStory);
  }
  if (currentEpic) {
    epics.push(currentEpic);
  }

  return epics;
}

/**
 * 將 EARS 轉換為 Gherkin Scenario
 */
export function earsToGherkin(story: UserStory): GherkinScenario[] {
  const scenarios: GherkinScenario[] = [];

  story.acceptanceCriteria.forEach((criteria, index) => {
    const scenario: GherkinScenario = {
      name: `${story.title} - Scenario ${index + 1}`,
      given: [],
      when: [],
      then: [],
    };

    // Given: 基於 As a 角色
    if (story.asA) {
      scenario.given.push(`I am a ${story.asA.replace(/^a\s+/i, '')}`);
    }

    // When: 基於 EARS When 條件
    scenario.when.push(criteria.when);

    // Then: 基於 EARS shall 行為
    scenario.then.push(`the system should ${criteria.shall}`);

    // 如果有 within 限制，加入額外的 Then
    if (criteria.within) {
      scenario.then.push(`the response time should be within ${criteria.within}`);
    }

    scenarios.push(scenario);
  });

  return scenarios;
}

/**
 * 將 Epic 轉換為 Gherkin Feature
 */
export function epicToFeature(epic: Epic): GherkinFeature {
  const scenarios: GherkinScenario[] = [];

  epic.stories.forEach(story => {
    const storyScenarios = earsToGherkin(story);
    scenarios.push(...storyScenarios);
  });

  return {
    name: epic.name,
    description: `Feature for Epic ${epic.id}: ${epic.name}`,
    scenarios,
  };
}

/**
 * 生成 .feature 文件內容
 */
export function generateFeatureFile(feature: GherkinFeature): string {
  const lines: string[] = [];

  lines.push(`Feature: ${feature.name}`);
  lines.push(`  ${feature.description}`);
  lines.push('');

  feature.scenarios.forEach(scenario => {
    lines.push(`  Scenario: ${scenario.name}`);

    scenario.given.forEach((given, index) => {
      const keyword = index === 0 ? 'Given' : 'And';
      lines.push(`    ${keyword} ${given}`);
    });

    scenario.when.forEach((when, index) => {
      const keyword = index === 0 ? 'When' : 'And';
      lines.push(`    ${keyword} ${when}`);
    });

    scenario.then.forEach((then, index) => {
      const keyword = index === 0 ? 'Then' : 'And';
      lines.push(`    ${keyword} ${then}`);
    });

    lines.push('');
  });

  return lines.join('\n');
}

/**
 * 生成 Gherkin 指令處理器
 */
export async function generateGherkinHandler(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('請先開啟一個工作區');
    return;
  }

  // 尋找 requirements.md
  const reqPath = path.join(workspaceFolder.uri.fsPath, 'rfp', 'proposal', 'requirements.md');

  if (!fs.existsSync(reqPath)) {
    const action = await vscode.window.showWarningMessage(
      '找不到 rfp/proposal/requirements.md',
      '開啟 Vibe Coding',
      '取消'
    );
    if (action === '開啟 Vibe Coding') {
      vscode.commands.executeCommand('inkstone.startVibeCoding');
    }
    return;
  }

  // 讀取並解析
  const content = fs.readFileSync(reqPath, 'utf-8');
  const epics = parseRequirementsFile(content);

  if (epics.length === 0) {
    vscode.window.showWarningMessage('未找到任何 Epic 或 User Story');
    return;
  }

  // 統計
  const totalStories = epics.reduce((sum, e) => sum + e.stories.length, 0);
  const totalCriteria = epics.reduce(
    (sum, e) => sum + e.stories.reduce((s, story) => s + story.acceptanceCriteria.length, 0),
    0
  );

  // 確認生成
  const confirm = await vscode.window.showQuickPick(
    [
      { label: '$(check) 確認生成', value: true },
      { label: '$(close) 取消', value: false },
    ],
    {
      placeHolder: `找到 ${epics.length} 個 Epic，${totalStories} 個 Story，${totalCriteria} 個驗收標準`,
    }
  );

  if (!confirm?.value) return;

  // 建立 Gherkin 目錄
  const gherkinDir = path.join(workspaceFolder.uri.fsPath, 'rfp', 'Gherkin');
  if (!fs.existsSync(gherkinDir)) {
    fs.mkdirSync(gherkinDir, { recursive: true });
  }

  // 生成 .feature 文件
  const generatedFiles: string[] = [];

  for (const epic of epics) {
    const feature = epicToFeature(epic);
    const featureContent = generateFeatureFile(feature);

    // 生成文件名（sanitize）
    const fileName = `epic-${epic.id}-${epic.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.feature`;
    const filePath = path.join(gherkinDir, fileName);

    fs.writeFileSync(filePath, featureContent, 'utf-8');
    generatedFiles.push(fileName);
  }

  // 顯示結果
  const action = await vscode.window.showInformationMessage(
    `已生成 ${generatedFiles.length} 個 .feature 文件`,
    '開啟目錄',
    '查看文件'
  );

  if (action === '開啟目錄') {
    const uri = vscode.Uri.file(gherkinDir);
    vscode.commands.executeCommand('revealInExplorer', uri);
  } else if (action === '查看文件' && generatedFiles.length > 0) {
    const firstFile = path.join(gherkinDir, generatedFiles[0]!);
    const doc = await vscode.workspace.openTextDocument(firstFile);
    await vscode.window.showTextDocument(doc);
  }
}

/**
 * Test Cases 模板結構
 */
export interface TestCase {
  id: string;
  title: string;
  preconditions: string[];
  steps: { action: string; expected: string }[];
  testData?: string;
  environment?: string;
}

/**
 * 生成 Test Cases 文件模板
 */
export function generateTestCasesTemplate(epics: Epic[]): string {
  const lines: string[] = [];

  lines.push('# Test Cases 文件');
  lines.push('');
  lines.push(`> 生成日期: ${new Date().toISOString().split('T')[0]}`);
  lines.push('> 狀態: Draft');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 測試環境');
  lines.push('');
  lines.push('| 環境 | URL | 說明 |');
  lines.push('|-----|-----|-----|');
  lines.push('| Development | http://localhost:3000 | 本地開發環境 |');
  lines.push('| Staging | https://staging.example.com | 預發布環境 |');
  lines.push('| Production | https://www.example.com | 正式環境 |');
  lines.push('');
  lines.push('## 測試帳號');
  lines.push('');
  lines.push('| 角色 | 帳號 | 密碼 | 說明 |');
  lines.push('|-----|------|-----|-----|');
  lines.push('| Admin | admin@test.com | [見密碼管理系統] | 管理員帳號 |');
  lines.push('| User | user@test.com | [見密碼管理系統] | 一般用戶 |');
  lines.push('');
  lines.push('---');
  lines.push('');

  let testCaseId = 1;

  for (const epic of epics) {
    lines.push(`## Epic ${epic.id}: ${epic.name}`);
    lines.push('');

    for (const story of epic.stories) {
      lines.push(`### Story ${story.id}: ${story.title}`);
      lines.push('');

      story.acceptanceCriteria.forEach((criteria, index) => {
        lines.push(`#### TC-${String(testCaseId).padStart(3, '0')}: ${story.title} - Case ${index + 1}`);
        lines.push('');
        lines.push('**前置條件:**');
        lines.push(`- 用戶已登入為 ${story.asA || '一般用戶'}`);
        lines.push('');
        lines.push('**測試步驟:**');
        lines.push('');
        lines.push('| 步驟 | 操作 | 預期結果 |');
        lines.push('|-----|------|---------|');
        lines.push(`| 1 | ${criteria.when} | 系統開始處理 |`);
        lines.push(`| 2 | 等待系統回應 | ${criteria.shall} |`);
        if (criteria.within) {
          lines.push(`| 3 | 確認回應時間 | 回應時間在 ${criteria.within} 內 |`);
        }
        lines.push('');
        lines.push('**測試結果:** [ ] Pass / [ ] Fail');
        lines.push('');
        lines.push('**備註:**');
        lines.push('');
        lines.push('---');
        lines.push('');
        testCaseId++;
      });
    }
  }

  return lines.join('\n');
}

/**
 * 生成 Test Cases 指令處理器
 */
export async function generateTestCasesHandler(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('請先開啟一個工作區');
    return;
  }

  // 尋找 requirements.md
  const reqPath = path.join(workspaceFolder.uri.fsPath, 'rfp', 'proposal', 'requirements.md');

  if (!fs.existsSync(reqPath)) {
    vscode.window.showWarningMessage('找不到 rfp/proposal/requirements.md');
    return;
  }

  // 讀取並解析
  const content = fs.readFileSync(reqPath, 'utf-8');
  const epics = parseRequirementsFile(content);

  if (epics.length === 0) {
    vscode.window.showWarningMessage('未找到任何 Epic 或 User Story');
    return;
  }

  // 生成 Test Cases
  const testCasesContent = generateTestCasesTemplate(epics);

  // 儲存文件
  const testCasesPath = path.join(workspaceFolder.uri.fsPath, 'rfp', 'proposal', 'test-cases.md');
  fs.writeFileSync(testCasesPath, testCasesContent, 'utf-8');

  // 開啟文件
  const doc = await vscode.workspace.openTextDocument(testCasesPath);
  await vscode.window.showTextDocument(doc);

  vscode.window.showInformationMessage('已生成 test-cases.md');
}

/**
 * 預覽 Gherkin 轉換結果
 */
export async function previewGherkinHandler(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('請先開啟一個工作區');
    return;
  }

  const reqPath = path.join(workspaceFolder.uri.fsPath, 'rfp', 'proposal', 'requirements.md');

  if (!fs.existsSync(reqPath)) {
    vscode.window.showWarningMessage('找不到 rfp/proposal/requirements.md');
    return;
  }

  const content = fs.readFileSync(reqPath, 'utf-8');
  const epics = parseRequirementsFile(content);

  if (epics.length === 0) {
    vscode.window.showWarningMessage('未找到任何 Epic 或 User Story');
    return;
  }

  // 建立預覽內容
  const previewLines: string[] = [];
  previewLines.push('# Gherkin 預覽');
  previewLines.push('');
  previewLines.push(`解析結果：${epics.length} 個 Epic`);
  previewLines.push('');

  for (const epic of epics) {
    const feature = epicToFeature(epic);
    previewLines.push('---');
    previewLines.push('');
    previewLines.push('```gherkin');
    previewLines.push(generateFeatureFile(feature));
    previewLines.push('```');
    previewLines.push('');
  }

  // 在新的編輯器中顯示預覽
  const doc = await vscode.workspace.openTextDocument({
    content: previewLines.join('\n'),
    language: 'markdown',
  });
  await vscode.window.showTextDocument(doc, { preview: true });
}

/**
 * 註冊 Gherkin 指令
 */
export function registerGherkinCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('inkstone.gherkin.generate', generateGherkinHandler)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('inkstone.gherkin.preview', previewGherkinHandler)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('inkstone.gherkin.testCases', generateTestCasesHandler)
  );
}
