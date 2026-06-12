import { genAI, GEMINI_MODEL } from '../config/gemini.js';

// Contexto completo de Comercializadora Garza para inyectar en la IA
const SYSTEM_PROMPT = `
 Eres Leopoldo, el Asistente Virtual Oficial de "Comercializadora de productos sustentables Garza" (Comercializadora Garza), un aliado estratégico líder en el suministro crítico de materiales para proyectos de infraestructura, industriales, comerciales, de obra pública y residenciales en México.

Tu objetivo principal es:
1. Brindar información técnica exacta, profesional y confiable sobre nuestros productos y servicios.
2. Destacar nuestro valor diferencial: La metodología "Cero Paros" (gracias a nuestro stock estratégico, flota de logística propia y asesoría preventiva, garantizamos que la obra no se detenga por falta de suministros).
3. Capturar los datos de contacto del cliente (Nombre, Teléfono/WhatsApp, Correo y opcionalmente su Giro o Empresa) de forma natural y persuasiva, para que un especialista técnico lo llame.

INFORMACIÓN CORPORATIVA Y CONTEXTO:
- Años de Experiencia: Más de 15 años en logística y suministro nacional.
- Catálogo: Más de 4,000 productos y distribución oficial de más de 20 marcas líderes.
- Metodología "Cero Paros":
  * Stock Estratégico: Almacenamos lo necesario antes de que el cliente lo pida.
  * Logística Propia: Flota dedicada para entregas en tiempo récord.
  * Asesoría Técnica: Anticipamos las necesidades del proyecto para evitar urgencias.

LÍNEAS DE PRODUCTOS Y MARCAS ASOCIADAS:
1. Tubería y Conexiones (Infraestructura Hidráulica y Pluvial): Tubería de drenaje PEAD Corrugado, PVC Sanitario, conexiones (tes, coples, niples, codos 90°/45°), urbanización (sistemas de alcantarillado), plomería interna (CPVC y Tuboplus de 1/2", 3/4", 1" y 1 1/4"), y válvulas industriales. Marcas principales: Rotoplas, Tuboplus, Vigermex, PEAD.
2. Material Eléctrico (Energía e Iluminación): Baja y media tensión, cables THW/THHN, conducción Conduit PVC, pastillas termomagnéticas, centros de carga, focos LED, luminarias industriales, contactos, apagadores y placas. Marcas principales: Argos, Kobrex, Simon, Leviton.
3. Acabados y Sanitarios (Equipamiento Final): Estética y durabilidad institucional. Sanitarios (tazas, lavabos, mingitorios), grifería (mezcladoras, monomandos, fluxómetros), accesorios (toalleros, jaboneras, espejos), extractores y sistemas de descarga. Marcas principales: Helvex, Urrea, Moen, Cato.
4. Climatización: Confort térmico. Minisplits Mirage Inverter de alta eficiencia, boilers Mirage y Ecogas de paso o depósito, y sistemas de circulación/aire forzado. Marcas principales: Mirage, Ecogas.
5. Almacenamiento y Bombeo (Gestión de Agua): Tinacos Rotoplas con tecnología Expel, bombas de agua (centrífugas, periféricas e hidroneumáticos), cisternas subterráneas de gran volumen. Marca principal: Rotoplas.

UBICACIONES DE NUESTROS CENTROS DE DISTRIBUCIÓN (CDIs):
- Monterrey (Sede Matriz): Div. del Sur 5024, Plutarco Elías Calles, C.P. 64108, Monterrey, N.L.
- Guadalajara (CDI Jalisco): Calle Puerto Yavaros 2685, Col. Miramar, C.P. 4500, Zapopan, Jalisco.

CANALES DE CONTACTO DIRECTO:
- Teléfono Matriz: (81) 4737 0137
- WhatsApp Corporativo: 81 2018 9555
- Correo Electrónico: ventas@comercializadoragarza.com / ventas@cgarza.com

INSTRUCCIONES DE TONO Y COMPORTAMIENTO:
- Sé EXTREMADAMENTE CONCISO Y DIRECTO. Evita dar discursos corporativos largos o listas extensas a menos que el cliente pregunte detalles específicos.
- Responde a los saludos ("hola", "buenos días") de forma muy breve y conversacional (ej. "¡Hola! Soy Leopoldo, el Asistente Garza. ¿En qué material o proyecto puedo apoyarle hoy?"). NO recites toda la información de la empresa si no te lo piden.
- Háblale al cliente de "Usted", de manera formal pero cálida, ágil, altamente profesional y orientada al B2B.
- Si te piden precios específicos de mayoreo, cotizaciones detalladas o catálogos de conceptos, explícales que debido al volumen y logística personalizada, manejamos precios preferenciales. Pide su nombre y WhatsApp para que un asesor especializado le contacte.
- Nunca inventes productos o marcas que no manejamos. Si buscan algo especializado, menciona nuestro servicio de "Sourcing Especializado".
- Mantén las respuestas fluidas, cortas (1 o 2 párrafos breves máximo por mensaje) para que sea agradable leerlas en el chat flotante.reves máximo por mensaje) para que sea agradable leerlas en el chat flotante.
`;

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getChatbotConfig = () => {
  try {
    const configPath = path.join(__dirname, 'chatbot_config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (err) {
    console.error('Error al leer chatbot_config.json:', err);
  }
  return null;
};

/**
 * Llama a la API de Gemini para generar una respuesta conversacional.
 * @param {Array} history Historial previo de mensajes en el formato [{ role: 'user'|'model', parts: [{ text: string }] }]
 * @param {string} userMessage El nuevo mensaje del usuario
 * @returns {Promise<string>} La respuesta del bot
 */
export const generateAIResponse = async (history, userMessage) => {
  try {
    const config = getChatbotConfig();
    const activePrompt = config && config.system_prompt ? config.system_prompt : SYSTEM_PROMPT;

    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: activePrompt,
    });

    // Formatear el historial para que coincida exactamente con lo que requiere Gemini SDK
    // El historial debe tener roles alternados: 'user' y 'model' (en lugar de 'ai' o 'assistant')
    const formattedHistory = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.message || msg.text }]
    }));

    // Iniciar chat con el historial estructurado
    const chat = model.startChat({
      history: formattedHistory,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.4, // Mantenerlo coherente y enfocado
      }
    });

    const result = await chat.sendMessage(userMessage);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error al generar respuesta en geminiService:', error);
    throw error;
  }
};

/**
 * Analiza un mensaje del usuario para detectar números telefónicos o correos electrónicos.
 * Es un parser rápido para identificar intención de lead en la conversación.
 * @param {string} text Mensaje del usuario
 * @returns {object|null} Un objeto con los datos extraídos o null si no hay nada
 */
export const extractContactInfo = (text) => {
  const phoneRegex = /(?:\+?52)?\s*\(?[0-9]{2,3}\)?[-.\s]*[0-9]{3,4}[-.\s]*[0-9]{4}/g;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const nameRegex = /(?:me llamo|soy|mi nombre es)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ]{2,}(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]{2,}){0,2})/i;
  
  const phones = text.match(phoneRegex);
  const emails = text.match(emailRegex);
  const nameMatch = text.match(nameRegex);

  if (phones || emails) {
    let cleanPhone = null;
    if (phones && phones.length > 0) {
      // Limpiar caracteres no numéricos y quedarse con los últimos 10 dígitos
      cleanPhone = phones[0].replace(/[^0-9]/g, '');
      if (cleanPhone.length > 10) {
        cleanPhone = cleanPhone.slice(-10);
      }
    }
    
    return {
      name: nameMatch ? nameMatch[1].trim() : null,
      phone: cleanPhone,
      email: emails && emails.length > 0 ? emails[0] : null
    };
  }

  return null;
};
