# BranchView

## Especificación funcional y técnica

### 1. Descripción general

**BranchView** es una aplicación web empresarial para la supervisión y gestión de un negocio con múltiples sucursales.

El sistema permite administrar y consultar información de sucursales, empleados, stock, ventas, ganancias netas y alertas.

Existen dos tipos de usuarios:

* **Supervisor:** tiene una visión global de todas las sucursales y puede administrarlas.
* **Gerente:** está asociado a una sucursal y puede informar cambios operativos y crear alertas manuales.

La aplicación debe presentar una interfaz formal, corporativa y orientada a la visualización de información empresarial.

---

# 2. Objetivos

Los objetivos principales son:

1. Permitir la autenticación de usuarios.
2. Mostrar información según el rol del usuario autenticado.
3. Permitir al supervisor consultar múltiples sucursales.
4. Permitir comparar sucursales.
5. Permitir al supervisor crear y eliminar lógicamente sucursales.
6. Permitir al gerente actualizar la información de su sucursal.
7. Detectar automáticamente problemas de stock.
8. Detectar automáticamente problemas financieros.
9. Permitir al gerente crear alertas manuales.
10. Permitir gestionar el estado de las alertas.
11. Mantener una separación clara de permisos entre supervisor y gerente.

---

# 3. Tecnologías

## Frontend

* React
* TypeScript
* React Router
* Tailwind CSS
* Biblioteca de componentes UI adecuada para un diseño empresarial
* Cliente HTTP para comunicación con la API

## Backend

* Python
* FastAPI
* SQLAlchemy
* Alembic
* API REST
* Autenticación y autorización basada en roles

## Base de datos

* PostgreSQL

## Infraestructura

* Docker
* Docker Compose

La aplicación debe poder iniciarse mediante Docker Compose sin requerir instalaciones manuales de PostgreSQL, Node.js o Python en el equipo donde se ejecute.

---

# 4. Arquitectura

La arquitectura será de tres capas principales:

```text
React + TypeScript
        │
        │ HTTP / JSON
        ▼
FastAPI
        │
        │ SQLAlchemy
        ▼
PostgreSQL
```

Cada componente debe ejecutarse en su propio contenedor:

```text
┌─────────────────────┐
│      Frontend       │
│ React + TypeScript  │
└──────────┬──────────┘
           │
           │ HTTP
           ▼
┌─────────────────────┐
│       Backend       │
│       FastAPI       │
└──────────┬──────────┘
           │
           │ SQL
           ▼
┌─────────────────────┐
│     PostgreSQL      │
└─────────────────────┘
```

Docker Compose debe encargarse de orquestar los servicios.

---

# 5. Usuarios y autenticación

La aplicación tendrá dos roles:

* `supervisor`
* `gerente`

El usuario inicia sesión ingresando:

* usuario
* contraseña

No habrá registro público de usuarios.

El backend debe:

1. recibir las credenciales;
2. verificar usuario y contraseña;
3. identificar el rol;
4. generar una sesión/token de autenticación;
5. permitir al frontend acceder únicamente a las funcionalidades autorizadas.

Las contraseñas **no deben almacenarse en texto plano**. Deben almacenarse mediante un mecanismo seguro de hashing.

El frontend no debe ser responsable de garantizar los permisos. React solamente debe ocultar las opciones que el usuario no puede utilizar; **FastAPI debe validar nuevamente los permisos en cada operación protegida**.

---

# 6. Modelo de datos

Todas las tablas tendrán un identificador propio `id`, salvo la tabla intermedia, que utilizará una clave primaria compuesta.

## 6.1 Usuario

Tabla: `usuario`

Campos:

* `id`
* `nombre`
* `rol`
* `contraseña`

El rol solamente puede ser:

* `supervisor`
* `gerente`

---

## 6.2 Sucursal

Tabla: `sucursal`

Campos:

* `id`
* `direccion`
* `id_gerente`
* `ventas_mes`
* `ventas_anio`
* `ganancias_netas_mes`
* `ganancias_netas_anio`
* `activa`

Relación:

```text
sucursal.id_gerente → usuario.id
```

Una sucursal tiene un gerente responsable.

`activa` permite realizar eliminación lógica.

Una sucursal eliminada no debe aparecer en los listados normales, pero sus datos deben permanecer en la base de datos.

---

## 6.3 Stock

Tabla: `stock`

Campos:

* `id`
* `nombre_producto`
* `cantidad`
* `id_sucursal`
* `stock_seguridad`

Relación:

```text
stock.id_sucursal → sucursal.id
```

El estado del stock no se almacena en la base de datos, sino que se calcula a partir de `cantidad` y `stock_seguridad`.

Reglas:

```text
cantidad > stock_seguridad
→ stock normal

cantidad <= stock_seguridad y cantidad > 0
→ stock bajo

cantidad = 0
→ producto agotado
```

---

## 6.4 Empleado

Tabla: `empleado`

Campos:

* `id`
* `rol`
* `DNI`
* `sueldo`
* `asistencias`
* `faltas`
* `id_sucursal`
* `nombre`
* `antiguedad`
* `edad`
* `activo`

Relación:

```text
empleado.id_sucursal → sucursal.id
```

`activo` permite conservar empleados despedidos sin eliminarlos físicamente.

Un empleado contratado tendrá:

```text
activo = true
```

Un empleado despedido tendrá:

```text
activo = false
```

Los empleados inactivos no deben mostrarse en la lista normal de empleados.

---

# 7. Alertas

Tabla: `alerta`

Campos:

* `id`
* `gravedad`
* `mensaje`
* `tipo`
* `detalle`
* `id_usuario`
* `fecha_creacion`
* `estado`

### Gravedad

Valores permitidos:

* `roja`
* `naranja`
* `amarilla`

Correspondencia visual:

* roja → crítica
* naranja → importante
* amarilla → advertencia

### Tipo

Valores:

* `stock`
* `financiera`
* `manual`

### Estado

Valores:

* `activa`
* `resuelta`

### `id_usuario`

Indica quién creó la alerta.

Para alertas automáticas:

```text
id_usuario = NULL
```

Para alertas manuales:

```text
id_usuario = ID del gerente que la creó
```

---

# 8. Relación alerta-sucursal

Tabla:

`alerta_sucursal`

Campos:

* `id_alerta`
* `id_sucursal`

Clave primaria:

```text
(id_alerta, id_sucursal)
```

Relaciones:

```text
id_alerta → alerta.id
id_sucursal → sucursal.id
```

Esta relación permite asociar una alerta con una sucursal.

---

# 9. Alertas automáticas

El sistema debe generar alertas automáticamente cuando se cumplen determinadas reglas.

## 9.1 Alertas de stock

Para cada producto de cada sucursal:

### Stock normal

```text
cantidad > stock_seguridad
```

No genera alerta.

### Stock bajo

```text
0 < cantidad <= stock_seguridad
```

Genera una alerta amarilla.

Ejemplo:

> 🟡 Av. Colón 1234 — Café en grano próximo a agotarse

### Stock agotado

```text
cantidad = 0
```

Genera una alerta roja.

Ejemplo:

> 🔴 Av. Colón 1234 — Café en grano agotado

El sistema debe evitar generar múltiples alertas idénticas para la misma condición.

Cuando el gerente actualiza el stock y la condición deja de existir, la alerta correspondiente debe marcarse automáticamente como `resuelta`.

---

# 10. Alertas financieras

Las alertas financieras se calculan utilizando los valores mensuales.

Se calcula:

```text
ganancias_netas_mes / ventas_mes
```

### Situación normal

```text
ganancias_netas_mes / ventas_mes > 0.10
```

No genera alerta.

### Rentabilidad baja

```text
ganancias_netas_mes / ventas_mes <= 0.10
```

Genera alerta naranja.

Ejemplo:

> 🟠 Av. Constitución 456 — Rentabilidad mensual baja

### Ganancia nula o negativa

```text
ganancias_netas_mes <= 0
```

Genera alerta roja.

Ejemplo:

> 🔴 Av. Luro 321 — Ganancia neta mensual nula o negativa

La alerta roja tiene prioridad sobre la naranja.

Si una condición financiera deja de cumplirse después de una actualización, la alerta automática correspondiente debe marcarse como `resuelta`.

Debe contemplarse el caso `ventas_mes = 0` para evitar una división por cero.

---

# 11. Alertas manuales

El gerente puede crear alertas manualmente para situaciones que no pueden ser detectadas automáticamente.

Ejemplos:

* cliente recurrente que genera problemas;
* incendio;
* robo;
* pérdida o rotura de un caño de agua;
* problemas edilicios;
* mantenimiento necesario;
* cualquier otro incidente relevante.

Al crear una alerta, el gerente debe indicar:

* gravedad;
* mensaje;
* detalle.

El sistema debe asociar automáticamente:

* el gerente que la creó;
* la sucursal del gerente;
* la fecha de creación;
* el tipo `manual`;
* el estado `activa`.

El campo `detalle` debe permitir introducir una descripción extensa del incidente.

Ejemplo:

```text
Mensaje:
Requiere mantenimiento

Detalle:
Se detectó una pérdida de agua en el sector de cocina.
La instalación presenta una filtración debajo de la pileta
y requiere revisión antes de continuar con normalidad.
```

Las alertas manuales no se resuelven automáticamente.

---

# 12. Gestión de alertas

Las alertas se ordenan por gravedad:

```text
1. Roja
2. Naranja
3. Amarilla
```

Dentro de una misma gravedad, las más antiguas o las que tengan mayor prioridad temporal pueden aparecer primero.

Las alertas activas son las que se muestran por defecto.

Al resolver una alerta:

```text
estado = resuelta
```

La alerta no se elimina de la base de datos.

Las alertas automáticas se resuelven automáticamente cuando desaparece la condición que las originó.

Las alertas manuales deben ser resueltas explícitamente por un usuario autorizado.

---

# 13. Permisos

## Supervisor

Puede:

* iniciar sesión;
* ver todas las sucursales activas;
* buscar sucursales;
* filtrar sucursales;
* seleccionar una sucursal;
* seleccionar varias sucursales;
* consultar dashboards;
* comparar sucursales;
* consultar empleados;
* consultar stock;
* consultar información financiera;
* consultar todas las alertas;
* ver detalles de alertas;
* resolver alertas;
* crear sucursales;
* eliminar lógicamente sucursales.

No puede:

* modificar directamente empleados;
* modificar stock;
* modificar ventas;
* modificar ganancias;
* crear alertas manuales.

---

## Gerente

Está asociado a una única sucursal.

Puede:

* iniciar sesión;
* consultar su sucursal;
* consultar empleados;
* consultar stock;
* consultar finanzas;
* informar contrataciones;
* informar despidos;
* modificar datos de empleados;
* actualizar ventas;
* actualizar ganancias netas;
* actualizar stock;
* crear alertas manuales;
* consultar alertas de su sucursal;
* resolver alertas de su sucursal.

No puede:

* crear sucursales;
* eliminar sucursales;
* consultar otras sucursales;
* modificar datos de otras sucursales;
* crear alertas para otras sucursales.

---

# 14. Flujo del supervisor

Después de iniciar sesión:

```text
Login
  ↓
Pantalla de Sucursales
```

La pantalla contiene:

* sidebar;
* nombre del usuario;
* título "Sucursales";
* buscador;
* filtro;
* botón "Nueva sucursal";
* listado de sucursales;
* selección mediante checkbox;
* botón "Ver sucursales".

Filtros:

```text
Todas
Operativas
Con alerta
```

El buscador y el filtro deben funcionar independientemente.

Si se selecciona:

```text
0 sucursales
→ solicitar selección

1 sucursal
→ dashboard individual

2 o más
→ dashboard comparativo
```

---

# 15. Dashboard individual

Debe mostrar:

* nombre de sucursal;
* dirección;
* gerente;
* información financiera;
* ventas mensuales;
* ventas anuales;
* ganancias netas mensuales;
* ganancias netas anuales;
* indicadores financieros;
* información de stock;
* alertas relevantes.

Los empleados aparecen en una sección:

**Empleados ▾**

La sección comienza cerrada y puede expandirse.

Al expandirse muestra los empleados activos de la sucursal.

---

# 16. Dashboard comparativo

Cuando el supervisor selecciona varias sucursales, se muestra:

Título:

**Comparación de sucursales**

Debe incluir:

* nombres de las sucursales seleccionadas;
* información financiera comparativa;
* ventas mensuales;
* ventas anuales;
* ganancias netas mensuales;
* ganancias netas anuales;
* indicadores o gráficos comparativos;
* empleados de cada sucursal;
* alertas.

Cada sucursal debe tener su propia sección de empleados:

```text
Sucursal Centro — Empleados ▾
Sucursal Norte — Empleados ▾
Sucursal Sur — Empleados ▾
```

Todas deben comenzar cerradas.

Las alertas aparecen al final de la pantalla en tarjetas independientes con bordes redondeados.

---

# 17. Pantalla de Alertas

La sección "Alertas" del sidebar lleva a una pantalla dedicada.

Debe mostrar:

**Alertas**

Subtítulo:

**Problemas que requieren atención**

Las alertas se presentan en una única lista ordenada por gravedad.

Formato conceptual:

```text
🔴 Av. Colón 1234 — Café agotado

🟠 Av. Constitución 456 — Rentabilidad mensual baja

🟡 Av. Luro 321 — Stock próximo a agotarse
```

Cada alerta debe ser una tarjeta con bordes redondeados.

Las alertas manuales deben poder abrirse para consultar su `detalle`.

---

# 18. Dashboard del gerente

Después del login, el gerente debe ingresar directamente al dashboard de su sucursal.

No debe seleccionar una sucursal.

El sistema ya conoce la sucursal asociada mediante:

```text
usuario → sucursal
```

Debe mostrar la información de la sucursal y las acciones disponibles.

Las acciones principales serán:

* Contratar empleado
* Informar despido
* Modificar empleado
* Actualizar ventas y ganancias
* Actualizar stock
* Crear alerta

---

# 19. Contratación

El gerente puede crear un empleado.

Datos:

* nombre;
* DNI;
* rol;
* sueldo;
* edad;
* antigüedad;
* asistencias;
* faltas.

El empleado se asocia automáticamente a la sucursal del gerente.

El empleado comienza como:

```text
activo = true
```

---

# 20. Despido

El gerente selecciona un empleado activo y puede marcarlo como despedido.

El sistema debe utilizar eliminación lógica:

```text
activo = false
```

El registro permanece en PostgreSQL.

---

# 21. Modificación de empleados

El gerente puede modificar los datos de los empleados de su propia sucursal.

No puede modificar empleados pertenecientes a otra sucursal.

---

# 22. Actualización financiera

El gerente puede informar:

* ventas mensuales;
* ventas anuales;
* ganancias netas mensuales;
* ganancias netas anuales.

Después de guardar los valores mensuales, FastAPI debe volver a evaluar automáticamente las reglas de alertas financieras.

---

# 23. Actualización de stock

El gerente puede modificar la cantidad de productos.

Después de guardar:

1. FastAPI actualiza PostgreSQL.
2. Se evalúan `cantidad` y `stock_seguridad`.
3. Se crean, mantienen o resuelven las alertas correspondientes.

---

# 24. Creación de sucursales

El supervisor puede crear una sucursal.

Datos mínimos:

* dirección;
* gerente;
* ventas mensuales;
* ventas anuales;
* ganancias netas mensuales;
* ganancias netas anuales.

La nueva sucursal comienza:

```text
activa = true
```

El supervisor debe poder seleccionar qué usuario con rol gerente queda asociado.

---

# 25. Eliminación de sucursales

El supervisor puede eliminar una sucursal.

La eliminación debe ser lógica:

```text
activa = false
```

No se debe eliminar físicamente el registro.

La aplicación debe impedir que una sucursal inactiva aparezca en los listados normales o sea seleccionada para operar.

---

# 26. Diseño visual

La aplicación debe utilizar un estilo empresarial formal.

Características:

* sidebar lateral fijo;
* aproximadamente 240 px de ancho;
* color oscuro corporativo;
* fondo general gris muy claro;
* tarjetas blancas;
* bordes sutiles;
* esquinas moderadamente redondeadas;
* sombras muy leves;
* tipografía limpia y profesional;
* iconografía de estilo outline;
* azul corporativo como color principal;
* rojo, naranja y amarillo exclusivamente para estados y alertas.

Evitar:

* gradientes;
* ilustraciones decorativas;
* animaciones excesivas;
* colores saturados innecesarios;
* estética de aplicación informal;
* exceso de información en una misma pantalla.

La interfaz debe priorizar jerarquía visual y legibilidad.

---

# 27. Sidebar

Para el supervisor:

```text
BranchView

Dashboard
Sucursales
Alertas
```

Para el gerente:

```text
BranchView

Dashboard
Alertas
```

El contenido disponible debe adaptarse al rol.

El usuario autenticado debe aparecer en la parte superior derecha.

La opción Alertas puede mostrar un contador de alertas activas.

---

# 28. Datos mock

La aplicación debe incluir datos ficticios suficientes para demostrar todas las funcionalidades.

Se deben crear automáticamente mediante un mecanismo de seed.

Los datos deben incluir:

* al menos un usuario supervisor;
* al menos dos usuarios gerente;
* varias sucursales;
* empleados;
* productos;
* diferentes cantidades de stock;
* diferentes stocks de seguridad;
* diferentes valores financieros;
* alertas automáticas;
* escenarios que permitan demostrar alertas rojas, naranjas y amarillas.

También deben existir datos suficientes para demostrar:

* dashboard individual;
* comparación entre sucursales;
* búsqueda;
* filtros;
* creación de sucursal;
* modificación de empleados;
* contratación;
* despido;
* actualización de stock;
* generación automática de alertas;
* creación de alertas manuales.

Todos los datos serán ficticios.

---

# 29. API REST

La API debe estar organizada por recursos.

Endpoints conceptuales:

```text
/auth
    POST /auth/login

/branches
    GET    /branches
    POST   /branches
    GET    /branches/{id}
    PUT    /branches/{id}
    DELETE /branches/{id}

/branches/{id}/employees
    GET    /branches/{id}/employees
    POST   /branches/{id}/employees

/employees
    GET    /employees/{id}
    PUT    /employees/{id}
    DELETE /employees/{id}

/branches/{id}/stock
    GET    /branches/{id}/stock
    PUT    /branches/{id}/stock/{stock_id}

/branches/{id}/finances
    GET    /branches/{id}/finances
    PUT    /branches/{id}/finances

/alerts
    GET    /alerts
    POST   /alerts

/alerts/{id}
    GET    /alerts/{id}
    PATCH  /alerts/{id}/resolve
```

Los endpoints definitivos pueden ajustarse durante la implementación siempre que respeten las reglas de negocio y permisos de esta especificación.

---

# 30. Seguridad y autorización

El sistema debe garantizar que:

* un gerente solamente pueda acceder a su sucursal;
* un gerente no pueda modificar datos de otra sucursal;
* un gerente no pueda crear/eliminar sucursales;
* un gerente no pueda crear alertas asociadas a otra sucursal;
* un supervisor pueda acceder a todas las sucursales activas;
* las operaciones administrativas del supervisor estén protegidas.

Las restricciones deben implementarse en FastAPI.

No es suficiente con ocultar botones en React.

---

# 31. Docker

El proyecto debe incluir:

```text
docker-compose.yml
```

con al menos:

```text
frontend
backend
postgres
```

El proyecto debe poder iniciarse mediante un único comando de Docker Compose.

PostgreSQL debe utilizar un volumen para conservar los datos.

Las variables sensibles y configuraciones deben manejarse mediante variables de entorno.

Debe existir un archivo `.env.example`.

---

# 32. Calidad del proyecto

El código debe:

* estar organizado por responsabilidades;
* evitar duplicación innecesaria;
* utilizar nombres claros;
* separar modelos de BD, esquemas de API y lógica de negocio;
* manejar errores adecuadamente;
* validar los datos recibidos;
* utilizar relaciones de PostgreSQL correctamente;
* mantener la lógica de permisos en backend;
* mantener el frontend separado de la lógica de acceso a datos.

El proyecto debe incluir un `README.md` con:

* descripción;
* tecnologías utilizadas;
* requisitos;
* instrucciones para ejecutar con Docker;
* usuarios de prueba;
* estructura general;
* información relevante para la demostración.

---

# 33. Principio general de funcionamiento

BranchView debe seguir tres conceptos principales:

### Encontrar

El supervisor encuentra las sucursales mediante:

```text
Dashboard
→ búsqueda
→ filtros
→ selección
```

### Entender

Una vez seleccionadas:

```text
Sucursal
→ finanzas
→ stock
→ empleados
→ alertas
```

o:

```text
Varias sucursales
→ comparación
→ finanzas
→ empleados
→ alertas
```

### Actuar

Las situaciones que requieren atención se concentran en:

```text
Alertas
→ gravedad
→ sucursal
→ mensaje
→ detalle
→ resolución
```

El sistema debe utilizar **divulgación progresiva** para evitar sobrecargar la interfaz.

---

# 34. Regla fundamental de negocio

BranchView debe distinguir siempre entre:

**Información ingresada por usuarios**

y

**Información/alertas calculadas automáticamente por el sistema.**

El gerente informa cambios:

```text
Stock
Finanzas
Empleados
```

y el sistema determina automáticamente si esos cambios producen alguna situación que requiera atención.

El gerente también puede informar situaciones que el sistema no puede detectar por sí mismo mediante alertas manuales.

El supervisor tiene una visión global y capacidad de administración de las sucursales.

Esta separación constituye uno de los principios centrales de BranchView.
