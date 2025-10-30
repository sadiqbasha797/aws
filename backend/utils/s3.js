const { 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const s3Client = require('../config/s3');

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

/**
 * Upload a file to S3
 * @param {string} key - The key/path for the file in S3
 * @param {Buffer} fileBuffer - The file content as a buffer
 * @param {string} contentType - The MIME type of the file
 * @returns {Promise<Object>} - Upload result
 */
const uploadFile = async (key, fileBuffer, contentType) => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  };

  try {
    const command = new PutObjectCommand(params);
    const result = await s3Client.send(command);
    return {
      success: true,
      key: key,
      location: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
      result: result
    };
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw error;
  }
};

/**
 * Download a file from S3
 * @param {string} key - The key/path of the file in S3
 * @returns {Promise<Buffer>} - File content as buffer
 */
const downloadFile = async (key) => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
  };

  try {
    const command = new GetObjectCommand(params);
    const result = await s3Client.send(command);
    const stream = result.Body;
    
    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (error) {
    console.error('Error downloading file from S3:', error);
    throw error;
  }
};

/**
 * Delete a file from S3
 * @param {string} key - The key/path of the file in S3
 * @returns {Promise<Object>} - Delete result
 */
const deleteFile = async (key) => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
  };

  try {
    const command = new DeleteObjectCommand(params);
    const result = await s3Client.send(command);
    return {
      success: true,
      result: result
    };
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    throw error;
  }
};

/**
 * List files in S3 bucket
 * @param {string} prefix - Optional prefix to filter files
 * @returns {Promise<Array>} - List of files
 */
const listFiles = async (prefix = '') => {
  const params = {
    Bucket: BUCKET_NAME,
    Prefix: prefix,
  };

  try {
    const command = new ListObjectsV2Command(params);
    const result = await s3Client.send(command);
    return result.Contents || [];
  } catch (error) {
    console.error('Error listing files from S3:', error);
    throw error;
  }
};

/**
 * Get a presigned URL for temporary access to a file
 * @param {string} key - The key/path of the file in S3
 * @param {number} expiresIn - URL expiration time in seconds (default: 3600)
 * @returns {Promise<string>} - Presigned URL
 */
const getPresignedUrl = async (key, expiresIn = 3600) => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
  };

  try {
    const command = new GetObjectCommand(params);
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw error;
  }
};

/**
 * Check if a file exists in S3
 * @param {string} key - The key/path of the file in S3
 * @returns {Promise<boolean>} - True if file exists
 */
const fileExists = async (key) => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
  };

  try {
    const command = new HeadObjectCommand(params);
    await s3Client.send(command);
    return true;
  } catch (error) {
    if (error.name === 'NotFound') {
      return false;
    }
    throw error;
  }
};

module.exports = {
  uploadFile,
  downloadFile,
  deleteFile,
  listFiles,
  getPresignedUrl,
  fileExists,
  BUCKET_NAME
};

