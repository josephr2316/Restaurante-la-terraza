# EDGE_CASES — Casos borde (mínimo 8)

Formato: **Si pasa X → hacemos Y → respondemos Z.**

---

1. **Reserva de 7 personas**  
   Si el cliente pide `partySize: 7` → buscamos mesa con capacidad ≥ 8 (redondeo hacia arriba). Si no hay mesa de 8 disponible en la franja → no hay candidatos → respondemos 409 (o 422) “no availability” / mensaje claro. No asignamos mesa de 6.

2. **Reservar en el pasado**  
   Si `date` + `startTime` es anterior a “ahora” (considerando minLeadMinutes si aplica) → validamos y rechazamos → respondemos 400 o 422 con mensaje tipo “Cannot book in the past” / “startTime must be in the future”.

3. **Dos reservas misma mesa, misma hora**  
   Si ya existe una reserva activa (PENDING o CONFIRMED) para la mesa M en [20:00–21:30] → una segunda reserva que pida M en 20:00 o 21:00 (solapamiento) no debe crearse. La lógica de availability no ofrece M como candidato; POST /reservations no tiene candidato → respondemos 409.

4. **Fin de una reserva = inicio de la siguiente**  
   Si la reserva 1 termina a 21:30 y la reserva 2 empieza a 21:30 → no hay solape (intervalo 1 es [20:00, 21:30), intervalo 2 es [21:30, 23:00)). Permitimos ambas en la misma mesa → POST /reservations devuelve 201 para la segunda.

5. **Agregar mesa en área VIP cuando ya hay 3**  
   Si el área VIP tiene maxTables: 3 y ya hay 3 mesas → POST /areas/area_vip/tables → validamos límite → respondemos 409 (o 422) con código tipo AREA_LIMIT y mensaje “Area table limit exceeded” / “VIP no permite más de 3 mesas”.

6. **Availability sin seed**  
   Si aún no se ha llamado POST /seed → GET /availability (y POST /reservations) no tienen áreas/mesas/reglas → respondemos 503 o 409 según contrato, código NOT_SEEDED, mensaje claro para que el cliente ejecute POST /seed.

7. **Hora fuera del horario operativo**  
   Si startTime es antes de opensAt o startTime + durationMin es después de closesAt → GET /availability y POST /reservations rechazan → respondemos 400/422 con código OUTSIDE_HOURS y mensaje “Outside operating hours”.

8. **VIP 6 personas: solo combo A+B**  
   Si partySize es 6, areaPreference VIP, y la única opción en VIP que cumple capacidad 6 es el combo A+B → el sistema ofrece ese candidato (feasible: true, candidates con tableIds [vip_a, vip_b]). Si A o B están ocupadas en esa franja → no se ofrece combo → feasible: false o candidates vacío para VIP.

9. **Reserva de 11 personas**  
   Si partySize es 11 → requiredCapacity = 12 (redondeo hacia arriba con capacityOptions). Si no hay mesa de 12 (o lógica equivalente para juntar mesas en un futuro) → no hay candidatos → respondemos 409/422 “no availability”. (Nota: en seed actual no hay mesa 12; se documenta como caso borde.)

10. **Confirmar reserva que ya expiró (PENDING)**  
    Si una reserva está PENDING y expiresAt ya pasó → al consultar o al intentar PATCH status, podemos considerarla EXPIRED. Si el cliente intenta PATCH a CONFIRMED → validamos estado/expiración → respondemos 409/422 “Reservation expired” o similar.

---

Resumen: 10 casos borde documentados (≥ 8 requeridos). Las respuestas Z usan códigos HTTP y cuerpos alineados con openapi.yml (400, 409, 422, 503 según el caso).
