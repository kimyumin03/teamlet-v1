"use client";

import { useRef, useState, useActionState } from "react";
import { Upload, CheckCircle2, XCircle, Download } from "lucide-react";
import { Button } from "@teamlet/ui";
import { csvImportAction, type CsvImportState } from "@/lib/actions/csv-import";

const TEMPLATE_HEADERS = "이름,사원번호,회사이메일,입사일,부서명,직책명,고용형태";
const TEMPLATE_EXAMPLE = "홍길동,EMP001,hong@company.com,2024-01-15,개발팀,팀장,정규직";

function downloadTemplate() {
  const csv = `${TEMPLATE_HEADERS}\n${TEMPLATE_EXAMPLE}\n`;
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "teamlet_members_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const initial: CsvImportState = { error: null };

export function CsvImportButton() {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, formAction, isPending] = useActionState(csvImportAction, initial);

  function handleClose() {
    setOpen(false);
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Upload className="mr-1.5 size-3.5" />
        CSV 가져오기
      </Button>
    );
  }

  const hasResults = !!state.results;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-border bg-background-primary shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">CSV로 구성원 일괄 등록</h2>
          <button
            onClick={handleClose}
            className="text-foreground-subtle hover:text-foreground"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4">
          {!hasResults ? (
            <>
              {/* 템플릿 다운로드 */}
              <div className="mb-4 rounded-[14px] border border-border bg-background-secondary p-3">
                <p className="mb-2 text-sm text-foreground-muted">
                  CSV 파일 형식: <code className="text-xs text-foreground">이름, 사원번호, 회사이메일, 입사일, 부서명, 직책명, 고용형태</code>
                </p>
                <p className="mb-3 text-xs text-foreground-subtle">
                  • 이름만 필수 · 입사일은 YYYY-MM-DD · 고용형태: 정규직/파트타임/계약직/인턴/파견
                </p>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-1.5 text-xs text-accent hover:underline"
                >
                  <Download className="size-3" />
                  템플릿 다운로드
                </button>
              </div>

              {/* 파일 업로드 */}
              <form action={formAction} className="flex flex-col gap-3">
                <label
                  htmlFor="csv-file"
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border py-8 transition-colors hover:border-foreground-subtle hover:bg-background-secondary"
                >
                  <Upload className="size-6 text-foreground-subtle" />
                  <span className="text-sm text-foreground-muted">
                    {fileName || "CSV 파일 선택 또는 드래그"}
                  </span>
                  <span className="text-xs text-foreground-subtle">최대 1MB</span>
                </label>
                <input
                  id="csv-file"
                  ref={fileRef}
                  name="file"
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
                />

                {state.error && (
                  <p role="alert" className="rounded-[14px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
                    {state.error}
                  </p>
                )}

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={handleClose}>
                    취소
                  </Button>
                  <Button type="submit" size="sm" disabled={isPending || !fileName}>
                    {isPending ? "등록 중…" : "등록"}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <>
              {/* 결과 */}
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm text-foreground">
                  총 {state.total}명 중 <strong>{state.successCount}명</strong> 등록 완료
                </span>
              </div>
              <ul className="max-h-72 overflow-y-auto flex flex-col gap-1">
                {state.results!.map((r) => (
                  <li key={r.row} className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm">
                    {r.ok ? (
                      <CheckCircle2 className="size-4 shrink-0 text-green-600" />
                    ) : (
                      <XCircle className="size-4 shrink-0 text-destructive" />
                    )}
                    <span className="font-medium text-foreground">{r.name || `${r.row}행`}</span>
                    {!r.ok && (
                      <span className="text-xs text-foreground-muted">— {r.error}</span>
                    )}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex justify-end">
                <Button size="sm" onClick={() => window.location.reload()}>
                  완료
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
