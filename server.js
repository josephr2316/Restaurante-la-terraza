const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const store = require('./store');
const { getAvailability } = require('./availability');
const {
  createReservation,
  updateStatus,
  toApiReservation,
} = require('./reservations');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const openApiPath = path.join(__dirname, 'openapi.yml');
const spec = YAML.load(openApiPath);
const swaggerOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
};
app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec, swaggerOptions));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec, swaggerOptions));

app.get('/', (req, res) => res.redirect('/docs'));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
  });
});

app.post('/seed', (req, res) => {
  const loaded = store.loadSeed();
  if (!loaded) {
    return res.status(409).json({ code: 'ALREADY_SEEDED', message: 'Already seeded' });
  }
  res.status(200).end();
});

app.get('/areas', (req, res) => {
  if (!store.getRules()) {
    return res.status(503).json({ code: 'NOT_SEEDED', message: 'Run POST /seed first' });
  }
  res.json(store.getAreas());
});

app.post('/areas/:areaId/tables', (req, res) => {
  if (!store.getRules()) {
    return res.status(503).json({ code: 'NOT_SEEDED', message: 'Run POST /seed first' });
  }
  const { areaId } = req.params;
  const result = store.addTable(areaId, req.body);
  if (result.error) {
    const status = result.code === 'AREA_LIMIT' ? 409 : 400;
    return res.status(status).json({ code: result.code || 'ERROR', message: result.error });
  }
  res.status(201).json(result.table);
});

app.get('/tables', (req, res) => {
  if (!store.getRules()) {
    return res.status(503).json({ code: 'NOT_SEEDED', message: 'Run POST /seed first' });
  }
  const list = store.getTables(req.query.areaId);
  res.json(list);
});

app.get('/availability', (req, res) => {
  if (!store.getRules()) {
    return res.status(503).json({ code: 'NOT_SEEDED', message: 'Run POST /seed first' });
  }
  const { date, startTime, partySize, durationMin, areaPreference } = req.query;
  if (!date || !startTime || !partySize) {
    return res.status(400).json({
      code: 'INVALID_QUERY',
      message: 'date, startTime and partySize are required',
    });
  }
  const result = getAvailability(
    date,
    startTime,
    partySize,
    durationMin ? Number(durationMin) : 90,
    areaPreference || 'ANY'
  );
  if (result.error) {
    const status = result.code === 'OUTSIDE_HOURS' ? 422 : 400;
    return res.status(status).json({ code: result.code, message: result.error });
  }
  res.json(result);
});

app.post('/reservations', (req, res) => {
  if (!store.getRules()) {
    return res.status(503).json({ code: 'NOT_SEEDED', message: 'Run POST /seed first' });
  }
  const body = req.body;
  const required = ['date', 'startTime', 'partySize', 'customerName', 'phone', 'source'];
  for (const key of required) {
    if (body[key] == null || body[key] === '') {
      return res.status(400).json({
        code: 'INVALID_REQUEST',
        message: `Missing required field: ${key}`,
      });
    }
  }
  const result = createReservation(body);
  if (result.error) {
    return res.status(result.status || 422).json({
      code: result.code,
      message: result.error,
    });
  }
  res.status(201).json(result.reservation);
});

app.get('/reservations', (req, res) => {
  if (!store.getRules()) {
    return res.status(503).json({ code: 'NOT_SEEDED', message: 'Run POST /seed first' });
  }
  const { date, areaId } = req.query;
  if (!date) {
    return res.status(400).json({ code: 'INVALID_QUERY', message: 'date is required' });
  }
  const list = store.getReservations({ date, areaId });
  res.json(list.map(toApiReservation));
});

app.patch('/reservations/:id/status', (req, res) => {
  if (!store.getRules()) {
    return res.status(503).json({ code: 'NOT_SEEDED', message: 'Run POST /seed first' });
  }
  const { id } = req.params;
  const result = updateStatus(id, req.body);
  if (result.error) {
    return res.status(result.status || 400).json({
      code: result.code,
      message: result.error,
    });
  }
  res.json(result.reservation);
});

app.listen(PORT, () => {
  console.log(`Backend + Swagger UI: http://localhost:${PORT}`);
  console.log(`  API:  /health, /seed, /areas, /tables, /availability, /reservations`);
  console.log(`  Docs: http://localhost:${PORT}/docs`);
});
