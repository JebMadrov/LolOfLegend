const games = new Map();
const users = new Map(); 

const { PFC } = require('./PFC');
const path = require('path');
const fs = require('fs').promises;
const USERS_FILE = path.join(__dirname, '../users.json');

function generateGameId() {
  return Math.random().toString(36).substr(2, 9); // exemple : 'k3tz2gh9a'
}

function registerSocketHandlers(io, socket) {
  // Le client doit envoyer son pseudo juste après connexion Socket
  socket.on('setUsername', async (username) => {
    try {
      const data = await fs.readFile(USERS_FILE, 'utf-8');
      const allUsers = JSON.parse(data);
      const user = allUsers.find(u => u.username === username);

      if (!user) {
        return socket.emit('authError', 'Utilisateur non trouvé');
      }

      socket.username = username;
      users.set(socket.id, {
      ...user,
      socket // très utile pour faire .emit plus tard
    });

      io.emit('connectedUsers', Array.from(users.values()).map(u => ({
      username: u.username,
      icon: u.icon,
      team: u.team,
      LP: u.LP,
      trigramme:u.trigramme,
      defaites:u.defaites,
      victoires:u.victoires
    })));
    } catch (err) {
      console.error('Erreur chargement users.json :', err);
    }
    console.log(users);
  });

  // Créer une partie
  socket.on('createGame', (callback) => {
    const gameId = generateGameId();

    const game = {
      id: gameId,
      players: [socket],
      state: {} // état du jeu à définir
    };
    socket.join(gameId);
    games.set(gameId, game);

    callback({ gameId });
  });

  // Rejoindre une partie
  socket.on('joinGame', ({ gameId }, callback) => {
    const game = games.get(gameId);
    if (!game || game.players.length >= 2) {
      return callback({ success: false, message: 'Partie introuvable ou pleine.' });
    }

    game.players.push(socket);
    socket.join(gameId);

    // Préparer la liste des pseudos des joueurs dans la partie
    const playersUsernames = game.players.map(p => p.username || 'Anonyme');

    // Notifier les deux joueurs que la partie commence
    game.players.forEach(p => {p.emit('waitingStart', {});});

    setTimeout(() => {
      game.players.forEach(p => p.emit('gameStart', { gameId, players: playersUsernames }));
      PFC(io,game);
    }, 2000); // 2 secondes
    callback({ success: true });
  });


  // Gestion de la déconnexion
  socket.on('disconnect', () => {
    users.delete(socket.id);
    io.emit('connectedUsers', Array.from(users.values()).map(u => ({
      username: u.username,
      icon: u.icon,
      team: u.team,
      LP: u.LP,
      trigramme:u.trigramme,
      defaites:u.defaites,
      victoires:u.victoires
    })));

    for (const [gameId, game] of games) {
      const index = game.players.findIndex(p => p.id === socket.id);
      if (index !== -1) {
        game.players.splice(index, 1);
        // Informer l'autre joueur que son adversaire a quitté
        game.players.forEach(p => p.emit('opponentLeft'));
        // Supprimer la partie si plus aucun joueur
        if (game.players.length === 0) {
          games.delete(gameId);
        }
        break;
      }
    }
  });

  socket.on('invitePlayer', ({ toUsername }) => {
    const inviter = users.get(socket.id);
    const target = Array.from(users.values()).find(u => u.username === toUsername);

    if (!target) {
      return socket.emit('invitationError', 'Joueur introuvable ou déconnecté.');
    }

    target.socket.emit('gameInvitation', {
      from: inviter.username,
      team: inviter.team,
      icon: inviter.icon
    });
  });

  socket.on('acceptInvitation', ({ from }) => {
    console.log("invitation acceptée + from : " + from);
    const fromEntry = Array.from(users.entries()).find(([_, u]) => u.username === from);
    if (!fromEntry) {
      return socket.emit('invitationError', 'Invitant introuvable.');
    }

    const [fromSocketId, inviter] = fromEntry;
    const fromSocket = io.sockets.sockets.get(fromSocketId);

    if (!fromSocket) {
      return socket.emit('invitationError', 'Invitant déconnecté.');
    }

    // Créer la partie (en appelant la logique déjà faite)
    const gameId = generateGameId();
    const game = {
      id: gameId,
      players: [fromSocket],
      state: {}
    };
    fromSocket.join(gameId);
    games.set(gameId, game);

    // L'autre joueur rejoint
    game.players.push(socket);
    socket.join(gameId);

    const playersUsernames = game.players.map(p => p.username || 'Anonyme');

    game.players.forEach(p => p.emit('waitingStart', {}));

    setTimeout(() => {
      game.players.forEach(p => p.emit('gameStart', { gameId, players: playersUsernames }));
      PFC(io, game);
    }, 2000);
  });






}

module.exports = { registerSocketHandlers };
