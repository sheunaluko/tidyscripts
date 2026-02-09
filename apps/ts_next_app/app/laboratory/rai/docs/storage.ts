export const id = 'storage';
export const title = 'Storage & Data';
export const order = 2;

export const content = `
## Storage Backends

R.AI supports two storage backends for persisting your data (templates, settings, test history, dot phrases). You can switch between them in **Settings > Storage Mode**.

### Cloud Storage (Default)

- Data is stored in a remote SurrealDB cloud database
- **Requires login** — you must be authenticated via Firebase to use this backend
- Data syncs across all your devices and browsers
- No practical storage limits
- Data is associated with your user account
- New users start in cloud mode — on first load, a prompt appears to log in or switch to local

### Local Storage

- Data is stored in your browser's \`localStorage\`
- No login required
- Data persists across sessions on the same browser
- Data is **not** synced across devices or browsers
- Subject to browser storage limits (~5-10MB)
- Keys are prefixed with \`appdata::rai::\` to avoid collisions

> **Note:** If you are in cloud mode but not logged in, R.AI will prompt you to either log in (to sync data across devices) or switch to local storage. Switching to Cloud mode migrates local data non-destructively — existing cloud data is preserved.

## How It Works

Both backends implement the same \`StorageBackend\` interface with four operations:

| Operation | Description |
|-----------|-------------|
| **save** | Store content under an app_id + data_key pair |
| **load** | Retrieve a full record (content, metadata, timestamps) |
| **remove** | Delete a key and its data |
| **list** | List all keys for an app |

The \`AppDataStore\` facade wraps the active backend and adds:

- **Convenience methods** — \`get()\` returns content directly (or null), \`set()\` returns boolean
- **Telemetry** — Every operation is tracked via the insights system
- **Migration** — Move all data from one backend to another

## Data Records

Each stored item is an \`AppDataRecord\` containing:

\`\`\`
{
  app_id:     "rai"              // App identifier
  data_key:   "settings"         // Key name
  content:    { ... }            // Your data (any JSON-serializable value)
  metadata:   { ... }            // Optional metadata
  created_at: "2025-01-15T..."   // First save timestamp (preserved on updates)
  updated_at: "2025-01-15T..."   // Last save timestamp
}
\`\`\`

## Migration

### Automatic Legacy Migration

On first launch, R.AI automatically migrates data from the old \`rai_*\` localStorage keys to the new \`appdata::rai::*\` format. This runs once and is gated by a migration flag. Old keys are preserved as backup.

### Local to Cloud Migration

When switching from Local to Cloud storage mode, R.AI migrates your local data to the cloud non-destructively:

- **Settings** (object keys) — cloud data wins; if the cloud already has settings, local settings are skipped
- **Templates, dot phrases, test runs** (array keys) — merged by \`id\` field; items that exist only in local are added to cloud, existing cloud items are untouched
- Local data is never deleted — it stays as a backup

## Telemetry

All storage operations emit telemetry events via the insights system:

- \`appdata_save\` — Key saved, with duration
- \`appdata_load\` — Key loaded, with duration
- \`appdata_remove\` — Key removed
- \`appdata_list\` — Keys listed, with count
- \`appdata_migrate\` — Migration completed, with migrated/failed counts

These events are available in the session export for debugging and performance analysis.
`;
