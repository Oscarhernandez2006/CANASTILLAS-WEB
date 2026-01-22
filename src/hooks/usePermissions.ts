import { useAuthStore } from '@/store/authStore'

type Permission = 'view' | 'create' | 'edit' | 'delete'

export function usePermissions() {
  const { user } = useAuthStore()

  const canAccessCanastillas = (): boolean => {
    if (!user) return false
    // super_admin, admin acceden a canastillas
    return user.role === 'super_admin' || user.role === 'admin'
  }

  const hasCanastillaPermission = (permission: Permission): boolean => {
    if (!user) return false

    const rolePermissions: Record<string, Permission[]> = {
      super_admin: ['view', 'create', 'edit', 'delete'],
      admin: ['view', 'create', 'edit', 'delete'],
      supervisor: [],
      logistics: [],
      operator: [],
      washing_staff: [],
      cliente: [],
    }

    const permissions = rolePermissions[user.role] || []
    return permissions.includes(permission)
  }

  const canAccessTraspasos = (): boolean => {
    if (!user) return false
    // super_admin, admin, supervisor, logistics, operator, washing_staff
    return user.role !== 'cliente'
  }

  const canAccessAlquileres = (): boolean => {
    if (!user) return false
    // Solo super_admin, admin pueden hacer alquileres
    return user.role === 'super_admin' || user.role === 'admin'
  }

  const canAccessUsuarios = (): boolean => {
    if (!user) return false
    // Solo super_admin puede acceder a usuarios
    return user.role === 'super_admin'
  }

  const canAccessClientes = (): boolean => {
    if (!user) return false
    // Solo super_admin puede acceder a clientes
    return user.role === 'super_admin'
  }

  return {
    canAccessCanastillas,
    hasCanastillaPermission,
    canAccessTraspasos,
    canAccessAlquileres,
    canAccessUsuarios,
    canAccessClientes,
  }
}