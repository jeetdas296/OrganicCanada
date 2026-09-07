import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260826131528 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "pal_shipment_timeline" ("id" text not null, "shipment_id" text not null, "scenario" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pal_shipment_timeline_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_shipment_timeline_shipment_id" ON "pal_shipment_timeline" ("shipment_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_shipment_timeline_deleted_at" ON "pal_shipment_timeline" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pal_shipment_timeline_step" ("id" text not null, "timeline_id" text not null, "step_code" text not null, "step_name" text not null, "step_order" integer not null, "status" text check ("status" in ('LOCKED', 'AVAILABLE', 'IN_PROGRESS', 'CONFIGURED', 'COMPLETED', 'BLOCKED')) not null, "configuration" jsonb null, "started_at" timestamptz null, "completed_at" timestamptz null, "completed_by" text null, "notes" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pal_shipment_timeline_step_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_shipment_timeline_step_timeline_id" ON "pal_shipment_timeline_step" ("timeline_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_shipment_timeline_step_deleted_at" ON "pal_shipment_timeline_step" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "pal_shipment_timeline" add constraint "pal_shipment_timeline_shipment_id_foreign" foreign key ("shipment_id") references "pal_shipment" ("id") on update cascade;`);

    this.addSql(`alter table if exists "pal_shipment_timeline_step" add constraint "pal_shipment_timeline_step_timeline_id_foreign" foreign key ("timeline_id") references "pal_shipment_timeline" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "pal_shipment_timeline_step" drop constraint if exists "pal_shipment_timeline_step_timeline_id_foreign";`);

    this.addSql(`drop table if exists "pal_shipment_timeline" cascade;`);

    this.addSql(`drop table if exists "pal_shipment_timeline_step" cascade;`);
  }

}
