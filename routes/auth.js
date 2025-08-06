const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();
const USERS_FILE = path.join(__dirname, '../users.json');

// GET: Formulaire d'inscription
router.get('/register', (req, res) => {
  res.render('register', { error: null });
});

router.post('/login', async (req, res) => {
  try {
    console.log('Tentative de connexion avec', req.body);

    const { username, password } = req.body;
    const data = await fs.readFile(USERS_FILE, 'utf-8'); // <- ici peut planter
    const users = JSON.parse(data);

    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
      return res.render('login', { error: 'Nom d’utilisateur ou mot de passe incorrect.' });
    }

    req.session.authenticated = true;
    req.session.username = username;
    res.redirect('/');
  } catch (err) {
    console.error('Erreur dans /login :', err);
    res.status(500).send('Erreur serveur');
  }
});



// POST: Création de compte
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.render('register', { error: 'Tous les champs sont requis.' });
  }

  const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf-8'));
  if (users.find(u => u.username === username)) {
    return res.render('register', { error: 'Nom d’utilisateur déjà utilisé.' });
  }

  users.push({ username, password });
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
  req.session.authenticated = true;
  req.session.username = username;
  res.redirect('/');
});

// GET: Formulaire de connexion
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});


// GET: Déconnexion
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
