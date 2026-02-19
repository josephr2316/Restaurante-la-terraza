# Checklist de entregables — La Terraza

Estado frente al enunciado del gerente (Approach C, sistema publicado, API First, documentación y tests).

---

## Sistema publicado (NO localhost)

| Requisito | Estado | Nota |
|-----------|--------|------|
| API desplegada y accesible | ✅ | `restaurante-la-terraza-production.up.railway.app` |
| Frontend desplegado | ✅ | Vercel (Restaurante-la-terraza-Frontend) |
| GET /health responde 200 | ✅ | `{"status":"ok","time":"..."}` |

---

## API First

| Requisito | Estado | Nota |
|-----------|--------|------|
| Contrato OpenAPI / equivalente | ✅ | `openapi.yml` en raíz |
| Implementación sigue el contrato | ✅ | express-openapi-validator + rutas según openapi |
| Swagger UI expuesto en URL | ✅ | GET /docs en la URL pública |
| Postman Collection | ✅ | `postman/` y `data/postman_collection.json` (si exportado) |

---

## Documentación en repo

| Archivo | Estado | Acción |
|---------|--------|--------|
| README.md | ✅ | Completo: descripción, URL, correr local, Swagger, seed, deploy |
| APPROACH.md | ✅ | Approach C, 3 razones, trade-offs, prioridad cliente |
| ERD.md | ✅ | Área, Mesa, Reserva; campos; reglas VIP/capacidad |
| SEQUENCE.md | ✅ | 2 flujos en texto: POST /reservations, GET /availability |
| EDGE_CASES.md | ✅ | 10 casos borde (Si X → Y → Z) |

---

## Carpeta /tests

| Requisito | Estado | Acción |
|-----------|--------|--------|
| Unit test: no permite solape | ✅ | `tests/unit-solape.test.js` |
| Unit test: normalización capacidad (7→8, etc.) | ✅ | `tests/unit-capacity.test.js` |
| Integration test: crear reserva → availability bloqueada | ✅ | `tests/integration-reserva-bloquea.test.js` |
| Script para correr tests | ✅ | `npm test` (node --test) |

---

## Datos de prueba

| Archivo | Estado | Nota |
|---------|--------|------|
| /data/seed.json | ✅ | Áreas, mesas, reglas (VIP A+B, slots, horario) |
| /data/sample_requests.json | ✅ | Ejemplos reales: 2p, 7p, VIP 6, cancelación, etc. |
| Postman export (opcional) | ✅ | Carpeta `postman/` con collection y environment |

---

## Reglas de negocio (ya implementadas)

- No solape por mesa (slots; fin de una = inicio de otra permitido).
- Capacidad redondea hacia arriba (7→8) vía `roundCapacity` en availability.
- VIP: mesa redonda 10p + mesas cuadradas A/B (solas o combo 6p).
- Límite de mesas por área (maxTables; VIP 3, resto 8); POST /areas/:id/tables valida.
- Errores claros: 400/409/422 según openapi.

---

## Resumen

Los entregables del enunciado están cubiertos: documentación (README, APPROACH, ERD, SEQUENCE, EDGE_CASES), datos (seed.json, sample_requests.json), tests (2 unit + 1 integration) y `npm test`.
