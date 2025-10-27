import Database from 'better-sqlite3';
import { Host, User } from './types';
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
    apiKey TEXT,
    status TEXT DEFAULT 'unknown',
    lastChecked TEXT
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    is_approved BOOLEAN NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
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

// Add apiKey column to existing tables if it doesn't exist (migration)
try {
  db.exec(`ALTER TABLE hosts ADD COLUMN apiKey TEXT`);
  log.info('Added apiKey column to hosts table');
} catch (error) {
  // Column might already exist, ignore error
  log.debug('apiKey column already exists or migration failed (expected for new databases)');
}

// Add role and is_approved columns to users table if they don't exist (migration)
try {
  db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`);
  log.info('Added role column to users table');
} catch (error) {
  // Column might already exist, ignore error
  log.debug('role column already exists or migration failed (expected for new databases)');
}

try {
  db.exec(`ALTER TABLE users ADD COLUMN is_approved BOOLEAN NOT NULL DEFAULT 1`);
  log.info('Added is_approved column to users table');
} catch (error) {
  // Column might already exist, ignore error
  log.debug('is_approved column already exists or migration failed (expected for new databases)');
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

  addHost(name: string, type: 'local' | 'remote' = 'local', host?: string, port?: number, tls?: boolean, socketProxy?: boolean, apiKey?: string): Host {
    const id = `host-${Date.now()}`;
    log.info(`Adding new host to database: ${name} (${type})`, { id, host, port, tls, socketProxy, apiKey: apiKey ? '[REDACTED]' : undefined });
    db.prepare('INSERT INTO hosts (id, name, type, host, port, tls, socketProxy, apiKey, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, name, type, host || null, port || null, tls ? 1 : 0, socketProxy ? 1 : 0, apiKey || null, 'unknown');
    log.info(`Host ${id} added to database successfully`);
    return { id, name, type, host, port, tls, socketProxy, apiKey, status: 'unknown' };
  },

  updateHost(id: string, name: string, type?: 'local' | 'remote', host?: string, port?: number, tls?: boolean, socketProxy?: boolean, apiKey?: string): Host {
    log.info(`Updating host ${id} in database: ${name}`, { type, host, port, tls, socketProxy, apiKey: apiKey ? '[REDACTED]' : undefined });

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
      socketProxy: socketProxy !== undefined ? (socketProxy ? 1 : 0) : currentHost.socketProxy,
      apiKey: apiKey !== undefined ? apiKey : currentHost.apiKey
    };

    log.debug(`Updating host with data:`, { ...updatedData, apiKey: updatedData.apiKey ? '[REDACTED]' : undefined });

    db.prepare('UPDATE hosts SET name = ?, type = ?, host = ?, port = ?, tls = ?, socketProxy = ?, apiKey = ? WHERE id = ?')
      .run(updatedData.name, updatedData.type, updatedData.host, updatedData.port, updatedData.tls, updatedData.socketProxy, updatedData.apiKey, id);

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
  },

  getUserByUsername(username: string): User | null {
    log.debug(`Retrieving user by username: ${username}`);
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    if (user) {
      log.info(`User ${username} found`);
      return {
        ...user,
        isApproved: Boolean(user.is_approved) // Convert SQLite integer to boolean
      };
    } else {
      log.debug(`User ${username} not found`);
      return null;
    }
  },

  createUser(username: string, passwordHash: string, role: 'owner' | 'admin' | 'user' = 'user', isApproved: boolean = true): User {
    const id = `user-${Date.now()}`;
    const createdAt = new Date().toISOString();
    log.info(`Creating new user: ${username} with role: ${role}, approved: ${isApproved}`, { id });
    db.prepare('INSERT INTO users (id, username, password_hash, role, is_approved, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, username, passwordHash, role, isApproved ? 1 : 0, createdAt);
    log.info(`User ${username} created successfully`);
    return { id, username, passwordHash, role, isApproved, createdAt };
  },

  getAllUsers(): User[] {
    log.debug('Retrieving all users from database');
    const users = db.prepare('SELECT * FROM users').all() as any[];
    log.info(`Retrieved ${users.length} users from database`);
    return users.map(u => ({
      ...u,
      isApproved: Boolean(u.is_approved) // Convert SQLite integer to boolean
    }));
  },

  getUserById(id: string): User | null {
    log.debug(`Retrieving user by id: ${id}`);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    if (user) {
      log.info(`User ${id} found`);
      return {
        ...user,
        isApproved: Boolean(user.is_approved) // Convert SQLite integer to boolean
      };
    } else {
      log.debug(`User ${id} not found`);
      return null;
    }
  },

  deleteUser(id: string): void {
    log.info(`Deleting user ${id} from database`);
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    log.info(`User ${id} deleted from database successfully`);
  },

  updateUserPassword(id: string, newPasswordHash: string): void {
    log.info(`Updating password for user ${id}`);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newPasswordHash, id);
    log.info(`Password updated for user ${id}`);
  },

  updateUserRole(id: string, role: 'owner' | 'admin' | 'user'): void {
    log.info(`Updating role for user ${id} to ${role}`);
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
    log.info(`Role updated for user ${id} to ${role}`);
  },

  updateUserApproval(id: string, isApproved: boolean): void {
    log.info(`Updating approval status for user ${id} to ${isApproved}`);
    db.prepare('UPDATE users SET is_approved = ? WHERE id = ?').run(isApproved ? 1 : 0, id);
    log.info(`Approval status updated for user ${id} to ${isApproved}`);
  },

  getPendingUsers(): User[] {
    log.debug('Retrieving pending (unapproved) users from database');
    const users = db.prepare('SELECT * FROM users WHERE is_approved = 0').all() as any[];
    log.info(`Retrieved ${users.length} pending users from database`);
    return users.map(u => ({
      ...u,
      isApproved: Boolean(u.is_approved) // Convert SQLite integer to boolean
    }));
  },

  getApprovedUsers(): User[] {
    log.debug('Retrieving approved users from database');
    const users = db.prepare('SELECT * FROM users WHERE is_approved = 1').all() as any[];
    log.info(`Retrieved ${users.length} approved users from database`);
    return users.map(u => ({
      ...u,
      isApproved: Boolean(u.is_approved) // Convert SQLite integer to boolean
    }));
  },

  getUserCount(): number {
    const row = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    return row.count;
  }
};
