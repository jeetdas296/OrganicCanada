import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260831131807 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "pal_document" add column if not exists "file_url" text null, add column if not exists "file_size" integer null, add column if not exists "timeline_step_id" text null, add column if not exists "uploaded_by" text null, add column if not exists "uploaded_at" timestamptz null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "pal_document" drop column if exists "file_url", drop column if exists "file_size", drop column if exists "timeline_step_id", drop column if exists "uploaded_by", drop column if exists "uploaded_at";`);
  }

}
