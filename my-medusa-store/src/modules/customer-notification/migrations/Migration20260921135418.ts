import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260921135418 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "customer_notification" ("id" text not null, "customer_id" text not null, "title" text not null, "message" text not null, "entity_type" text not null, "entity_id" text not null, "idempotency_key" text not null, "is_read" boolean not null default false, "read_at" timestamptz null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "customer_notification_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_customer_notification_deleted_at" ON "customer_notification" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_customer_notification_customer_id" ON "customer_notification" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_customer_notification_idempotency_key" ON "customer_notification" ("idempotency_key") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "customer_notification" cascade;`);
  }

}
