
const socket = io();
socket.on('connect', () => {
  socket.emit('setUsername', username);
});

function inviter(username) {
  socket.emit('invitePlayer', { toUsername: username });
}

document.addEventListener("DOMContentLoaded", () => {
  const status = document.getElementById("status");
  const createBtn = document.getElementById("createBtn");
  const joinBtn = document.getElementById("joinBtn");
  const gameIdInput = document.getElementById("gameIdInput");
  const spinningloader = document.getElementById("spinningloader");
  const accueil = document.querySelector(".Accueil");
  const EndTheGame=document.getElementById("EndTheGame");

  createBtn.addEventListener("click", () => {
    socket.emit("createGame", ({ gameId }) => {
      status.textContent = `Partie créée. ID : ${gameId}`;
      gameIdInput.value = gameId;
    });
  });

  joinBtn.addEventListener("click", () => {
    const gameId = gameIdInput.value.trim();
    if (!gameId) {
      status.textContent = "Veuillez entrer un ID de partie.";
      return;
    }
    socket.emit("joinGame", { gameId }, ({ success, message }) => {
      if (success) {
        status.textContent = `Rejoint la partie : ${gameId}`;
      } else {
        status.textContent = `Erreur : ${message}`;
      }
    });
  });

 socket.on("gameStart", ({ gameId, players }) => {
  status.textContent = `La partie ${gameId} commence ! Joueurs : ${players.join(" vs ")}`;
  spinningloader.style.display = "none";
  EndTheGame.style.display = "block";
  });

  socket.on('waitingStart', ({ gameId, players, delaySeconds }) => {
    spinningloader.style.display = "block";
    accueil.style.display="none";
  });

  socket.on('connectedUsers', (userList) => {
    const UserCo = document.querySelector(".UserConnecte");
    const ul = document.getElementById('joueursconnectes');
    console.log(userList);
    ul.innerHTML = ''; 
    userList.forEach(user => {
      if (user.username === username) {
        UserCo.innerHTML = `
        <img src="${user.icon}" width="70" height="70" style="vertical-align:middle;" class="IconesUsers">     <p>   <strong style="font-size:2em;color:var(--textJauneFonce)">${user.username}</strong> <br>  <span style="font-size:1em;color:var(--textJaune)"> [${user.trigramme}]  </span> </p>     `;
        return; 
      }
      const li = document.createElement('li');
      li.innerHTML = `
        <img src="${user.icon}" width="48" height="48" style="vertical-align:middle;" class="IconesUsers">
        <p>   <strong style="font-size:1.5em;color:var(--textJauneFonce)">${user.username}</strong> <br>  <span style="font-size:0.7em;color:var(--textJaune)"> [${user.trigramme}] ${user.LP} LP  </span> </p>
        <button onclick="inviter('${user.username}')">Inviter</button>
      `;
      li.classList.add("ListeJoueursConnectes");
      ul.appendChild(li);
    });
  });

  socket.on("reponseClassement", (userList) => {
    const tbody = document.getElementById("classement-body");
    tbody.innerHTML = ''; // Nettoyer le tableau
    // Trier les utilisateurs par LP décroissant
    userList.sort((a, b) => b.LP - a.LP);
    const top10 = userList.slice(0, 10);
    top10.forEach((user, index) => {
      const winrate = user.victoires + user.defaites > 0
        ? Math.round((user.victoires / (user.victoires + user.defaites)) * 100) + '%'
        : '—';
      const row = document.createElement('tr');
      if (index === 0) {
        row.classList.add('first-place');
      } else if (index === 1) {
        row.classList.add('second-place');
      }
      row.innerHTML = `
        <td>${user.username}</td>
        <td>${user.LP}</td>
        <td>${winrate}</td>
      `;
      tbody.appendChild(row);
    });
  });
  socket.on('gameEnded', () => {
    alert('La partie a été terminée par le serveur.');
    // Rediriger, nettoyer l’interface, etc.
  });
  
  EndTheGame.addEventListener("click",()=>{
    socket.emit("SendEndTheGame");
  });

  const logoutLink = document.querySelector('a[href="/logout"]');
  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault(); // Empêche la redirection immédiate
      if (socket && socket.connected) {
        socket.disconnect();
      }
      setTimeout(() => {
        window.location.href = '/logout';
      }, 100);
    });
  }

  socket.on('gameInvitation', ({ from, team, icon }) => {
    const invitationDiv = document.createElement('div');
    invitationDiv.classList.add('invitation');

    invitationDiv.innerHTML = `
      <p style="margin:2px"><strong>${from}</strong> vous invite à jouer.</p>
      <button class="acceptBtn">Accepter</button>
    `;
    const DivNotif = document.querySelector(".NotifInvite");
    DivNotif.appendChild(invitationDiv);

    invitationDiv.querySelector('.acceptBtn').addEventListener('click', () => {
      socket.emit('acceptInvitation', { from });
      invitationDiv.remove();
    });
  });




});

