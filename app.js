require('dotenv').config();
process.env.NOTE_PASSWORD

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

const app = express();
const PORT = 31000;
const NOTES_DIR = path.join(__dirname, 'notes');
const FOLDERS_FILE = path.join(NOTES_DIR, 'folders.json');

// Ensure notes directory exists
function ensureNotesDirectory() {
  if (!fsSync.existsSync(NOTES_DIR)) {
    fsSync.mkdirSync(NOTES_DIR);
    console.log('Created notes directory');
  }
}

// Initialize folders structure
async function initializeFolders() {
  try {
    if (!fsSync.existsSync(FOLDERS_FILE)) {
      console.log('Creating folders.json...');
      const defaultFolders = {
        folders: [
          {
            id: 'default',
            name: 'Notes rapides',
            notes: []
          }
        ]
      };
      await fs.writeFile(FOLDERS_FILE, JSON.stringify(defaultFolders, null, 2));
      console.log('folders.json created successfully');
    } else {
      console.log('folders.json already exists');
    }
  } catch (error) {
    console.error('Error initializing folders:', error);
  }
}

// Create default note if none exists
async function createDefaultNote() {
  try {
    const files = await fs.readdir(NOTES_DIR);
    const noteFiles = files.filter(file => file.endsWith('.json') && file !== 'folders.json');
    
    if (noteFiles.length === 0) {
      const defaultNote = {
        id: Date.now().toString(),
        title: 'Bienvenue',
        content: 'Bienvenue dans votre application de notes !'
      };
      
      await fs.writeFile(
        path.join(NOTES_DIR, `${defaultNote.id}.json`),
        JSON.stringify(defaultNote, null, 2)
      );
      
      // Add note to default folder
      const foldersData = JSON.parse(await fs.readFile(FOLDERS_FILE, 'utf8'));
      foldersData.folders[0].notes.push(defaultNote.id);
      await fs.writeFile(FOLDERS_FILE, JSON.stringify(foldersData, null, 2));
      
      console.log('Default note created');
    }
  } catch (error) {
    console.error('Error creating default note:', error);
  }
}

// Initialize directory and default note
console.log('Initializing application...');
ensureNotesDirectory();
initializeFolders()
  .then(createDefaultNote)
  .then(() => {
    console.log('Initialization complete');
  })
  .catch(error => {
    console.error('Error during initialization:', error);
  });

// Middleware pour servir fichiers statiques dans public
app.use(express.static(path.join(__dirname, 'public')));

// Middleware pour parser les formulaires et JSON
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Middleware session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));

// Configurer le moteur de template EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware pour protéger les routes
function authRequired(req, res, next) {
  if (req.session.authenticated) {
    next();
  } else {
    res.redirect('/login');
  }
}

// Get all notes with their folder information
app.get('/', authRequired, async (req, res) => {
  try {
    const foldersData = JSON.parse(await fs.readFile(FOLDERS_FILE, 'utf8'));
    const notes = [];
    
    // First, read all note files
    const noteFiles = await fs.readdir(NOTES_DIR);
    const noteData = new Map();
    
    for (const file of noteFiles) {
      if (file.endsWith('.json') && file !== 'folders.json') {
        const noteId = file.replace('.json', '');
        const content = await fs.readFile(path.join(NOTES_DIR, file), 'utf8');
        const note = JSON.parse(content);
        noteData.set(noteId, note);
      }
    }
    
    // Then, organize notes by folder
    for (const folder of foldersData.folders) {
      for (const noteId of folder.notes) {
        const note = noteData.get(noteId);
        if (note) {
          note.folderId = folder.id;
          notes.push(note);
        }
      }
    }
    
    res.render('index', { 
      notes,
      folders: foldersData.folders,
      error: null 
    });
  } catch (error) {
    console.error('Error loading notes:', error);
    res.status(500).send('Error loading notes');
  }
});

// Create a new note
app.post('/api/notes', async (req, res) => {
  try {
    const { title, content, folderId } = req.body;
    const id = Date.now().toString();
    const note = {
      id,
      title: title || 'Nouvelle note',
      content: content || '',
      folderId: folderId || 'default' // Use provided folderId or default
    };
    
    // Save note to file
    await fs.writeFile(
      path.join(NOTES_DIR, `${id}.json`),
      JSON.stringify(note, null, 2)
    );

    // Update folders.json to include the new note
    const foldersData = JSON.parse(await fs.readFile(FOLDERS_FILE, 'utf8'));
    const folder = foldersData.folders.find(f => f.id === folderId) || foldersData.folders[0];
    folder.notes.push(id);
    await fs.writeFile(FOLDERS_FILE, JSON.stringify(foldersData, null, 2));
    
    res.json(note);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// Save a note
app.post('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    
    const note = {
      id,
      title,
      content
    };
    
    await fs.writeFile(
      path.join(NOTES_DIR, `${id}.json`),
      JSON.stringify(note, null, 2)
    );
    
    res.json(note);
  } catch (error) {
    console.error('Error saving note:', error);
    res.status(500).send('Error saving note');
  }
});

// Delete a note
app.delete('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const notePath = path.join(NOTES_DIR, `${id}.json`);
    
    if (fsSync.existsSync(notePath)) {
      await fs.unlink(notePath);
      
      // Remove note from folder
      const foldersData = JSON.parse(await fs.readFile(FOLDERS_FILE, 'utf8'));
      for (const folder of foldersData.folders) {
        folder.notes = folder.notes.filter(noteId => noteId !== id);
      }
      await fs.writeFile(FOLDERS_FILE, JSON.stringify(foldersData, null, 2));
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).send('Error deleting note');
  }
});

// Create a new folder
app.post('/api/folders', async (req, res) => {
  try {
    const foldersData = JSON.parse(await fs.readFile(FOLDERS_FILE, 'utf8'));
    const newFolder = {
      id: Date.now().toString(),
      name: 'Nouveau dossier',
      notes: []
    };
    
    foldersData.folders.push(newFolder);
    await fs.writeFile(FOLDERS_FILE, JSON.stringify(foldersData, null, 2));
    
    res.json(newFolder);
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).send('Error creating folder');
  }
});

// Update folder name
app.put('/api/folders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    const foldersData = JSON.parse(await fs.readFile(FOLDERS_FILE, 'utf8'));
    const folder = foldersData.folders.find(f => f.id === id);
    
    if (folder) {
      folder.name = name;
      await fs.writeFile(FOLDERS_FILE, JSON.stringify(foldersData, null, 2));
      res.json(folder);
    } else {
      res.status(404).send('Folder not found');
    }
  } catch (error) {
    console.error('Error updating folder:', error);
    res.status(500).send('Error updating folder');
  }
});

// Delete a folder
app.delete('/api/folders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const foldersData = JSON.parse(await fs.readFile(FOLDERS_FILE, 'utf8'));
    const folderIndex = foldersData.folders.findIndex(f => f.id === id);
    
    if (folderIndex !== -1) {
      // Delete all notes in the folder
      const folder = foldersData.folders[folderIndex];
      for (const noteId of folder.notes) {
        const notePath = path.join(NOTES_DIR, `${noteId}.json`);
        if (fsSync.existsSync(notePath)) {
          await fs.unlink(notePath);
        }
      }
      
      // Remove folder
      foldersData.folders.splice(folderIndex, 1);
      await fs.writeFile(FOLDERS_FILE, JSON.stringify(foldersData, null, 2));
      
      res.json({ success: true });
    } else {
      res.status(404).send('Folder not found');
    }
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).send('Error deleting folder');
  }
});

// Move note to folder
app.put('/api/notes/:id/move', async (req, res) => {
  try {
    const { id } = req.params;
    const { folderId } = req.body;
    
    const foldersData = JSON.parse(await fs.readFile(FOLDERS_FILE, 'utf8'));
    
    // Remove note from all folders
    for (const folder of foldersData.folders) {
      folder.notes = folder.notes.filter(noteId => noteId !== id);
    }
    
    // Add note to target folder
    const targetFolder = foldersData.folders.find(f => f.id === folderId);
    if (targetFolder) {
      targetFolder.notes.push(id);
      await fs.writeFile(FOLDERS_FILE, JSON.stringify(foldersData, null, 2));
      res.json({ success: true });
    } else {
      res.status(404).send('Target folder not found');
    }
  } catch (error) {
    console.error('Error moving note:', error);
    res.status(500).send('Error moving note');
  }
});

// Route login GET : afficher formulaire
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// Route login POST : vérifier mot de passe
app.post('/login', (req, res) => {
  if (req.body.password === process.env.NOTE_PASSWORD) {
    req.session.authenticated = true;
    res.redirect('/');
  } else {
    res.render('login', { error: 'Mot de passe incorrect' });
  }
});

// Lancement du serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
