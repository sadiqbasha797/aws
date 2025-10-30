# AWS S3 Configuration and Usage Guide

## Environment Variables Required

Make sure your `.env` file contains the following variables:

```env
AWS_ACCESS_KEY_ID=AKIAYWBJYXLAU53V52HF
AWS_SECRET_ACCESS_KEY=vpsQDNfUvQYr3lPDtIBU/c7TfUdgeqliYAJ5sWUT
AWS_REGION=eu-north-1
S3_BUCKET_NAME=your_bucket_name
```

## Files Created

1. **config/s3.js** - S3 Client configuration
2. **utils/s3.js** - S3 utility functions (upload, download, delete, list, etc.)
3. **controllers/fileController.js** - Controller for file operations
4. **routes/fileRoutes.js** - API routes for file operations

## Available API Endpoints

All endpoints require authentication (JWT token in Authorization header).

### Upload a File
```
POST /api/files/upload
Content-Type: multipart/form-data

Body: file (form-data)

Response:
{
  "message": "File uploaded successfully",
  "file": {
    "key": "uploads/1234567890-filename.jpg",
    "url": "https://bucket-name.s3.eu-north-1.amazonaws.com/uploads/1234567890-filename.jpg"
  }
}
```

### Download a File
```
GET /api/files/download/:key

Example: GET /api/files/download/uploads%2F1234567890-filename.jpg

Response: File download
```

### Delete a File
```
DELETE /api/files/delete/:key

Example: DELETE /api/files/delete/uploads%2F1234567890-filename.jpg

Response:
{
  "message": "File deleted successfully"
}
```

### List Files
```
GET /api/files/list?prefix=uploads/

Response:
{
  "message": "Files retrieved successfully",
  "count": 5,
  "files": [
    {
      "key": "uploads/file1.jpg",
      "size": 102400,
      "lastModified": "2025-10-29T10:00:00.000Z"
    }
  ]
}
```

### Get Presigned URL
```
GET /api/files/url/:key?expiresIn=3600

Example: GET /api/files/url/uploads%2F1234567890-filename.jpg?expiresIn=3600

Response:
{
  "message": "Presigned URL generated successfully",
  "url": "https://bucket-name.s3.amazonaws.com/...",
  "expiresIn": 3600
}
```

### Check if File Exists
```
GET /api/files/exists/:key

Example: GET /api/files/exists/uploads%2F1234567890-filename.jpg

Response:
{
  "exists": true,
  "key": "uploads/1234567890-filename.jpg"
}
```

## Using S3 Utilities Directly in Code

```javascript
const { 
  uploadFile, 
  downloadFile, 
  deleteFile, 
  listFiles, 
  getPresignedUrl,
  fileExists 
} = require('./utils/s3');

// Upload example
const buffer = fs.readFileSync('file.jpg');
const result = await uploadFile('my-folder/file.jpg', buffer, 'image/jpeg');

// Download example
const fileBuffer = await downloadFile('my-folder/file.jpg');

// Delete example
await deleteFile('my-folder/file.jpg');

// List files
const files = await listFiles('my-folder/');

// Get presigned URL (expires in 1 hour)
const url = await getPresignedUrl('my-folder/file.jpg', 3600);

// Check if file exists
const exists = await fileExists('my-folder/file.jpg');
```

## Testing with cURL

### Upload a file:
```bash
curl -X POST http://localhost:7000/api/files/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/your/file.jpg"
```

### Download a file:
```bash
curl -X GET http://localhost:7000/api/files/download/uploads/filename.jpg \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  --output downloaded-file.jpg
```

### List files:
```bash
curl -X GET http://localhost:7000/api/files/list \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Important Notes

1. Make sure your S3 bucket name is set in the `.env` file as `S3_BUCKET_NAME`
2. The bucket should have appropriate permissions configured in AWS
3. Files are uploaded to memory first (max 10MB by default) before being sent to S3
4. All routes are protected and require authentication
5. File size limit can be adjusted in `routes/fileRoutes.js`
6. **URL Encoding**: When file keys contain special characters (like `/`), they need to be URL encoded in the API calls. For example, `uploads/file.jpg` becomes `uploads%2Ffile.jpg` in the URL

## Security Recommendations

1. Never commit your `.env` file to version control
2. Use IAM roles with minimal required permissions
3. Enable bucket versioning for better file management
4. Consider enabling server-side encryption on your S3 bucket
5. Set up CORS policy on your S3 bucket if accessing from browser
6. Regularly rotate your AWS access keys

