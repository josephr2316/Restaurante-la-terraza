# APPROACH — Disponibilidad por slots (Approach C)

## Approach seleccionado: **C — Disponibilidad por slots**

El sistema calcula disponibilidad dividiendo el horario operativo en **slots de 15 minutos**. Cada reserva ocupa un conjunto de slots según su hora de inicio y duración. Una mesa está disponible en un momento si **ninguna reserva activa** (Pending/Confirmed) la usa en esos slots. Así se evita sobre-reserva y se respeta la regla “fin de una = inicio de otra permitido”.

---

## Por qué elegimos Approach C (3 razones)

1. **Anti sobre-reserva explícita:** El modelo de slots hace que “no solape” sea una comprobación clara: dos reservas no pueden compartir la misma mesa en los mismos slots. Es fácil de implementar y de explicar al cliente (evitar doble reserva a la misma hora).
2. **Alineado con horario y duraciones variables:** El gerente pidió 90/120/180 minutos y horario 16:00–00:00. Los slots permiten cualquier duración y ventana sin cambiar el modelo; solo se cuentan slots ocupados por cada reserva.
3. **VIP A+B y mesas individuales:** Las mesas VIP cuadradas (A, B) y el combo A+B se tratan como “candidatos” en el mismo flujo: para cada área y cada franja se calcula qué mesas (o combo) están libres en esos slots, y se devuelven como opciones. No hace falta un modelo distinto por tipo de asignación.

---

## Trade-offs (mínimo 2)

1. **Memoria y reinicio:** La implementación actual es en memoria. Si el proceso se reinicia (p. ej. en Railway), se pierden reservas hasta que se vuelva a hacer POST /seed. A cambio, el despliegue es simple y no requiere base de datos; para una primera entrega es aceptable. Más adelante se puede migrar a persistencia manteniendo el mismo contrato (openapi) y la misma lógica de slots.
2. **Granularidad fija de 15 min:** Todos los inicios de reserva están alineados a slots de 15 min. No se permiten horas “raras” (ej. 20:07). A cambio, la lógica de solapamiento es sencilla y el frontend puede mostrar franjas estándar (20:00, 20:15, …). Si el cliente pidiera inicios al minuto, habría que revisar granularidad o redondeo.

---

## Qué haríamos distinto con 1 semana más

- **Persistencia:** Sustituir el store en memoria por una base de datos (Postgres/SQLite) con tablas Área, Mesa, Reserva, manteniendo la misma API y la lógica de slots en el código.
- **Tests automatizados:** Añadir suite de tests (unit + integración) que corran en CI y que cubran solape, capacidad 7→8, VIP A+B y límite de mesas por área.
- **Validación de fecha/hora:** Rechazar explícitamente reservas en el pasado (400/422) y documentarlo en OpenAPI y en EDGE_CASES.

---

## Prioridad del cliente que asumimos

- **Máxima:** Evitar sobre-reservas y confusión VIP. Por eso el núcleo del diseño es “slots + no solape” y candidatos claros por área (incl. VIP A+B).
- **Alta:** Sistema accesible desde cualquier lugar (no localhost). Por eso API en Railway y frontend en Vercel.
- **Media:** Límite de mesas por área y regla “no más de 3 en VIP”. Implementado en POST /areas/:id/tables y en seed.
- No negociamos con el cliente cambios de contrato en esta fase; la prioridad fue cumplir el enunciado (API First, endpoints sugeridos, reglas de capacidad y VIP).
