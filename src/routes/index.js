const express = require('express');

const authRoutes = require('./auth.routes');
const healthRoutes = require('./health.routes');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    name: 'dev-duman-api',
    status: 'ok',
  });
});

router.use(healthRoutes);
router.use('/auth', authRoutes);

module.exports = router;
