"use client";

import { useState, useRef, useTransition } from "react";
import { Upload, Download, FileSpreadsheet, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@teamlet/ui";
import { useRouter } from "next/navigation";

type UnitMode = "hm" | "decimal";

export function UsageUploadModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [unit, setUnit] = useState<UnitMode>("hm");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{
    totalRows: number;
    successRows: number;
    failedRows: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setError(null);
    setResult(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith(".xlsx") || f?.name.endsWith(".xls")) {
      setFile(f);
      setError(null);
      setResult(null);
    } else {
      setError("xlsx 또는 xls 파일만 업로드할 수 있어요.");
    }
  }

  function handleUpload() {
    if (!file) return;
    setError(null);
    setResult(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("unit", unit);
    startTransition(async () => {
      try {
        const res = await fetch("/api/hr/leave/import/usage", {
          method: "POST",
          body: formData,
        });
        const json = await res.json();
        if (json.ok) {
          setResult(json.data);
          router.refresh();
        } else {
          setError(json.error ?? "업로드에 실패했어요.");
        }
      } catch {
        setError("업로드 중 오류가 발생했어요.");
      }
    });
  }

  function handleClose() {
    setFile(null);
    setResult(null);
    setError(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent style={{ maxWidth: 480 }}>
        <DialogHeader>
          <DialogTitle>연차 사용 내역 업로드</DialogTitle>
        </DialogHeader>
        <p style={{ fontSize: 12.5, color: "var(--fg-muted)", marginTop: -4, lineHeight: 1.6 }}>
          연차 사용 기록을 엑셀로 일괄 업로드할 수 있어요.<br />
          구성원의 근무 · 휴가 기록이 없는 날에만 기록할 수 있습니다.
        </p>

        <div className="flex flex-col gap-5 mt-2">
          {/* Step 1 */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span style={{
                width: 20, height: 20, borderRadius: "50%", background: "var(--primary)",
                color: "#fff", fontSize: 11, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>1</span>
              <span className="text-[13px] font-semibold text-foreground">엑셀 양식을 다운로드 해주세요.</span>
            </div>
            <p className="text-[12px] text-foreground-muted ml-7">
              입력할 연차 사용 단위를 선택하고 다운로드 해주세요.
            </p>
            {/* 단위 토글 */}
            <div className="ml-7 flex gap-0" style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", width: "fit-content" }}>
              {([["hm", "일 · 시간 · 분"], ["decimal", "소수점"]] as [UnitMode, string][]).map(([v, label]) => (
                <button key={v} type="button" onClick={() => setUnit(v)}
                  style={{
                    padding: "5px 14px", fontSize: 12.5, fontWeight: 600, border: "none", cursor: "pointer",
                    background: unit === v ? "var(--fg)" : "var(--bg-primary)",
                    color: unit === v ? "var(--bg-primary)" : "var(--fg-muted)",
                  }}>
                  {label}
                </button>
              ))}
            </div>
            <a
              href={`/api/hr/leave/export/usage-template?unit=${unit}`}
              download
              className="ml-7"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: "1px solid var(--border)", background: "var(--bg-primary)",
                color: "var(--fg-muted)", textDecoration: "none", width: "fit-content",
              }}
            >
              <FileSpreadsheet size={14} /> 엑셀 양식 다운로드
            </a>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span style={{
                width: 20, height: 20, borderRadius: "50%", background: "var(--primary)",
                color: "#fff", fontSize: 11, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>2</span>
              <span className="text-[13px] font-semibold text-foreground">수정한 내역을 업로드 해주세요.</span>
            </div>
            <p className="text-[12px] text-foreground-muted ml-7">
              파일이 잘 저장되었는지 확인 후 업로드 해주세요.
            </p>

            {/* 드롭존 */}
            <div
              className="ml-7"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${file ? "var(--primary)" : "var(--border)"}`,
                borderRadius: 10, padding: "20px 16px", textAlign: "center",
                cursor: "pointer", background: file ? "var(--bg-secondary)" : "var(--bg-primary)",
                transition: "border-color 0.15s, background 0.15s",
              }}
            >
              <Upload size={20} style={{ margin: "0 auto 6px", opacity: 0.4 }} />
              {file ? (
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>{file.name}</p>
                  <p style={{ fontSize: 11.5, color: "var(--fg-muted)", marginTop: 2 }}>
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: "var(--fg-subtle)" }}>
                  📎 파일 선택 또는 끌어놓기..
                </p>
              )}
              <input
                ref={fileRef} type="file" accept=".xlsx,.xls"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </div>
          </div>

          {/* 결과 */}
          {result && (
            <div style={{
              borderRadius: 10, padding: "12px 14px",
              background: result.failedRows === 0 ? "var(--bg-secondary)" : "var(--destructive-50)",
              border: `1px solid ${result.failedRows === 0 ? "var(--border)" : "var(--destructive-100)"}`,
              fontSize: 13,
            }}>
              <p style={{ fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>업로드 완료</p>
              <p style={{ color: "var(--fg-muted)", fontSize: 12.5 }}>
                총 {result.totalRows}행 · 성공 {result.successRows}행
                {result.failedRows > 0 && ` · 실패 ${result.failedRows}행`}
              </p>
            </div>
          )}

          {error && (
            <p className="text-[12px] text-destructive-600">{error}</p>
          )}

          {/* 업로드 버튼 */}
          <button
            type="button"
            disabled={!file || isPending || !!result}
            onClick={handleUpload}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px 0", borderRadius: 10, fontSize: 14, fontWeight: 700,
              background: !file || isPending || !!result ? "var(--bg-secondary)" : "var(--primary)",
              color: !file || isPending || !!result ? "var(--fg-subtle)" : "#fff",
              border: "none", cursor: !file || isPending || !!result ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
          >
            <Upload size={15} />
            {isPending ? "업로드 중…" : "기록 업로드하기"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
