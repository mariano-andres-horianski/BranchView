# PROMPT MAESTRO — BRANCHVIEW

Quiero que desarrolles una aplicación web completa llamada **BranchView**.

BranchView es una aplicación empresarial para la supervisión y gestión de múltiples sucursales de un negocio, por ejemplo una cadena de cafeterías/franquicias.

El objetivo principal es permitir que un **supervisor** pueda visualizar y comparar sucursales, detectar problemas mediante alertas y administrar las sucursales; mientras que un **gerente** pueda gestionar únicamente la sucursal que tiene asignada.

No quiero solamente un prototipo visual. Quiero una aplicación funcional de extremo a extremo, con frontend, backend, base de datos, autenticación, autorización, lógica de negocio, datos de prueba y Docker.

---

# 1. STACK TECNOLÓGICO OBLIGATORIO

Utiliza:

## Frontend

* React
* TypeScript
* React Router
* Tailwind CSS
* shadcn/ui o una biblioteca de componentes equivalente si es necesario
* Fetch o Axios para consumir la API

## Backend

* Python
* FastAPI
* SQLAlchemy
* Alembic

## Base de datos

* PostgreSQL

## Infraestructura

* Docker
* Docker Compose

La arquitectura debe ser:

React → API HTTP/JSON → FastAPI → SQLAlchemy → PostgreSQL

Utiliza contenedores separados para:

* frontend
* backend
* postgres

La aplicación debe poder iniciarse con:

`docker compose up --build`

Incluye:

* `.env.example`
* `README.md`
* configuración de Docker
* migraciones de Alembic
* seed/mock data para demostrar el funcionamiento.

---

# 2. OBJETIVO DE LA APLICACIÓN

La aplicación debe permitir:

### Supervisor

* iniciar sesión;
* visualizar todas las sucursales activas;
* buscar sucursales;
* filtrar sucursales;
* seleccionar una o varias sucursales;
* visualizar un dashboard individual;
* comparar varias sucursales;
* visualizar empleados;
* visualizar stock;
* visualizar información financiera;
* visualizar alertas;
* crear nuevas sucursales;
* eliminar sucursales lógicamente;
* resolver alertas.

### Gerente

* iniciar sesión;
* acceder directamente al dashboard de su sucursal;
* visualizar la información de su sucursal;
* visualizar empleados;
* contratar/reportar altas;
* reportar bajas;
* editar empleados;
* actualizar stock;
* actualizar ventas y ganancias;
* crear alertas manuales;
* visualizar alertas de su sucursal;
* resolver alertas de su propia sucursal.

La autorización debe estar implementada en el backend. No alcanza con ocultar botones en React.

---

# 3. AUTENTICACIÓN

Debe existir una pantalla de login.

Campos:

* usuario
* contraseña

No debe existir registro público de usuarios.

La base de datos debe almacenar las contraseñas de forma segura mediante hash. Nunca almacenar contraseñas en texto plano.

Después del login:

### Supervisor

Debe acceder a la pantalla principal de selección de sucursales.

### Gerente

Debe ser redirigido directamente al dashboard de su sucursal asignada.

Utiliza una estrategia de autenticación apropiada para FastAPI, por ejemplo JWT con token de acceso.

El backend debe validar:

* identidad;
* rol;
* permisos;
* sucursal asociada cuando el usuario sea gerente.

---

# 4. ROLES Y PERMISOS

Existen dos roles:

* `supervisor`
* `gerente`

## SUPERVISOR

Puede:

* ver todas las sucursales activas;
* buscar sucursales;
* filtrar sucursales;
* seleccionar una sucursal;
* seleccionar múltiples sucursales;
* acceder al dashboard individual;
* acceder al dashboard comparativo;
* ver empleados;
* ver stock;
* ver información financiera;
* ver todas las alertas;
* crear sucursales;
* eliminar sucursales lógicamente;
* resolver alertas.

No puede:

* modificar directamente los datos operativos de una sucursal;
* modificar empleados;
* modificar stock;
* modificar finanzas;
* crear alertas manuales.

## GERENTE

Cada gerente está asociado a una única sucursal.

Puede:

* ver únicamente su sucursal;
* ver empleados de su sucursal;
* contratar/reportar altas;
* reportar bajas;
* editar datos de empleados;
* actualizar stock;
* actualizar ventas mensuales;
* actualizar ventas anuales;
* actualizar ganancias netas mensuales;
* actualizar ganancias netas anuales;
* crear alertas manuales;
* visualizar alertas de su sucursal;
* resolver alertas de su sucursal.

No puede:

* ver otras sucursales;
* modificar otras sucursales;
* crear sucursales;
* eliminar sucursales;
* comparar sucursales;
* crear alertas para otras sucursales.

IMPORTANTE:

Los permisos deben validarse en el backend mediante dependencias/middleware/autorización apropiada de FastAPI.

Nunca confiar únicamente en el frontend.

---

# 5. MODELO DE DATOS

Crear las tablas correspondientes mediante SQLAlchemy y Alembic.

## usuario

Campos:

* `id`
* `username`
* `nombre`
* `rol`
* `password_hash`

`rol` puede ser:

* `supervisor`
* `gerente`

Un gerente puede estar asociado a una única sucursal.

---

## sucursal

Campos:

* `id`
* `direccion`
* `id_gerente`
* `ventas_mes`
* `ventas_anio`
* `ganancias_netas_mes`
* `ganancias_netas_anio`
* `activa`

Relaciones:

`id_gerente` → `usuario.id`

`activa` sirve para eliminación lógica.

Una sucursal eliminada lógicamente no debe aparecer en las listas normales.

No borrar físicamente el registro.

---

## stock

Campos:

* `id`
* `nombre_producto`
* `cantidad`
* `id_sucursal`
* `stock_seguridad`

Relaciones:

`id_sucursal` → `sucursal.id`

IMPORTANTE:

No almacenar el estado del stock como dato permanente.

El estado debe calcularse:

* `cantidad >= stock_seguridad` → normal
* `0 < cantidad < stock_seguridad` → stock bajo / amarillo
* `cantidad = 0` → agotado / rojo

El estado debe derivarse de los valores actuales.

---

## empleado

Campos:

* `id`
* `rol`
* `dni`
* `sueldo`
* `asistencias`
* `faltas`
* `id_sucursal`
* `nombre`
* `antiguedad`
* `edad`
* `activo`

Relación:

`id_sucursal` → `sucursal.id`

La baja de un empleado debe ser lógica:

`activo = false`

Los empleados inactivos no deben aparecer en el listado normal.

No eliminar físicamente los registros.

---

## alerta

Campos:

* `id`
* `gravedad`
* `mensaje`
* `tipo`
* `detalle`
* `id_usuario`
* `fecha_creacion`
* `estado`

Valores:

### gravedad

* `roja`
* `naranja`
* `amarilla`

### tipo

* `stock`
* `financiera`
* `manual`

### estado

* `activa`
* `resuelta`

`id_usuario` puede ser NULL para alertas automáticas.

Para alertas manuales debe almacenar el usuario que la creó.

---

## alerta_sucursal

Tabla intermedia:

* `id_alerta`
* `id_sucursal`

Utilizar clave primaria compuesta:

`(id_alerta, id_sucursal)`

Relaciones:

* `id_alerta` → `alerta.id`
* `id_sucursal` → `sucursal.id`

Esto permite que una alerta pueda asociarse a una o más sucursales si en el futuro fuese necesario.

---

# 6. ALERTAS AUTOMÁTICAS

El sistema debe generar alertas automáticamente a partir de determinadas condiciones.

## ALERTAS DE STOCK

Reglas:

### Normal

Si:

`cantidad >= stock_seguridad`

No existe alerta activa de stock para esa condición.

### Amarilla

Si:

`0 < cantidad < stock_seguridad`

Crear alerta amarilla.

### Roja

Si:

`cantidad = 0`

Crear alerta roja.

La alerta debe identificar:

* sucursal;
* producto;
* cantidad actual;
* situación detectada.

Ejemplo:

"Stock bajo de café molido."

Detalle:

"El producto Café Molido tiene 4 unidades disponibles y el stock de seguridad es de 10 unidades."

No generar múltiples alertas idénticas activas para la misma situación.

Si una alerta automática deja de cumplirse después de actualizar el stock, debe marcarse automáticamente como `resuelta`.

---

# 7. ALERTAS FINANCIERAS

Utilizar los valores mensuales:

* `ventas_mes`
* `ganancias_netas_mes`

Calcular:

`ganancias_netas_mes / ventas_mes`

Reglas:

### Normal

Si el porcentaje es igual o superior al 10%.

### Naranja

Si:

`ganancias_netas_mes / ventas_mes < 10%`

### Roja

Si:

`ganancias_netas_mes <= 0`

La alerta roja tiene prioridad sobre la naranja.

Ejemplo:

Ventas mensuales: $100.000
Ganancias netas: $5.000

Margen:

5%

Resultado:

Alerta naranja.

Otro ejemplo:

Ventas mensuales: $100.000
Ganancias netas: -$5.000

Resultado:

Alerta roja.

IMPORTANTE:

Manejar correctamente el caso `ventas_mes = 0` para evitar división por cero.

Si las ventas son 0 y las ganancias netas son menores o iguales a 0, generar alerta roja.

No generar duplicados.

Cuando la condición financiera deja de cumplirse, la alerta automática correspondiente debe pasar automáticamente a `resuelta`.

---

# 8. ALERTAS MANUALES

Los gerentes pueden crear alertas manuales para problemas que el sistema no puede detectar automáticamente.

Ejemplos:

* cliente problemático;
* robo;
* pérdida de mercadería;
* rotura de cañería;
* mantenimiento;
* problema edilicio;
* incidente con un empleado;
* cualquier situación operativa relevante.

El formulario debe permitir:

* gravedad;
* mensaje;
* detalle.

El backend debe completar automáticamente:

* usuario creador;
* sucursal del gerente;
* fecha de creación;
* tipo = `manual`;
* estado = `activa`.

El gerente no debe poder indicar manualmente otra sucursal.

La asociación debe salir del usuario autenticado.

Las alertas manuales NO se resuelven automáticamente.

Deben ser resueltas explícitamente por un usuario autorizado.

No hace falta agregar comentarios al resolver una alerta.

---

# 9. DASHBOARD DEL SUPERVISOR

Después del login, el supervisor debe ver una pantalla de selección de sucursales.

Layout:

## Sidebar izquierdo

Barra lateral fija de aproximadamente 240 px.

Elementos:

* logo/nombre: BranchView
* Dashboard
* Sucursales
* Alertas

En la parte superior/derecha mostrar el nombre del usuario autenticado.

---

# 10. SELECCIÓN DE SUCURSALES

La pantalla principal debe tener:

* título;
* buscador;
* filtros;
* botón para agregar sucursal;
* listado de sucursales.

El buscador debe permitir buscar por:

* dirección;
* gerente;
* información relevante de la sucursal.

Debajo del buscador debe existir un filtro separado.

Filtros:

* Todas
* Operativas
* Con alerta

El filtro debe actualizar dinámicamente el listado.

"Operativas" corresponde a sucursales activas/no eliminadas.

"Con alerta" corresponde a sucursales que tengan al menos una alerta activa.

---

# 11. TARJETAS DE SUCURSALES

Cada sucursal debe mostrarse como una tarjeta.

La tarjeta debe incluir:

* icono de sucursal;
* nombre o identificador;
* dirección;
* gerente;
* indicador de estado;
* indicador de alerta;
* checkbox para selección.

Debe ser posible seleccionar:

* una sucursal;
* varias sucursales.

Debe existir un botón:

**Ver sucursales**

Comportamiento:

### Una sucursal seleccionada

→ dashboard individual.

### Varias sucursales seleccionadas

→ dashboard comparativo.

---

# 12. DASHBOARD INDIVIDUAL

Mostrar:

* nombre de sucursal;
* dirección;
* gerente;
* estado;
* alertas relevantes.

## KPIs financieros

Mostrar de manera clara:

* ventas mensuales;
* ventas anuales;
* ganancias netas mensuales;
* ganancias netas anuales;
* margen neto mensual.

Las métricas deben ser fáciles de comparar visualmente.

---

# 13. EMPLEADOS

La sección de empleados debe estar **colapsada por defecto**.

El usuario debe poder expandirla.

Al abrirla mostrar empleados activos de la sucursal.

Información:

* nombre;
* DNI;
* rol;
* sueldo;
* asistencias;
* faltas;
* antigüedad;
* edad.

Para el gerente incluir acciones:

* editar;
* dar de baja;
* contratar/agregar empleado.

Las bajas son lógicas.

Los empleados dados de baja no aparecen en el listado activo.

---

# 14. STOCK

Mostrar los productos de la sucursal.

Cada producto debe mostrar:

* nombre;
* cantidad;
* stock de seguridad;
* estado.

Estados:

* normal;
* bajo;
* agotado.

Utilizar indicadores visuales coherentes con las alertas.

Al gerente debe permitírsele actualizar las cantidades.

Al actualizar stock:

1. guardar el nuevo valor;
2. recalcular estado;
3. crear alerta automática si corresponde;
4. resolver automáticamente la alerta anterior si la condición dejó de existir.

---

# 15. INFORMACIÓN FINANCIERA

El gerente debe poder actualizar:

* ventas del mes;
* ventas del año;
* ganancias netas del mes;
* ganancias netas del año.

El supervisor solamente puede visualizar estos datos.

Al actualizar las finanzas mensuales:

1. guardar datos;
2. recalcular margen;
3. recalcular estado financiero;
4. crear o actualizar alerta automática;
5. resolver automáticamente la alerta si la situación vuelve a la normalidad.

---

# 16. DASHBOARD COMPARATIVO

Cuando el supervisor selecciona varias sucursales, mostrar una pantalla comparativa.

El título debe indicar las sucursales seleccionadas.

Ejemplo:

"Comparación: Centro, Constitución y Güemes"

Comparar como mínimo:

* ventas mensuales;
* ventas anuales;
* ganancias netas mensuales;
* ganancias netas anuales;
* margen neto.

La comparación debe ser clara y directa.

Puede utilizarse:

* tabla comparativa;
* tarjetas;
* gráficos simples si aportan valor.

No sobrecargar visualmente.

---

# 17. EMPLEADOS EN COMPARACIÓN

Cada sucursal debe tener su propia sección de empleados.

Las secciones deben estar:

**cerradas por defecto.**

El supervisor puede abrirlas individualmente.

Ejemplo:

Sucursal Centro
[Empleados ▼]

Sucursal Constitución
[Empleados ▼]

Sucursal Güemes
[Empleados ▼]

Al expandir una sección mostrar los empleados activos de esa sucursal.

---

# 18. ALERTAS EN COMPARACIÓN

Las alertas deben aparecer al final del dashboard comparativo.

No mezclarlas con las métricas financieras.

Mostrar cada alerta como tarjeta independiente.

Debe quedar claramente identificada la sucursal correspondiente.

---

# 19. PÁGINA DE ALERTAS

Crear una sección específica:

**Alertas**

Debe mostrar las alertas activas.

Orden obligatorio por gravedad:

1. rojas
2. naranjas
3. amarillas

Dentro de cada grupo, ordenar por fecha descendente.

Cada alerta debe mostrarse aproximadamente como:

`[indicador] [dirección de sucursal] - [mensaje]`

Ejemplo:

🔴 Constitución 2450 - Stock agotado de café molido

Las alertas manuales deben poder expandirse para visualizar el detalle.

---

# 20. RESOLUCIÓN DE ALERTAS

Debe existir una acción:

**Resolver alerta**

Solo usuarios autorizados pueden hacerlo.

Supervisor:

* puede resolver alertas de cualquier sucursal.

Gerente:

* solamente puede resolver alertas de su propia sucursal.

Al resolver:

`estado = resuelta`

Las alertas resueltas no deben aparecer en la lista principal de alertas activas.

No agregar comentarios ni formularios adicionales al resolver.

---

# 21. CREACIÓN DE SUCURSALES

El supervisor debe tener un botón:

**Agregar sucursal**

Crear un formulario con al menos:

* dirección;
* gerente;
* ventas mensuales;
* ventas anuales;
* ganancias netas mensuales;
* ganancias netas anuales.

La sucursal debe crearse activa.

El sistema debe validar correctamente los campos.

No permitir asignar un usuario supervisor como gerente.

---

# 22. ELIMINACIÓN LÓGICA DE SUCURSALES

El supervisor puede eliminar una sucursal.

No debe hacerse DELETE físico de la base de datos.

Debe establecer:

`activa = false`

Las sucursales inactivas:

* no aparecen en el listado normal;
* no aparecen en "Operativas";
* no pueden ser seleccionadas para comparación;
* no deben aparecer como sucursales activas del supervisor.

Conservar los registros históricos.

---

# 23. GERENTE — FLUJO DE USO

Cuando un gerente inicia sesión:

1. validar credenciales;
2. identificar su sucursal;
3. redirigir directamente al dashboard;
4. no mostrar selector de sucursales;
5. no permitir navegar manualmente hacia otra sucursal;
6. mostrar únicamente información de su sucursal.

Desde su dashboard debe poder:

### Empleados

* agregar/contratar;
* editar;
* dar de baja.

### Stock

* actualizar cantidades.

### Finanzas

* actualizar ventas;
* actualizar ganancias.

### Alertas

* crear alertas manuales;
* ver alertas;
* resolver alertas de su sucursal.

---

# 24. DISEÑO VISUAL

La aplicación debe tener aspecto de software empresarial real.

No quiero una landing page ni un diseño excesivamente creativo.

Inspiración:

* dashboards corporativos;
* sistemas administrativos;
* software de gestión empresarial.

## Estilo

* fondo gris muy claro;
* sidebar azul marino oscuro;
* tarjetas blancas;
* bordes sutiles;
* azul corporativo como color principal;
* tipografía Inter o similar;
* iconografía outline;
* radios moderados, aproximadamente 8 px;
* sombras muy sutiles;
* buen espaciado;
* jerarquía visual clara.

Colores:

* azul → acciones principales;
* verde → estado normal;
* rojo → crítico;
* naranja → advertencia financiera;
* amarillo → advertencia de stock.

No utilizar rojo/naranja/amarillo como decoración.

---

# 25. PRINCIPIOS UX

Seguir el principio:

**Find → Understand → Act**

El usuario debe poder:

1. encontrar rápidamente una sucursal;
2. entender su situación;
3. actuar si tiene permisos.

Aplicar:

* progressive disclosure;
* información importante primero;
* alertas visibles;
* métricas financieras destacadas;
* comparación directa;
* secciones secundarias colapsadas;
* empleados cerrados por defecto;
* mensajes de error claros;
* estados de loading;
* estados vacíos;
* confirmaciones para acciones destructivas;
* feedback visual después de guardar.

No agregar animaciones innecesarias.

---

# 26. RESPONSIVE

Diseño principalmente orientado a desktop porque es una aplicación empresarial.

Sin embargo, debe ser responsive.

En pantallas pequeñas:

* sidebar adaptable;
* tarjetas apiladas;
* tablas con scroll horizontal;
* botones accesibles;
* no romper el layout.

---

# 27. VALIDACIONES

Implementar validaciones tanto frontend como backend.

Validar:

* campos obligatorios;
* números;
* valores monetarios;
* cantidades de stock;
* DNI;
* roles;
* permisos;
* relaciones entre sucursal y gerente.

Nunca confiar exclusivamente en las validaciones del frontend.

---

# 28. MANEJO DE ERRORES

La aplicación debe manejar correctamente:

* credenciales incorrectas;
* sesión expirada;
* usuario sin permisos;
* sucursal inexistente;
* sucursal inactiva;
* empleado inexistente;
* errores de validación;
* errores de API;
* errores de base de datos.

Mostrar mensajes comprensibles al usuario.

No mostrar stack traces al usuario final.

---

# 29. DATOS MOCK / SEED

Crear datos ficticios suficientes para poder demostrar todas las funcionalidades.

Como mínimo:

### Usuarios

* al menos 1 supervisor;
* varios gerentes.

### Sucursales

* varias sucursales;
* distintos gerentes;
* diferentes valores financieros;
* diferentes cantidades de empleados;
* diferentes situaciones de stock.

### Empleados

Crear varios empleados por sucursal.

Incluir variedad en:

* roles;
* sueldos;
* asistencias;
* faltas;
* antigüedad;
* edades.

### Stock

Crear productos con:

* stock normal;
* stock bajo;
* stock agotado.

### Finanzas

Crear sucursales con:

* margen normal;
* margen menor al 10%;
* ganancias negativas o cero.

### Alertas

Debe haber:

* alertas rojas;
* alertas naranjas;
* alertas amarillas;
* alertas manuales;
* alertas automáticas.

Los datos deben permitir demostrar:

* login supervisor;
* login gerente;
* selección individual;
* comparación;
* búsqueda;
* filtros;
* alertas;
* edición de empleados;
* alta;
* baja lógica;
* actualización de stock;
* alertas automáticas;
* actualización financiera;
* alertas financieras;
* creación de alertas manuales;
* resolución de alertas;
* creación de sucursal.

Incluir credenciales de prueba en el README.

---

# 30. API

Crear una API REST clara y organizada.

Como referencia, pueden existir endpoints similares a:

## Auth

`POST /auth/login`

## Sucursales

`GET /branches`
`POST /branches`
`GET /branches/{id}`
`PUT /branches/{id}`
`DELETE /branches/{id}`

El DELETE debe realizar eliminación lógica.

## Empleados

`GET /branches/{id}/employees`
`POST /branches/{id}/employees`
`GET /employees/{id}`
`PUT /employees/{id}`
`DELETE /employees/{id}`

El DELETE debe realizar baja lógica.

## Stock

`GET /branches/{id}/stock`
`PUT /branches/{id}/stock/{stock_id}`

## Finanzas

`GET /branches/{id}/finances`
`PUT /branches/{id}/finances`

## Alertas

`GET /alerts`
`GET /alerts/{id}`
`POST /alerts`
`PATCH /alerts/{id}/resolve`

Los nombres exactos pueden adaptarse si existe una estructura REST mejor, pero deben mantenerse las mismas capacidades y permisos.

---

# 31. ARQUITECTURA DEL BACKEND

Organizar FastAPI de forma mantenible.

Separar, como mínimo:

* routers;
* models;
* schemas;
* services;
* database;
* authentication/security;
* dependencies;
* business logic.

La lógica de generación y resolución de alertas debe estar centralizada en servicios reutilizables.

No duplicar reglas de negocio en múltiples endpoints.

---

# 32. ARQUITECTURA DEL FRONTEND

Organizar React de manera mantenible.

Separar:

* páginas;
* componentes;
* layouts;
* hooks;
* servicios/API;
* tipos TypeScript;
* autenticación;
* estado;
* componentes reutilizables.

Crear componentes reutilizables para:

* sidebar;
* cards;
* KPI;
* alertas;
* tablas;
* modales;
* formularios;
* filtros;
* selector de sucursales;
* secciones colapsables.

---

# 33. SEGURIDAD

Implementar buenas prácticas razonables:

* contraseñas hasheadas;
* autenticación mediante token;
* autorización por rol;
* autorización por sucursal;
* validación backend;
* evitar exposición innecesaria de información;
* no guardar contraseñas en frontend;
* variables sensibles mediante `.env`;
* CORS correctamente configurado para desarrollo.

Nunca confiar en valores enviados por el frontend para determinar:

* usuario actual;
* rol;
* sucursal del gerente.

Esos datos deben obtenerse del contexto autenticado del backend.

---

# 34. EXPERIENCIA DEL USUARIO

Agregar estados:

* loading;
* vacío;
* error;
* éxito;
* confirmación.

Ejemplo:

Después de actualizar stock:

"Stock actualizado correctamente."

Después de crear una alerta:

"Alerta creada correctamente."

Antes de eliminar una sucursal:

"¿Seguro que deseas eliminar esta sucursal? La eliminación será lógica."

---

# 35. ESTRUCTURA DE PROYECTO

Propón y crea una estructura clara, por ejemplo:

`/frontend`
`/backend`
`/database`
`/docs`

Dentro del backend separar responsabilidades.

Dentro del frontend separar páginas y componentes.

Incluir:

* Dockerfiles;
* docker-compose.yml;
* `.env.example`;
* README;
* migraciones;
* seed.

---

# 36. README

Crear un README completo que explique:

* qué es BranchView;
* tecnologías utilizadas;
* arquitectura;
* cómo levantar el proyecto;
* variables de entorno;
* cómo ejecutar migraciones;
* cómo cargar datos iniciales;
* credenciales de prueba;
* usuarios disponibles;
* roles;
* endpoints principales;
* estructura del proyecto.

La experiencia para ejecutar el proyecto debe ser sencilla.

Idealmente:

`docker compose up --build`

y luego la aplicación debe estar disponible.

---

# 37. CALIDAD DEL CÓDIGO

Quiero código:

* limpio;
* modular;
* mantenible;
* tipado;
* razonablemente documentado;
* sin duplicación innecesaria;
* con nombres claros.

No crear una única página gigante con toda la lógica.

No colocar toda la lógica de negocio en componentes React.

No colocar todas las operaciones del backend en un único archivo.

---

# 38. REGLAS IMPORTANTES DE IMPLEMENTACIÓN

Estas reglas son obligatorias:

1. El backend es la autoridad para permisos.
2. Los gerentes solo pueden acceder a su sucursal.
3. Los supervisores pueden acceder a todas las sucursales activas.
4. Las sucursales se eliminan lógicamente.
5. Los empleados se eliminan lógicamente.
6. Los estados de stock se calculan, no se almacenan.
7. Las alertas automáticas no deben duplicarse.
8. Las alertas automáticas se resuelven automáticamente cuando desaparece la condición.
9. Las alertas manuales solo se resuelven explícitamente.
10. Los empleados deben estar colapsados por defecto.
11. El selector de sucursales solo aparece para supervisores.
12. Los gerentes entran directamente a su dashboard.
13. La página de alertas ordena por gravedad: roja → naranja → amarilla.
14. Las alertas manuales muestran detalle expandible.
15. La aplicación debe funcionar realmente de extremo a extremo.

---

# 39. CRITERIO DE ÉXITO

Consideraré que BranchView está correctamente implementado si puedo realizar este flujo:

## Supervisor

1. iniciar sesión;
2. ver las sucursales;
3. buscar una sucursal;
4. filtrar por operativas;
5. filtrar por sucursales con alerta;
6. seleccionar una;
7. ver su dashboard;
8. consultar finanzas;
9. abrir empleados;
10. consultar stock;
11. ver alertas;
12. volver;
13. seleccionar varias sucursales;
14. comparar sus finanzas;
15. abrir los empleados de cada sucursal;
16. revisar alertas;
17. crear una nueva sucursal;
18. eliminar una sucursal lógicamente;
19. resolver una alerta.

## Gerente

1. iniciar sesión;
2. entrar directamente a su sucursal;
3. ver dashboard;
4. editar un empleado;
5. contratar/agregar empleado;
6. dar de baja un empleado;
7. modificar stock;
8. provocar una alerta de stock;
9. corregir el stock;
10. comprobar que la alerta se resuelve;
11. modificar finanzas;
12. provocar una alerta financiera;
13. corregir las finanzas;
14. comprobar que se resuelve;
15. crear una alerta manual;
16. consultar su detalle;
17. resolverla;
18. comprobar que no puede acceder a otra sucursal.

---

# 40. FORMA DE TRABAJO

No sacrifiques funcionalidad por estética ni estética por funcionalidad.

Primero construye una base funcional sólida y luego aplica el diseño visual.

Antes de terminar:

1. verifica que la base de datos se cree correctamente;
2. ejecuta las migraciones;
3. carga el seed;
4. verifica el login;
5. verifica los permisos de ambos roles;
6. verifica CRUD de sucursales;
7. verifica CRUD/baja lógica de empleados;
8. verifica stock;
9. verifica finanzas;
10. verifica alertas automáticas;
11. verifica alertas manuales;
12. verifica resolución automática;
13. verifica resolución manual;
14. verifica comparación;
15. verifica filtros;
16. verifica Docker.

Si detectas un problema de implementación, corrígelo antes de considerar terminado el proyecto.

No dejes funcionalidades simuladas con botones que no hagan nada.

No reemplaces la base de datos por datos hardcodeados.

No implementes únicamente el frontend.

---

# 41. PRIORIDAD FINAL

Prioriza en este orden:

1. funcionamiento completo;
2. seguridad y permisos;
3. modelo de datos correcto;
4. lógica de negocio y alertas;
5. experiencia de usuario;
6. diseño visual;
7. documentación.

El resultado debe parecer una aplicación empresarial real y funcional, no una maqueta.

Construye BranchView completo siguiendo esta especificación.


# AMPLIACIÓN DEL MÓDULO FINANCIERO — BRANCHVIEW

Ya existe una especificación y una implementación inicial de BranchView.

Quiero que ahora amplíes el sistema para convertir el módulo financiero en un sistema con **historial, análisis y visualizaciones**, manteniendo todas las funcionalidades, permisos y reglas existentes.

No reemplaces la aplicación actual por un prototipo. Modifica la arquitectura existente de forma coherente y mantén funcionando todo lo que ya está implementado.

---

# 1. OBJETIVO

Actualmente la aplicación maneja:

* ventas mensuales;
* ventas anuales;
* ganancias netas mensuales;
* ganancias netas anuales.

Quiero conservar esos datos para los KPIs actuales, pero agregar un **historial financiero mensual por sucursal**.

Esto permitirá:

* analizar la evolución de una sucursal;
* detectar meses de mayor y menor facturación;
* analizar rentabilidad;
* comparar sucursales;
* visualizar tendencias;
* obtener gráficos históricos;
* calcular indicadores financieros.

---

# 2. NUEVA TABLA: FINANZAS MENSUALES

Agregar una nueva tabla:

`finanzas_mensuales`

Campos mínimos:

* `id`
* `id_sucursal`
* `anio`
* `mes`
* `ventas`
* `costo_ventas`
* `gastos_operativos`
* `ganancias_brutas`
* `ganancias_netas`
* `margen_bruto`
* `margen_neto`

Relación:

`id_sucursal → sucursal.id`

Debe existir una relación de una sucursal con muchos registros financieros mensuales.

Crear la migración correspondiente con Alembic.

---

# 3. REGLAS DE CÁLCULO

No permitir que el frontend sea la autoridad para calcular indicadores financieros.

El backend debe calcular los valores derivados.

## Ganancia bruta

`ganancias_brutas = ventas - costo_ventas`

## Ganancia neta

`ganancias_netas = ganancias_brutas - gastos_operativos`

## Margen bruto

Si `ventas > 0`:

`margen_bruto = ganancias_brutas / ventas * 100`

Si `ventas = 0`:

manejar el caso evitando división por cero.

## Margen neto

Si `ventas > 0`:

`margen_neto = ganancias_netas / ventas * 100`

Si `ventas = 0`:

manejar el caso evitando división por cero.

Los valores monetarios deben utilizar tipos apropiados para dinero y evitar errores de precisión por utilizar floats cuando no corresponda.

---

# 4. CONSERVAR LOS DATOS ACTUALES

No eliminar de `sucursal`:

* `ventas_mes`
* `ventas_anio`
* `ganancias_netas_mes`
* `ganancias_netas_anio`

Continuarán utilizándose para los KPIs principales del dashboard.

Sin embargo, el historial de evolución debe obtenerse desde `finanzas_mensuales`.

Los valores actuales pueden actualizarse desde el registro correspondiente al período actual cuando el gerente modifica las finanzas.

Mantener una única fuente de verdad coherente y evitar inconsistencias entre el historial y los KPIs actuales.

---

# 5. DATOS HISTÓRICOS

Modificar el seed/mock data para generar datos financieros históricos realistas.

Cada sucursal debe tener al menos:

**24 meses de historial financiero**

preferentemente correspondientes a los últimos dos años.

Los datos deben ser ficticios.

No generar números completamente aleatorios sin sentido.

Los datos deben representar escenarios plausibles:

* meses de crecimiento;
* meses de caída;
* meses de alta facturación;
* meses de baja facturación;
* diferentes niveles de costos;
* diferentes márgenes;
* sucursales con mejor rendimiento;
* sucursales con peor rendimiento.

Debe haber suficiente variación para que los gráficos sean visualmente útiles.

---

# 6. INFORMACIÓN FINANCIERA DEL DASHBOARD

En el dashboard individual de una sucursal mantener los KPIs principales:

* ventas mensuales;
* ventas anuales;
* ganancias netas mensuales;
* ganancias netas anuales;
* margen neto mensual.

Agregar también:

* ganancias brutas;
* margen bruto;
* costo de ventas;
* gastos operativos.

Los KPIs deben aparecer como tarjetas visuales.

No utilizar tablas HTML como forma principal de presentar estos indicadores.

---

# 7. GRÁFICOS DEL DASHBOARD INDIVIDUAL

Agregar una sección:

**Análisis financiero**

Utilizar gráficos apropiados.

## Gráfico 1 — Evolución de ventas

Tipo:

**line chart**

Mostrar las ventas de cada mes del período seleccionado.

Por defecto:

últimos 12 meses.

Permitir cambiar el período cuando sea razonable:

* últimos 6 meses;
* últimos 12 meses;
* últimos 24 meses.

---

## Gráfico 2 — Ventas y ganancias

Tipo:

**line chart**

Mostrar:

* ventas;
* ganancias netas.

por mes.

Debe permitir detectar si el crecimiento de ventas está acompañado por crecimiento de ganancias.

---

## Gráfico 3 — Margen neto

Tipo:

**line chart**

Mostrar:

* margen neto mensual.

Esto permite identificar períodos donde la rentabilidad disminuye.

---

## Gráfico 4 — Costos y gastos

Tipo:

**bar chart**

Comparar por mes:

* costo de ventas;
* gastos operativos.

No sobrecargar el gráfico.

---

# 8. MEJORES Y PEORES MESES

Agregar una sección de resumen financiero.

Calcular automáticamente:

* mes con mayor cantidad de ventas;
* mes con menor cantidad de ventas;
* mes con mayor ganancia neta;
* mes con menor ganancia neta;
* promedio mensual de ventas;
* promedio mensual de ganancias;
* crecimiento respecto al período anterior.

Ejemplo visual:

**Mejor mes de ventas**
Noviembre — $1.250.000

**Peor mes de ventas**
Febrero — $730.000

**Mejor mes de ganancias**
Noviembre — $240.000

No hardcodear estos valores.

Deben calcularse desde el historial.

---

# 9. FILTRO TEMPORAL

El usuario debe poder seleccionar el período del análisis.

Como mínimo:

* últimos 6 meses;
* últimos 12 meses;
* últimos 24 meses.

Si resulta apropiado, permitir seleccionar:

* año;
* rango de fechas.

Todos los gráficos deben actualizarse utilizando el período seleccionado.

---

# 10. COMPARACIÓN DE SUCURSALES

Modificar completamente el dashboard comparativo.

Actualmente no quiero que la información financiera principal se presente mediante una tabla HTML.

La comparación debe utilizar gráficos.

---

# 11. GRÁFICO DE VENTAS POR SUCURSAL

Utilizar:

**bar chart**

Comparar las ventas de las sucursales seleccionadas.

El usuario debe poder elegir el período:

* mes actual;
* últimos 6 meses;
* últimos 12 meses;
* últimos 24 meses.

Para períodos largos, utilizar valores agregados de forma apropiada, pero no destruir la posibilidad de analizar la evolución temporal.

---

# 12. GRÁFICO DE GANANCIAS NETAS POR SUCURSAL

Utilizar:

**bar chart**

Mostrar las ganancias netas por sucursal para el período seleccionado.

Debe permitir identificar rápidamente:

* mejor sucursal;
* peor sucursal.

---

# 13. EVOLUCIÓN DE SUCURSALES

Agregar:

**line chart**

Una línea por sucursal.

Eje X:

meses.

Eje Y:

ventas.

Esto permitirá comparar visualmente la evolución de las sucursales.

No reemplazar esto por una tabla.

---

# 14. COMPARACIÓN DE MÁRGENES

Agregar un gráfico apropiado para comparar:

* margen neto;
* margen bruto.

por sucursal.

Utilizar un gráfico de barras si facilita la comparación.

---

# 15. RANKING DE SUCURSALES

Agregar una sección de ranking visual.

Mostrar:

1. sucursal con mayor venta;
2. siguiente;
3. siguiente;
4. etc.

Utilizar un gráfico de barras horizontal cuando haya muchas sucursales.

No utilizar una tabla HTML como elemento principal.

---

# 16. ALERTAS FINANCIERAS

Mantener las reglas existentes:

### Normal

margen neto >= 10%

### Naranja

margen neto < 10%

### Roja

ganancias netas <= 0

La alerta roja tiene prioridad.

Estas reglas deben continuar funcionando con los datos financieros actuales.

Al modificar las finanzas del período actual:

1. actualizar los datos;
2. recalcular indicadores;
3. verificar reglas de alerta;
4. crear o actualizar alerta automática;
5. resolver automáticamente la alerta si la condición deja de cumplirse.

No generar alertas duplicadas.

---

# 17. ACTUALIZACIÓN FINANCIERA DEL GERENTE

El gerente debe poder modificar los datos financieros correspondientes al período actual.

Debe poder actualizar:

* ventas;
* costo de ventas;
* gastos operativos.

Los valores derivados:

* ganancias brutas;
* ganancias netas;
* margen bruto;
* margen neto;

deben calcularse en backend.

No pedir al gerente que introduzca manualmente ganancias calculadas.

---

# 18. HISTORIAL FINANCIERO

Agregar una sección donde el gerente pueda consultar el historial financiero de su sucursal.

Puede mostrar:

* mes;
* ventas;
* costos;
* gastos;
* ganancias;
* márgenes.

Pero si existe una tabla para consultar datos detallados, que sea secundaria.

La visualización principal debe continuar siendo gráfica.

El supervisor podrá consultar el historial de cualquier sucursal activa.

---

# 19. GRÁFICOS — REGLA GENERAL

No utilizar gráficos arbitrariamente.

Elegir el gráfico según el objetivo:

### Line chart

Para:

* evolución temporal;
* ventas por mes;
* ganancias por mes;
* márgenes;
* crecimiento.

### Bar chart

Para:

* comparar sucursales;
* rankings;
* mejor/peor sucursal;
* comparar costos;
* comparar ganancias.

### Pie chart

Utilizar solamente si existe una verdadera relación de partes de un total.

No utilizar pie charts para series temporales.

No agregar gráficos solamente para decorar.

Cada gráfico debe responder una pregunta concreta.

---

# 20. DISEÑO DE LOS GRÁFICOS

Los gráficos deben integrarse con el diseño empresarial existente.

No utilizar gráficos gigantes.

Cada gráfico debe estar dentro de una tarjeta limpia.

Mostrar:

* título;
* breve descripción si ayuda;
* ejes legibles;
* tooltip;
* leyenda cuando corresponda;
* formato monetario;
* período analizado.

Los valores monetarios deben mostrarse correctamente.

Ejemplo:

`$1,25 M`

cuando el valor sea suficientemente grande.

Evitar saturar el dashboard.

---

# 21. RESPONSIVE

Los gráficos deben adaptarse al tamaño disponible.

En desktop:

* utilizar grids de 2 columnas cuando corresponda;
* permitir que gráficos importantes ocupen mayor espacio.

En móvil:

* apilar gráficos;
* mantener tooltips utilizables;
* evitar que las etiquetas se corten.

---

# 22. BACKEND / API

Agregar endpoints para consultar historial financiero.

Por ejemplo:

`GET /branches/{id}/finances/history`

Parámetros opcionales:

* `from`
* `to`
* `months`

Agregar endpoint para actualizar las finanzas del período actual.

Por ejemplo:

`PUT /branches/{id}/finances/current`

Los nombres exactos pueden adaptarse a la arquitectura existente.

El backend debe devolver datos preparados para que el frontend pueda generar los gráficos.

---

# 23. PERMISOS

Mantener las reglas existentes.

### Supervisor

Puede:

* consultar finanzas de cualquier sucursal activa;
* consultar historial;
* comparar sucursales.

No puede modificar finanzas.

### Gerente

Puede:

* consultar únicamente su sucursal;
* modificar únicamente las finanzas de su sucursal;
* consultar su historial.

No puede consultar ni modificar otra sucursal.

La autorización debe verificarse en backend.

---

# 24. CREACIÓN DE UNA NUEVA SUCURSAL

Modificar el flujo de creación de sucursal.

Cuando el supervisor crea una sucursal, debe poder definir:

* dirección;
* gerente;
* datos financieros iniciales.

Los datos iniciales deben incluir:

* ventas actuales;
* ventas anuales;
* ganancias netas actuales;
* ganancias netas anuales.

Además, crear automáticamente el registro financiero correspondiente al período actual en `finanzas_mensuales`.

No crear una sucursal sin información financiera coherente.

---

# 25. SEED

Actualizar completamente el seed.

Cada sucursal debe tener:

* datos actuales;
* historial de 24 meses;
* diferentes tendencias financieras;
* diferentes márgenes;
* diferentes niveles de ventas.

Crear escenarios intencionales.

Ejemplo:

### Sucursal A

Crecimiento constante.

### Sucursal B

Ventas altas pero margen bajo.

### Sucursal C

Ventas medias pero excelente margen.

### Sucursal D

Caída de ventas durante los últimos meses.

### Sucursal E

Problemas financieros y alerta roja.

Esto debe hacer que los gráficos sean interesantes y permitan demostrar el sistema.

---

# 26. DASHBOARD — PRINCIPIO GENERAL

El dashboard no debe convertirse en una pantalla llena de tablas.

La información financiera debe priorizar:

1. KPIs;
2. tendencias;
3. comparaciones;
4. alertas;
5. detalles bajo demanda.

Utilizar progressive disclosure.

Los datos detallados pueden estar disponibles mediante secciones expandibles o vistas secundarias.

---

# 27. TABLAS HTML

No eliminar completamente las tablas del sistema.

Pueden utilizarse cuando sean apropiadas para:

* datos detallados;
* empleados;
* stock;
* historial preciso;
* información que requiera lectura exacta.

Pero:

**NO utilizar una tabla HTML como representación principal de las comparaciones financieras.**

Cuando el usuario necesita comparar números, priorizar gráficos.

---

# 28. CONSISTENCIA DE DATOS

Prestar especial atención a que:

* los KPIs actuales;
* el historial;
* las ganancias;
* los márgenes;
* las alertas;

sean coherentes entre sí.

No permitir que el frontend muestre valores derivados diferentes a los calculados por backend.

Centralizar la lógica financiera en servicios del backend.

---

# 29. MIGRACIONES

Crear la migración Alembic necesaria.

No modificar manualmente la base de datos de forma que quede fuera de las migraciones.

La aplicación debe poder ser desplegada desde cero mediante:

1. creación de PostgreSQL;
2. migraciones;
3. seed.

Verificar que `docker compose up --build` continúe funcionando.

---

# 30. PRUEBAS

Agregar o ejecutar pruebas para verificar como mínimo:

* cálculo de ganancias brutas;
* cálculo de ganancias netas;
* cálculo de margen bruto;
* cálculo de margen neto;
* ventas = 0;
* ganancias negativas;
* alerta financiera roja;
* alerta financiera naranja;
* resolución automática de alerta;
* consulta de historial;
* filtros temporales;
* permisos del gerente;
* permisos del supervisor;
* creación de sucursal con finanzas iniciales.

---

# 31. RESULTADO ESPERADO

Al finalizar, BranchView debe sentirse como un verdadero sistema de gestión empresarial.

El supervisor debería poder entrar a una sucursal y entender rápidamente:

* cuánto vende;
* cuánto gana;
* cuánto le cuesta operar;
* cómo evolucionó durante los últimos meses;
* cuáles fueron sus mejores meses;
* cuáles fueron sus peores meses;
* si está creciendo o cayendo;
* si tiene problemas de rentabilidad.

Y al comparar sucursales debe poder entender rápidamente:

* cuál vende más;
* cuál gana más;
* cuál tiene mejor margen;
* cuál está creciendo;
* cuál está empeorando.

La información debe comunicarse principalmente mediante:

**KPIs + gráficos + alertas**

y no mediante grandes tablas HTML.

Implementá todos estos cambios sobre la aplicación existente, manteniendo las funcionalidades anteriores y verificando que frontend, backend y base de datos continúen funcionando correctamente.
