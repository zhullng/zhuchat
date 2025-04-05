import mongoose from 'mongoose';

const gridFSService = {
  async uploadFile(base64Data, filename, metadata) {
    try {
      const conn = mongoose.connection;
      const bucket = new mongoose.mongo.GridFSBucket(conn.db, {
        bucketName: 'uploads'
      });

      // Remove data URL prefix if present
      const base64Image = base64Data.split(',')[1] || base64Data;
      const buffer = Buffer.from(base64Image, 'base64');

      const uploadStream = bucket.openUploadStream(filename, {
        metadata: metadata
      });

      return new Promise((resolve, reject) => {
        uploadStream.on('error', reject);
        uploadStream.on('finish', (file) => {
          resolve({
            fileId: file._id,
            filename: file.filename
          });
        });

        uploadStream.write(buffer);
        uploadStream.end();
      });
    } catch (error) {
      console.error('GridFS Upload Error:', error);
      throw error;
    }
  },

  async downloadFile(fileId) {
    try {
      const conn = mongoose.connection;
      const bucket = new mongoose.mongo.GridFSBucket(conn.db, {
        bucketName: 'uploads'
      });

      const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));

      return new Promise((resolve, reject) => {
        const chunks = [];
        downloadStream.on('data', (chunk) => chunks.push(chunk));
        downloadStream.on('error', reject);
        downloadStream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            buffer,
            filename: downloadStream.filename,
            contentType: downloadStream.contentType
          });
        });
      });
    } catch (error) {
      console.error('GridFS Download Error:', error);
      throw error;
    }
  },

  async deleteFile(fileId) {
    try {
      const conn = mongoose.connection;
      const bucket = new mongoose.mongo.GridFSBucket(conn.db, {
        bucketName: 'uploads'
      });

      return new Promise((resolve, reject) => {
        bucket.delete(new mongoose.Types.ObjectId(fileId), (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (error) {
      console.error('GridFS Delete Error:', error);
      throw error;
    }
  }
};

export default gridFSService;