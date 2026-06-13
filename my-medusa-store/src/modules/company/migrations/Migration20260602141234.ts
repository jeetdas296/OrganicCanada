import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260602141234 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "company" drop constraint if exists "company_corporate_email_unique";`);
    this.addSql(`create table if not exists "company" ("id" text not null, "name" text not null, "tax_id" text null, "corporate_email" text not null, "is_approved" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "company_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_company_corporate_email_unique" ON "company" ("corporate_email") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_company_deleted_at" ON "company" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "company" cascade;`);
  }

}
