import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { RentalSettings } from '@/types'

export function useRentalSettings() {
  const [settings, setSettings] = useState<RentalSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('rental_settings')
        .select('*')
        .single()

      if (error) throw error
      setSettings(data)
    } catch (error) {
      console.error('Error fetching rental settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateDailyRate = async (newRate: number, userId: string) => {
    try {
      const { error } = await supabase
        .from('rental_settings')
        .update({
          daily_rate: newRate,
          updated_at: new Date().toISOString(),
          updated_by: userId
        })
        .eq('id', settings?.id)

      if (error) throw error
      await fetchSettings()
      return true
    } catch (error) {
      console.error('Error updating daily rate:', error)
      return false
    }
  }

  const updateInternalRate = async (newRate: number, userId: string) => {
    try {
      const { error } = await supabase
        .from('rental_settings')
        .update({
          internal_rate: newRate,
          updated_at: new Date().toISOString(),
          updated_by: userId
        })
        .eq('id', settings?.id)

      if (error) throw error
      await fetchSettings()
      return true
    } catch (error) {
      console.error('Error updating internal rate:', error)
      return false
    }
  }

  const updateSettings = async (dailyRate: number, internalRate: number, userId: string) => {
    try {
      const { error } = await supabase
        .from('rental_settings')
        .update({
          daily_rate: dailyRate,
          internal_rate: internalRate,
          updated_at: new Date().toISOString(),
          updated_by: userId
        })
        .eq('id', settings?.id)

      if (error) throw error
      await fetchSettings()
      return { success: true }
    } catch (error: any) {
      console.error('Error updating settings:', error)
      return { success: false, error: error.message }
    }
  }

  return {
    settings,
    loading,
    updateDailyRate,
    updateInternalRate,
    updateSettings,
    refreshSettings: fetchSettings
  }
}