import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('ERROR: GEMINI_API_KEY falta en las variables de entorno.');
}

export const genAI = new GoogleGenerativeAI(apiKey);
// Usaremos gemini-1.5-flash para respuestas rápidas y de bajo costo/latencia
export const GEMINI_MODEL = 'gemini-3.5-flash';
