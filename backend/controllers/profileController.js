// backend/controllers/profileController.js
import { supabase } from '../supabaseClient.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// GET /api/crm/profile — already handled in crmController, this adds extended fields
export const getExtendedProfile = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'No autenticado.' });

    const { data: user, error } = await supabase
      .from('crm_users')
      .select('id, name, email, role, phone, whatsapp, bio, avatar_url, position, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error) throw error;
    res.json({ success: true, user });
  } catch (err) {
    console.error('getExtendedProfile error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener perfil.' });
  }
};

// PUT /api/crm/profile — update own profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'No autenticado.' });

    const { name, phone, whatsapp, bio, position } = req.body;

    const updateData = {
      updated_at: new Date().toISOString()
    };
    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp;
    if (bio !== undefined) updateData.bio = bio;
    if (position !== undefined) updateData.position = position;

    // Handle avatar upload
    if (req.file) {
      const uploadDir = path.join(__dirname, '../public/uploads/avatars');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const ext = path.extname(req.file.originalname) || '.jpg';
      const fileName = `avatar_${userId}${ext}`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, req.file.buffer);
      updateData.avatar_url = `/uploads/avatars/${fileName}`;
    }

    const { data, error } = await supabase
      .from('crm_users')
      .update(updateData)
      .eq('id', userId)
      .select('id, name, email, role, phone, whatsapp, bio, avatar_url, position, updated_at');

    if (error) throw error;
    res.json({ success: true, user: data[0] });
  } catch (err) {
    console.error('updateProfile error:', err);
    res.status(500).json({ success: false, message: 'Error al actualizar perfil.' });
  }
};

// PUT /api/crm/profile/password — change own password
export const changeOwnPassword = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'No autenticado.' });

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe tener al menos 6 caracteres.'
      });
    }

    // Verify current password
    const { data: user, error: fetchError } = await supabase
      .from('crm_users')
      .select('password_hash')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'La contraseña actual es incorrecta.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    const { error } = await supabase
      .from('crm_users')
      .update({ password_hash: hash, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;
    res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
  } catch (err) {
    console.error('changeOwnPassword error:', err);
    res.status(500).json({ success: false, message: 'Error al cambiar contraseña.' });
  }
};
