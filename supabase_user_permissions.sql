-- =====================================================
-- SISTEMA DE PERMISOS POR PROCESOS
-- Ejecutar este script COMPLETO en el SQL Editor de Supabase
-- =====================================================

-- 1. ELIMINAR TABLA ANTERIOR (si existe)
DROP TABLE IF EXISTS user_permissions CASCADE;

-- 2. CREAR TABLA user_permissions
CREATE TABLE user_permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_key VARCHAR(100) NOT NULL,
  is_granted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, permission_key)
);

-- 3. CREAR ÍNDICES
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_key ON user_permissions(permission_key);
CREATE INDEX idx_user_permissions_granted ON user_permissions(is_granted);

-- 4. FUNCIÓN PARA ACTUALIZAR updated_at
CREATE OR REPLACE FUNCTION update_user_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. TRIGGER PARA updated_at
DROP TRIGGER IF EXISTS trigger_user_permissions_updated_at ON user_permissions;
CREATE TRIGGER trigger_user_permissions_updated_at
  BEFORE UPDATE ON user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_permissions_updated_at();

-- 6. HABILITAR RLS
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- 7. POLÍTICAS DE SEGURIDAD

-- Super admin puede SELECT
CREATE POLICY "Super admin can select" ON user_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Super admin puede INSERT
CREATE POLICY "Super admin can insert" ON user_permissions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Super admin puede UPDATE
CREATE POLICY "Super admin can update" ON user_permissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Super admin puede DELETE
CREATE POLICY "Super admin can delete" ON user_permissions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Usuarios pueden leer sus propios permisos
CREATE POLICY "Users can read own permissions" ON user_permissions
  FOR SELECT USING (user_id = auth.uid());

-- =====================================================
-- LISTA DE PERMISOS DISPONIBLES (REFERENCIA)
-- =====================================================
/*
DASHBOARD:
  - dashboard.ver                    = Ver el dashboard

INVENTARIO:
  - inventario.ver                   = Ver inventario propio
  - inventario.ver_todos             = Ver inventario de todos

TRASPASOS:
  - traspasos.ver                    = Ver módulo de traspasos
  - traspasos.solicitar              = Solicitar nuevo traspaso
  - traspasos.aprobar_rechazar       = Aprobar o rechazar solicitudes
  - traspasos.cancelar               = Cancelar solicitudes enviadas
  - traspasos.ver_historial          = Ver historial de traspasos

ALQUILERES:
  - alquileres.ver                   = Ver módulo de alquileres
  - alquileres.crear                 = Crear nuevo alquiler
  - alquileres.procesar_retorno      = Procesar retorno de canastillas
  - alquileres.descargar_remision    = Descargar remisión PDF
  - alquileres.descargar_factura     = Descargar factura PDF
  - alquileres.ver_configuracion     = Ver configuración de tarifas

CANASTILLAS:
  - canastillas.ver                  = Ver módulo de canastillas
  - canastillas.crear_lote           = Crear lote de canastillas
  - canastillas.editar               = Editar canastilla individual
  - canastillas.dar_salida           = Dar de baja canastillas
  - canastillas.ver_qr               = Ver detalles y código QR

CLIENTES:
  - clientes.ver                     = Ver módulo de clientes
  - clientes.crear                   = Crear nuevo cliente
  - clientes.editar                  = Editar cliente
  - clientes.activar_desactivar      = Activar o desactivar clientes

USUARIOS:
  - usuarios.ver                     = Ver módulo de usuarios
  - usuarios.crear                   = Crear nuevo usuario
  - usuarios.cambiar_rol             = Cambiar rol de usuario
  - usuarios.activar_desactivar      = Activar o desactivar usuarios
*/

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
