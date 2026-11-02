# Stock Lab

Offline-first inventory manager for web and Android (Capacitor).

## Local data and backups

- Inventory records, categories, scan history, and product photos are stored on-device in IndexedDB.
- On first launch after this storage upgrade, existing LocalStorage inventory is migrated to IndexedDB. The old product JSON is removed only after the IndexedDB writes complete successfully.
- Automatic local snapshots are kept in IndexedDB, with a maximum of 10 snapshots and a daily snapshot interval.
- Use **Backup Inventory** to export a portable JSON file. Use **Restore Inventory** to import one; restore replaces the current products, categories, and scan history after confirmation.
- Theme, display, scanner, and biometric preferences remain in LocalStorage.
- No Cloudflare, cloud database, remote sync, or account is required. The app works offline after it has been loaded/installed.

## Development

```sh
npm install
npm run build
```

The Vite build output is written to `www/` for Capacitor.
