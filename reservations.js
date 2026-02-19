const store = require('./store');
const { getAvailability } = require('./availability');

const PER_PERSON_ESTIMATE = 700;

function createReservation(body) {
  const rules = store.getRules();
  if (!rules) return { error: 'Not seeded', code: 'NOT_SEEDED', status: 503 };

  const {
    date,
    startTime,
    partySize,
    durationMin = 90,
    areaPreference = 'ANY',
    vipRequested = false,
    customerName,
    phone,
    email = null,
    notes = null,
    occasion = 'NONE',
    source,
    assignedTableId,
  } = body;

  const availability = getAvailability(date, startTime, partySize, durationMin, areaPreference);
  if (availability.error) {
    return {
      error: availability.error,
      code: availability.code || 'VALIDATION_ERROR',
      status: availability.code === 'OUTSIDE_HOURS' ? 422 : 400,
    };
  }

  let chosen = null;
  if (assignedTableId) {
    const table = store.getTableById(assignedTableId);
    if (!table) return { error: 'Table not found', code: 'INVALID_TABLE', status: 400 };
    const areaCode = store.getAreaById(table.areaId)?.code;
    const opt = availability.options.find((o) => o.area === areaCode);
    if (!opt?.feasible) return { error: 'No availability for assigned table', code: 'NO_AVAILABILITY', status: 422 };
    const cand = opt.candidates.find((c) => c.tableIds.includes(assignedTableId));
    if (!cand) return { error: 'Assigned table not available for this slot', code: 'NO_AVAILABILITY', status: 422 };
    chosen = { area: areaCode, candidate: cand };
  }
  if (!chosen) {
    const opt = availability.options.find((o) => o.feasible);
    if (!opt) return { error: 'No available tables for this slot', code: 'NO_AVAILABILITY', status: 422 };
    chosen = { area: opt.area, candidate: opt.candidates[0] };
  }

  const id = 'rsv_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (rules.pendingExpiryMinutes || 15) * 60 * 1000);

  const reservation = {
    id,
    status: 'PENDING',
    date,
    startTime,
    durationMin: durationMin || 90,
    partySize: Number(partySize),
    requiredCapacity: availability.requiredCapacity,
    areaAssigned: chosen.area,
    tableAssignedIds: chosen.candidate.tableIds,
    vipRequested: !!vipRequested,
    vipFulfilled: chosen.area === 'VIP',
    customerName,
    phone,
    email,
    notes,
    occasion: occasion || 'NONE',
    source: source || 'WEB',
    estimatedSpend: Number(partySize) * PER_PERSON_ESTIMATE,
    cancelPolicy: rules.cancelPolicy || {},
    penalty: null,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  store.addReservation(reservation);
  return { reservation };
}

function updateStatus(id, body) {
  const res = store.getReservationById(id);
  if (!res) return { error: 'Not found', code: 'NOT_FOUND', status: 404 };
  const { status, reason } = body || {};
  const rules = store.getRules();
  const policy = rules?.cancelPolicy || {};

  const validTransitions = {
    PENDING: ['CONFIRMED', 'CANCELLED', 'EXPIRED'],
    CONFIRMED: ['COMPLETED', 'CANCELLED', 'NOSHOW'],
    CANCELLED: [],
    NOSHOW: [],
    COMPLETED: [],
    EXPIRED: [],
  };
  const allowed = validTransitions[res.status];
  if (!allowed || !allowed.includes(status)) {
    return { error: 'Invalid status transition', code: 'INVALID_TRANSITION', status: 409 };
  }

  const updates = { status };
  if (status === 'CANCELLED') {
    const now = new Date();
    const resStart = new Date(`${res.date}T${res.startTime}`);
    const freeCancelMs = (policy.freeCancelBeforeMinutes || 120) * 60 * 1000;
    if (resStart - now < freeCancelMs) {
      const rate = policy.lateCancelPenaltyRate ?? 0.5;
      const amount = Math.round(res.estimatedSpend * rate);
      updates.penalty = {
        applied: true,
        amount,
        currency: policy.currency || 'DOP',
        reason: reason || 'Late cancellation (< 2h)',
      };
    }
  }

  const updated = store.updateReservation(id, updates);
  return { reservation: updated };
}

function toApiReservation(r) {
  return {
    id: r.id,
    status: r.status,
    date: r.date,
    startTime: r.startTime,
    durationMin: r.durationMin,
    partySize: r.partySize,
    requiredCapacity: r.requiredCapacity,
    areaAssigned: r.areaAssigned,
    tableAssignedIds: r.tableAssignedIds,
    vipRequested: r.vipRequested,
    vipFulfilled: r.vipFulfilled,
    customerName: r.customerName,
    phone: r.phone,
    email: r.email,
    notes: r.notes,
    occasion: r.occasion,
    source: r.source,
    estimatedSpend: r.estimatedSpend,
    cancelPolicy: r.cancelPolicy,
    penalty: r.penalty,
    createdAt: r.createdAt,
    expiresAt: r.expiresAt,
  };
}

module.exports = { createReservation, updateStatus, toApiReservation };
