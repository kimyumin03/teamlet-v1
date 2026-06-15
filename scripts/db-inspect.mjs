// 자체 DB(Neon) 구조 조회 — public 스키마의 테이블과 컬럼을 나열해요. (읽기 전용)
//   실행: node scripts/db-inspect.mjs
import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

let url = process.env.DATABASE_URL
if (!url) {
  try {
    const line = readFileSync('.env.local', 'utf8')
      .split('\n')
      .find((l) => l.trim().startsWith('DATABASE_URL='))
    if (line) url = line.slice(line.indexOf('=') + 1).trim()
  } catch {}
}
if (!url) {
  console.error('DATABASE_URL 없음')
  process.exit(1)
}

const sql = neon(url)
const tables = await sql.query(
  "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name",
)
console.log('TABLES (' + tables.length + '):', tables.map((t) => t.table_name).join(', ') || '(없음)')

for (const t of tables) {
  const cols = await sql.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position",
    [t.table_name],
  )
  let n = 0
  try {
    const c = await sql.query(`SELECT count(*)::int AS n FROM "${t.table_name}"`)
    n = c[0]?.n ?? 0
  } catch {}
  console.log(`\n# ${t.table_name}  (rows: ${n})`)
  for (const c of cols) console.log(`  - ${c.column_name} : ${c.data_type}`)
}
