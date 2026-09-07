import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260821091057 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "pal_country_rule" ("id" text not null, "origin_country" text null, "destination_country" text null, "trade_type" text check ("trade_type" in ('DOMESTIC', 'CROSS_BORDER')) null, "transport_mode" text check ("transport_mode" in ('PARCEL', 'LTL', 'FTL', 'AIR_FREIGHT', 'OCEAN_LCL', 'OCEAN_FCL')) null, "rule_type" text not null, "rule_data" jsonb null, "enabled" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pal_country_rule_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_country_rule_deleted_at" ON "pal_country_rule" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pal_incoterm" ("id" text not null, "code" text not null, "name" text not null, "description" text null, "enabled" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pal_incoterm_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_incoterm_deleted_at" ON "pal_incoterm" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pal_provider" ("id" text not null, "code" text not null, "name" text not null, "type" text not null, "enabled" boolean not null default true, "priority" integer not null default 0, "configuration" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pal_provider_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_provider_deleted_at" ON "pal_provider" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pal_provider_capability" ("id" text not null, "provider_id" text not null, "transport_mode" text check ("transport_mode" in ('PARCEL', 'LTL', 'FTL', 'AIR_FREIGHT', 'OCEAN_LCL', 'OCEAN_FCL')) not null, "domestic" boolean not null default false, "cross_border" boolean not null default false, "rating" boolean not null default false, "booking" boolean not null default false, "tracking" boolean not null default false, "label" boolean not null default false, "customs" boolean not null default false, "enabled" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pal_provider_capability_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_provider_capability_provider_id" ON "pal_provider_capability" ("provider_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_provider_capability_deleted_at" ON "pal_provider_capability" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pal_provider_service" ("id" text not null, "provider_id" text not null, "code" text not null, "name" text not null, "transport_mode" text check ("transport_mode" in ('PARCEL', 'LTL', 'FTL', 'AIR_FREIGHT', 'OCEAN_LCL', 'OCEAN_FCL')) not null, "domestic" boolean not null default false, "cross_border" boolean not null default false, "service_level" text null, "enabled" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pal_provider_service_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_provider_service_provider_id" ON "pal_provider_service" ("provider_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_provider_service_deleted_at" ON "pal_provider_service" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pal_shipment" ("id" text not null, "order_id" text not null, "vendor_id" text null, "order_type" text check ("order_type" in ('B2C', 'B2B')) not null, "trade_type" text check ("trade_type" in ('DOMESTIC', 'CROSS_BORDER')) not null, "trade_direction" text check ("trade_direction" in ('DOMESTIC', 'EXPORT', 'IMPORT')) not null, "origin_address_id" text not null, "destination_address_id" text not null, "transport_mode" text check ("transport_mode" in ('PARCEL', 'LTL', 'FTL', 'AIR_FREIGHT', 'OCEAN_LCL', 'OCEAN_FCL')) null, "status" text not null, "currency" text null, "declared_value" numeric null, "incoterm" text null, "selected_provider_id" text null, "selected_service_id" text null, "external_reference" text null, "raw_declared_value" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pal_shipment_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_shipment_deleted_at" ON "pal_shipment" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pal_provider_booking" ("id" text not null, "shipment_id" text not null, "provider_id" text not null, "provider_service_id" text null, "external_booking_id" text null, "external_shipment_id" text null, "status" text not null, "request_payload" jsonb null, "response_payload" jsonb null, "booked_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pal_provider_booking_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_provider_booking_shipment_id" ON "pal_provider_booking" ("shipment_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_provider_booking_provider_id" ON "pal_provider_booking" ("provider_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_provider_booking_provider_service_id" ON "pal_provider_booking" ("provider_service_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_provider_booking_deleted_at" ON "pal_provider_booking" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pal_package" ("id" text not null, "shipment_id" text not null, "package_type" text not null, "length" integer null, "width" integer null, "height" integer null, "dimension_unit" text null, "weight" integer null, "weight_unit" text null, "quantity" integer not null, "label_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pal_package_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_package_shipment_id" ON "pal_package" ("shipment_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_package_deleted_at" ON "pal_package" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pal_document_requirement" ("id" text not null, "shipment_id" text not null, "document_type" text not null, "required" boolean not null default true, "reason" text null, "rule_id" text null, "status" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pal_document_requirement_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_document_requirement_shipment_id" ON "pal_document_requirement" ("shipment_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_document_requirement_deleted_at" ON "pal_document_requirement" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pal_document" ("id" text not null, "shipment_id" text not null, "type" text not null, "status" text not null, "file_id" text null, "file_name" text null, "mime_type" text null, "document_number" text null, "generated_by" text null, "version" integer not null default 1, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pal_document_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_document_shipment_id" ON "pal_document" ("shipment_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_document_deleted_at" ON "pal_document" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pal_customs_declaration" ("id" text not null, "shipment_id" text not null, "declaration_type" text not null, "status" text not null, "customs_reference" text null, "declared_value" numeric null, "currency" text null, "duties" numeric null, "taxes" numeric null, "export_country" text null, "import_country" text null, "submitted_at" timestamptz null, "cleared_at" timestamptz null, "raw_declared_value" jsonb null, "raw_duties" jsonb null, "raw_taxes" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pal_customs_declaration_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_customs_declaration_shipment_id" ON "pal_customs_declaration" ("shipment_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_customs_declaration_deleted_at" ON "pal_customs_declaration" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pal_compliance_record" ("id" text not null, "shipment_id" text not null, "trade_type" text check ("trade_type" in ('DOMESTIC', 'CROSS_BORDER')) not null, "trade_direction" text check ("trade_direction" in ('DOMESTIC', 'EXPORT', 'IMPORT')) not null, "status" text check ("status" in ('PENDING', 'VALIDATING', 'READY', 'BLOCKED', 'CLEARED')) not null, "incoterm" text null, "customs_status" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pal_compliance_record_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_compliance_record_shipment_id" ON "pal_compliance_record" ("shipment_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_compliance_record_deleted_at" ON "pal_compliance_record" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pal_shipment_address" ("id" text not null, "shipment_id" text not null, "type" text check ("type" in ('FROM', 'TO', 'BILLING')) not null, "company" text null, "first_name" text null, "last_name" text null, "address_1" text not null, "address_2" text null, "city" text not null, "province" text null, "postal_code" text not null, "country_code" text not null, "phone" text null, "email" text null, "tax_id" text null, "business_number" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pal_shipment_address_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_shipment_address_shipment_id" ON "pal_shipment_address" ("shipment_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_shipment_address_deleted_at" ON "pal_shipment_address" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pal_shipment_event" ("id" text not null, "shipment_id" text not null, "event_type" text not null, "source" text null, "payload" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pal_shipment_event_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_shipment_event_shipment_id" ON "pal_shipment_event" ("shipment_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_shipment_event_deleted_at" ON "pal_shipment_event" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pal_shipment_item" ("id" text not null, "shipment_id" text not null, "order_item_id" text null, "product_id" text null, "variant_id" text null, "sku" text null, "title" text not null, "quantity" integer not null, "unit_price" numeric null, "total_value" numeric null, "weight" integer null, "hs_code" text null, "country_of_origin" text null, "product_description" text null, "raw_unit_price" jsonb null, "raw_total_value" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pal_shipment_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_shipment_item_shipment_id" ON "pal_shipment_item" ("shipment_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_shipment_item_deleted_at" ON "pal_shipment_item" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pal_customs_item" ("id" text not null, "customs_declaration_id" text not null, "shipment_item_id" text null, "hs_code" text null, "description" text not null, "quantity" integer not null, "unit_value" numeric not null, "total_value" numeric not null, "country_of_origin" text null, "weight" integer null, "raw_unit_value" jsonb not null, "raw_total_value" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pal_customs_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_customs_item_customs_declaration_id" ON "pal_customs_item" ("customs_declaration_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_customs_item_shipment_item_id" ON "pal_customs_item" ("shipment_item_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_customs_item_deleted_at" ON "pal_customs_item" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pal_shipment_status_history" ("id" text not null, "shipment_id" text not null, "from_status" text null, "to_status" text not null, "source" text null, "reason" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pal_shipment_status_history_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_shipment_status_history_shipment_id" ON "pal_shipment_status_history" ("shipment_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_shipment_status_history_deleted_at" ON "pal_shipment_status_history" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pal_shipping_rule" ("id" text not null, "name" text not null, "priority" integer not null default 0, "enabled" boolean not null default true, "conditions" jsonb not null, "actions" jsonb not null, "created_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pal_shipping_rule_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_shipping_rule_deleted_at" ON "pal_shipping_rule" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pal_tracking_event" ("id" text not null, "shipment_id" text not null, "provider_id" text null, "provider_event_id" text null, "event_code" text null, "normalized_status" text not null, "description" text null, "location" text null, "event_at" timestamptz not null, "raw_payload" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pal_tracking_event_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_tracking_event_shipment_id" ON "pal_tracking_event" ("shipment_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_tracking_event_provider_id" ON "pal_tracking_event" ("provider_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_tracking_event_deleted_at" ON "pal_tracking_event" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pal_transport" ("id" text not null, "shipment_id" text not null, "mode" text check ("mode" in ('PARCEL', 'LTL', 'FTL', 'AIR_FREIGHT', 'OCEAN_LCL', 'OCEAN_FCL')) not null, "service_level" text null, "carrier_service" text null, "estimated_transit_days" integer null, "estimated_cost" numeric null, "actual_cost" numeric null, "currency" text null, "raw_estimated_cost" jsonb null, "raw_actual_cost" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pal_transport_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_transport_shipment_id" ON "pal_transport" ("shipment_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_transport_deleted_at" ON "pal_transport" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pal_vendor_location" ("id" text not null, "vendor_id" text not null, "name" text not null, "address" jsonb null, "contact" jsonb null, "operational_hours" jsonb null, "enabled" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pal_vendor_location_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_vendor_location_deleted_at" ON "pal_vendor_location" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pal_vendor_shipping_config" ("id" text not null, "vendor_id" text not null, "enabled" boolean not null default true, "default_incoterm" text null, "allowed_modes" jsonb null, "preferred_providers" jsonb null, "pickup_settings" jsonb null, "international_enabled" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pal_vendor_shipping_config_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pal_vendor_shipping_config_deleted_at" ON "pal_vendor_shipping_config" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "pal_provider_capability" add constraint "pal_provider_capability_provider_id_foreign" foreign key ("provider_id") references "pal_provider" ("id") on update cascade;`);

    this.addSql(`alter table if exists "pal_provider_service" add constraint "pal_provider_service_provider_id_foreign" foreign key ("provider_id") references "pal_provider" ("id") on update cascade;`);

    this.addSql(`alter table if exists "pal_provider_booking" add constraint "pal_provider_booking_shipment_id_foreign" foreign key ("shipment_id") references "pal_shipment" ("id") on update cascade;`);
    this.addSql(`alter table if exists "pal_provider_booking" add constraint "pal_provider_booking_provider_id_foreign" foreign key ("provider_id") references "pal_provider" ("id") on update cascade;`);
    this.addSql(`alter table if exists "pal_provider_booking" add constraint "pal_provider_booking_provider_service_id_foreign" foreign key ("provider_service_id") references "pal_provider_service" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table if exists "pal_package" add constraint "pal_package_shipment_id_foreign" foreign key ("shipment_id") references "pal_shipment" ("id") on update cascade;`);

    this.addSql(`alter table if exists "pal_document_requirement" add constraint "pal_document_requirement_shipment_id_foreign" foreign key ("shipment_id") references "pal_shipment" ("id") on update cascade;`);

    this.addSql(`alter table if exists "pal_document" add constraint "pal_document_shipment_id_foreign" foreign key ("shipment_id") references "pal_shipment" ("id") on update cascade;`);

    this.addSql(`alter table if exists "pal_customs_declaration" add constraint "pal_customs_declaration_shipment_id_foreign" foreign key ("shipment_id") references "pal_shipment" ("id") on update cascade;`);

    this.addSql(`alter table if exists "pal_compliance_record" add constraint "pal_compliance_record_shipment_id_foreign" foreign key ("shipment_id") references "pal_shipment" ("id") on update cascade;`);

    this.addSql(`alter table if exists "pal_shipment_address" add constraint "pal_shipment_address_shipment_id_foreign" foreign key ("shipment_id") references "pal_shipment" ("id") on update cascade;`);

    this.addSql(`alter table if exists "pal_shipment_event" add constraint "pal_shipment_event_shipment_id_foreign" foreign key ("shipment_id") references "pal_shipment" ("id") on update cascade;`);

    this.addSql(`alter table if exists "pal_shipment_item" add constraint "pal_shipment_item_shipment_id_foreign" foreign key ("shipment_id") references "pal_shipment" ("id") on update cascade;`);

    this.addSql(`alter table if exists "pal_customs_item" add constraint "pal_customs_item_customs_declaration_id_foreign" foreign key ("customs_declaration_id") references "pal_customs_declaration" ("id") on update cascade;`);
    this.addSql(`alter table if exists "pal_customs_item" add constraint "pal_customs_item_shipment_item_id_foreign" foreign key ("shipment_item_id") references "pal_shipment_item" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table if exists "pal_shipment_status_history" add constraint "pal_shipment_status_history_shipment_id_foreign" foreign key ("shipment_id") references "pal_shipment" ("id") on update cascade;`);

    this.addSql(`alter table if exists "pal_tracking_event" add constraint "pal_tracking_event_shipment_id_foreign" foreign key ("shipment_id") references "pal_shipment" ("id") on update cascade;`);
    this.addSql(`alter table if exists "pal_tracking_event" add constraint "pal_tracking_event_provider_id_foreign" foreign key ("provider_id") references "pal_provider" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table if exists "pal_transport" add constraint "pal_transport_shipment_id_foreign" foreign key ("shipment_id") references "pal_shipment" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "pal_provider_capability" drop constraint if exists "pal_provider_capability_provider_id_foreign";`);

    this.addSql(`alter table if exists "pal_provider_service" drop constraint if exists "pal_provider_service_provider_id_foreign";`);

    this.addSql(`alter table if exists "pal_provider_booking" drop constraint if exists "pal_provider_booking_provider_id_foreign";`);

    this.addSql(`alter table if exists "pal_tracking_event" drop constraint if exists "pal_tracking_event_provider_id_foreign";`);

    this.addSql(`alter table if exists "pal_provider_booking" drop constraint if exists "pal_provider_booking_provider_service_id_foreign";`);

    this.addSql(`alter table if exists "pal_provider_booking" drop constraint if exists "pal_provider_booking_shipment_id_foreign";`);

    this.addSql(`alter table if exists "pal_package" drop constraint if exists "pal_package_shipment_id_foreign";`);

    this.addSql(`alter table if exists "pal_document_requirement" drop constraint if exists "pal_document_requirement_shipment_id_foreign";`);

    this.addSql(`alter table if exists "pal_document" drop constraint if exists "pal_document_shipment_id_foreign";`);

    this.addSql(`alter table if exists "pal_customs_declaration" drop constraint if exists "pal_customs_declaration_shipment_id_foreign";`);

    this.addSql(`alter table if exists "pal_compliance_record" drop constraint if exists "pal_compliance_record_shipment_id_foreign";`);

    this.addSql(`alter table if exists "pal_shipment_address" drop constraint if exists "pal_shipment_address_shipment_id_foreign";`);

    this.addSql(`alter table if exists "pal_shipment_event" drop constraint if exists "pal_shipment_event_shipment_id_foreign";`);

    this.addSql(`alter table if exists "pal_shipment_item" drop constraint if exists "pal_shipment_item_shipment_id_foreign";`);

    this.addSql(`alter table if exists "pal_shipment_status_history" drop constraint if exists "pal_shipment_status_history_shipment_id_foreign";`);

    this.addSql(`alter table if exists "pal_tracking_event" drop constraint if exists "pal_tracking_event_shipment_id_foreign";`);

    this.addSql(`alter table if exists "pal_transport" drop constraint if exists "pal_transport_shipment_id_foreign";`);

    this.addSql(`alter table if exists "pal_customs_item" drop constraint if exists "pal_customs_item_customs_declaration_id_foreign";`);

    this.addSql(`alter table if exists "pal_customs_item" drop constraint if exists "pal_customs_item_shipment_item_id_foreign";`);

    this.addSql(`drop table if exists "pal_country_rule" cascade;`);

    this.addSql(`drop table if exists "pal_incoterm" cascade;`);

    this.addSql(`drop table if exists "pal_provider" cascade;`);

    this.addSql(`drop table if exists "pal_provider_capability" cascade;`);

    this.addSql(`drop table if exists "pal_provider_service" cascade;`);

    this.addSql(`drop table if exists "pal_shipment" cascade;`);

    this.addSql(`drop table if exists "pal_provider_booking" cascade;`);

    this.addSql(`drop table if exists "pal_package" cascade;`);

    this.addSql(`drop table if exists "pal_document_requirement" cascade;`);

    this.addSql(`drop table if exists "pal_document" cascade;`);

    this.addSql(`drop table if exists "pal_customs_declaration" cascade;`);

    this.addSql(`drop table if exists "pal_compliance_record" cascade;`);

    this.addSql(`drop table if exists "pal_shipment_address" cascade;`);

    this.addSql(`drop table if exists "pal_shipment_event" cascade;`);

    this.addSql(`drop table if exists "pal_shipment_item" cascade;`);

    this.addSql(`drop table if exists "pal_customs_item" cascade;`);

    this.addSql(`drop table if exists "pal_shipment_status_history" cascade;`);

    this.addSql(`drop table if exists "pal_shipping_rule" cascade;`);

    this.addSql(`drop table if exists "pal_tracking_event" cascade;`);

    this.addSql(`drop table if exists "pal_transport" cascade;`);

    this.addSql(`drop table if exists "pal_vendor_location" cascade;`);

    this.addSql(`drop table if exists "pal_vendor_shipping_config" cascade;`);
  }

}
