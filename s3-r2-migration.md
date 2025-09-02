# S3 to R2 Migration Script

This script migrates URLs from Amazon S3 to Cloudflare R2. It updates video, thumbnail, and image URLs across the `dream`, `keyframe`, `playlist`, and `user` tables.

## What It Does

The migration script will update the following fields:

### Dream Table

- `video`
- `original_video`
- `thumbnail`
- `filmstrip`

### Keyframe Table

- `image`

### Playlist Table

- `thumbnail`

### User Table

- `avatar`

## Constants

The script uses these constants which you can modify as needed:

```typescript
const S3_SERVER_ADDRESS =
  "https://edream-storage-dreams-staging.s3.us-east-1.amazonaws.com";
const R2_SERVER_ADDRESS = "https://your-r2-domain.com";
```

## Usage

### 1. Dry Run (Recommended First Step)

First, run a dry run to see what would be migrated without making any changes:

```bash
npm run migrate:s3-to-r2
```

This will:

- Show you how many records would be affected
- Display detailed statistics
- Not make any actual changes to the database

### 2. Execute Migration

Once you're satisfied with the dry run results, execute the actual migration:

```bash
npm run migrate:s3-to-r2 -- --r2-domain=https://your-new-r2-domain.com --execute
```

**Important**: Replace `https://your-new-r2-domain.com` with your actual R2 domain.

### Examples

```bash
# Dry run
npm run migrate:s3-to-r2 -- --r2-domain=https://pub-1234567890abcdef.r2.dev

# Execute migration
npm run migrate:s3-to-r2 -- --r2-domain=https://assets.yourdomain.com --execute
```

## Before Running

1. **Backup your database** - Always backup before running migrations
2. **Test in staging** - Run the migration in a staging environment first
3. **Verify R2 setup** - Ensure your R2 bucket is properly configured and accessible
4. **Check R2 domain** - Verify your R2 domain is correctly set up

## After Running

1. **Verify URLs** - Check that the migrated URLs are accessible
2. **Test application** - Ensure videos, images, and thumbnails load correctly
3. **Monitor logs** - Watch for any errors in application logs

## Troubleshooting

### Database connection issues

Check your environment variables and database connection settings in `.env`

### No records found

This is normal if all URLs have already been migrated or if you're using different S3 bucket URLs
