export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  role: UserRole
  is_active: boolean
  avatar?: string
  department?: string
  area?: string
  created_at: string
  updated_at: string
}

export type UserRole = 
  | 'super_admin'
  | 'admin'
  | 'supervisor'
  | 'operator'
  | 'washing_staff'
  | 'logistics'
  | 'client'

export interface Canastilla {
  id: string
  codigo: string
  qr_code: string
  size: CanastillaSize
  color: string
  shape?: string  // Forma de la canastilla
  status: CanastillaStatus
  current_owner_id?: string
  current_owner?: User
  current_location?: string
  current_area?: string
  condition: string
  tipo_propiedad: TipoPropiedad
  proveedor_nombre?: string
  proveedor_contacto?: string
  fecha_inicio_alquiler_proveedor?: string
  fecha_fin_alquiler_proveedor?: string
  notas_proveedor?: string
  created_at: string
  updated_at: string
}

export type CanastillaSize = 'GRANDE' | 'MEDIANA'

export type TipoPropiedad = 'PROPIA' | 'ALQUILADA'

export type CanastillaStatus =
  | 'DISPONIBLE'
  | 'EN_USO_INTERNO'
  | 'EN_ALQUILER'
  | 'EN_LAVADO'
  | 'EN_REPARACION'
  | 'FUERA_SERVICIO'
  | 'EXTRAVIADA'
  | 'DADA_DE_BAJA'

export interface SalePoint {
  id: string
  name: string
  code: string
  contact_name: string
  contact_phone: string
  contact_email: string | null
  address: string
  city: string
  region: string
  client_type: 'PUNTO_VENTA' | 'CLIENTE_EXTERNO'
  identification: string | null
  is_active: boolean
  created_at: string
}

export interface Rental {
  id: string
  sale_point_id: string
  rental_type: 'INTERNO' | 'EXTERNO'
  status: 'ACTIVO' | 'RETORNADO' | 'VENCIDO' | 'PERDIDO'
  start_date: string
  estimated_return_date: string | null
  actual_return_date: string | null
  estimated_days: number | null
  actual_days: number | null
  daily_rate: number
  total_amount: number | null
  invoice_number: string | null
  remision_number: string | null
  remision_generated_at: string | null
  created_by: string
  created_at: string
  sale_point?: SalePoint
  rental_items?: Array<{
    canastilla: Canastilla
  }>
}

export interface RentalSettings {
  id: string
  daily_rate: number  // Tarifa por día para alquileres EXTERNOS
  internal_rate: number  // Tarifa fija para alquileres INTERNOS
  currency: string
  updated_at: string
  updated_by: string | null
}
export interface ReporteIngresos {
  periodo: string
  total_ingresos: number
  total_alquileres: number
  promedio_por_alquiler: number
  canastillas_alquiladas: number
  dias_promedio: number
}

export interface ReporteCanastillaMasAlquilada {
  canastilla_id: string
  codigo: string
  size: string
  color: string
  total_alquileres: number
  dias_totales: number
  ingresos_generados: number
}

export interface ReporteClienteFrecuente {
  sale_point_id: string
  nombre: string
  total_alquileres: number
  total_canastillas: number
  total_dias: number
  total_ingresos: number
  ultimo_alquiler: string
}

export interface ReporteInventario {
  total_canastillas: number
  disponibles: number
  en_alquiler: number
  danadas: number
  en_mantenimiento: number
  perdidas: number
  tasa_ocupacion: number
}

export interface IngresosDiarios {
  fecha: string
  ingresos: number
  alquileres: number
}

export type AttributeType =
  | 'COLOR'
  | 'SIZE'
  | 'FORMA'
  | 'TIPO_PROPIEDAD'
  | 'UBICACION'
  | 'AREA'
  | 'CONDICION'

export interface CanastillaAttribute {
  id: string
  attribute_type: AttributeType
  value: string
  is_active: boolean
  created_at: string
  created_by?: string
}