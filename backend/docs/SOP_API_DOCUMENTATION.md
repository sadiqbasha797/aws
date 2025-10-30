# SOP (Standard Operating Procedure) API Documentation

## Overview

The SOP API provides a comprehensive system for managing Standard Operating Procedures with **version control**, **document management**, and **soft delete with 30-day recovery**. All documents are stored securely in AWS S3.

## Key Features

- ✅ **Version Control**: Create multiple versions of SOPs with parent-child relationships
- ✅ **Document Management**: Upload, view, download documents with S3 storage
- ✅ **Soft Delete**: 30-day recycle bin with restoration capability
- ✅ **User Permissions**: Creator-based permissions for edit/delete
- ✅ **Full-Text Search**: Search across titles, descriptions, and tags
- ✅ **Pagination & Filtering**: Efficient data retrieval

---

## Model Structure

### SOP Document Schema

```javascript
{
  // Basic Information
  title: String (max 200 chars),
  description: String (max 1000 chars),
  process: String,
  
  // Documents with uploader tracking
  documents: [{
    filename: String,
    originalName: String,
    s3Key: String,
    s3Url: String,
    fileSize: Number,
    mimeType: String,
    uploadedAt: Date,
    uploadedBy: {
      userId: ObjectId,
      userType: "TeamMember" | "Manager",
      name: String,
      email: String
    }
  }],
  
  // Creator & Editor Tracking
  createdBy: {
    userId: ObjectId,
    userType: "TeamMember" | "Manager",
    name: String,
    email: String
  },
  updatedBy: {
    userId: ObjectId,
    userType: "TeamMember" | "Manager",
    name: String,
    email: String
  },
  
  // Status & Metadata
  status: "draft" | "active" | "archived" (default: "draft"),
  version: Number (auto-incremented on edit),
  tags: [String],
  
  // VERSION CONTROL SYSTEM
  parentSOPId: ObjectId (null for parent versions),
  versionNumber: Number (1, 2, 3...),
  isParentVersion: Boolean (true for main/current version),
  versionHistory: [ObjectId] (array of child version IDs),
  
  // SOFT DELETE SYSTEM
  isDeleted: Boolean (default: false),
  deletedAt: Date,
  deletedBy: {
    userId: ObjectId,
    userType: "TeamMember" | "Manager",
    name: String,
    email: String
  },
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

### Bin Collection Schema

```javascript
{
  originalId: ObjectId,              // ID of deleted item
  collectionName: String,            // 'sops', 'teambatches', etc.
  data: Mixed,                       // Complete original document
  deletedBy: {
    userId: ObjectId,
    userType: "TeamMember" | "Manager",
    name: String,
    email: String
  },
  deletedAt: Date,
  expiresAt: Date,                   // Auto-delete after 30 days (TTL index)
  restoreLocation: {
    parentId: ObjectId,
    position: Number,
    metadata: Mixed
  },
  deletionReason: String,
  isRestored: Boolean (default: false),
  restoredAt: Date,
  restoredBy: {
    userId: ObjectId,
    userType: "TeamMember" | "Manager",
    name: String,
    email: String
  }
}
```

---

## API Endpoints

### Core SOP Operations

#### 1. Create SOP (Parent Version)
```http
POST /api/sops
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body (form-data):
- title: string (required)
- description: string
- process: string
- tags: string (comma-separated)
- status: string ("draft" | "active" | "archived")
- documents: file[] (max 5 files, 10MB each)

Response:
{
  "message": "SOP created successfully",
  "sop": {
    "_id": "...",
    "title": "...",
    "versionNumber": 1,
    "isParentVersion": true,
    "parentSOPId": null,
    "versionHistory": [],
    ...
  }
}
```

#### 2. Get All SOPs (Parent Versions Only)
```http
GET /api/sops?page=1&limit=10&status=active&search=keyword
Authorization: Bearer <token>

Query Parameters:
- page: number (default: 1)
- limit: number (default: 10)
- status: "draft" | "active" | "archived"
- createdBy: ObjectId
- search: string (searches title, description, tags)
- sortBy: string (default: "createdAt")
- sortOrder: "asc" | "desc" (default: "desc")

Note: Automatically filters to show only parent versions (isParentVersion: true)

Response:
{
  "message": "SOPs retrieved successfully",
  "sops": [...],  // Only parent versions
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 50,
    "itemsPerPage": 10
  }
}
```

#### 3. Get SOP by ID
```http
GET /api/sops/:id
Authorization: Bearer <token>

Response:
{
  "message": "SOP retrieved successfully",
  "sop": { ... }
}
```

#### 4. Update SOP (Edit Content)
```http
PUT /api/sops/:id
Content-Type: application/json
Authorization: Bearer <token>

Permissions: Only the creator can edit their SOP

Body:
{
  "title": "Updated Title",
  "description": "Updated Description",
  "process": "Updated Process",
  "tags": "tag1,tag2,tag3",
  "status": "active"
}

Response:
{
  "message": "SOP updated successfully",
  "sop": { ... }
}
```

#### 5. Soft Delete SOP (Move to Bin)
```http
DELETE /api/sops/:id/soft
Authorization: Bearer <token>

Permissions: Only the creator can delete their SOP

Special Rules:
- Cannot delete parent SOP if it has child versions
- Must delete all child versions first, OR edit instead of delete

Response (Success):
{
  "message": "SOP moved to bin successfully"
}

Response (Error - Has Children):
{
  "error": "Cannot delete parent SOP with existing versions",
  "message": "This SOP has child versions. Please edit the SOP instead of deleting it, or delete all child versions first."
}
```

---

### Version Management

#### 6. Create New Version (Upload New Version)
```http
POST /api/sops/:id/versions
Content-Type: multipart/form-data
Authorization: Bearer <token>

Permissions: Anyone can create new versions

Body (form-data):
- title: string (required)
- description: string
- process: string
- tags: string (comma-separated)
- status: string
- documents: file[] (max 5 files, 10MB each)

Behavior:
- Creates a new SOP document with incremented versionNumber
- Links to parent via parentSOPId
- Parent's versionHistory array updated with new version ID
- New version gets independent permissions for creator

Response:
{
  "message": "New SOP version created successfully",
  "sop": {
    "_id": "new-version-id",
    "title": "...",
    "versionNumber": 2,
    "isParentVersion": false,
    "parentSOPId": "parent-id",
    ...
  }
}
```

#### 7. Get All Versions of SOP
```http
GET /api/sops/:id/versions
Authorization: Bearer <token>

Returns: All versions (parent + children) for the given SOP family

Response:
{
  "message": "SOP versions retrieved successfully",
  "versions": [
    {
      "_id": "parent-id",
      "versionNumber": 1,
      "isParentVersion": true,
      ...
    },
    {
      "_id": "child-id-1",
      "versionNumber": 2,
      "isParentVersion": false,
      "parentSOPId": "parent-id",
      ...
    },
    {
      "_id": "child-id-2",
      "versionNumber": 3,
      "isParentVersion": false,
      "parentSOPId": "parent-id",
      ...
    }
  ],
  "count": 3
}
```

---

### Document Management

#### 8. Add Documents to SOP
```http
POST /api/sops/:id/documents
Content-Type: multipart/form-data
Authorization: Bearer <token>

Permissions: Anyone can add documents

Body (form-data):
- documents: file[] (required, max 5 files, 10MB each)

Tracks uploader:
- Each document includes uploadedBy with user details

Response:
{
  "message": "Documents added successfully",
  "sop": { ... },
  "addedDocuments": [
    {
      "filename": "...",
      "uploadedBy": {
        "userId": "...",
        "name": "...",
        ...
      }
    }
  ]
}
```

#### 9. Remove Document from SOP
```http
DELETE /api/sops/:id/documents/:documentId
Authorization: Bearer <token>

Permissions: 
- Managers can delete any document
- Team members can only delete documents they uploaded

Response:
{
  "message": "Document removed successfully",
  "sop": { ... }
}
```

---

### Recycle Bin Operations

#### 10. Get User's Bin Items
```http
GET /api/sops/bin/items?collection=sops
Authorization: Bearer <token>

Query Parameters:
- collection: string (optional - 'sops', 'teambatches', etc.)

Privacy: Users only see items THEY deleted

Response:
{
  "message": "Bin items retrieved successfully",
  "items": [
    {
      "_id": "bin-item-id",
      "originalId": "original-sop-id",
      "collectionName": "sops",
      "data": { /* complete original SOP */ },
      "deletedBy": { ... },
      "deletedAt": "2025-10-30T10:00:00.000Z",
      "expiresAt": "2025-11-29T10:00:00.000Z",
      "daysUntilExpiry": 25,
      "isRestored": false
    }
  ],
  "count": 5
}
```

#### 11. Restore Item from Bin
```http
POST /api/sops/bin/:binId/restore
Authorization: Bearer <token>

Permissions: Only the person who deleted can restore

Behavior:
- Recreates the original document in the collection
- Marks bin item as restored
- Maintains all original data and relationships

Response:
{
  "message": "Item restored successfully",
  "item": { /* restored SOP */ }
}
```

---

### Other Endpoints

#### 12. Get Current User's SOPs
```http
GET /api/sops/my
Authorization: Bearer <token>

Response:
{
  "message": "User SOPs retrieved successfully",
  "sops": [...],
  "count": 5
}
```

#### 13. Get Active SOPs
```http
GET /api/sops/active
Authorization: Bearer <token>

Response:
{
  "message": "Active SOPs retrieved successfully",
  "sops": [...],
  "count": 10
}
```

---

## Version Control Workflow

### Creating Versions

```
Parent SOP (v1)
│
├─ User A creates SOP
│  ├─ versionNumber: 1
│  ├─ isParentVersion: true
│  ├─ parentSOPId: null
│  └─ versionHistory: []
│
├─ User B uploads new version
│  ├─ POST /api/sops/{parent-id}/versions
│  └─ Creates Child SOP (v2)
│     ├─ versionNumber: 2
│     ├─ isParentVersion: false
│     ├─ parentSOPId: {parent-id}
│     └─ Creator: User B (has edit/delete rights)
│
└─ Parent updated
   └─ versionHistory: [v2-id]
```

### Viewing Versions

```
1. SOP List → Shows ONLY parent versions
2. Open Parent SOP → See version history section
3. Click child version → Navigate to child SOP
4. Child SOP shows "Back to Parent" button
```

### Deleting Versions

```
Child Version (v2, v3...)
├─ Creator can delete anytime
└─ Moves to bin for 30 days

Parent Version (v1)
├─ If has children → CANNOT DELETE
│  └─ Error: "Please edit or delete children first"
└─ If no children → Can delete
   └─ Moves to bin for 30 days
```

---

## Recycle Bin System

### Soft Delete Process

```
1. User deletes SOP
   ↓
2. Document moved to Bin collection
   ├─ Original data preserved
   ├─ Marked as isDeleted: true
   └─ Set expiresAt: 30 days from now
   ↓
3. User sees in Recycle Bin
   ├─ Only their deletions visible
   └─ Days until expiry shown
   ↓
4. User can restore within 30 days
   ├─ Document recreated
   └─ Removed from bin
   ↓
5. After 30 days
   └─ MongoDB TTL index auto-deletes
```

### TTL (Time To Live) Index

```javascript
// Automatic cleanup after 30 days
expiresAt: {
  type: Date,
  default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  expires: 0  // MongoDB TTL index
}
```

---

## File Upload Specifications

### Supported File Types

- **Documents**: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV
- **Images**: JPEG, PNG, GIF, WEBP

### File Limits

- **Maximum file size**: 10MB per file
- **Maximum files per upload**: 5 files
- **S3 storage location**: `sop-documents/{timestamp}-{filename}`

### File Security

- All files stored securely in AWS S3
- Files automatically deleted from S3 when document removed
- Presigned URLs for secure temporary access

---

## Permission System

### SOP Edit Permissions

```javascript
// Only creator can edit their own SOP
canEdit = (sop.createdBy.userId === currentUser.id)
```

### SOP Delete Permissions

```javascript
// Only creator can delete, with restrictions
canDelete = (sop.createdBy.userId === currentUser.id) 
         && (!sop.isParentVersion || sop.versionHistory.length === 0)
```

### Document Delete Permissions

```javascript
// Managers can delete any, members only their uploads
canDeleteDocument = (user.role === 'manager') 
                 || (document.uploadedBy.userId === currentUser.id)
```

### Version Creation Permissions

```javascript
// Anyone can create new versions
canCreateVersion = true
```

---

## Usage Examples

### 1. Create Parent SOP with Documents

```bash
curl -X POST http://localhost:7000/api/sops \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "title=Employee Onboarding Process" \
  -F "description=Complete guide for new employees" \
  -F "process=Step 1...\nStep 2..." \
  -F "tags=onboarding,hr,process" \
  -F "status=active" \
  -F "documents=@onboarding-checklist.pdf" \
  -F "documents=@welcome-letter.docx"
```

### 2. Upload New Version

```bash
curl -X POST http://localhost:7000/api/sops/{parent-id}/versions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "title=Employee Onboarding Process v2" \
  -F "description=Updated with remote work guidelines" \
  -F "process=Updated steps..." \
  -F "tags=onboarding,hr,remote" \
  -F "status=active" \
  -F "documents=@onboarding-v2.pdf"
```

### 3. Get All Versions

```bash
curl -X GET http://localhost:7000/api/sops/{sop-id}/versions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Soft Delete SOP

```bash
curl -X DELETE http://localhost:7000/api/sops/{sop-id}/soft \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5. View Bin Items

```bash
curl -X GET "http://localhost:7000/api/sops/bin/items?collection=sops" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 6. Restore from Bin

```bash
curl -X POST http://localhost:7000/api/sops/bin/{bin-item-id}/restore \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Error Responses

### Version Control Errors

```json
{
  "error": "Cannot delete parent SOP with existing versions",
  "message": "This SOP has child versions. Please edit the SOP instead of deleting it, or delete all child versions first."
}
```

### Permission Errors

```json
{
  "error": "Unauthorized",
  "message": "Only the creator can edit this SOP"
}

{
  "error": "Unauthorized",
  "message": "You can only delete documents you uploaded"
}
```

### File Upload Errors

```json
{
  "error": "File too large",
  "details": "File size cannot exceed 10MB"
}

{
  "error": "Too many files",
  "details": "Maximum 5 files allowed per upload"
}

{
  "error": "Invalid file type",
  "details": "File type application/exe is not allowed"
}
```

### Bin Errors

```json
{
  "error": "Bin item not found"
}

{
  "error": "Item already restored"
}
```

---

## Model Methods & Virtuals

### Instance Methods

```javascript
// Version Management
sop.createNewVersion(newVersionData, user) // Create child version
sop.getAllVersions()                         // Get all related versions
sop.getParentSOP()                          // Get parent SOP
sop.promoteToParent()                       // Make this version the parent

// Document Management
sop.addDocument(documentData)               // Add document
sop.removeDocument(documentId)              // Remove document
```

### Static Methods

```javascript
SOP.findByCreator(userId, userType)        // Find SOPs by creator
SOP.findActive()                            // Find active SOPs (non-deleted)
SOP.findNonDeleted(query)                  // Find non-deleted SOPs
```

### Virtuals

```javascript
sop.documentCount                           // Number of documents
```

---

## Integration Notes

### Environment Variables Required

```env
# Database
MONGODB_URI=mongodb://localhost:27017/aws-management

# AWS S3
AWS_REGION=your-region
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=your-bucket-name

# JWT
JWT_SECRET=your-secret-key
```

### MongoDB Indexes

```javascript
// Performance indexes
sopSchema.index({ title: 1 });
sopSchema.index({ 'createdBy.userId': 1 });
sopSchema.index({ status: 1 });
sopSchema.index({ createdAt: -1 });

// Versioning indexes
sopSchema.index({ parentSOPId: 1 });
sopSchema.index({ versionNumber: 1 });
sopSchema.index({ isParentVersion: 1 });
sopSchema.index({ isDeleted: 1 });

// Bin TTL index
binSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

---

## Best Practices

### Version Management

1. **Create versions for major changes**, edit for minor updates
2. **Each version is independent** with its own documents and permissions
3. **Parent versions cannot be deleted** if they have children
4. **Use descriptive titles** to differentiate versions

### Document Management

1. **Track who uploads** - System automatically records uploader
2. **Managers have full control** - Can delete any document
3. **Team members** - Can only delete their own uploads
4. **File size limits** - Keep files under 10MB

### Soft Delete

1. **30-day recovery window** - Users have time to restore
2. **Automatic cleanup** - No manual maintenance needed
3. **Privacy preserved** - Users only see their deletions
4. **Complete restoration** - All data and relationships restored

---

## Security Features

1. ✅ **JWT Authentication** - All endpoints require valid token
2. ✅ **Creator-Based Permissions** - Edit/delete only by creator
3. ✅ **Document Upload Tracking** - Know who uploaded what
4. ✅ **File Type Validation** - Only allowed file types
5. ✅ **File Size Limits** - Prevent abuse
6. ✅ **S3 Secure Storage** - AWS S3 with proper permissions
7. ✅ **Soft Delete Privacy** - Users only see their deletions
8. ✅ **Version Isolation** - Each version has independent permissions

---

## Monitoring & Maintenance

### Automatic Processes

1. **MongoDB TTL Index** - Auto-deletes bin items after 30 days
2. **Version Tracking** - Auto-increments version numbers
3. **S3 Cleanup** - Deletes files when documents removed
4. **User Tracking** - Auto-records all user actions

### No Manual Maintenance Required

- Bin cleanup is automatic via TTL
- File storage managed by S3
- Version numbers auto-increment
- Relationships auto-maintained

---

## Support & Contact

For API support or questions:
- Check error responses for detailed messages
- Review this documentation for endpoint specifications
- Ensure environment variables are properly configured
- Verify JWT token is valid and not expired

---

**Last Updated**: October 30, 2025
**API Version**: 2.0 (with Versioning & Bin Support)
**Documentation Version**: 2.0.0
