import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ------------------------------------------------------------
// Minimal .env loader (no dotenv dependency).
// Reads <cwd>/.env once; never overrides already-set env vars, so real
// environment variables always win.
// ------------------------------------------------------------

let loaded = false;

export function loadEnv(): void {
  if (loaded) return;
  loaded = true;
  const p = resolve(process.cwd(), '.env');
  if (!existsSync(p)) return;
  for (const raw of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
