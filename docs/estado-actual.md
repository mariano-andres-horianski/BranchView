# Estado Actual del Proyecto — BranchView

Este informe detalla el estado verificado del código, los componentes operativos, las limitaciones detectadas, el entorno de despliegue y las advertencias técnicas para futuros desarrolladores.

Fecha de auditoría: Septiembre 2026.

---

## 1. Funcionalidades Comprobadas e Implementadas (100% Verificadas)

### 1.1 Autenticación y Control de Sesión
- Login mediante credenciales con contraseña hasheada (`bcrypt`) y emisión de token Bearer JWT con 24 horas de vigencia.
- Interceptor Axios con inyección automática de cabecera `Authorization: Bearer <token>`.
- Manejo de respuestas HTTP 401 con limpieza de `localStorage` y redirección a `/login`.
- Acceso directo con botones pre-cargados para 6 usuarios de demostración en `LoginPage.tsx`.
- Endpoint `GET /api/auth/me` para revalidar la sesión y sincronizar los datos del usuario al recargar el navegador.

### 1.2 Panel de Supervisión Multi-Sucursal
- Listado de sucursales con cálculo de margen neto, alertas activas y badges de color.
- Filtros por estado: `operativas` (por defecto), `todas` (incluye dadas de baja lógica) y `con_alerta`.
- Búsqueda en tiempo real por dirección o por nombre de gerente asignado.
- Modal de creación de sucursal con selección de gerentes disponibles y validación de unicidad.
- Diálogo de confirmación para baja lógica de sucursales (`activa = False`).

### 1.3 Tablero Comparativo Multi-Sucursal
- Selección de múltiples sucursales mediante checkboxes y navegación a `/compare?ids=X,Y,Z`.
- Métricas comparativas consolidadas lado a lado: ventas del mes, ventas anuales, ganancias netas, margen neto y nómina.
- Despliegue independiente de la nómina de empleados por sucursal en acordeones colapsables.
- Gráficos comparativos con Recharts para ventas acumuladas y ganancias netas sobre ventanas de 12 o 24 meses.
- Tabla de ranking automático por facturación.
- Consolidación y resolución de alertas de todas las sucursales seleccionadas.

### 1.4 Gestión Operativa de Sucursal (Gerente y Detalle Supervisor)
- Visualización de KPIs financieros mensuales y anuales con formato de moneda en pesos argentinos (`$`).
- Gráficos de evolución financiera mensual (líneas de facturación vs ganancias y barras de márgenes bruto/neto).
- Acordeón colapsable para nómina de empleados:
  - Alta de empleado con formulario validado.
  - Edición de sueldo, rol, asistencias, faltas, edad y antigüedad.
  - Baja lógica del empleado con diálogo de confirmación.
- Tabla de inventario de stock:
  - Visualización del estado dinámico del producto (`normal`, `bajo`, `agotado`).
  - Modal para actualizar la cantidad disponible.
  - Reevaluación inmediata de alertas de stock.
- Actualización financiera mensual:
  - Modal para registrar ventas, costos de mercadería y gastos operativos del período.
  - Reevaluación inmediata de alertas financieras.
- Creación de alertas manuales de infraestructura y emergencias operativas.

### 1.5 Centro Unificado de Alertas (`AlertsPage.tsx`)
- Visualización de todas las alertas activas ordenadas por criticidad (1° Roja, 2° Naranja, 3° Amarilla).
- Filtros por nivel de gravedad mediante tarjetas KPI métricas (`SeverityFilterCard`).
- Filtros por categoría (`CategoryFilterButton`: Todos, Stock, Finanzas, Operativas).
- Filtro por sucursal y buscador por texto en mensaje y detalle.
- Resolución de alertas con botón reactivo (`ResolveAlertButton`) y actualización inmediata en UI.
- Botón de limpieza rápida de filtros (`ClearFiltersButton`).
- Botón de recarga manual en header (`RefreshAlertsButton`).

### 1.6 Tour Interactivo de Inducción para Supervisores
- Usuario mock dedicado `tour` (`tour123`).
- Bienvenida modal automática en el primer inicio de sesión del usuario `tour`.
- Recorrido guiado de 6 pasos con máscara SVG de recorte 100% transparente (`<mask id="tour-spotlight-mask">`) que resalta los elementos nativos sin oscurecerlos.
- Marco exterior pulsante en tonos violeta y etiqueta superior indicadora de paso.
- Navegación accesible por teclado: flecha derecha (siguiente), flecha izquierda (anterior), `Escape` (saltear).
- Botón con destellos en la cabecera superior para reiniciar el tour en cualquier momento.

### 1.7 Base de Datos y Semilla Inicial
- Script `seed.py` completo con:
  - 6 usuarios con contraseñas seguras (`tour`, `supervisor`, `gerente_centro`, `gerente_norte`, `gerente_sur`, `gerente_oeste`, `gerente_disponible`).
  - 5 sucursales (4 operativas con situaciones de negocio contrastantes y 1 cerrada histórica en Mendoza).
  - 24 meses de historial financiero granular (Octubre 2024 a Septiembre 2026) con tendencias de crecimiento, estacionalidad y crisis para alimentar gráficos.
  - 14 productos de stock con diferentes niveles de criticidad.
  - 16 empleados asignados con variadas antigüedades y roles.
  - Alertas automáticas y manuales pre-cargadas.

---

## 2. Limitaciones Detectadas y Funcionalidades Incompletas

1. **Ausencia de Paginación en Endpoints de Listado**:
   - `GET /api/branches`, `GET /api/alerts`, `GET /api/branches/{id}/stock` y `GET /api/branches/{id}/employees` retornan colecciones completas sin parámetros `limit` ni `offset`. Adecuado para el alcance actual del proyecto (red de hasta decenas de sucursales), pero representará un cuello de botella si la base crece a miles de registros.
2. **Ausencia de Refresh Tokens**:
   - El sistema emite un único Access Token JWT con 24 horas de expiración. No existe un flujo de renovación con Refresh Token; al vencer, el usuario debe reingresar credenciales obligatoriamente.
3. **Persistencia de Sesión en `localStorage`**:
   - Los tokens JWT se almacenan en el almacenamiento local del navegador (`localStorage`). Aunque es habitual en aplicaciones SPA sencillas, es susceptible a ataques de cross-site scripting (XSS) en comparación con cookies `HttpOnly; Secure; SameSite`.
4. **Manejo de Zona Horaria y Datetime**:
   - Varios modelos y servicios utilizan `datetime.utcnow()`, método marcado como deprecado a partir de Python 3.12 (se recomienda `datetime.now(datetime.timezone.utc)`).
5. **Doble Mecanismo de Inicialización de Tablas**:
   - En `backend/app/main.py` se ejecuta `Base.metadata.create_all(bind=engine)` envuelto en un bloque `try/except` de respaldo, mientras que el script `entrypoint.sh` ejecuta `alembic upgrade head`. Es redundante mantener ambas estrategias simultáneamente.

---

## 3. Aspectos No Verificados (Requieren Confirmación Externa)

1. **Ejecución Productiva en Vercel**:
   - Los archivos de configuración `vercel.json` y la estructura de build Vite están validados localmente (`npm run build` genera el bundle sin fallos), pero la ejecución real sobre los servidores edge de Vercel depende de las variables de entorno configuradas en su panel web.
2. **Ejecución Productiva en Render y Neon**:
   - La cadena de conexión de Neon (`postgresql://...sslmode=require`) y la normalización de URL en `config.py` están implementadas en código, pero el acceso a la base de datos de producción depende de la disponibilidad del plan gratuito y la vigencia de los límites de horas en Render.

---

## 4. Estado de los Tests

### 4.1 Backend
- **Ubicación**: `backend/tests/`
- **Archivos**:
  - `test_business_logic.py` (155 líneas): Valida ciclo de vida completo de alertas de stock (normal -> bajo -> agotado -> normal), ciclo de vida de alertas financieras (saludable -> naranja -> roja -> resuelta), creación y resolución de alertas manuales con permisos de rol, y persistencia de baja lógica.
  - `test_finance_module.py` (141 líneas): Valida cálculos matemáticos de márgenes y derivaciones con salvaguardas de división por cero, inserción y sincronización de registros mensuales, y agregación comparativa de series de tiempo.
- **Entorno de Ejecución**: Utiliza base de datos SQLite en memoria (`sqlite:///:memory:`). Requiere el entorno de dependencias del contenedor backend (`pytest==8.2.2`).

### 4.2 Frontend
- **No existen pruebas automatizadas en el frontend**.
- No están instaladas librerías como Vitest, Jest o React Testing Library en `package.json`. La verificación del frontend es manual y a través de la compilación de TypeScript (`tsc && vite build`).

---

## 5. Advertencias Críticas para Futuros Desarrolladores

> [!IMPORTANT]
> **No Modificar Contratos sin Actualizar Ambas Capas**:
> Si se altera algún esquema Pydantic en `backend/app/schemas/`, deben actualizarse inmediatamente las interfaces correspondientes en `frontend/src/types/index.ts` y las llamadas en `frontend/src/services/api.ts`.

> [!WARNING]
> **Separación de Responsabilidades en Alertas**:
> Nunca se deben crear o resolver alertas modificando directamente la base de datos sin pasar por `AlertService`. El servicio garantiza la no duplicación de registros y la correcta asociación en la tabla intermedia `alerta_sucursal`.

> [!CAUTION]
> **Políticas de Control de Versiones**:
> El repositorio cuenta con restricciones de cambios directos en ramas principales. No se deben realizar `git commit` o `git push` no autorizados por el usuario.\n