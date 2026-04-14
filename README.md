# Eurodent2

Aplicación de gestión clínica dental con frontend en React/Vite y backend en FastAPI. El proyecto cubre agenda, pacientes, presupuestos, facturación, documentos, laboratorio, administración y reporting.

## Estado del proyecto

La base funcional es amplia y ya tiene bastante lógica de negocio real. No es una maqueta simple: hay autenticación por roles, agenda operativa, ficha clínica, generación de PDFs, módulos administrativos y scripts de carga de datos demo.

También hay trabajo pendiente de endurecimiento técnico en algunas áreas, sobre todo validaciones de negocio finas, calidad automática y limpieza estructural del proyecto.

## Roadmap de refactor

La hoja de ruta activa del refactor funcional, visual y normativo esta en [ROADMAP_REFACTOR.md](./ROADMAP_REFACTOR.md).

El objetivo actual es reorganizar el producto en estos modulos:

- Pacientes
- Gestion
- Agenda
- Listados
- Configuracion
- Cumplimiento SIF / VERI*FACTU

## Stack

- Frontend: React, TypeScript, Vite, TanStack Query, Zustand, React Router
- Backend: FastAPI, SQLAlchemy async, Alembic, Pydantic
- Base de datos: PostgreSQL
- Infra de desarrollo: Docker Compose + scripts `.bat`

## Estructura

```text
eurodent2/
├─ frontend/           # App React
├─ backend/            # API FastAPI
├─ docker-compose.yml  # Entorno local con PostgreSQL y servicios dev
├─ ARRANCAR.bat        # Arranque rápido en Windows
└─ PARAR.bat           # Parada rápida en Windows
```

## Funcionalidad principal

- Agenda diaria y semanal
- Gestión de citas, huecos y recordatorios
- Pacientes e historial clínico
- Presupuestos
- Facturación y PDFs
- Documentos adjuntos
- Laboratorio
- Panel de administración
- Reportes y listados

## Requisitos

- Windows con PowerShell
- Docker Desktop
- Python 3.11+
- Node.js 20+
- PostgreSQL disponible vía Docker Compose

## Arranque rápido

La forma más cómoda en este entorno es usar el script de Windows:

```powershell
.\ARRANCAR.bat
```

Eso hace lo siguiente:

1. Levanta PostgreSQL con `docker compose up -d postgres`
2. Arranca el backend en `http://localhost:8000`
3. Arranca el frontend en Vite dev server
4. Abre el navegador

Para parar los servicios:

```powershell
.\PARAR.bat
```

## Arranque manual

### 1. Base de datos

```powershell
docker compose up -d postgres
```

### 2. Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -e ".[dev]"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Healthcheck:

```text
GET http://localhost:8000/api/health
```

### 3. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend en desarrollo:

```text
http://localhost:5173
```

## Variables de entorno

Hay plantillas en:

- `.env.example`
- `backend/.env.example`

Las variables más importantes son:

- `DATABASE_URL`
- `DB_PASSWORD`
- `DB_ENCRYPTION_KEY`
- `JWT_SECRET_KEY`
- `JWT_REFRESH_SECRET_KEY`
- `BACKEND_HOST`
- `BACKEND_PORT`
- `FRONTEND_URL`
- `ENVIRONMENT`

El backend también contempla datos de clínica para PDFs y facturación.

## Datos demo y seeds

El proyecto trae scripts útiles en `backend/scripts/`.

### Crear usuario administrador inicial

```powershell
cd backend
.venv\Scripts\python scripts\seed_admin.py
```

### Cargar demo completa

```powershell
cd backend
.venv\Scripts\python scripts\seed_demo.py
```

Credenciales demo observadas en el script:

- `admin / admin1234`
- `doctor / doctor123`
- `recepcion / recep123`

También existen otros seeds para tratamientos, lista clínica y datos complementarios.

## Base de datos y migraciones

El proyecto incluye Alembic y scripts SQL auxiliares. Antes de trabajar con datos reales conviene revisar:

- cadena de conexión efectiva
- estado de migraciones
- claves de cifrado
- política de backups

## Calidad y scripts

Frontend:

```powershell
cd frontend
npm run dev
npm run build
npm run lint
```

Backend:

```powershell
cd backend
pytest
ruff check .
```

Nota: en este entorno local el build del frontend sí funciona, pero `npm run lint` no está operativo todavía porque falta configurar ESLint. En la `.venv` revisada tampoco estaban disponibles `pytest` ni `ruff` en el momento del análisis.

## Observaciones técnicas

Puntos fuertes:

- alcance funcional amplio
- stack moderno y razonable
- separación clara entre frontend y backend
- lógica de negocio ya bastante avanzada
- enfoque real de clínica, no solo demo visual

Puntos a vigilar:

- algunas reglas de agenda y validación de citas necesitan revisión fina
- hay cálculos/reportes que conviene auditar antes de confiar en ellos para operación
- faltan piezas de calidad base como documentación inicial y tooling completamente cerrado
- hay pantallas grandes que ya piden refactor para mantener velocidad de desarrollo

## Rutas principales

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`
- API health: `http://localhost:8000/api/health`
- Agenda: `/agenda`

## Siguiente paso recomendado

Si se va a seguir desarrollando sobre esta base, el mejor siguiente paso es consolidar tres cosas:

1. fiabilidad de agenda, facturación y reportes
2. calidad de desarrollo: lint, tests, documentación, limpieza del repo
3. refactor progresivo de módulos frontend demasiado grandes
