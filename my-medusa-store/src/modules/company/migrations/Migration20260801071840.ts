import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260801071840 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "quote_message" add column if not exists "message_type" text check ("message_type" in ('text', 'proposal_update')) not null default 'text', add column if not exists "proposal_diff" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "quote_message" drop column if exists "message_type", drop column if exists "proposal_diff";`);
  }

}
