const { uploadFile, downloadFile, deleteFile, listFiles, getPresignedUrl, fileExists } = require('../utils/s3');

/**
 * Upload a file to S3
 */
const upload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const file = req.file;
    const key = `uploads/${Date.now()}-${file.originalname}`;
    
    const result = await uploadFile(key, file.buffer, file.mimetype);

    res.status(200).json({
      message: 'File uploaded successfully',
      file: {
        key: result.key,
        url: result.location,
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file', details: error.message });
  }
};

/**
 * Download a file from S3
 */
const download = async (req, res) => {
  try {
    const { key } = req.params;

    if (!key) {
      return res.status(400).json({ error: 'File key is required' });
    }

    const fileBuffer = await downloadFile(key);
    
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${key.split('/').pop()}"`);
    res.send(fileBuffer);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download file', details: error.message });
  }
};

/**
 * Delete a file from S3
 */
const deleteFileFromS3 = async (req, res) => {
  try {
    const { key } = req.params;

    if (!key) {
      return res.status(400).json({ error: 'File key is required' });
    }

    await deleteFile(key);
    
    res.status(200).json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete file', details: error.message });
  }
};

/**
 * List all files in S3
 */
const listAllFiles = async (req, res) => {
  try {
    const { prefix } = req.query;
    
    const files = await listFiles(prefix || '');
    
    res.status(200).json({
      message: 'Files retrieved successfully',
      count: files.length,
      files: files.map(file => ({
        key: file.Key,
        size: file.Size,
        lastModified: file.LastModified,
      }))
    });
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ error: 'Failed to list files', details: error.message });
  }
};

/**
 * Get a presigned URL for a file
 */
const getFileUrl = async (req, res) => {
  try {
    const { key } = req.params;
    const { expiresIn } = req.query;

    if (!key) {
      return res.status(400).json({ error: 'File key is required' });
    }

    const url = await getPresignedUrl(key, parseInt(expiresIn) || 3600);
    
    res.status(200).json({
      message: 'Presigned URL generated successfully',
      url: url,
      expiresIn: parseInt(expiresIn) || 3600
    });
  } catch (error) {
    console.error('Get presigned URL error:', error);
    res.status(500).json({ error: 'Failed to generate presigned URL', details: error.message });
  }
};

/**
 * Check if a file exists
 */
const checkFileExists = async (req, res) => {
  try {
    const { key } = req.params;

    if (!key) {
      return res.status(400).json({ error: 'File key is required' });
    }

    const exists = await fileExists(key);
    
    res.status(200).json({
      exists: exists,
      key: key
    });
  } catch (error) {
    console.error('Check file exists error:', error);
    res.status(500).json({ error: 'Failed to check file existence', details: error.message });
  }
};

module.exports = {
  upload,
  download,
  deleteFileFromS3,
  listAllFiles,
  getFileUrl,
  checkFileExists
};

