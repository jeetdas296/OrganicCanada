import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260722134603 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "quote_conversation" drop constraint if exists "quote_conversation_quote_id_unique";`);
    this.addSql(`create table if not exists "quote_conversation" ("id" text not null, "quote_id" text not null, "company_id" text not null, "status" text check ("status" in ('open', 'agreement_reached', 'closed')) not null default 'open', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "quote_conversation_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_quote_conversation_quote_id_unique" ON "quote_conversation" ("quote_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_quote_conversation_deleted_at" ON "quote_conversation" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "quote_message" ("id" text not null, "conversation_id" text not null, "sender_type" text check ("sender_type" in ('admin', 'customer')) not null, "sender_id" text not null, "text" text not null, "price_proposal" numeric null, "attachment_url" text null, "raw_price_proposal" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "quote_message_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_quote_message_conversation_id" ON "quote_message" ("conversation_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_quote_message_deleted_at" ON "quote_message" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "quote_message" add constraint "quote_message_conversation_id_foreign" foreign key ("conversation_id") references "quote_conversation" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "quote_message" drop constraint if exists "quote_message_conversation_id_foreign";`);

    this.addSql(`drop table if exists "quote_conversation" cascade;`);

    this.addSql(`drop table if exists "quote_message" cascade;`);
  }

}
