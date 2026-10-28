import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Vite Dev Server API Plugin for /api/teams.
 * Ensures cross-browser and cross-session team synchronization in development.
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
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), teamsDevApiPlugin()],
})
