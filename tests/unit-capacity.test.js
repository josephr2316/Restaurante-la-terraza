/**
 * Unit test: normalización de capacidad (redondeo hacia arriba).
 * 7 → 8, 11 → 12 (o último disponible), etc.
 */
const { strictEqual } = require('node:assert');
const { describe, it } = require('node:test');
const { roundCapacity } = require('../availability');

const capacityOptions = [2, 4, 6, 8, 10];

describe('roundCapacity (normalización ocupaciones para mesa)', () => {
  it('7 personas debe asignar capacidad 8', () => {
    strictEqual(roundCapacity(7, capacityOptions), 8);
  });

  it('2 personas debe asignar capacidad 2', () => {
    strictEqual(roundCapacity(2, capacityOptions), 2);
  });

  it('9 personas debe asignar capacidad 10', () => {
    strictEqual(roundCapacity(9, capacityOptions), 10);
  });

  it('11 personas debe asignar 10 (última opción cuando no hay 12)', () => {
    strictEqual(roundCapacity(11, capacityOptions), 10);
  });
});
