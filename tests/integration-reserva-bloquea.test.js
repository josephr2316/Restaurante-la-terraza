/**
 * Integration test: crear reserva y luego consultar disponibilidad;
 * confirmar que el slot/mesa queda bloqueado.
 */
const { ok, strictEqual } = require('node:assert');
const { describe, it } = require('node:test');

const store = require('../store');
const { getAvailability } = require('../availability');
const { createReservation } = require('../reservations');

describe('Integration: reserva bloquea disponibilidad', () => {
  it('después de crear una reserva, esa mesa no debe aparecer como candidata en el mismo slot', () => {
    store.loadSeed();

    const date = '2026-02-28';
    const startTime = '19:00';
    const partySize = 2;
    const durationMin = 90;
    const areaPreference = 'BAR';

    const availBefore = getAvailability(date, startTime, partySize, durationMin, areaPreference);
    if (availBefore.error) throw new Error(availBefore.error);
    const optBarBefore = availBefore.options.find((o) => o.area === 'BAR');
    ok(optBarBefore && optBarBefore.feasible, 'BAR debe tener al menos un candidato antes');

    const result = createReservation({
      date,
      startTime,
      partySize,
      durationMin,
      areaPreference,
      customerName: 'Test Integration',
      phone: '+1-809-555-0000',
      source: 'WEB',
    });
    if (result.error) throw new Error(result.error + ' ' + (result.code || ''));

    const tableIdsUsed = result.reservation.tableAssignedIds;
    ok(Array.isArray(tableIdsUsed) && tableIdsUsed.length >= 1, 'reserva debe tener mesa asignada');

    const availAfter = getAvailability(date, startTime, partySize, durationMin, areaPreference);
    if (availAfter.error) throw new Error(availAfter.error);
    const optBarAfter = availAfter.options.find((o) => o.area === 'BAR');

    const stillOffered = optBarAfter?.candidates?.some((c) =>
      tableIdsUsed.some((tid) => c.tableIds && c.tableIds.includes(tid))
    );
    strictEqual(stillOffered, false, 'La mesa asignada no debe seguir ofrecida en el mismo slot');
  });
});
