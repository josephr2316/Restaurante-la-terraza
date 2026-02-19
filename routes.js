const express = require('express');
const router = express.Router();
const resLogic = require('./reservations');
const store = require('./store');

router.post('/', (req, res) => {
  const result = resLogic.createReservation(req.body);
  if (result.error) {
    return res.status(result.status || 400).json(result);
  }
  res.status(201).json(resLogic.toApiReservation(result.reservation));
});

router.patch('/:id/status', (req, res) => {
  const result = resLogic.updateStatus(req.params.id, req.body);
  if (result.error) {
    return res.status(result.status || 400).json(result);
  }
  res.json(resLogic.toApiReservation(result.reservation));
});

router.get('/', (req, res) => {
  const list = store.getReservations(req.query);
  res.json(list.map(resLogic.toApiReservation));
});

module.exports = router;