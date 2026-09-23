import mysql, { Pool, PoolOptions } from "mysql2/promise";

export interface DbConfig {
  host: string; port: number; user: string; password: string; database: string; ssl?: boolean;
}
export function createPool(cfg: DbConfig): Pool {
  const options: PoolOptions = {
    host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password, database: cfg.database,
    waitForConnections: true, connectionLimit: 10,
  };
  if (cfg.ssl) options.ssl = { rejectUnauthorized: false };
  return mysql.createPool(options);
}