"use client";

// 회사 정보 수정 폼 — 원본 components/company/company-info-form.tsx 를 충실히 이식.
// 차이: v1 엔 @/lib/upload-client(로고 업로드)·logoUrl/visionMission/companyCodeActive 컬럼이 없어
//   로고 카드는 읽기전용 안내로 두고, 비전·미션/가입설정 입력은 화면엔 두되 저장은 선언 컬럼만 반영.
//   (저장되는 값: 회사명/연락처/설립일/주소)

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@teamlet/ui";
import type { CompanyInfo } from "@teamlet/modules/company";
import { updateCompanyInfoAction } from "@/lib/actions/company";

function toDateInput(d: Date | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

const inputCls =
  "w-full max-w-[420px] rounded-[8px] border border-border-strong bg-background-primary px-3 py-2 text-[13.5px] text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50";

function Field({
  label,
  hint,
  narrow,
  children,
}: {
  label: string;
  hint?: string;
  narrow?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[220px_1fr] items-start gap-6 border-b border-border py-3.5 last:border-0">
      <div>
        <p className="text-[13px] font-semibold text-foreground">{label}</p>
        {hint && <p className="mt-1 text-[11.5px] text-foreground-muted">{hint}</p>}
      </div>
      <div className={narrow ? "max-w-[260px]" : ""}>{children}</div>
    </div>
  );
}

export function CompanyInfoForm({ initialInfo }: { initialInfo: CompanyInfo }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState(initialInfo.name);
  const [phone, setPhone] = useState(initialInfo.phone ?? "");
  const [foundedAt, setFoundedAt] = useState(toDateInput(initialInfo.foundedAt));
  const [addressRoad, setAddressRoad] = useState(initialInfo.addressRoad ?? "");
  const [addressDetail, setAddressDetail] = useState(initialInfo.addressDetail ?? "");
  const [visionMission, setVisionMission] = useState(initialInfo.visionMission ?? "");
  const [companyCodeActive, setCompanyCodeActive] = useState(initialInfo.companyCodeActive);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await updateCompanyInfoAction({
        name: name.trim() || undefined,
        phone: phone.trim() || null,
        foundedAt: foundedAt || null,
        addressRoad: addressRoad.trim() || null,
        addressDetail: addressDetail.trim() || null,
        visionMission: visionMission.trim() || null,
        companyCodeActive,
      });
      if (!res.ok) { setError(res.error.message); return; }
      setSuccess(true);
      router.refresh();
    });
  }

  const companyInitial = initialInfo.name.charAt(0).toUpperCase();

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* 회사 로고 카드 — v1 엔 업로드/logoUrl 미연결이라 읽기전용 안내 */}
      <div className="rounded-[14px] border border-border bg-background-primary px-[26px] py-[22px]">
        <h3 className="mb-1.5 text-[15px] font-bold text-foreground">회사 로고</h3>
        <p className="mb-4 text-[12.5px] text-foreground-muted">사이드바·증명서·결재 문서 상단에 표시됩니다. (로고 업로드는 준비 중)</p>
        <div className="flex items-center gap-4">
          <div
            className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[14px] text-[22px] font-bold"
            style={{ background: "var(--primary)", color: "var(--primary-on)" }}
          >
            {companyInitial}
          </div>
        </div>
      </div>

      {/* 읽기 전용 정보 */}
      <div className="rounded-[14px] border border-border bg-background-secondary px-[26px] py-[22px]">
        <h3 className="mb-4 text-[15px] font-bold text-foreground">등록 정보 <span className="ml-2 text-[12px] font-normal text-foreground-muted">변경 불가</span></h3>
        <div className="grid grid-cols-2 gap-4 text-[13px]">
          <div>
            <p className="text-[11.5px] text-foreground-subtle">사업자번호</p>
            <p className="mt-0.5 font-mono font-semibold text-foreground">{initialInfo.businessNumber || "—"}</p>
          </div>
          <div>
            <p className="text-[11.5px] text-foreground-subtle">회사코드</p>
            <p className="mt-0.5 font-mono font-semibold text-foreground">{initialInfo.companyCode || "—"}</p>
          </div>
        </div>
      </div>

      {/* 기본 정보 카드 */}
      <div className="rounded-[14px] border border-border bg-background-primary px-[26px] py-[22px]">
        <h3 className="mb-5 text-[15px] font-bold text-foreground">기본 정보</h3>
        <Field label="회사명">
          <input className={inputCls} required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="대표 연락처">
          <input className={inputCls} maxLength={20} placeholder="02-0000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="설립일" narrow>
          <input className={inputCls} type="date" value={foundedAt} onChange={(e) => setFoundedAt(e.target.value)} />
        </Field>
      </div>

      {/* 연락·주소 카드 */}
      <div className="rounded-[14px] border border-border bg-background-primary px-[26px] py-[22px]">
        <h3 className="mb-5 text-[15px] font-bold text-foreground">연락 · 주소</h3>
        <Field label="도로명 주소">
          <input className={inputCls} maxLength={200} placeholder="서울특별시 강남구 테헤란로 123" value={addressRoad} onChange={(e) => setAddressRoad(e.target.value)} />
        </Field>
        <Field label="상세 주소">
          <input className={inputCls} maxLength={200} placeholder="4층 401호" value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} />
        </Field>
      </div>

      {/* 비전·미션 카드 — 입력은 가능하나 v1 schema 미연결이라 저장 안 됨 */}
      <div className="rounded-[14px] border border-border bg-background-primary px-[26px] py-[22px]">
        <h3 className="mb-5 text-[15px] font-bold text-foreground">비전 · 미션 <span className="ml-2 text-[12px] font-normal text-foreground-muted">저장 준비 중</span></h3>
        <textarea
          maxLength={2000}
          rows={4}
          className="w-full rounded-[8px] border border-border bg-background-primary px-3 py-2 text-[13px] text-foreground resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="회사의 비전과 미션을 입력해요"
          value={visionMission}
          onChange={(e) => setVisionMission(e.target.value)}
        />
      </div>

      {/* 가입 설정 카드 — 동일하게 저장 준비 중 */}
      <div className="rounded-[14px] border border-border bg-background-primary px-[26px] py-[22px]">
        <h3 className="mb-4 text-[15px] font-bold text-foreground">가입 설정 <span className="ml-2 text-[12px] font-normal text-foreground-muted">저장 준비 중</span></h3>
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={companyCodeActive}
            onChange={(e) => setCompanyCodeActive(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <div>
            <p className="text-[13px] font-semibold text-foreground">회사코드로 가입 허용</p>
            <p className="mt-0.5 text-[11.5px] text-foreground-muted">코드를 아는 누구나 가입 신청할 수 있어요</p>
          </div>
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded-[14px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">{error}</p>
      )}
      {success && (
        <p className="rounded-[14px] border border-emerald-300 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-700">저장됐어요.</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "저장 중…" : "변경 사항 저장"}
        </Button>
      </div>
    </form>
  );
}
