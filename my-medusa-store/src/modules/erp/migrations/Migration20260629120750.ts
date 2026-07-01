import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260629120750 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "erp_mapping" ("id" text not null, "medusa_entity_type" text not null, "medusa_id" text not null, "erp_doctype" text not null, "erp_name" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "erp_mapping_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_erp_mapping_deleted_at" ON "erp_mapping" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "erp_sync_log" ("id" text not null, "direction" text not null, "entity_type" text not null, "medusa_id" text not null, "status" text not null, "error" text null, "payload_hash" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "erp_sync_log_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_erp_sync_log_deleted_at" ON "erp_sync_log" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "erp_mapping" cascade;`);

    this.addSql(`drop table if exists "erp_sync_log" cascade;`);
  }

}
