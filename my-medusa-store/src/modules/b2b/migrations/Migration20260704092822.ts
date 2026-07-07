import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260704092822 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "quote" ("id" text not null, "cart_id" text null, "order_id" text null, "draft_order_id" text null, "company_id" text null, "customer_id" text null, "status" text check ("status" in ('pending_approval', 'approved', 'rejected', 'converted', 'canceled')) not null default 'pending_approval', "payment_term" text null, "total" numeric null, "currency_code" text null, "metadata" jsonb null, "expires_at" timestamptz null, "raw_total" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "quote_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_quote_deleted_at" ON "quote" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "quote" cascade;`);
  }

}
