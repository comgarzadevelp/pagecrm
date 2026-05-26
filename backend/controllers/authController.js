// backend/controllers/authController.js
import { supabase } from '../supabaseClient.js'; // assume client is configured
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Load secret from env
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }
    // Find user in crm_users table
    const { data: users, error } = await supabase
      .from('crm_users')
      .select('id, name, password_hash, role')
      .eq('email', email)
      .single();
    if (error) {
      console.error('Supabase query error in authController.login:', error);
      return res.status(401).json({ success: false, message: 'Invalid credentials or DB error' });
    }
    if (!users) {
      console.warn(`User login failed: No user found for email ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const passwordMatches = await bcrypt.compare(password, users.password_hash);
    if (!passwordMatches) {
      console.warn(`User login failed: Password mismatch for email ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: users.id, role: users.role, name: users.name }, JWT_SECRET, { expiresIn: '8h' });
    return res.json({ success: true, token, role: users.role, name: users.name });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
