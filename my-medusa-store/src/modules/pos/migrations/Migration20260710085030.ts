import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260710085030 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "pos_user" drop constraint if exists "pos_user_email_unique";`);
    this.addSql(`create table if not exists "pos_user" ("id" text not null, "email" text not null, "password_hash" text not null, "full_name" text not null, "role" text check ("role" in ('cashier')) not null default 'cashier', "active" boolean not null default true, "store_location_id" text null, "sales_channel_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pos_user_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_pos_user_email_unique" ON "pos_user" ("email") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pos_user_deleted_at" ON "pos_user" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "pos_user" cascade;`);
  }

}
