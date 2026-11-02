# Stock Lab Cloud Sync

Single-owner manual cloud backup using a private R2 bucket and D1 metadata.

## Provision
1. Install Wrangler: `npm install -D wrangler`.
2. Authenticate: `npx wrangler login`.
3. Create D1: `npx wrangler d1 create stock-lab-sync`; copy the returned database ID into `wrangler.toml`.
4. Create R2: `npx wrangler r2 bucket create stock-lab-backups`.
5. Apply schema: `npx wrangler d1 execute stock-lab-sync --remote --file=cloudflare/schema.sql`.
6. Set a random password (at least 16 characters): `npx wrangler secret put STOCKLAB_SYNC_PASSWORD`.
7. Set `ALLOWED_ORIGIN` to the exact Stock Lab deployed origin.
8. Deploy: `npx wrangler deploy`.

In Stock Lab Settings, enter the Worker HTTPS URL and the same password. The password stays in page memory, not local storage. Cloud restore requires explicit confirmation and replaces local inventory. Export a local JSON backup first. This initial release is manual single-owner backup/restore, not real-time multi-user sync.