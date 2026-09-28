import type { Pool } from "mysql2/promise";

export class ProgramsReadRepository {
  constructor(private readonly pool: Pool) {}

  async upsert(p: { id: number; title?: string | null; level?: string | null; trainerId?: number | null }): Promise<void> {
    await this.pool.query(
      `INSERT INTO programs_read (id, title, level, trainer_id)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title=VALUES(title), level=VALUES(level), trainer_id=VALUES(trainer_id)`,
      [p.id, p.title ?? null, p.level ?? null, p.trainerId ?? null],
    );
  }
}
