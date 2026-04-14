# Copia de trabajo: produccion y escritorio

## Stack de produccion local

1. Copia `.env.production.example` a `.env.production` y rellena las claves reales.
2. Arranca:

```powershell
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

3. Abre:

```text
http://localhost:8088
```

La UI sale servida por Nginx y `/api` se resuelve contra el backend de produccion.

## Shell de escritorio

1. Instala dependencias:

```powershell
cd desktop
npm install
```

2. Abre la shell apuntando al stack local:

```powershell
$env:EURODENT_DESKTOP_START_URL='http://localhost:8088'
npm run dev
```

3. Genera instalador Windows:

```powershell
npm run dist
```

## Estado actual

- La shell de escritorio ya esta preparada para abrir la copia de trabajo.
- El backend todavia no queda embebido dentro del EXE.
- Para una app clinica empaquetada de verdad faltaria automatizar el arranque del backend local, migraciones, persistencia y actualizaciones.
