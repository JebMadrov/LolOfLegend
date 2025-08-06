document.addEventListener("DOMContentLoaded", () => {   
    socket.on("gameStart", ({ gameId, players }) => {
        PFCClient(gameId);
    });

});


function PFCClient(gameId) {
    const cards = document.querySelectorAll('.Card');
    cards.forEach(card => {card.style.display="block"});
    // Ajouter un événement de clic à chaque carte
    cards.forEach(card => {
        card.addEventListener('click', function() {
            // Enlever la classe "Selected_Card" de toutes les cartes
            cards.forEach(c => c.classList.remove('Selected_Card'));
            
            // Ajouter la classe "Selected_Card" à la carte cliquée
            this.classList.add('Selected_Card');

            //Send la carte au serveur
            const cardSelected=this.classList[0];
            socket.emit('SelectCard', cardSelected);
        });
    });

    const fin=document.getElementById("BarreTpsCards");
    socket.on("CardsSelected",()=>{
        fin.style.display = "block";
        document.querySelector('.BarreTpsCards').classList.add('animate');
        setTimeout(() => {
            cards.forEach(c => c.style.display="none");
            socket.emit("finSelectCards");
        }, 5000);
    });

    socket.on("RestartPFC",()=>{
        fin.style.display = "none";
        document.querySelector('.BarreTpsCards').classList.remove('animate');
        cards.forEach(c => c.style.display="block");
        cards.forEach(c => c.classList.remove('Selected_Card'));

    });

    socket.on("PFC_Fini",(gagnant)=>{
        fin.style.display = "none";
        document.querySelector('.BarreTpsCards').classList.remove('animate');
        cards.forEach(c => c.style.display="none");
        cards.forEach(c => c.classList.remove('Selected_Card'));
        console.log(gagnant + " a gagné");
    });

}
