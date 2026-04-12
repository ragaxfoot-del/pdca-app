// ============================================================
// api/client.js — GAS APIクライアント
// GASのWebアプリURLへfetchするラッパー関数
//
// 【GAS CORS対策】
// GAS Web App は POST に対して302リダイレクトを返す。
// ブラウザの fetch はこれを CORS エラーとして処理してしまうため、
// すべてのリクエストを GET に統一して送信する方式を採用。
// POST のボディデータは ?data=encodeURIComponent(JSON.stringify(...)) で渡す。
// ============================================================

const API_URL = import.meta.env.VITE_GAS_URL || "http://localhost:3000";

// ------------------------------------------------------------
// GETリクエスト
// 例: apiGet("getGoals", { dept: "EC事業部" })
//   → GET {API_URL}?action=getGoals&dept=EC事業部&token=xxx
// ------------------------------------------------------------
export async function apiGet(action, params = {}) {
  const token = localStorage.getItem("pdca_token");

  const query = new URLSearchParams({ action, ...params });
  if (token) query.set("token", token);

  const res = await fetch(`${API_URL}?${query.toString()}`, {
    mode:     "cors",
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`通信エラー: ${res.status}`);
  }
  return res.json();
}

// ------------------------------------------------------------
// POST → GET変換リクエスト（GAS CORS対策）
// 例: apiPost("login", { email: "xxx", password: "xxx" })
//   → GET {API_URL}?action=login&data=encodeURIComponent(JSON.stringify({email,password}))
//
// GAS側の doGet は ?data= パラメータを JSON.parse して body として扱う。
// ------------------------------------------------------------
export async function apiPost(action, body = {}) {
  const token = localStorage.getItem("pdca_token");

  // token を payload に含める（GAS側で body.token として取り出す）
  const payload = { ...body };
  if (token) payload.token = token;

  // URLSearchParams に渡すと自動でURL安全エンコードされる
  // GAS側 e.parameter.data は自動デコードされるので JSON.parse できる
  const query = new URLSearchParams({ action });
  query.set("data", JSON.stringify(payload));

  const res = await fetch(`${API_URL}?${query.toString()}`, {
    mode:     "cors",
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`通信エラー: ${res.status}`);
  }
  return res.json();
}
