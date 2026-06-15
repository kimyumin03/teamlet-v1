// 조직도 트리 — 원본 teamlet 그대로 (재귀 트리 + 부서 카드). Tailwind 테마 토큰 사용.
import type { DepartmentNode } from './department-sidebar'

function cn(...xs: (string | false | null | undefined)[]): string {
  return xs.filter(Boolean).join(' ')
}

type OrgEmp = { id: string; name: string; positionName: string | null; departmentId: string | null }
type TreeNode = DepartmentNode & { children: TreeNode[] }

function buildTree(flat: DepartmentNode[]): TreeNode[] {
  const map = new Map<string, TreeNode>(flat.map((d) => [d.id, { ...d, children: [] }]))
  const roots: TreeNode[] = []
  for (const d of flat) {
    const node = map.get(d.id)!
    if (d.parentId && map.has(d.parentId)) map.get(d.parentId)!.children.push(node)
    else roots.push(node)
  }
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder)
    nodes.forEach((n) => sort(n.children))
  }
  sort(roots)
  return roots
}

function DeptCard({ node, emps }: { node: TreeNode; emps: OrgEmp[] }) {
  return (
    <div className="w-44 rounded-xl border border-border bg-background-primary p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-1">
        <span className="truncate text-xs font-semibold text-foreground">{node.name}</span>
        <span className="shrink-0 rounded-full bg-background-secondary px-1.5 py-0.5 text-[10px] text-foreground-muted">
          {emps.length}
        </span>
      </div>
      {emps.length === 0 ? (
        <p className="text-[10px] text-foreground-subtle">구성원 없음</p>
      ) : (
        <div className="flex flex-col gap-1">
          {emps.slice(0, 5).map((e) => (
            <div key={e.id} className="flex items-center gap-1.5">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-background-secondary text-[9px] font-medium text-foreground-muted">
                {e.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-medium leading-tight text-foreground">{e.name}</p>
                {e.positionName && (
                  <p className="truncate text-[9px] leading-tight text-foreground-subtle">{e.positionName}</p>
                )}
              </div>
            </div>
          ))}
          {emps.length > 5 && <p className="text-[10px] text-foreground-subtle">+{emps.length - 5}명 더</p>}
        </div>
      )}
    </div>
  )
}

function OrgNode({ node, empsByDept }: { node: TreeNode; empsByDept: Map<string, OrgEmp[]> }) {
  const emps = empsByDept.get(node.id) ?? []
  const hasChildren = node.children.length > 0
  const isOnly = node.children.length === 1

  return (
    <div className="flex flex-col items-center">
      <DeptCard node={node} emps={emps} />
      {hasChildren && (
        <>
          <div className="h-8 w-px bg-border" />
          <div className="relative flex items-start">
            {node.children.map((child, i) => {
              const isFirst = i === 0
              const isLast = i === node.children.length - 1
              return (
                <div key={child.id} className="relative flex flex-col items-center px-5">
                  {!isOnly && (
                    <div
                      className={cn(
                        'absolute top-0 h-px bg-border',
                        isFirst ? 'left-1/2 right-0' : isLast ? 'left-0 right-1/2' : 'left-0 right-0',
                      )}
                    />
                  )}
                  <div className="h-8 w-px bg-border" />
                  <OrgNode node={child} empsByDept={empsByDept} />
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export function OrgTree({ departments, employees }: { departments: DepartmentNode[]; employees: OrgEmp[] }) {
  const roots = buildTree(departments)
  const empsByDept = new Map<string, OrgEmp[]>()
  for (const e of employees) {
    if (e.departmentId) {
      if (!empsByDept.has(e.departmentId)) empsByDept.set(e.departmentId, [])
      empsByDept.get(e.departmentId)!.push(e)
    }
  }
  const unassigned = employees.filter((e) => !e.departmentId)

  return (
    <div className="overflow-x-auto pb-8">
      <div className="inline-flex min-w-max flex-col items-center">
        {roots.length === 1 && roots[0] ? (
          <OrgNode node={roots[0]} empsByDept={empsByDept} />
        ) : (
          <div className="flex items-start gap-6">
            {roots.map((root) => (
              <OrgNode key={root.id} node={root} empsByDept={empsByDept} />
            ))}
          </div>
        )}

        {unassigned.length > 0 && (
          <div className="mt-10 w-full border-t border-border pt-6">
            <p className="mb-3 text-xs font-medium text-foreground-muted">미배정 구성원</p>
            <div className="flex flex-wrap gap-2">
              {unassigned.map((e) => (
                <div key={e.id} className="flex items-center gap-1.5 rounded-lg border border-border bg-background-primary px-2.5 py-1.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-background-secondary text-[9px] font-medium text-foreground-muted">
                    {e.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">{e.name}</p>
                    {e.positionName && <p className="text-[10px] text-foreground-subtle">{e.positionName}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
