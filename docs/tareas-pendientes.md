# Tareas Pendientes — BranchView

Este documento cataloga las tareas pendientes, oportunidades de optimización y riesgos técnicos identificados tras la inspección integral del código de **BranchView**.

Las tareas se encuentran priorizadas según su impacto en **Alta**, **Media** y **Baja**.

---

## 1. Prioridad Alta (Críticas para Seguridad, Confiabilidad y Producción)

### T1. Implementar Suite de Pruebas Automatizadas en el Frontend
- **Categoría**: Falta de tests.
- **Descripción**: El frontend no cuenta con ningún framework de testing automatizado (ni Vitest, ni Jest, ni React Testing Library). Todas las validaciones de interfaz y flujos de usuario se realizan de forma manual.
- **Acción Recomendada**: Instalar `vitest`, `@testing-library/react` y `jsdom`. Crear pruebas unitarias para `AlertButtons.tsx`, los contextos `AuthContext` y `TourContext`, y pruebas de integración para los flujos de login y filtros en `SupervisorDashboardPage`.

### T2. Mitigar el Riesgo XSS en el Almacenamiento de Tokens JWT
- **Categoría**: Seguridad.
- **Descripción**: El token de autenticación se persiste en `localStorage` (`branchview_token`). Si la aplicación presentara alguna vulnerabilidad de inyección de scripts (XSS), un atacante podría extraer el token de sesión.
- **Acción Recomendada**: Evaluar la transición hacia cookies seguras con atributos `HttpOnly`, `Secure` y `SameSite=Lax` emitidas por el backend en `/api/auth/login`, o bien implementar un mecanismo de rotación de Refresh Tokens de vida corta en memoria.

### T3. Implementar Paginación en Endpoints de Listado Masivo
- **Categoría**: Mejoras de arquitectura / Escalabilidad.
- **Descripción**: Endpoints como `GET /api/alerts`, `GET /api/branches`, `GET /api/branches/{id}/stock` y `GET /api/branches/{id}/employees` retornan todos los registros de la base de datos sin paginación (`limit`/`offset`).
- **Acción Recomendada**: Introducir esquemas de paginación estándar con parámetros `page` y `page_size`, devolviendo metadatos de conteo total (`total`, `pages`) para optimizar el consumo de memoria y ancho de banda.

### T4. Eliminar el Uso del Método Deprecado `datetime.utcnow()`
- **Categoría**: Errores o riesgos técnicos.
- **Descripción**: En múltiples módulos del backend (`alert_service.py`, `finance_service.py`, `security.py`, `models/alerta.py`) se utiliza `datetime.utcnow()`. En Python 3.12 este método está deprecado por generar objetos datetime naive (sin zona horaria explícita).
- **Acción Recomendada**: Reemplazar sistemáticamente por `datetime.now(timezone.utc)` para garantizar compatibilidad con futuras versiones de Python.

### T5. Configurar Monitoreo / Keepalive para Prevenir Spindown en Render
- **Categoría**: Configuración de despliegue pendiente / Disponibilidad.
- **Descripción**: El plan gratuito de Render suspende los contenedores web tras 15 minutos de inactividad, provocando demoras de 30 a 60 segundos (*cold start*) en la primera petición del usuario.
- **Acción Recomendada**: Configurar un monitor externo gratuito (ej. UptimeRobot o cron-job.org) que envíe una petición HTTP `GET` cada 10 a 12 minutos al endpoint `/health` o `/` del backend en Render.

---

## 2. Prioridad Media (Mantenibilidad, Rendimiento y Experiencia de Usuario)

### T6. Optimizar el Tamaño del Bundle de Frontend (Code Splitting)
- **Categoría**: Mejoras de arquitectura / Rendimiento.
- **Descripción**: Durante la compilación con Vite se emite una advertencia indicando que el chunk principal (`index-ESQ1C3sK.js`) supera los 760 kB minificado, debido a la inclusión conjunta de Recharts y Lucide Icons.
- **Acción Recomendada**: Configurar `build.rollupOptions.output.manualChunks` en `vite.config.ts` o utilizar carga diferida (`React.lazy` y `Suspense`) para dividir las páginas secundarias (`ComparativeDashboardPage`, `BranchDetailPage`, `AlertsPage`) en chunks separados.

### T7. Unificar la Estrategia de Inicialización de Tablas en el Backend
- **Categoría**: Código duplicado / Mantenibilidad.
- **Descripción**: Actualmente `app/main.py` intenta ejecutar `Base.metadata.create_all(bind=engine)` en tiempo de importación, mientras que `entrypoint.sh` ejecuta `alembic upgrade head`.
- **Acción Recomendada**: Remover la llamada a `create_all` en `main.py` y centralizar la creación y modificación del esquema exclusivamente a través de las migraciones de Alembic.

### T8. Crear Validación de Esquemas con Variables de Entorno en el Frontend
- **Categoría**: Riesgos técnicos / Configuración.
- **Descripción**: Si `VITE_API_URL` se configura incorrectamente (por ejemplo con una barra final o sin protocolo), el frontend falla de forma silenciosa en tiempo de ejecución.
- **Acción Recomendada**: Si bien `api.ts` incluye una función de normalización, se recomienda agregar validación temprana de variables de entorno mediante una librería como Zod o mediante chequeo estricto al inicio de la aplicación.

### T9. Implementar Mecanismo de Notificación / Toast Centralizado
- **Categoría**: Código duplicado / Experiencia de usuario.
- **Descripción**: El estado y manejo de toasts (`ToastMessage`, `setToast`, `showToast`) se repite de manera idéntica en múltiples páginas (`SupervisorDashboardPage`, `BranchDetailPage`, `ComparativeDashboardPage`, `AlertsPage`).
- **Acción Recomendada**: Crear un `ToastContext` o hook personalizado `useToast` para que cualquier componente pueda disparar notificaciones de éxito o error sin declarar estados locales redundantes.

### T10. Agregar Filtro de Rango de Fechas en el Histórico Financiero
- **Categoría**: Mejoras de experiencia de usuario.
- **Descripción**: La consulta de historial financiero actualmente permite elegir ventanas fijas de 12 o 24 meses (`selectedMonths`), pero no permite seleccionar un rango específico de meses o años para auditorías contables puntuales.
- **Acción Recomendada**: Extender el endpoint `GET /api/branches/{id}/finances/history` para admitir parámetros opcionales `from_date` y `to_date`.

---

## 3. Prioridad Baja (Documentación y Mejoras Secundarias)

### T11. Configurar un Archivo de Especificación para Despliegue en Render (`render.yaml`)
- **Categoría**: Configuración de despliegue pendiente.
- **Descripción**: La configuración del servicio web de Render se gestiona actualmente de forma manual a través de su interfaz web.
- **Acción Recomendada**: Crear un archivo de infraestructura como código `render.yaml` que declare el tipo de servicio, el comando de inicio (`alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`), la versión de Python y las variables requeridas.

### T12. Agregar Linter y Formatter Automatizado en Frontend y Backend
- **Categoría**: Mantenibilidad y legibilidad.
- **Descripción**: No hay scripts configurados en `package.json` para ESLint o Prettier, ni en `backend/` para Ruff o Black.
- **Acción Recomendada**: Añadir `eslint` y `prettier` en el frontend, y `ruff` en el backend para estandarizar el estilo de código antes de realizar commits.

### T13. Estandarizar Mensajes de Error en la API REST
- **Categoría**: Mantenibilidad.
- **Descripción**: Algunos endpoints retornan errores con formato `{"detail": "mensaje"}`, mientras que otros lanzan excepciones nativas de Python como `ValueError` o `PermissionError` que deben ser capturadas en bloques `try/except`.
- **Acción Recomendada**: Implementar manejadores globales de excepciones (`@app.exception_handler`) en FastAPI para estandarizar todas las respuestas de error en un formato JSON predecible.\n