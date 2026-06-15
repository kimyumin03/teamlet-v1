// 자체 DB(Neon) 연결 — 이 앱이 직접 쓰는 데이터의 단일 진입점이에요.
// ⚠️ axhub 동적테이블과 별개예요: axhub 는 읽기 전용(현재 보류), 쓰기는 전부 여기 Neon 으로.
//
// 서버 전용 ("use client" 컴포넌트에서 import 금지).
// 연결값은 DATABASE_URL (Neon connection string):
//   - 로컬: .env.local 의 DATABASE_URL
//   - 배포: axhub env 에 DATABASE_URL 등록 (AGENTS.md R4) — 안 하면 배포 런타임에 깨져요.
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './db/schema'

const DATABASE_URL = process.env.DATABASE_URL

// DATABASE_URL 이 채워졌는지 — 미설정 환경에서 페이지가 명확히 안내하도록.
export function isDbConfigured(): boolean {
  return Boolean(DATABASE_URL)
}

// 지연 초기화: 모듈 import 시점이 아니라 실제 호출 시점에만 연결을 만들어요.
// (DATABASE_URL 이 없어도 빌드/렌더가 안 깨지게 — 호출하는 곳에서만 명확한 에러)
// neon-http 는 HTTP 기반이라 앱 공용 연결을 재사용해도 안전해요
// (axhub SDK 와 달리 사용자별 자격이 아니라 앱 한 개의 DB 연결이에요).
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getDb() {
  if (!DATABASE_URL) {
    throw new Error(
      'DATABASE_URL 이 없어요. 로컬은 .env.local, 배포는 axhub env 에 ' +
        'DATABASE_URL(Neon 연결 문자열)을 등록해야 해요.',
    )
  }
  if (!_db) _db = drizzle(neon(DATABASE_URL), { schema })
  return _db
}
