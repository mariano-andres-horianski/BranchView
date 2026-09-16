# Reglas de Negocio — BranchView

Este documento consolida las reglas de negocio, políticas de autorización, fórmulas de cálculo y modelos de alertas efectivamente implementados en el código de **BranchView**.

---

## 1. Definición de Roles del Sistema

El sistema opera bajo dos roles de usuario excluyentes definidos en la columna `rol` de la tabla `usuario`:

| Rol | Alcance de Visibilidad | Responsabilidad Operativa | Restricciones Clave |
| :--- | :--- | :--- | :--- |
| **`supervisor`** | **Global (Multi-sucursal)**: Puede auditar todas las sucursales, operativas o inactivas. | Administrativa y estratégica: crea sucursales, da de baja sucursales y resuelve alertas en toda la red. | **No puede realizar cambios operativos directos**: No puede modificar el stock, editar empleados ni cargar finanzas mensuales en ninguna sucursal. |
| **`gerente`** | **Local (Sucursal única)**: Únicamente puede consultar la sucursal activa asignada a su usuario (`Sucursal.id_gerente == Usuario.id`). | Operativa de campo: actualiza stock, gestiona la nómina de empleados, reporta estados financieros y genera alertas manuales. | **Aislado de sucursales ajenas**: No puede consultar métricas ni inventario de otras sucursales, no tiene acceso al comparador ni al listado general de sucursales, y no puede resolver alertas de otras sucursales. |

---

## 2. Matriz de Permisos por Endpoint

La siguiente tabla refleja exactamente lo impuesto por las dependencias de FastAPI (`app/api/deps.py`) y validado en los routers:

| Endpoint | Método HTTP | Supervisor | Gerente Asignado | Gerente Ajeno / Sin Asignar |
| :--- | :---: | :---: | :---: | :---: |
| `/api/auth/login` | `POST` | Permitido | Permitido | Permitido |
| `/api/auth/me` | `GET` | Permitido | Permitido | Permitido |
| `/api/branches` | `GET` | **Permitido** | Denegado (403) | Denegado (403) |
| `/api/branches` | `POST` | **Permitido** | Denegado (403) | Denegado (403) |
| `/api/branches/{id}` | `GET` | **Permitido** | **Permitido** | Denegado (403) |
| `/api/branches/{id}` | `DELETE` | **Permitido** | Denegado (403) | Denegado (403) |
| `/api/branches/compare` | `GET` | **Permitido** | Denegado (403) | Denegado (403) |
| `/api/branches/compare/analytics` | `GET` | **Permitido** | Denegado (403) | Denegado (403) |
| `/api/branches/{id}/stock` | `GET` | **Permitido** | **Permitido** | Denegado (403) |
| `/api/branches/{id}/stock` | `POST` | Denegado (403) | **Permitido** | Denegado (403) |
| `/api/branches/{id}/stock/{stock_id}` | `PUT` | Denegado (403) | **Permitido** | Denegado (403) |
| `/api/branches/{id}/finances` | `GET` | **Permitido** | **Permitido** | Denegado (403) |
| `/api/branches/{id}/finances/history` | `GET` | **Permitido** | **Permitido** | Denegado (403) |
| `/api/branches/{id}/finances/current` | `PUT` | Denegado (403) | **Permitido** | Denegado (403) |
| `/api/branches/{id}/finances` | `PUT` | Denegado (403) | **Permitido** | Denegado (403) |
| `/api/branches/{id}/employees` | `GET` | **Permitido** | **Permitido** | Denegado (403) |
| `/api/branches/{id}/employees` | `POST` | Denegado (403) | **Permitido** | Denegado (403) |
| `/api/employees/{id}` | `GET` | **Permitido** | **Permitido** | Denegado (403) |
| `/api/employees/{id}` | `PUT` | Denegado (403) | **Permitido** | Denegado (403) |
| `/api/employees/{id}` | `DELETE` | Denegado (403) | **Permitido** | Denegado (403) |
| `/api/alerts` | `GET` | **Todas las sucursales** | **Solo su sucursal** | Lista vacía |
| `/api/alerts/{id}` | `GET` | **Permitido** | **Solo si pertenece** | Denegado (403) |
| `/api/alerts` | `POST` | Denegado (403) | **Permitido** | Denegado (400/403) |
| `/api/alerts/{id}/resolve` | `PATCH` | **Cualquier alerta** | **Solo si pertenece** | Denegado (403) |
| `/api/users/managers` | `GET` | **Permitido** | Denegado (403) | Denegado (403) |

---

## 3. Gestión de Sucursales

### 3.1 Alta de Nueva Sucursal (`POST /api/branches`)
- **Autorización**: Solo `supervisor`.
- **Campos Requeridos**: `direccion` (cadena no vacía).
- **Asignación de Gerente**:
  - Opcional (`id_gerente` puede ser `null`).
  - Si se proporciona un `id_gerente`:
    1. El usuario debe existir en la tabla `usuario`.
    2. El usuario debe tener rol `gerente` (no se puede asignar un supervisor como gerente de sucursal).
    3. El gerente **no debe estar asignado a otra sucursal activa**. Esta regla se valida en código y se asegura a nivel de base de datos con el índice parcial `uq_sucursal_active_gerente`.
- **Efectos Secundarios Automáticos al Crear**:
  1. Se establece `activa = True`.
  2. Se inicializa automáticamente el registro del mes en curso en la tabla `finanzas_mensuales` con costos operativos estimados (40% de costo de ventas).
  3. Se dispara inmediatamente `AlertService.evaluate_financial_alerts()` para generar una alerta financiera si los valores iniciales son críticos o de baja rentabilidad.

### 3.2 Baja Lógica de Sucursales (`DELETE /api/branches/{id}`)
- **Autorización**: Solo `supervisor`.
- **Política**: **No se aplica borrado físico** (`DROP` o `DELETE CASCADE`). Se actualiza `activa = False`.
- **Comportamiento en el Sistema**:
  - Las sucursales inactivas dejan de aparecer en el filtro por defecto del supervisor (`operativas`) y no pueden ser seleccionadas en el comparador.
  - El supervisor puede auditarlas explícitamente seleccionando el filtro `todas`.
  - El gerente que estaba asignado a la sucursal inactiva queda liberado a nivel del índice condicional `uq_sucursal_active_gerente` y puede ser asignado a una nueva sucursal.

---

## 4. Gestión de Empleados

### 4.1 Campos y Estructura
- Datos almacenados: `nombre`, `dni`, `rol`, `sueldo`, `asistencias`, `faltas`, `antiguedad`, `edad`, `activo`, `id_sucursal`.

### 4.2 Restricciones Operativas
- Solo el gerente asignado a la sucursal del empleado puede dar de alta (`POST`), editar (`PUT`) o dar de baja (`DELETE`).
- **Política de Baja Lógica**: Al eliminar un empleado se actualiza `activo = False`. El registro se conserva en la base de datos para auditorías laborales e histórico de la sucursal, pero se excluye de las respuestas de nómina activa (`GET /api/branches/{id}/employees`).

---

## 5. Gestión de Stock

### 5.1 Regla de Cálculo de Estado Dinámico
Cada producto en la tabla `stock` cuenta con una propiedad calculada `@property def estado` que compara `cantidad` contra `stock_seguridad`:

$$	ext{estado} = \begin{cases} \text{'normal'} & \text{si } \text{cantidad} \ge \text{stock\_seguridad} \\ \text{'bajo'} & \text{si } 0 < \text{cantidad} < \text{stock\_seguridad} \\ \text{'agotado'} & \text{si } \text{cantidad} == 0 \end{cases}$$

### 5.2 Modificación de Stock y Auto-Evaluación
- Únicamente el gerente asignado puede ajustar las existencias mediante `PUT /api/branches/{id}/stock/{stock_id}` enviando `{ "cantidad": int }`.
- Cada modificación dispara inmediatamente `AlertService.evaluate_stock_alerts(db, branch_id, stock_item)`.

---

## 6. Gestión Financiera

### 6.1 Fórmulas de Cálculo y Derivaciones (`FinanceService.calculate_derived_fields`)
El backend centraliza todos los cálculos derivados para evitar discrepancias:

- **Ganancias Brutas**:
  $$\text{ganancias\_brutas} = \text{ventas} - \text{costo\_ventas}$$
- **Ganancias Netas**:
  $$\text{ganancias\_netas} = \text{ganancias\_brutas} - \text{gastos\_operativos}$$
- **Margen Bruto (%)**:
  $$\text{margen\_bruto} = \begin{cases} \left(\frac{\text{ganancias\_brutas}}{\text{ventas}}\right) \times 100 & \text{si } \text{ventas} > 0 \\ 0.0 & \text{si } \text{ventas} \le 0 \end{cases}$$
- **Margen Neto (%)**:
  $$\text{margen\_neto} = \begin{cases} \left(\frac{\text{ganancias\_netas}}{\text{ventas}}\right) \times 100 & \text{si } \text{ventas} > 0 \\ 0.0 & \text{si } \text{ventas} \le 0 \end{cases}$$

### 6.2 Sincronización Estricta (Single Source of Truth)
- La tabla `finanzas_mensuales` es la fuente única de verdad para el histórico.
- Cuando un gerente actualiza el período actual (`update_current_period`), se inserta o actualiza el registro de `(id_sucursal, anio, mes)` en `finanzas_mensuales`.
- Inmediatamente se sincronizan los campos de la entidad `sucursal`:
  - `sucursal.ventas_mes = record.ventas`
  - `sucursal.ganancias_netas_mes = record.ganancias_netas`
  - `sucursal.ventas_anio = sum(ventas_de_los_meses_del_anio)`
  - `sucursal.ganancias_netas_anio = sum(ganancias_netas_de_los_meses_del_anio)`
- Finalmente se dispara `AlertService.evaluate_financial_alerts(db, branch)`.

---

## 7. Motor de Alertas

El sistema clasifica las alertas en tres niveles de gravedad y tres categorías de origen:

- **Niveles de Gravedad**: `'roja'`, `'naranja'`, `'amarilla'`.
- **Categorías (Tipos)**: `'stock'`, `'financiera'`, `'manual'`.
- **Estados**: `'activa'`, `'resuelta'`.

### 7.1 Alertas Automáticas de Stock (`AlertService.evaluate_stock_alerts`)
Se ejecutan automáticamente ante cualquier cambio de inventario:

1. **Condición Normal** (`cantidad >= stock_seguridad`):
   - Si existía una alerta de stock activa para este producto en la sucursal, **se marca automáticamente como `'resuelta'`**.
   - No genera ninguna alerta nueva.
2. **Stock Bajo** (`0 < cantidad < stock_seguridad`):
   - Gravedad: **`amarilla`**.
   - Mensaje: `Stock bajo de {nombre_producto}`.
   - Detalle: Informa unidades disponibles y stock de seguridad requerido.
   - **Política Anti-Duplicados**: Si ya existe una alerta activa para este producto, se actualizan sus textos y gravedad en lugar de duplicarla.
3. **Stock Agotado** (`cantidad == 0`):
   - Gravedad: **`roja`**.
   - Mensaje: `Stock agotado de {nombre_producto}`.
   - Detalle: Informa quiebre de stock absoluto (0 unidades).
   - **Política Anti-Duplicados**: Si existía una alerta amarilla previa, se escala a roja manteniendo el mismo ID.

### 7.2 Alertas Automáticas Financieras (`AlertService.evaluate_financial_alerts`)
Se evalúan a partir del cociente mensual: `ganancias_netas_mes / ventas_mes`:

1. **Condición Saludable** (Margen neto $\ge 10\%$ con ganancias $> 0$):
   - Si existía una alerta financiera activa para la sucursal, **se marca automáticamente como `'resuelta'`**.
2. **Rentabilidad Baja** (Margen neto $< 10\%$ con ganancias $> 0$):
   - Gravedad: **`naranja`**.
   - Mensaje: `Rentabilidad mensual baja`.
   - Detalle: Informa porcentaje de margen obtenido vs el 10% de referencia corporativa.
3. **Pérdida Crítica** (`ganancias_netas_mes <= 0` o `ventas_mes == 0` con ganancias $\le 0$):
   - Gravedad: **`roja`**.
   - Mensaje: `Ganancia neta mensual nula o negativa`.
   - Detalle: Informa el importe negativo de pérdidas y volumen de ventas.
4. **Política Anti-Duplicados**: Se reutiliza la alerta financiera activa de la sucursal actualizando su gravedad según evolucione la rentabilidad.

### 7.3 Alertas Manuales (`AlertService.create_manual_alert`)
- Permiten reportar imprevistos no cuantificables por stock o finanzas (e.g. roturas edilicias, averías de maquinaria, emergencias sanitarias).
- Creadas **exclusivamente por gerentes asignados** (`POST /api/alerts`).
- Se asocian automáticamente al `id_usuario` del gerente creador y a su `id_sucursal`.
- **Regla Fundamental**: **Nunca se resuelven de forma automática**. Deben ser resueltas explícitamente mediante intervención humana.

### 7.4 Políticas de Resolución de Alertas (`AlertService.resolve_alert`)
- Endpoint: `PATCH /api/alerts/{id}/resolve`.
- **Supervisor**: Puede resolver **cualquier alerta** del sistema, sea manual o automática, de cualquier sucursal.
- **Gerente**: Únicamente puede resolver alertas que pertenezcan a su propia sucursal asignada (`user_branch.id in alert.sucursales`). Si intenta resolver una alerta de otra sucursal, el backend rechaza la operación con `PermissionError` (HTTP 403).

### 7.5 Ordenamiento de Alertas para Visualización
El listado `GET /api/alerts` ordena las alertas activas con una ponderación de gravedad estricta:
1. Alertas **Rojas** (peso 1).
2. Alertas **Naranjas** (peso 2).
3. Alertas **Amarillas** (peso 3).
4. Dentro del mismo nivel de gravedad, se ordenan por fecha de creación descendente (`fecha_creacion DESC`).\n