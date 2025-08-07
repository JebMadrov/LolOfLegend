document.addEventListener("DOMContentLoaded", () => {   
    const BoutonProfil = document.querySelector(".UserConnecte");

    BoutonProfil.addEventListener("click", () => {
        document.querySelector('.ProfilContainer').style.display="flex";
        socket.emit('requestAccountInfo');
    });

    const iconPreview = document.getElementById('iconPreview');
    const iconUpload = document.getElementById('iconUpload');
    iconPreview.addEventListener('click', () => {
        iconUpload.click();
    });

    iconUpload.addEventListener('change', async () => {
        const file = iconUpload.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('icon', file);
        try {
          const response = await fetch('/upload-icon', {
            method: 'POST',
            body: formData
          });
          const result = await response.json();
          if (result.success) {
            const newIconUrl = result.url;
            iconPreview.src = newIconUrl;
            // Mettre à jour le champ icon dans le formulaire
            document.getElementById('icon').value = newIconUrl;
          } else {
            alert('Échec du téléversement de l’image.');
          }
        } catch (err) {
          console.error('Erreur upload :', err);
          alert('Erreur lors du téléversement de l’image.');
        }
      });

    socket.on('accountInfo', (data) => {
        // Champs modifiables
        document.getElementById('username').value = data.username;
        document.getElementById('password').value = data.password;
        //document.getElementById('icon').value = data.icon;
        document.getElementById('team').value = data.team;
        document.getElementById('trigramme').value = data.trigramme;
        iconPreview.src = data.icon || '/logo.png';
        document.getElementById('icon').value = data.icon || '';

        // Infos non modifiables
        document.getElementById('lp').textContent = data.LP;
        document.getElementById('wins').textContent = data.victoires;
        document.getElementById('losses').textContent = data.defaites;
        const total = data.victoires + data.defaites;
        const winrate = total > 0 ? (data.victoires / total) * 100 : 0;
        document.getElementById('winrate').textContent = `${winrate.toFixed(1)}%`;
        document.getElementById('gamesplayed').textContent = total;
    });

    

    document.getElementById('saveChanges').addEventListener('click', () => {
        const updatedData = {
            username: document.getElementById('username').value,
            password: document.getElementById('password').value,
            icon: document.getElementById('icon').value,
            team: document.getElementById('team').value,
            trigramme: document.getElementById('trigramme').value
        };
        
        socket.emit('updateAccountInfo', updatedData);
    });
    
    socket.on('accountInfoUpdated', (data) => {
    alert('Profil mis à jour avec succès.');
    });
    
    socket.on('accountInfoError', (msg) => {
    alert('Erreur : ' + msg);
    });
      
});