'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getDb } from '@/lib/db'
import { careerHistories, educationHistories, familyMembers } from '@/lib/db/schema'

// 구성원 상세 — 경력/학력/가족 추가 (자체 DB insert).

export async function addCareer(formData: FormData): Promise<void> {
  const employeeId = String(formData.get('employeeId') || '')
  const companyName = String(formData.get('companyName') || '').trim()
  const position = String(formData.get('position') || '').trim()
  const startDate = String(formData.get('startDate') || '')
  if (!employeeId || !companyName || !position) redirect(`/members/${employeeId}`)
  try {
    await getDb().insert(careerHistories).values({
      id: crypto.randomUUID(),
      employeeId,
      companyName,
      position,
      startDate: startDate ? new Date(startDate) : new Date(),
    })
  } catch (err) {
    console.error('[db] addCareer 실패', err)
  }
  revalidatePath(`/members/${employeeId}`)
  redirect(`/members/${employeeId}?tab=info`)
}

export async function addEducation(formData: FormData): Promise<void> {
  const employeeId = String(formData.get('employeeId') || '')
  const schoolName = String(formData.get('schoolName') || '').trim()
  const major = String(formData.get('major') || '').trim()
  const enrollDate = String(formData.get('enrollDate') || '')
  if (!employeeId || !schoolName) redirect(`/members/${employeeId}`)
  try {
    await getDb().insert(educationHistories).values({
      id: crypto.randomUUID(),
      employeeId,
      schoolName,
      major: major || null,
      enrollDate: enrollDate ? new Date(enrollDate) : new Date(),
    })
  } catch (err) {
    console.error('[db] addEducation 실패', err)
  }
  revalidatePath(`/members/${employeeId}`)
  redirect(`/members/${employeeId}?tab=info`)
}

export async function addFamily(formData: FormData): Promise<void> {
  const employeeId = String(formData.get('employeeId') || '')
  const name = String(formData.get('name') || '').trim()
  const relationship = String(formData.get('relationship') || '').trim()
  if (!employeeId || !name || !relationship) redirect(`/members/${employeeId}`)
  try {
    await getDb().insert(familyMembers).values({
      id: crypto.randomUUID(),
      employeeId,
      name,
      relationship,
    })
  } catch (err) {
    console.error('[db] addFamily 실패', err)
  }
  revalidatePath(`/members/${employeeId}`)
  redirect(`/members/${employeeId}?tab=info`)
}
