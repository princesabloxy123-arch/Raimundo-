import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runDukeEventChat, type DukeChatRequestBody } from './api/duke-evento/chat.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '8mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'conae-duque-evento' });
  });

  app.post('/api/duke-evento/chat', async (req, res) => {
    try {
      const body = (req.body || {}) as DukeChatRequestBody;
      const result = await runDukeEventChat(body);
      res.status(200).json(result);
    } catch (err) {
      const statusCode =
        err && typeof err === 'object' && 'statusCode' in err && typeof err.statusCode === 'number'
          ? err.statusCode
          : 500;
      const message =
        err instanceof Error
          ? err.message
          : 'Erro interno ao consultar a Inteligência Artificial do Robô Duque Evento.';
      console.error('[duke-evento/chat]', message);
      res.status(statusCode).json({ error: message });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CONAE + Robô Duque Evento server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
