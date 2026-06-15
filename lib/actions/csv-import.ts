'use server'

// CSV 일괄 등록(csv-import) 서버 액션 — 원본 lib/actions/csv-import.ts + modules/employee/bulk 재현.
//   - 권한: member.directory.manage
//   - 헤더: 이름,사원번호,회사이메일,입사일,부서명,직책명,고용형태 (이름만 필수)
//   - 부서명/직책명은 기존 활성 부서·직책과 일치하면 연결, 아니면 미배정
//   - 고용형태: 정규직/파트타임/계약직/인턴/파견 → enum
//   - 결과는 행별 ok/error 로 반환 (BulkCreateResult)

import { and, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { employees, departments, positions } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { hasPermission } from '@/lib/permissions'

export type BulkCreateResult = { row: number; ok: boolean; name: string; error?: string }

export type CsvImportState = {
  error: string | null
  results?: BulkCreateResult[]
  total?: number
  successCount?: number
}

const DIRECTORY_MANAGE = 'member.directory.manage'

const EMP_TYPE_MAP: Record<string, string> = {
  정규직: 'FULL_TIME',
  파트타임: 'PART_TIME',
  계약직: 'CONTRACT',
  인턴: 'INTERN',
  파견: 'DISPATCH',
  FULL_TIME: 'FULL_TIME',
  PART_TIME: 'PART_TIME',
  CONTRACT: 'CONTRACT',
  INTERN: 'INTERN',
  DISPATCH: 'DISPATCH',
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (inQuote) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') { inQuote = false }
      else { cur += ch }
    } else {
      if (ch === '"') { inQuote = true }
      else if (ch === ',') { fields.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
  }
  fields.push(cur.trim())
  return fields
}

export async function csvImportAction(
  _prev: CsvImportState,
  formData: FormData,
): Promise<CsvImportState> {
  const user = await getCurrentUser()
  if (!(await hasPermission(user.employeeId, DIRECTORY_MANAGE))) {
    return { error: 'member.directory.manage 권한이 필요해요' }
  }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { error: 'CSV 파일을 선택해 주세요' }
  if (file.size > 1024 * 1024) return { error: '파일 크기는 1MB 이하여야 해요' }

  const text = await file.text()
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return { error: '데이터가 없어요. 헤더 행 포함 2행 이상이어야 해요' }

  const dataLines = lines.slice(1)
  const db = getDb()

  // 부서/직책 이름 → id 맵
  const [deptRows, posRows] = await Promise.all([
    db.select({ id: departments.id, name: departments.name }).from(departments).where(and(eq(departments.companyId, user.companyId), eq(departments.isActive, true))),
    db.select({ id: positions.id, name: positions.name }).from(positions).where(and(eq(positions.companyId, user.companyId), eq(positions.isActive, true))),
  ])
  const deptMap = new Map(deptRows.map((d) => [d.name, d.id]))
  const posMap = new Map(posRows.map((p) => [p.name, p.id]))

  const results: BulkCreateResult[] = []
  for (let i = 0; i < dataLines.length; i++) {
    const rowNum = i + 2 // 1-based + 헤더
    const [name, employeeNumber, companyEmail, hireDate, departmentName, positionName, employmentType] = parseCsvLine(dataLines[i])
    const trimmedName = (name ?? '').trim()
    if (trimmedName.length < 2) {
      results.push({ row: rowNum, ok: false, name: trimmedName, error: '이름은 2자 이상이어야 해요' })
      continue
    }
    const hire = hireDate?.trim() ? new Date(hireDate.trim()) : null
    const empType = EMP_TYPE_MAP[(employmentType ?? '').trim()] ?? 'FULL_TIME'
    try {
      await db.insert(employees).values({
        id: crypto.randomUUID(),
        companyId: user.companyId,
        name: trimmedName,
        employeeNumber: employeeNumber?.trim() || null,
        companyEmail: companyEmail?.trim() || null,
        hireDate: hire && !Number.isNaN(hire.getTime()) ? hire : null,
        departmentId: departmentName?.trim() ? deptMap.get(departmentName.trim()) ?? null : null,
        positionId: positionName?.trim() ? posMap.get(positionName.trim()) ?? null : null,
        employmentType: empType,
        updatedAt: new Date(),
      })
      results.push({ row: rowNum, ok: true, name: trimmedName })
    } catch (e) {
      console.error('[db] csvImport 행 실패', rowNum, e)
      results.push({ row: rowNum, ok: false, name: trimmedName, error: '저장 실패' })
    }
  }

  const successCount = results.filter((r) => r.ok).length
  return { error: null, results, total: results.length, successCount }
}
