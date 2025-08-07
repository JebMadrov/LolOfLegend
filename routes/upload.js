
//Upload d'icone
const express = require('express');
const path = require('path');
const fs = require('fs');
const uploadRouter = express.Router();

const UPLOAD_DIR = path.join(__dirname, '../public/iconesJoueurs');

// S'assurer que le dossier existe
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}


uploadRouter.post('/upload-icon', (req, res) => {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.startsWith('multipart/form-data')) {
    return res.status(400).json({ success: false, error: 'Format invalide' });
  }

  const boundary = contentType.split('boundary=')[1];
  if (!boundary) return res.status(400).json({ success: false, error: 'Boundary manquant' });

  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));

  req.on('end', () => {
    const buffer = Buffer.concat(chunks);

    // Convertir en string uniquement pour trouver les positions
    const str = buffer.toString('latin1'); // latin1 garde le mapping 1:1
    const parts = str.split(`--${boundary}`);

    const filePart = parts.find(p => p.includes('filename="'));
    if (!filePart) return res.status(400).json({ success: false, error: 'Fichier non trouvé' });

    const filenameMatch = filePart.match(/filename="(.+?)"/);
    if (!filenameMatch) return res.status(400).json({ success: false, error: 'Nom de fichier invalide' });

    const originalFilename = filenameMatch[1];
    const ext = path.extname(originalFilename).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      return res.status(400).json({ success: false, error: 'Extension de fichier non autorisée' });
    }

    // Calcul de l'offset binaire du contenu du fichier
    const startOfFile = str.indexOf('\r\n\r\n') + 4;
    const endOfFile = str.lastIndexOf('\r\n');

    // Extraire les bons octets depuis le buffer
    const start = Buffer.byteLength(str.slice(0, startOfFile), 'latin1');
    const end = Buffer.byteLength(str.slice(0, endOfFile), 'latin1');

    const fileBuffer = buffer.slice(start, end);

    const uniqueName = `icon-${Date.now()}${ext}`;
    const filepath = path.join(UPLOAD_DIR, uniqueName);

    fs.writeFile(filepath, fileBuffer, err => {
      if (err) {
        console.error('Erreur écriture fichier :', err);
        return res.status(500).json({ success: false, error: 'Erreur serveur' });
      }

      res.json({ success: true, url: `/iconesJoueurs/${uniqueName}` });
    });
  });
});

module.exports = uploadRouter;
