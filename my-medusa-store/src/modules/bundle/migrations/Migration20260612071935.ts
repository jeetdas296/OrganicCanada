import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260612071935 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "bundle" add column if not exists "metadata" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "bundle" drop column if exists "metadata";`);
  }

}
