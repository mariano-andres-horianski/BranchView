# BranchView — Enterprise Multi-Branch Management & Supervision

**BranchView** es una plataforma web empresarial diseñada para la supervisión global y la gestión operativa de una red de sucursales o franquicias comerciales (e.g. cadenas gastronómicas, cafeterías de especialidad).

El sistema permite que un **Supervisor** audite la rentabilidad global, compare el rendimiento entre sucursales, detecte incidentes a través de un motor de alertas en tiempo real y administre altas y bajas de sucursales; mientras que un **Gerente** accede de forma exclusiva a la sucursal que tiene asignada para gestionar inventario, personal, actualización financiera y reporte de emergencias operativas.

---

## 1. Stack Tecnológico

| Capa | Tecnologías Principales |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, React Router 6, Tailwind CSS, Lucide Icons, Axios |
| **Backend** | Python 3.10+, FastAPI, SQLAlchemy 2.x, Alembic, Pydantic 2.x, JWT (`python-jose`), `bcrypt` |
| **Base de Datos** | PostgreSQL 15 |
| **Infraestructura** | Docker, Docker Compose, Nginx Alpine |

---

## 2. Arquitectura del Sistema

```text
┌────────────────────────────────────────────────────────┐
│              Frontend (React + TypeScript)              │
│            Nginx Alpine • Puerto: 3000                 │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP / REST / JSON (Bearer JWT)
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Backend (FastAPI)                    │
│            Uvicorn Worker • Puerto: 8000               │
└───────────────────────────┬────────────────────────────┘
                            │ PostgreSQL Dialect / SQLAlchemy
                            ▼
┌────────────────────────────────────────────────────────┐
│               Base de Datos (PostgreSQL 15)            │
│                 Contenedor • Puerto: 5432              │
└────────────────────────────────────────────────────────┘
```

---

## 3. Puesta en Marcha Inmediata (Docker Compose)

La aplicación está preparada para ser iniciada con un único comando, sin necesidad de instalar dependencias locales de Python, Node.js ni PostgreSQL.

### Paso 1: Clonar / Posicionarse en la raíz del proyecto
```bash
cd branchview
```

### Paso 2: Crear archivo de variables de entorno (opcional, ya provisto por defecto)
```bash
cp .env.example .env
```

### Paso 3: Construir y levantar los contenedores
```bash
docker compose up --build
```

Al iniciar:
1. El contenedor de **PostgreSQL** se inicializa y espera a estar saludable (`healthcheck`).
2. El contenedor de **Backend** ejecuta automáticamente las migraciones con Alembic (`alembic upgrade head`), ejecuta el script de seed (`python seed.py`) cargando usuarios, sucursales, empleados y stock inicial, y levanta el servidor FastAPI en el puerto `8000`.
3. El contenedor de **Frontend** compila la aplicación React con TypeScript y la sirve mediante Nginx en el puerto `3000`.

### Acceso a la aplicación:
- **Frontend Web**: [http://localhost:3000](http://localhost:3000)
- **API Swagger / OpenAPI**: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)
- **Health check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## 4. Credenciales de Prueba y Demostración

La base de datos viene pre-poblada con los siguientes usuarios para probar todos los roles y situaciones:

| Usuario | Contraseña | Rol | Sucursal Asignada | Situación Operativa / Demostración |
| :--- | :--- | :--- | :--- | :--- |
| `supervisor` | `admin123` | **supervisor** | *Global (todas)* | Vista de todas las sucursales, comparador, filtros, creación de sucursal y resolución global. |
| `gerente_centro` | `gerente123` | **gerente** | *Av. Corrientes 1520 (CABA)* | **Saludable**: Margen 15%, stock óptimo, 4 empleados. |
| `gerente_norte` | `gerente123` | **gerente** | *Av. Constitución 2450 (MdP)* | **Alertas Múltiples**: Margen 7.0% (Alerta Naranja Financiera), Café Molido agotado = 0 (Alerta Roja Stock), Azúcar bajo stock (Alerta Amarilla). |
| `gerente_sur` | `gerente123` | **gerente** | *Calle Güemes 3120 (MdP)* | **Crítica**: Ganancia neta negativa -$120,000 (Alerta Roja Financiera), Alerta manual por rotura de cañería en barra. |
| `gerente_oeste` | `gerente123` | **gerente** | *Av. Cabildo 1820 (CABA)* | Margen 16.6%, Alerta manual amarilla de mantenimiento preventivo de molino de café. |
| `gerente_disponible` | `gerente123` | **gerente** | *Sin sucursal asignada* | Usuario listo para ser asignado al crear una nueva sucursal con el supervisor. |

> **Tip de Usabilidad**: La pantalla de login incluye botones de acceso rápido de un clic para autocompletar estas credenciales.

---

## 5. Reglas de Negocio y Motor de Alertas

### 5.1 Alertas de Stock
- **Normal** (`cantidad >= stock_seguridad`): No genera alerta. Si existía una alerta automática activa para este producto, **se resuelve automáticamente**.
- **Stock Bajo / Amarilla** (`0 < cantidad < stock_seguridad`): Genera alerta amarilla indicando unidades disponibles vs stock de seguridad.
- **Stock Agotado / Roja** (`cantidad == 0`): Genera alerta roja crítica con prioridad alta.
- **Sin duplicados**: Si ya existe una alerta activa para el producto, se escala o actualiza en lugar de generar registros redundantes.

### 5.2 Alertas Financieras
Se evalúa el cociente mensual: `ganancias_netas_mes / ventas_mes`.
- **Saludable / Normal** (Margen $\ge 10\%$): No genera alerta y resuelve automáticamente cualquier alerta financiera previa.
- **Rentabilidad Baja / Naranja** (Margen $< 10\%$ con ganancia $> 0$): Genera alerta naranja.
- **Pérdida / Roja** (`ganancias_netas_mes <= 0` o `ventas_mes == 0` con ganancias $\le 0$): Alerta roja de máxima prioridad.

### 5.3 Alertas Manuales
- Creadas exclusivamente por gerentes para incidentes no detectables automáticamente (roturas, robos, incidentes edilicios, mantenimientos).
- Se asocian al usuario autenticado y su sucursal de forma automática en el backend.
- **No se resuelven automáticamente**: Requieren resolución explícita por parte del supervisor o del gerente de la sucursal.

### 5.4 Políticas de Eliminación y Baja Lógica
- **Baja de Empleados**: Se establece `activo = False`. El empleado deja de figurar en el listado activo pero sus datos históricos persisten en la base de datos.
- **Baja de Sucursales**: Se establece `activa = False`. No aparece en el listado operativo del supervisor ni en comparativas, garantizando integridad referencial.

---

## 6. Verificación de Flujos de Usuario (Criterios de Éxito)

### Flujo A: Supervisor
1. Iniciar sesión con `supervisor` / `admin123`.
2. Verificar el panel principal con las 4 sucursales operativas.
3. Probar el buscador filtrando por `Constitución`.
4. Probar los filtros: **Todas** (muestra también la sucursal cerrada de Mendoza), **Operativas** y **Con alertas activas**.
5. Seleccionar la tarjeta de `Sucursal Constitución` y hacer clic en **Ver Dashboard** (o marcar checkbox y presionar "Ver sucursal"):
   - Visualizar KPIs financieros y margen neto del 7%.
   - Desplegar la sección colapsada de **Nómina de Empleados** haciendo clic en el encabezado.
   - Consultar la tabla de Stock con estados dinámicos (Café Molido: Agotado, Azúcar: Stock Bajo).
   - Revisar las alertas activas de la sucursal.
6. Regresar a Sucursales, seleccionar **Sucursal Centro**, **Sucursal Constitución** y **Sucursal Güemes** simultáneamente y hacer clic en **Comparar 3 sucursales**:
   - Visualizar la tabla comparativa con los márgenes (15% vs 7% vs negativo).
   - Abrir individualmente los empleados de cada sucursal (`[Empleados ▼]`).
   - Consultar las alertas consolidadas al final de la página e interactuar con el botón "Resolver".
7. Hacer clic en **Agregar Sucursal**:
   - Ingresar dirección, seleccionar a `Martín Pardo (Sin Asignar)` como gerente, cargar valores financieros y guardar.
8. En una sucursal, hacer clic en el ícono de papelera para confirmar la **eliminación lógica**.

### Flujo B: Gerente
1. Iniciar sesión con `gerente_norte` / `gerente123`.
2. Comprobar que ingresa **directamente a su dashboard** de Av. Constitución (sin selector de sucursales).
3. Desplegar la sección de empleados:
   - Contratar un nuevo empleado con el botón "+ Contratar Empleado".
   - Editar sus datos.
   - Darlo de baja lógica y verificar el diálogo de confirmación.
4. En la sección de Stock:
   - Localizar el producto **Azúcar** (actualmente bajo en 6 unidades con stock de seguridad 15).
   - Hacer clic en **Actualizar** y colocar `20` unidades:
     - Comprobar que el estado pasa a **Normal** y la alerta amarilla se **resuelve automáticamente**.
   - Localizar **Café Molido Colombia** y actualizar a `30` unidades:
     - Comprobar que la alerta roja se resuelve automáticamente.
5. En la sección de Finanzas:
   - Hacer clic en **Actualizar Finanzas** y colocar `Ganancias Netas Mes = 450000` (lo que da un margen $> 10\%$):
     - Comprobar que la alerta financiera naranja desaparece al resolverse automáticamente.
6. En la sección de Alertas:
   - Hacer clic en **Crear Alerta Manual**, seleccionar gravedad (e.g. Roja), escribir título "Falla de tensión eléctrica" y detalle.
   - Comprobar que se publica inmediatamente y que puede resolverse con el botón correspondiente.

---

## 7. Endpoints de la API REST

### Autenticación
- `POST /api/auth/login` — Autenticación y emisión de JWT.
- `GET /api/auth/me` — Perfil del usuario actual y sucursal asignada.

### Sucursales
- `GET /api/branches` — Listado con búsqueda y filtros (Supervisor).
- `GET /api/branches/{id}` — Detalle completo con stock, empleados y alertas.
- `GET /api/branches/compare?ids=1,2,3` — Métricas comparativas consolidadas (Supervisor).
- `POST /api/branches` — Alta de nueva sucursal (Supervisor).
- `DELETE /api/branches/{id}` — Baja lógica de sucursal (Supervisor).

### Stock
- `GET /api/branches/{id}/stock` — Inventario y cálculo de estado dinámico.
- `PUT /api/branches/{id}/stock/{stock_id}` — Actualización de cantidades y auto-evaluación de alertas (Gerente asignado).

### Finanzas
- `GET /api/branches/{id}/finances` — Finanzas y margen neto.
- `PUT /api/branches/{id}/finances` — Actualización y auto-evaluación de alertas (Gerente asignado).

### Empleados
- `GET /api/branches/{id}/employees` — Nómina de empleados activos.
- `POST /api/branches/{id}/employees` — Alta/contratación (Gerente asignado).
- `PUT /api/employees/{id}` — Edición de datos (Gerente asignado).
- `DELETE /api/employees/{id}` — Baja lógica de empleado (Gerente asignado).

### Alertas
- `GET /api/alerts` — Alertas activas ordenadas por gravedad (1° Roja, 2° Naranja, 3° Amarilla).
- `GET /api/alerts/{id}` — Detalle de alerta.
- `POST /api/alerts` — Creación de alerta manual (Gerente asignado).
- `PATCH /api/alerts/{id}/resolve` — Resolución de alerta (Supervisor o Gerente asignado).

---

## 8. Estructura del Proyecto

```text
branchview/
├── backend/
│   ├── alembic/              # Migraciones versionadas de base de datos
│   │   ├── versions/
│   │   │   └── 001_initial_schema.py
│   │   └── env.py
│   ├── app/
│   │   ├── api/              # Routers REST y dependencias de autorización
│   │   │   ├── deps.py
│   │   │   └── routers/      # auth, branches, stock, finances, employees, alerts, users
│   │   ├── core/             # Configuración y seguridad (JWT, bcrypt)
│   │   ├── db/               # Session y engine SQLAlchemy
│   │   ├── models/           # Modelos de datos relacionales
│   │   ├── schemas/          # Esquemas de validación Pydantic
│   │   ├── services/         # Servicio centralizado de alertas y lógica de negocio
│   │   └── main.py           # Aplicación FastAPI
│   ├── tests/                # Pruebas unitarias automatizadas
│   ├── Dockerfile            # Imagen backend Python
│   ├── entrypoint.sh         # Script de inicio (migraciones + seed + uvicorn)
│   ├── requirements.txt      # Dependencias Python
│   ├── alembic.ini
│   └── seed.py               # Poblado de datos iniciales
├── frontend/
│   ├── src/
│   │   ├── components/       # Layouts, Sidebar, Modales, Badges, Toast, KPIs
│   │   ├── context/          # AuthContext y manejo de sesión
│   │   ├── pages/            # Login, Supervisor, Detalle/Gerente, Comparador, Alertas
│   │   ├── services/         # Cliente API con interceptores Axios
│   │   ├── types/            # Tipos TypeScript
│   │   ├── App.tsx           # Enrutamiento protegido
│   │   └── main.tsx
│   ├── Dockerfile            # Construcción multi-stage Nginx
│   ├── nginx.conf            # Servidor web y proxy reverso
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── docker-compose.yml        # Orquestador multi-contenedor
├── .env.example              # Variables de entorno modelo
└── README.md                 # Documentación técnica
```

---

## 9. Pruebas Automatizadas

Para ejecutar la suite de pruebas unitarias de lógica de negocio en el backend:

```bash
# Dentro del contenedor de backend o con entorno Python activo:
pytest backend/tests/
```

Las pruebas validan de forma aislada:
- Transiciones de estado de alertas de stock (Normal $\leftrightarrow$ Bajo $\leftrightarrow$ Agotado).
- Transiciones de estado de alertas financieras (Saludable $\leftrightarrow$ Naranja $\leftrightarrow$ Roja).
- No duplicación de alertas activas.
- Bloqueo de permisos cruzados entre gerentes y supervisores.
- Verificación de borrado lógico (conservación de registros con `activa = False` y `activo = False`).
