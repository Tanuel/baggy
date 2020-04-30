import { Meta, Provider } from "@baggy/registry";
import sqlite3 from "sqlite3";

const Model = {
  metadata: "metadata",
  artifacts: "artifacts",
};

function bootstrap(db: sqlite3.Database): void {
  const queries = [
    `CREATE TABLE IF NOT EXISTS "${Model.metadata}" (
      "key"   TEXT NOT NULL UNIQUE,
      "value" TEXT,
      PRIMARY KEY("key")
    );`,
    `CREATE TABLE IF NOT EXISTS  "${Model.artifacts}" (
       "key"    TEXT NOT NULL UNIQUE,
       "value"  BLOB,
       PRIMARY  KEY("key")
    );`,
  ];

  db.serialize(() => {
    queries.forEach((query) => {
      db.run(query);
    });
  });
}

export default class Database implements Provider {
  constructor(private db: sqlite3.Database) {
    bootstrap(db);
  }

  async deleteDir(path: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`DELETE FROM ${Model.artifacts} WHERE key LIKE ?`);
      stmt
        .run(path + "%", (err) => {
          if (err === null) resolve(true);
          else reject(err);
        })
        .finalize();
    });
  }

  async deleteFile(path: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`DELETE FROM ${Model.artifacts} WHERE key = ?`);
      stmt
        .run(path, (err) => {
          if (err === null) resolve(true);
          else reject(err);
        })
        .finalize();
    });
  }

  async deleteMeta(packageName: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`DELETE FROM ${Model.metadata} WHERE key = ?`);
      stmt
        .run(packageName, (err) => {
          if (err === null) resolve(true);
          else reject(err);
        })
        .finalize();
    });
  }

  async getFile(path: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`SELECT value FROM ${Model.artifacts} WHERE key = ?`);
      stmt
        .get(path, (err, row) => {
          if (err === null) {
            resolve(row && row.value ? row.value : null);
          } else {
            reject(err);
          }
        })
        .finalize();
    });
  }

  async getMeta(packageName: string): Promise<Meta | null> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`SELECT value FROM ${Model.metadata} WHERE key = ?`);
      stmt
        .get(packageName, (err, row) => {
          if (err === null) {
            resolve(row && row.value ? JSON.parse(row.value) : null);
          } else {
            reject(err);
          }
        })
        .finalize();
    });
  }

  async writeFile(path: string, content: Buffer): Promise<any> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`REPLACE INTO ${Model.artifacts} (key, value) VALUES(?, ?)`);
      stmt
        .run([path, content], (err: Error | null) => {
          if (err === null) {
            resolve(true);
          } else {
            reject(err);
          }
        })
        .finalize();
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async writeMeta(packageName: string, data: Meta, rev?: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`REPLACE INTO ${Model.metadata} (key, value) VALUES(?, ?)`);
      stmt
        .run([packageName, JSON.stringify(data)], (err: Error | null) => {
          if (err === null) {
            resolve(true);
          } else {
            reject(err);
          }
        })
        .finalize();
    });
  }
}
