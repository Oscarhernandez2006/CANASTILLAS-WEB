import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Rental } from '@/types'

export function useRentals() {
  const [activeRentals, setActiveRentals] = useState<Rental[]>([])
  const [completedRentals, setCompletedRentals] = useState<Rental[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRentals()
  }, [])

  const fetchRentals = async () => {
    try {
      setLoading(true)

      // Alquileres activos
      const { data: activeData, error: activeError } = await supabase
        .from('rentals')
        .select(`
          *,
          sale_point:sale_points(*),
          rental_items(
            canastilla:canastillas(*)
          )
        `)
        .eq('status', 'ACTIVO')
        .order('start_date', { ascending: false })

      if (activeError) throw activeError

      // Alquileres completados
      const { data: completedData, error: completedError } = await supabase
        .from('rentals')
        .select(`
          *,
          sale_point:sale_points(*),
          rental_items(
            canastilla:canastillas(*)
          )
        `)
        .in('status', ['RETORNADO', 'VENCIDO', 'PERDIDO'])
        .order('actual_return_date', { ascending: false })
        .limit(50)

      if (completedError) throw completedError

      setActiveRentals(activeData || [])
      setCompletedRentals(completedData || [])
    } catch (error) {
      console.error('Error fetching rentals:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshRentals = () => {
    fetchRentals()
  }

  return {
    activeRentals,
    completedRentals,
    loading,
    refreshRentals
  }
}