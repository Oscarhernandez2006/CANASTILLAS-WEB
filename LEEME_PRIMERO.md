# 🚀 INICIO RÁPIDO - Sistema de Canastillas Actualizado

## ✅ Cambios Realizados

Tu sistema ahora puede:

1. **Crear canastillas por lotes** (1 hasta 10,000 a la vez)
2. **Agregar nuevos colores, tamaños, ubicaciones** desde la interfaz (solo super_admin)
3. **Gestionar canastillas alquiladas a proveedores** con fechas de contrato

---

## 📋 PASO 1: Actualizar Base de Datos

### Opción A: Copiar y Pegar (RECOMENDADO)

1. Abre el archivo: **`database/INSTRUCCIONES_SQL.md`**
2. Copia TODO el código SQL
3. Ve a [Supabase SQL Editor](https://supabase.com)
4. Pégalo y haz clic en **Run**
5. ✅ Listo!

### Opción B: Ejecutar Archivos Individuales

1. Ejecuta: `database/migrations/001_canastilla_attributes.sql`
2. Ejecuta: `database/migrations/002_add_tipo_propiedad_canastillas.sql`

---

## 🖥️ PASO 2: Ejecutar Aplicación

```bash
npm run dev
```

---

## 🎯 PASO 3: Probar Funcionalidades

### Prueba 1: Crear Lote de Canastillas

1. Ve a **Canastillas**
2. Click en botón **"Crear Lote"**
3. Llena:
   - Cantidad: `10` (para probar)
   - Código inicio: `TEST-001`
   - Color, tamaño, etc.
4. Click **"Crear 10 Canastilla(s)"**
5. ✅ Deberías ver TEST-001 hasta TEST-010

### Prueba 2: Agregar Nuevo Color (Solo Super Admin)

1. Ve a **Canastillas** → **"Nueva Canastilla"**
2. En el select de **Color**
3. Si eres `super_admin`, verás: **"➕ Agregar nuevo color..."**
4. Selecciónalo, escribe: `Morado`
5. Click **"Agregar"**
6. ✅ Ahora "Morado" está en la lista

### Prueba 3: Canastilla Alquilada a Proveedor

1. Crear nueva canastilla
2. **Tipo de Propiedad**: Selecciona `ALQUILADA`
3. Aparecerá sección **"Información del Proveedor"**
4. Llena nombre, contacto, fechas
5. Guarda
6. ✅ Canastilla marcada como alquilada a proveedor

---

## 🔑 Roles y Permisos

### Solo Super Admin puede:
- Agregar nuevos colores
- Agregar nuevos tamaños
- Agregar nuevas ubicaciones
- Agregar nuevas áreas
- Agregar nuevas condiciones

### Todos los usuarios con permiso pueden:
- Crear canastillas por lotes
- Crear canastillas individuales
- Editar canastillas existentes
- Ver todas las opciones disponibles

---

## 📖 Documentación Completa

- **`database/INSTRUCCIONES_SQL.md`** - Código SQL completo
- **`CAMBIOS_REALIZADOS.md`** - Documentación detallada
- **`database/README.md`** - Instrucciones de migración

---

## ❓ Solución de Problemas

### No veo el botón "Crear Lote"
→ Tu usuario no tiene permisos de creación de canastillas

### No veo "Agregar nuevo..." en los selects
→ Tu usuario no es `super_admin`

### Error al ejecutar SQL
→ Revisa `database/INSTRUCCIONES_SQL.md` sección "Si hay errores"

### Los selects aparecen vacíos
→ No ejecutaste el SQL. Ve al PASO 1

---

## ✨ ¡Todo Listo!

Si las 3 pruebas funcionaron, tu sistema está actualizado y funcionando correctamente.

**¿Preguntas?** Revisa `CAMBIOS_REALIZADOS.md` para más detalles.
