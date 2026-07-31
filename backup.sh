#!/bin/bash
set -e
BACKUP_DIR="$HOME/backups"
mkdir -p "$BACKUP_DIR"
DB="$HOME/library/dev.db"
NAME="library_$(date +%Y%m%d_%H%M%S).db"
cp "$DB" "$BACKUP_DIR/$NAME"
# keep last 30 backups
ls -t "$BACKUP_DIR"/library_*.db 2>/dev/null | tail -n +31 | xargs -r rm
echo "backup: $NAME $(ls -lh "$BACKUP_DIR/$NAME" | awk '{print $5}')"
