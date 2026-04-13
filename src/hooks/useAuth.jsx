// ============================================================
// hooks/useAuth.js — 認証 Context + カスタムフック
// ============================================================
// Context API: Reactの仕組みで「ログイン状態」をアプリ全体で共有する仕組み
// ============================================================

import { createContext, useContext, useState } from "react";
import { apiPost } from "../api/client";
import { storageGet, storageSet, storageRemove } from "../utils/storage";

// 認証情報を格納するContext（アプリ全体で共有できる入れ物）
const AuthContext = createContext(null);

// ------------------------------------------------------------
// AuthProvider
// App.jsx でアプリ全体を囲むことで、どのコンポーネントからでも
// useAuth() でログイン状態・ユーザー情報を取得できるようになる
// ------------------------------------------------------------
export function AuthProvider({ children }) {
  // localStorageからトークンを復元し、ログイン状態を初期化
  const [user, setUser] = useState(() => {
    const saved = storageGet("pdca_user");
    return saved ? JSON.parse(saved) : null;
  });

  // ログイン処理
  // 成功時: tokenとuserをlocalStorageに保存してstateを更新
  const login = async (email, password) => {
    const data = await apiPost("login", { email, password });
    if (!data.success) {
      throw new Error(data.message || "ログインに失敗しました");
    }
    storageSet("pdca_token", data.token);
    storageSet("pdca_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  // ログアウト処理
  const logout = () => {
    storageRemove("pdca_token");
    storageRemove("pdca_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ------------------------------------------------------------
// useAuth — コンポーネント内で認証情報を取得するフック
// 使い方: const { user, isLoggedIn, login, logout } = useAuth();
// ------------------------------------------------------------
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth は AuthProvider の内側で使用してください");
  return ctx;
}
