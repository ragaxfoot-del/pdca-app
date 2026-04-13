// ============================================================
// api/client.js — GAS APIクライアント
// GASのWebアプリURLへリクエストするラッパー関数
//
// 【GAS CORS対策 - JSONP方式】
// GAS Web App はリクエストを script.googleusercontent.com へ302リダイレクトする。
// リダイレクト先にCORSヘッダーがないため fetch はブロックされる。
// そのため <script> タグを動的に生成するJSONP方式を採用する。
// JSONPはブラウザのCORS制限を受けないため確実に動作する。
//
// GAS側は ?callback=関数名 があればレスポンスを 関数名({...}) 形式で返す。
// ============================================================

const API_URL = import.meta.env.VITE_GAS_URL || "http://localhost:3000";

// ------------------------------------------------------------
// JSONP リクエスト共通関数
// <script src="url&callback=cbName"> を動的に生成し、
// GASがレスポンスを cbName({...}) として返すのを受け取る
// ------------------------------------------------------------
function jsonpRequest(url) {
  return new Promise((resolve, reject) => {
    // ユニークなコールバック関数名を生成（同時リクエスト対応）
    const cbName = "__gasCb_" + Date.now() + "_" + Math.random().toString(36).slice(2);

    const script = document.createElement("script");

    // コールバック関数をグローバルに登録（GASがこれを呼び出す）
    window[cbName] = (data) => {
      delete window[cbName]; // 後片付け
      script.remove();
      resolve(data);
    };

    script.onerror = () => {
      delete window[cbName];
      script.remove();
      reject(new Error("通信エラー: GASへの接続に失敗しました"));
    };

    // &callback=cbName を付けてリクエスト
    script.src = url + "&callback=" + cbName;
    document.head.appendChild(script);
  });
}

// ------------------------------------------------------------
// GETリクエスト
// 例: apiGet("getGoals", { dept: "EC事業部" })
//   → JSONP {API_URL}?action=getGoals&dept=EC事業部&token=xxx&callback=__gasCb_xxx
// ------------------------------------------------------------
export async function apiGet(action, params = {}) {
  const token = localStorage.getItem("pdca_token");

  const query = new URLSearchParams({ action, ...params });
  if (token) query.set("token", token);

  return jsonpRequest(`${API_URL}?${query.toString()}`);
}

// ------------------------------------------------------------
// POST → JSONP変換リクエスト（GAS CORS対策）
// 例: apiPost("login", { email: "xxx", password: "xxx" })
//   → JSONP {API_URL}?action=login&data=JSON文字列&callback=__gasCb_xxx
//
// GAS側の doGet は ?data= パラメータを JSON.parse して body として扱う。
// ------------------------------------------------------------
export async function apiPost(action, body = {}) {
  const token = localStorage.getItem("pdca_token");

  // token を payload に含める（GAS側で body.token として取り出す）
  const payload = { ...body };
  if (token) payload.token = token;

  const query = new URLSearchParams({ action });
  query.set("data", JSON.stringify(payload));

  return jsonpRequest(`${API_URL}?${query.toString()}`);
}
