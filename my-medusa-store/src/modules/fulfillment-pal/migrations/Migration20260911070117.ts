import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260911070117 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "pal_tracking_event" drop constraint if exists "pal_tracking_event_shipment_id_provider_event_id_unique";`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_pal_tracking_event_shipment_id_provider_event_id_unique" ON "pal_tracking_event" ("shipment_id", "provider_event_id") WHERE provider_event_id IS NOT NULL AND deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_pal_tracking_event_shipment_id_provider_event_id_unique";`);
  }

}
