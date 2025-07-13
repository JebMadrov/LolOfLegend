// Note handling
let currentNoteId = null;
let notes = window.initialNotes || [];
let saveTimeout = null;
const noteTitle = document.getElementById('tab-title');

// Notification system
function showNotification(htmlContent, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = htmlContent; // Accepte du HTML, comme un SVG

  document.body.appendChild(notification);

  // Forcer le reflow pour activer la transition
  void notification.offsetHeight;

  // Afficher la notification
  notification.classList.add('show');

  // La retirer après 1 seconde (comme vous aviez)
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}


//Chercher les json sans les balises html
function stripHtml(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

// Initialize tabs
function initializeTabs() {
  const tabsContainer = document.getElementById('tabs');
  const addFolderButton = document.getElementById('add-folder');
  const noteEditor = document.getElementById('note-editor');

  // Clear existing tabs
  tabsContainer.innerHTML = '';

  // Create folders from server data
  window.initialFolders.forEach(folder => {
    const folderElement = createFolder(folder.name, folder.id);
    tabsContainer.appendChild(folderElement);
    
    // Add notes to folder
    const folderContent = folderElement.querySelector('.folder-content');
    const notes = window.initialNotes.filter(note => note.folderId === folder.id);
    notes.forEach(note => {
      createTabElement(note, folderContent);
    });
  });

  // Add folder button handler
  addFolderButton.addEventListener('click', async () => {
    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to create folder');
      
      const folder = await response.json();
      const folderElement = createFolder(folder.name, folder.id);
      tabsContainer.appendChild(folderElement);
      showNotification('Nouveau dossier créé');
    } catch (error) {
      console.error('Error creating folder:', error);
      showNotification('Erreur lors de la création du dossier', 'error');
    }
  });

  // Tab click handler
  tabsContainer.addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;

    if (e.target.classList.contains('delete-tab')) {
      deleteNote(tab.dataset.id);
    } else if (e.target.classList.contains('rename-tab')) {
      renameNote(tab.dataset.id);
    } else {
      switchToNote(tab.dataset.id);
    }
  });

  // Save note content with delay
  noteEditor.addEventListener('keyup', function() {
    if (window.saveTimeout) clearTimeout(window.saveTimeout);
    window.saveTimeout = setTimeout(() => {
      if (window.currentNoteId) {
        const activeTabTitle = document.querySelector('.tab.active .tab-title');
        saveNote(window.currentNoteId, activeTabTitle ? activeTabTitle.textContent : '');
      }
    }, 1000);
  });

  // Switch to first note if available
  if (notes.length > 0) {
    switchToNote(notes[0].id);
  }
}

// Create folder element
function createFolder(name, id) {
  const folder = document.createElement('div');
  folder.className = 'folder';
  folder.dataset.id = id;
  
  const folderHeader = document.createElement('div');
  folderHeader.className = 'folder-header';
  
  const folderArrow = document.createElement('span');
  folderArrow.className = 'folder-arrow';
  folderArrow.textContent = '▶';
  
  const folderName = document.createElement('span');
  folderName.className = 'folder-name';
  folderName.textContent = name;
  
  const folderActions = document.createElement('div');
  folderActions.className = 'folder-actions';
  
  const renameButton = document.createElement('button');
  renameButton.className = 'rename-folder';
  renameButton.textContent = '✎';
  renameButton.title = 'Renommer';
  
  const deleteButton = document.createElement('button');
  deleteButton.className = 'delete-folder';
  deleteButton.textContent = '×';
  deleteButton.title = 'Supprimer';
  
  folderActions.appendChild(renameButton);
  folderActions.appendChild(deleteButton);
  
  const folderContent = document.createElement('div');
  folderContent.className = 'folder-content';
  
  folderHeader.appendChild(folderArrow);
  folderHeader.appendChild(folderName);
  folderHeader.appendChild(folderActions);
  folder.appendChild(folderHeader);
  folder.appendChild(folderContent);
  
  // Add note button
  const addNoteBtn = document.createElement('button');
  addNoteBtn.className = 'add-note-btn';
  addNoteBtn.textContent = '+ Ajouter une note';
  folderContent.appendChild(addNoteBtn);
  
  // Folder click handler
  folderHeader.addEventListener('click', (e) => {
    if (!e.target.closest('.folder-actions')) {
      folder.classList.toggle('collapsed');
    }
  });
  
  // Rename folder handler
  renameButton.addEventListener('click', async () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = folderName.textContent;
    input.className = 'folder-name-input';
    
    folderName.replaceWith(input);
    input.focus();
    input.select();
    
    async function finishRename() {
      const newName = input.value.trim() || folderName.textContent;
      input.replaceWith(folderName);
      folderName.textContent = newName;
      
      try {
        const response = await fetch(`/api/folders/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name: newName })
        });
        
        if (!response.ok) throw new Error('Failed to rename folder');
        showNotification('Dossier renommé');
      } catch (error) {
        console.error('Error renaming folder:', error);
        showNotification('Erreur lors du renommage du dossier', 'error');
      }
    }
    
    input.addEventListener('blur', finishRename);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        input.blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        input.value = folderName.textContent;
        input.blur();
      }
    });
  });
  
  // Delete folder handler
  deleteButton.addEventListener('click', async () => {
    if (confirm('Voulez-vous vraiment supprimer ce dossier et toutes ses notes ?')) {
      try {
        const response = await fetch(`/api/folders/${id}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete folder');
        
        folder.remove();
        showNotification('Dossier supprimé');
      } catch (error) {
        console.error('Error deleting folder:', error);
        showNotification('Erreur lors de la suppression du dossier', 'error');
      }
    }
  });
  
  // Add note button handler
  addNoteBtn.addEventListener('click', async () => {
    const folder = addNoteBtn.closest('.folder');
    const folderId = folder.dataset.id;
    
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Nouvelle note',
          content: '',
          folderId: folderId
        })
      });
      
      if (!response.ok) throw new Error('Failed to create note');
      
      const note = await response.json();
      notes.push(note);
      createTabElement(note, folder.querySelector('.folder-content'));
      showNotification('Note créée');
    } catch (error) {
      console.error('Error creating note:', error);
      showNotification('Erreur lors de la création de la note', 'error');
    }
  });
  
  // Drag and drop handlers
  folder.addEventListener('dragover', (e) => {
    e.preventDefault();
    folder.classList.add('drag-over');
  });
  
  folder.addEventListener('dragleave', () => {
    folder.classList.remove('drag-over');
  });
  
  folder.addEventListener('drop', async (e) => {
    e.preventDefault();
    folder.classList.remove('drag-over');
    
    const tabId = e.dataTransfer.getData('text/plain');
    const tab = document.querySelector(`.tab[data-id="${tabId}"]`);
    if (tab && tab.closest('.folder') !== folder) {
      try {
        const response = await fetch(`/api/notes/${tabId}/move`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ folderId: id })
        });
        
        if (!response.ok) throw new Error('Failed to move note');
        
        folderContent.insertBefore(tab, addNoteBtn);
        showNotification('Note déplacée');
      } catch (error) {
        console.error('Error moving note:', error);
        showNotification('Erreur lors du déplacement de la note', 'error');
      }
    }
  });
  
  return folder;
}

// Create tab element
function createTabElement(note, container) {
  const tab = document.createElement('div');
  tab.className = 'tab';
  tab.dataset.id = note.id;
  tab.draggable = true;
  
  const titleSpan = document.createElement('span');
  titleSpan.className = 'tab-title';
  titleSpan.textContent = note.title;
  
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'tab-actions';
  
  const renameButton = document.createElement('button');
  renameButton.className = 'rename-tab';
  renameButton.textContent = '✎';
  renameButton.title = 'Renommer';
  
  const deleteButton = document.createElement('button');
  deleteButton.className = 'delete-tab';
  deleteButton.textContent = '×';
  deleteButton.title = 'Supprimer';
  
  actionsDiv.appendChild(renameButton);
  actionsDiv.appendChild(deleteButton);
  
  tab.appendChild(titleSpan);
  tab.appendChild(actionsDiv);
  
  // Drag and drop handlers
  tab.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', note.id);
    tab.classList.add('dragging');
  });
  
  tab.addEventListener('dragend', () => {
    tab.classList.remove('dragging');
  });
  
  container.insertBefore(tab, container.querySelector('.add-note-btn'));
}

// Switch to a note
function switchToNote(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;
  currentNoteId = id;
  noteEditor.innerHTML = note.content || '';
  // Find the active tab's title span and update it if needed
  const activeTab = document.querySelector(`.tab[data-id="${id}"] .tab-title`);
  if (activeTab) {
    activeTab.textContent = note.title || '';
  }
  // Update active tab
  document.querySelectorAll('.tab').forEach(tab => {
    if (tab.dataset.id === id) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
}

// Save note
async function saveNote(id, title) {
  console.log('[DEBUG] saveNote called', { id, title });
  try {
    const content = noteEditor.innerHTML;
    console.log('[DEBUG] saveNote called', { id, title, content });
    const response = await fetch(`/api/notes/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, content })
    });
    console.log('[DEBUG] fetch response', response);
    if (!response.ok) throw new Error('Failed to save note');
    const note = await response.json();
    console.log('[DEBUG] response JSON', note);
    const existingNote = notes.find(n => n.id === id);
    if (existingNote) {
      existingNote.title = note.title;
      existingNote.content = note.content;
    }
    showNotification(`
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <!-- Nuage -->
        <path d="M5 16a4 4 0 0 1 0-8 5.002 5.002 0 0 1 4.9-5c2.6 0 4.7 2.1 4.9 4.7A3.5 3.5 0 0 1 20.5 12h.5a2.5 2.5 0 0 1 0 5h-16z" fill="white"/>
        
        <!-- Flèche avec animation -->
        <path d="M12 19V9m0 0l-3 3m3-3l3 3"
              class="animated-arrow"
              stroke="#1E3A8A"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"/>
      </svg>
    `);
    
    
    
    
  } catch (error) {
    console.error('[DEBUG] Error saving note:', error);
    showNotification('Erreur lors de la sauvegarde de la note', 'error');
  }
}

// Delete note
async function deleteNote(id) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) return;
  
  try {
    const response = await fetch(`/api/notes/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('Failed to delete note');
    
    // Remove from UI
    const tab = document.querySelector(`.tab[data-id="${id}"]`);
    if (tab) tab.remove();
    
    // Remove from notes array
    notes = notes.filter(note => note.id !== id);
    
    // Switch to another note if available
    if (currentNoteId === id) {
      currentNoteId = notes.length > 0 ? notes[0].id : null;
      if (currentNoteId) {
        switchToNote(currentNoteId);
      } else {
        document.getElementById('note-title').value = '';
        document.getElementById('note-editor').value = '';
      }
    }
    showNotification('Note supprimée');
  } catch (error) {
    console.error('Error deleting note:', error);
    showNotification('Erreur lors de la suppression', 'error');
  }
}

// Rename note
function renameNote(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;

  const tab = document.querySelector(`.tab[data-id="${id}"]`);
  const titleSpan = tab.querySelector('.tab-title');
  const currentTitle = titleSpan.textContent;
  
  // Create input field
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentTitle;
  input.className = 'tab-title-input';
  
  // Replace span with input
  titleSpan.replaceWith(input);
  input.focus();
  input.select();
  
  // Handle input events
  input.addEventListener('blur', finishRename);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      input.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      input.value = currentTitle;
      input.blur();
    }
  });
  
  function finishRename() {
    const newTitle = input.value.trim() || currentTitle;
    input.replaceWith(titleSpan);
    titleSpan.textContent = newTitle;
    
    if (newTitle !== currentTitle) {
      saveNote(id, newTitle);
    }
  }
}

// Search functionality
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

function searchNotes(query) {
  if (!query.trim()) {
    searchResults.classList.remove('active');
    return;
  }

  const results = notes.filter(note => {
    const plainContent = stripHtml(note.content);
    const titleMatch = note.title.toLowerCase().includes(query.toLowerCase());
    const contentMatch = plainContent.toLowerCase().includes(query.toLowerCase());
    return titleMatch || contentMatch;
  }).sort((a, b) => {
    const aTitleMatch = a.title.toLowerCase().includes(query.toLowerCase());
    const bTitleMatch = b.title.toLowerCase().includes(query.toLowerCase());
    if (aTitleMatch && !bTitleMatch) return -1;
    if (!aTitleMatch && bTitleMatch) return 1;
    return 0;
  });

  displaySearchResults(results, query);
}

function displaySearchResults(results, query) {
  searchResults.innerHTML = '';
  
  if (results.length === 0) {
    searchResults.innerHTML = '<div class="search-result-item">Aucun résultat</div>';
  } else {
    results.forEach(note => {
      const resultItem = document.createElement('div');
      resultItem.className = 'search-result-item';
      
      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = note.title;
      
      const contentPreview = document.createElement('div');
      contentPreview.className = 'content-preview';
      const plainContent = stripHtml(note.content);
      const contentMatch = plainContent.toLowerCase().includes(query.toLowerCase());
      
      if (contentMatch) {
        const startIndex = plainContent.toLowerCase().indexOf(query.toLowerCase());
        const preview = plainContent.substring(
          Math.max(0, startIndex - 20),
          Math.min(plainContent.length, startIndex + query.length + 30)
        );
      
        // Mise en gras du mot-clé
        const highlightedPreview = preview.replace(
          new RegExp(`(${query})`, 'gi'),
          '<strong>$1</strong>'
        );
      
        contentPreview.innerHTML = '...' + highlightedPreview + '...';
      }
      
      
      resultItem.appendChild(title);
      if (contentMatch) {
        resultItem.appendChild(contentPreview);
      }
      
      resultItem.addEventListener('click', () => {
        switchToNote(note.id);
        searchInput.value = '';
        searchResults.classList.remove('active');
      });
      
      searchResults.appendChild(resultItem);
    });
  }
  
  searchResults.classList.add('active');
}

// Debounce function to limit search frequency
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Add event listeners for search
searchInput.addEventListener('input', debounce((e) => {
  searchNotes(e.target.value);
}, 300));

// Close search results when clicking outside
document.addEventListener('click', (e) => {
  if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
    searchResults.classList.remove('active');
  }
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  const noteEditor = document.getElementById('note-editor');
  console.log('[DEBUG] noteEditor:', noteEditor);

  // Attach input event for saving
  noteEditor.addEventListener('keyup', function() {
    console.log('[DEBUG] noteEditor input event fired');
    console.log('[DEBUG] currentNoteId:', currentNoteId);
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      if (currentNoteId) {
        const activeTabTitle = document.querySelector('.tab.active .tab-title');
        saveNote(currentNoteId, activeTabTitle ? activeTabTitle.textContent : '');
      }
    }, 1000);
  });

  // Comment out beforeinput handler to allow normal typing
  // noteEditor.addEventListener('beforeinput', function(e) {
  //   if (e.inputType === 'insertText' && e.data) {
  //     e.preventDefault();
  //     insertHtmlAtCaret(`<span style="font-size: ${currentFontSize}px;">${e.data.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`);
  //   }
  // });

  initializeTabs();
});

// Sidebar resize functionality
const sidebar = document.getElementById('sidebar');
const resizeHandle = document.querySelector('.resize-handle');
let isResizing = false;
let startX;
let startWidth;

resizeHandle.addEventListener('mousedown', (e) => {
  isResizing = true;
  startX = e.pageX;
  startWidth = parseInt(getComputedStyle(sidebar).width, 10);
  document.body.style.cursor = 'col-resize';
  resizeHandle.classList.add('active');
});

document.addEventListener('mousemove', (e) => {
  if (!isResizing) return;
  
  const width = startWidth + (e.pageX - startX);
  if (width >= 100 && width <= 800) {
    sidebar.style.width = width + 'px';
  }
});

document.addEventListener('mouseup', () => {
  if (!isResizing) return;
  
  isResizing = false;
  document.body.style.cursor = '';
  resizeHandle.classList.remove('active');
});

// Font size for new text in contenteditable note editor
let currentFontSize = document.getElementById('font-size').value;
const noteEditor = document.getElementById('note-editor');

// Helper: insert HTML at caret
function insertHtmlAtCaret(html) {
  let sel, range;
  if (window.getSelection) {
    sel = window.getSelection();
    if (sel.getRangeAt && sel.rangeCount) {
      range = sel.getRangeAt(0);
      range.deleteContents();
      // Create a fragment with the HTML
      const el = document.createElement('div');
      el.innerHTML = html;
      const frag = document.createDocumentFragment();
      let node, lastNode;
      while ((node = el.firstChild)) {
        lastNode = frag.appendChild(node);
      }
      range.insertNode(frag);
      // Move caret after inserted node
      if (lastNode) {
        range = range.cloneRange();
        range.setStartAfter(lastNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }
}

let currentFontFamily = document.getElementById('font-family').value;

document.getElementById('font-family').addEventListener('change', function(e) {
  currentFontFamily = e.target.value;

  noteEditor.style.fontFamily = currentFontFamily;

  const sel = window.getSelection();
  if (sel && !sel.isCollapsed) {
    applyStyleToSelection('fontFamily', currentFontFamily);
  }
});



// Intercept keypress to insert styled span for new text
noteEditor.addEventListener('beforeinput', function(e) {
  if (e.inputType === 'insertText' && e.data) {
    e.preventDefault();
    insertHtmlAtCaret(`<span style="font-size: ${currentFontSize}px; line-height: ${currentFontSize}px; font-family: ${currentFontFamily};">${e.data.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`);
  }
});

// Handle paste: wrap pasted text in span with current font size
noteEditor.addEventListener('paste', function(e) {
  e.preventDefault();
  let text = (e.clipboardData || window.clipboardData).getData('text');
  insertHtmlAtCaret(`<span style="font-size: ${currentFontSize}px;">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`);
});

document.getElementById('font-size').addEventListener('change', function(e) {
  currentFontSize = e.target.value;

  const sel = window.getSelection();
  if (sel && !sel.isCollapsed) {
    applyStyleToSelection('fontSize', `${currentFontSize}px`);
  } else {
    noteEditor.style.fontSize = `${currentFontSize}px`;
  }
});



function applyStyleToSelection(styleName, styleValue) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;

  const range = sel.getRangeAt(0);
  if (range.collapsed) return;

  const span = document.createElement('span');
  span.style[styleName] = styleValue;

  const content = range.extractContents();
  span.appendChild(content);
  range.insertNode(span);

  // Pour éviter que la sélection saute ou génère un bug visuel
  sel.removeAllRanges();
  const newRange = document.createRange();
  newRange.selectNodeContents(span);
  newRange.collapse(false);
  sel.addRange(newRange);
}
