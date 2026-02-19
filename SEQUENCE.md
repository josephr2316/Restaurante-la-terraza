# SEQUENCE — Diagramas de secuencia

Descripción en texto de los flujos; se pueden volcar a Mermaid o a herramienta de diagramas.

---

## 1. POST /reservations (flujo completo)

**Actores:** Cliente (frontend/Postman), API.

1. Cliente envía POST /reservations con body (date, startTime, partySize, durationMin, areaPreference, customerName, phone, source, …).
2. API valida body (OpenAPI/express-openapi-validator): tipos, requeridos, enums.
3. API comprueba que el store esté seeded (rules, areas, tables); si no → 503/409 según contrato.
4. API calcula `requiredCapacity` = redondeo hacia arriba de partySize (7→8) usando rules.capacityOptions.
5. API obtiene candidatos de disponibilidad para (date, startTime, requiredCapacity, durationMin, areaPreference) — misma lógica que GET /availability:
   - Por cada área (según preferencia), obtiene mesas/combo VIP que cumplan capacidad.
   - Para cada candidato, comprueba que en los slots [startTime, startTime+duration] no haya ninguna reserva activa (PENDING/CONFIRMED) que use esa mesa o ese combo.
6. Si no hay candidatos → responde 409 (o 422) “no availability”.
7. API elige el primer candidato válido (o el que cumpla preferencia).
8. API crea reserva: id, status=PENDING, date, startTime, durationMin, partySize, requiredCapacity, areaAssigned, tableAssignedIds, datos cliente, createdAt, expiresAt.
9. API guarda la reserva en store (memoria).
10. API responde 201 con el objeto reserva.

**Regla clave:** La reserva se crea solo si existe al menos un candidato sin solape; así no se asigna la misma mesa a dos reservas que se solapan.

---

## 2. GET /availability (cómo calcula)

**Actores:** Cliente, API.

1. Cliente envía GET /availability con query: date, startTime, partySize, durationMin, areaPreference.
2. API valida query (tipos, formato hora, partySize > 0, etc.).
3. API comprueba seeded; si no → error correspondiente.
4. API convierte startTime a minutos desde medianoche; calcula endMin = startMin + durationMin.
5. API valida ventana dentro de operatingHours (opensAt–closesAt); si fuera → OUTSIDE_HOURS.
6. API calcula `requiredCapacity` = redondeo hacia arriba(partySize) con rules.capacityOptions.
7. API define orden de áreas: si areaPreference === 'ANY' usa rules.areaPriorityAny; si no, [areaPreference].
8. Para cada área en ese orden:
   - Obtiene mesas del área (store.getTables(areaId)).
   - Si área es VIP y requiredCapacity ≤ comboCapacity (6), considera el combo A+B como candidato:
     - Comprueba que en (date, startMin, durationMin) no haya reservas activas que usen vip_a o vip_b.
     - Si está libre, añade candidato { capacity: 6, tableIds: [vip_a, vip_b] }.
   - Para cada mesa individual (o mesa redonda 10): si mesa.capacity >= requiredCapacity, comprueba solape:
     - Obtiene reservas del día; para cada reserva activa (no CANCELLED/EXPIRED/NOSHOW) que use esa mesa, comprueba si [startMin, endMin) solapa con [res.startMin, res.startMin+res.durationMin). Si no solapa con ninguna, la mesa es candidato.
   - Construye opción: { area: code, feasible: candidates.length > 0, candidates }.
9. API responde 200 con { date, startTime, durationMin, partySize, requiredCapacity, operatingHours, options }.

**Regla clave:** “No solape” = para cada mesa (o combo), ninguna reserva activa usa esa mesa en un intervalo que se solape con [startMin, endMin). Fin exacto de una e inicio de la otra no se considera solape.
