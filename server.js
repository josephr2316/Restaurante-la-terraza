const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const openApiPath = path.join(__dirname, 'openapi.yml');
const spec = YAML.load(openApiPath);
const swaggerOptions = { explorer: true, customCss: '.swagger-ui .topbar { display: none }' };

app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec, swaggerOptions));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec, swaggerOptions));

app.get('/', (req, res) => {
  res.redirect('/docs');
});

app.listen(PORT, () => {
  console.log(`Swagger UI: http://localhost:${PORT}/docs (también /api-docs)`);
});
