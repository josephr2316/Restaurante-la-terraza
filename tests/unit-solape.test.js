/**
 * Unit test: no solape.
 * Verifica que slotOverlaps detecte correctamente solapamiento y que
 * "fin de una = inicio de otra" no se considere solape.
 */
const { strictEqual, ok } = require('node:assert');
const { describe, it } = require('node:test');
const { slotOverlaps, timeToMinutes } = require('../availability');

const date = '2026-02-20';

describe('slotOverlaps (no solape)', () => {
  it('debe detectar solape cuando dos reservas se superponen', () => {
    const res = {
      date,
      status: 'CONFIRMED',
      startTime: '20:00',
      durationMin: 90,
      tableAssignedIds: ['t1'],
    };
    const startMin = timeToMinutes('20:30');
    const durationMin = 90;
    strictEqual(slotOverlaps(date, startMin, durationMin, res), true);
  });

  it('no debe considerar solape cuando una termina exactamente cuando empieza la otra', () => {
    const res = {
      date,
      status: 'CONFIRMED',
      startTime: '20:00',
      durationMin: 90,
      tableAssignedIds: ['t1'],
    };
    const startMin = timeToMinutes('21:30');
    const durationMin = 90;
    strictEqual(slotOverlaps(date, startMin, durationMin, res), false);
  });

  it('debe ignorar reservas CANCELLED para solape', () => {
    const res = {
      date,
      status: 'CANCELLED',
      startTime: '20:00',
      durationMin: 90,
      tableAssignedIds: ['t1'],
    };
    const startMin = timeToMinutes('20:00');
    const durationMin = 90;
    strictEqual(slotOverlaps(date, startMin, durationMin, res), false);
  });
});
