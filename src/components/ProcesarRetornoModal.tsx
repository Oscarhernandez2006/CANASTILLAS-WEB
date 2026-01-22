import { useState } from 'react'
import { Button } from './Button'
import { supabase } from '@/lib/supabase'
import type { Rental } from '@/types'
import { formatCurrency, formatDate } from '@/utils/helpers'

interface ProcesarRetornoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  rental: Rental | null
}

export function ProcesarRetornoModal({ isOpen, onClose, onSuccess, rental }: ProcesarRetornoModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!rental) return null

  const calculateDays = () => {
    const start = new Date(rental.start_date)
    const end = new Date()
    const diffTime = Math.abs(end.getTime() - start.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const actualDays = calculateDays()
  const canastillasCount = rental.rental_items?.length || 0

  // Calcular total según tipo de alquiler
  // INTERNO: cantidad × tarifa fija (sin multiplicar por días)
  // EXTERNO: (cantidad × tarifa) × días
  const totalAmount = rental.rental_type === 'INTERNO'
    ? canastillasCount * rental.daily_rate
    : (canastillasCount * rental.daily_rate) * actualDays

  const handleProcessReturn = async () => {
    setLoading(true)
    setError('')

    try {
      // 1. Generar número de factura
      const { data: invoiceData, error: invoiceError } = await supabase
        .rpc('generate_invoice_number')

      if (invoiceError) throw invoiceError
      const invoiceNumber = invoiceData

      // 2. Actualizar el alquiler
      const { error: updateError } = await supabase
        .from('rentals')
        .update({
          status: 'RETORNADO',
          actual_return_date: new Date().toISOString(),
          actual_days: actualDays,
          total_amount: totalAmount,
          invoice_number: invoiceNumber
        })
        .eq('id', rental.id)

      if (updateError) throw updateError

      // 3. Actualizar estado de las canastillas a DISPONIBLE y devolverlas al usuario que creó el alquiler
      const canastillaIds = rental.rental_items?.map(item => item.canastilla.id) || []

      const { error: canastillasError } = await supabase
        .from('canastillas')
        .update({
          status: 'DISPONIBLE',
          current_owner_id: rental.created_by  // Devolver al usuario que creó el alquiler
        })
        .in('id', canastillaIds)

      if (canastillasError) throw canastillasError

      alert(`✅ Retorno procesado exitosamente\n\nFactura: ${invoiceNumber}\nTotal: ${formatCurrency(totalAmount)}`)
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error processing return:', err)
      setError(err.message || 'Error al procesar el retorno')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-primary-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Procesar Retorno
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-white hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-6">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-r-lg">
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Información del cliente */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Cliente</h4>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-base font-semibold text-gray-900">{rental.sale_point?.name}</p>
                <p className="text-sm text-gray-600">{rental.sale_point?.contact_name}</p>
                <p className="text-sm text-gray-500">{rental.sale_point?.contact_phone}</p>
              </div>
            </div>

            {/* Detalles del alquiler */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Fecha de salida</p>
                <p className="text-sm font-semibold text-gray-900">{formatDate(rental.start_date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Fecha de retorno</p>
                <p className="text-sm font-semibold text-gray-900">{formatDate(new Date().toISOString())}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Canastillas</p>
                <p className="text-sm font-semibold text-gray-900">{canastillasCount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Días totales</p>
                <p className="text-sm font-semibold text-gray-900">{actualDays} días</p>
              </div>
            </div>

            {/* Tipo de alquiler */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Tipo de alquiler:</span>
              <span className={`px-2 py-1 text-xs font-medium rounded ${
                rental.rental_type === 'INTERNO'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-pink-100 text-pink-800'
              }`}>
                {rental.rental_type}
              </span>
            </div>

            {/* Cálculo del total */}
            <div className="border-t border-gray-200 pt-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {rental.rental_type === 'INTERNO' ? 'Tarifa fija:' : 'Tarifa diaria:'}
                  </span>
                  <span className="font-medium text-gray-900">{formatCurrency(rental.daily_rate)}</span>
                </div>
                {rental.rental_type === 'INTERNO' ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Canastillas:</span>
                    <span className="font-medium text-gray-900">{canastillasCount}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Canastillas:</span>
                      <span className="font-medium text-gray-900">{canastillasCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Días transcurridos:</span>
                      <span className="font-medium text-gray-900">{actualDays}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-xs text-gray-500 pt-1">
                  <span>Fórmula:</span>
                  <span>
                    {rental.rental_type === 'INTERNO'
                      ? `${canastillasCount} × ${formatCurrency(rental.daily_rate)}`
                      : `(${canastillasCount} × ${formatCurrency(rental.daily_rate)}) × ${actualDays} días`
                    }
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                  <span className="text-gray-900">Total a cobrar:</span>
                  <span className="text-primary-600">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Comparación con estimado */}
            {rental.estimated_return_date && rental.estimated_days && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-xs font-medium text-blue-900 mb-1">Comparación con estimado:</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-blue-700">Días estimados: {rental.estimated_days}</p>
                    <p className="text-blue-700">Total estimado: {formatCurrency(rental.estimated_days * canastillasCount * rental.daily_rate)}</p>
                  </div>
                  <div>
                    <p className="text-blue-900 font-semibold">Días reales: {actualDays}</p>
                    <p className="text-blue-900 font-semibold">Total real: {formatCurrency(totalAmount)}</p>
                  </div>
                </div>
                {actualDays > rental.estimated_days && (
                  <p className="text-xs text-blue-600 mt-2">
                    ⚠️ Excedió {actualDays - rental.estimated_days} día(s) del tiempo estimado
                  </p>
                )}
              </div>
            )}

            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>✓</strong> Las canastillas volverán a estado <strong>DISPONIBLE</strong>
              </p>
              <p className="text-sm text-green-800 mt-1">
                <strong>✓</strong> Las canastillas regresarán al inventario del usuario que creó el alquiler
              </p>
              <p className="text-sm text-green-800 mt-1">
                <strong>✓</strong> Se generará una factura con número único
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleProcessReturn}
              loading={loading}
              disabled={loading}
            >
              {loading ? 'Procesando...' : 'Confirmar Retorno'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}