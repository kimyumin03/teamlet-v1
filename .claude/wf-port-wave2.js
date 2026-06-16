export const meta = {
  name: 'teamlet-port-wave2',
  description: '원본 teamlet 충실 이식 — Wave2: 홈/피드·문서증명서·설정(회사/보안/조직)·설정(정책/권한)·커맨드팔레트',
  phases: [{ title: 'Port', detail: '영역별 병렬 이식' }],
}

const REPORT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['area', 'filesWritten', 'actionsCreated', 'missingSchemaColumns', 'blockers', 'summary'],
  properties: {
    area: { type: 'string' },
    filesWritten: { type: 'array', items: { type: 'string' } },
    actionsCreated: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'signature', 'writes'],
        properties: { name: { type: 'string' }, signature: { type: 'string' }, writes: { type: 'string' } },
      },
    },
    missingSchemaColumns: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['table', 'column', 'udt', 'required'],
        properties: { table: { type: 'string' }, column: { type: 'string' }, udt: { type: 'string' }, required: { type: 'boolean' } },
      },
    },
    blockers: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
}

const RULES = `
당신은 모노레포 HR 앱(원본: D:/teamlet/apps/web/src, Prisma)을 단일 Next.js 앱
(타깃: D:/teamlet-v1, drizzle+Neon)으로 **충실하게 1:1 이식**합니다. 사용자가 로컬에서 쓰던
모든 이벤트/모달/검색/디자인이 그대로 동작해야 합니다.

## 절대 규칙
- 원본 D:/teamlet 은 읽기 전용. 새 코드는 D:/teamlet-v1 에만. 절대경로 사용.
- **수정/덮어쓰기 금지 공용 파일**: lib/db/schema.ts, tsconfig.json, package.json, components/ui/*,
  app/layout.tsx, app/_components/sidebar.tsx, lib/db.ts, lib/current-user.ts, lib/permissions.ts,
  components/common/recipient-picker*.
- **이미 존재하는 공용 액션/모듈(다른 영역이 소유 — 덮어쓰기 금지, READ 만)**:
  lib/actions/{auth,department,position,appointment,employee,employee-profile,invite,csv-import,join-requests,leave,leave-promotion,workflow}.ts
  lib/modules/{department,position,appointment,permission,tenancy,employee,leave,workflow}.ts
  → 이 파일들이 필요하면 import 해서 재사용만. 새 타입이 필요하면 **당신 영역의 새 모듈 파일**에 정의.
- 당신은 **당신 영역의 새 파일만** 생성/수정한다(아래 영역 지정 참고). 라우트 페이지는 당신 영역 것만.

## 작업 순서
1) 타깃 v1 의 현재 페이지를 먼저 Read — 동작하는 drizzle 읽기 + teamlet 디자인 CSS 가 이미 있다. **퇴행 금지**, 거기에 원본 이벤트/모달/탭을 더한다.
2) 원본 영역 디렉터리를 find/Read 로 전부 파악(page, _components, components/<area>, lib/actions/<area>, packages/modules/src/<area>).
3) 클라이언트 컴포넌트는 **원본 그대로(verbatim)** 복사. import 만 조정:
   - '@teamlet/ui' / '@teamlet/shared' → 그대로(별칭 있음).
   - '@teamlet/modules/<x>'(주로 타입) → lib/modules/<x>.ts 를 새로 만들어 타입 정의(Prisma 타입은 평범한 string/유니온으로). 단 위의 '이미 존재' 모듈은 새로 만들지 말고 import.
   - '@/lib/actions/<x>' → v1 lib/actions/<x>.ts 를 drizzle 로 새로 작성(이미 존재 목록이면 import 재사용).
   - 'next/*','react','lucide-react','cmdk' 등 → 그대로.
4) 서버 액션: 'use server', getDb()+drizzle+@/lib/db/schema, getCurrentUser(). 원본 시그니처/반환형(@teamlet/shared Result/ApiResponse) 정확히 일치.
   비즈니스 로직은 원본 packages/modules/src/<area> 를 읽어 동일 의미로 재현. 권한은 @/lib/permissions 의 hasPermission/isHrAdmin 사용 가능.
   **INSERT/UPDATE 정확성**: D:/teamlet-v1/lib/db/_db-columns.md + _db-enums.md 를 Read 해 컬럼명/REQUIRED(no default)/enum 값 확인.
   REQUIRED(no default) 컬럼(특히 updatedAt)은 반드시 채운다(id: crypto.randomUUID(), updatedAt: new Date()).
   schema.ts 에 컬럼이 없으면 schema.ts 를 고치지 말고 missingSchemaColumns 에 보고하고 선언된 컬럼만으로 컴파일되게 작성(런타임 위험은 blockers).
   참고 모범: D:/teamlet-v1/lib/actions/leave.ts, D:/teamlet-v1/lib/actions/department.ts (검증됨).
5) 페이지 와이어링: 이벤트는 **페이지전환이 아니라 Dialog(창)**. 검색/필터는 실제 동작. 디자인 CSS/인라인스타일/CSS변수(var(--fg) 등) 그대로.
6) 인사관리/관리자 전용 화면은 페이지 상단에서 isHrAdmin 게이트.

## 산출
- 파일을 실제로 작성하고, 끝나면 구조화 리포트(StructuredOutput) 반환: 작성파일, 액션(시그니처+writes), 누락컬럼, 블로커, 요약.
`

const AREAS = [
  {
    key: 'home',
    title: '홈/피드 · 공지 · 인정',
    body: `
원본:
 - app/(app)/home/page.tsx + app/(app)/home/_components/* (home-tabs, home-rail, feed-tab, news-tab, recognition-tab, tasks-tab, mini-calendar, announcement-paged-list, delete-recognition-button, mark-recognitions-read)
 - components/home/send-to-colleague-button.tsx
 - components/announcement/* (announcement-actions, announcement-comments, create-announcement-button, mark-announcements-read)
 - components/notification/notification-bell.tsx
 - lib/actions/{announcement,recognition,notification}.ts ; packages/modules/src/{announcement,recognition,notification}
타깃 v1: app/page.tsx(홈) + app/_components(홈 전용만, sidebar.tsx 제외) + app/announcements/** + app/recognitions/** + components/{home,announcement,notification}/* + lib/actions/{announcement,recognition,notification}.ts + lib/modules/{announcement,recognition,notification}.ts
주의: 홈 탭(피드/뉴스/인정/할일) + 미니캘린더 + 공지 작성/수정/삭제/댓글(모달) + 인정 보내기(send-to-colleague 모달) + 인정 삭제.
notification-bell 은 컴포넌트만 만들고 topbar 와이어링은 하지 말 것(layout.tsx 수정금지 — 오케스트레이터가 연결). recognitions(인정)·announcements(공지) insert 시 _db-columns.md 확인.
v1 에 이미 app/page.tsx(홈), app/announcements, app/recognitions 존재 — 보존+강화.
`,
  },
  {
    key: 'documents',
    title: '문서 · 증명서',
    body: `
원본:
 - app/(app)/documents/page.tsx, app/(app)/documents/certificates/{page,[id],settings}/* (+ settings/_components/certificate-template-manager)
 - components/document/* (add-document-button, delete-document-button, issue-certificate-button)
 - lib/actions/document.ts ; packages/modules/src/document
타깃 v1: app/documents/**(page, certificates, certificates/[id], certificates/settings) + components/document/* + lib/actions/document.ts + lib/modules/document.ts
주의: 공용 문서 추가/삭제(모달) + 증명서 발급(issue-certificate 모달, CertificateType enum: EMPLOYMENT/CAREER) + 증명서 템플릿 관리. company_documents·certificate_issues·certificate_templates insert 시 _db-columns.md 확인.
v1 에 이미 app/documents/page.tsx, certificates/[id], certificates/settings 존재 — 보존+강화.
`,
  },
  {
    key: 'settings-core',
    title: '설정 — 회사/보안/프로필/휴일/조직/알림',
    body: `
원본:
 - app/(settings)/settings/{company,security,profile,holidays,notifications,org}/** + org/_components/org-client
 - components/company/{company-info-form,holidays-client}, components/security/security-policy-form,
   components/settings/{profile-form,change-password-form,mfa-setup-section,settings-nav}
 - lib/actions/{company,security,profile,mfa,company-leave-settings? (NO — 정책팀 소유)} ; 회사/보안/프로필/공휴일 액션
타깃 v1: app/settings/{company,security,profile,holidays,notifications,org}/** + components/{company,security,settings}/* + lib/actions/{company,security,profile,mfa,holidays}.ts + lib/modules/security.ts(필요시)
재사용(생성금지): 조직(org)은 부서/직책을 다루므로 lib/actions/{department,position}.ts 와 components/members/{add-department-button,add-position-button,department-actions} 를 **import 재사용**.
주의: 회사정보 수정/로고/회사코드(모달·폼), 공휴일 추가/삭제(모달), 보안정책 폼, 프로필 수정/비밀번호 변경/MFA(모달·폼). companies update, company_holidays insert, company_security_policies upsert 시 _db-columns.md 확인.
v1 에 이미 app/settings/* 다수 존재 — 보존+강화. settings-nav 로 탭 이동.
`,
  },
  {
    key: 'settings-policies',
    title: '설정 — 휴가정책/유형/양식/결재정책 + 권한',
    body: `
원본:
 - app/(settings)/settings/{leave-policies,leave-types,form-templates,approval-policies,permissions,permissions/[roleId]}/** (+ 각 _components: leave-types-client, approval-policies-client)
 - components/leave-policy/* (leave-policies-client, auto-grant-button, company-leave-settings-section)
 - components/form-template/form-templates-client, components/permissions/{role-list-client,role-permission-editor}
 - lib/actions/{leave-policy,leave-type,form-template,approval-policy,company-leave-settings,permission}.ts ; packages/modules/src/permission
타깃 v1: app/settings/{leave-policies,leave-types,form-templates,approval-policies,permissions}/** + components/{leave-policy,form-template,permissions}/* + lib/actions/{leave-policy,leave-type,form-template,approval-policy,company-leave-settings}.ts + lib/modules/{permission(이미존재-READ),security?}.ts
권한 액션: lib/actions/permission.ts 는 **이미 존재**(assignRole/revokeRole). 덮어쓰지 말고 **Edit 로 createRole/updateRole/deleteRole/setRolePermissions/getPermissionCatalog 추가**(append). role-permission-editor 가 호출하는 시그니처에 맞춰라.
주의: 휴가정책 생성/수정(모달, 결재선=RecipientPickerRow 사용 — components/common/recipient-picker), 휴가유형, 양식 빌더(form-templates), 결재정책, 역할/권한 편집(role-permission-editor). roles·role_permissions·form_templates·approval_policies·leave_policies insert/update 시 _db-columns.md 확인.
인사관리/관리자 전용 — isHrAdmin 게이트.
v1 에 이미 app/settings/{leave-policies,leave-types,form-templates,approval-policies,permissions} 존재 — 보존+강화.
`,
  },
  {
    key: 'command-palette',
    title: '커맨드 팔레트 (전역 검색)',
    body: `
원본:
 - components/command-palette/{command-palette,command-palette-trigger}.tsx
 - lib/actions/search.ts ; (cmdk 사용)
타깃 v1: components/command-palette/* + lib/actions/search.ts + lib/modules/search?(필요시)
주의: ⌘K 전역 검색 — 구성원/문서/메뉴 검색. search 액션은 employees/form_documents 등 READ 후 결과 반환(원본 search.ts 의미 재현). cmdk 의존성은 이미 설치됨.
topbar 와이어링(layout.tsx 의 .topbar-search 를 CommandPaletteTrigger 로 교체)은 하지 말 것 — 오케스트레이터가 연결. 컴포넌트는 'use client' 로 독립 동작하게.
`,
  },
]

phase('Port')

const results = await parallel(
  AREAS.map((a) => () =>
    agent(
      `${RULES}\n\n## 당신의 영역: ${a.title}\n${a.body}\n\n지금 바로 파일을 작성하고, 끝나면 구조화 리포트를 반환하세요.`,
      { label: `port:${a.key}`, phase: 'Port', agentType: 'claude', schema: REPORT_SCHEMA },
    ),
  ),
)

return results.filter(Boolean)
