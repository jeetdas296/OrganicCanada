import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260921141327 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`drop index if exists "IDX_customer_notification_idempotency_key";`);
    this.addSql(`alter table if exists "customer_notification" drop column if exists "is_read";`);

    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_customer_notification_idempotency_key_global" ON "customer_notification" ("idempotency_key") WHERE deleted_at IS NULL OR deleted_at IS NOT NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_customer_notification_idempotency_key_global";`);

    this.addSql(`alter table if exists "customer_notification" add column if not exists "is_read" boolean not null default false;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_customer_notification_idempotency_key" ON "customer_notification" ("idempotency_key") WHERE deleted_at IS NULL;`);
  }

}
