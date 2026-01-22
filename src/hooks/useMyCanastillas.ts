import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Canastilla } from '@/types'

export function useMyCanastillas() {
  const [canastillas, setCanastillas] = useState<Canastilla[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()

  useEffect(() => {
    if (user) {
      fetchMyCanastillas()
    }
  }, [user])

  const fetchMyCanastillas = async () => {
    if (!user) return

    try {
      setLoading(true)
      console.log('Fetching canastillas for user:', user.id)
      
      const { data, error } = await supabase
        .from('canastillas')
        .select('*')
        .eq('current_owner_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching canastillas:', error)
        throw error
      }
      
      console.log('Canastillas fetched:', data?.length || 0)
      setCanastillas(data || [])
    } catch (error) {
      console.error('Error fetching my canastillas:', error)
      setCanastillas([])
    } finally {
      setLoading(false)
    }
  }

  const refreshCanastillas = () => {
    fetchMyCanastillas()
  }

  return { canastillas, loading, refreshCanastillas }
}