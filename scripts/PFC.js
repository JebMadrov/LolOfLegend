function PFC(io, game) {
  const [player1, player2] = game.players;
  const { id: gameId } = game;

  player1.emit('message', `Bienvenue dans la partie ${gameId}, ${player1.username}`);
  player2.emit('message', `Bienvenue dans la partie ${gameId}, ${player2.username}`);

  game.players.forEach(player => {
    player.on('playMove', (move) => {
      const opponent = game.players.find(p => p.id !== player.id);
      if (opponent) {
        opponent.emit('opponentMove', move);
      }

    });
  });

  game.state = {
    moves: {}, // Ex : { socket.id: 'Pierre' }
    round: 1
  };
}

module.exports = { PFC };
