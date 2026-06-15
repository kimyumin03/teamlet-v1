import Link from 'next/link'

// 구성원 디렉토리 좌측 조직 트리 — 원본 teamlet 그대로 (SSR, DFS 정렬 + depth 들여쓰기).
// URL ?department=<id|__none__> 으로 필터링. 디자인 .mbr-tree 클래스 사용.
const UNASSIGNED = '__none__'

export type DepartmentNode = {
  id: string
  parentId: string | null
  name: string
  sortOrder: number
  memberCount: number
}
type SortedNode = DepartmentNode & { depth: number }

function buildSortedTree(nodes: DepartmentNode[]): SortedNode[] {
  const childrenOf = new Map<string | null, DepartmentNode[]>()
  for (const n of nodes) {
    const list = childrenOf.get(n.parentId)
    if (list) list.push(n)
    else childrenOf.set(n.parentId, [n])
  }
  for (const list of childrenOf.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
  }
  const out: SortedNode[] = []
  function dfs(parentId: string | null, depth: number) {
    const children = childrenOf.get(parentId) ?? []
    for (const c of children) {
      out.push({ ...c, depth })
      dfs(c.id, depth + 1)
    }
  }
  dfs(null, 0)
  return out
}

export function DepartmentSidebar({
  departments,
  selected,
  totalCount,
  unassignedCount,
}: {
  departments: DepartmentNode[]
  /** `null` = 전체, `__none__` = 미배정, 그 외 = 부서 id */
  selected: string | null
  totalCount: number
  unassignedCount: number
}) {
  const tree = buildSortedTree(departments)
  const hasChild = new Set(departments.map((d) => d.parentId).filter(Boolean) as string[])

  return (
    <aside className="mbr-tree">
      <div className="mbr-tree-h">조직</div>

      <Link href="/members" className={`mbr-tree-item all${selected === null ? ' active' : ''}`}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect width="16" height="20" x="4" y="2" rx="2" />
          <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
        </svg>
        전체 구성원
        <span className="ct">{totalCount}</span>
      </Link>

      {unassignedCount > 0 && (
        <Link
          href={`/members?department=${UNASSIGNED}`}
          className={`mbr-tree-item${selected === UNASSIGNED ? ' active' : ''}`}
        >
          미배정
          <span className="ct">{unassignedCount}</span>
        </Link>
      )}

      {tree.map((d) => (
        <Link
          key={d.id}
          href={`/members?department=${d.id}`}
          className={`mbr-tree-item${d.depth > 0 ? ' child' : hasChild.has(d.id) ? ' parent' : ''}${selected === d.id ? ' active' : ''}`}
          style={d.depth > 1 ? { paddingLeft: `${28 + (d.depth - 1) * 16}px` } : undefined}
        >
          {d.name}
          <span className="ct">{d.memberCount}</span>
        </Link>
      ))}
    </aside>
  )
}
