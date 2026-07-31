#!/bin/bash
cd ~/library
BACKUP_DIR=~/backups
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cp dev.db "$BACKUP_DIR/library_$TIMESTAMP.db"
echo "Backup created: library_$TIMESTAMP.db"

# Keep only last 30 backups
ls -t "$BACKUP_DIR"/library_*.db 2>/dev/null | tail -n +31 | xargs rm -f 2>/dev/null
