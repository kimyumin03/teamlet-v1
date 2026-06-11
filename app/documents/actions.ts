'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { AxHubError } from '@ax-hub/sdk'
import { makeAxhub, TENANT } from '@/lib/axhub-server'
import { table } from '@/lib/data'

// documents 는 회사공유 테이블(owner 없음)이라 company_id 를 직접 지정 (members 와 동일 패턴).
type CompanyDocument = {
  id: string
  company_id: string
  title: string
  category: string
  file_url: string
  uploader_name: string
  created_at: string
}

const ALLOWED_CATEGORY = new Set(['GENERAL', 'NOTICE', 'POLICY'])

// 올린 사람 이름 — 로그인 사용자(SSO)로 자동 채움. 못 가져오면 빈 값.
async function currentUserName(): Promise<string> {
  try {
    const sdk = await makeAxhub()
    const me = await sdk.identity.me()
    return me.name ?? me.email ?? ''
  } catch {
    return ''
  }
}

// 문서 추가 — server component <form action> 직접 제출. 저장 후 /documents 로 이동 (R3).
export async function createDocument(formData: FormData): Promise<void> {
  const title = String(formData.get('title') ?? '').trim()
  const categoryRaw = String(formData.get('category') ?? 'GENERAL').trim()
  const category = ALLOWED_CATEGORY.has(categoryRaw) ? categoryRaw : 'GENERAL'
  const fileUrl = String(formData.get('file_url') ?? '').trim()

  if (title) {
    const uploaderName = await currentUserName()
    const docs = await table<CompanyDocument>('documents')
    await docs.insert({
      company_id: TENANT,
      title,
      category,
      file_url: fileUrl,
      uploader_name: uploaderName,
    })
    revalidatePath('/documents')
  }
  redirect('/documents')
}

// 문서 삭제 — 목록의 삭제 버튼(form action)에서 호출.
export async function deleteDocument(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '').trim()
  if (id) {
    try {
      const docs = await table<CompanyDocument>('documents')
      await docs.delete(id)
      revalidatePath('/documents')
    } catch (err) {
      if (err instanceof AxHubError) {
        console.error('[axhub] deleteDocument failed', { code: err.code, requestId: err.requestId })
      } else {
        throw err
      }
    }
  }
  redirect('/documents')
}
