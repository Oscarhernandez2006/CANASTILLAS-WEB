import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export function useTraspasos() {
  const { user } = useAuthStore()
  const [traspasos, setTraspasos] = useState([])
  const [loading, setLoading] = useState(false)

  // ✅ NUEVA FUNCIÓN: Obtener canastillas disponibles (sin contar solicitudes pendientes)
  const obtenerCanastillasDisponibles = async (userId: string) => {
    try {
      // Obtener todas las canastillas del usuario
      const { data: canastillas } = await supabase
        .from('canastillas')
        .select('id')
        .eq('current_owner_id', userId)
        .eq('status', 'DISPONIBLE')

      // Obtener solicitudes PENDIENTES del usuario
      const { data: solicitudesPendientes } = await supabase
        .from('traspasos')
        .select('canastilla_id')
        .eq('from_user_id', userId)
        .eq('status', 'PENDIENTE')

      const canastillasEnSolicitud = solicitudesPendientes?.map(s => s.canastilla_id) || []
      const disponiblesReales = canastillas?.filter(c => !canastillasEnSolicitud.includes(c.id)) || []

      return disponiblesReales.length
    } catch (error) {
      console.error('Error obteniendo canastillas disponibles:', error)
      return 0
    }
  }

  // ✅ VALIDAR antes de crear solicitud
  const crearSolicitudTraspaso = async (
    toUserId: string,
    canastillaIds: string[],
    notas?: string
  ) => {
    if (!user?.id) return { success: false, error: 'Usuario no autenticado' }

    try {
      setLoading(true)

      // 1. Obtener canastillas disponibles reales
      const disponibles = await obtenerCanastillasDisponibles(user.id)

      // 2. Validar que NO EXCEDA las disponibles
      if (canastillaIds.length > disponibles) {
        return {
          success: false,
          error: `No puedes traspasar ${canastillaIds.length} canastillas. Solo tienes ${disponibles} disponibles.`
        }
      }

      // 3. Validar que las canastillas existan y sean del usuario
      const { data: canastillasValidas } = await supabase
        .from('canastillas')
        .select('id, status')
        .in('id', canastillaIds)
        .eq('current_owner_id', user.id)
        .eq('status', 'DISPONIBLE')

      if (!canastillasValidas || canastillasValidas.length !== canastillaIds.length) {
        return {
          success: false,
          error: 'Algunas canastillas no existen o no están disponibles'
        }
      }

      // 4. Crear solicitudes (SIN cambiar status aún)
      const traspasos = canastillaIds.map(canastillaId => ({
        from_user_id: user.id,
        to_user_id: toUserId,
        canastilla_id: canastillaId,
        status: 'PENDIENTE',
        notas: notas || null,
        created_at: new Date().toISOString(),
      }))

      const { error: insertError } = await supabase
        .from('traspasos')
        .insert(traspasos)

      if (insertError) throw insertError

      return {
        success: true,
        message: `Solicitud de ${canastillaIds.length} canastilla(s) creada exitosamente`
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Error al crear solicitud'
      }
    } finally {
      setLoading(false)
    }
  }

  // ✅ CONFIRMAR traspaso (aquí SÍ se cambia el status)
  const confirmarTraspaso = async (traspasoIds: string[]) => {
    try {
      setLoading(true)

      const { error } = await supabase
        .from('traspasos')
        .update({ status: 'CONFIRMADO' })
        .in('id', traspasoIds)

      if (error) throw error

      // Actualizar canastillas a EN_TRASPASO
      const { data: traspasos } = await supabase
        .from('traspasos')
        .select('canastilla_id')
        .in('id', traspasoIds)

      const canastillaIds = traspasos?.map(t => t.canastilla_id) || []

      await supabase
        .from('canastillas')
        .update({ status: 'EN_TRASPASO' })
        .in('id', canastillaIds)

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  // ✅ RECHAZAR traspaso (eliminar solicitud)
  const rechazarTraspaso = async (traspasoIds: string[]) => {
    try {
      const { error } = await supabase
        .from('traspasos')
        .delete()
        .in('id', traspasoIds)

      if (error) throw error
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  return {
    traspasos,
    loading,
    crearSolicitudTraspaso,
    confirmarTraspaso,
    rechazarTraspaso,
    obtenerCanastillasDisponibles,
  }
}