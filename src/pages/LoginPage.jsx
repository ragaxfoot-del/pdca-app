// ============================================================
// pages/LoginPage.jsx — ログイン画面
// ============================================================

import { useState } from "react";
import { useAuth } from "../hooks/useAuth.jsx";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); // ページのリロードを防ぐ
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      // ログイン成功後の画面遷移は App.jsx の isLoggedIn チェックが自動的に行う
    } catch (err) {
      setError(err.message || "ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.bg}>
      <div style={styles.card}>
        {/* タイトル */}
        <div style={styles.titleArea}>
          <span style={styles.titleIcon}>📊</span>
          <h1 style={styles.title}>目標進捗管理</h1>
          <p style={styles.subtitle}>PDCA管理システム</p>
        </div>

        {/* ログインフォーム */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@company.com"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを入力"
              required
              style={styles.input}
            />
          </div>

          {/* エラーメッセージ */}
          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "ログイン中..." : "ログイン"}
          </button>
        </form>
      </div>
    </div>
  );
}

// インラインスタイル定義
const styles = {
  bg: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",
  },
  card: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "48px 40px",
    width: "100%",
    maxWidth: "400px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  },
  titleArea: {
    textAlign: "center",
    marginBottom: "32px",
  },
  titleIcon: {
    fontSize: "40px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#1e3a5f",
    margin: "8px 0 4px",
  },
  subtitle: {
    fontSize: "13px",
    color: "#6b7280",
    margin: 0,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
  },
  input: {
    padding: "10px 14px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
    fontFamily: "inherit",
  },
  error: {
    color: "#ef4444",
    fontSize: "13px",
    margin: 0,
    padding: "8px 12px",
    background: "#fef2f2",
    borderRadius: "6px",
    border: "1px solid #fecaca",
  },
  button: {
    padding: "12px",
    background: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "inherit",
    marginTop: "4px",
  },
};
