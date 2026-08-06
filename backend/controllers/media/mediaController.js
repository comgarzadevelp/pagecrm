/**
 * @file mediaController.js
 * 
 * ES: Controlador de Archivos Multimedia y Evidencias de Campo. Gestiona la carga asíncrona
 *     de fotografías, geolocalización GPS, datos EXIF y almacenamiento en Cloudflare R2 / Local.
 * EN: Media & Field Evidence Controller. Handles asynchronous photo uploads, GPS geolocation,
 *     EXIF data parsing, and Cloudflare R2 / Local storage.
 */

import { supabase } from '../../supabaseClient.js';
import { resolveTargetIdAndRecord } from '../helpers/crmHelpers.js';
import exifr from 'exifr';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ES: Recibe y procesa en segundo plano la evidencia fotográfica de visitas en campo con GPS y geocodificación inversa.
 * EN: Receives and background-processes field visit photo evidence with GPS and reverse geocoding.
 */
export const uploadCustomerEvidence = async (req, res) => {
  try {
    const { id: customerId } = req.params;
    const userId = req.user?.userId;
    const role = req.user?.role;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se subió ninguna imagen.' });
    }

    const bodyLat = parseFloat(req.body.latitude);
    const bodyLng = parseFloat(req.body.longitude);
    const bodyAccuracy = parseFloat(req.body.accuracy);
    if (isNaN(bodyLat) || isNaN(bodyLng)) {
      return res.status(400).json({ 
        success: false, 
        message: 'La ubicación GPS real es obligatoria. Asegúrate de activar el GPS en tu celular.' 
      });
    }

    res.status(202).json({
      success: true,
      message: 'Evidencia en proceso de subida.',
      status: 'processing'
    });

    setImmediate(async () => {
      try {
        let sellerName = 'Ejecutivo';
        if (userId) {
          const { data: user } = await supabase
            .from('crm_users')
            .select('name')
            .eq('id', userId)
            .single();
          if (user) sellerName = user.name;
        }

        let captureDate = null;
        let deviceMake = '';
        let deviceModel = '';

        try {
          const exif = await exifr.parse(req.file.buffer, {
            gps: false,
            tiff: true,
            xmp: false
          });

          if (exif) {
            deviceMake = exif.Make || '';
            deviceModel = exif.Model || '';
          }
        } catch (exifErr) {
          console.warn('Exif extraction failed/not present:', exifErr.message);
        }

        if (!captureDate) captureDate = new Date();
        
        let deviceText = '';
        if (deviceMake || deviceModel) {
          deviceText = `${deviceMake} ${deviceModel}`.trim();
        } else {
          deviceText = req.body.deviceInfo || 'Dispositivo Móvil';
        }

        let address = `Coordenadas: ${bodyLat.toFixed(5)}, ${bodyLng.toFixed(5)}`;
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${bodyLat}&lon=${bodyLng}&zoom=18&addressdetails=1`, {
            headers: { 'User-Agent': 'ComercializadoraGarzaCRM/1.0' }
          });
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            address = geoData.display_name || address;
          }
        } catch (geoErr) {
          console.error('Reverse geocoding failed:', geoErr);
        }

        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const fileExtension = path.extname(req.file.originalname) || '.jpg';
        const fileName = `${uniqueSuffix}${fileExtension}`;

        let photoUrl = '';

        try {
          const { uploadToR2 } = await import('../../services/r2Service.js');
          photoUrl = await uploadToR2(req.file.buffer, fileName, req.file.mimetype, 'evidences');
        } catch (r2Err) {
          console.warn('R2 upload failed for evidence photo, saving to local filesystem:', r2Err.message);
          const uploadDir = path.join(__dirname, '../../public/uploads/evidences');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          const filePath = path.join(uploadDir, fileName);
          fs.writeFileSync(filePath, req.file.buffer);
          photoUrl = `/api/uploads/evidences/${fileName}`;
        }

        const isCompany = req.originalUrl.includes('/companies/');
        const targetTable = isCompany ? 'companies' : 'leads';

        const { realId, customerData: customer } = await resolveTargetIdAndRecord(
          isCompany, 
          customerId, 
          userId, 
          req.user?.companyId, 
          req.user?.sae_empresa,
          req.user
        );

        let notesObj = { general: '', timeline: [] };
        const rawNotes = customer.notes;
        if (rawNotes) {
          try {
            const trimmed = rawNotes.trim();
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
              const parsed = JSON.parse(trimmed);
              notesObj.general = parsed.general || '';
              notesObj.timeline = parsed.timeline || [];
              if (parsed.sae_clave) {
                notesObj.sae_clave = parsed.sae_clave;
                notesObj.sae_empresa = parsed.sae_empresa || '03';
              }
            } else {
              notesObj.general = rawNotes;
            }
          } catch (err) {
            notesObj.general = rawNotes;
          }
        }

        const evidenceNode = {
          date: new Date(captureDate).toISOString(),
          text: req.body.text || 'Registro de evidencia fotográfica de visita en sitio.',
          author: sellerName,
          type: 'evidence',
          photoUrl,
          deviceInfo: deviceText,
          gps: {
            lat: bodyLat,
            lng: bodyLng,
            accuracy: isNaN(bodyAccuracy) ? null : bodyAccuracy,
            address
          }
        };

        notesObj.timeline.push(evidenceNode);

        const { error: updateError } = await supabase
          .from(targetTable)
          .update({
            notes: JSON.stringify(notesObj)
          })
          .eq('id', realId);

        if (updateError) {
          console.error('Background upload evidence DB update failed:', updateError);
        } else {
          console.log('Background upload evidence completed successfully for', realId);
        }

      } catch (backgroundErr) {
        console.error('Background processing error during evidence upload:', backgroundErr);
      }
    });

  } catch (err) {
    console.error('uploadCustomerEvidence init error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Error interno al iniciar la subida.' });
    }
  }
};
