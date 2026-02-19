# La Terraza — Restaurant Reservations API

API para gestión de áreas, mesas, disponibilidad por franjas horarias y reservas.  
**Horario:** 16:00–00:00 (todos los días). Reglas: slots 15 min, duraciones 90/120/180 min, min 45 min de antelación, max 4 días, VIP A+B, límites por área, cancelación con multa 50% y RD$700 por persona.

---

## 1. Estructura del repo

```
/openapi.yml          ← contrato API First (endpoints, body, respuestas, errores)
/data/seed.json       ← data inicial: áreas + mesas + reglas (para arrancar el sistema)
/data/sample_requests.json   ← ejemplos de requests (QA, equipo, tests)
/data/postman_collection.json   ← (opcional) colección Postman
/README.md            ← este archivo
/server.js             ← servidor Express que expone Swagger UI en /docs
```

---

## 2. Para qué sirve cada archivo

| Archivo | Uso |
|--------|-----|
| **openapi.yml** | Contrato API First. Define endpoints, body, respuestas y errores. Swagger UI lo usa en `/docs`. |
| **data/seed.json** | Data inicial. El backend la carga con `POST /seed` en “colección en memoria”. Si ya se ejecutó una vez, responde `409 Already seeded`. |
| **data/sample_requests.json** | Ejemplos reales de requests: availability y reservas (incl. VIP 6 A+B, cancelación con multa). Para QA, equipo y tests de integración. |

---

## 3. Cómo usarlo en el backend (Node + Express)

### A) Swagger UI en el deploy

Ya está configurado en este repo:

- `npm i swagger-ui-express yamljs express`
- `server.js` carga `openapi.yml` y expone Swagger en **`/docs`** (y en `/api-docs`).

Al desplegar en Railway (o cualquier host), **GET /docs** mostrará la documentación interactiva en la URL pública.

```bash
npm start
# Abre http://localhost:3000/docs
```

### B) Seed (cargar áreas / mesas / reglas)

El endpoint **POST /seed** debe leer `data/seed.json` y cargarlo en tu “colección en memoria” (objetos/arrays en el proceso). Si ya se ejecutó el seed, responder **409 Already seeded**.

### C) Probar sin frontend

Desde Swagger UI (`/docs`) puedes ejecutar:

- **GET /areas**
- **GET /availability** (comprobar redondeo 7→8, ventana horaria, etc.)
- **POST /reservations** (comprobar bloqueo de slots, VIP A+B como candidato)

---

## 4. Cómo usar los sample_requests

- **Opción 1 (rápida):** Importar `openapi.yml` en Postman (genera la collection). Luego copiar los ejemplos de `data/sample_requests.json` para ejecutar a mano.
- **Opción 2 (recomendada):** Tests automáticos que leen `data/seed.json` para iniciar el estado y usan `data/sample_requests.json` para hacer requests reales (tests de integración).

---

## 5. Colección en memoria (Railway)

Para entregar está bien usar solo memoria. Ten en cuenta:

- Si Railway reinicia el proceso, se pierde todo.
- Por eso existe **POST /seed**: puedes volver a cargar la data en segundos.
- Más adelante puedes migrar a Postgres manteniendo el mismo contrato (openapi.yml).

---

## 6. Flujo recomendado (paso a paso)

1. Copiar/confirmar archivos en el repo (openapi, data/seed, data/sample_requests).
2. Implementar **GET /health** y **GET /docs** (Swagger UI).
3. Implementar **POST /seed** con `data/seed.json`.
4. Implementar **GET /availability** con **candidatos exactos** (IDs de mesas / combo VIP A+B).
5. Implementar **POST /reservations** bloqueando slots desde Pending.
6. Implementar **GET /reservations** y **PATCH /reservations/{id}/status**.
7. Deploy backend en Railway y frontend (p. ej. Vercel).

**Siguiente paso:** implementar el backend que cumpla el contrato. Si quieres, en el próximo paso se puede añadir el **esqueleto del backend** (carpetas, modelos en memoria y lógica de slots) basado exactamente en este contrato.

---

## 7. Uso rápido (referencia)

- **Health:** `GET /health`
- **Seed:** `POST /seed` (200 = OK, 409 = ya cargado)
- **Disponibilidad:** `GET /availability?date=2026-02-18&startTime=20:00&partySize=7&durationMin=90&areaPreference=TERRACE`
- **Reservas:** `POST /reservations` (body según OpenAPI; requiere `Authorization: Bearer <JWT>`)

Más ejemplos en `data/sample_requests.json`.

---

## Licencia

Uso educativo / proyecto Alterna Academy.
