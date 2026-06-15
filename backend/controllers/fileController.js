// backend/controllers/fileController.js
import { supabase } from '../supabaseClient.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// GET /api/crm/files
export const getFiles = async (req, res) => {
  try {
    const { category } = req.query;

    let query = supabase
      .from('file_container')
      .select(`
        id, name, description, file_url, file_type, file_size, category, created_at,
        uploaded_by (id, name)
      `)
      .order('created_at', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, files: data });
  } catch (err) {
    console.error('getFiles error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener archivos.' });
  }
};

// POST /api/crm/files — admin only
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se recibió ningún archivo.' });
    }

    const { name, description, category } = req.body;
    const userId = req.user?.userId;
    const companyId = req.user?.companyId;

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(req.file.originalname) || '';
    const fileName = `${uniqueSuffix}${ext}`;
    const originalName = name || req.file.originalname;

    let fileUrl = '';

    try {
      const { uploadToR2 } = await import('../services/r2Service.js');
      fileUrl = await uploadToR2(req.file.buffer, fileName, req.file.mimetype, 'container');
    } catch (r2Err) {
      console.warn('R2 upload failed or not configured, saving to local filesystem instead:', r2Err.message);
      // Fallback to local upload
      const uploadDir = path.join(__dirname, '../public/uploads/container');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, req.file.buffer);
      fileUrl = `/api/uploads/container/${fileName}`;
    }

    // Detect file type
    const mime = req.file.mimetype || '';
    let fileType = 'other';
    if (mime.startsWith('image/')) fileType = 'image';
    else if (mime === 'application/pdf') fileType = 'pdf';
    else if (mime.includes('word') || mime.includes('document')) fileType = 'document';
    else if (mime.includes('sheet') || mime.includes('excel')) fileType = 'spreadsheet';

    const { data, error } = await supabase
      .from('file_container')
      .insert([{
        name: originalName,
        description: description || '',
        file_url: fileUrl,
        file_type: fileType,
        file_size: req.file.size,
        category: category || 'general',
        uploaded_by: userId,
        company_id: companyId
      }])
      .select();

    if (error) throw error;
    res.status(201).json({ success: true, file: data[0] });
  } catch (err) {
    console.error('uploadFile error:', err);
    res.status(500).json({ success: false, message: 'Error al subir el archivo.' });
  }
};

// DELETE /api/crm/files/:id — admin only
export const deleteFile = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo el administrador puede eliminar archivos.' });
    }

    const { id } = req.params;

    // Fetch file to get URL before deleting
    const { data: fileData, error: fetchError } = await supabase
      .from('file_container')
      .select('file_url')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Delete file
    if (fileData?.file_url) {
      if (fileData.file_url.startsWith('http')) {
        // Delete from Cloudflare R2
        try {
          const { deleteFromR2 } = await import('../services/r2Service.js');
          await deleteFromR2(fileData.file_url);
        } catch (r2Err) {
          console.warn('Could not delete from R2:', r2Err.message);
        }
      } else {
        // Delete from local physical filesystem
        const physicalPath = path.join(__dirname, '../public', fileData.file_url);
        if (fs.existsSync(physicalPath)) {
          fs.unlinkSync(physicalPath);
        }
      }
    }

    const { error } = await supabase.from('file_container').delete().eq('id', id);
    if (error) throw error;

    res.json({ success: true, message: 'Archivo eliminado correctamente.' });
  } catch (err) {
    console.error('deleteFile error:', err);
    res.status(500).json({ success: false, message: 'Error al eliminar archivo.' });
  }
};
