import type { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import type { Exercise, Nivo } from "../domain/models";

const SEL = `id, trainer_id AS trainerId, name, description, muscle_group AS muscleGroup,
             equipment, level, video_url AS videoUrl, created_at AS createdAt`;

interface Row extends RowDataPacket {
  id: number; trainerId: number; name: string; description: string | null;
  muscleGroup: string; equipment: string; level: Nivo; videoUrl: string | null; createdAt: Date;
}
const map = (r: Row): Exercise => ({
  id: r.id, trainerId: r.trainerId, name: r.name, description: r.description,
  muscleGroup: r.muscleGroup, equipment: r.equipment, level: r.level,
  videoUrl: r.videoUrl, createdAt: new Date(r.createdAt),
});

export interface NovaVezba {
  name: string; description: string | null; muscleGroup: string;
  equipment: string; level: Nivo; videoUrl: string | null;
}

export class ExercisesRepository {
  constructor(private readonly pool: Pool) {}

  async listByTrainer(trainerId: number): Promise<Exercise[]> {
    const [rows] = await this.pool.query<Row[]>(
      `SELECT ${SEL} FROM exercises WHERE trainer_id = ? ORDER BY created_at DESC`,
      [trainerId],
    );
    return rows.map(map);
  }

  async getById(id: number): Promise<Exercise | null> {
    const [rows] = await this.pool.query<Row[]>(`SELECT ${SEL} FROM exercises WHERE id = ? LIMIT 1`, [id]);
    return rows.length ? map(rows[0]) : null;
  }

  async create(trainerId: number, d: NovaVezba): Promise<number> {
    const [res] = await this.pool.query<ResultSetHeader>(
      `INSERT INTO exercises (trainer_id, name, description, muscle_group, equipment, level, video_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [trainerId, d.name, d.description, d.muscleGroup, d.equipment, d.level, d.videoUrl],
    );
    return res.insertId;
  }

  async update(trainerId: number, id: number, d: Partial<NovaVezba>): Promise<void> {
    const polja: string[] = []; const arg: unknown[] = [];
    if (d.name !== undefined) { polja.push("name=?"); arg.push(d.name); }
    if (d.description !== undefined) { polja.push("description=?"); arg.push(d.description); }
    if (d.muscleGroup !== undefined) { polja.push("muscle_group=?"); arg.push(d.muscleGroup); }
    if (d.equipment !== undefined) { polja.push("equipment=?"); arg.push(d.equipment); }
    if (d.level !== undefined) { polja.push("level=?"); arg.push(d.level); }
    if (d.videoUrl !== undefined) { polja.push("video_url=?"); arg.push(d.videoUrl); }
    if (!polja.length) return;
    arg.push(trainerId, id);
    await this.pool.query(`UPDATE exercises SET ${polja.join(", ")} WHERE trainer_id=? AND id=?`, arg);
  }

  async delete(trainerId: number, id: number): Promise<void> {
    await this.pool.query("DELETE FROM exercises WHERE trainer_id=? AND id=?", [trainerId, id]);
  }
}
