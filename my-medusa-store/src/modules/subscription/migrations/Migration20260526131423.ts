import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260526131423 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "subscription" ("id" text not null, "customer_id" text not null, "original_order_id" text not null, "variant_id" text not null, "stripe_payment_method_id" text not null, "interval" text not null, "next_billing_date" timestamptz not null, "status" text check ("status" in ('active', 'paused', 'canceled')) not null default 'active', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "subscription_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_subscription_deleted_at" ON "subscription" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "subscription" cascade;`);
  }

}
