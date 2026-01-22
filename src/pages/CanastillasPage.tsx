import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { CanastillaModal } from '@/components/CanastillaModal'
import { CanastillaDetailModal } from '@/components/CanastillaDetailModal'
import { CrearLoteCanastillasModal } from '@/components/CrearLoteCanastillasModal'
import { SalidaCanastillasModal } from '@/components/SalidaCanastillasModal'
import { usePermissions } from '@/hooks/usePermissions'
import { supabase } from '@/lib/supabase'
import type { Canastilla } from '@/types'
import { getStatusLabel, getStatusColor } from '@/utils/helpers'

export function CanastillasPage() {
  const [canastillas, setCanastillas] = useState<Canastilla[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [showLoteModal, setShowLoteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedCanastillaDetail, setSelectedCanastillaDetail] = useState<Canastilla | null>(null)
  const [selectedCanastillaEdit, setSelectedCanastillaEdit] = useState<Canastilla | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showSalidaModal, setShowSalidaModal] = useState(false)
  const permissions = usePermissions()

  useEffect(() => {
    fetchCanastillas()
  }, [])

  const fetchCanastillas = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('canastillas')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCanastillas(data || [])
    } catch (error) {
      console.error('Error fetching canastillas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetail = (canastilla: Canastilla) => {
    setSelectedCanastillaDetail(canastilla)
    setShowDetailModal(true)
  }

  const handleEdit = (canastilla: Canastilla) => {
    setSelectedCanastillaEdit(canastilla)
    setShowEditModal(true)
  }

  const handleSuccess = () => {
    fetchCanastillas()
  }

  // Filtrar canastillas
  const filteredCanastillas = canastillas.filter(canastilla => {
    const matchesSearch = 
      canastilla.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      canastilla.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (canastilla.current_location && canastilla.current_location.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = filterStatus === 'ALL' || canastilla.status === filterStatus

    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <DashboardLayout title="Canastillas" subtitle="Gestión de inventario">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Canastillas" subtitle={`${canastillas.length} canastillas en inventario`}>
      <div className="space-y-6">
        {/* Header con búsqueda y filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Buscar por código, color o ubicación..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Filtro por estado */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="ALL">Todos los estados</option>
                <option value="DISPONIBLE">Disponible</option>
                <option value="EN_ALQUILER">En Alquiler</option>
                <option value="EN_LAVADO">En Lavado</option>
                <option value="EN_USO_INTERNO">En Uso Interno</option>
                <option value="EN_REPARACION">En Reparación</option>
                <option value="FUERA_SERVICIO">Fuera de Servicio</option>
                <option value="EXTRAVIADA">Extraviada</option>
              </select>

              {permissions.hasCanastillaPermission('create') && (
                <Button variant="outline" onClick={() => setShowLoteModal(true)}>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Crear Lote
                </Button>
              )}

              {permissions.hasCanastillaPermission('delete') && (
                <Button
                  variant="outline"
                  onClick={() => setShowSalidaModal(true)}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Salida
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-600 font-medium">Disponibles</p>
            <p className="text-2xl font-bold text-green-700 mt-1">
              {canastillas.filter(c => c.status === 'DISPONIBLE').length}
            </p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-purple-600 font-medium">En Alquiler</p>
            <p className="text-2xl font-bold text-purple-700 mt-1">
              {canastillas.filter(c => c.status === 'EN_ALQUILER').length}
            </p>
          </div>
          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
            <p className="text-sm text-cyan-600 font-medium">En Lavado</p>
            <p className="text-2xl font-bold text-cyan-700 mt-1">
              {canastillas.filter(c => c.status === 'EN_LAVADO').length}
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-medium">Uso Interno</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">
              {canastillas.filter(c => c.status === 'EN_USO_INTERNO').length}
            </p>
          </div>
        </div>

        {/* Tabla de canastillas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tamaño
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Color
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Condición
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ubicación
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCanastillas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="text-lg font-medium">No se encontraron canastillas</p>
                      <p className="text-sm mt-1">Intenta ajustar los filtros o crear un nuevo lote</p>
                    </td>
                  </tr>
                ) : (
                  filteredCanastillas.map((canastilla) => (
                    <tr key={canastilla.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{canastilla.codigo}</p>
                            <p className="text-xs text-gray-500">{canastilla.qr_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                          {canastilla.size}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div 
                            className="w-4 h-4 rounded-full mr-2 border border-gray-300" 
                            style={{ backgroundColor: canastilla.color.toLowerCase() }}
                          ></div>
                          <span className="text-sm text-gray-900">{canastilla.color}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(canastilla.status)}`}>
                          {getStatusLabel(canastilla.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {canastilla.condition || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {canastilla.current_location || 'Sin ubicación'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Ver detalles - Todos pueden ver */}
                          <button 
                            onClick={() => handleViewDetail(canastilla)}
                            className="text-primary-600 hover:text-primary-900 p-1 rounded hover:bg-primary-50"
                            title="Ver detalles y QR"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>

                          {/* Editar - Solo quien tenga permiso */}
                          {permissions.hasCanastillaPermission('edit') && (
                            <button 
                              onClick={() => handleEdit(canastilla)}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                              title="Editar"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginación */}
        {filteredCanastillas.length > 0 && (
          <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-4">
            <p className="text-sm text-gray-700">
              Mostrando <span className="font-medium">{filteredCanastillas.length}</span> de{' '}
              <span className="font-medium">{canastillas.length}</span> canastillas
            </p>
          </div>
        )}
      </div>

      {/* Modal de Crear Lote */}
      <CrearLoteCanastillasModal
        isOpen={showLoteModal}
        onClose={() => setShowLoteModal(false)}
        onSuccess={handleSuccess}
      />

      {/* Modal de Detalles */}
      <CanastillaDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedCanastillaDetail(null)
        }}
        canastilla={selectedCanastillaDetail}
      />

      {/* Modal de Edición */}
      <CanastillaModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedCanastillaEdit(null)
        }}
        canastilla={selectedCanastillaEdit || undefined}
        onSuccess={handleSuccess}
      />

      {/* Modal de Salida de Canastillas */}
      <SalidaCanastillasModal
        isOpen={showSalidaModal}
        onClose={() => setShowSalidaModal(false)}
        onSuccess={fetchCanastillas}
      />
    </DashboardLayout>
  )
}