// ============================================================
// utils/storage.js — フォールバック付きストレージ
//
// GitHub Pages など環境によって localStorage が使えない場合がある
// （ブラウザのプライバシー設定、Safari ITP等）。
// 以下の優先順でストレージを自動選択する：
//   1. localStorage  — ページを閉じても残る（通常環境）
//   2. sessionStorage — タブを閉じると消える（localStorageが使えない場合）
//   3. メモリ内変数   — ページリロードでリセット（両方使えない場合）
// ============================================================

// メモリ内ストレージ（最終手段）
const _mem = {};

// 使用するストレージを一度だけ決定してキャッシュする
// undefined = まだ判定していない
let _storage = undefined;

function getStorage() {
  if (_storage !== undefined) return _storage;

  // localStorage を試す
  try {
    localStorage.setItem("__pdca_test__", "1");
    localStorage.removeItem("__pdca_test__");
    _storage = localStorage;
    return _storage;
  } catch (e) { /* 使えない */ }

  // sessionStorage を試す
  try {
    sessionStorage.setItem("__pdca_test__", "1");
    sessionStorage.removeItem("__pdca_test__");
    _storage = sessionStorage;
    return _storage;
  } catch (e) { /* 使えない */ }

  // 両方ダメ → メモリ（null でフラグ）
  _storage = null;
  return _storage;
}

export function storageGet(key) {
  const s = getStorage();
  if (s) return s.getItem(key);
  return _mem[key] ?? null;
}

export function storageSet(key, value) {
  const s = getStorage();
  if (s) { s.setItem(key, value); return; }
  _mem[key] = value;
}

export function storageRemove(key) {
  const s = getStorage();
  if (s) { s.removeItem(key); return; }
  delete _mem[key];
}
