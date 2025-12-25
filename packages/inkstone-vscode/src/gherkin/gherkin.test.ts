// Gherkin 模組單元測試
import { describe, it, expect } from 'vitest';
import {
  parseRequirementsFile,
  earsToGherkin,
  epicToFeature,
  generateFeatureFile,
  generateTestCasesTemplate,
  type Epic,
  type UserStory,
  type EARSCriteria,
} from './index.js';

// 測試用的 requirements.md 內容
const TEST_REQUIREMENTS = `# 需求規格文件

## Epic 1: 用戶認證

### Story 1.1: 用戶登入

**As a** 一般用戶
**I want** 使用帳號密碼登入系統
**So that** 我可以存取個人化的功能

#### Acceptance Criteria

- **When** 用戶輸入正確的帳號密碼, **the system shall** 驗證身份並導向首頁
- **When** 用戶輸入錯誤的密碼三次, **the system shall** 鎖定帳號 30 分鐘

### Story 1.2: 密碼重設

**As a** 忘記密碼的用戶
**I want** 透過電子郵件重設密碼
**So that** 我可以恢復帳號存取權

- **When** 用戶點擊忘記密碼, **the system shall** 發送重設連結到註冊信箱 within 5 秒

## Epic 2: 資料管理

### Story 2.1: 資料匯出

**As a** 管理員
**I want** 匯出所有資料為 CSV 格式
**So that** 我可以進行離線分析

- **When** 管理員選擇匯出功能, **the system shall** 生成 CSV 檔案並提供下載
`;

describe('Gherkin Parser', () => {
  describe('parseRequirementsFile', () => {
    it('should parse epics correctly', () => {
      const epics = parseRequirementsFile(TEST_REQUIREMENTS);

      expect(epics.length).toBe(2);
      expect(epics[0]!.id).toBe('1');
      expect(epics[0]!.name).toBe('用戶認證');
      expect(epics[1]!.id).toBe('2');
      expect(epics[1]!.name).toBe('資料管理');
    });

    it('should parse stories correctly', () => {
      const epics = parseRequirementsFile(TEST_REQUIREMENTS);

      expect(epics[0]!.stories.length).toBe(2);
      expect(epics[0]!.stories[0]!.id).toBe('1.1');
      expect(epics[0]!.stories[0]!.title).toBe('用戶登入');
      expect(epics[0]!.stories[1]!.id).toBe('1.2');
      expect(epics[0]!.stories[1]!.title).toBe('密碼重設');
    });

    it('should parse As a / I want / So that', () => {
      const epics = parseRequirementsFile(TEST_REQUIREMENTS);
      const story = epics[0]!.stories[0]!;

      expect(story.asA).toBe('一般用戶');
      expect(story.iWant).toBe('使用帳號密碼登入系統');
      expect(story.soThat).toBe('我可以存取個人化的功能');
    });

    it('should parse EARS acceptance criteria', () => {
      const epics = parseRequirementsFile(TEST_REQUIREMENTS);
      const story = epics[0]!.stories[0]!;

      expect(story.acceptanceCriteria.length).toBe(2);
      expect(story.acceptanceCriteria[0]!.when).toBe('用戶輸入正確的帳號密碼');
      expect(story.acceptanceCriteria[0]!.shall).toBe('驗證身份並導向首頁');
    });

    it('should parse EARS with within constraint', () => {
      const epics = parseRequirementsFile(TEST_REQUIREMENTS);
      const story = epics[0]!.stories[1]!;

      expect(story.acceptanceCriteria[0]!.within).toBe('5 秒');
    });

    it('should handle empty content', () => {
      const epics = parseRequirementsFile('');
      expect(epics.length).toBe(0);
    });

    it('should handle content without epics', () => {
      const epics = parseRequirementsFile('# Just a title\nSome content');
      expect(epics.length).toBe(0);
    });
  });

  describe('earsToGherkin', () => {
    it('should convert EARS to Gherkin scenarios', () => {
      const story: UserStory = {
        id: '1.1',
        title: '用戶登入',
        asA: '一般用戶',
        iWant: '使用帳號密碼登入',
        soThat: '存取系統',
        acceptanceCriteria: [
          { when: '輸入正確密碼', shall: '導向首頁' },
          { when: '輸入錯誤密碼', shall: '顯示錯誤訊息' },
        ],
      };

      const scenarios = earsToGherkin(story);

      expect(scenarios.length).toBe(2);
      expect(scenarios[0]!.name).toBe('用戶登入 - Scenario 1');
      expect(scenarios[0]!.given).toContain('I am a 一般用戶');
      expect(scenarios[0]!.when).toContain('輸入正確密碼');
      expect(scenarios[0]!.then).toContain('the system should 導向首頁');
    });

    it('should handle within constraint in Then', () => {
      const story: UserStory = {
        id: '1.1',
        title: 'Test',
        asA: 'user',
        iWant: 'action',
        soThat: 'goal',
        acceptanceCriteria: [
          { when: 'trigger', shall: 'respond', within: '5 seconds' },
        ],
      };

      const scenarios = earsToGherkin(story);

      expect(scenarios[0]!.then.length).toBe(2);
      expect(scenarios[0]!.then[1]).toContain('within 5 seconds');
    });

    it('should handle empty acceptance criteria', () => {
      const story: UserStory = {
        id: '1.1',
        title: 'Test',
        asA: 'user',
        iWant: 'action',
        soThat: 'goal',
        acceptanceCriteria: [],
      };

      const scenarios = earsToGherkin(story);
      expect(scenarios.length).toBe(0);
    });
  });

  describe('epicToFeature', () => {
    it('should convert epic to feature', () => {
      const epic: Epic = {
        id: '1',
        name: '用戶認證',
        stories: [
          {
            id: '1.1',
            title: '登入',
            asA: 'user',
            iWant: 'login',
            soThat: 'access',
            acceptanceCriteria: [
              { when: 'correct password', shall: 'login success' },
            ],
          },
        ],
      };

      const feature = epicToFeature(epic);

      expect(feature.name).toBe('用戶認證');
      expect(feature.description).toContain('Epic 1');
      expect(feature.scenarios.length).toBe(1);
    });
  });

  describe('generateFeatureFile', () => {
    it('should generate valid Gherkin syntax', () => {
      const feature = {
        name: 'Test Feature',
        description: 'Feature description',
        scenarios: [
          {
            name: 'Test Scenario',
            given: ['I am logged in'],
            when: ['I click button'],
            then: ['I see result'],
          },
        ],
      };

      const content = generateFeatureFile(feature);

      expect(content).toContain('Feature: Test Feature');
      expect(content).toContain('Scenario: Test Scenario');
      expect(content).toContain('Given I am logged in');
      expect(content).toContain('When I click button');
      expect(content).toContain('Then I see result');
    });

    it('should use And for multiple conditions', () => {
      const feature = {
        name: 'Test',
        description: 'Test',
        scenarios: [
          {
            name: 'Multi',
            given: ['condition 1', 'condition 2'],
            when: ['action'],
            then: ['result'],
          },
        ],
      };

      const content = generateFeatureFile(feature);

      expect(content).toContain('Given condition 1');
      expect(content).toContain('And condition 2');
    });
  });

  describe('generateTestCasesTemplate', () => {
    it('should generate test cases with environment table', () => {
      const epics = parseRequirementsFile(TEST_REQUIREMENTS);
      const template = generateTestCasesTemplate(epics);

      expect(template).toContain('# Test Cases 文件');
      expect(template).toContain('## 測試環境');
      expect(template).toContain('Development');
      expect(template).toContain('Staging');
      expect(template).toContain('Production');
    });

    it('should generate test cases with account table', () => {
      const epics = parseRequirementsFile(TEST_REQUIREMENTS);
      const template = generateTestCasesTemplate(epics);

      expect(template).toContain('## 測試帳號');
      expect(template).toContain('Admin');
      expect(template).toContain('User');
    });

    it('should generate test cases for each acceptance criteria', () => {
      const epics = parseRequirementsFile(TEST_REQUIREMENTS);
      const template = generateTestCasesTemplate(epics);

      expect(template).toContain('TC-001');
      expect(template).toContain('用戶登入');
      expect(template).toContain('**前置條件:**');
      expect(template).toContain('**測試步驟:**');
    });
  });
});
