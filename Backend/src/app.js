const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const clientsRoutes = require('./routes/clients.routes');
const techniciansRoutes = require('./routes/technicians.routes');
const servicesRoutes = require('./routes/services.routes');
const chatRoutes = require('./routes/chat.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const ratingsRoutes = require('./routes/ratings.routes');
const adminRoutes = require('./routes/admin.routes');
const sparePartsRoutes = require('./routes/spare-parts.routes');
const serviceFilesRoutes = require('./routes/service-files.routes');
const paymentsRoutes = require('./routes/payments.routes');
const warrantiesRoutes = require('./routes/warranties.routes');
const pushDevicesRoutes = require('./routes/push-devices.routes');
const publicConfigRoutes = require('./routes/public-config.routes');
const authMiddleware = require('./middlewares/auth.middleware');
const roleMiddleware = require('./middlewares/role.middleware');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));
app.use(express.json());
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

app.get('/', (req, res) => {
  res.json({ message: 'Backend running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/public-config', publicConfigRoutes);
app.use('/api/users', authMiddleware, usersRoutes);
app.use('/api/clients', authMiddleware, clientsRoutes);
app.use('/api/technicians', techniciansRoutes);
app.use('/api/services', authMiddleware, servicesRoutes);
app.use('/api/chat', authMiddleware, chatRoutes);
app.use('/api/notifications', authMiddleware, notificationsRoutes);
app.use('/api/ratings', authMiddleware, ratingsRoutes);
app.use('/api/spare-parts', authMiddleware, sparePartsRoutes);
app.use('/api/service-files', authMiddleware, serviceFilesRoutes);
app.use('/api/payments', authMiddleware, paymentsRoutes);
app.use('/api/warranties', authMiddleware, warrantiesRoutes);
app.use('/api/push-devices', authMiddleware, pushDevicesRoutes);
app.use('/api/admin', authMiddleware, roleMiddleware('admin'), adminRoutes);

module.exports = app;
