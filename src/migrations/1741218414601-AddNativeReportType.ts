import { ReportType } from "entities/ReportType.entity";
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNativeReportType1741218414601 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const TYPES = [{ type: "Native" }];

    await Promise.all(
      TYPES.map((typeData) =>
        queryRunner.manager.save(
          queryRunner.manager.create<ReportType>(ReportType, {
            description: typeData.type,
          }),
        ),
      ),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const type = await queryRunner.manager.findOne<ReportType>(ReportType, {
      where: { description: "Native" },
    });

    if (type) {
      queryRunner.manager.softDelete(ReportType, type);
    }
  }
}
