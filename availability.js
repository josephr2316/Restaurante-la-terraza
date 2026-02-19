const store = require('./store');

function timeToMinutes(str) {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + (m || 0);
}

function roundCapacity(partySize, capacityOptions) {
  const opts = capacityOptions || [2, 4, 6, 8, 10];
  const n = Number(partySize);
  for (const c of opts) if (c >= n) return c;
  return opts[opts.length - 1];
}

function slotOverlaps(date, startMin, durationMin, res) {
  if (res.date !== date) return false;
  if (['CANCELLED', 'EXPIRED', 'NOSHOW'].includes(res.status)) return false;
  const resStart = timeToMinutes(res.startTime);
  const resEnd = resStart + (res.durationMin || 90);
  const end = startMin + durationMin;
  return startMin < resEnd && resStart < end;
}

function getAvailability(date, startTime, partySize, durationMin = 90, areaPreference = 'ANY') {
  const rules = store.getRules();
  if (!rules) return { error: 'Not seeded', code: 'NOT_SEEDED' };

  const opensAt = timeToMinutes(rules.operatingHours.opensAt);
  let closesAt = timeToMinutes(rules.operatingHours.closesAt);
  if (closesAt <= opensAt) closesAt += 24 * 60;

  const startMin = timeToMinutes(startTime);
  const duration = [90, 120, 180].includes(Number(durationMin)) ? Number(durationMin) : 90;
  const endMin = startMin + duration;

  if (startMin < opensAt || endMin > closesAt) {
    return { error: 'Outside operating hours', code: 'OUTSIDE_HOURS' };
  }

  const requiredCapacity = roundCapacity(partySize, rules.capacityOptions);
  const areaOrder = areaPreference === 'ANY' ? (rules.areaPriorityAny || []) : [areaPreference];

  const options = areaOrder.map((areaCode) => {
    const area = store.getAreaByCode(areaCode);
    if (!area) return { area: areaCode, feasible: false, candidates: [] };
    const tables = store.getTables(area.id);
    const vipCombo = rules.vipCombo;
    const candidates = [];

    if (vipCombo?.enabled && area.code === 'VIP' && requiredCapacity <= (vipCombo.comboCapacity || 6)) {
      const a = store.getTableById(vipCombo.aId);
      const b = store.getTableById(vipCombo.bId);
      if (a && b) {
        const overlapping = store.getReservations({ date }).filter((r) =>
          slotOverlaps(date, startMin, duration, r)
        );
        const vipComboBlocked = overlapping.some(
          (r) => (r.tableAssignedIds && r.tableAssignedIds.some((id) => id === vipCombo.aId || id === vipCombo.bId))
        );
        if (!vipComboBlocked) {
          candidates.push({
            tableIds: [vipCombo.aId, vipCombo.bId],
            capacity: vipCombo.comboCapacity || 6,
            note: 'VIP combo A+B',
          });
        }
      }
    }

    for (const t of tables) {
      if (t.capacity < requiredCapacity) continue;
      if (vipCombo?.enabled && (t.id === vipCombo.aId || t.id === vipCombo.bId)) continue;
      const overlapping = store.getReservations({ date }).filter((r) =>
        slotOverlaps(date, startMin, duration, r)
      );
      const tableBlocked = overlapping.some(
        (r) => r.tableAssignedIds && r.tableAssignedIds.includes(t.id)
      );
      if (!tableBlocked) {
        candidates.push({ tableIds: [t.id], capacity: t.capacity, note: null });
      }
    }

    return {
      area: areaCode,
      feasible: candidates.length > 0,
      candidates,
    };
  });

  return {
    date,
    startTime,
    durationMin: duration,
    partySize: Number(partySize),
    requiredCapacity,
    operatingHours: rules.operatingHours,
    bookingWindow: {
      minLeadMinutes: rules.minLeadMinutes,
      maxDaysAhead: rules.maxDaysAhead,
    },
    areaPriority: areaOrder,
    options,
  };
}

module.exports = { getAvailability, roundCapacity, slotOverlaps, timeToMinutes };
