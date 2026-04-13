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
// 【トークン送信方式】
// Base64トークンをURLに直接埋め込むと、URLエンコード（%2B等）で
// GAS側のデコードが狂い「認証が無効です」になる場合がある。
// そのため apiGet / apiPost ともに data=JSON 形式で送り、
// GAS側は e.parameter.data をパースして body.token で受け取る。
// ============================================================

import { storageGet } from "../utils/storage";

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
// GETリクエスト（apiPost と同じ data=JSON 形式で送信）
//
// 例: apiGet("getGoals", { dept: "EC事業部" })
//   → JSONP ?action=getGoals&data={"dept":"EC事業部","token":"xxx"}&callback=__gasCb_xxx
//
// tokenをURLに直接埋め込まずJSONに入れることでエンコード問題を回避する。
// GAS側は e.parameter.data をJSON.parseして body.token で受け取る。
// ------------------------------------------------------------
export async function apiGet(action, params = {}) {
  const token = storageGet("pdca_token");

  const payload = { ...params };
  if (token) payload.token = token;

  const query = new URLSearchParams({ action });
  query.set("data", JSON.stringify(payload));

  return jsonpRequest(`${API_URL}?${query.toString()}`);
}

// ------------------------------------------------------------
// POST → JSONP変換リクエスト（GAS CORS対策）
//
// 例: apiPost("login", { email: "xxx", password: "xxx" })
//   → JSONP ?action=login&data={"email":"xxx","password":"xxx"}&callback=__gasCb_xxx
//
// GAS側の doGet は ?data= パラメータを JSON.parse して body として扱う。
// ------------------------------------------------------------
export async function apiPost(action, body = {}) {
  const token = storageGet("pdca_token");

  const payload = { ...body };
  if (token) payload.token = token;

  const query = new URLSearchParams({ action });
  query.set("data", JSON.stringify(payload));

  return jsonpRequest(`${API_URL}?${query.toString()}`);
}
