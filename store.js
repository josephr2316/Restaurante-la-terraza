const path = require('path');
const fs = require('fs');

const seedPath = path.join(__dirname, 'data', 'seed.json');

const state = {
  seeded: false,
  areas: [],
  tables: [],
  rules: null,
  reservations: [],
};

function loadSeed() {
  if (state.seeded) return false;
  const raw = fs.readFileSync(seedPath, 'utf8');
  const data = JSON.parse(raw);
  state.areas = data.areas || [];
  state.tables = data.tables || [];
  state.rules = data.rules || null;
  state.reservations = [];
  state.seeded = true;
  return true;
}

function getAreas() {
  return state.areas;
}

function getTables(areaId) {
  if (!areaId) return state.tables;
  return state.tables.filter((t) => t.areaId === areaId);
}

function getRules() {
  return state.rules;
}

function getAreaById(id) {
  return state.areas.find((a) => a.id === id);
}

function getAreaByCode(code) {
  return state.areas.find((a) => a.code === code);
}

function getTableById(id) {
  return state.tables.find((t) => t.id === id);
}

function addTable(areaId, body) {
  const area = getAreaById(areaId);
  if (!area) return { error: 'Area not found' };
  const inArea = state.tables.filter((t) => t.areaId === areaId).length;
  if (inArea >= area.maxTables) return { error: 'Area table limit exceeded', code: 'AREA_LIMIT' };
  const { capacity, tableType, code } = body;
  const id = code ? `tbl_${code.toLowerCase().replace(/-/g, '_')}` : `tbl_${areaId}_${capacity}_${Date.now()}`;
  const table = {
    id,
    areaId,
    code: code || id,
    capacity,
    tableType,
    isActive: true,
  };
  state.tables.push(table);
  return { table };
}

function getReservations(filters = {}) {
  let list = state.reservations;
  if (filters.date) list = list.filter((r) => r.date === filters.date);
  if (filters.areaId) {
    const area = getAreaById(filters.areaId);
    const code = area ? area.code : null;
    if (code) list = list.filter((r) => r.areaAssigned === code);
  }
  return list;
}

function addReservation(reservation) {
  state.reservations.push(reservation);
  return reservation;
}

function getReservationById(id) {
  return state.reservations.find((r) => r.id === id);
}

function updateReservation(id, updates) {
  const idx = state.reservations.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  state.reservations[idx] = { ...state.reservations[idx], ...updates };
  return state.reservations[idx];
}

module.exports = {
  state,
  loadSeed,
  getAreas,
  getTables,
  getRules,
  getAreaById,
  getAreaByCode,
  getTableById,
  addTable,
  getReservations,
  addReservation,
  getReservationById,
  updateReservation,
};
