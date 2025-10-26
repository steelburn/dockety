import Database from 'better-sqlite3';
import { Host } from './types';
import * as fs from 'fs';
import * as path from 'path';

// Logging utility
const log = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${new Date().toISOString()} ${message}`, ...args),
  debug: (message: string, ...args: any[]) => console.log(`[DEBUG] ${new Date().toISOString()} ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${new Date().toISOString()} ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${new Date().toISOString()} ${message}`, ...args),
};

// Ensure the data directory exists
const dataDir = path.dirname('./data/dockety.db');
if (!fs.existsSync(dataDir)) {
  log.info(`Creating data directory: ${dataDir}`);
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database('./data/dockety.db');
log.info('Database connection established');

// Initialize the database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS hosts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'local',
    host TEXT,
    port INTEGER,
    tls BOOLEAN DEFAULT 0,
    socketProxy BOOLEAN DEFAULT 0,
    status TEXT DEFAULT 'unknown',
    lastChecked TEXT
  )
`);
log.info('Database schema initialized');

// Add socketProxy column to existing tables if it doesn't exist (migration)
try {
  db.exec(`ALTER TABLE hosts ADD COLUMN socketProxy BOOLEAN DEFAULT 0`);
  log.info('Added socketProxy column to hosts table');
} catch (error) {
  // Column might already exist, ignore error
  log.debug('socketProxy column already exists or migration failed (expected for new databases)');
}

// Ensure there's at least one host to represent the local Docker daemon
const checkInitialHost = () => {
  const row = db.prepare('SELECT COUNT(*) as count FROM hosts').get() as { count: number };
  if (row.count === 0) {
    log.info('No hosts found, creating default local Docker host');
    db.prepare('INSERT INTO hosts (id, name, type, status) VALUES (?, ?, ?, ?)')
      .run('local-docker', 'Local Docker', 'local', 'unknown');
    log.info('Default local Docker host created');
  }
};

checkInitialHost();


export const databaseService = {
  getHosts(): Host[] {
    log.debug('Retrieving all hosts from database');
    const hosts = db.prepare('SELECT * FROM hosts').all() as Host[];
    log.info(`Retrieved ${hosts.length} hosts from database`);
    return hosts;
  },

  addHost(name: string, type: 'local' | 'remote' = 'local', host?: string, port?: number, tls?: boolean, socketProxy?: boolean): Host {
    const id = `host-${Date.now()}`;
    log.info(`Adding new host to database: ${name} (${type})`, { id, host, port, tls, socketProxy });
    db.prepare('INSERT INTO hosts (id, name, type, host, port, tls, socketProxy, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, name, type, host || null, port || null, tls ? 1 : 0, socketProxy ? 1 : 0, 'unknown');
    log.info(`Host ${id} added to database successfully`);
    return { id, name, type, host, port, tls, socketProxy, status: 'unknown' };
  },

  updateHost(id: string, name: string, type?: 'local' | 'remote', host?: string, port?: number, tls?: boolean, socketProxy?: boolean): Host {
    log.info(`Updating host ${id} in database: ${name}`, { type, host, port, tls, socketProxy });

    // Get current host data
    const currentHost = db.prepare('SELECT * FROM hosts WHERE id = ?').get(id) as Host;
    if (!currentHost) {
      throw new Error(`Host ${id} not found`);
    }

    // Update with provided values or keep current values
    const updatedData = {
      name: name,
      type: type !== undefined ? type : currentHost.type,
      host: host !== undefined ? host : currentHost.host,
      port: port !== undefined ? port : currentHost.port,
      tls: tls !== undefined ? (tls ? 1 : 0) : currentHost.tls,
      socketProxy: socketProxy !== undefined ? (socketProxy ? 1 : 0) : currentHost.socketProxy
    };

    log.debug(`Updating host with data:`, updatedData);

    db.prepare('UPDATE hosts SET name = ?, type = ?, host = ?, port = ?, tls = ?, socketProxy = ? WHERE id = ?')
      .run(updatedData.name, updatedData.type, updatedData.host, updatedData.port, updatedData.tls, updatedData.socketProxy, id);

    const updatedHost = db.prepare('SELECT * FROM hosts WHERE id = ?').get(id) as Host;
    log.info(`Host ${id} updated in database successfully`);
    return updatedHost;
  }, updateHostStatus(id: string, status: 'unknown' | 'connected' | 'disconnected' | 'error'): void {
    log.debug(`Updating status for host ${id} to ${status}`);
    db.prepare('UPDATE hosts SET status = ?, lastChecked = ? WHERE id = ?')
      .run(status, new Date().toISOString(), id);
    log.info(`Host ${id} status updated to ${status}`);
  },

  removeHost(id: string): void {
    const row = db.prepare('SELECT COUNT(*) as count FROM hosts').get() as { count: number };
    if (row.count <= 1) {
      log.warn(`Attempted to remove last host ${id}, operation blocked`);
      throw new Error("Cannot remove the last host.");
    }
    log.info(`Removing host ${id} from database`);
    db.prepare('DELETE FROM hosts WHERE id = ?').run(id);
    log.info(`Host ${id} removed from database successfully`);
  }
};
