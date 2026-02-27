import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFeedTables1772157570519 implements MigrationInterface {
  name = 'AddFeedTables1772157570519';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "feed_items" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "providerId" varchar NOT NULL, "tmdbId" integer NOT NULL, "mediaType" varchar NOT NULL, "score" real NOT NULL DEFAULT (0), "weight" real NOT NULL DEFAULT (1), "sortJitter" real NOT NULL DEFAULT (0), "sourceType" varchar NOT NULL DEFAULT ('external'), "data" text, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fbc78bbb021acae61b29d416c8" ON "feed_items" ("providerId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_077851a63215421f3bc49bcf38" ON "feed_items" ("tmdbId", "mediaType") `
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b1b761765b304897695eb25f4b" ON "feed_items" ("providerId", "tmdbId", "mediaType") `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_b1b761765b304897695eb25f4b"`);
    await queryRunner.query(`DROP INDEX "IDX_077851a63215421f3bc49bcf38"`);
    await queryRunner.query(`DROP INDEX "IDX_fbc78bbb021acae61b29d416c8"`);
    await queryRunner.query(`DROP TABLE "feed_items"`);
  }
}
