// ============================================================
// pages/DashboardPage.jsx — PDCA一覧メイン画面（タスク7実装）
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { apiGet, apiPost } from "../api/client";
import { DEPTS, DEPT_COLORS, ROLE_LABELS, STATUSES, getStatus } from "../utils/constants";

// ============================================================
// 週タブの定義
// ============================================================
const WEEK_TABS = [
  { label: "2/27週", weekKey: "2025-02-27" },
  { label: "3/6週",  weekKey: "2025-03-06" },
  { label: "3/13週", weekKey: "2025-03-13" },
  { label: "3/20週", weekKey: "2025-03-20" },
  { label: "3/27週", weekKey: "2025-03-27" },
  { label: "4/3週",  weekKey: "2025-04-03" },
];

// ============================================================
// DashboardPage — メインコンポーネント
// ============================================================
export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [weekKey, setWeekKey]       = useState(WEEK_TABS[WEEK_TABS.length - 1].weekKey);
  const [deptFilter, setDeptFilter] = useState("全部門");
  const [goalFilter, setGoalFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal]   = useState(false);

  const [goals, setGoals]           = useState([]);
  const [pdcaList, setPdcaList]     = useState([]);
  const [pdcaAllWeeks, setPdcaAllWeeks] = useState({});

  const [loadingGoals, setLoadingGoals] = useState(true);
  const [loadingPdca, setLoadingPdca]   = useState(false);
  const [error, setError]           = useState("");

  const [highlightId, setHighlightId]     = useState(null);
  const [pendingScroll, setPendingScroll] = useState(null);

  // 大目標取得
  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet("getGoals");
        if (!data.success) throw new Error(data.message);
        setGoals(data.goals);
      } catch (err) {
        setError("大目標の取得に失敗しました: " + err.message);
      } finally {
        setLoadingGoals(false);
      }
    })();
  }, []);

  // 現在週のPDCA取得
  const fetchPdca = useCallback(async () => {
    setLoadingPdca(true);
    setError("");
    try {
      const params = { weekKey };
      if (deptFilter !== "全部門") params.dept = deptFilter;
      const data = await apiGet("getPdca", params);
      if (!data.success) throw new Error(data.message);
      setPdcaList(data.pdca);
      setPdcaAllWeeks((prev) => ({ ...prev, [weekKey]: data.pdca }));
    } catch (err) {
      setError("PDCAデータの取得に失敗しました: " + err.message);
    } finally {
      setLoadingPdca(false);
    }
  }, [weekKey, deptFilter]);

  useEffect(() => { fetchPdca(); }, [fetchPdca]);

  // 全週プリフェッチ
  useEffect(() => {
    setPdcaAllWeeks({});
    (async () => {
      for (const tab of WEEK_TABS) {
        try {
          const params = { weekKey: tab.weekKey };
          if (deptFilter !== "全部門") params.dept = deptFilter;
          const data = await apiGet("getPdca", params);
          if (data.success) {
            setPdcaAllWeeks((prev) => ({ ...prev, [tab.weekKey]: data.pdca }));
          }
        } catch (e) { /* 無視 */ }
      }
    })();
  }, [deptFilter]);

  // pendingScroll → スクロール＆ハイライト
  useEffect(() => {
    if (!pendingScroll) return;
    if (pendingScroll.weekKey !== weekKey) return;
    if (loadingPdca) return;
    const match = pdcaList.find((p) => p.goalId === pendingScroll.goalId);
    if (!match) { setPendingScroll(null); return; }
    const el = document.getElementById(`card-${match.id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightId(match.id);
      const timer = setTimeout(() => setHighlightId(null), 2000);
      setPendingScroll(null);
      return () => clearTimeout(timer);
    }
    setPendingScroll(null);
  }, [pdcaList, pendingScroll, weekKey, loadingPdca]);

  // ナビゲーション
  const navigateToWeek = useCallback((targetWeekKey, goalId) => {
    setWeekKey(targetWeekKey);
    setPendingScroll({ goalId, weekKey: targetWeekKey });
  }, []);

  const createAndNavigate = useCallback(async (nextWeekKey, pdca) => {
    try {
      const data = await apiPost("savePdca", {
        weekKey: nextWeekKey, goalId: pdca.goalId, midGoal: pdca.midGoal, dept: pdca.dept,
      });
      if (!data.success) throw new Error(data.message);
      const refreshed = await apiGet("getPdca", {
        weekKey: nextWeekKey,
        ...(deptFilter !== "全部門" ? { dept: deptFilter } : {}),
      });
      if (refreshed.success) {
        setPdcaAllWeeks((prev) => ({ ...prev, [nextWeekKey]: refreshed.pdca }));
      }
      navigateToWeek(nextWeekKey, pdca.goalId);
    } catch (err) {
      setError("次週PDCAの作成に失敗しました: " + err.message);
    }
  }, [deptFilter, navigateToWeek]);

  // PDCAの部分更新（再フェッチ不要）
  const handlePdcaChanged = useCallback((updatedPdca) => {
    setPdcaList((prev) => prev.map((p) => p.id === updatedPdca.id ? updatedPdca : p));
    setPdcaAllWeeks((prev) => {
      const next = { ...prev };
      for (const wk of Object.keys(next)) {
        if (next[wk].some((p) => p.id === updatedPdca.id)) {
          next[wk] = next[wk].map((p) => p.id === updatedPdca.id ? updatedPdca : p);
        }
      }
      return next;
    });
  }, []);

  const handleDeptChange = useCallback((dept) => {
    setDeptFilter(dept);
    setGoalFilter(null);
  }, []);

  const goalsMap = Object.fromEntries(goals.map((g) => [g.id, g]));

  const applyFilters = useCallback((list) => {
    return list.filter((p) => {
      if (goalFilter && p.goalId !== goalFilter) return false;
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const goalName = goalsMap[p.goalId]?.goalName || "";
        return [goalName, p.midGoal, p.plan, p.do, p.check, p.act]
          .some((s) => (s || "").toLowerCase().includes(q));
      }
      return true;
    });
  }, [goalFilter, searchQuery, goalsMap]);

  const visibleDepts = deptFilter === "全部門" ? DEPTS : [deptFilter];

  return (
    <div style={styles.wrapper}>
      {/* ===== ヘッダー ===== */}
      <header style={styles.header}>
        <span style={styles.headerTitle}>📊 目標進捗管理</span>
        <div style={styles.headerRight}>
          <span style={styles.userInfo}>
            {user?.name}（{ROLE_LABELS[user?.role] || user?.role}）
          </span>
          <button onClick={() => setShowModal(true)} style={styles.newBtn}>＋ 新規入力</button>
          {user?.role === "admin" && (
            <button onClick={() => navigate("/admin")} style={styles.adminBtn}>ユーザー管理</button>
          )}
          <button onClick={logout} style={styles.logoutBtn}>ログアウト</button>
        </div>
      </header>

      <WeekTabs weekKey={weekKey} onSelect={setWeekKey} />
      <DeptFilter deptFilter={deptFilter} onSelect={handleDeptChange} />
      <SearchFilterBar
        goals={goals} deptFilter={deptFilter}
        goalFilter={goalFilter} onGoalFilter={setGoalFilter}
        searchQuery={searchQuery} onSearch={setSearchQuery}
      />

      <main style={styles.main}>
        {error && <div style={styles.errorBanner}>{error}</div>}
        {(loadingGoals || loadingPdca) && !error && (
          <div style={styles.loading}>データを読み込み中...</div>
        )}
        {!loadingGoals && visibleDepts.map((dept) => {
          const deptPdca = applyFilters(pdcaList.filter((p) => p.dept === dept));
          return (
            <DeptSection
              key={dept}
              dept={dept}
              pdcaList={deptPdca}
              goalsMap={goalsMap}
              isLoading={loadingPdca}
              weekKey={weekKey}
              pdcaAllWeeks={pdcaAllWeeks}
              highlightId={highlightId}
              navigateToWeek={navigateToWeek}
              createAndNavigate={createAndNavigate}
              user={user}
              onPdcaChanged={handlePdcaChanged}
            />
          );
        })}
      </main>

      <NewPdcaModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        goals={goals}
        currentWeekKey={weekKey}
        onSaved={() => { setShowModal(false); fetchPdca(); }}
      />
    </div>
  );
}

// ============================================================
// WeekTabs
// ============================================================
function WeekTabs({ weekKey, onSelect }) {
  return (
    <div style={tabStyles.bar}>
      <div style={tabStyles.inner}>
        {WEEK_TABS.map((tab) => {
          const isActive = tab.weekKey === weekKey;
          return (
            <button
              key={tab.weekKey}
              onClick={() => onSelect(tab.weekKey)}
              style={{ ...tabStyles.tab, ...(isActive ? tabStyles.tabActive : tabStyles.tabInactive) }}
            >
              {tab.label}
              {isActive && <span style={tabStyles.activeDot} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// DeptFilter
// ============================================================
function DeptFilter({ deptFilter, onSelect }) {
  return (
    <div style={filterStyles.bar}>
      {["全部門", ...DEPTS].map((dept) => {
        const isActive = dept === deptFilter;
        const color = DEPT_COLORS[dept];
        return (
          <button
            key={dept}
            onClick={() => onSelect(dept)}
            style={{
              ...filterStyles.pill,
              background: isActive ? (color || "#1e293b") : "#ffffff",
              color:      isActive ? "#ffffff" : "#374151",
              border:     isActive ? `2px solid ${color || "#1e293b"}` : "2px solid #e5e7eb",
              fontWeight: isActive ? "700" : "400",
            }}
          >
            {isActive && dept !== "全部門" && (
              <span style={{ ...filterStyles.dot, background: "#ffffff" }} />
            )}
            {dept}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================
// SearchFilterBar
// ============================================================
function SearchFilterBar({ goals, deptFilter, goalFilter, onGoalFilter, searchQuery, onSearch }) {
  const filteredGoals = deptFilter === "全部門" ? goals : goals.filter((g) => g.dept === deptFilter);
  const activeGoalName = goalFilter ? goals.find((g) => g.id === goalFilter)?.goalName : null;

  return (
    <div style={searchBarStyles.wrapper}>
      <div style={searchBarStyles.row}>
        <div style={searchBarStyles.selectWrap}>
          <label style={searchBarStyles.selectLabel}>大目標</label>
          <select
            value={goalFilter || ""}
            onChange={(e) => onGoalFilter(e.target.value || null)}
            style={searchBarStyles.select}
          >
            <option value="">すべての大目標</option>
            {filteredGoals.map((g) => (
              <option key={g.id} value={g.id}>{g.goalName}</option>
            ))}
          </select>
        </div>
        <div style={searchBarStyles.searchWrap}>
          <span style={searchBarStyles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="キーワード検索（大目標・中目標・PDCA内容）"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            style={searchBarStyles.searchInput}
          />
          {searchQuery && (
            <button onClick={() => onSearch("")} style={searchBarStyles.clearBtn}>✕</button>
          )}
        </div>
      </div>
      {activeGoalName && (
        <div style={searchBarStyles.badgeRow}>
          <span style={searchBarStyles.filterLabel}>フィルター中:</span>
          <span style={searchBarStyles.badge}>
            {activeGoalName}
            <button onClick={() => onGoalFilter(null)} style={searchBarStyles.badgeX}>✕</button>
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================
// DeptSection
// ============================================================
function DeptSection({
  dept, pdcaList, goalsMap, isLoading,
  weekKey, pdcaAllWeeks, highlightId, navigateToWeek, createAndNavigate,
  user, onPdcaChanged,
}) {
  const color     = DEPT_COLORS[dept] || "#6b7280";
  const total     = pdcaList.length;
  const doneCount = pdcaList.filter((p) => p.status === "done").length;
  const pct       = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const confirmed = pdcaList.filter((p) => p.bossConfirmed).length;

  return (
    <section style={sectionStyles.section}>
      <DeptSummaryBar dept={dept} color={color} total={total} doneCount={doneCount} pct={pct} confirmed={confirmed} />
      {isLoading ? (
        <p style={sectionStyles.loadingText}>読み込み中...</p>
      ) : total === 0 ? (
        <p style={sectionStyles.emptyText}>この週のPDCAデータはまだありません</p>
      ) : (
        <div style={sectionStyles.cards}>
          {pdcaList.map((pdca) => (
            <PdcaCard
              key={pdca.id}
              pdca={pdca}
              goalsMap={goalsMap}
              deptColor={color}
              weekKey={weekKey}
              pdcaAllWeeks={pdcaAllWeeks}
              isHighlighted={highlightId === pdca.id}
              navigateToWeek={navigateToWeek}
              createAndNavigate={createAndNavigate}
              user={user}
              onPdcaChanged={onPdcaChanged}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ============================================================
// DeptSummaryBar
// ============================================================
function DeptSummaryBar({ dept, color, total, doneCount, pct, confirmed }) {
  return (
    <div style={summaryStyles.bar}>
      <div style={summaryStyles.left}>
        <div style={{ ...summaryStyles.colorBar, background: color }} />
        <span style={summaryStyles.deptName}>{dept}</span>
        <span style={summaryStyles.count}>{total}件</span>
      </div>
      <div style={summaryStyles.right}>
        {confirmed > 0 && (
          <span style={summaryStyles.confirmedBadge}>✅ {confirmed}/{total} 確認済</span>
        )}
        <div style={summaryStyles.progressArea}>
          <span style={{ ...summaryStyles.pct, color }}>{pct}%</span>
          <div style={summaryStyles.progressBg}>
            <div style={{ ...summaryStyles.progressFill, width: `${pct}%`, background: color }} />
          </div>
          <span style={summaryStyles.progressLabel}>{doneCount}/{total} 完了</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PdcaCard — PDCAカード（展開・編集・社長機能対応）
// ============================================================
function PdcaCard({
  pdca, goalsMap, deptColor,
  weekKey, pdcaAllWeeks, isHighlighted,
  navigateToWeek, createAndNavigate,
  user, onPdcaChanged,
}) {
  const [isOpen, setIsOpen]       = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm]   = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError]   = useState("");

  const canBoss = user?.role === "boss" || user?.role === "admin";
  // general は自部門のみ編集可、boss/admin は全部門
  const canEdit = canBoss || user?.dept === pdca.dept;

  const goal     = goalsMap[pdca.goalId];
  const goalName = goal?.goalName || "（大目標不明）";
  const isOther  = goalName === "その他";
  const statusInfo = getStatus(isEditing ? (editForm.status || pdca.status) : pdca.status);

  // 前週・次週
  const currentTabIdx = WEEK_TABS.findIndex((t) => t.weekKey === weekKey);
  const prevWeekKey   = currentTabIdx > 0 ? WEEK_TABS[currentTabIdx - 1].weekKey : null;
  const nextWeekKey   = currentTabIdx < WEEK_TABS.length - 1 ? WEEK_TABS[currentTabIdx + 1].weekKey : null;
  const hasPrev = !!(prevWeekKey && (pdcaAllWeeks[prevWeekKey] || []).find((p) => p.goalId === pdca.goalId));
  const hasNext = !!(nextWeekKey && (pdcaAllWeeks[nextWeekKey] || []).find((p) => p.goalId === pdca.goalId));

  const onNavPrev = (prevWeekKey && hasPrev) ? () => navigateToWeek(prevWeekKey, pdca.goalId) : null;
  const onNavNext = nextWeekKey
    ? (hasNext ? () => navigateToWeek(nextWeekKey, pdca.goalId) : () => createAndNavigate(nextWeekKey, pdca))
    : null;

  // 編集開始
  const startEdit = () => {
    setEditForm({
      midGoal: pdca.midGoal || "",
      plan:    pdca.plan || "",
      do:      pdca.do  || "",
      check:   pdca.check || "",
      act:     pdca.act || "",
      status:  pdca.status || "not_started",
    });
    setIsEditing(true);
    setIsOpen(true);
    setEditError("");
  };

  // 編集保存
  const handleEditSave = async () => {
    setEditSaving(true);
    setEditError("");
    try {
      const data = await apiPost("savePdca", {
        id:      pdca.id,
        dept:    pdca.dept,
        goalId:  pdca.goalId,
        weekKey: pdca.weekKey,
        ...editForm,
      });
      if (!data.success) throw new Error(data.message);
      onPdcaChanged({ ...pdca, ...editForm, ...(data.pdca || {}) });
      setIsEditing(false);
    } catch (err) {
      setEditError("保存に失敗しました: " + err.message);
    } finally {
      setEditSaving(false);
    }
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditForm({});
    setEditError("");
  };

  const cardBorder    = isHighlighted ? "2px solid #3b82f6" : "1px solid #e2e8f0";
  const cardBoxShadow = isHighlighted
    ? "0 0 0 3px rgba(59,130,246,0.2), 0 1px 3px rgba(0,0,0,0.07)"
    : "0 1px 3px rgba(0,0,0,0.07)";

  return (
    <div
      id={`card-${pdca.id}`}
      style={{
        ...cardStyles.card,
        border: cardBorder,
        boxShadow: cardBoxShadow,
        transition: "border 0.3s ease, box-shadow 0.3s ease",
      }}
    >
      <div style={{ ...cardStyles.colorStripe, background: deptColor }} />
      <div style={cardStyles.body}>

        {/* ---- カードヘッダー ---- */}
        <div style={cardStyles.headerRow}>
          <div style={cardStyles.goalArea}>
            {isOther && <span style={cardStyles.otherBadge}>その他</span>}
            <span style={cardStyles.goalName}>{goalName}</span>
          </div>
          <div style={cardStyles.badges}>
            {pdca.bossConfirmed && <span style={cardStyles.confirmedBadge}>✅ 確認済</span>}
            <span style={{ ...cardStyles.statusBadge, background: statusInfo.color }}>
              {statusInfo.label}
            </span>
            {/* 編集ボタン（権限あり・非編集時のみ表示） */}
            {canEdit && !isEditing && (
              <button onClick={startEdit} style={cardStyles.editBtn}>✏️ 編集</button>
            )}
          </div>
        </div>

        {/* ---- 中目標行 ---- */}
        <div style={cardStyles.midGoalRow}>
          <span style={cardStyles.midGoalLabel}>{isOther ? "課題・テーマ" : "中目標"}</span>
          {isEditing ? (
            <textarea
              value={editForm.midGoal}
              onChange={(e) => setEditForm((f) => ({ ...f, midGoal: e.target.value }))}
              rows={2}
              style={cardStyles.editTextarea}
            />
          ) : (
            <span style={cardStyles.midGoalText}>{pdca.midGoal || "（未入力）"}</span>
          )}
        </div>

        {/* 編集モード: ステータス選択 */}
        {isEditing && (
          <div style={cardStyles.editStatusRow}>
            <span style={cardStyles.editStatusLabel}>ステータス</span>
            <div style={cardStyles.editStatusPills}>
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setEditForm((f) => ({ ...f, status: s.value }))}
                  style={{
                    ...cardStyles.statusPillBtn,
                    background: editForm.status === s.value ? s.color : "#f1f5f9",
                    color:      editForm.status === s.value ? "#ffffff" : "#374151",
                    border:     `2px solid ${editForm.status === s.value ? s.color : "#e5e7eb"}`,
                    fontWeight: editForm.status === s.value ? "700" : "400",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ---- 展開トリガー ---- */}
        {!isEditing && (
          <div
            style={{ ...cardStyles.expandRow, cursor: "pointer" }}
            onClick={() => setIsOpen((v) => !v)}
          >
            <span style={cardStyles.expandText}>
              {isOpen ? "▲ 閉じる" : "▼ PDCA詳細を表示"}
            </span>
          </div>
        )}

        {/* ---- PDCA グリッド（展開時 or 編集時） ---- */}
        {(isOpen || isEditing) && (
          <PdcaGrid
            pdca={pdca}
            hasPrev={hasPrev}
            hasNext={hasNext}
            prevWeekKey={prevWeekKey}
            nextWeekKey={nextWeekKey}
            onNavPrev={onNavPrev}
            onNavNext={onNavNext}
            user={user}
            onPdcaChanged={onPdcaChanged}
            isEditing={isEditing}
            editForm={editForm}
            onEditFormChange={(key, val) => setEditForm((f) => ({ ...f, [key]: val }))}
          />
        )}

        {/* ---- 社長確認エリア（展開時 or 編集時） ---- */}
        {(isOpen || isEditing) && (
          <BossArea pdca={pdca} user={user} onPdcaChanged={onPdcaChanged} />
        )}

        {/* ---- 編集モード: 保存/キャンセルボタン ---- */}
        {isEditing && (
          <div style={cardStyles.editFooter}>
            {editError && <div style={cardStyles.editError}>{editError}</div>}
            <div style={cardStyles.editBtns}>
              <button onClick={handleEditCancel} style={cardStyles.editCancelBtn}>キャンセル</button>
              <button
                onClick={handleEditSave}
                disabled={editSaving}
                style={{ ...cardStyles.editSaveBtn, opacity: editSaving ? 0.7 : 1 }}
              >
                {editSaving ? "保存中..." : "保存する"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// PdcaGrid — PDCA 4分割グリッド（赤字追記・編集モード対応）
// ============================================================
function PdcaGrid({
  pdca, hasPrev, hasNext, prevWeekKey, nextWeekKey, onNavPrev, onNavNext,
  user, onPdcaChanged,
  isEditing, editForm, onEditFormChange,
}) {
  const [annotatingField, setAnnotatingField] = useState(null);
  const [annotationText, setAnnotationText]   = useState("");
  const [annotationSaving, setAnnotationSaving] = useState(false);

  const canBoss = user?.role === "boss" || user?.role === "admin";

  const handleAnnotationSave = async (sectionKey) => {
    if (!annotationText.trim()) return;
    setAnnotationSaving(true);
    try {
      const data = await apiPost("bossAnnotation", {
        id:    pdca.id,
        field: sectionKey,       // "plan" | "do" | "check" | "act"
        text:  annotationText,
      });
      if (!data.success) throw new Error(data.message);
      // GASが返す field は "annPlan" 等なので、そのまま使える
      onPdcaChanged({ ...pdca, [data.field]: data.value });
      setAnnotatingField(null);
      setAnnotationText("");
    } catch (err) {
      alert("追記の保存に失敗しました: " + err.message);
    } finally {
      setAnnotationSaving(false);
    }
  };

  const sections = [
    { key: "plan",  label: "📋 PLAN",  color: "#3b82f6",
      content: pdca.plan,  ann: pdca.annPlan,
      navBtn: { label: "← 先週ACTへ", disabled: !prevWeekKey || !hasPrev, onClick: onNavPrev } },
    { key: "do",    label: "🔨 DO",    color: "#22c55e",
      content: pdca.do,    ann: pdca.annDo,   navBtn: null },
    { key: "check", label: "🔍 CHECK", color: "#f59e0b",
      content: pdca.check, ann: pdca.annCheck, navBtn: null },
    { key: "act",   label: "🔄 ACT",   color: "#ef4444",
      content: pdca.act,   ann: pdca.annAct,
      navBtn: nextWeekKey
        ? { label: hasNext ? "次週PLANへ →" : "次週作成 →", disabled: false, onClick: onNavNext }
        : null },
  ];

  return (
    <div style={gridStyles.grid}>
      {sections.map(({ key, label, color, content, ann, navBtn }) => {
        const isAnnotating = annotatingField === key;
        return (
          <div key={key} style={{ ...gridStyles.cell, borderTop: `3px solid ${color}` }}>
            {/* セルヘッダー */}
            <div style={gridStyles.cellHeader}>
              <span style={{ ...gridStyles.cellLabel, color }}>{label}</span>
              <div style={gridStyles.cellHeaderBtns}>
                {/* 赤字追記ボタン（boss/admin・非編集時のみ表示） */}
                {canBoss && !isEditing && !isAnnotating && (
                  <button
                    onClick={() => {
                      setAnnotatingField(key);
                      setAnnotationText(ann || "");
                    }}
                    style={gridStyles.annotateBtn}
                  >
                    🖊追記
                  </button>
                )}
                {/* ナビゲーションボタン（非編集時のみ） */}
                {navBtn && !isEditing && (
                  <button
                    onClick={navBtn.disabled ? undefined : navBtn.onClick}
                    disabled={navBtn.disabled}
                    style={{
                      ...gridStyles.navBtn,
                      ...(navBtn.disabled ? gridStyles.navBtnDisabled : gridStyles.navBtnActive),
                    }}
                  >
                    {navBtn.label}
                  </button>
                )}
              </div>
            </div>

            {/* コンテンツ（編集時はtextarea） */}
            <div style={gridStyles.cellContent}>
              {isEditing ? (
                <textarea
                  value={editForm[key] || ""}
                  onChange={(e) => onEditFormChange(key, e.target.value)}
                  rows={3}
                  placeholder="入力..."
                  style={gridStyles.editTextarea}
                />
              ) : content ? (
                <span style={gridStyles.contentText}>{content}</span>
              ) : (
                <span style={gridStyles.emptyText}>未入力</span>
              )}
            </div>

            {/* 既存の追記表示（赤枠） */}
            {ann && !isAnnotating && (
              <div style={gridStyles.annotationBox}>
                <span style={gridStyles.annotationLabel}>🖊社長追記:</span>
                <span style={gridStyles.annotationText}>{ann}</span>
              </div>
            )}

            {/* 追記入力エリア */}
            {isAnnotating && (
              <div style={gridStyles.annotateInputArea}>
                <textarea
                  value={annotationText}
                  onChange={(e) => setAnnotationText(e.target.value)}
                  rows={2}
                  placeholder="追記内容を入力..."
                  style={gridStyles.annotateTextarea}
                  autoFocus
                />
                <div style={gridStyles.annotateBtns}>
                  <button
                    onClick={() => { setAnnotatingField(null); setAnnotationText(""); }}
                    style={gridStyles.annotateCancelBtn}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={() => handleAnnotationSave(key)}
                    disabled={annotationSaving || !annotationText.trim()}
                    style={{
                      ...gridStyles.annotateSaveBtn,
                      opacity: (annotationSaving || !annotationText.trim()) ? 0.6 : 1,
                    }}
                  >
                    {annotationSaving ? "保存中..." : "保存"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// BossArea — 社長確認エリア（確認チェック + コメント）
// ============================================================
function BossArea({ pdca, user, onPdcaChanged }) {
  const canBoss = user?.role === "boss" || user?.role === "admin";

  const [confirming, setConfirming]       = useState(false);
  const [commentText, setCommentText]     = useState("");
  const [commentSaving, setCommentSaving] = useState(false);
  const [commentError, setCommentError]   = useState("");

  // 確認チェックのトグル
  const handleConfirm = async () => {
    if (!canBoss || confirming) return;
    setConfirming(true);
    try {
      const data = await apiPost("bossConfirm", { id: pdca.id });
      if (!data.success) throw new Error(data.message);
      onPdcaChanged({ ...pdca, bossConfirmed: data.bossConfirmed });
    } catch (err) {
      alert("確認状態の更新に失敗しました: " + err.message);
    } finally {
      setConfirming(false);
    }
  };

  // コメント追記
  const handleComment = async () => {
    if (!commentText.trim()) return;
    setCommentSaving(true);
    setCommentError("");
    try {
      const data = await apiPost("bossComment", { id: pdca.id, comment: commentText });
      if (!data.success) throw new Error(data.message);
      onPdcaChanged({ ...pdca, bossComment: data.bossComment });
      setCommentText("");
    } catch (err) {
      setCommentError("コメントの保存に失敗しました: " + err.message);
    } finally {
      setCommentSaving(false);
    }
  };

  return (
    <div style={bossStyles.area}>
      <div style={bossStyles.areaHeader}>👑 社長確認</div>

      {/* 確認チェックボックス */}
      <label style={{
        ...bossStyles.confirmLabel,
        cursor: canBoss ? "pointer" : "default",
        opacity: confirming ? 0.6 : 1,
      }}>
        <input
          type="checkbox"
          checked={!!pdca.bossConfirmed}
          onChange={handleConfirm}
          disabled={!canBoss || confirming}
          style={{ cursor: canBoss ? "pointer" : "default", width: "15px", height: "15px" }}
        />
        <span style={bossStyles.confirmText}>確認済みにする</span>
        {pdca.bossConfirmed && <span style={bossStyles.confirmedTag}>✅ 確認済</span>}
      </label>

      {/* 既存コメント表示 */}
      {pdca.bossComment && (
        <div style={bossStyles.commentDisplay}>
          <div style={bossStyles.commentDisplayLabel}>社長コメント</div>
          <div style={bossStyles.commentDisplayText}>{pdca.bossComment}</div>
        </div>
      )}

      {/* コメント入力（boss/adminのみ） */}
      {canBoss && (
        <div style={bossStyles.commentInputArea}>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="コメントを入力..."
            rows={2}
            style={bossStyles.commentInput}
          />
          {commentError && <div style={bossStyles.commentError}>{commentError}</div>}
          <button
            onClick={handleComment}
            disabled={commentSaving || !commentText.trim()}
            style={{
              ...bossStyles.commentBtn,
              opacity: (commentSaving || !commentText.trim()) ? 0.6 : 1,
              cursor:  (commentSaving || !commentText.trim()) ? "not-allowed" : "pointer",
            }}
          >
            {commentSaving ? "送信中..." : "コメントを追記"}
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// NewPdcaModal — 新規PDCA入力モーダル（下からスライドアップ）
// ============================================================
function NewPdcaModal({ isOpen, onClose, goals, currentWeekKey, onSaved }) {
  const [show, setShow]           = useState(false);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState("");

  const initForm = useCallback(() => ({
    weekKey: currentWeekKey,
    dept:    DEPTS[0] || "",
    goalId:  "",
    midGoal: "",
    plan:    "",
    do:      "",
    check:   "",
    act:     "",
    status:  "not_started",
  }), [currentWeekKey]);

  const [form, setForm] = useState(initForm);

  useEffect(() => {
    if (isOpen) {
      setForm(initForm());
      setFormError("");
      setSaving(false);
      const t = setTimeout(() => setShow(true), 10);
      return () => clearTimeout(t);
    } else {
      setShow(false);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const deptGoals = form.dept ? goals.filter((g) => g.dept === form.dept) : goals;
  const isOther   = goals.find((g) => g.id === form.goalId)?.goalName === "その他";
  const field     = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    if (!form.dept)   { setFormError("部門を選択してください"); return; }
    if (!form.goalId) { setFormError("大目標を選択してください"); return; }
    setSaving(true);
    setFormError("");
    try {
      const data = await apiPost("savePdca", form);
      if (!data.success) throw new Error(data.message);
      onSaved();
    } catch (err) {
      setFormError("保存に失敗しました: " + err.message);
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff", borderRadius: "20px 20px 0 0",
          width: "100%", maxWidth: "680px", maxHeight: "92vh", overflowY: "auto",
          transform: show ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s cubic-bezier(0.32,0.72,0,1)",
          boxShadow: "0 -4px 32px rgba(0,0,0,0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={modalStyles.header}>
          <div style={modalStyles.handle} />
          <div style={modalStyles.headerRow}>
            <span style={modalStyles.title}>＋ 新規PDCA入力</span>
            <button onClick={onClose} style={modalStyles.closeBtn}>✕</button>
          </div>
        </div>

        <div style={modalStyles.body}>
          {formError && <div style={modalStyles.errorBanner}>{formError}</div>}

          <div style={modalStyles.fieldGroup}>
            <label style={modalStyles.label}>対象週</label>
            <select value={form.weekKey} onChange={(e) => field("weekKey", e.target.value)} style={modalStyles.select}>
              {WEEK_TABS.map((t) => <option key={t.weekKey} value={t.weekKey}>{t.label}</option>)}
            </select>
          </div>

          <div style={modalStyles.fieldGroup}>
            <label style={modalStyles.label}>部門</label>
            <select
              value={form.dept}
              onChange={(e) => setForm((f) => ({ ...f, dept: e.target.value, goalId: "" }))}
              style={modalStyles.select}
            >
              {DEPTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div style={modalStyles.fieldGroup}>
            <label style={modalStyles.label}>大目標</label>
            <select value={form.goalId} onChange={(e) => field("goalId", e.target.value)} style={modalStyles.select}>
              <option value="">選択してください</option>
              {deptGoals.map((g) => <option key={g.id} value={g.id}>{g.goalName}</option>)}
            </select>
          </div>

          <div style={modalStyles.fieldGroup}>
            <label style={modalStyles.label}>{isOther ? "課題・テーマ（中目標）" : "中目標"}</label>
            {isOther && <p style={modalStyles.hint}>※その他選択時はここに課題を記入</p>}
            <textarea
              value={form.midGoal} onChange={(e) => field("midGoal", e.target.value)}
              rows={2} placeholder={isOther ? "課題・テーマを入力..." : "中目標を入力..."} style={modalStyles.textarea}
            />
          </div>

          {[
            { key: "plan",  label: "📋 Plan",  color: "#3b82f6", ph: "今週の計画を入力..." },
            { key: "do",    label: "🔨 Do",    color: "#22c55e", ph: "実施したことを入力..." },
            { key: "check", label: "🔍 Check", color: "#f59e0b", ph: "振り返り・評価を入力..." },
            { key: "act",   label: "🔄 Act",   color: "#ef4444", ph: "次のアクションを入力..." },
          ].map(({ key, label, color, ph }) => (
            <div key={key} style={modalStyles.fieldGroup}>
              <label style={{ ...modalStyles.label, color }}>{label}</label>
              <textarea
                value={form[key]} onChange={(e) => field(key, e.target.value)}
                rows={3} placeholder={ph} style={{ ...modalStyles.textarea, borderTopColor: color }}
              />
            </div>
          ))}

          <div style={modalStyles.fieldGroup}>
            <label style={modalStyles.label}>ステータス</label>
            <div style={modalStyles.statusRow}>
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => field("status", s.value)}
                  style={{
                    ...modalStyles.statusBtn,
                    background: form.status === s.value ? s.color : "#f1f5f9",
                    color:      form.status === s.value ? "#ffffff" : "#374151",
                    border:     `2px solid ${form.status === s.value ? s.color : "#e5e7eb"}`,
                    fontWeight: form.status === s.value ? "700" : "400",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={modalStyles.footer}>
          <button onClick={onClose} style={modalStyles.cancelBtn}>キャンセル</button>
          <button
            onClick={handleSave} disabled={saving}
            style={{ ...modalStyles.saveBtn, opacity: saving ? 0.7 : 1, cursor: saving ? "not-allowed" : "pointer" }}
          >
            {saving ? "保存中..." : "保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// スタイル定義
// ============================================================

const styles = {
  wrapper:     { minHeight: "100vh", background: "#f1f5f9" },
  header:      {
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    color: "#ffffff", padding: "0 24px", height: "56px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
  },
  headerTitle: { fontSize: "18px", fontWeight: "700", letterSpacing: "0.5px" },
  headerRight: { display: "flex", alignItems: "center", gap: "12px" },
  userInfo:    { fontSize: "13px", color: "#94a3b8" },
  newBtn:      {
    padding: "6px 14px", background: "#10b981", border: "none",
    borderRadius: "6px", color: "#ffffff", fontSize: "13px", fontWeight: "700",
    cursor: "pointer", fontFamily: "inherit",
  },
  adminBtn:    {
    padding: "6px 14px", background: "#2563eb", border: "none",
    borderRadius: "6px", color: "#ffffff", fontSize: "13px", cursor: "pointer", fontFamily: "inherit",
  },
  logoutBtn:   {
    padding: "6px 14px", background: "transparent", border: "1px solid #475569",
    borderRadius: "6px", color: "#cbd5e1", fontSize: "13px", cursor: "pointer", fontFamily: "inherit",
  },
  main:        { padding: "16px 20px 40px", maxWidth: "960px", margin: "0 auto" },
  errorBanner: {
    background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c",
    borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "14px",
  },
  loading:     { textAlign: "center", padding: "60px 0", color: "#94a3b8", fontSize: "14px" },
};

const tabStyles = {
  bar:       { background: "#1e293b", borderBottom: "1px solid #334155", overflowX: "auto" },
  inner:     { display: "flex", padding: "0 16px", maxWidth: "960px", margin: "0 auto" },
  tab:       {
    position: "relative", padding: "14px 20px", border: "none", background: "transparent",
    fontSize: "13px", fontWeight: "500", cursor: "pointer", fontFamily: "inherit",
    whiteSpace: "nowrap", transition: "color 0.15s",
  },
  tabActive:   { color: "#38bdf8", fontWeight: "700" },
  tabInactive: { color: "#94a3b8" },
  activeDot:   {
    position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
    width: "100%", height: "3px", background: "#38bdf8", borderRadius: "3px 3px 0 0", display: "block",
  },
};

const filterStyles = {
  bar: {
    background: "#ffffff", borderBottom: "1px solid #e5e7eb",
    padding: "10px 20px", display: "flex", gap: "8px", flexWrap: "wrap",
    maxWidth: "960px", margin: "0 auto",
  },
  pill: {
    display: "inline-flex", alignItems: "center", gap: "4px", padding: "5px 14px",
    borderRadius: "20px", fontSize: "13px", cursor: "pointer", fontFamily: "inherit",
    transition: "all 0.15s", lineHeight: 1.4,
  },
  dot: { width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0 },
};

const searchBarStyles = {
  wrapper:     { background: "#f8fafc", borderBottom: "1px solid #e2e8f0", padding: "10px 20px", maxWidth: "960px", margin: "0 auto" },
  row:         { display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" },
  selectWrap:  { display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 },
  selectLabel: { fontSize: "12px", fontWeight: "600", color: "#64748b", whiteSpace: "nowrap" },
  select:      {
    padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: "6px",
    fontSize: "13px", color: "#374151", background: "#ffffff", fontFamily: "inherit", cursor: "pointer", maxWidth: "200px",
  },
  searchWrap:  {
    flex: 1, display: "flex", alignItems: "center", background: "#ffffff",
    border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", gap: "6px", minWidth: "180px",
  },
  searchIcon:  { fontSize: "13px", flexShrink: 0 },
  searchInput: { flex: 1, border: "none", outline: "none", fontSize: "13px", color: "#374151", padding: "6px 0", fontFamily: "inherit", background: "transparent" },
  clearBtn:    { border: "none", background: "transparent", color: "#9ca3af", cursor: "pointer", fontSize: "12px", padding: "2px 4px", fontFamily: "inherit", flexShrink: 0 },
  badgeRow:    { display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" },
  filterLabel: { fontSize: "11px", color: "#64748b", fontWeight: "600" },
  badge:       { display: "inline-flex", alignItems: "center", gap: "4px", background: "#dbeafe", color: "#1d4ed8", fontSize: "12px", fontWeight: "600", padding: "3px 8px", borderRadius: "10px", border: "1px solid #bfdbfe" },
  badgeX:      { border: "none", background: "transparent", color: "#3b82f6", cursor: "pointer", fontSize: "11px", padding: "0 0 0 2px", fontFamily: "inherit", fontWeight: "700", lineHeight: 1 },
};

const sectionStyles = {
  section:     { marginBottom: "24px" },
  loadingText: { color: "#94a3b8", fontSize: "13px", padding: "16px", margin: 0 },
  emptyText:   { color: "#94a3b8", fontSize: "13px", padding: "20px 16px", margin: 0, background: "#ffffff", borderRadius: "8px", textAlign: "center", border: "1px dashed #e2e8f0" },
  cards:       { display: "flex", flexDirection: "column", gap: "8px" },
};

const summaryStyles = {
  bar:            { background: "#ffffff", borderRadius: "10px 10px 0 0", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", borderBottom: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  left:           { display: "flex", alignItems: "center", gap: "10px" },
  colorBar:       { width: "4px", height: "24px", borderRadius: "2px" },
  deptName:       { fontSize: "15px", fontWeight: "700", color: "#0f172a" },
  count:          { fontSize: "12px", color: "#94a3b8", background: "#f1f5f9", padding: "2px 8px", borderRadius: "10px" },
  right:          { display: "flex", alignItems: "center", gap: "16px" },
  confirmedBadge: { fontSize: "12px", color: "#059669", background: "#d1fae5", padding: "2px 8px", borderRadius: "10px", fontWeight: "600" },
  progressArea:   { display: "flex", alignItems: "center", gap: "8px" },
  pct:            { fontSize: "16px", fontWeight: "700", minWidth: "44px", textAlign: "right" },
  progressBg:     { width: "80px", height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" },
  progressFill:   { height: "100%", borderRadius: "3px", transition: "width 0.3s ease" },
  progressLabel:  { fontSize: "12px", color: "#64748b", whiteSpace: "nowrap" },
};

const cardStyles = {
  card:           { background: "#ffffff", borderRadius: "8px", display: "flex", overflow: "hidden" },
  colorStripe:    { width: "4px", flexShrink: 0 },
  body:           { flex: 1, padding: "12px 16px", display: "flex", flexDirection: "column", gap: "8px" },
  headerRow:      { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" },
  goalArea:       { display: "flex", alignItems: "center", gap: "8px", flex: 1, flexWrap: "wrap" },
  otherBadge:     { fontSize: "11px", fontWeight: "700", color: "#92400e", background: "#fef3c7", padding: "2px 6px", borderRadius: "4px", border: "1px solid #fde68a", whiteSpace: "nowrap" },
  goalName:       { fontSize: "14px", fontWeight: "600", color: "#0f172a", lineHeight: 1.4 },
  badges:         { display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, flexWrap: "wrap" },
  confirmedBadge: { fontSize: "11px", fontWeight: "600", color: "#059669", background: "#d1fae5", padding: "2px 7px", borderRadius: "10px", border: "1px solid #a7f3d0", whiteSpace: "nowrap" },
  statusBadge:    { fontSize: "11px", fontWeight: "700", color: "#ffffff", padding: "3px 8px", borderRadius: "10px", whiteSpace: "nowrap" },
  editBtn:        {
    fontSize: "11px", padding: "3px 10px", border: "1px solid #d1d5db",
    borderRadius: "6px", background: "#ffffff", color: "#374151", cursor: "pointer",
    fontFamily: "inherit", fontWeight: "600", whiteSpace: "nowrap",
  },
  midGoalRow:     { display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" },
  midGoalLabel:   { fontSize: "11px", fontWeight: "700", color: "#94a3b8", background: "#f8fafc", padding: "2px 6px", borderRadius: "4px", border: "1px solid #e2e8f0", whiteSpace: "nowrap", flexShrink: 0 },
  midGoalText:    { fontSize: "13px", color: "#475569", lineHeight: 1.5 },
  editTextarea:   {
    flex: 1, width: "100%", padding: "6px 8px", border: "1px solid #3b82f6",
    borderRadius: "6px", fontSize: "13px", color: "#374151", fontFamily: "inherit",
    resize: "vertical", lineHeight: 1.6, outline: "none", boxSizing: "border-box",
  },
  editStatusRow:  { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
  editStatusLabel:{ fontSize: "11px", fontWeight: "700", color: "#64748b", flexShrink: 0 },
  editStatusPills:{ display: "flex", gap: "4px", flexWrap: "wrap" },
  statusPillBtn:  { padding: "3px 10px", borderRadius: "14px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s" },
  expandRow:      { borderTop: "1px solid #f1f5f9", paddingTop: "8px", marginTop: "2px" },
  expandText:     { fontSize: "12px", color: "#3b82f6", userSelect: "none" },
  editFooter:     { borderTop: "1px solid #f1f5f9", paddingTop: "10px", marginTop: "4px" },
  editError:      { fontSize: "12px", color: "#b91c1c", marginBottom: "8px", background: "#fef2f2", padding: "6px 10px", borderRadius: "6px" },
  editBtns:       { display: "flex", gap: "8px" },
  editCancelBtn:  { flex: 1, padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", background: "#ffffff", color: "#374151", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" },
  editSaveBtn:    { flex: 2, padding: "8px", border: "none", borderRadius: "6px", background: "#2563eb", color: "#ffffff", fontSize: "13px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" },
};

const gridStyles = {
  grid:             { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "4px" },
  cell:             { background: "#f8fafc", borderRadius: "6px", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "6px", minHeight: "80px" },
  cellHeader:       { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", flexWrap: "wrap" },
  cellHeaderBtns:   { display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 },
  cellLabel:        { fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px", flexShrink: 0 },
  annotateBtn:      {
    fontSize: "10px", padding: "2px 6px", border: "1px solid #fca5a5",
    borderRadius: "4px", background: "#fff1f2", color: "#dc2626", cursor: "pointer",
    fontFamily: "inherit", fontWeight: "600", whiteSpace: "nowrap",
  },
  navBtn:           { fontSize: "11px", padding: "2px 8px", borderRadius: "4px", border: "none", fontFamily: "inherit", fontWeight: "500", whiteSpace: "nowrap" },
  navBtnActive:     { background: "#dbeafe", color: "#1d4ed8", cursor: "pointer" },
  navBtnDisabled:   { background: "#f1f5f9", color: "#94a3b8", cursor: "not-allowed" },
  cellContent:      { flex: 1 },
  contentText:      { fontSize: "13px", color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" },
  emptyText:        { fontSize: "12px", color: "#9ca3af", fontStyle: "italic" },
  editTextarea:     {
    width: "100%", padding: "6px 8px", border: "1px solid #3b82f6", borderRadius: "6px",
    fontSize: "12px", color: "#374151", fontFamily: "inherit", resize: "vertical",
    lineHeight: 1.6, outline: "none", boxSizing: "border-box",
  },
  // 赤字追記表示
  annotationBox:    { background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "6px", padding: "6px 8px", marginTop: "2px" },
  annotationLabel:  { fontSize: "10px", fontWeight: "700", color: "#dc2626", display: "block", marginBottom: "2px" },
  annotationText:   { fontSize: "12px", color: "#dc2626", lineHeight: 1.5, whiteSpace: "pre-wrap" },
  // 追記入力エリア
  annotateInputArea:{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" },
  annotateTextarea: {
    padding: "6px 8px", border: "1px solid #fca5a5", borderRadius: "6px",
    fontSize: "12px", color: "#374151", fontFamily: "inherit", resize: "vertical",
    lineHeight: 1.6, outline: "none",
  },
  annotateBtns:     { display: "flex", gap: "4px" },
  annotateCancelBtn:{ fontSize: "11px", padding: "3px 8px", border: "1px solid #d1d5db", borderRadius: "4px", background: "#ffffff", color: "#374151", cursor: "pointer", fontFamily: "inherit" },
  annotateSaveBtn:  { fontSize: "11px", padding: "3px 10px", border: "none", borderRadius: "4px", background: "#dc2626", color: "#ffffff", cursor: "pointer", fontFamily: "inherit", fontWeight: "600" },
};

// BossArea スタイル
const bossStyles = {
  area:               { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 14px", marginTop: "4px", display: "flex", flexDirection: "column", gap: "10px" },
  areaHeader:         { fontSize: "12px", fontWeight: "700", color: "#64748b", letterSpacing: "0.5px" },
  confirmLabel:       { display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#374151", userSelect: "none" },
  confirmText:        { fontWeight: "500" },
  confirmedTag:       { fontSize: "11px", fontWeight: "700", color: "#059669", background: "#d1fae5", padding: "2px 8px", borderRadius: "10px" },
  commentDisplay:     { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "8px 10px" },
  commentDisplayLabel:{ fontSize: "10px", fontWeight: "700", color: "#64748b", marginBottom: "4px" },
  commentDisplayText: { fontSize: "12px", color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" },
  commentInputArea:   { display: "flex", flexDirection: "column", gap: "6px" },
  commentInput:       { padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", color: "#374151", fontFamily: "inherit", resize: "vertical", lineHeight: 1.6, outline: "none" },
  commentError:       { fontSize: "12px", color: "#b91c1c" },
  commentBtn:         { alignSelf: "flex-end", padding: "6px 14px", border: "none", borderRadius: "6px", background: "#0f172a", color: "#ffffff", fontSize: "12px", fontWeight: "600", fontFamily: "inherit" },
};

// NewPdcaModal スタイル
const modalStyles = {
  header:      { padding: "12px 20px 0", borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, background: "#ffffff", zIndex: 1, borderRadius: "20px 20px 0 0" },
  handle:      { width: "40px", height: "4px", background: "#e2e8f0", borderRadius: "2px", margin: "0 auto 12px" },
  headerRow:   { display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "12px" },
  title:       { fontSize: "16px", fontWeight: "700", color: "#0f172a" },
  closeBtn:    { border: "none", background: "#f1f5f9", color: "#64748b", borderRadius: "50%", width: "28px", height: "28px", cursor: "pointer", fontSize: "13px", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center" },
  body:        { padding: "16px 20px", display: "flex", flexDirection: "column", gap: "14px" },
  errorBanner: { background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: "8px", padding: "10px 14px", fontSize: "13px" },
  fieldGroup:  { display: "flex", flexDirection: "column", gap: "4px" },
  label:       { fontSize: "12px", fontWeight: "700", color: "#374151", marginBottom: "2px" },
  hint:        { fontSize: "11px", color: "#f59e0b", margin: "0 0 4px", fontWeight: "500" },
  select:      { padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", color: "#374151", background: "#ffffff", fontFamily: "inherit", cursor: "pointer" },
  textarea:    { padding: "8px 10px", border: "1px solid #d1d5db", borderTop: "2px solid #d1d5db", borderRadius: "6px", fontSize: "13px", color: "#374151", fontFamily: "inherit", resize: "vertical", lineHeight: 1.6, outline: "none" },
  statusRow:   { display: "flex", gap: "6px", flexWrap: "wrap" },
  statusBtn:   { padding: "5px 12px", borderRadius: "16px", fontSize: "12px", fontWeight: "500", cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s" },
  footer:      { display: "flex", gap: "10px", padding: "12px 20px 24px", borderTop: "1px solid #f1f5f9", position: "sticky", bottom: 0, background: "#ffffff" },
  cancelBtn:   { flex: 1, padding: "10px", border: "2px solid #e5e7eb", borderRadius: "8px", background: "#ffffff", color: "#374151", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" },
  saveBtn:     { flex: 2, padding: "10px", border: "none", borderRadius: "8px", background: "#2563eb", color: "#ffffff", fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" },
};
