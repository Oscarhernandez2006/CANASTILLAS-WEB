import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Obtener todas las canastillas
      const { data: canastillas, error } = await supabase
        .from('canastillas')
        .select('status')

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
            const count = rental.rental_items?.length || 0
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