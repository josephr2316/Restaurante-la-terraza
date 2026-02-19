# ERD — Modelo de datos (en memoria)

El backend no usa base de datos; las entidades viven en objetos en memoria (`store.js`). Este documento describe las entidades lógicas y sus relaciones para que, si se migra a persistencia, el esquema sea coherente.

---

## Entidades

### Area

- **Descripción:** Zona del restaurante (Terraza, Patio, Lobby, Bar, Salones VIP).
- **Campos clave:**
  - `id` (string, PK): ej. `area_vip`, `area_terrace`.
  - `code` (string): código corto para API y filtros, ej. `VIP`, `TERRACE`.
  - `name` (string): nombre para mostrar.
  - `maxTables` (number): máximo de mesas permitidas en el área (VIP = 3, resto = 8).
- **Relación:** 1 área tiene N mesas (`tables.areaId` → Area.id).
- **Regla:** POST /areas/:areaId/tables falla con 409 si `count(tables where areaId) >= maxTables`.

### Table

- **Descripción:** Mesa física en un área; tiene capacidad y tipo.
- **Campos clave:**
  - `id` (string, PK): ej. `t2_01`, `vip_a`, `vip_round_10`.
  - `areaId` (string, FK → Area.id).
  - `code` (string): ej. `T2-01`, `VIP-A`.
  - `capacity` (number): personas que caben (2, 4, 6, 8 o 10).
  - `tableType` (string): `STANDARD`, `VIP_ROUND`, `VIP_SQUARE`.
  - `isActive` (boolean): si está disponible para asignar.
- **Relación:** N mesas pertenecen a 1 área. Una reserva puede usar 1 o 2 mesas (VIP A+B combo).
- **Reglas:** Capacidad se usa para “redondeo hacia arriba” (7 personas → mesa de 8). VIP cuadradas A y B pueden unirse (comboCapacity 6) según `rules.vipCombo`.

### Reservation

- **Descripción:** Una reserva con fecha, hora, duración, cliente y mesas asignadas.
- **Campos clave:**
  - `id` (string, PK): ej. `rsv_xxx`.
  - `status` (string): `PENDING`, `CONFIRMED`, `CANCELLED`, `EXPIRED`, `NOSHOW`, `COMPLETED`.
  - `date` (string): `YYYY-MM-DD`.
  - `startTime` (string): `HH:mm`.
  - `durationMin` (number): 90, 120 o 180.
  - `partySize` (number): personas.
  - `requiredCapacity` (number): capacidad de mesa asignada (≥ partySize).
  - `areaAssigned` (string): código de área.
  - `tableAssignedIds` (array of string): IDs de mesas (1 o 2 para VIP A+B).
  - `customerName`, `phone`, `email`, `notes`, `occasion`, `source`, etc.
  - `createdAt`, `expiresAt` (para PENDING que expira).
- **Relación:** Una reserva usa 1 o 2 mesas (por `tableAssignedIds`). No hay FK explícito en memoria; la consistencia es “no dos reservas activas usan los mismos tableIds en slots que se solapan”.
- **Reglas:** Solo reservas con status no terminal (PENDING, CONFIRMED) bloquean slots. CANCELLED/EXPIRED/NOSHOW/COMPLETED liberan la mesa para esos slots.

### Rules (configuración global, no entidad “relacional”)

- Horario: `operatingHours.opensAt`, `closesAt`.
- `slotMinutes`: 15.
- `durationsAllowed`, `defaultDuration`, `minLeadMinutes`, `maxDaysAhead`.
- `capacityOptions`: [2,4,6,8,10].
- `vipCombo`: { enabled, aId, bId, comboCapacity }.
- `cancelPolicy`, `pendingExpiryMinutes`, etc.

---

## Diagrama conceptual (texto)

```
Area (1) ----< (N) Table
  |                    |
  |                    |
  +---- Reserva usa 1..2 Table (por tableAssignedIds)
        (evitar solape en slots por mesa)
```

---

## Índices recomendados (si se pasa a BD)

- **reservations:** (date, status), (date, areaAssigned), (tableAssignedIds con GIN o tabla de unión reserva-mesa) para consultas de disponibilidad y “mesas ocupadas en esta franja”.
- **tables:** (areaId) para filtrar mesas por área.
- **areas:** (code) para búsqueda por código en availability.
