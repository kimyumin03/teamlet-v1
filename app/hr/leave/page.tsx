import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { employees, departments } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/current-user";
import { isHrAdmin } from "@/lib/permissions";
import {
  listCompanyLeaveBalances,
  listCompanyLeaveRequests,
  listLeaveTypes,
  listMonthlyAnnualUsage,
  listLeaveGrantHistory,
} from "@/lib/actions/leave";
import { listCompanyLeavePromotions } from "@/lib/actions/leave-promotion";
import { GrantLeaveDropdown } from "@/components/hr/grant-leave-dropdown";
import { AdjustLeaveDropdown } from "@/components/hr/adjust-leave-dropdown";
import { ExpiryButton } from "@/components/hr/expiry-button";
import { LeaveStatusView } from "./_components/leave-status-view";
import { RequestsTable } from "./_components/requests-table";
import { MonthlyAnnualTable } from "./_components/monthly-annual-table";
import { PromotionTable } from "./_components/promotion-table";
import { GrantHistoryFullView } from "./_components/grant-history-full-view";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "balances", label: "휴가 보유 현황" },
  { id: "requests", label: "휴가 사용 내역" },
  { id: "monthly", label: "월별 연차" },
  { id: "promotion", label: "연차 촉진" },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** 회사 활성 구성원 목록 (피커용) + 부서 목록 — 인라인 drizzle 로드. */
async function loadEmployeesAndDepartments(companyId: string) {
  try {
    const db = getDb();
    const emps = await db
      .select({
        id: employees.id,
        name: employees.name,
        departmentId: employees.departmentId,
        departmentName: departments.name,
        isActive: employees.isActive,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(and(eq(employees.companyId, companyId), eq(employees.isActive, true)))
      .orderBy(asc(employees.name));
    const depts = await db
      .select({ id: departments.id, name: departments.name, parentId: departments.parentId })
      .from(departments)
      .where(eq(departments.companyId, companyId))
      .orderBy(asc(departments.sortOrder));
    return {
      employees: emps.map((e) => ({ id: e.id, name: e.name, departmentId: e.departmentId, departmentName: e.departmentName ?? null })),
      departments: depts.map((d) => ({ id: d.id, name: d.name, parentId: d.parentId })),
    };
  } catch (e) {
    console.error("[hr/leave] employees/departments load 실패", e);
    return { employees: [], departments: [] };
  }
}

export default async function HrLeavePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; year?: string; view?: string }>;
}) {
  // 인사관리(관리자 전용) 게이트
  const user = await getCurrentUser();
  if (!(await isHrAdmin(user.employeeId))) {
    return (
      <div className="page-body">
        <div className="page-h">
          <div>
            <h1 className="h-title">휴가 관리</h1>
            <div className="h-sub">권한이 없어요</div>
          </div>
        </div>
        <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--fg-muted)" }}>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--fg)", marginBottom: "8px" }}>휴가 관리 권한이 없어요</div>
          <code style={{ fontSize: "11.5px", background: "var(--bg-secondary)", padding: "2px 6px", borderRadius: "5px" }}>
            member.directory.manage
          </code>{" "}
          권한이 필요해요
        </div>
      </div>
    );
  }

  const { tab, year: yearParam, view } = await searchParams;
  const employeeId = user.employeeId;

  // 맞춤 휴가 부여 내역 전체 화면
  if (view === "grant-history") {
    const currentYear = new Date().getFullYear();
    const [historyResult, typesResult, ed] = await Promise.all([
      listLeaveGrantHistory(employeeId, { year: currentYear }),
      listLeaveTypes(employeeId),
      loadEmployeesAndDepartments(user.companyId),
    ]);
    const initialRows = historyResult.ok ? historyResult.data : [];
    const leaveTypes = typesResult.ok ? typesResult.data : [];
    const historyEmployees = ed.employees.map((e) => ({ id: e.id, name: e.name, departmentName: e.departmentName }));
    return (
      <GrantHistoryFullView
        initialRows={initialRows}
        leaveTypes={leaveTypes}
        employees={historyEmployees}
        currentYear={currentYear}
      />
    );
  }

  const activeTab: TabId =
    tab === "requests" ? "requests"
    : tab === "monthly" ? "monthly"
    : tab === "promotion" ? "promotion"
    : "balances";
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

  const [balancesResult, requestsResult, typesResult, ed, monthlyResult, promotionResult] = await Promise.all([
    listCompanyLeaveBalances(employeeId, year),
    listCompanyLeaveRequests(employeeId),
    listLeaveTypes(employeeId),
    loadEmployeesAndDepartments(user.companyId),
    listMonthlyAnnualUsage(employeeId, year),
    listCompanyLeavePromotions(employeeId, year),
  ]);

  const rows = balancesResult.ok ? balancesResult.data : [];
  const requests = requestsResult.ok ? requestsResult.data : null;
  const leaveTypes = typesResult.ok ? typesResult.data : [];
  const employeesList = ed.employees;
  const departmentsList = ed.departments;
  const monthlyRows = monthlyResult.ok ? monthlyResult.data : [];
  const promotions = promotionResult.ok ? promotionResult.data : [];

  // KPI 계산
  const annualBalances = rows
    .map((r) => r.balances.find((b) => b.leaveTypeKey === "annual"))
    .filter(Boolean);
  const avgRemaining =
    annualBalances.length > 0
      ? Math.round((annualBalances.reduce((s, b) => s + b!.remainingDays, 0) / annualBalances.length) * 10) / 10
      : 0;
  const nearExpiryCount = annualBalances.filter((b) => b!.remainingDays <= 3 && b!.remainingDays > 0).length;
  const exhaustedCount = annualBalances.filter((b) => b!.remainingDays <= 0 && b!.grantedDays > 0).length;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisMonthDays = requests
    ? requests
        .filter((r) => {
          if (r.status !== "APPROVED") return false;
          const d = new Date(r.startDate);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((s, r) => s + r.days, 0)
    : 0;
  const onLeaveToday = requests
    ? requests.filter((r) => {
        if (r.status !== "APPROVED") return false;
        const start = new Date(r.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(r.endDate);
        end.setHours(23, 59, 59, 999);
        return start <= today && end >= today;
      }).length
    : 0;

  const showYearNav = activeTab === "balances" || activeTab === "monthly";
  const activePromoCount = promotions.filter(
    (p) => p.status === "REQUESTED" || p.status === "ADMIN_WRITING" || p.status === "APPROVAL_PENDING",
  ).length;

  return (
    <div className="page-body">
      {/* 헤더 */}
      <div className="page-h">
        <div>
          <h1 className="h-title">휴가 관리</h1>
          <div className="h-sub">
            전 구성원 {rows.length}명 · 평균 잔여 {avgRemaining}일
            {nearExpiryCount > 0 && ` · 소진 임박 ${nearExpiryCount}명`}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <ExpiryButton year={year} />
          <AdjustLeaveDropdown employees={employeesList} departments={departmentsList} leaveTypes={leaveTypes} />
          <GrantLeaveDropdown employees={employeesList} departments={departmentsList} leaveTypes={leaveTypes} />
        </div>
      </div>

      {/* KPI 카드 */}
      <div className="kpis">
        <div className="kpi">
          <span className="lbl">전체 평균 잔여</span>
          <span className="val num">{avgRemaining}<small>일</small></span>
          <span className="delta">{exhaustedCount > 0 ? `소진 ${exhaustedCount}명 포함` : "연차 기준"}</span>
        </div>
        <div className={`kpi${nearExpiryCount > 0 ? " cta" : ""}`}>
          <span className="lbl">소진 임박 (≤3일)</span>
          <span className="val num">{nearExpiryCount}<small>명</small></span>
          <span className="delta">{exhaustedCount > 0 ? `소진 ${exhaustedCount}명` : "촉진 필요"}</span>
        </div>
        <div className="kpi">
          <span className="lbl">이번 달 사용</span>
          <span className="val num">{thisMonthDays}<small>일</small></span>
          <span className="delta">{now.getMonth() + 1}월 승인 기준</span>
        </div>
        <div className="kpi">
          <span className="lbl">오늘 휴가 중</span>
          <span className="val num">{onLeaveToday}<small>명</small></span>
          <span className="delta">{onLeaveToday > 0 ? "오늘 휴가 중인 구성원" : "오늘 휴가 없음"}</span>
        </div>
      </div>

      {/* 탭 + 연도 내비 */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}>
        <div className="tabs" style={{ margin: 0 }}>
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={`/hr/leave?tab=${t.id}${showYearNav ? `&year=${year}` : ""}`}
              className={`tab${activeTab === t.id ? " active" : ""}`}
            >
              {t.label}
              {t.id === "promotion" && activePromoCount > 0 && (
                <span style={{ marginLeft: "5px", fontSize: "11px", background: "var(--primary)",
                  color: "#fff", borderRadius: "99px", padding: "1px 6px", fontVariantNumeric: "tabular-nums" }}>
                  {activePromoCount}
                </span>
              )}
            </Link>
          ))}
        </div>
        {showYearNav && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "4px" }}>
            <Link href={`/hr/leave?tab=${activeTab}&year=${year - 1}`} className="btn btn-ghost sm">‹</Link>
            <span style={{ fontSize: "13px", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{year}년</span>
            <Link href={`/hr/leave?tab=${activeTab}&year=${year + 1}`} className="btn btn-ghost sm">›</Link>
          </div>
        )}
      </div>

      {/* 콘텐츠 */}
      {activeTab === "balances" && rows.length > 0 && (
        <LeaveStatusView rows={rows} leaveTypes={leaveTypes} />
      )}
      {activeTab === "balances" && rows.length === 0 && (
        <div style={{ padding: "60px 20px", textAlign: "center", border: "1px dashed var(--border)", borderRadius: "14px", color: "var(--fg-muted)" }}>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--fg)", marginBottom: "6px" }}>구성원 데이터가 없어요</div>
          <div style={{ fontSize: "12.5px" }}>활성 구성원과 휴가 유형을 먼저 설정해 주세요</div>
        </div>
      )}
      {activeTab === "requests" && requests && (
        <RequestsTable requests={requests} />
      )}
      {activeTab === "monthly" && (
        <MonthlyAnnualTable rows={monthlyRows} />
      )}
      {activeTab === "promotion" && (
        <PromotionTable promotions={promotions} />
      )}
    </div>
  );
}
