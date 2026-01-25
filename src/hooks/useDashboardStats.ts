import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

interface DashboardStats {
  totalCanastillas: number
  disponibles: number
  enAlquilerInterno: number
  enAlquilerExterno: number
  enLavado: number
  enUsoInterno: number
  enReparacion: number
  ingresosEsteMes: number
  proyeccionIngresos: number
  loading: boolean
}

export function useDashboardStats() {
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'super_admin'

  const [stats, setStats] = useState<DashboardStats>({
    totalCanastillas: 0,
    disponibles: 0,
    enAlquilerInterno: 0,
    enAlquilerExterno: 0,
    enLavado: 0,
    enUsoInterno: 0,
    enReparacion: 0,
    ingresosEsteMes: 0,
    proyeccionIngresos: 0,
    loading: true,
  })

  useEffect(() => {
    if (user) {
      fetchStats()
    }
  }, [user])

  const fetchStats = async () => {
    try {
      if (!user) return

      // Construir query base
      let query = supabase
        .from('canastillas')
        .select('id, status, current_owner_id')

      // Si NO es super_admin, filtrar solo las canastillas del usuario actual
      if (!isSuperAdmin) {
        query = query.eq('current_owner_id', user.id)
      }

      const { data: canastillas, error } = await query

      if (error) throw error

      // Contar por estado
      const disponibles = canastillas?.filter(c => c.status === 'DISPONIBLE').length || 0
      const enLavado = canastillas?.filter(c => c.status === 'EN_LAVADO').length || 0
      const enUsoInterno = canastillas?.filter(c => c.status === 'EN_USO_INTERNO').length || 0
      const enReparacion = canastillas?.filter(c => c.status === 'EN_REPARACION').length || 0

      // Obtener canastillas en alquiler con el tipo de alquiler
      const canastillasEnAlquiler = canastillas?.filter(c => c.status === 'EN_ALQUILER').map(c => c.id) || []

      let enAlquilerInterno = 0
      let enAlquilerExterno = 0

      if (canastillasEnAlquiler.length > 0) {
        // Consultar los alquileres activos para obtener el tipo
        const { data: rentals, error: rentalsError } = await supabase
          .from('rentals')
          .select('rental_type, rental_items(canastilla_id)')
          .eq('status', 'ACTIVO')

        if (!rentalsError && rentals) {
          rentals.forEach(rental => {
            // Filtrar solo los items que pertenecen a las canastillas del usuario
            const itemsDelUsuario = rental.rental_items?.filter(
              (item: any) => canastillasEnAlquiler.includes(item.canastilla_id)
            ) || []
            const count = itemsDelUsuario.length
            if (rental.rental_type === 'INTERNO') {
              enAlquilerInterno += count
            } else {
              enAlquilerExterno += count
            }
          })
        }
      }

      // Calcular ingresos (simulado por ahora - $5,000 por canastilla/día)
      const tarifaDiaria = 5000
      const diasPromedio = 15
      const totalEnAlquiler = enAlquilerInterno + enAlquilerExterno
      const ingresosEsteMes = totalEnAlquiler * tarifaDiaria * 30
      const proyeccionIngresos = totalEnAlquiler * tarifaDiaria * diasPromedio

      const counts = {
        totalCanastillas: canastillas?.length || 0,
        disponibles,
        enAlquilerInterno,
        enAlquilerExterno,
        enLavado,
        enUsoInterno,
        enReparacion,
        ingresosEsteMes,
        proyeccionIngresos,
        loading: false,
      }

      setStats(counts)
    } catch (error) {
      console.error('Error fetching stats:', error)
      setStats(prev => ({ ...prev, loading: false }))
    }
  }

  return stats
}