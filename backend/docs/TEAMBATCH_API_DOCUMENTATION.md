# Team Batch API Documentation

## Overview

The Team Batch API allows managers to create and manage team batches with member assignments and batch images stored in AWS S3. All endpoints require authentication, and most operations are restricted to managers only.

## Model Structure

```javascript
{
  batchName: String (max 100 chars),
  batchNumber: String (unique, auto-generated if not provided),
  batchDescription: String (max 500 chars),
  batchMembers: [ObjectId] (references to TeamMember),
  createdBy: {
    userId: ObjectId (references Manager),
    name: String,
    email: String
  },
  batchImage: {
    filename: String,
    originalName: String,
    s3Key: String,
    s3Url: String,
    fileSize: Number,
    mimeType: String,
    uploadedAt: Date
  },
  status: "active" | "inactive" | "completed" (default: "active"),
  startDate: Date,
  endDate: Date,
  tags: [String],
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### 1. Create Team Batch
```
POST /api/team-batches
Content-Type: multipart/form-data
Authorization: Bearer <token> (Manager only)

Body (form-data):
- batchName: string
- batchNumber: string (optional, auto-generated if not provided)
- batchDescription: string
- batchMembers: string (JSON array of member IDs)
- tags: string (comma-separated)
- status: string (optional, default: "active")
- startDate: string (ISO date, optional)
- endDate: string (ISO date, optional)
- batchImage: file (optional, max 5MB, images only)

Response:
{
  "message": "Team batch created successfully",
  "teamBatch": { ... }
}
```

### 2. Get All Team Batches (with filtering and pagination)
```
GET /api/team-batches?page=1&limit=10&status=active&search=keyword&sortBy=createdAt&sortOrder=desc
Authorization: Bearer <token>

Query Parameters:
- page: number (default: 1)
- limit: number (default: 10)
- status: "active" | "inactive" | "completed"
- createdBy: ObjectId
- search: string (searches batchName, batchDescription, batchNumber, tags)
- sortBy: string (default: "createdAt")
- sortOrder: "asc" | "desc" (default: "desc")

Response:
{
  "message": "Team batches retrieved successfully",
  "teamBatches": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 50,
    "itemsPerPage": 10
  }
}
```

### 3. Get Team Batch by ID
```
GET /api/team-batches/:id
Authorization: Bearer <token>

Response:
{
  "message": "Team batch retrieved successfully",
  "teamBatch": { ... }
}
```

### 4. Update Team Batch
```
PUT /api/team-batches/:id
Content-Type: application/json
Authorization: Bearer <token> (Manager only)

Body:
{
  "batchName": "Updated Batch Name",
  "batchDescription": "Updated Description",
  "batchMembers": "[\"memberId1\", \"memberId2\"]",
  "tags": "tag1,tag2,tag3",
  "status": "completed",
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-12-31T23:59:59.999Z"
}

Response:
{
  "message": "Team batch updated successfully",
  "teamBatch": { ... }
}
```

### 5. Delete Team Batch
```
DELETE /api/team-batches/:id
Authorization: Bearer <token> (Manager only)

Response:
{
  "message": "Team batch deleted successfully"
}
```

### 6. Upload/Update Batch Image
```
POST /api/team-batches/:id/image
Content-Type: multipart/form-data
Authorization: Bearer <token> (Manager only)

Body (form-data):
- batchImage: file (required, max 5MB, images only)

Response:
{
  "message": "Batch image uploaded successfully",
  "teamBatch": { ... },
  "image": { ... }
}
```

### 7. Remove Batch Image
```
DELETE /api/team-batches/:id/image
Authorization: Bearer <token> (Manager only)

Response:
{
  "message": "Batch image removed successfully",
  "teamBatch": { ... }
}
```

### 8. Add Member to Batch
```
POST /api/team-batches/:id/members
Content-Type: application/json
Authorization: Bearer <token> (Manager only)

Body:
{
  "memberId": "507f1f77bcf86cd799439011"
}

Response:
{
  "message": "Member added to batch successfully",
  "teamBatch": { ... }
}
```

### 9. Remove Member from Batch
```
DELETE /api/team-batches/:id/members/:memberId
Authorization: Bearer <token> (Manager only)

Response:
{
  "message": "Member removed from batch successfully",
  "teamBatch": { ... }
}
```

### 10. Get Current Manager's Batches
```
GET /api/team-batches/my
Authorization: Bearer <token> (Manager only)

Response:
{
  "message": "Manager batches retrieved successfully",
  "teamBatches": [...],
  "count": 5
}
```

### 11. Get Active Batches
```
GET /api/team-batches/active
Authorization: Bearer <token>

Response:
{
  "message": "Active batches retrieved successfully",
  "teamBatches": [...],
  "count": 10
}
```

### 12. Get Batch Statistics
```
GET /api/team-batches/statistics
Authorization: Bearer <token>

Response:
{
  "message": "Batch statistics retrieved successfully",
  "statistics": {
    "totalBatches": 25,
    "statusBreakdown": [
      { "_id": "active", "count": 15, "totalMembers": 75 },
      { "_id": "completed", "count": 8, "totalMembers": 40 },
      { "_id": "inactive", "count": 2, "totalMembers": 10 }
    ],
    "averageMembersPerBatch": 5.0
  }
}
```

## Image Upload Specifications

### Supported Image Types
- **JPEG/JPG**: image/jpeg, image/jpg
- **PNG**: image/png
- **GIF**: image/gif
- **WebP**: image/webp
- **BMP**: image/bmp
- **SVG**: image/svg+xml

### Image Limits
- **Maximum file size**: 5MB per image
- **Storage location**: S3 under `batch-images/` prefix
- **Naming convention**: `batch-images/{timestamp}-{original-filename}`

### Image Management
- Images are automatically deleted from S3 when batch is deleted
- Uploading a new image replaces the existing one
- Images can be removed without deleting the batch

## Usage Examples

### Create Team Batch with Image (cURL)
```bash
curl -X POST http://localhost:7000/api/team-batches \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "batchName=Development Team Alpha" \
  -F "batchDescription=Frontend development team for Q1 projects" \
  -F "batchMembers=[\"507f1f77bcf86cd799439011\", \"507f1f77bcf86cd799439012\"]" \
  -F "tags=frontend,development,q1" \
  -F "status=active" \
  -F "startDate=2025-01-01T00:00:00.000Z" \
  -F "endDate=2025-03-31T23:59:59.999Z" \
  -F "batchImage=@/path/to/team-photo.jpg"
```

### Get Batches with Filtering
```bash
curl -X GET "http://localhost:7000/api/team-batches?status=active&search=development&page=1&limit=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Add Member to Batch
```bash
curl -X POST http://localhost:7000/api/team-batches/507f1f77bcf86cd799439011/members \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"memberId": "507f1f77bcf86cd799439013"}'
```

### Upload Batch Image
```bash
curl -X POST http://localhost:7000/api/team-batches/507f1f77bcf86cd799439011/image \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "batchImage=@/path/to/new-team-photo.jpg"
```

## Auto-Generated Features

### Batch Number Generation
- **Format**: `BATCH-YYYY-XXXX` (e.g., `BATCH-2025-0001`)
- **Auto-increment**: Automatically incremented per year
- **Uniqueness**: Ensured across all batches
- **Override**: Can be manually specified during creation

### Virtuals
- `memberCount`: Returns the number of members in the batch
- `hasImage`: Returns boolean indicating if batch has an image

## Error Responses

### Image Upload Errors
```json
{
  "error": "File too large",
  "details": "Image size cannot exceed 5MB"
}

{
  "error": "Invalid file type",
  "details": "File type application/pdf is not allowed. Only image files are permitted."
}
```

### Authorization Errors
```json
{
  "error": "Only managers can create team batches"
}

{
  "error": "Only managers can upload batch images"
}
```

### Validation Errors
```json
{
  "error": "Team batch not found"
}

{
  "error": "Team member not found"
}

{
  "error": "No image found for this batch"
}
```

## Security Features

1. **Manager-Only Operations**: Most write operations restricted to managers
2. **Authentication Required**: All endpoints require valid JWT token
3. **Image Type Validation**: Only image files allowed for batch images
4. **File Size Limits**: 5MB limit for image uploads
5. **S3 Security**: Images stored securely in AWS S3
6. **User Tracking**: All operations track the manager who performed them

## Model Methods

### Instance Methods
- `addMember(memberId)` - Add a team member to the batch
- `removeMember(memberId)` - Remove a team member from the batch
- `updateImage(imageData)` - Update the batch image
- `removeImage()` - Remove the batch image

### Static Methods
- `findByCreator(managerId)` - Find batches created by a specific manager
- `findActive()` - Find all active batches
- `findByMember(memberId)` - Find batches containing a specific member
- `getStatistics()` - Get comprehensive batch statistics

### Pre-save Middleware
- **Batch Number Generation**: Automatically generates unique batch numbers
- **Year-based Numbering**: Resets numbering each year

## Integration Notes

1. **S3 Configuration**: Ensure S3 bucket is configured with proper permissions
2. **Manager Role**: Only users with `role: 'manager'` can perform write operations
3. **Team Member References**: Batch members must be valid TeamMember document IDs
4. **Image Cleanup**: Images are automatically removed from S3 when deleted
5. **Population**: Batch members are automatically populated in responses with basic info

## Relationship Management

- **Team Members**: Many-to-many relationship (members can be in multiple batches)
- **Manager**: One-to-many relationship (manager can create multiple batches)
- **Cascade Delete**: Deleting a batch removes associated S3 images
- **Reference Integrity**: Invalid member IDs are handled gracefully
