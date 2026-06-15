"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Button, Dialog, DialogClose, DialogContent,
  DialogFooter, DialogHeader, DialogTitle, Input,
} from "@teamlet/ui";
import type { EmployeeListItem } from "@teamlet/modules/employee";
import type { FormTemplateItem, FieldDef } from "@teamlet/modules/workflow";
import { createDocumentAction } from "@/lib/actions/workflow";

const KIND_LABEL = {
  GENERAL: "일반",
  LEAVE_REQUEST: "휴가 신청",
  INFO_CHANGE: "정보 변경",
  ANNOUNCEMENT: "공지",
} as const;

type Step = 1 | 2 | 3;

type Props = {
  employees: Pick<EmployeeListItem, "id" | "name">[];
  templates: FormTemplateItem[];
};

export function CreateDocumentButton({ employees, templates }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) ?? null;

  // Step 2
  const [title, setTitle] = useState("");
  const [formData, setFormData] = useState<Record<string, string>>({});

  // Step 3
  const [approvalMode, setApprovalMode] = useState<"auto" | "manual">("auto");
  const [approverIds, setApproverIds] = useState<string[]>([""]);
  const [ccIds, setCcIds] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setStep(1);
    setSelectedTemplateId(null);
    setTitle("");
    setFormData({});
    setApprovalMode("auto");
    setApproverIds([""]);
    setCcIds([]);
    setError(null);
  }

  function handleOpen() { reset(); setOpen(true); }

  // ── Step 1 → 2 ────────────────────────────────────────────
  function handleSelectTemplate(id: string | null) {
    setSelectedTemplateId(id);
    setFormData({});
    setStep(2);
  }

  // ── Step 3 helpers ────────────────────────────────────────
  function addApprover() { setApproverIds((p) => [...p, ""]); }
  function setApprover(idx: number, val: string) {
    setApproverIds((p) => p.map((v, i) => (i === idx ? val : v)));
  }
  function removeApprover(idx: number) {
    setApproverIds((p) => p.filter((_, i) => i !== idx));
  }

  // ── Submit ────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const valid = approverIds.filter(Boolean);
    if (approvalMode === "manual" && valid.length === 0) { setError("결재자를 한 명 이상 선택해야 해요"); return; }
    startTransition(async () => {
      const res = await createDocumentAction({
        title: title.trim() || (selectedTemplate?.name ?? "새 문서"),
        kind: selectedTemplate?.kind ?? "GENERAL",
        templateId: selectedTemplateId ?? undefined,
        // 자동 배정: 빈 배열 → 서버가 결재 정책으로 결재선 생성 (C7)
        approverIds: approvalMode === "auto" ? [] : valid,
        ccRecipientIds: ccIds.filter(Boolean),
        formData: Object.fromEntries(
          Object.entries(formData).map(([k, v]) => [k, v]),
        ),
      });
      if (!res.ok) { setError(res.error.message); return; }
      reset();
      setOpen(false);
      router.push(`/workflow/documents/${res.data.id}`);
    });
  }

  // ── Field renderer ────────────────────────────────────────
  function renderField(field: FieldDef) {
    const val = formData[field.id] ?? "";
    const set = (v: string) => setFormData((p) => ({ ...p, [field.id]: v }));

    return (
      <div key={field.id} className="flex flex-col gap-1.5">
        <label className="text-sm text-foreground-muted">
          {field.label}
          {field.required && <span className="ml-0.5 text-destructive">*</span>}
        </label>
        {field.type === "textarea" ? (
          <textarea
            required={field.required}
            placeholder={field.placeholder}
            rows={3}
            value={val}
            onChange={(e) => set(e.target.value)}
            className="rounded-md border border-border bg-background-primary px-3 py-2 text-sm text-foreground resize-none focus-visible:outline-none focus-visible:border-border-focus"
          />
        ) : field.type === "select" ? (
          <select
            required={field.required}
            value={val}
            onChange={(e) => set(e.target.value)}
            className="h-10 rounded-md border border-border bg-background-primary px-3 text-sm text-foreground focus-visible:outline-none"
          >
            <option value="">선택해 주세요</option>
            {(field.options ?? []).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : field.type === "checkbox" ? (
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={val === "true"}
              onChange={(e) => set(e.target.checked ? "true" : "false")}
              className="h-4 w-4 rounded border-border"
            />
            {field.placeholder || field.label}
          </label>
        ) : (
          <Input
            type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
            required={field.required}
            placeholder={field.placeholder}
            value={val}
            onChange={(e) => set(e.target.value)}
          />
        )}
      </div>
    );
  }

  const step2Valid = title.trim().length > 0 || (selectedTemplate !== null && (
    selectedTemplate.fields.filter((f) => f.required).every((f) => (formData[f.id] ?? "").trim())
  ));
  const titlePlaceholder = selectedTemplate ? selectedTemplate.name : "문서 제목";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (isPending) return; if (!o) reset(); setOpen(o); }}>
      <Button onClick={handleOpen}>+ 문서 작성</Button>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>결재 문서 작성</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs text-foreground-muted">
          {(["양식 선택", "내용 입력", "결재선 지정"] as const).map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <span>›</span>}
              <span className={step === i + 1 ? "font-medium text-foreground" : ""}>{label}</span>
            </div>
          ))}
        </div>

        {/* ── STEP 1: 양식 선택 ── */}
        {step === 1 && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => handleSelectTemplate(null)}
              className="flex items-center gap-3 rounded-lg border border-dashed border-border px-4 py-3 text-left text-sm text-foreground-muted hover:border-foreground-muted hover:text-foreground transition-colors"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-background-secondary text-base">✏️</span>
              <div>
                <p className="font-medium text-foreground">빈 문서</p>
                <p className="text-xs">양식 없이 직접 작성</p>
              </div>
            </button>

            {templates.length > 0 && (
              <>
                <p className="mt-2 text-xs font-medium text-foreground-subtle uppercase tracking-wide">저장된 양식</p>
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectTemplate(t.id)}
                    className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-left text-sm hover:bg-background-secondary transition-colors"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-background-secondary text-xs font-medium text-foreground-muted">
                      {KIND_LABEL[t.kind as keyof typeof KIND_LABEL]?.slice(0, 2) ?? "일반"}
                    </span>
                    <div>
                      <p className="font-medium text-foreground">{t.name}</p>
                      <p className="text-xs text-foreground-muted">
                        {KIND_LABEL[t.kind as keyof typeof KIND_LABEL]} · 필드 {t.fields.length}개
                        {t.description && ` · ${t.description}`}
                      </p>
                    </div>
                  </button>
                ))}
              </>
            )}

            {templates.length === 0 && (
              <p className="mt-1 text-xs text-foreground-subtle">
                양식이 없어요.{" "}
                <a href="/settings/form-templates" className="underline hover:no-underline">양식 관리</a>
                에서 추가할 수 있어요.
              </p>
            )}
          </div>
        )}

        {/* ── STEP 2: 내용 입력 ── */}
        {step === 2 && (
          <form id="step2" onSubmit={(e) => { e.preventDefault(); setStep(3); }} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-foreground-muted">
                제목<span className="ml-0.5 text-destructive">*</span>
              </label>
              <Input
                required
                maxLength={100}
                placeholder={titlePlaceholder}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            {selectedTemplate && selectedTemplate.fields.length > 0 && (
              <div className="flex flex-col gap-3">
                {selectedTemplate.fields.map(renderField)}
              </div>
            )}
          </form>
        )}

        {/* ── STEP 3: 결재선 ── */}
        {step === 3 && (
          <form id="step3" onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* 결재선 배정 방식 (C7) */}
            <div className="flex flex-col gap-2">
              <label className="text-sm text-foreground-muted">결재선 배정</label>
              <div className="flex gap-2">
                {([["auto", "정책 자동 배정"], ["manual", "직접 지정"]] as const).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setApprovalMode(mode)}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                      approvalMode === mode
                        ? "border-border-focus bg-background-secondary font-medium text-foreground"
                        : "border-border text-foreground-muted hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {approvalMode === "auto" && (
                <p className="text-xs text-foreground-subtle">
                  문서 종류의 결재 정책에 따라 결재선이 자동 배정돼요. 정책이 없으면 직접 지정해 주세요.
                </p>
              )}
            </div>

            {approvalMode === "manual" && (
            <div className="flex flex-col gap-2">
              <label className="text-sm text-foreground-muted">결재선 (순서대로)</label>
              {approverIds.map((id, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-5 text-center text-xs text-foreground-subtle">{idx + 1}</span>
                  <select
                    value={id}
                    onChange={(e) => setApprover(idx, e.target.value)}
                    className="flex-1 h-10 rounded-md border border-border bg-background-primary px-3 text-sm text-foreground focus-visible:outline-none"
                  >
                    <option value="">결재자 선택</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                  {approverIds.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeApprover(idx)}
                      className="px-2 text-foreground-muted hover:text-destructive"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {approverIds.length < 5 && (
                <Button type="button" variant="secondary" onClick={addApprover}>
                  + 결재자 추가
                </Button>
              )}
            </div>
            )}

            {/* 참조자 (선택) */}
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <label className="text-sm text-foreground-muted">참조자 <span className="text-foreground-subtle">(선택)</span></label>
                {ccIds.length < 5 && (
                  <button
                    type="button"
                    onClick={() => setCcIds((p) => [...p, ""])}
                    className="text-xs text-foreground-muted hover:text-foreground"
                  >
                    + 추가
                  </button>
                )}
              </div>
              {ccIds.map((id, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={id}
                    onChange={(e) => setCcIds((p) => p.map((v, i) => (i === idx ? e.target.value : v)))}
                    className="flex-1 h-9 rounded-md border border-border bg-background-primary px-3 text-sm text-foreground focus-visible:outline-none"
                  >
                    <option value="">참조자 선택</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setCcIds((p) => p.filter((_, i) => i !== idx))}
                    className="px-2 text-foreground-muted hover:text-destructive"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {error && (
              <p role="alert" className="rounded-[14px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">{error}</p>
            )}
          </form>
        )}

        <DialogFooter>
          {step === 1 && (
            <DialogClose asChild>
              <Button type="button" variant="secondary">취소</Button>
            </DialogClose>
          )}
          {step === 2 && (
            <>
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>이전</Button>
              <Button type="submit" form="step2" disabled={!title.trim()}>다음</Button>
            </>
          )}
          {step === 3 && (
            <>
              <Button type="button" variant="secondary" disabled={isPending} onClick={() => setStep(2)}>이전</Button>
              <Button type="submit" form="step3" disabled={isPending}>
                {isPending ? "제출 중…" : "제출"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
