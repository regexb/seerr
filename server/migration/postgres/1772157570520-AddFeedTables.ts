import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFeedTables1772157570520 implements MigrationInterface {
  name = 'AddFeedTables1772157570520';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "feed_items" ("id" SERIAL NOT NULL, "providerId" character varying NOT NULL, "tmdbId" integer NOT NULL, "mediaType" character varying NOT NULL, "score" real NOT NULL DEFAULT '0', "weight" real NOT NULL DEFAULT '1', "sortJitter" real NOT NULL DEFAULT '0', "sourceType" character varying NOT NULL DEFAULT 'external', "data" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8378f689823a6af8f2c6d2863cc" PRIMARY KEY ("id"))`
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
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b1b761765b304897695eb25f4b"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_077851a63215421f3bc49bcf38"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fbc78bbb021acae61b29d416c8"`
    );
    await queryRunner.query(`DROP TABLE "feed_items"`);
  }
}
