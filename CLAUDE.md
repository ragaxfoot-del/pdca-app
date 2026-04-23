# PDCA App — Claude向けプロジェクトメモ

## プロジェクト概要

週次PDCAサイクルを管理するWebアプリ。
部門ごとにPLAN/DO/CHECK/ACTを記録・共有する。

- **フロントエンド**: React 19 + Vite（インラインスタイル、Tailwindなし）
- **バックエンド**: Google Apps Script (GAS) Web App
- **データベース**: Google Sheets
- **デプロイ先**: GitHub Pages `ragaxfoot-del/pdca-app`
  - URL: `https://ragaxfoot-del.github.io/pdca-app/`

---

## 主要ファイル構成

```
src/
  pages/
    DashboardPage.jsx   # メイン画面（約1330行）。PDCA表示・編集・ナビゲーションすべてここに集約
    LoginPage.jsx       # ログイン画面
    AdminPage.jsx       # ユーザー管理画面（admin専用）
  api/
    client.js           # GAS APIクライアント（JSONP通信）
  hooks/
    useAuth.jsx         # 認証Context + useAuthフック
  utils/
    constants.js        # DEPTS / DEPT_COLORS / STATUSES / ROLE_LABELS 等の定数
    storage.js          # localStorage→sessionStorage→メモリのフォールバックストレージ
  App.jsx               # ルーティング（HashRouter）
```

GASのソースコードは Google Apps Script コンソール上で管理（このリポジトリには含まれない）。

---

## 重要な設計・注意事項

### GAS通信：JSONP方式
- GAS Web AppはリダイレクトするためfetchではCORSエラーになる
- `<script>` タグを動的生成するJSONP方式を採用（`src/api/client.js`）
- リクエスト形式: `?action=X&data={"token":"...","key":"val"}&callback=__gasCb_xxx`
- GAS側は `e.parameter.data` をJSON.parseして使用する
- **トークンはURLに直接埋め込まない**（Base64のURLエンコードで認証エラーになるため、`data` JSONの中に含める）

### ストレージ
- `localStorage` が使えない環境（GitHub Pages + Safari等）があるため、`src/utils/storage.js` のフォールバック関数を必ず使う
- `localStorage.setItem()` を直接呼ばない。`storageGet/storageSet/storageRemove` を使うこと

### ルーティング：HashRouter
- GitHub Pagesはサーバーサイドルーティングがないため `HashRouter` を使用
- URLは `https://.../#/login` のように `#` を含む形式になる
- `BrowserRouter` に戻さないこと

### 役割（role）
- `general`: 自部門のカードのみ編集可
- `boss`: 全部門閲覧・確認コメント・注釈（赤字追記）可
- `admin`: boss権限 + ユーザー管理画面アクセス可
- role/deptの比較は必ず `.toLowerCase().trim()` で正規化すること

### 週タブ
- `WEEK_TABS` に固定の週が定義されている（`DashboardPage.jsx` 上部）
- 「次週プラン作成」ボタンで `extraWeekTabs` state に動的追加される
- `allTabs = [...WEEK_TABS, ...extraWeekTabs]` で両方を結合して使う

---

## ビルド・デプロイ

```bash
# 開発サーバー起動
npm run dev

# 本番ビルド
npm run build

# GitHub Pagesへデプロイ（gh-pages パッケージ使用）
npm run deploy
```

環境変数 `VITE_GAS_URL` に GAS Web App の URL を設定する（`.env` ファイルまたはデプロイ環境）。

---

## GAS側の変更を反映するには

GASのコードを変更した場合、Google Apps Script コンソールで**新しいバージョンとしてデプロイ**し直す必要がある（単にコードを保存するだけでは反映されない）。
