# Plataforma de incidentes

Aplicación de registro de incidentes de seguridad. El frontend es HTML, CSS y JavaScript modular; el backend es una API Express que utiliza Prisma 7 y PostgreSQL.

El procedimiento visual paso a paso está en [CUADERNO_DESPLIEGUE.html](./CUADERNO_DESPLIEGUE.html).

## Arquitectura

El backend organiza la autenticación y los incidentes con el patrón MVC:

- **Vista:** `FRON_END/` contiene las páginas y scripts del navegador.
- **Rutas:** `BACK-END/routers/` declara las rutas HTTP y los middlewares.
- **Controladores:** `BACK-END/controllers/` valida solicitudes y construye las respuestas.
- **Modelos:** `BACK-END/modelos/` consulta y modifica los datos.
- **Middleware:** `BACK-END/middleware/` verifica JWT y permisos.

### Flujo MVC de autenticación

1. `POST /login` llega a `routers/autenticacion.routes.js`.
2. `controllers/autenticacion.controller.js` valida correo y clave, solicita el usuario al modelo y firma un JWT sin incluir la clave ni su hash.
3. `modelos/usuarios.model.js` busca el usuario por correo. Los usuarios de demostración se mantienen en memoria.
4. `GET /sesion` verifica el JWT mediante `middleware/verificar_token.js` y devuelve el correo y rol del usuario autenticado.

El registro de incidentes sigue el mismo flujo: las rutas delegan en `controllers/incidentes.controller.js`, que valida la solicitud y utiliza `modelos/incidentes.model.js` para persistir en Prisma.

## Funciones

- Inicio de sesión con JWT y control de acceso por rol.
- Crear, listar, filtrar, consultar, actualizar y eliminar incidentes.
- Adjuntar una imagen o un video al crear un incidente. Se admiten JPG, PNG, GIF, WebP, MP4, WebM y MOV, con un máximo de 25 MB por archivo.
- Los archivos se guardan en `BACK-END/uploads/`, carpeta excluida de Git. La descarga se realiza por una ruta protegida con JWT.
- Las respuestas HTTP superiores al umbral configurado usan compresión gzip/deflate.

## Requisitos y configuración

Se requiere Node.js, npm y una base PostgreSQL accesible. Configura `BACK-END/.env` a partir de `BACK-END/.env.example` con:

- `DATABASE_URL`: conexión a la base de datos.
- `JWT_SECRET`: secreto usado para firmar JWT y proteger el certificado HTTPS local.

En desarrollo, si existe `BACK-END/certs/localhost.pfx`, su frase de paso debe coincidir con `JWT_SECRET` y el servidor usa HTTPS. En producción Render termina HTTPS y Node usa el puerto `PORT` que proporciona la plataforma. No publiques el archivo `.env`, el certificado ni los archivos de `uploads`.

## Instalación y ejecución

Desde PowerShell, en la raíz del proyecto:

```powershell
cd BACK-END
npm install
npx prisma generate
npx prisma migrate deploy
npm run lint
npm test -- --test-force-exit --test-reporter=spec
npm start
```

El backend se inicia en `https://localhost:3000` con el certificado local, o en HTTP si no existe; `PORT` puede cambiar el puerto. El mismo servidor Express entrega el frontend estático desde `FRON_END/`.

## Despliegue en Render

El archivo `render.yaml` define el Web Service y reutiliza una base PostgreSQL
existente. Al crear un Blueprint desde el repositorio, Render ejecuta `npm ci`,
genera Prisma, aplica las migraciones y arranca el servicio. `JWT_SECRET` se
genera automáticamente.
En el servicio, completa manualmente `DATABASE_URL` con la **Internal Database
URL** de tu base existente; no uses la External URL entre servicios de Render.
Si el frontend se publica en otro dominio, configura `ORIGEN_FRONTEND` con sus
URLs separadas por comas.

Comprueba el despliegue en:

```text
https://<servicio>.onrender.com/salud
```

La respuesta esperada contiene `"baseDeDatos":"conectada"`. No agregues
`DATABASE_URL` ni el Deploy Hook al repositorio.

## Integración continua

`.github/workflows/ci-cd.yml` crea una base PostgreSQL temporal, ejecuta
migraciones, pruebas y lint. Para activar el despliegue continuo después de
pruebas exitosas, guarda el Deploy Hook de Render como el secreto de GitHub
`RENDER_DEPLOY_HOOK`.

## Endpoints principales

| Método | Ruta | Uso |
| --- | --- | --- |
| `POST` | `/login` | Validar credenciales y recibir JWT |
| `GET` | `/sesion` | Consultar el usuario autenticado |
| `GET` | `/incidentes` | Listar o filtrar incidentes |
| `POST` | `/incidentes` | Crear un incidente; acepta `multipart/form-data` y un archivo opcional en el campo `archivo` |
| `GET` | `/incidentes/:id/archivo` | Descargar un adjunto con JWT |
| `GET` | `/incidentes/:id` | Consultar un incidente |
| `PUT` | `/incidentes/:id` | Actualizar datos del incidente |
| `DELETE` | `/incidentes/:id` | Eliminar un incidente; requiere rol administrador |

Los endpoints de incidentes requieren `Authorization: Bearer <token>`.

## Validación

- `npm run lint` analiza JavaScript del backend y frontend con ESLint.
- `npm test -- --test-force-exit --test-reporter=spec` ejecuta las pruebas de reglas de negocio y la prueba de integración de adjuntos.
