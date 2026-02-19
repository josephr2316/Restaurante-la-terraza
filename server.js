const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const OpenApiValidator = require('express-openapi-validator');
const store = require('./store');
const { getAvailability } = require('./availability');
const {
  createReservation,
  updateStatus,
  toApiReservation,
} = require('./reservations');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const openApiPath = path.join(__dirname, 'openapi.yml');
const spec = YAML.load(openApiPath);

app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }'
}));

app.use(
  OpenApiValidator.middleware({
    apiSpec: openApiPath,
    validateRequests: true,
    validateResponses: false,
  })
);

app.get('/', (req, res) => res.redirect('/docs'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.post('/seed', (req, res) => {
  const loaded = store.loadSeed();
  if (!loaded) return res.status(409).json({ code: 'ALREADY_SEEDED', message: 'Already seeded' });
  res.status(200).end();
});

app.get('/areas', (req, res) => {
  if (!store.getRules()) return res.status(503).json({ code: 'NOT_SEEDED', message: 'Run POST /seed first' });
  res.json(store.getAreas());
});

app.post('/areas/:areaId/tables', (req, res) => {
  if (!store.getRules()) return res.status(503).json({ code: 'NOT_SEEDED', message: 'Run POST /seed first' });
  const result = store.addTable(req.params.areaId, req.body);
  if (result.error) return res.status(result.code === 'AREA_LIMIT' ? 409 : 400).json({ code: result.code || 'ERROR', message: result.error });
  res.status(201).json(result.table);
});

app.get('/tables', (req, res) => {
  if (!store.getRules()) return res.status(503).json({ code: 'NOT_SEEDED', message: 'Run POST /seed first' });
  res.json(store.getTables(req.query.areaId));
});

app.get('/availability', (req, res) => {
  if (!store.getRules()) return res.status(503).json({ code: 'NOT_SEEDED', message: 'Run POST /seed first' });
  const { date, startTime, partySize, durationMin, areaPreference } = req.query;
  const result = getAvailability(date, startTime, partySize, durationMin ? Number(durationMin) : 90, areaPreference || 'ANY');
  if (result.error) return res.status(result.code === 'OUTSIDE_HOURS' ? 422 : 400).json({ code: result.code, message: result.error });
  res.json(result);
});

app.post('/reservations', (req, res) => {
  if (!store.getRules()) return res.status(503).json({ code: 'NOT_SEEDED', message: 'Run POST /seed first' });
  const result = createReservation(req.body);
  if (result.error) return res.status(result.status || 422).json({ code: result.code, message: result.error });
  res.status(201).json(result.reservation);
});

app.get('/reservations', (req, res) => {
  if (!store.getRules()) return res.status(503).json({ code: 'NOT_SEEDED', message: 'Run POST /seed first' });
  const { date, areaId } = req.query;
  res.json(store.getReservations({ date, areaId }).map(toApiReservation));
});

app.patch('/reservations/:id/status', (req, res) => {
  if (!store.getRules()) return res.status(503).json({ code: 'NOT_SEEDED', message: 'Run POST /seed first' });
  const result = updateStatus(req.params.id, req.body);
  if (result.error) return res.status(result.status || 400).json({ code: result.code, message: result.error });
  res.json(result.reservation);
});

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    code: 'SCHEMA_VALIDATION_FAILED',
    message: err.message,
    errors: err.errors,
  });
});

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}/docs`);
});