# Cleanup Candidates (Review Required)

Below are files that appear non-essential for runtime and may be safely removed for a lean production deployment. Please review and confirm which to delete.

## Tests and Dev Utilities
- test-getobject.js: S3 getObject test script.
- test-s3-putobject.js: S3 putObject test script.
- test-s3-upload.js: S3 upload test script.
- test-signed-url.js: Signed URL test script.
- test.html: Standalone test page.

## One-off Setup / Maintenance Scripts
- apply-bucket-policy.js: Applies S3 bucket policy.
- apply-cors.js: Applies S3 CORS configuration.
- create-s3-bucket.js: Creates S3 bucket.
- fix-bucket-acl.js: Adjusts S3 bucket ACL.
- update-s3-acl.js: Updates S3 ACL.
- check-bucket-policy.js: Checks bucket policy.
- check-iam-policy.js: Checks IAM policy.
- fix-image-metadata.js: Normalizes image metadata.
- fix-all-images.js: Bulk image fix utility.
- restore-images.js: Restores images utility.

## Migration / Recovery (likely one-time)
- migration.js: General migration script.
- migrate-old-products.js: Legacy products migration.
- migrate_bulk_only.js: Bulk-only migration.
- migrate_to_cloudinary.js: Migrates images to Cloudinary.
- recover-cloudinary-images.js: Recovers Cloudinary images.
- recover-no-backups.js: Recovery path when no backups.
- restore-from-mongodb-backup.js: Restore from MongoDB backup.

## Docs (keep if still needed)
- AWS_PERMISSION_FIX.md
- AWS_S3_SETUP.md
- FIX_IMAGE_UPLOAD.md
- IMAGE_RECOVERY_GUIDE.md
- OLD_PRODUCTS_MIGRATION.md
- RENDER_FIX.md
- S3_SETUP_COMPLETE.md

## Notes
- `admin2.html` and `category-management2.html` reference `/api/shop2/...` and look actively used for Shop 2 admin; keep.
- `admin.html` and `category-management.html` likely for Shop 1; keep unless you have consolidated.
- `server.js`, `index.html`, `menu.html`, `shop2.html` are core runtime and should be kept.

If you approve, I can delete a subset (e.g., all Tests and One-off Setup/Maintenance Scripts) or the entire set above. Provide your selection and I’ll proceed.