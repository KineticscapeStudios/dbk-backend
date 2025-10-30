import { Migration } from '@mikro-orm/migrations';

export class Migration20251013192243 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "video" add column if not exists "file_name" text null, add column if not exists "file_path" text null, add column if not exists "mime_type" text null;`);
    this.addSql(`alter table if exists "video" rename column "video_url" to "url";`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_video_url" ON "video" (url) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_video_url";`);
    this.addSql(`alter table if exists "video" drop column if exists "file_name", drop column if exists "file_path", drop column if exists "mime_type";`);

    this.addSql(`alter table if exists "video" rename column "url" to "video_url";`);
  }

}
