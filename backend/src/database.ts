import Database from 'better-sqlite3';
import { Host } from './types';

const db = new Database('./data/dockety.db');

// Initialize the database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS hosts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
  )
`);

// Ensure there's at least one host to represent the local Docker daemon
const checkInitialHost = () => {
    const row = db.prepare('SELECT COUNT(*) as count FROM hosts').get() as { count: number };
    if (row.count === 0) {
        db.prepare('INSERT INTO hosts (id, name) VALUES (?, ?)')
          .run('local-docker', 'Local Docker');
    }
};

checkInitialHost();


export const databaseService = {
  getHosts(): Host[] {
    return db.prepare('SELECT * FROM hosts').all() as Host[];
  },

  addHost(name: string): Host {
    const id = `host-${Date.now()}`;
    db.prepare('INSERT INTO hosts (id, name) VALUES (?, ?)')
      .run(id, name);
    return { id, name };
  },

  updateHost(id: string, name: string): Host {
    db.prepare('UPDATE hosts SET name = ? WHERE id = ?')
      .run(name, id);
    return { id, name };
  },

  removeHost(id: string): void {
    const row = db.prepare('SELECT COUNT(*) as count FROM hosts').get() as { count: number };
    if (row.count <= 1) {
        throw new Error("Cannot remove the last host.");
    }
    db.prepare('DELETE FROM hosts WHERE id = ?').run(id);
  }
};
