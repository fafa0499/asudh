# GitHub Pages 部署說明

本專案使用 Vite 建置，GitHub Actions 會在推送到 `main` 分支後自動建置並部署。

## 第一次設定

1. 將本專案內容上傳到 GitHub repository 的 `main` 分支。
2. 開啟 repository 的 **Settings → Pages**。
3. 在 **Build and deployment → Source** 選擇 **GitHub Actions**。
4. 開啟 **Actions** 頁籤，等待 `Deploy to GitHub Pages` 工作完成。
5. 成功後，Pages 網址會顯示在 repository 的 Settings → Pages，也會顯示在部署工作結果中。

## 之後更新遊戲

修改遊戲檔案後，將變更 commit 並 push 到 `main` 分支。GitHub Actions 會自動重新建置與部署，網址不變。

## 注意事項

- 本專案使用相對資源路徑 `base: './'`，可部署在 `https://帳號.github.io/專案名稱/`。
- `node_modules` 與 `dist` 不需要上傳；GitHub Actions 會在雲端安裝依賴並產生 `dist`。
- GitHub Pages 是公開網站，請勿將 API 金鑰、密碼或 `.env.local` 上傳到 repository。
- 若要使用 GitHub Pages，遊戲本身必須是純前端靜態功能；Express 或需要伺服器端金鑰的功能不能直接由 Pages 執行。
