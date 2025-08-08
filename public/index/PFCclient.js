const fin = document.getElementById("BarreTpsCards");
const cards = document.querySelectorAll('.Card');


socket.on("gameStart", ({ gameId, players }) => {
    cards.forEach(card => { card.style.display = "flex" });
    cards.forEach(card => {
        card.onclick = function() {
            cards.forEach(c => c.classList.remove('Selected_Card'));
            this.classList.add('Selected_Card');
            const cardSelected = this.classList[0];
            socket.emit('SelectCard', cardSelected);
            console.log("carte envoyée")
        };
    });
});

socket.on("CardsSelected", () => {
    fin.style.display = "block";
    document.querySelector('.BarreTpsCards').classList.add('animate');
    setTimeout(() => socket.emit("finSelectCards"), 3000);
});

socket.on("RestartPFC", () => {
    fin.style.display = "none";
    document.querySelector('.BarreTpsCards').classList.remove('animate');
    cards.forEach(c => c.style.display = "flex");
    cards.forEach(c => c.classList.remove('Selected_Card'));
});

socket.on('gameEnded', () => {
    resetPFC();
});

socket.on("PFC_Fini", ({ gagnant, carteAdversaire }) => {
    fin.style.display = "none";
    document.querySelector('.BarreTpsCards').classList.remove('animate');

    // Masquer visuellement les cartes non sélectionnées (fade-out)
    cards.forEach(card => {
        if (!card.classList.contains('Selected_Card')) {
            card.classList.add('fade-out');
            // Après la durée de transition CSS (500ms), on met display:none
            setTimeout(() => { card.style.display = "none"; }, 500);
        }
    });

    const ennemiDiv = document.querySelector('.Card_Ennemi');
    if (ennemiDiv) {
        ennemiDiv.style.display = 'flex';
        ennemiDiv.className = `Card_Ennemi Card_${carteAdversaire.slice(5)}`; // applique la bonne image
        ennemiDiv.innerHTML = `<span class="Card_Span">${carteAdversaire.slice(5)}</span><div class="${carteAdversaire.slice(5)}"></div>`;
    }

    const gagnantDiv = document.querySelector('.gagnantPFC');
    console.log(username + " " + gagnant +" "+ carteAdversaire);
    setTimeout(() => {
        const selected = document.querySelector('.Selected_Card');

        if (ennemiDiv) {
            ennemiDiv.classList.add('visible');
            ennemiDiv.style.display = 'flex';
        }

        // Déterminer la carte perdante
        let perdantCard = null;
        if (gagnant === username){
            perdantCard = ennemiDiv;
        } 
        else  perdantCard = selected;
        console.log(perdantCard);
        if (perdantCard) {
            perdantCard.classList.add("CartePerdante");
        }

        setTimeout(() => {
            if (gagnantDiv) {
                gagnantDiv.textContent = `Gagnant : ${gagnant}`;
                gagnantDiv.style.display = "flex";
            }

            cards.forEach(c => {
                c.style.display = "none";
                c.classList.remove('fade-out', 'Selected_Card','CartePerdante');
            });
            if (ennemiDiv) {
                ennemiDiv.classList.remove('visible');
                ennemiDiv.style.display = "none";
            }

            setTimeout(() => {  
                gagnantDiv.style.display = "none";
                resetPFC();
                socket.emit('FinPFC');
            }, 3000);
        }, 4000);
    }, 200);
});


function resetPFC() {
    const cards = document.querySelectorAll('.Card');
    const ennemiDiv = document.querySelector('.Card_Ennemi');
    const gagnantDiv = document.querySelector('.gagnantPFC');
    const barreTps = document.getElementById("BarreTpsCards");

    // Réinitialiser l'affichage et classes des cartes
    cards.forEach(card => {
        card.style.display = "none";                // cartes masquées par défaut
        card.classList.remove('Selected_Card', 'fade-out', 'CartePerdante');
        card.style.opacity = "1";                    // reset opacité si modifiée
        card.style.backgroundColor = "";            // reset couleur au cas où
    });

    // Réinitialiser la carte ennemie
    if (ennemiDiv) {
        ennemiDiv.style.display = "none";
        ennemiDiv.className = "Card_Ennemi";        // retirer toutes classes supplémentaires
        ennemiDiv.textContent = "";                  // vider contenu HTML
        ennemiDiv.style.backgroundColor = "";
    }

    // Réinitialiser le message gagnant
    if (gagnantDiv) {
        gagnantDiv.style.display = "none";
        gagnantDiv.textContent = "";
    }

    // Réinitialiser la barre de temps
    if (barreTps) {
        barreTps.style.display = "none";
        barreTps.classList.remove('animate');
    }
}
