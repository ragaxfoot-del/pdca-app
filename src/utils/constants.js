// ============================================================
// utils/constants.js — アプリ全体で使う定数
// ============================================================

// 部門名一覧
export const DEPTS = [
  "EC事業部",
  "商品購買部",
  "製造部",
  "出荷物流部",
  "業務改革部",
  "総務部",
];

// 部門ごとのテーマカラー
export const DEPT_COLORS = {
  "EC事業部":   "#2563eb", // 青
  "商品購買部": "#d97706", // オレンジ
  "製造部":     "#059669", // 緑
  "出荷物流部": "#7c3aed", // 紫
  "業務改革部": "#dc2626", // 赤
  "総務部":     "#0891b2", // シアン
};

// PDCAのステータス定義
// value: DBに保存する値 / label: 画面に表示する日本語 / color: バッジの背景色
export const STATUSES = [
  { value: "not_started", label: "未着手",  color: "#9ca3af" }, // 灰
  { value: "in_progress", label: "進行中",  color: "#f59e0b" }, // 黄
  { value: "shared",      label: "共有済",  color: "#3b82f6" }, // 青
  { value: "done",        label: "完了",    color: "#10b981" }, // 緑
  { value: "delayed",     label: "遅延",    color: "#ef4444" }, // 赤
];

// ステータス値からラベル・カラーを取得するヘルパー
export function getStatus(value) {
  return STATUSES.find((s) => s.value === value) || STATUSES[0];
}

// ユーザーの役割（role）の日本語ラベル
export const ROLE_LABELS = {
  admin:   "管理者",
  boss:    "社長",
  general: "一般",
};
