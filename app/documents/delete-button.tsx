'use client'

import { deleteDocument } from './actions'

// 문서 삭제 버튼 — 확인 후 deleteDocument Server Action 제출.
// 서버 액션은 actions.ts(서버 전용)에 있고, 여기선 form action 으로만 호출해요(S5).
export function DeleteDocumentButton({ id, title }: { id: string; title: string }) {
  return (
    <form
      action={deleteDocument}
      style={{ display: 'inline' }}
      onSubmit={(e) => {
        if (!window.confirm(`'${title}' 문서를 삭제할까요? 되돌릴 수 없어요.`)) {
          e.preventDefault()
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn btn-sm btn-danger">
        삭제
      </button>
    </form>
  )
}
