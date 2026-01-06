#!/usr/bin/env node

/**
 * No Backups? No Problem!
 * Download images from Cloudinary & Re-upload to S3
 * 
 * Your 243 products still exist in MongoDB (just no img URLs)
 * Your image files still exist on Cloudinary servers
 * 
 * This guide shows how to reconnect them
 */

console.log(`
╔════════════════════════════════════════════════════════════════╗
║   Recover Images: Download from Cloudinary → Upload to S3       ║
╚════════════════════════════════════════════════════════════════╝

✅ YOUR SITUATION:
   • 243 products exist in MongoDB ✓
   • All images exist on Cloudinary ✓
   • Database just lost the URLs (img set to null)
   • You still have access to images ✓

📍 STEP 1: Download Images from Cloudinary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Go to: https://cloudinary.com/console/media_library
2. Login with your account
3. Click folder: "e-menu-products"
4. Select ALL images:
   • Click checkbox at top (Select All)
   OR
   • Ctrl+A to select all
5. Click "Download"
6. Choose "Download all as ZIP"
7. Wait for ZIP download to complete

⏱️  Expected size: ~50-200 MB (243 images)
⏱️  Download time: 2-10 minutes depending on speed

📍 STEP 2: Extract the ZIP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Extract ZIP to: C:\\Users\\mohan\\Downloads\\cloudinary-images
2. You'll see 243 JPG files with names like:
   • product-[id]-[timestamp].jpg
   • Example: product-6887ec8dce4637eeaa702325-1754850810136.jpg

📍 STEP 3: Upload to S3 via Admin Panel
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FASTEST WAY (Bulk Upload):
  1. Start your server: node server.js
  2. Open: http://localhost:3000/bulk-upload.html
  3. Drag & drop all 243 images at once
  4. Click "Upload All"
  5. Wait for completion

ALTERNATIVE (One by one via Admin):
  1. Go to: http://localhost:3000/admin.html
  2. For each product:
     • Find the matching image file
     • Edit product
     • Upload image
     • Save
  3. Takes longer but you control each one

⏱️  Bulk upload: 5-15 minutes
⏱️  Manual upload: Several hours

📍 STEP 4: Verify Success
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After upload:
  1. Go to: http://localhost:3000/menu.html
  2. Check if images appear
  3. Verify all 243 products have images
  4. Test search/filtering

Check database:
  • Products should now have img field with S3 URLs
  • Example: https://e-menu-products.s3.amazonaws.com/products/[file]

═══════════════════════════════════════════════════════════════════

💡 QUICK MATCHING GUIDE:

When you extracted the ZIP, image filenames are like:
  product-[MONGODB_ID]-[TIMESTAMP].jpg

The MongoDB ID matches your product's _id field!
  • Search for products with matching ID
  • Upload that image for that product
  • Bulk uploader handles this automatically ✓

═══════════════════════════════════════════════════════════════════

📝 COMMANDS TO USE:

# After downloading, to count files:
dir C:\\Users\\mohan\\Downloads\\cloudinary-images | Measure-Object

# Start server:
node server.js

# Check products in database:
curl http://localhost:3000/api/products | jq length

═══════════════════════════════════════════════════════════════════

⚠️  IMPORTANT NOTES:

1. Image files on Cloudinary are STILL there
   • Even if you don't download now
   • You can always come back later
   • They won't expire

2. Take your time uploading
   • Bulk upload is optional
   • Can upload gradually via admin panel
   • No rush to upload all 243 at once

3. After uploading to S3:
   • Images are yours (not reliant on Cloudinary)
   • S3 is cheaper and more reliable
   • Full control over pricing/data

═══════════════════════════════════════════════════════════════════

🎯 SUMMARY OF STEPS:

1. ✅ Download from Cloudinary (5-10 min)
2. ✅ Extract ZIP locally (1 min)
3. ✅ Bulk upload via http://localhost:3000/bulk-upload.html (5-15 min)
4. ✅ Verify on http://localhost:3000/menu.html (1 min)
5. ✅ Done! Images recovered

Total time: 15-30 minutes for full recovery

═══════════════════════════════════════════════════════════════════
`);

console.log(`
Ready? Start here:
  1. https://cloudinary.com/console/media_library
  2. Download e-menu-products folder as ZIP
  3. Extract and come back for next steps
`);
