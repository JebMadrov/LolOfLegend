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
            socket.emit("finSelectCards");
        }, 3000);
    });

    socket.on("RestartPFC",()=>{
        fin.style.display = "none";
        document.querySelector('.BarreTpsCards').classList.remove('animate');
        cards.forEach(c => c.style.display="block");
        cards.forEach(c => c.classList.remove('Selected_Card'));

    });

    socket.on("PFC_Fini",({ gagnant, carteAdversaire })=>{
        fin.style.display = "none";
        document.querySelector('.BarreTpsCards').classList.remove('animate');

        cards.forEach(card => {
            if (!card.classList.contains('Selected_Card')) {
                card.classList.add('fade-out');
            }
        });

        const ennemiDiv = document.querySelector('.Card_Ennemi');
        if (ennemiDiv) {
            ennemiDiv.style.display = 'block';
            ennemiDiv.textContent = carteAdversaire.slice(5);
        }

        /*cards.forEach(c => c.style.display="none");*/
        cards.forEach(c => c.classList.remove('Selected_Card'));
        console.log(gagnant + " a gagné");

        const gagnantDiv = document.querySelector('.gagnantPFC');
        
        setTimeout(() => {
            // 3. Centrer la carte sélectionnée
            const selected = document.querySelector('.Selected_Card');
            if (selected) {
                selected.classList.add('move-to-center');
            }

            // 4. Afficher la carte ennemie avec fade-in
            const ennemiDiv = document.querySelector('.Card_Ennemi');
            if (ennemiDiv) {
                ennemiDiv.textContent = carteAdversaire.slice(5);
                ennemiDiv.classList.add('visible');
                ennemiDiv.style.display = 'block';
            }

            // 5. Afficher le gagnant après 2 secondes supplémentaires
            setTimeout(() => {
                const gagnantDiv = document.querySelector('.gagnantPFC');
                if (gagnantDiv) {
                    gagnantDiv.textContent = `Gagnant : ${gagnant}`;
                    gagnantDiv.style.display = "block";
                }

                // 6. Nettoyer tout après l'affichage
                cards.forEach(c => {
                    c.style.display = "none";
                    c.classList.remove('fade-out', 'move-to-center', 'Selected_Card');
                });
                if (ennemiDiv) {
                    ennemiDiv.classList.remove('visible');
                    ennemiDiv.style.display = "none";
                }

            }, 4000); // délai pour le gagnant
        }, 200); 
    });

}
