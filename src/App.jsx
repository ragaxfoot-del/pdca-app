// ============================================================
// App.jsx — ルーティング設定
// ============================================================
// HashRouter: URLに # を使うルーター（例: /pdca-app/#/login）
// GitHub Pagesはサーバーサイドルーティングがないため、
// BrowserRouter（/pdca-app/login）だと直接アクセス時に404になる。
// HashRouterなら # 以降はサーバーに送られないため404にならない。
// ============================================================

import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth.jsx";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AdminPage from "./pages/AdminPage";

// ------------------------------------------------------------
// 保護されたルート（ログイン必須）
// isLoggedIn が false なら LoginPage にリダイレクト
// ------------------------------------------------------------
function PrivateRoute({ children }) {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

// ------------------------------------------------------------
// 管理者専用ルート（admin権限必須）
// admin でなければ DashboardPage にリダイレクト
// ------------------------------------------------------------
function AdminRoute({ children }) {
  const { user, isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (user?.role !== "admin") return <Navigate to="/" replace />;
  return children;
}

// ------------------------------------------------------------
// アプリ本体
// AuthProvider でアプリ全体をラップし、認証状態を全コンポーネントで共有
// ------------------------------------------------------------
export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          {/* ログイン画面 */}
          <Route path="/login" element={<LoginPageGuard />} />

          {/* メイン画面（ログイン必須） */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            }
          />

          {/* 管理画面（admin権限必須） */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />

          {/* 未定義URLはトップへ */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

// ログイン済みなら / にリダイレクト（ログイン画面に戻れないようにする）
function LoginPageGuard() {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <Navigate to="/" replace /> : <LoginPage />;
}
