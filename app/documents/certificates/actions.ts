'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { certificateIssues, employees } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'

// 증명서 발급 — certificate_issues insert (직원 스냅샷 포함).
export async function issueCertificate(formData: FormData): Promise<void> {
  const user = await getCurrentUser()
  const employeeId = String(formData.get('employeeId') || '')
  const type = String(formData.get('type') || 'EMPLOYMENT') === 'CAREER' ? 'CAREER' : 'EMPLOYMENT'
  const purpose = String(formData.get('purpose') || '').trim()
  if (!employeeId || !purpose) redirect('/documents/certificates?error=empty')

  let ok = true
  try {
    const db = getDb()
    const emp = await db
      .select({ name: employees.name, employeeNumber: employees.employeeNumber, companyEmail: employees.companyEmail })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1)
    const issueNumber = 'CERT-' + new Date().getFullYear() + '-' + crypto.randomUUID().slice(0, 6).toUpperCase()
    await db.insert(certificateIssues).values({
      id: crypto.randomUUID(),
      employeeId,
      issuerId: user.employeeId,
      type: type as 'EMPLOYMENT' | 'CAREER',
      issueNumber,
      purpose,
      snapshotData: emp[0] ?? {},
    })
  } catch (err) {
    console.error('[db] issueCertificate 실패', err)
    ok = false
  }

  revalidatePath('/documents/certificates')
  redirect(ok ? '/documents/certificates' : '/documents/certificates?error=db')
}
