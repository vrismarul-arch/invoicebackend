const multer = require('multer');
const path = require('path');
const { supabase } = require('../config/supabase');

// Configure multer for memory storage (files will be in buffer)
const storage = multer.memoryStorage();

// File filter for images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp, svg)'));
  }
};

// Multer upload configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter
});

// Upload file to Supabase
const uploadToSupabase = async (file, folder = 'logos') => {
  if (!file || !file.buffer) {
    throw new Error('No file provided');
  }

  try {
    // Generate unique filename
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    console.log(`📤 Uploading to Supabase: ${filePath}`);

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET_NAME || 'invoice-saas')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ Supabase upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(process.env.SUPABASE_BUCKET_NAME || 'invoice-saas')
      .getPublicUrl(filePath);

    console.log(`✅ File uploaded: ${publicUrl}`);

    return {
      success: true,
      publicUrl,
      filePath,
      fileName
    };
  } catch (error) {
    console.error('❌ Upload error:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

// Delete file from Supabase
const deleteFromSupabase = async (filePath) => {
  if (!filePath) return false;

  try {
    console.log(`🗑️ Deleting from Supabase: ${filePath}`);
    
    const { error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET_NAME || 'invoice-saas')
      .remove([filePath]);

    if (error) {
      console.error('❌ Supabase delete error:', error);
      throw error;
    }

    console.log(`✅ File deleted: ${filePath}`);
    return true;
  } catch (error) {
    console.error('❌ Delete error:', error);
    return false;
  }
};

// Get file URL
const getFileUrl = (filePath) => {
  if (!filePath) return null;
  
  const { data: { publicUrl } } = supabase.storage
    .from(process.env.SUPABASE_BUCKET_NAME || 'invoice-saas')
    .getPublicUrl(filePath);
  
  return publicUrl;
};

// List files in folder
const listFiles = async (folder = 'logos') => {
  try {
    const { data, error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET_NAME || 'invoice-saas')
      .list(folder);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ List files error:', error);
    return [];
  }
};

module.exports = {
  upload,
  uploadToSupabase,
  deleteFromSupabase,
  getFileUrl,
  listFiles
};