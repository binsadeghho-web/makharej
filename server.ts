import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'finance_database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function startServer() {
  const app = express();

  // Middleware
  app.use(express.json({ limit: '15mb' }));

  // CORS & Security Headers
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // API Routes for Persistent Database
  app.get('/api/state', (req, res) => {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const data = JSON.parse(raw);
        return res.json({ success: true, data, source: 'server_disk', timestamp: Date.now() });
      }
      return res.json({ success: true, data: null, source: 'none' });
    } catch (err: any) {
      console.error('Error reading from database file:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/state', (req, res) => {
    try {
      const state = req.body;
      if (!state || typeof state !== 'object') {
        return res.status(400).json({ success: false, error: 'Invalid state data payload' });
      }

      // Write atomically using temporary file to prevent corruption
      const tempFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(state, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);

      return res.json({
        success: true,
        message: 'Saved to server database successfully',
        timestamp: Date.now(),
      });
    } catch (err: any) {
      console.error('Error writing to database file:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Health ping
  app.get('/api/ping', (req, res) => {
    res.json({ ok: true, timestamp: Date.now(), databaseReady: fs.existsSync(DB_FILE) });
  });

  // Serve static in production or Vite middleware in dev
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(process.cwd(), 'dist'))) {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Fallback to index.html with Vite HTML transformation
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        if (fs.existsSync(indexPath)) {
          let template = fs.readFileSync(indexPath, 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } else {
          next();
        }
      } catch (e: any) {
        vite.ssrFixStacktrace?.(e);
        next(e);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Finance PWA Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
