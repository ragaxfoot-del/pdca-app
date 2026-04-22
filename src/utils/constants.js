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

// ============================================================
// 週サイクルグループ定義
// ============================================================

// グループA：月〜日サイクル
export const GROUP_A_DEPTS = ["業務改革部", "総務部", "出荷物流部"];
// グループB：金〜木サイクル
export const GROUP_B_DEPTS = ["EC事業部", "商品購買部", "製造部"];

// 部署名からグループ（"A" | "B"）を返す
export function getGroupForDept(dept) {
  if (GROUP_A_DEPTS.includes(dept)) return "A";
  if (GROUP_B_DEPTS.includes(dept)) return "B";
  return null;
}

// 指定日を含む週の月曜日の日付文字列（YYYY-MM-DD）を返す
export function getCurrentWeekKeyA(date = new Date()) {
  const d = new Date(date);
  const diff = (d.getDay() + 6) % 7; // 月曜からの経過日数
  d.setDate(d.getDate() - diff);
  return _toDateStr(d);
}

// グループBの現在週のweekKeyを返す（データ保存は月曜日基準で統一するため、
// 金曜始まりの週に対応する月曜日の日付文字列を返す）
export function getCurrentWeekKeyB(date = new Date()) {
  const d = new Date(date);
  const diffToFriday = (d.getDay() - 5 + 7) % 7; // 直前の金曜日までの日数
  d.setDate(d.getDate() - diffToFriday + 3);       // 金曜日 + 3日 = 月曜日
  return _toDateStr(d);
}

// グループBのweekKey（月曜日）から表示用の金曜日ラベルを生成する
// 例: "2026-04-20" → "4/17"
export function getGroupBFridayLabel(weekKey) {
  const [y, m, d] = weekKey.split("-").map(Number);
  const fri = new Date(y, m - 1, d - 3); // 月曜 − 3日 = 金曜
  return `${fri.getMonth() + 1}/${fri.getDate()}`;
}

function _toDateStr(d) {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// グループB（金曜始まり）の週タブ
// ラベルは金曜日の日付、weekKeyはデータ保存に使う同じ週の月曜日
export const WEEK_TABS_B = [
  { label: "2/20週", weekKey: "2026-02-23" },
  { label: "2/27週", weekKey: "2026-03-02" },
  { label: "3/6週",  weekKey: "2026-03-09" },
  { label: "3/13週", weekKey: "2026-03-16" },
  { label: "3/20週", weekKey: "2026-03-23" },
  { label: "3/27週", weekKey: "2026-03-30" },
  { label: "4/3週",  weekKey: "2026-04-06" },
  { label: "4/10週", weekKey: "2026-04-13" },
  { label: "4/17週", weekKey: "2026-04-20" },
  { label: "4/24週", weekKey: "2026-04-27" },
];
