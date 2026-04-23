// ============================================================
// pages/AdminPage.jsx — ユーザー管理画面（admin権限専用）
// ============================================================

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "../api/client";
import { ROLE_LABELS } from "../utils/constants";

// 新規・編集フォームの初期値
const EMPTY_FORM = { id: "", email: "", password: "", name: "", role: "general", dept: "" };

// ビルド日時をフォーマットする関数
function formatBuildDate(isoString) {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `更新: ${year}/${month}/${day} ${hours}:${minutes}`;
}

export default function AdminPage() {
  const navigate = useNavigate();

  const [users, setUsers]       = useState([]);       // ユーザー一覧
  const [loading, setLoading]   = useState(true);     // 読み込み中フラグ
  const [error, setError]       = useState("");        // エラーメッセージ
  const [form, setForm]         = useState(EMPTY_FORM); // 追加・編集フォームの値
  const [isEditing, setIsEditing] = useState(false);  // 編集中かどうか
  const [formError, setFormError] = useState("");      // フォームのエラー
  const [formLoading, setFormLoading] = useState(false); // フォーム送信中

  // 画面を開いたときにユーザー一覧を取得
  useEffect(() => {
    fetchUsers();
  }, []);

  // ユーザー一覧をGAS APIから取得
  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiGet("getUsers");
      if (!data.success) throw new Error(data.message);
      setUsers(data.users);
    } catch (err) {
      setError(err.message || "ユーザー一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // フォームの入力値を更新するハンドラ
  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // 「編集」ボタンを押したとき：フォームにユーザーデータをセット
  const handleEdit = (user) => {
    setForm({ ...user, password: "" }); // パスワードは空にして再入力を促す
    setIsEditing(true);
    setFormError("");
    // フォームの位置までスクロール
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // フォームをリセットして新規追加モードに戻る
  const handleCancelEdit = () => {
    setForm(EMPTY_FORM);
    setIsEditing(false);
    setFormError("");
  };

  // フォーム送信（追加 or 編集）
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    try {
      const data = await apiPost("saveUser", { user: form });
      if (!data.success) throw new Error(data.message);
      await fetchUsers(); // 一覧を再取得して最新状態に更新
      handleCancelEdit();
    } catch (err) {
      setFormError(err.message || "保存に失敗しました");
    } finally {
      setFormLoading(false);
    }
  };

  // 削除ボタン
  const handleDelete = async (userId, userName) => {
    if (!window.confirm(`「${userName}」を削除しますか？`)) return;
    try {
      const data = await apiPost("deleteUser", { userId });
      if (!data.success) throw new Error(data.message);
      await fetchUsers();
    } catch (err) {
      setError(err.message || "削除に失敗しました");
    }
  };

  return (
    <div style={styles.wrapper}>
      {/* ヘッダー */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={() => navigate("/")} style={styles.backBtn}>
            ← 戻る
          </button>
          <span style={styles.headerTitle}>ユーザー管理</span>
        </div>
      </header>

      <main style={styles.main}>
        {/* ===== 追加・編集フォーム ===== */}
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>
            {isEditing ? "ユーザーを編集" : "新規ユーザーを追加"}
          </h2>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGrid}>
              {/* 名前 */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>名前 *</label>
                <input
                  style={styles.input}
                  value={form.name}
                  onChange={(e) => handleFormChange("name", e.target.value)}
                  placeholder="例：山田 太郎"
                  required
                />
              </div>

              {/* メールアドレス */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>メールアドレス *</label>
                <input
                  style={styles.input}
                  type="email"
                  value={form.email}
                  onChange={(e) => handleFormChange("email", e.target.value)}
                  placeholder="例：yamada@company.com"
                  required
                />
              </div>

              {/* パスワード */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>
                  パスワード {isEditing ? "（変更する場合のみ入力）" : "*"}
                </label>
                <input
                  style={styles.input}
                  type="password"
                  value={form.password}
                  onChange={(e) => handleFormChange("password", e.target.value)}
                  placeholder={isEditing ? "変更しない場合は空欄" : "パスワードを入力"}
                  required={!isEditing}
                />
              </div>

              {/* 権限 */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>権限 *</label>
                <select
                  style={styles.input}
                  value={form.role}
                  onChange={(e) => handleFormChange("role", e.target.value)}
                  required
                >
                  <option value="general">一般</option>
                  <option value="boss">社長</option>
                  <option value="admin">管理者</option>
                </select>
              </div>

              {/* 部門 */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>部門</label>
                <input
                  style={styles.input}
                  value={form.dept}
                  onChange={(e) => handleFormChange("dept", e.target.value)}
                  placeholder="例：EC事業部"
                />
              </div>
            </div>

            {/* フォームエラー */}
            {formError && <p style={styles.errorMsg}>{formError}</p>}

            {/* ボタン */}
            <div style={styles.formBtns}>
              <button type="submit" disabled={formLoading} style={styles.submitBtn}>
                {formLoading ? "保存中..." : isEditing ? "更新する" : "追加する"}
              </button>
              {isEditing && (
                <button type="button" onClick={handleCancelEdit} style={styles.cancelBtn}>
                  キャンセル
                </button>
              )}
            </div>
          </form>
        </section>

        {/* ===== ユーザー一覧テーブル ===== */}
        <section style={styles.card}>
          <div style={styles.tableHeader}>
            <h2 style={styles.cardTitle}>ユーザー一覧</h2>
            <button onClick={fetchUsers} style={styles.reloadBtn}>
              更新
            </button>
          </div>

          {/* 一覧取得エラー */}
          {error && <p style={styles.errorMsg}>{error}</p>}

          {loading ? (
            <p style={styles.loadingText}>読み込み中...</p>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>名前</th>
                    <th style={styles.th}>メールアドレス</th>
                    <th style={styles.th}>権限</th>
                    <th style={styles.th}>部門</th>
                    <th style={styles.th}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={styles.emptyCell}>
                        ユーザーが見つかりません
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} style={styles.tr}>
                        <td style={styles.td}>{u.id}</td>
                        <td style={{ ...styles.td, fontWeight: "600" }}>{u.name}</td>
                        <td style={styles.td}>{u.email}</td>
                        <td style={styles.td}>
                          <span style={roleBadgeStyle(u.role)}>
                            {ROLE_LABELS[u.role] || u.role}
                          </span>
                        </td>
                        <td style={styles.td}>{u.dept || "—"}</td>
                        <td style={styles.td}>
                          <div style={styles.actionBtns}>
                            <button
                              onClick={() => handleEdit(u)}
                              style={styles.editBtn}
                            >
                              編集
                            </button>
                            <button
                              onClick={() => handleDelete(u.id, u.name)}
                              style={styles.deleteBtn}
                            >
                              削除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* フッター */}
      <footer style={footerStyles.wrapper}>
        {formatBuildDate(__BUILD_DATE__)}
      </footer>
    </div>
  );
}

// 権限バッジのカラー
function roleBadgeStyle(role) {
  const colors = {
    admin:   { bg: "#dbeafe", text: "#1d4ed8" },
    boss:    { bg: "#fef3c7", text: "#92400e" },
    general: { bg: "#f3f4f6", text: "#374151" },
  };
  const c = colors[role] || colors.general;
  return {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "600",
    background: c.bg,
    color: c.text,
  };
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    background: "#f3f4f6",
  },
  header: {
    background: "#1e3a5f",
    color: "#ffffff",
    padding: "0 24px",
    height: "56px",
    display: "flex",
    alignItems: "center",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  backBtn: {
    padding: "6px 14px",
    background: "transparent",
    border: "1px solid #93c5fd",
    borderRadius: "6px",
    color: "#ffffff",
    fontSize: "13px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  headerTitle: {
    fontSize: "18px",
    fontWeight: "700",
  },
  main: {
    padding: "24px",
    maxWidth: "960px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  card: {
    background: "#ffffff",
    borderRadius: "12px",
    padding: "24px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
  },
  cardTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#1e3a5f",
    margin: "0 0 20px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "16px",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#374151",
  },
  input: {
    padding: "9px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "14px",
    fontFamily: "inherit",
    outline: "none",
    background: "#ffffff",
  },
  errorMsg: {
    color: "#ef4444",
    fontSize: "13px",
    margin: 0,
    padding: "8px 12px",
    background: "#fef2f2",
    borderRadius: "6px",
    border: "1px solid #fecaca",
  },
  formBtns: {
    display: "flex",
    gap: "12px",
  },
  submitBtn: {
    padding: "10px 24px",
    background: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  cancelBtn: {
    padding: "10px 20px",
    background: "#ffffff",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "14px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  tableHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "16px",
  },
  reloadBtn: {
    padding: "6px 14px",
    background: "#f3f4f6",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "13px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  loadingText: {
    color: "#6b7280",
    fontSize: "14px",
    textAlign: "center",
    padding: "20px 0",
    margin: 0,
  },
  tableWrap: {
    overflowX: "auto", // 画面が狭いときに横スクロール
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
  },
  theadRow: {
    background: "#f9fafb",
    borderBottom: "2px solid #e5e7eb",
  },
  th: {
    padding: "10px 12px",
    textAlign: "left",
    fontSize: "12px",
    fontWeight: "700",
    color: "#6b7280",
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: "1px solid #f3f4f6",
  },
  td: {
    padding: "12px 12px",
    color: "#111827",
    verticalAlign: "middle",
  },
  emptyCell: {
    padding: "32px",
    textAlign: "center",
    color: "#9ca3af",
  },
  actionBtns: {
    display: "flex",
    gap: "8px",
  },
  editBtn: {
    padding: "4px 12px",
    background: "#eff6ff",
    color: "#2563eb",
    border: "1px solid #bfdbfe",
    borderRadius: "6px",
    fontSize: "12px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  deleteBtn: {
    padding: "4px 12px",
    background: "#fff1f2",
    color: "#e11d48",
    border: "1px solid #fecdd3",
    borderRadius: "6px",
    fontSize: "12px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
};

const footerStyles = {
  wrapper: { textAlign: "center", padding: "20px", color: "#94a3b8", fontSize: "12px", borderTop: "1px solid #e2e8f0", marginTop: "40px" },
};
