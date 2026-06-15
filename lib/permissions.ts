// 권한 게이트 — UserRole → Role → RolePermission → Permission(key) 조인으로 한 직원의
// effective 권한 키 집합을 구해요. 원본 packages/modules/permission/effective.ts 의 핵심을 drizzle 로 이식.
//   - 인사관리(관리자 전용) 게이트는 원본 layout 과 동일하게 `member.directory.manage` 보유 여부.
//   - isSuperAdmin 은 SYSTEM_SUPER_ADMIN 역할 보유 여부(최고관리자).
import { cache } from 'react'
import { and, eq, inArray } from 'drizzle-orm'
import { getDb } from './db'
import { userRoles, roles, rolePermissions, permissions } from './db/schema'

/** 한 직원의 활성 역할에서 enabled 된 권한 키 전체 (요청 단위 캐시) */
export const getEffectivePermissionKeys = cache(
  async (employeeId: string): Promise<Set<string>> => {
    const db = getDb()
    const urs = await db
      .select({ roleId: userRoles.roleId })
      .from(userRoles)
      .where(and(eq(userRoles.employeeId, employeeId), eq(userRoles.isActive, true)))
    if (urs.length === 0) return new Set<string>()

    const roleIds = urs.map((r) => r.roleId)
    const rows = await db
      .select({ key: permissions.key })
      .from(rolePermissions)
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(and(inArray(rolePermissions.roleId, roleIds), eq(rolePermissions.enabled, true)))

    return new Set(rows.map((r) => r.key))
  },
)

/** 특정 권한 키 보유 여부 (원본 hasPermission 대응) */
export const hasPermission = cache(
  async (employeeId: string, key: string): Promise<boolean> => {
    const keys = await getEffectivePermissionKeys(employeeId)
    return keys.has(key)
  },
)

/** 최고관리자(SYSTEM_SUPER_ADMIN 역할 보유) 여부 */
export const isSuperAdmin = cache(async (employeeId: string): Promise<boolean> => {
  const db = getDb()
  const rows = await db
    .select({ id: roles.id })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(
      and(
        eq(userRoles.employeeId, employeeId),
        eq(userRoles.isActive, true),
        eq(roles.type, 'SYSTEM_SUPER_ADMIN'),
      ),
    )
    .limit(1)
  return rows.length > 0
})

/** 인사 관리(관리자 전용) 화면 게이트 — 원본 layout 과 동일: member.directory.manage */
export const isHrAdmin = cache(async (employeeId: string): Promise<boolean> => {
  return hasPermission(employeeId, 'member.directory.manage')
})
