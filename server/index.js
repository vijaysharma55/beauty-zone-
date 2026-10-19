import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import './migrations.js';
import { seedIfEmpty, UPLOAD_DIR, DATA_PATH, DEFAULT_TIMINGS } from './db.js';
import { backfillApprovals, backfillTimings } from './migrations.js';
import { backfillApprovedVersions } from './workflow.js';
import {
  securityHeaders,
  csrfProtection,
  loadSession,
  asyncHandler,
  notFound,
  errorHandler,
} from './middleware.js';
import { authRouter } from './routes/auth.js';
import { salonRouter } from './routes/salon.js';
import { publicRouter } from './routes/public.js';
import { adminRouter } from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === 'production';

/**
 * Synchronous scrypt hash used only for first-boot demo seeding.
 * Async hashPassword() from security.js is used for all live requests.
 */
function hashPasswordSync(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$16384$8$1$${salt}$${derived.toString('hex')}`;
}

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(securityHeaders);

// Raw body for image uploads must be registered before the JSON parser.
app.use('/api/salon/uploads', express.raw({ type: 'image/*', limit: '5mb' }));

app.use(express.json({ limit: '2mb' }));

app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use(loadSession);
app.use('/api', csrfProtection);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'beautyzone', time: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/salon', salonRouter);
app.use('/api/admin', adminRouter);
app.use('/api/public', publicRouter);

// Uploaded images are public assets (they are embedded in public salon websites).
app.use(
  '/api/uploads',
  express.static(UPLOAD_DIR, {
    index: false,
    dotfiles: 'deny',
    maxAge: '7d',
    setHeaders: (res) => {
      res.set('X-Content-Type-Options', 'nosniff');
      res.set('Content-Security-Policy', "default-src 'none'; img-src 'self'");
    },
  })
);

app.use('/api', notFound);

/* ------------------------------------------------------------------ */
/* Frontend                                                            */
/* ------------------------------------------------------------------ */

if (isProd) {
  const distDir = path.join(ROOT, 'dist');
  if (fs.existsSync(distDir)) {
    app.use(
      express.static(distDir, {
        index: false,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('index.html')) res.set('Cache-Control', 'no-store');
          else res.set('Cache-Control', 'public, max-age=31536000, immutable');
        },
      })
    );
    app.get('*', (req, res) => {
      res.set('Cache-Control', 'no-store');
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    app.get('*', (req, res) => res.status(503).send('Frontend build not found. Run `npm run build` first.'));
  }
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({
    root: ROOT,
    server: {
      middlewareMode: true,
      host: '0.0.0.0',
      allowedHosts: true,
      hmr: false,
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    appType: 'custom',
  });
  app.use(vite.middlewares);
  app.use(
    '*',
    asyncHandler(async (req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      try {
        const template = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
        const html = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set('Content-Type', 'text/html').end(html);
      } catch (err) {
        vite.ssrFixStacktrace?.(err);
        next(err);
      }
    })
  );
}

app.use(errorHandler);

const { seeded } = seedIfEmpty(hashPasswordSync);
backfillApprovals();
backfillTimings(DEFAULT_TIMINGS);
backfillApprovedVersions();

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  BeautyZone running on http://0.0.0.0:${PORT}`);
  console.log(`  Environment: ${isProd ? 'production' : 'development'}`);
  console.log(`  Data directory: ${DATA_PATH}`);
  if (seeded) {
    console.log('\n  Seeded demo accounts:');
    console.log(`    Super admin : ${process.env.SEED_ADMIN_EMAIL || 'admin@beautyzone.app'} / ${process.env.SEED_ADMIN_PASSWORD || 'Admin@12345'}`);
    console.log(`    Salon owner : ${process.env.SEED_OWNER_EMAIL || 'owner@luminaluxe.in'} / ${process.env.SEED_OWNER_PASSWORD || 'Owner@12345'}`);
    console.log('  Change these passwords after your first login.\n');
  }
});

function shutdown(signal) {
  console.log(`\n[server] ${signal} received, shutting down.`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
