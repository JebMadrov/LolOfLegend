
const socket = io();
socket.emit('setUsername', username);

document.addEventListener("DOMContentLoaded", () => {
  const status = document.getElementById("status");
  const createBtn = document.getElementById("createBtn");
  const joinBtn = document.getElementById("joinBtn");
  const gameIdInput = document.getElementById("gameIdInput");
  const spinningloader = document.getElementById("spinningloader");

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
  });

  socket.on('waitingStart', ({ gameId, players, delaySeconds }) => {
    spinningloader.style.display = "block";
  });

  socket.on('connectedUsers', (userList) => {
    const ul = document.getElementById('joueursconnectes');
    console.log(userList);
    ul.innerHTML = ''; 
    userList.forEach(user => {
      const li = document.createElement('li');
      li.textContent = user.username;
      ul.appendChild(li);
    });
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

});

