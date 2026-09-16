# Decisiones Técnicas — BranchView

Este documento recopila las decisiones de diseño, arquitectura y tecnología verificadas en el código fuente de **BranchView**.

---

## 1. Frameworks y Librerías Principales

### 1.1 Backend: FastAPI + Uvicorn
- **Decisión**: Se seleccionó FastAPI (v0.111.0) sobre frameworks tradicionales como Django o Flask.
- **Justificación Verificada**:
  - Soporte nativo para programación asíncrona (`asyncio`).
  - Validación de esquemas de datos integrada y serialización automática mediante **Pydantic v2**.
  - Generación automática de documentación interactiva de la API en formato OpenAPI (`/docs` con Swagger UI y `/redoc`).
  - Sistema modular de inyección de dependencias (`fastapi.Depends`), lo que permite desacoplar la sesión de base de datos y la verificación de permisos JWT de los controladores.

### 1.2 Frontend: React 18 + TypeScript + Vite
- **Decisión**: SPA (Single Page Application) montada con Vite en lugar de frameworks con SSR como Next.js.
- **Justificación Verificada**:
  - Para un panel de control empresarial interno orientado a usuarios autenticados (supervisores y gerentes), el SEO público no es un factor relevante; la velocidad de interacción del cliente y la agilidad de desarrollo son prioritarias.
  - Vite ofrece reemplazo de módulos en caliente (HMR) extremadamente rápido y empaquetado optimizado mediante Rollup.
  - TypeScript provee seguridad de tipos de punta a punta entre los modelos de datos y la interfaz visual.

### 1.3 Estilizado: Tailwind CSS
- **Decisión**: Adopción de Tailwind CSS (v3.4.4) mediante clases de utilidad en línea.
- **Justificación Verificada**:
  - Permite un desarrollo visual ágil sin colisiones de nombres CSS ni necesidad de archivos de estilo independientes por componente.
  - Facilita la consistencia en la paleta cromática corporativa (grises `slate`, azules `blue`, alertas `red`/`amber`/`emerald`).

### 1.4 Gráficos: Recharts
- **Decisión**: Integración de Recharts (v3.10.1) para la visualización de datos financieros.
- **Justificación Verificada**:
  - Componentes nativos de React (`ResponsiveContainer`, `LineChart`, `BarChart`, `Tooltip`, `Legend`) que se integran de forma natural con el ciclo de vida de React sin requerir manipulación directa del DOM (como ocurriría con D3 o Chart.js estándar).

---

## 2. Estrategia de Autenticación y Autorización

### 2.1 Tokens JWT Stateless (Bearer)
- **Decisión**: Autenticación sin sesiones en base de datos (stateless) utilizando JSON Web Tokens con el algoritmo `HS256` y expiración a las 24 horas.
- **Justificación Verificada**:
  - Al no almacenar sesiones en memoria ni en base de datos en el servidor, cada instancia del backend puede validar peticiones de manera autónoma, facilitando el escalado horizontal.
  - Se incluyen claims contextuales (`user_id`, `rol`, `sucursal_id`) dentro del payload para que el frontend y el backend puedan resolver accesos sin consultas redundantes.

### 2.2 Seguridad Criptográfica de Contraseñas
- **Decisión**: Hashing unidireccional con `bcrypt` (v4.0.1) y `passlib` (v1.7.4).
- **Justificación Verificada**:
  - Cumplimiento de estándares de seguridad que impiden el almacenamiento de credenciales en texto plano. Cada contraseña genera un salt criptográfico independiente al crearse.

---

## 3. Acceso a Datos y Control de Esquema

### 3.1 SQLAlchemy 2.0 y Session Local
- **Decisión**: Adopción de SQLAlchemy 2.0 con `DeclarativeBase` y pool de conexiones con `pool_pre_ping=True`.
- **Justificación Verificada**:
  - `pool_pre_ping=True` emite un comando de verificación (`SELECT 1` o equivalente) antes de entregar una conexión del pool, previniendo errores de desconexión por inactividad (*idle connection timeouts*), comunes en bases de datos gestionadas en la nube como Neon.

### 3.2 Migraciones Lineales con Alembic
- **Decisión**: Versionado formal de base de datos a través de Alembic (`001_initial_schema`, `002_partial_unique_gerente`, `003_finanzas_mensuales`).
- **Justificación Verificada**:
  - Permite reproducir exactamente el estado de la base de datos en cualquier entorno (desarrollo local Docker, CI/CD o producción en la nube) ejecutando `alembic upgrade head`.

### 3.3 Restricción Parcial en PostgreSQL (`uq_sucursal_active_gerente`)
- **Decisión**: Reemplazar la restricción única global sobre `Sucursal.id_gerente` por un índice único parcial condicional:
  `CREATE UNIQUE INDEX uq_sucursal_active_gerente ON sucursal (id_gerente) WHERE activa = true AND id_gerente IS NOT NULL;`
- **Justificación Verificada**:
  - Permite que una sucursal histórica dada de baja lógica (`activa = False`) conserve la referencia del gerente que la lideró, sin que esa clave foránea bloquee la asignación de ese mismo gerente a una nueva sucursal activa.

---

## 4. Estrategia de Eliminación y Auditoría

### 4.1 Baja Lógica (Soft Deletes)
- **Decisión**: Implementación de banderas booleanas (`activa = False` en `sucursal` y `activo = False` en `empleado`) en lugar de sentencias SQL `DELETE`.
- **Justificación Verificada**:
  - Conserva la integridad referencial histórica: si se borrase físicamente una sucursal, se perderían sus registros de ventas de 24 meses, sus alertas asociadas y la nómina pasada. La baja lógica oculta la sucursal de las vistas operativas sin destruir el historial empresarial.

---

## 5. Diseño del Motor de Alertas

### 5.1 Evaluación Reactiva y Centralizada
- **Decisión**: Encapsular la lógica de detección en `AlertService` e invocarla de manera reactiva en el ciclo de vida de los endpoints de mutación (`stock`, `finances` y `branches`).
- **Justificación Verificada**:
  - No depende de cron jobs ni tareas asíncronas externas (como Celery) para detectar desvíos de stock o margen: la auditoría se ejecuta en la misma transacción donde el gerente o supervisor confirma el cambio, garantizando sincronización en tiempo real.

### 5.2 Política Anti-Duplicados y Escalado de Severidad
- **Decisión**: Cuando un producto o finanza entra en condición de alerta, se busca si ya existe una alerta activa para ese ítem y sucursal.
- **Justificación Verificada**:
  - Si el stock de un producto baja a nivel crítico y luego llega a 0, la alerta amarilla se actualiza a roja en lugar de crear dos alertas simultáneas sobre el mismo artículo. Cuando el stock se normaliza, la alerta activa se auto-resuelve.

---

## 6. Arquitectura de Despliegue e Infraestructura

### 6.1 Docker Multi-Stage para el Frontend
- **Decisión**: Imagen Docker del frontend dividida en dos etapas:
  1. `build` (Node.js 18 Alpine): compila TypeScript y genera estáticos con Vite.
  2. `runtime` (Nginx Alpine): copia únicamente la carpeta `dist/` resultante y descarta todo el entorno de Node.js y `node_modules`.
- **Justificación Verificada**:
  - Reduce radicalmente el tamaño de la imagen final de producción y la superficie de vulnerabilidades de seguridad.

### 6.2 Proxy Inverso en Nginx
- **Decisión**: Nginx configurado para redirigir peticiones que comienzan con `/api/` hacia el contenedor de backend (`http://backend:8000/api/`), y servir `index.html` para cualquier otra ruta.
- **Justificación Verificada**:
  - Elimina problemas de CORS en entorno local y permite que el cliente React se comunique de forma transparente sin conocer el puerto interno del backend.

### 6.3 Despliegue en Plataformas Serverless (Vercel + Render + Neon)
- **Decisión**: Arquitectura desacoplada en tres proveedores independientes:
  - **Vercel**: Alojamiento estático global del frontend React con reglas de reescritura en `vercel.json`.
  - **Render**: Servicio web para el backend FastAPI en Python 3.12.
  - **Neon**: Base de datos PostgreSQL serverless.
- **Justificación Verificada**:
  - Aprovecha los planes gratuitos y capacidades serverless para despliegues universitarios sin requerir administración de servidores dedicados ni costos fijos de infraestructura.\n