import type { ExercisesRepository, NovaVezba } from "../repositories/ExercisesRepository";
import type { IAuditLogger } from "../ports/IAuditLogger";
import type { Exercise } from "../domain/models";
import { NotFound } from "../utils/errors";

export class ExercisesService {
  constructor(private readonly repo: ExercisesRepository, private readonly audit: IAuditLogger) {}

  list(trainerId: number): Promise<Exercise[]> {
    return this.repo.listByTrainer(trainerId);
  }

  async create(trainerId: number, d: NovaVezba): Promise<Exercise> {
    const id = await this.repo.create(trainerId, d);
    await this.audit.zabelezi("vezba_kreirana", { id, name: d.name }, trainerId);
    const v = await this.repo.getById(id);
    if (!v) throw NotFound("Vezba nije pronadjena");
    return v;
  }

  async update(trainerId: number, id: number, d: Partial<NovaVezba>): Promise<Exercise> {
    const post = await this.repo.getById(id);
    if (!post || post.trainerId !== trainerId) throw NotFound("Vezba nije pronadjena");
    await this.repo.update(trainerId, id, d);
    await this.audit.zabelezi("vezba_izmenjena", { id }, trainerId);
    return (await this.repo.getById(id))!;
  }

  async delete(trainerId: number, id: number): Promise<void> {
    const post = await this.repo.getById(id);
    if (!post || post.trainerId !== trainerId) throw NotFound("Vezba nije pronadjena");
    await this.repo.delete(trainerId, id);
    await this.audit.zabelezi("vezba_obrisana", { id }, trainerId);
  }
}
