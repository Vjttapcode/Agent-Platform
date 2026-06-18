#!/usr/bin/env bash
# WAL-safe SQLite backup. Schedule via cron, e.g.:
#   0 2 * * * /opt/agent-platform/ba-agent/deploy/backup.sh
set -euo pipefail

DB="${DATA_DIR:-/var/lib/ba-agent}/app.db"
DEST="${BACKUP_DIR:-/var/backups/ba-agent}"
mkdir -p "$DEST"
STAMP="$(date +%F-%H%M)"

# .backup is safe while the DB is in use (WAL).
sqlite3 "$DB" ".backup '$DEST/app-$STAMP.db'"

# keep the last 14 backups
ls -1t "$DEST"/app-*.db | tail -n +15 | xargs -r rm -f
echo "backup ok → $DEST/app-$STAMP.db"
