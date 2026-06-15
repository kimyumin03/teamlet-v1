"use client";

/**
 * 승인 · 참조자 선택 공통 컴포넌트 (Flex verbatim)
 * 출처: docs/_transcribe/flexv2.md §G(#22~35) + teamlet.md [32]
 *
 * 사용: <RecipientPickerRow value={v} onChange={setV} employees={...} departments={...} />
 *  - 트리거 행(요약 + ">") 클릭 → 서브모달(Dialog) 오픈
 *  - 모달: 칩(요청자별 승인/변경 허용) + 참조 섹션(알림 ▾) + N단계 승인 + 대상 피커 드롭다운
 */

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle } from "@teamlet/ui";
import {
  type RecipientPickerValue,
  type NotifyMode,
  NOTIFY_MODE_LABELS,
  summarize,
} from "./recipient-picker-types";

export type PickerEmployee = {
  id: string;
  name: string;
  departmentId: string | null;
  departmentName: string | null;
};
export type PickerDepartment = {
  id: string;
  name: string;
  parentId: string | null;
};

/* ─────────────────────────────────────────
   트리거 행 — 모달 안의 "승인·참조자 선택" 항목
───────────────────────────────────────── */
export function RecipientPickerRow({
  value,
  onChange,
  employees,
  departments,
  label = "승인 · 참조자 선택",
  description = "승인 참조 대상을 선택해 주세요.",
}: {
  value: RecipientPickerValue;
  onChange: (v: RecipientPickerValue) => void;
  employees: PickerEmployee[];
  departments: PickerDepartment[];
  label?: string;
  description?: string;
}) {
  const [open, setOpen] = useState(false);
  const empName = useMemo(() => new Map(employees.map((e) => [e.id, e.name])), [employees]);

  // 요약 아바타 (승인자/참조자 이름 최대 3)
  const names: string[] = [];
  for (const s of value.steps) for (const id of s.approverIds) { const n = empName.get(id); if (n) names.push(n); }
  for (const c of value.cc) { const n = empName.get(c.employeeId); if (n) names.push(n); }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", gap: 12 }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>{description}</div>
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--fg)", fontSize: 13, fontWeight: 500 }}
      >
        {names.length > 0 ? (
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {names.slice(0, 3).map((n, i) => (
              <span key={i} style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--primary-soft)", color: "var(--primary)", fontSize: 10.5, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }} title={n}>
                {n.slice(-2)}
              </span>
            ))}
            <span style={{ color: "var(--fg-muted)", marginLeft: 2 }}>{summarize(value)}</span>
          </span>
        ) : (
          <span style={{ color: "var(--fg-muted)" }}>사용 안 함</span>
        )}
        <span style={{ color: "var(--fg-subtle)" }}>›</span>
      </button>

      {open && (
        <Dialog open onOpenChange={(o) => { if (!o) setOpen(false); }}>
          <DialogContent className="max-w-lg p-0 overflow-hidden" showClose={false}>
            <DialogTitle className="sr-only">승인 · 참조자 선택</DialogTitle>
            <RecipientPickerDialog
              value={value}
              employees={employees}
              departments={departments}
              onConfirm={(v) => { onChange(v); setOpen(false); }}
              onClose={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   서브모달 본체
───────────────────────────────────────── */
type PickerTarget = { kind: "cc" } | { kind: "step"; index: number };

function RecipientPickerDialog({
  value,
  employees,
  departments,
  onConfirm,
  onClose,
}: {
  value: RecipientPickerValue;
  employees: PickerEmployee[];
  departments: PickerDepartment[];
  onConfirm: (v: RecipientPickerValue) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<RecipientPickerValue>(() => ({
    ...value,
    cc: [...value.cc],
    steps: value.steps.length > 0 ? value.steps.map((s) => ({ approverIds: [...s.approverIds] })) : [{ approverIds: [] }],
  }));
  // 대상 피커 팝오버가 열린 위치 (참조 or 특정 단계)
  const [pickTarget, setPickTarget] = useState<PickerTarget | null>(null);
  // 참조자 알림 드롭다운이 열린 employeeId
  const [notifyOpen, setNotifyOpen] = useState<string | null>(null);

  const empName = useMemo(() => new Map(employees.map((e) => [e.id, e.name])), [employees]);
  const empDept = useMemo(() => new Map(employees.map((e) => [e.id, e.departmentName])), [employees]);

  function addRecipient(employeeId: string) {
    if (!pickTarget) return;
    setDraft((d) => {
      if (pickTarget.kind === "cc") {
        if (d.cc.some((c) => c.employeeId === employeeId)) return d;
        return { ...d, cc: [...d.cc, { employeeId, notify: "REQUEST_AND_COMPLETE" }] };
      }
      const steps = d.steps.map((s, i) =>
        i === pickTarget.index && !s.approverIds.includes(employeeId)
          ? { approverIds: [...s.approverIds, employeeId] }
          : s,
      );
      return { ...d, steps };
    });
    setPickTarget(null);
  }

  function removeCc(employeeId: string) {
    setDraft((d) => ({ ...d, cc: d.cc.filter((c) => c.employeeId !== employeeId) }));
  }
  function setCcNotify(employeeId: string, notify: NotifyMode) {
    setDraft((d) => ({ ...d, cc: d.cc.map((c) => (c.employeeId === employeeId ? { ...c, notify } : c)) }));
    setNotifyOpen(null);
  }
  function removeApprover(stepIndex: number, employeeId: string) {
    setDraft((d) => ({
      ...d,
      steps: d.steps.map((s, i) => (i === stepIndex ? { approverIds: s.approverIds.filter((id) => id !== employeeId) } : s)),
    }));
  }
  function addStep() {
    setDraft((d) => ({ ...d, steps: [...d.steps, { approverIds: [] }] }));
  }

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 12px", borderBottom: "1px solid var(--border)" }}>
        <h3 style={{ fontSize: 15.5, fontWeight: 700, margin: 0 }}>승인 · 참조자 선택</h3>
        <button onClick={onClose} aria-label="닫기" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-subtle)", fontSize: 18, lineHeight: 1 }}>×</button>
      </div>

      <div style={{ padding: "16px 20px 20px", display: "flex", flexDirection: "column", gap: 16, maxHeight: "70vh", overflowY: "auto" }}>
        {/* 상단 칩 */}
        <div style={{ display: "flex", gap: 8 }}>
          <ToggleChip label="요청자별 승인" active={draft.requesterApproval} onClick={() => setDraft((d) => ({ ...d, requesterApproval: !d.requesterApproval }))} />
          <ToggleChip label="변경 허용" active={draft.allowChange} onClick={() => setDraft((d) => ({ ...d, allowChange: !d.allowChange }))} />
        </div>

        {/* 참조 섹션 */}
        <Section
          title="참조"
          onAdd={() => setPickTarget({ kind: "cc" })}
          addHint="참조자 추가하기"
        >
          {draft.cc.length === 0 ? (
            <EmptyRow text="참조자를 추가해 주세요." onClick={() => setPickTarget({ kind: "cc" })} />
          ) : (
            draft.cc.map((c) => (
              <RecipientRow
                key={c.employeeId}
                name={empName.get(c.employeeId) ?? "(알 수 없음)"}
                dept={empDept.get(c.employeeId) ?? null}
                onRemove={() => removeCc(c.employeeId)}
                right={
                  <div style={{ position: "relative" }}>
                    <button type="button" onClick={() => setNotifyOpen(notifyOpen === c.employeeId ? null : c.employeeId)}
                      style={ddBtnStyle}>
                      🔔 {NOTIFY_MODE_LABELS[c.notify]} ▾
                    </button>
                    {notifyOpen === c.employeeId && (
                      <Popover onClose={() => setNotifyOpen(null)}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-muted)", padding: "6px 10px 4px" }}>알림 설정</div>
                        {(Object.keys(NOTIFY_MODE_LABELS) as NotifyMode[]).map((m) => (
                          <PopoverItem key={m} selected={c.notify === m} onClick={() => setCcNotify(c.employeeId, m)}>
                            {NOTIFY_MODE_LABELS[m]}
                          </PopoverItem>
                        ))}
                        <div style={{ fontSize: 11, color: "var(--fg-subtle)", padding: "6px 10px", borderTop: "1px solid var(--border)" }}>
                          ⓘ 댓글 알림은 설정과 관계없이 수신돼요.
                        </div>
                      </Popover>
                    )}
                  </div>
                }
              />
            ))
          )}
        </Section>

        {/* 승인 단계 섹션 */}
        {draft.steps.map((step, idx) => (
          <Section
            key={idx}
            title={`${idx + 1} 단계 승인`}
            onAdd={() => setPickTarget({ kind: "step", index: idx })}
            addHint="승인자 추가하기"
          >
            {step.approverIds.length === 0 ? (
              <EmptyRow text="승인자를 추가해 주세요." onClick={() => setPickTarget({ kind: "step", index: idx })} />
            ) : (
              step.approverIds.map((id) => (
                <RecipientRow
                  key={id}
                  name={empName.get(id) ?? "(알 수 없음)"}
                  dept={empDept.get(id) ?? null}
                  onRemove={() => removeApprover(idx, id)}
                  right={<span style={{ ...ddBtnStyle, cursor: "default" }}>승인</span>}
                />
              ))
            )}
          </Section>
        ))}

        {/* 승인 단계 추가 */}
        <button type="button" onClick={addStep}
          style={{ width: "100%", padding: "10px", border: "1px dashed var(--border-strong)", borderRadius: 8, background: "var(--bg-secondary)", color: "var(--fg-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + 승인 단계 추가하기
        </button>
      </div>

      {/* 확인 */}
      <div style={{ padding: "12px 20px 16px", borderTop: "1px solid var(--border)" }}>
        <button type="button" onClick={() => onConfirm(draft)}
          style={{ width: "100%", padding: "12px", borderRadius: 10, fontSize: 14.5, fontWeight: 700, background: "var(--primary)", color: "white", border: "none", cursor: "pointer" }}>
          확인
        </button>
      </div>

      {/* 대상 피커 드롭다운 */}
      {pickTarget && (
        <TargetPicker
          employees={employees}
          departments={departments}
          selectedIds={pickTarget.kind === "cc" ? draft.cc.map((c) => c.employeeId) : draft.steps[pickTarget.index]?.approverIds ?? []}
          onPick={addRecipient}
          onClose={() => setPickTarget(null)}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   대상 피커 (검색 / 부서 그룹 / 구성원 목록 / 하위 조직 함께 선택)
   verbatim: flexv2 #23~24, #34
───────────────────────────────────────── */
const AVATAR_COLORS = [
  ["#e0e7ff", "#4f46e5"], ["#fce7f3", "#be185d"], ["#dcfce7", "#166534"],
  ["#fef9c3", "#854d0e"], ["#ffe4e6", "#9f1239"], ["#e0f2fe", "#075985"],
];
function avatarColor(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx] ?? ["var(--bg-tertiary)", "var(--fg-muted)"];
}

export function TargetPicker({
  employees,
  departments,
  selectedIds,
  onPick,
  onClose,
  title = "구성원 선택",
}: {
  employees: PickerEmployee[];
  departments: PickerDepartment[];
  selectedIds: string[];
  onPick: (employeeId: string) => void;
  onClose: () => void;
  title?: string;
}) {
  const [q, setQ] = useState("");
  const [includeSubOrg, setIncludeSubOrg] = useState(false);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

  // 부서 → 하위 부서 id 집합
  const childMap = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const d of departments) {
      if (d.parentId) { const arr = m.get(d.parentId) ?? []; arr.push(d.id); m.set(d.parentId, arr); }
    }
    return m;
  }, [departments]);

  function descendants(deptId: string): Set<string> {
    const out = new Set<string>([deptId]);
    const stack = [deptId];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const c of childMap.get(cur) ?? []) { if (!out.has(c)) { out.add(c); stack.push(c); } }
    }
    return out;
  }

  const ql = q.trim().toLowerCase();
  const filtered = useMemo(
    () => (ql ? employees.filter((e) => e.name.toLowerCase().includes(ql)) : employees),
    [employees, ql],
  );

  // 구성원 한 줄 (조직 펼침 시 indent)
  const renderMemberRow = (e: PickerEmployee, indent: boolean) => {
    const sel = selectedIds.includes(e.id);
    const [bg, fg] = avatarColor(e.name);
    return (
      <button key={e.id} type="button" disabled={sel} onClick={() => onPick(e.id)}
        style={{ ...pickerRowStyle, opacity: sel ? 0.5 : 1, cursor: sel ? "default" : "pointer", paddingLeft: indent ? 36 : 12 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
            background: bg, border: `1.5px solid ${bg}`,
            fontSize: 11, fontWeight: 700, display: "inline-flex",
            alignItems: "center", justifyContent: "center", color: fg,
          }}>{e.name.slice(0, 1)}</span>
          <span>
            <span style={{ display: "block", fontWeight: 600, fontSize: 13 }}>{e.name}</span>
            {e.departmentName && <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>{e.departmentName}</span>}
          </span>
        </span>
        <span style={{ fontSize: 11, color: "var(--fg-subtle)" }}>{sel ? "✓" : "선택"}</span>
      </button>
    );
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden" showClose={false}>
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div style={{ display: "flex", flexDirection: "column", maxHeight: "75vh" }}>
          {/* 검색 + 조직도 보기 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px 10px", borderBottom: "1px solid var(--border)" }}>
            <input
              autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="검색"
              style={{ flex: 1, padding: "8px 11px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--bg-primary)", color: "var(--fg)", outline: "none" }}
            />
            <span style={{ fontSize: 12, color: "var(--fg-muted)", fontWeight: 600 }}>선택 {selectedIds.length}</span>
          </div>

          {/* 목록 — 조직(클릭 시 구성원 펼침) + 전체 구성원 */}
          <div style={{ overflowY: "auto", padding: "8px 8px 4px" }}>
            {/* 조직(부서) */}
            {!ql && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-muted)", padding: "6px 10px 4px" }}>조직</div>
                {departments.map((d) => {
                  const ds = descendants(d.id);
                  const members = employees.filter((e) => (includeSubOrg ? (e.departmentId && ds.has(e.departmentId)) : e.departmentId === d.id));
                  const expanded = expandedDept === d.id;
                  return (
                    <div key={d.id}>
                      <button type="button"
                        onClick={() => setExpandedDept(expanded ? null : d.id)}
                        style={pickerRowStyle}>
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 26, height: 26, borderRadius: 6, background: "var(--bg-secondary)", border: "1px solid var(--border)", fontSize: 13, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>🏢</span>
                          {d.name}
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--fg-subtle)" }}>
                          {members.length}명
                          <span style={{ fontSize: 10 }}>{expanded ? "▾" : "▸"}</span>
                        </span>
                      </button>
                      {expanded && (members.length === 0
                        ? <div style={{ padding: "8px 12px 8px 44px", fontSize: 12, color: "var(--fg-muted)" }}>구성원이 없어요</div>
                        : members.map((m) => renderMemberRow(m, true)))}
                    </div>
                  );
                })}
              </>
            )}

            {/* 구성원 목록 (전체 / 검색 결과) */}
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-muted)", padding: "10px 10px 4px" }}>
              {ql ? "검색 결과" : "전체 구성원"}
            </div>
            {filtered.map((e) => renderMemberRow(e, false))}
            {filtered.length === 0 && (
              <div style={{ padding: "24px", textAlign: "center", fontSize: 12.5, color: "var(--fg-muted)" }}>검색 결과가 없어요</div>
            )}
          </div>

          {/* 하위 조직 함께 선택 + 닫기 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid var(--border)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--fg)", cursor: "pointer" }}>
              <input type="checkbox" checked={includeSubOrg} onChange={(e) => setIncludeSubOrg(e.target.checked)} />
              하위 조직 함께 선택
            </label>
            <button type="button" onClick={onClose} style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)", background: "none", border: "none", cursor: "pointer" }}>확인</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── 작은 조립 컴포넌트 ─────────────────── */
function ToggleChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        fontSize: 12, padding: "5px 12px", borderRadius: 999, cursor: "pointer", fontWeight: 600,
        border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`,
        background: active ? "var(--primary-soft)" : "var(--bg-primary)",
        color: active ? "var(--primary)" : "var(--fg-muted)",
      }}>
      {label}
    </button>
  );
}

function Section({ title, onAdd, addHint, children }: { title: string; onAdd: () => void; addHint: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700 }}>{title}</span>
        <button type="button" onClick={onAdd} title={addHint}
          style={{ width: 22, height: 22, borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-primary)", cursor: "pointer", color: "var(--fg-muted)", fontSize: 14, lineHeight: 1 }}>+</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
    </div>
  );
}

function EmptyRow({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 12px", border: "1px dashed var(--border)", borderRadius: 8, background: "var(--bg-secondary)", cursor: "pointer", color: "var(--fg-muted)", fontSize: 13 }}>
      <span style={{ width: 24, height: 24, borderRadius: "50%", border: "1px dashed var(--border-strong)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>+</span>
      {text}
    </button>
  );
}

function RecipientRow({ name, dept, right, onRemove }: { name: string; dept: string | null; right: React.ReactNode; onRemove: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-primary)" }}>
      <span style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--primary-soft)", color: "var(--primary)", fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{name.slice(-2)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
        {dept && <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>{dept}</div>}
      </div>
      {right}
      <button type="button" onClick={onRemove} aria-label="제거" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-subtle)", fontSize: 15, lineHeight: 1 }}>×</button>
    </div>
  );
}

function Popover({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
      <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 41, minWidth: 200, background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: "4px 0" }}>
        {children}
      </div>
    </>
  );
}

function PopoverItem({ children, selected, onClick }: { children: React.ReactNode; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "7px 10px", background: selected ? "var(--primary-soft)" : "none", border: "none", cursor: "pointer", fontSize: 12.5, color: selected ? "var(--primary)" : "var(--fg)", textAlign: "left", fontWeight: selected ? 600 : 400 }}>
      <span style={{ width: 12 }}>{selected ? "✓" : ""}</span>
      {children}
    </button>
  );
}

const ddBtnStyle: React.CSSProperties = {
  fontSize: 11.5, padding: "4px 9px", borderRadius: 6, border: "1px solid var(--border)",
  background: "var(--bg-secondary)", color: "var(--fg-muted)", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap",
};

const pickerRowStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
  padding: "9px 12px", border: "none", background: "none", cursor: "pointer", fontSize: 13, color: "var(--fg)", borderRadius: 8,
};
