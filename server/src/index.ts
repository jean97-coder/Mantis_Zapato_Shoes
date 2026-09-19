import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.routes.js';
import { usersRouter } from './routes/users.routes.js';
import { customersRouter } from './routes/customers.routes.js';
import { ordersRouter } from './routes/orders.routes.js';
import { inventoryRouter } from './routes/inventory.routes.js';
import { cashRouter } from './routes/cash.routes.js';
import { catalogRouter } from './routes/catalog.routes.js';
import { settingsRouter } from './routes/settings.routes.js';
import { dashboardRouter } from './routes/dashboard.routes.js';
import { storeRouter } from './routes/store.routes.js';
import { telegramRouter } from './routes/telegram.routes.js';
import { scheduleDailyDeliveryAlertJob } from './lib/telegram.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.set('trust proxy', 1);
const PORT = Number(process.env.PORT) || 4000;

// Cross-origin resource policy is relaxed (not "same-origin") because the
// frontend dev server and this API intentionally run on different origins
// and the frontend loads uploaded order photos directly via <img src>.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Force an explicit UTF-8 charset on every API JSON response. Express's
// res.json() sends "application/json" with no charset parameter by default;
// declaring it explicitly avoids any intermediary (proxy, older client)
// falling back to a different default encoding for special characters,
// tildes or emoji in WhatsApp messages, names, etc.
app.use('/api', (_req, res, next) => {
  res.set('Content-Type', 'application/json; charset=utf-8');
  next();
});

app.get('/api/health', (_req, res) => res.json({ ok: true, name: "JC SHOE'S ERP API" }));

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/customers', customersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/cash', cashRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/store', storeRouter);
app.use('/api/telegram', telegramRouter);

app.use((req, res) => res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` }));
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🥾 JC SHOE'S ERP API corriendo en http://localhost:${PORT}`);
  scheduleDailyDeliveryAlertJob();
});
