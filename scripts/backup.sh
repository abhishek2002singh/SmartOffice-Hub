#!/bin/bash
# MongoDB backup script for AMS
# Run via cron: 0 2 * * * /var/www/ams/scripts/backup.sh >> /var/log/ams-backup.log 2>&1

set -e

MONGO_URI="${MONGODB_URI:-mongodb://localhost:27017/ams_prod}"
BACKUP_DIR="/var/backups/ams"
DATE=$(date +%Y-%m-%d_%H-%M)
BACKUP_PATH="$BACKUP_DIR/ams_$DATE"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting MongoDB backup..."

mongodump --uri="$MONGO_URI" --out="$BACKUP_PATH" --gzip --quiet

# Compress the dump directory
tar -czf "${BACKUP_PATH}.tar.gz" -C "$BACKUP_DIR" "ams_$DATE"
rm -rf "$BACKUP_PATH"

SIZE=$(du -sh "${BACKUP_PATH}.tar.gz" | cut -f1)
echo "[$(date)] Backup complete: ${BACKUP_PATH}.tar.gz ($SIZE)"

# Rotate old backups
find "$BACKUP_DIR" -name "ams_*.tar.gz" -mtime "+$RETENTION_DAYS" -delete
COUNT=$(find "$BACKUP_DIR" -name "ams_*.tar.gz" | wc -l)
echo "[$(date)] Backup retention: $COUNT backup(s) retained (keeping ${RETENTION_DAYS}d)"
