import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'
import notifyHandler from './api/notify.js'

dotenv.config()

/**
 * Vite Dev Server API Plugin for /api/teams and /api/notify.
 * Ensures cross-browser and cross-session team synchronization and FCM push notifications in development.
 */
function teamsDevApiPlugin() {
  const dbFile = path.resolve(process.cwd(), '.dev-teams-db.json');

  const getTeams = () => {
    try {
      if (fs.existsSync(dbFile)) {
        const content = fs.readFileSync(dbFile, 'utf-8');
        return JSON.parse(content);
      }
    } catch {
      // ignore
    }
    return [];
  };

  const setTeams = (teams) => {
    try {
      fs.writeFileSync(dbFile, JSON.stringify(teams, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Failed to save teams to dev db:', err);
    }
  };

  return {
    name: 'teams-dev-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0];

        // 1. Teams API Handler
        if (url === '/api/teams' || url === '/api/teams/') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          if (req.method === 'OPTIONS') {
            res.statusCode = 200;
            res.end();
            return;
          }

          if (req.method === 'GET') {
            const teams = getTeams();
            res.statusCode = 200;
            res.end(JSON.stringify({ connected: true, source: 'vite_dev_server', teams }));
            return;
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body || '{}');
                const teams = parsed?.teams || [];
                setTeams(teams);
                res.statusCode = 200;
                res.end(JSON.stringify({ connected: true, success: true, count: teams.length }));
              } catch (err) {
                res.statusCode = 400;
                res.end(JSON.stringify({ connected: false, error: err.message }));
              }
            });
            return;
          }
        }

        // 2. Automated Email & Firebase Cloud Messaging (FCM) Push Notifications Handler
        if (url === '/api/notify' || url === '/api/notify/') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          if (req.method === 'OPTIONS') {
            res.statusCode = 200;
            res.end();
            return;
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', async () => {
              try {
                req.body = body ? JSON.parse(body) : {};
              } catch {
                req.body = {};
              }
              res.status = function (code) {
                this.statusCode = code;
                return this;
              };
              res.json = function (data) {
                this.setHeader('Content-Type', 'application/json');
                this.end(JSON.stringify(data));
                return this;
              };
              try {
                await notifyHandler(req, res);
              } catch (handlerErr) {
                console.error('[Vite dev /api/notify error]:', handlerErr);
                res.status(500).json({ error: handlerErr.message });
              }
            });
            return;
          }
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), teamsDevApiPlugin()],
});
