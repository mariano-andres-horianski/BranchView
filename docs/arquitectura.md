# Arquitectura del Sistema — BranchView

Este documento describe la arquitectura técnica integral de **BranchView**, una plataforma web empresarial diseñada para la supervisión y gestión operativa de una red de sucursales comerciales.

---

## 1. Estructura General del Proyecto

El repositorio está organizado como un monorepo que separa con claridad las responsabilidades del cliente web, la API de backend, la orquestación de contenedores y la documentación:

```text
branchview/
├── backend/                  # API REST construida con FastAPI y SQLAlchemy
│   ├── alembic/              # Migraciones de esquema versionadas
│   │   ├── versions/         # Scripts de migración individuales
│   │   └── env.py            # Configuración de entorno de Alembic
│   ├── app/                  # Código fuente de la aplicación backend
│   │   ├── api/              # Capa de transporte HTTP (Routers y Dependencias)
│   │   │   ├── deps.py       # Inyección de dependencias (DB, JWT, permisos)
│   │   │   └── routers/      # auth, branches, stock, finances, employees, alerts, users
│   │   ├── core/             # Configuración central y utilidades criptográficas
│   │   │   ├── config.py     # Pydantic BaseSettings y variables de entorno
│   │   │   └── security.py   # Hashing bcrypt y generación/validación JWT
│   │   ├── db/               # Conexión a la base de datos y sesión ORM
│   │   │   ├── base.py       # DeclarativeBase de SQLAlchemy
│   │   │   └── session.py    # Engine y SessionLocal (pool_pre_ping)
│   │   ├── models/           # Modelos de datos relacionales (SQLAlchemy)
│   │   │   ├── usuario.py, sucursal.py, stock.py, empleado.py,
│   │   │   └── alerta.py, alerta_sucursal.py, finanzas_mensuales.py
│   │   ├── schemas/          # Contratos de datos y validación (Pydantic v2)
│   │   │   ├── auth.py, branch.py, stock.py, employee.py,
│   │   │   └── alert.py, finance.py, monthly_finance.py, user.py
│   │   ├── services/         # Lógica de dominio y reglas de negocio
│   │   │   ├── alert_service.py    # Motor de evaluación y resolución de alertas
│   │   │   └── finance_service.py  # Cálculos derivados, histórico y comparativas
│   │   └── main.py           # Instancia principal de FastAPI, CORS y endpoints raíz
│   ├── tests/                # Suite de pruebas unitarias automatizadas (pytest)
│   ├── Dockerfile            # Imagen base Python 3.10-slim
│   ├── entrypoint.sh         # Script de inicialización (espera DB + migra + seed + uvicorn)
│   ├── requirements.txt      # Dependencias fijadas de Python
│   ├── alembic.ini           # Archivo de configuración de Alembic
│   └── seed.py               # Script de población de datos iniciales y demo
├── frontend/                 # Aplicación de página única (SPA) en React + TypeScript
│   ├── src/
│   │   ├── components/       # Componentes visuales reutilizables
│   │   │   ├── alerts/       # Botones y controles de alerta (AlertButtons.tsx)
│   │   │   ├── common/       # ConfirmDialog, KpiCard, Modal, Badges, Toast
│   │   │   ├── layout/       # AppLayout, Header, Sidebar, ProtectedRoute
│   │   │   └── tour/         # OnboardingTour (Spotlight SVG, popover interactivo)
│   │   ├── context/          # Contextos globales de React (AuthContext, TourContext)
│   │   ├── pages/            # Vistas principales de la aplicación
│   │   │   ├── LoginPage.tsx                 # Autenticación y accesos directos demo
│   │   │   ├── SupervisorDashboardPage.tsx   # Panel de sucursales y filtros
│   │   │   ├── BranchDetailPage.tsx         # Detalle operativo, KPIs, charts y nómina
│   │   │   ├── ComparativeDashboardPage.tsx  # Comparador multi-sucursal y rankings
│   │   │   └── AlertsPage.tsx                # Centro unificado de resolución de alertas
│   │   ├── services/         # Cliente HTTP Axios configurado (api.ts)
│   │   ├── types/            # Definiciones de tipos e interfaces TypeScript (index.ts)
│   │   ├── App.tsx           # Enrutamiento de la aplicación y guards de rol
│   │   ├── main.tsx          # Punto de entrada ReactDOM
│   │   └── index.css         # Directivas de Tailwind CSS
│   ├── Dockerfile            # Construcción multi-stage (Node 18 build -> Nginx Alpine)
│   ├── nginx.conf            # Configuración de Nginx (proxy reverso y SPA fallback)
│   ├── package.json          # Dependencias y scripts de npm
│   ├── tailwind.config.js    # Configuración de diseño y temas Tailwind
│   ├── vite.config.ts        # Configuración del bundler Vite y proxy de desarrollo
│   └── vercel.json           # Reglas de reescritura para despliegue en Vercel
├── docs/                     # Documentación técnica del proyecto
├── docker-compose.yml        # Orquestación de contenedores para entorno local
├── vercel.json               # Configuración raíz de Vercel
├── .env.example              # Plantilla de variables de entorno
├── .python-version           # Declaración de versión de Python para Render (3.12.8)
└── README.md                 # Guía general de uso y presentación del proyecto
```

---

## 2. Tecnologías Utilizadas

| Capa / Componente | Tecnología | Versión Verificada | Propósito en el Proyecto |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `18.3.1` | Renderizado declarativo de interfaces de usuario. |
| **Lenguaje Frontend** | TypeScript | `5.2.2` | Tipado estático en componentes, servicios y contratos. |
| **Herramienta de Build** | Vite | `5.2.0` | Empaquetado de alta velocidad y servidor de desarrollo. |
| **Enrutamiento Web** | React Router DOM | `6.23.1` | Navegación SPA del lado del cliente con rutas anidadas y protegidas. |
| **Estilos y Diseño** | Tailwind CSS | `3.4.4` | Framework utilitario para diseño responsivo corporativo. |
| **Visualización / Gráficos** | Recharts | `3.10.1` | Gráficos interactivos de líneas y barras para series financieras. |
| **Iconografía** | Lucide React | `0.395.0` | Conjunto uniforme de íconos vectoriales SVG. |
| **Cliente HTTP** | Axios | `1.7.2` | Peticiones asíncronas con interceptores para JWT y manejo de 401. |
| **Servidor Web Frontend** | Nginx Alpine | Alpine base | Servidor estático para producción local y proxy inverso a la API. |
| **Backend Framework** | FastAPI | `0.111.0` | Framework web asíncrono para construir la API REST. |
| **Servidor ASGI** | Uvicorn | `0.30.1` | Servidor de producción para ejecutar FastAPI. |
| **ORM / Acceso a Datos** | SQLAlchemy | `2.0.31` | Mapeo objeto-relacional y construcción de consultas. |
| **Migraciones de BD** | Alembic | `1.13.2` | Control de versiones del esquema de base de datos relacional. |
| **Validación / Tipado** | Pydantic / Pydantic Settings | `2.7.4` / `2.3.4` | Esquemas de solicitud/respuesta y lectura tipada de `.env`. |
| **Seguridad Criptográfica** | `passlib` + `bcrypt` | `1.7.4` / `4.0.1` | Hashing seguro de contraseñas con salts automáticos. |
| **Tokens de Autenticación** | `python-jose[cryptography]` | `3.3.0` | Emisión y verificación de tokens JWT firmados con HMAC SHA-256. |
| **Driver PostgreSQL** | `psycopg2-binary` | `2.9.9` | Driver de conexión a PostgreSQL. |
| **Base de Datos** | PostgreSQL | `15` | Almacenamiento relacional ACID de la información. |
| **Contenedores** | Docker & Docker Compose | Compose v2 | Empaquetado reproducible y orquestación local de 3 servicios. |

---

## 3. Organización del Frontend

El código fuente del frontend se ubica en `frontend/src/` y sigue un patrón modular por responsabilidades:

### 3.1 Enrutamiento y Protección de Rutas (`src/App.tsx`, `src/components/layout/ProtectedRoute.tsx`)
- Se utiliza `BrowserRouter` con `Routes` de React Router 6.
- El componente `ProtectedRoute` valida:
  1. Si la sesión está autenticada (`isAuthenticated`).
  2. Si el rol del usuario actual coincide con el rol requerido (`allowedRole`).
- Si un usuario no autenticado intenta acceder a una ruta protegida, es redirigido a `/login`.
- Si un usuario con rol `gerente` intenta acceder a rutas de `supervisor` (`/branches` o `/compare`), es redirigido automáticamente a su propio `/dashboard`.
- La ruta raíz (`/`) utiliza el componente `RootRedirect` para enviar al supervisor a `/branches` y al gerente a su `/dashboard`.

### 3.2 Gestión del Estado Global con Context API
1. **`AuthContext` (`src/context/AuthContext.tsx`)**:
   - Mantiene el usuario activo (`User | null`), el token JWT (`string | null`), y los estados `isLoading` e `isAuthenticated`.
   - Lee el estado inicial desde `localStorage` (`branchview_token` y `branchview_user`).
   - Al montar, valida el token llamando a `GET /api/auth/me` para refrescar los datos del usuario en caso de cambios en el servidor.
   - Expone las funciones `login(token, user)` y `logout()`.
2. **`TourContext` (`src/context/TourContext.tsx`)**:
   - Gestiona el estado del tour de inducción guiado (`OnboardingTour`).
   - Almacena el paso actual (`currentStep`), la visibilidad del modal de bienvenida (`isWelcomeOpen`) y la definición de los 6 pasos del recorrido.
   - Detecta si el usuario logueado es el usuario demo `tour` para sugerir automáticamente el tour al ingresar.

### 3.3 Vistas Principales (`src/pages/`)
- **`LoginPage.tsx`**: Formulario de acceso con credenciales, validación visual de errores y 6 botones de acceso rápido pre-poblados para testing.
- **`SupervisorDashboardPage.tsx`**: Vista global exclusiva para supervisores con tarjetas de sucursales, filtros de estado (`operativas`, `todas`, `con_alerta`), buscador por texto, selección múltiple para comparar, modal de alta de sucursal y diálogo de baja lógica.
- **`BranchDetailPage.tsx`**: Vista dual (utilizada por el supervisor al inspeccionar una sucursal específica vía `/branches/:id` o directamente por el gerente en `/dashboard`). Presenta KPIs financieros, gráficos de evolución temporal con Recharts, sección colapsable de empleados con operaciones CRUD, tabla de stock con actualización de cantidades, y panel de alertas activas con creación de alertas manuales.
- **`ComparativeDashboardPage.tsx`**: Vista de análisis comparativo multi-sucursal que recibe IDs por query param (`?ids=1,2,3`), renderiza métricas lado a lado, series temporales superpuestas de facturación y ganancias, rankings y alertas consolidadas.
- **`AlertsPage.tsx`**: Centro unificado de monitoreo de incidentes con filtros por nivel de gravedad (roja, naranja, amarilla) y por categoría (stock, financiera, manual), búsqueda y botón de resolución en tiempo real.

### 3.4 Componentes de UI Reutilizables
- **`AlertButtons.tsx` (`src/components/alerts/`)**: Colección de botones especializados (`SeverityFilterCard`, `CategoryFilterButton`, `ResolveAlertButton`, `ClearFiltersButton`, `RefreshAlertsButton`) con soporte completo de accesibilidad (`aria-pressed`, `aria-label`).
- **`Modal.tsx`**, **`ConfirmDialog.tsx`**, **`Toast.tsx`** (`src/components/common/`): Primitivas de diálogo y retroalimentación interactiva.
- **`OnboardingTour.tsx` (`src/components/tour/`)**: Tour interactivo que dibuja una máscara SVG en pantalla completa recortando exactamente las coordenadas del elemento enfocado, con marco animado y navegación por teclado.

---

## 4. Organización del Backend

El backend está construido con FastAPI y se organiza en capas concéntricas con estricta separación de responsabilidades dentro de `backend/app/`:

```text
       ┌──────────────────────────────┐
       │   Petición HTTP entrante     │
       └──────────────┬───────────────┘
                      ▼
       ┌──────────────────────────────┐
       │    FastAPI Routers (api/)    │
       │    Validación Pydantic       │
       │    Inyección Deps (deps.py)  │
       └──────────────┬───────────────┘
                      ▼
       ┌──────────────────────────────┐
       │   Capa de Servicios (Domain) │
       │   AlertService / FinanceSvc  │
       └──────────────┬───────────────┘
                      ▼
       ┌──────────────────────────────┐
       │   Modelos Relacionales (ORM) │
       │   SQLAlchemy 2.0 (models/)   │
       └──────────────┬───────────────┘
                      ▼
       ┌──────────────────────────────┐
       │   Base de Datos PostgreSQL   │
       └──────────────────────────────┘
```

### 4.1 Enrutadores API (`app/api/routers/`)
Cada módulo agrupa endpoints bajo un prefijo común y delega la validación de entrada/salida a esquemas Pydantic:
- **`auth.py`** (`/api/auth`): `POST /login`, `GET /me`.
- **`branches.py`** (`/api/branches`): `GET /`, `GET /compare`, `GET /compare/analytics`, `GET /{id}`, `POST /`, `DELETE /{id}`.
- **`stock.py`** (`/api`): `GET /branches/{id}/stock`, `POST /branches/{id}/stock`, `PUT /branches/{id}/stock/{stock_id}`.
- **`finances.py`** (`/api`): `GET /branches/{id}/finances`, `GET /branches/{id}/finances/history`, `PUT /branches/{id}/finances/current`, `PUT /branches/{id}/finances`.
- **`employees.py`** (`/api`): `GET /branches/{id}/employees`, `POST /branches/{id}/employees`, `GET /employees/{id}`, `PUT /employees/{id}`, `DELETE /employees/{id}`.
- **`alerts.py`** (`/api/alerts`): `GET /`, `GET /{id}`, `POST /`, `PATCH /{id}/resolve`.
- **`users.py`** (`/api/users`): `GET /managers`.

### 4.2 Esquemas Pydantic (`app/schemas/`)
Garantizan que la información recibida y enviada cumpla estrictamente con los contratos de tipos esperados, impidiendo inyecciones y datos malformados. Implementan `from_attributes = True` (Pydantic v2) para serializar directamente desde objetos SQLAlchemy.

### 4.3 Capa de Servicios de Negocio (`app/services/`)
Aísla la lógica de cálculo y evaluación de reglas de negocio fuera de los controladores HTTP:
- **`AlertService` (`app/services/alert_service.py`)**: Centraliza la evaluación del ciclo de vida de alertas de stock (normal <-> bajo <-> agotado), alertas financieras (saludable <-> rentabilidad baja <-> pérdida), creación de alertas manuales y autorización para resolver alertas.
- **`FinanceService` (`app/services/finance_service.py`)**: Realiza los cálculos financieros derivados (`ganancias_brutas`, `ganancias_netas`, `margen_bruto`, `margen_neto`), sincroniza la tabla histórica `finanzas_mensuales` con los campos agregados en `sucursal`, y genera analíticas para los tableros comparativos y gráficos temporales.

---

## 5. Comunicación Frontend-Backend

La comunicación se realiza a través de HTTP/REST intercambiando payloads en formato JSON:

### 5.1 Configuración de URL Base Dinámica (`src/services/api.ts`)
Para soportar desarrollo local con Vite, contenedores Docker con Nginx y despliegues en la nube (Vercel + Render), la URL base de la API se resuelve dinámicamente:
- Se lee la variable `import.meta.env.VITE_API_URL`.
- Si está vacía o indefinida, utiliza `/api` de forma relativa. Esto delega la resolución al proxy de desarrollo de Vite (`vite.config.ts`) o a la regla de proxy reverso de Nginx (`nginx.conf`).
- Si contiene una URL absoluta (e.g. `https://branchview.onrender.com`), normaliza las barras finales y asegura que apunte al prefijo `/api`.

### 5.2 Interceptores de Axios
1. **Interceptor de Solicitud (Request)**:
   - Inspecciona `localStorage.getItem('branchview_token')`.
   - Si existe un token, inyecta automáticamente el encabezado HTTP: `Authorization: Bearer <token>`.
2. **Interceptor de Respuesta (Response)**:
   - Intercepta respuestas con código de estado HTTP `401 Unauthorized`.
   - Limpia automáticamente el token y datos del usuario de `localStorage`.
   - Redirige al navegador a la ruta `/login` si no se encontraba previamente allí.

---

## 6. Sistema de Autenticación

- **Protocolo**: Bearer Authentication utilizando tokens JWT (JSON Web Tokens).
- **Algoritmo de Firma**: HMAC SHA-256 (`HS256`).
- **Clave Secreta**: Configurada en `SECRET_KEY` (por defecto provista en `.env.example`, requerida de cambio en entornos productivos).
- **Tiempo de Expiración**: 24 horas (`ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24`).
- **Estructura del Payload JWT**:
  ```json
  {
    "sub": "nombre_de_usuario",
    "exp": 1773789000,
    "user_id": 2,
    "rol": "gerente",
    "sucursal_id": 1
  }
  ```
- **Almacenamiento de Contraseñas**: Las contraseñas se almacenan hasheadas mediante `bcrypt` con generación de salt aleatorio (`bcrypt.gensalt()`). Nunca se persisten ni comparan en texto plano.

---

## 7. Manejo de Roles y Permisos

El sistema implementa un modelo de control de acceso basado en roles (RBAC) con dos roles definidos: `supervisor` y `gerente`.

### 7.1 Dependencias de Autorización en FastAPI (`app/api/deps.py`)
La seguridad y autorización se ejecutan de manera estricta en el backend mediante dependencias inyectadas en cada endpoint:

1. **`get_current_user`**:
   - Extrae el token del encabezado `Authorization: Bearer <token>`.
   - Decodifica el token con la clave secreta y algoritmo configurado.
   - Obtiene el usuario desde la base de datos verificando su existencia. Retorna HTTP 401 si el token es inválido o expiró.
2. **`require_supervisor`**:
   - Invoca `get_current_user`.
   - Valida que `current_user.rol == "supervisor"`.
   - Retorna HTTP 403 Forbidden si el usuario no es supervisor.
3. **`require_gerente`**:
   - Invoca `get_current_user`.
   - Valida que `current_user.rol == "gerente"`.
   - Retorna HTTP 403 Forbidden si el usuario no es gerente.
4. **`verify_branch_read_access`**:
   - Permite lectura a supervisores sobre cualquier sucursal.
   - En caso de gerentes, verifica estrictamente que el `id` de la sucursal solicitada coincida con `current_user.sucursal.id`. Si no coincide, rechaza con HTTP 403 Forbidden.
5. **`require_branch_manager_write`**:
   - Aplica el principio de responsabilidad operativa: **únicamente el gerente asignado** a una sucursal puede realizar modificaciones operativas directas (contratar/editar empleados, ajustar stock, modificar finanzas).
   - Rechaza tanto a supervisores como a gerentes de otras sucursales con HTTP 403 Forbidden.

---

## 8. Base de Datos y ORM

- **Motor**: PostgreSQL 15.
- **ORM**: SQLAlchemy 2.0 con `DeclarativeBase` en `app/db/base.py`.
- **Pool de Conexiones**: Configurado con `pool_pre_ping=True` en `app/db/session.py` para verificar la salud de la conexión antes de emitir consultas y recuperarse automáticamente de desconexiones o reinicios del servidor.

### 8.1 Esquema de Tablas y Relaciones
1. **`usuario`**:
   - Clave primaria `id`.
   - Columnas: `username` (único, indexado), `nombre`, `rol` (`supervisor` | `gerente`), `password_hash`.
   - Relación 1:1 opcional con `sucursal` (un gerente asignado a una sucursal).
2. **`sucursal`**:
   - Clave primaria `id`.
   - Columnas: `direccion`, `id_gerente` (FK `usuario.id`, nullable), `ventas_mes`, `ventas_anio`, `ganancias_netas_mes`, `ganancias_netas_anio`, `activa` (booleano para borrado lógico).
   - Índice único parcial: `uq_sucursal_active_gerente` sobre `id_gerente` donde `activa = true AND id_gerente IS NOT NULL`. Permite conservar el historial de gerentes en sucursales inactivas sin bloquear su reasignación a sucursales operativas.
   - Relación 1:N con `empleado`, `stock`, `finanzas_mensuales`.
   - Relación N:M con `alerta` a través de `alerta_sucursal`.
3. **`stock`**:
   - Clave primaria `id`.
   - Columnas: `nombre_producto`, `cantidad`, `stock_seguridad`, `id_sucursal` (FK con cascada).
   - Propiedad calculada: `estado` (`normal`, `bajo`, `agotado`).
4. **`empleado`**:
   - Clave primaria `id`.
   - Columnas: `nombre`, `dni`, `rol`, `sueldo`, `asistencias`, `faltas`, `antiguedad`, `edad`, `activo` (booleano para baja lógica), `id_sucursal` (FK con cascada).
5. **`alerta`**:
   - Clave primaria `id`.
   - Columnas: `gravedad` (`roja`, `naranja`, `amarilla`), `mensaje`, `tipo` (`stock`, `financiera`, `manual`), `detalle`, `id_usuario` (FK nullable), `fecha_creacion`, `estado` (`activa`, `resuelta`).
6. **`alerta_sucursal`**:
   - Tabla asociativa pura para relación Many-to-Many entre `alerta` y `sucursal`.
   - Clave primaria compuesta: `(id_alerta, id_sucursal)`.
7. **`finanzas_mensuales`**:
   - Clave primaria `id`.
   - Columnas: `id_sucursal` (FK), `anio`, `mes` (1 a 12), `ventas`, `costo_ventas`, `gastos_operativos`, `ganancias_brutas`, `ganancias_netas`, `margen_bruto`, `margen_neto`.
   - Restricción de unicidad compuesta: `uq_finanzas_sucursal_anio_mes` sobre `(id_sucursal, anio, mes)`.

---

## 9. Migraciones de Base de Datos

El versionado de la base de datos se administra con **Alembic** (`backend/alembic/versions/`):

1. **`001_initial_schema.py`**:
   - Crea las tablas iniciales `usuario`, `sucursal`, `stock`, `empleado`, `alerta` y `alerta_sucursal` con sus claves foráneas, índices y valores por defecto.
2. **`002_partial_unique_gerente.py`**:
   - Elimina la restricción `UNIQUE(id_gerente)` global de la tabla `sucursal`.
   - Crea el índice único condicional `uq_sucursal_active_gerente` en PostgreSQL (`WHERE activa = true AND id_gerente IS NOT NULL`) para permitir historial en sucursales dadas de baja.
3. **`003_finanzas_mensuales.py`**:
   - Crea la tabla `finanzas_mensuales` para registro histórico mensual granular, con columnas de costos, gastos operativos y márgenes derivados, e índices asociados.

En el ciclo de arranque de Docker, `entrypoint.sh` ejecuta `alembic upgrade head` automáticamente antes de iniciar el servidor web o ejecutar el seed.

---

## 10. Configuración de Despliegue

El sistema cuenta con configuraciones para despliegue local aislado y despliegue en la nube:

### 10.1 Despliegue Local con Docker Compose (`docker-compose.yml`)
- Orquesta 3 servicios interconectados a través de la red virtual de tipo bridge `branchview-network`:
  1. **`postgres`** (imagen `postgres:15-alpine`): Expone puerto 5432, monta volumen persistente `pgdata` y cuenta con healthcheck mediante `pg_isready`.
  2. **`backend`** (`backend/Dockerfile`): Imagen Python 3.10-slim. Espera a que PostgreSQL esté saludable (`condition: service_healthy`), ejecuta `entrypoint.sh` y expone el puerto 8000.
  3. **`frontend`** (`frontend/Dockerfile`): Construcción multi-stage. En la etapa de compilación instala dependencias y genera los estáticos con `npm run build`. En la etapa final monta los archivos en Nginx Alpine y sirve en el puerto 3000 con proxy reverso a `http://backend:8000/api/`.

### 10.2 Despliegue en la Nube (Vercel + Render + Neon)
- **Frontend en Vercel**:
  - Configurado con `vercel.json` tanto en la raíz como en `frontend/` con reglas de reescritura hacia `/index.html` para permitir el correcto funcionamiento del enrutamiento de React Router sin errores 404 al recargar páginas internas.
  - Se vincula al backend en la nube configurando la variable de entorno `VITE_API_URL=https://branchview.onrender.com`.
- **Backend en Render**:
  - Desplegado como Web Service de Python.
  - El archivo `.python-version` declara la versión `3.12.8` requerida por el entorno de Render.
  - Expone endpoints de salud `/health` y `/` para monitoreo de actividad.
- **Base de Datos en Neon**:
  - PostgreSQL serverless alojado en la nube con soporte de cadenas de conexión seguras (`sslmode=require`).
  - La clase `Settings` en `app/core/config.py` normaliza automáticamente los esquemas de conexión antiguos `postgres://` a `postgresql://` requeridos por SQLAlchemy 2.0.

---

## 11. Flujo General de una Petición

A continuación se detalla el ciclo completo que sigue una petición HTTP, tomando como ejemplo la actualización de stock por parte de un gerente:

```text
[1. Usuario en Navegador]
       │
       │ Modifica cantidad de un producto y confirma en modal
       ▼
[2. Componente React (BranchDetailPage.tsx)]
       │
       │ Invoca apiService.stock.updateQuantity(branchId, stockId, cantidad)
       ▼
[3. Cliente Axios (services/api.ts)]
       │
       │ Inyecta encabezado 'Authorization: Bearer <jwt_token>'
       │ Envía PUT /api/branches/1/stock/5 con payload { cantidad: 20 }
       ▼
[4. Nginx Ingress / Servidor Web]
       │
       │ Redirige la petición al backend Uvicorn en puerto 8000
       ▼
[5. FastAPI Middleware (main.py)]
       │
       │ Valida orígenes permitidos en CORS (CORS_ORIGINS)
       ▼
[6. Router FastAPI (api/routers/stock.py)]
       │
       │ Ejecuta dependencias (api/deps.py):
       │   - get_db(): Abre sesión de base de datos
       │   - get_current_user(): Valida JWT, decodifica claims y busca Usuario en DB
       │   - require_branch_manager_write(): Valida rol gerente y pertenencia a sucursal 1
       ▼
[7. Capa de Servicios (services/alert_service.py)]
       │
       │ Actualiza la cantidad en la entidad Stock
       │ Ejecuta AlertService.evaluate_stock_alerts():
       │   - Si cantidad >= stock_seguridad: Marca alertas previas de este producto como 'resuelta'
       │   - Si cantidad == 0: Genera o escala alerta roja
       │   - Si cantidad < stock_seguridad: Genera o escala alerta amarilla
       ▼
[8. SQLAlchemy ORM & Base de Datos]
       │
       │ db.commit() persiste cambios en las tablas 'stock', 'alerta' y 'alerta_sucursal'
       │ db.refresh() recarga el estado actualizado de la base de datos
       ▼
[9. Serialización de Respuesta]
       │
       │ StockResponse (Pydantic) serializa la entidad a JSON
       │ Retorna HTTP 200 OK con el stock y su nuevo estado ('normal')
       ▼
[10. Frontend State Update]
       │
       │ React recibe la respuesta, actualiza el estado local y muestra un Toast de éxito
```\n