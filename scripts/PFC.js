function PFC(io, game) {
  const [player1, player2] = game.players;
  const { id: gameId } = game;
  console.log("PFC joueurs : " + player1.username + " vs " + player2.username)
  var fini = false;

  game.players.forEach(player => {

    player.on('SelectCard', (cardSelected) => {
      player.Card = cardSelected   
      if (player1.Card && player2.Card){
        game.players.forEach(player => {player.emit('CardsSelected');});
      }
      fini = false;
    });

    player.on('finSelectCards', () => {
      if(!fini){
        console.log( player1.username + " a joué : " + player1.Card + " et " + player2.username + " a joué : " + player2.Card);
        if(player1.Card === player2.Card){
          game.players.forEach(player => {player.emit('RestartPFC');});
          player1.Card = null;
          player2.Card = null;
          fini = true;
        }
        else{
          fini = true;
          const gagnant = determineWinner(player1,player2);
          game.state = {
            firstpick : gagnant.username
          };
          game.players.forEach(player => {
            const adversaire = player === player1 ? player2 : player1;
            player.emit('PFC_Fini', {
              gagnant: gagnant.username,
              carteAdversaire: adversaire.Card
            });
          });
          player1.Card = null;
          player2.Card = null;
        }
      }

    });

    
  });

  
}

module.exports = { PFC };


function determineWinner(player1, player2) {
  if (
      (player1.Card === "Card_Pierre" && player2.Card === "Card_Ciseaux") ||
      (player1.Card === "Card_Feuille" && player2.Card === "Card_Pierre") ||
      (player1.Card === "Card_Ciseaux" && player2.Card === "Card_Feuille")
  ) {
      console.log(player1.username + " gagne !");
      return player1;
  } else {
      console.log(player2.username + " gagne !");
      return player2;
  }
}