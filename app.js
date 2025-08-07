require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const authRoutes = require('./routes/auth');
const app = express();
const PORT = 31245;
const uploadRouter = require('./routes/upload'); 

app.use(uploadRouter);

// Middlewares globaux
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));

// Config EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Auth middleware
function authRequired(req, res, next) {
  if (req.session.authenticated) {
    next();
  } else {
    res.redirect('/login');
  }
}

// Routes
app.use('/', authRoutes);

app.get('/', (req, res) => {
  if (!req.session.authenticated) {
    return res.redirect('/login');
  }
  res.render('index', { username: req.session.username });
});

const http = require('http');
const { Server } = require('socket.io');
const gameManager = require('./scripts/game'); // qu'on va créer juste après

const server = http.createServer(app);
const io = new Server(server);

// Socket.IO connection logic
io.on('connection', (socket) => {
  console.log(`Socket connecté : ${socket.id}`);

  gameManager.registerSocketHandlers(io, socket);
});

server.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
