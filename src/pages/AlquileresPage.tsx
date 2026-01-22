import { useState } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Button } from '@/components/Button'
import { CrearAlquilerModal } from '@/components/CrearAlquilerModal'
import { ProcesarRetornoModal } from '@/components/ProcesarRetornoModal'
import { DetalleAlquilerModal } from '@/components/DetalleAlquilerModal'
import { useRentals } from '@/hooks/useRentals'
import { useRentalSettings } from '@/hooks/useRentalSettings'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate } from '@/utils/helpers'
import { openInvoicePDF, downloadInvoicePDF } from '@/utils/pdfGenerator'
import { openRemisionPDF } from '@/utils/remisionGenerator'
import type { Rental } from '@/types'

type TabType = 'activos' | 'historial' | 'configuracion'

export function AlquileresPage() {
  const [activeTab, setActiveTab] = useState<TabType>('activos')
  const [showCrearModal, setShowCrearModal] = useState(false)
  const [showRetornoModal, setShowRetornoModal] = useState(false)
  const [showDetalleModal, setShowDetalleModal] = useState(false)
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null)

  const { activeRentals, completedRentals, loading, refreshRentals } = useRentals()
  const { settings } = useRentalSettings()
  const permissions = usePermissions()
  const { user } = useAuthStore()

  // Solo super_admin puede crear alquileres
  const canCreateRental = user?.role === 'super_admin'

  const calculateCurrentDays = (startDate: string) => {
    const start = new Date(startDate)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const calculateCurrentTotal = (startDate: string, canastillasCount: number, dailyRate: number) => {
    const days = calculateCurrentDays(startDate)
    return days * canastillasCount * dailyRate
  }

  return (
    <DashboardLayout 
      title="Alquileres" 
      subtitle="Gestión de alquileres de canastillas"
    >
      <div className="space-y-6">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('activos')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'activos'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Alquileres Activos ({activeRentals.length})
            </button>
            <button
              onClick={() => setActiveTab('historial')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'historial'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Historial
            </button>
            <button
              onClick={() => setActiveTab('configuracion')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'configuracion'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Configuración
            </button>
          </div>
        </div>

        {/* Header con botón crear */}
        {activeTab === 'activos' && canCreateRental && (
          <div className="flex justify-end">
            <Button onClick={() => setShowCrearModal(true)}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Crear Alquiler
            </Button>
          </div>
        )}

        {/* Tab: Alquileres Activos */}
        {activeTab === 'activos' && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : activeRentals.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-lg font-medium text-gray-900">No hay alquileres activos</p>
                <p className="text-sm text-gray-500 mt-1">Los alquileres activos aparecerán aquí</p>
                {canCreateRental && (
                  <Button className="mt-4" onClick={() => setShowCrearModal(true)}>
                    Crear Primer Alquiler
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {activeRentals.map((rental) => {
                  const currentDays = calculateCurrentDays(rental.start_date)
                  const canastillasCount = rental.rental_items?.length || 0
                  const currentTotal = calculateCurrentTotal(rental.start_date, canastillasCount, rental.daily_rate)

                  return (
                    <div key={rental.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {rental.sale_point?.name}
                            </h3>
                            <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              ACTIVO
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                              rental.rental_type === 'INTERNO'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-pink-100 text-pink-800'
                            }`}>
                              {rental.rental_type}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{rental.sale_point?.contact_name}</p>
                          <p className="text-sm text-gray-500">{rental.sale_point?.contact_phone}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary-600">
                            {formatCurrency(currentTotal)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Total actual</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Canastillas</p>
                          <p className="text-sm font-semibold text-gray-900">{canastillasCount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Días transcurridos</p>
                          <p className="text-sm font-semibold text-gray-900">{currentDays} días</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Tarifa diaria</p>
                          <p className="text-sm font-semibold text-gray-900">{formatCurrency(rental.daily_rate)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Fecha de salida</p>
                          <p className="text-sm font-semibold text-gray-900">{formatDate(rental.start_date)}</p>
                        </div>
                      </div>

                      {rental.estimated_return_date && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                          <p className="text-xs font-medium text-blue-900">Retorno estimado:</p>
                          <p className="text-sm text-blue-800">{formatDate(rental.estimated_return_date)}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <button
                          onClick={() => {
                            setSelectedRental(rental)
                            setShowDetalleModal(true)
                          }}
                          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Ver detalles
                        </button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedRental(rental)
                            setShowRetornoModal(true)
                          }}
                        >
                          Procesar Retorno
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Historial */}
        {activeTab === 'historial' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : completedRentals.length === 0 ? (
              <div className="p-12 text-center">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-medium text-gray-900">No hay historial</p>
                <p className="text-sm text-gray-500 mt-1">Los alquileres completados aparecerán aquí</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Factura
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Canastillas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Días
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {completedRentals.map((rental) => (
                      <tr key={rental.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm font-medium text-gray-900">{rental.invoice_number || 'N/A'}</p>
                          <p className="text-xs text-gray-500">{formatDate(rental.actual_return_date || rental.start_date)}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm font-medium text-gray-900">{rental.sale_point?.name}</p>
                          <p className="text-xs text-gray-500">{rental.sale_point?.contact_name}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {rental.rental_items?.length || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {rental.actual_days || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm font-semibold text-gray-900">
                            {formatCurrency(rental.total_amount || 0)}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            rental.status === 'RETORNADO' ? 'bg-green-100 text-green-800' :
                            rental.status === 'VENCIDO' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {rental.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {rental.remision_number && (
                              <>
                                <button
                                  onClick={() => openRemisionPDF(rental, rental.remision_number!)}
                                  className="text-cyan-600 hover:text-cyan-900 text-sm font-medium"
                                  title="Ver Remisión"
                                >
                                  Remisión
                                </button>
                                <span className="text-gray-300">|</span>
                              </>
                            )}
                            <button
                              onClick={() => openInvoicePDF(rental)}
                              className="text-primary-600 hover:text-primary-900 text-sm font-medium"
                              title="Ver Factura"
                            >
                              Factura
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => downloadInvoicePDF(rental)}
                              className="text-primary-600 hover:text-primary-900 text-sm font-medium"
                              title="Descargar Factura"
                            >
                              Descargar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: Configuración */}
        {activeTab === 'configuracion' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuración de Precios</h3>
            
            <div className="max-w-md">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tarifa Diaria por Canastilla
                </label>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500">$</span>
                  <input
                    type="number"
                    value={settings?.daily_rate || 300}
                    readOnly
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                  <span className="text-gray-500">COP</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Precio actual: {formatCurrency(settings?.daily_rate || 300)} por día
                </p>
              </div>

              <p className="text-sm text-gray-600 p-4 bg-blue-50 rounded-lg">
                <strong>Nota:</strong> Para cambiar la tarifa diaria, contacta al administrador del sistema.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Crear Alquiler */}
      <CrearAlquilerModal
        isOpen={showCrearModal}
        onClose={() => setShowCrearModal(false)}
        onSuccess={() => {
          refreshRentals()
          setShowCrearModal(false)
        }}
      />

      {/* Modal de Procesar Retorno */}
      <ProcesarRetornoModal
        isOpen={showRetornoModal}
        onClose={() => {
          setShowRetornoModal(false)
          setSelectedRental(null)
        }}
        onSuccess={() => {
          refreshRentals()
          setShowRetornoModal(false)
          setSelectedRental(null)
        }}
        rental={selectedRental}
      />

      {/* Modal de Detalle de Alquiler */}
      <DetalleAlquilerModal
        isOpen={showDetalleModal}
        onClose={() => {
          setShowDetalleModal(false)
          setSelectedRental(null)
        }}
        rental={selectedRental}
      />
    </DashboardLayout>
  )
}