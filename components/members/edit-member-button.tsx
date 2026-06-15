"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@teamlet/ui";
import type { EmployeeDetail, Gender, EmploymentType } from "@teamlet/modules/employee";
import { updateEmployeeAction } from "@/lib/actions/employee";

function toDateInput(d: Date | null): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export function EditMemberButton({ employee }: { employee: EmployeeDetail }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(employee.name);
  const [employeeNumber, setEmployeeNumber] = useState(
    employee.employeeNumber ?? "",
  );
  const [companyEmail, setCompanyEmail] = useState(
    employee.companyEmail ?? "",
  );
  const [personalEmail, setPersonalEmail] = useState(employee.personalEmail ?? "");
  const [phone, setPhone] = useState(employee.phone ?? "");
  const [birthDate, setBirthDate] = useState(toDateInput(employee.birthDate));
  const [gender, setGender] = useState<Gender | "">(employee.gender ?? "");
  const [employmentType, setEmploymentType] = useState<EmploymentType>(employee.employmentType);
  const [probationEndDate, setProbationEndDate] = useState(toDateInput(employee.probationEndDate));
  const [hireDate, setHireDate] = useState(toDateInput(employee.hireDate));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updateEmployeeAction(employee.id, {
        name,
        employeeNumber: employeeNumber || undefined,
        companyEmail: companyEmail || undefined,
        personalEmail: personalEmail || undefined,
        phone: phone || undefined,
        birthDate: birthDate || undefined,
        gender: gender || undefined,
        employmentType,
        probationEndDate: probationEndDate || undefined,
        hireDate: hireDate || undefined,
      });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!isPending) setOpen(o);
      }}
    >
      <Button variant="secondary" onClick={() => setOpen(true)}>
        수정
      </Button>
      <DialogContent className="flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>구성원 정보 수정</DialogTitle>
          <DialogDescription>
            비워두면 해당 필드가 지워져요. 이름은 필수예요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="flex flex-col gap-4 overflow-y-auto flex-1 pr-1 pb-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-name" className="text-sm text-foreground-muted">이름</label>
              <Input id="edit-name" required minLength={2} maxLength={50} value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-number" className="text-sm text-foreground-muted">사번</label>
                <Input id="edit-number" maxLength={30} value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-hire" className="text-sm text-foreground-muted">입사일</label>
                <Input id="edit-hire" type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-email" className="text-sm text-foreground-muted">회사 이메일</label>
              <Input id="edit-email" type="email" maxLength={254} value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-personal-email" className="text-sm text-foreground-muted">개인 이메일</label>
              <Input id="edit-personal-email" type="email" maxLength={254} value={personalEmail} onChange={(e) => setPersonalEmail(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-foreground-muted">연락처</label>
                <Input maxLength={20} placeholder="010-0000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-foreground-muted">생년월일</label>
                <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-foreground-muted">성별</label>
                <select value={gender} onChange={(e) => setGender(e.target.value as Gender | "")} className="h-10 rounded-md border border-border bg-background-primary px-3 text-sm text-foreground focus-visible:outline-none">
                  <option value="">미지정</option>
                  <option value="MALE">남성</option>
                  <option value="FEMALE">여성</option>
                  <option value="OTHER">기타</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-foreground-muted">고용형태</label>
                <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value as EmploymentType)} className="h-10 rounded-md border border-border bg-background-primary px-3 text-sm text-foreground focus-visible:outline-none">
                  <option value="FULL_TIME">정규직</option>
                  <option value="PART_TIME">파트타임</option>
                  <option value="CONTRACT">계약직</option>
                  <option value="INTERN">인턴</option>
                  <option value="DISPATCH">파견</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-foreground-muted">수습 종료일</label>
                <Input type="date" value={probationEndDate} onChange={(e) => setProbationEndDate(e.target.value)} />
              </div>
            </div>

            <p className="rounded-md bg-background-secondary px-3 py-2 text-xs text-foreground-muted">
              부서·직책은 이력 보존을 위해{" "}
              <strong className="font-medium text-foreground">발령</strong> 탭에서 변경해요.
            </p>

            {error && (
              <p role="alert" className="rounded-[14px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="pt-4 border-t border-border mt-2 shrink-0">
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isPending}>취소</Button>
            </DialogClose>
            <Button type="submit" disabled={isPending || name.trim().length < 2}>
              {isPending ? "저장 중…" : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
