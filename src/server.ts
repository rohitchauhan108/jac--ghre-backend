import http from 'node:http';
import mongoose from 'mongoose';
import app from './app.js';
import { config } from './config.js';
import { startupLog } from './middleware/requestLogger.js';

const killPort = async (port: number | string) => {
  const { exec } = await import('child_process');
  const cmd = process.platform === 'win32'
    ? `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port} ^| findstr LISTENING') do taskkill /F /PID %a 2>nul`
    : `lsof -ti :${port} | xargs kill -9 2>/dev/null`;
  return new Promise<void>(resolve => exec(cmd, () => resolve()));
};

const start = async () => {
  startupLog();
  await mongoose.connect(config.mongoUri);
  console.log('✅  MongoDB Connected Successfully');

  const server = http.createServer(app);

  server.once('error', async (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌  Port ${config.port} is already in use!`);
      console.error(`🔧  Trying to free port ${config.port}...`);
      await killPort(config.port);
      console.log(`✅  Port ${config.port} freed. Restart the server with: npm run dev`);
      console.log(`💡  Or pick a different port in .env: PORT=4001`);
    } else {
      console.error('\n❌  Server error:\n', err);
    }
    try { await mongoose.disconnect(); } catch { /* noop */ }
    process.exit(1);
  });

  server.listen(config.port, () => {
    console.log(`✅  Server running → http://localhost:${config.port}`);
  });
};

start().catch(async error => {
  console.error('\n❌  FATAL: Unable to start API:\n', error);
  try { await mongoose.disconnect(); } catch { /* noop */ }
  process.exit(1);
});
