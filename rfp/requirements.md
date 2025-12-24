# 新需求

## 有幾個新的需求要整合進來

1. 原僅供 Claude Code 使用，做為啓動用途，含有 Claude Flow Settings, Vibe Coding 流程
   1. 改為：除了 Claude Flow 專用功能外，其他功能可提供 Gemini CLI 使用，甚至 Codex。
2. 原設置一個檔案夾是 requirement/ 放置用戶的需求，另一個檔案夾 rfp/ 放置 AI 規劃，兩個都在根目錄。
   1. 改為根目錄產生 requirements/initial/ 檔案夾，requirements/initial/rfp/ 讓用戶寫需求，requirements/initial/proposal/ 為 AI 用規劃回覆客戶需求
3. 原本流程會產生幾個檔案放在 rfp/，改為放在 requirements/initial/proposal/ 有下列修改：
   1. requirements.md: user story mappings, EARS
      1. 改為：加拆分 Epic，形成 Epics, Storys, EARS 三層結構。
      2. 如果有前端，也要列入需求。
   2. design.md：不變
   3. tasks.md：
      1. 原為按照設計列表，前後端分開開發 => 改用增量式開發，把開發需求拆成模組，每個 spring 包含一些前端及一些後端，形成每一段開發均可進行 E2E 測試。
      2. 每個 Spring 結束提出 test cases 讓使用者測試，包含開發所需所有元素，如連結、帳密、測試內容
      3. 使用者測試完將測試結果回報 test cases 後，依照回報進行修正。
   4. 增加檔案夾 requirements/initial/rfp/Gherkin/
      1. 用 Gherkin 格式撰寫測試腳本，放置該檔案夾。
      2. 開發後需進行自動測試。
4. 如果用戶有新需求，判斷是新的或是修正，如果是新的，開啓新的檔案夾，例如 requirements/new-requirements/ 在新計劃中也有完整的 rfp/ 和 proposal/，這樣可以讓每次的新需求有序。
5. 整合 [Code-Mind](https://github.com/richblack/Code-Mind) 功能，當完成設定時可以在每個檔案標記。

## 做法

請依照 vibe-coding 模式列出本修改的 proposal
完成後請修改 readme.md，除了把位置修改為 organization 和專案名稱，也包括新功能。