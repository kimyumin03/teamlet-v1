"use client";

// 증명서 종류(템플릿) 관리 — 원본 settings/_components/certificate-template-manager.tsx 그대로(import 만 조정).
// ⚠️ certificate_templates.fileUrl 컬럼이 v1 schema 에 미선언이라 파일 URL 은 저장되지 않아요.
//    원본 UI(파일 URL 입력)는 보존하되 선택 입력으로 두고, 발급은 snapshotData 기반 인쇄로 동작해요.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@teamlet/ui";
import {
  createCertificateTemplateAction,
  deleteCertificateTemplateAction,
} from "@/lib/actions/document";
import type { CertificateTemplateItem, CertificateType } from "@/lib/modules/document";

const CERT_TYPES: { value: CertificateType; label: string }[] = [
  { value: "EMPLOYMENT", label: "재직증명서" },
  { value: "CAREER", label: "경력증명서" },
];

const selectClass = "h-10 w-full rounded-[8px] border border-border bg-background-primary px-3 text-[13px] text-foreground focus-visible:border-border-focus focus-visible:outline-none";

export function CertificateTemplateManager({ templates }: { templates: CertificateTemplateItem[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [certType, setCertType] = useState<CertificateType>("EMPLOYMENT");
  const [fileUrl, setFileUrl] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setAddError(null);
    startTransition(async () => {
      const res = await createCertificateTemplateAction({ name: name.trim(), certType, fileUrl: fileUrl.trim() });
      if (!res.ok) { setAddError(res.error.message); return; }
      setName("");
      setFileUrl("");
      router.refresh();
    });
  }

  function handleDelete(templateId: string, templateName: string) {
    if (!confirm(`"${templateName}" 증명서 종류를 삭제하시겠어요?`)) return;
    startTransition(async () => {
      const res = await deleteCertificateTemplateAction(templateId);
      if (!res.ok) { alert(res.error.message); return; }
      router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 추가 폼 */}
      <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
        <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: 14, color: "var(--fg)" }}>증명서 종류 추가</div>
        <form onSubmit={handleAdd} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 200px", minWidth: 160 }}>
            <label style={{ fontSize: "12px", color: "var(--fg-muted)" }}>표시 이름</label>
            <Input
              required
              maxLength={50}
              placeholder="예: 재직증명서 (국문)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 160px", minWidth: 140 }}>
            <label style={{ fontSize: "12px", color: "var(--fg-muted)" }}>증명서 형식</label>
            <select
              value={certType}
              onChange={(e) => setCertType(e.target.value as CertificateType)}
              className={selectClass}
            >
              {CERT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "2 1 280px", minWidth: 200 }}>
            <label style={{ fontSize: "12px", color: "var(--fg-muted)" }}>파일 URL (선택)</label>
            <Input
              type="url"
              placeholder="https://..."
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={isPending || !name.trim()} style={{ flexShrink: 0 }}>
            {isPending ? "추가 중…" : "+ 추가"}
          </Button>
        </form>
        {addError && (
          <p role="alert" style={{ marginTop: 8, fontSize: "13px", color: "var(--destructive-600)" }}>{addError}</p>
        )}
      </div>

      {/* 목록 */}
      <div>
        <div className="sec-divider">
          등록된 증명서 종류<span className="ct">{templates.length}</span><span className="line" />
        </div>
        {templates.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--fg-muted)", fontSize: "13px" }}>
            등록된 증명서 종류가 없어요. 위에서 추가해주세요.
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>표시 이름</th>
                <th>형식</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600 }}>{t.name}</td>
                  <td>
                    <span className={t.certType === "EMPLOYMENT" ? "tag ok" : "tag wfh"}>
                      {t.certType === "EMPLOYMENT" ? "재직증명서" : "경력증명서"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleDelete(t.id, t.name)}
                      style={{ color: "var(--destructive-600)", fontSize: "12px" }}
                    >
                      삭제
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
