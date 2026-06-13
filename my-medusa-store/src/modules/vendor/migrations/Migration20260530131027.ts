import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260530131027 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "vendor" add column if not exists "user_id" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "vendor" drop column if exists "user_id";`);
  }

}
