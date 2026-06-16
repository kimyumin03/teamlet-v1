import Link from 'next/link'
import { notFound } from 'next/navigation'
import { and, asc, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { certificateTemplates } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { hasPermission } from '@/lib/permissions'
import { CertificateTemplateManager } from './_components/certificate-template-manager'
import type { CertificateTemplateItem } from '@/lib/modules/document'

// 증명서 종류 설정 — 관리자 전용(document.certificate.manage). 추가/삭제 모달. 원본 certificates/settings.
export const dynamic = 'force-dynamic'

export default async function CertificateSettingsPage() {
  const user = await getCurrentUser()
  const canManage = await hasPermission(user.employeeId, 'document.certificate.manage')
  if (!canManage) notFound()

  let templates: CertificateTemplateItem[] = []
  try {
    const rows = await getDb()
      .select({ id: certificateTemplates.id, name: certificateTemplates.name, certType: certificateTemplates.certType })
      .from(certificateTemplates)
      .where(and(eq(certificateTemplates.companyId, user.companyId), eq(certificateTemplates.isActive, true)))
      .orderBy(asc(certificateTemplates.createdAt))
    templates = rows.map((t) => ({ id: t.id, name: t.name, certType: (t.certType ?? 'EMPLOYMENT') as CertificateTemplateItem['certType'], fileUrl: '' }))
  } catch (err) {
    console.error('[db] cert templates load 실패', err)
  }

  return (
    <div className="page-body">
      <Link
        href="/documents/certificates"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 10,
          fontSize: '12px', color: 'var(--fg-subtle)', textDecoration: 'none',
        }}
      >
        ← 증명서 발급
      </Link>

      <div className="page-h">
        <div>
          <h1 className="h-title">증명서 종류 설정</h1>
          <div className="h-sub">직원이 발급할 수 있는 증명서 종류를 등록·관리해요</div>
        </div>
      </div>

      <CertificateTemplateManager templates={templates} />
    </div>
  )
}
