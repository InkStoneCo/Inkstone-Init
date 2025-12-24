# Inkstone-Init 需求規格書

> 版本: 1.0.0
> 日期: 2024-12-24
> 狀態: Draft

---

## Epic 1: VSCode Extension 核心架構

建立統一的 Inkstone VSCode Extension，整合所有功能模組。

### Story 1.1: Extension 基礎架構

**User Story:** As a 開發者, I want 有一個統一的 VSCode Extension 入口, So that 我可以使用所有 Inkstone 功能。

#### Acceptance Criteria (EARS)
1. When 用戶安裝 Extension, the system shall 在 VSCode 中註冊 `inkstone` 命名空間的所有指令
2. When Extension 啟動, the system shall 載入所有子模組（Code-Mind、Init、Vibe Coding）
3. If 任何子模組載入失敗, the system shall 顯示錯誤通知並繼續載入其他模組

### Story 1.2: 一鍵安裝體驗

**User Story:** As a Vibe Coder, I want 從 VSCode Marketplace 搜尋並安裝插件即可使用, So that 我不需要操作終端機。

#### Acceptance Criteria (EARS)
1. When 用戶在 VSCode Marketplace 搜尋 "Inkstone", the system shall 顯示此 Extension
2. When 用戶點擊 Install, the system shall 自動安裝所有依賴，無需額外操作
3. When 安裝完成, the system shall 顯示歡迎訊息並引導用戶開始使用

### Story 1.3: Sidebar 面板

**User Story:** As a 用戶, I want 在 VSCode 側邊欄看到 Inkstone 面板, So that 我可以快速存取所有功能。

#### Acceptance Criteria (EARS)
1. When Extension 啟動, the system shall 在 Explorer 區域顯示「Inkstone」面板圖示
2. When 用戶點擊面板, the system shall 展開顯示所有功能區塊（Notes、Memory、SPARC、Swarm、Vibe Coding）
3. When 用戶展開任一功能區塊, the system shall 顯示該功能的所有可用按鈕

---

## Epic 2: Code-Mind 筆記系統

整合 Zettelkasten 風格的程式碼內筆記功能。

### Story 2.1: 右鍵插入筆記

**User Story:** As a Vibe Coder, I want 選取文字後右鍵即可插入筆記, So that 我不需要記憶特殊語法。

#### Acceptance Criteria (EARS)
1. When 用戶在編輯器中選取文字並右鍵, the system shall 在選單中顯示「Inkstone: Add Note」選項
2. When 用戶點擊「Add Note」, the system shall 彈出輸入框讓用戶輸入筆記標題
3. When 用戶確認輸入, the system shall 自動生成筆記 ID 並在選取位置插入 `[[cm.xxxxxx|標題]]`
4. When 筆記插入成功, the system shall 自動更新 `codemind.md` 檔案

### Story 2.2: 筆記自動補全

**User Story:** As a 開發者, I want 輸入 `[[` 時自動顯示筆記列表, So that 我可以快速引用現有筆記。

#### Acceptance Criteria (EARS)
1. When 用戶輸入 `[[`, the system shall 顯示所有現有筆記的自動補全列表
2. When 用戶繼續輸入, the system shall 即時過濾符合的筆記
3. When 用戶選擇筆記, the system shall 自動完成 `[[cm.xxxxxx|標題]]` 格式

### Story 2.3: 筆記樹狀視圖

**User Story:** As a 用戶, I want 在側邊欄看到所有筆記的樹狀結構, So that 我可以瀏覽和管理知識庫。

#### Acceptance Criteria (EARS)
1. When 用戶展開 Notes 區塊, the system shall 顯示按檔案分組的筆記樹狀結構
2. When 用戶點擊筆記, the system shall 跳轉到該筆記在程式碼中的位置
3. When `codemind.md` 更新, the system shall 自動刷新樹狀視圖

### Story 2.4: 雙向連結導航

**User Story:** As a 開發者, I want 點擊筆記引用時跳轉到定義處, So that 我可以快速追蹤知識脈絡。

#### Acceptance Criteria (EARS)
1. When 用戶 Ctrl/Cmd+Click 筆記引用 `[[cm.xxxxxx]]`, the system shall 跳轉到該筆記的定義位置
2. When 用戶 hover 筆記引用, the system shall 顯示筆記內容的預覽
3. When 用戶右鍵筆記引用, the system shall 顯示「Find All References」選項

### Story 2.5: Daemon 自動啟動

**User Story:** As a 用戶, I want Code-Mind Daemon 在需要時自動啟動, So that 我不需要手動執行終端指令。

#### Acceptance Criteria (EARS)
1. When 用戶執行任何筆記操作, the system shall 檢查 Daemon 是否運行
2. If Daemon 未運行, the system shall 自動在背景啟動 Daemon
3. When Daemon 啟動成功, the system shall 在狀態列顯示運行狀態圖示

---

## Epic 3: 專案初始化

提供一鍵初始化專案結構的功能。

### Story 3.1: Initialize Project 指令

**User Story:** As a 開發者, I want 執行「Inkstone: Initialize Project」指令, So that 我可以自動建立標準目錄結構。

#### Acceptance Criteria (EARS)
1. When 用戶執行 `Inkstone: Initialize Project` 指令, the system shall 顯示初始化選項對話框
2. When 用戶確認初始化, the system shall 建立所有必要的目錄和檔案
3. If 專案已初始化, the system shall 詢問是否覆蓋現有設定

### Story 3.2: 目錄結構生成

**User Story:** As a 用戶, I want 初始化後自動建立 `requirements/initial/rfp/` 和 `requirements/initial/proposal/` 目錄, So that 我可以有組織地管理需求文件。

#### Acceptance Criteria (EARS)
1. When 初始化完成, the system shall 建立以下目錄結構：
   - `requirements/initial/rfp/`
   - `requirements/initial/rfp/Gherkin/`
   - `requirements/initial/proposal/`
2. When 目錄建立, the system shall 在每個目錄放置 README.md 說明用途
3. If 目錄已存在, the system shall 保留現有內容

### Story 3.3: AI 工具設定檔

**User Story:** As a 開發者, I want 初始化時自動建立 `.claude/`、`.gemini/` 等設定目錄, So that 我可以支援多種 AI 工具。

#### Acceptance Criteria (EARS)
1. When 用戶選擇 Claude Code, the system shall 建立 `.claude/settings.json` 和 `CLAUDE.md`
2. When 用戶選擇 Gemini CLI, the system shall 建立 `.gemini/config.yaml`
3. When 用戶選擇 Codex, the system shall 建立 `AGENTS.md`
4. When 用戶選擇多個工具, the system shall 建立所有對應的設定檔

### Story 3.4: Hooks 自動配置

**User Story:** As a 用戶, I want 初始化時自動設定 Claude Code hooks, So that 我可以獲得通知和 Daemon 自動啟動功能。

#### Acceptance Criteria (EARS)
1. When 初始化完成, the system shall 在 `.claude/settings.json` 中配置 Notification hook
2. When 初始化完成, the system shall 在 `.claude/settings.json` 中配置 PreToolUse hook 以自動啟動 Daemon
3. If 用戶已有 hooks 設定, the system shall 合併而非覆蓋

---

## Epic 4: Vibe Coding 工作流程

提供從自然語言需求到可執行任務的引導式流程。

### Story 4.1: Start Vibe Coding 指令

**User Story:** As a Vibe Coder, I want 執行「Inkstone: Start Vibe Coding」或 `/vibe-coding` 開始工作流程, So that 我可以將想法轉換為實作計畫。

#### Acceptance Criteria (EARS)
1. When 用戶執行 `Inkstone: Start Vibe Coding`, the system shall 開啟 Vibe Coding Webview 面板
2. When 用戶在 Claude Code 中輸入 `/vibe-coding`, the system shall 啟動相同的工作流程
3. When 工作流程啟動, the system shall 檢測並顯示當前進度階段

### Story 4.2: 階段式引導 UI

**User Story:** As a 用戶, I want 有視覺化的引導界面顯示當前階段和進度, So that 我可以清楚知道流程進行到哪裡。

#### Acceptance Criteria (EARS)
1. When Webview 開啟, the system shall 顯示 5 個階段的進度指示器
2. When 用戶完成一個階段, the system shall 自動標記為完成並高亮下一階段
3. When 用戶點擊已完成的階段, the system shall 允許返回修改

### Story 4.3: Epics/Stories/EARS 三層結構

**User Story:** As a 開發者, I want 需求文件使用 Epic → Story → EARS 三層結構, So that 我可以更好地組織大型專案需求。

#### Acceptance Criteria (EARS)
1. When 生成 requirements.md, the system shall 使用 Epic 作為一級標題
2. When 生成 requirements.md, the system shall 使用 Story 作為二級標題，包含 User Story 描述
3. When 生成 requirements.md, the system shall 在每個 Story 下方列出 EARS 格式的 Acceptance Criteria

### Story 4.4: Sprint 增量開發規劃

**User Story:** As a 專案經理, I want 任務按 Sprint 劃分且每個 Sprint 包含前後端, So that 每個階段都可進行 E2E 測試。

#### Acceptance Criteria (EARS)
1. When 生成 tasks.md, the system shall 將任務按 Sprint 分組
2. When 規劃 Sprint, the system shall 確保每個 Sprint 包含可獨立運行的前後端功能
3. When Sprint 包含前端, the system shall 明確標註 UI/UX 相關任務

### Story 4.5: Gherkin 測試腳本生成

**User Story:** As a QA, I want 自動生成 Gherkin 格式的測試腳本, So that 我可以進行自動化測試。

#### Acceptance Criteria (EARS)
1. When 完成 EARS Acceptance Criteria, the system shall 自動生成對應的 Gherkin 測試腳本
2. When 生成測試腳本, the system shall 將檔案放置在 `requirements/initial/rfp/Gherkin/` 目錄
3. When 測試腳本生成, the system shall 使用 Feature/Scenario/Given/When/Then 標準格式

### Story 4.6: Test Cases 交付

**User Story:** As a 用戶, I want 每個 Sprint 結束時獲得完整的測試案例（含連結、帳密、測試步驟）, So that 我可以驗收功能。

#### Acceptance Criteria (EARS)
1. When Sprint 完成, the system shall 生成 Test Cases 文件
2. When 生成 Test Cases, the system shall 包含測試環境連結、測試帳號密碼
3. When 生成 Test Cases, the system shall 包含詳細的測試步驟和預期結果

---

## Epic 5: 記憶管理

提供按鈕化的記憶儲存和恢復功能。

### Story 5.1: 儲存記憶按鈕

**User Story:** As a 用戶, I want 點擊「Save Memory」按鈕並輸入內容, So that 我可以將重要資訊儲存到 `codemind.md`。

#### Acceptance Criteria (EARS)
1. When 用戶點擊「Save Memory」按鈕, the system shall 顯示輸入對話框
2. When 用戶輸入標題和內容, the system shall 建立新筆記並標記為「memory」類型
3. When 儲存成功, the system shall 顯示成功通知

### Story 5.2: 恢復記憶按鈕

**User Story:** As a 用戶, I want 點擊「Restore Memory」按鈕, So that AI 可以讀取之前儲存的記憶。

#### Acceptance Criteria (EARS)
1. When 用戶點擊「Restore Memory」按鈕, the system shall 讀取所有 memory 類型的筆記
2. When 讀取完成, the system shall 將內容格式化並複製到剪貼簿
3. When 用戶使用 Claude Code, the system shall 自動將記憶內容傳遞給 AI

### Story 5.3: 搜尋記憶

**User Story:** As a 用戶, I want 搜尋記憶內容, So that 我可以快速找到需要的資訊。

#### Acceptance Criteria (EARS)
1. When 用戶點擊「Search Memory」按鈕, the system shall 顯示搜尋輸入框
2. When 用戶輸入關鍵字, the system shall 即時顯示符合的筆記列表
3. When 用戶點擊搜尋結果, the system shall 跳轉到該筆記位置

---

## Epic 6: SPARC 開發模式

提供一鍵執行各種 SPARC 開發模式的功能。

### Story 6.1: SPARC 模式面板

**User Story:** As a 開發者, I want 在側邊欄看到所有 SPARC 模式按鈕, So that 我可以快速選擇開發模式。

#### Acceptance Criteria (EARS)
1. When 用戶展開 SPARC 區塊, the system shall 顯示所有可用的開發模式按鈕
2. When 用戶 hover 按鈕, the system shall 顯示該模式的簡短說明
3. When 某模式正在執行, the system shall 在按鈕上顯示運行狀態

### Story 6.2: Architect 模式

**User Story:** As a 開發者, I want 點擊按鈕執行架構設計模式, So that 我不需要記憶終端指令。

#### Acceptance Criteria (EARS)
1. When 用戶點擊「Architect」按鈕, the system shall 顯示任務描述輸入框
2. When 用戶確認輸入, the system shall 在背景執行 `claude-flow sparc run architect` 指令
3. When 執行完成, the system shall 通知用戶並顯示結果摘要

### Story 6.3: Coder 模式

**User Story:** As a 開發者, I want 點擊按鈕執行編碼模式, So that 我可以快速開始實作。

#### Acceptance Criteria (EARS)
1. When 用戶點擊「Coder」按鈕, the system shall 顯示任務描述輸入框
2. When 用戶確認輸入, the system shall 在背景執行 `claude-flow sparc run coder` 指令
3. When 執行完成, the system shall 通知用戶並顯示結果摘要

### Story 6.4: TDD 模式

**User Story:** As a 開發者, I want 點擊按鈕執行測試驅動開發模式, So that 我可以建立測試套件。

#### Acceptance Criteria (EARS)
1. When 用戶點擊「TDD」按鈕, the system shall 顯示任務描述輸入框
2. When 用戶確認輸入, the system shall 在背景執行 `claude-flow sparc run tdd` 指令
3. When 執行完成, the system shall 通知用戶並顯示測試結果

---

## Epic 7: Swarm 協調

提供 Hive-Mind 蜂群協調功能的按鈕化操作。

### Story 7.1: Init Swarm 按鈕

**User Story:** As a 開發者, I want 點擊按鈕初始化 Swarm, So that 我可以快速啟動多 Agent 協作。

#### Acceptance Criteria (EARS)
1. When 用戶點擊「Init Swarm」按鈕, the system shall 顯示拓撲選擇對話框（mesh/hierarchical/ring/star）
2. When 用戶選擇拓撲, the system shall 顯示 Agent 數量設定
3. When 用戶確認, the system shall 執行 `claude-flow hive init` 指令

### Story 7.2: Swarm 狀態監控

**User Story:** As a 用戶, I want 查看當前 Swarm 的運行狀態, So that 我可以了解任務進度。

#### Acceptance Criteria (EARS)
1. When Swarm 正在運行, the system shall 在側邊欄顯示狀態摘要
2. When 用戶點擊狀態區塊, the system shall 開啟詳細狀態 Webview
3. When 任務完成或失敗, the system shall 即時更新狀態並通知用戶

---

## Epic 8: 新需求管理

提供有組織的新需求追蹤機制。

### Story 8.1: 新需求分類判斷

**User Story:** As a 專案經理, I want 系統能判斷新需求是「新功能」還是「修正」, So that 我可以正確歸檔。

#### Acceptance Criteria (EARS)
1. When 用戶新增需求, the system shall 詢問「這是新功能還是現有功能的修正？」
2. When 用戶選擇「新功能」, the system shall 建立新的需求資料夾
3. When 用戶選擇「修正」, the system shall 在原有需求資料夾中新增修正記錄

### Story 8.2: 需求版本資料夾

**User Story:** As a 開發者, I want 每個新需求有獨立的資料夾（如 `requirements/feature-xxx/`）, So that 我可以追蹤需求歷史。

#### Acceptance Criteria (EARS)
1. When 建立新功能需求, the system shall 建立 `requirements/{feature-name}/` 資料夾
2. When 建立資料夾, the system shall 包含 `rfp/` 和 `proposal/` 子目錄
3. When 列出需求, the system shall 按時間順序顯示所有需求版本

---

## Epic 9: 多 AI 工具支援

支援 Claude Code 以外的 AI 開發工具。

### Story 9.1: Gemini CLI 支援

**User Story:** As a Gemini 用戶, I want 使用相同的專案結構和工作流程, So that 我可以無縫切換 AI 工具。

#### Acceptance Criteria (EARS)
1. When 用戶選擇 Gemini CLI, the system shall 建立 `.gemini/config.yaml` 設定檔
2. When 用戶使用 Gemini CLI, the system shall 能讀取相同的 `codemind.md` 筆記
3. When 用戶切換 AI 工具, the system shall 保留所有專案設定和記憶

### Story 9.2: Codex 支援

**User Story:** As a Codex 用戶, I want 有對應的設定檔（如 `AGENTS.md`）, So that Codex 能理解專案脈絡。

#### Acceptance Criteria (EARS)
1. When 用戶選擇 Codex, the system shall 建立 `AGENTS.md` 設定檔
2. When 建立 `AGENTS.md`, the system shall 包含專案結構說明和開發指引
3. When 用戶更新專案設定, the system shall 同步更新 `AGENTS.md`

### Story 9.3: 通用 AI 指引

**User Story:** As a 開發者, I want 有通用的 AI 指引文件, So that 任何 AI 工具都能理解專案規範。

#### 驗收標準
1. When 初始化專案, the system shall 建立 `AI_GUIDE.md` 通用指引文件
2. When 建立指引, the system shall 包含專案結構、開發流程、記憶系統使用說明
3. When 專案設定變更, the system shall 提示用戶更新 AI 指引

---

## Epic 10: 文件格式規範

確保 AI 生成的需求文件遵循統一的格式規範。

### Story 10.1: 中英混合格式規範

**User Story:** As a 台灣用戶, I want 文件主要使用中文但關鍵詞保持英文, So that 我可以理解內容同時保持專業術語的一致性。

#### 驗收標準
1. When AI 生成 User Story, the system shall 使用格式：「As a 角色, I want 功能, So that 目的」
2. When AI 生成驗收標準, the system shall 使用格式：「When 條件, the system shall 行為」或「If 條件, the system shall 行為」
3. When AI 生成 Gherkin 測試, the system shall 使用格式：「Given 前置條件 / When 操作 / Then 預期結果」
4. When 生成章節標題, the system shall 使用中文（如「驗收標準」而非「Acceptance Criteria」）
5. When 生成內容, the system shall 僅在句子中使用英文關鍵詞（As a, I want, So that, When, If, the system shall, Given, Then 等）

### Story 10.2: User Story 格式

**User Story:** As a 開發者, I want User Story 遵循標準格式, So that 需求描述一致且易於理解。

#### 驗收標準
1. When 生成 User Story, the system shall 使用單行格式：`**User Story:** As a 角色, I want 功能, So that 目的`
2. When 描述角色, the system shall 使用中文角色名稱（如「開發者」、「用戶」、「Vibe Coder」）
3. When 描述功能和目的, the system shall 使用中文描述

### Story 10.3: EARS 驗收標準格式

**User Story:** As a QA, I want 驗收標準遵循 EARS 格式, So that 標準清晰可測試。

#### 驗收標準
1. When 描述事件觸發行為, the system shall 使用「When 條件, the system shall 行為」格式
2. When 描述條件判斷行為, the system shall 使用「If 條件, the system shall 行為」格式
3. When 使用連接詞, the system shall 保持英文（When, If, the system shall, and, or）
4. When 描述條件和行為內容, the system shall 使用中文
