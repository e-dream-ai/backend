import { Dream } from "entities";
import { MigrationInterface, QueryRunner } from "typeorm";
import { Frame } from "types/dream.types";

export class FormatFilmstripOnDream1724874468256 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const repository = queryRunner.manager.getRepository(Dream);

    const records = await repository.find({ withDeleted: true });

    for (const record of records) {
      if (Array.isArray(record.filmstrip)) {
        const newFilmstrip = record.filmstrip.map((frame) => {
          if (typeof frame === "string") {
            const match = frame.match(/frame-(\d+)\.jpg/);
            const frameNumber = match ? parseInt(match[1]) : null;

            return {
              frameNumber,
              url: frame,
            } as Frame;
          }

          return frame;
        });

        await repository.update(record.id, { filmstrip: newFilmstrip });
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const repository = queryRunner.manager.getRepository(Dream);

    const records = await repository.find({ withDeleted: true });

    for (const record of records) {
      if (Array.isArray(record.filmstrip)) {
        const newFilmstrip = record.filmstrip.map((frame) => {
          if (typeof frame !== "string") {
            return frame.url;
          }

          return frame;
        });

        await repository.update(record.id, { filmstrip: newFilmstrip });
      }
    }
  }
}
