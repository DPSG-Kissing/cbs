document.addEventListener('DOMContentLoaded', () => {
    // --- Elemente ---
    const chatMessages = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const userNameInput = document.getElementById('chat-user-name');
    const messageInput = document.getElementById('chat-input');
    const photoInput = document.getElementById('chat-photo-upload');
    const statusBadge = document.getElementById('chat-status');

    // --- WebSocket-Verbindung ---
    const conn = new WebSocket('ws://cbs.pfadfinder-kissing.de:8080'); // WICHTIG: Domain anpassen!

    conn.onopen = function(e) {
        console.log("Verbindung zum Chat-Server hergestellt!");
        statusBadge.textContent = 'Verbunden';
        statusBadge.classList.replace('bg-danger', 'bg-success');
        loadChatHistory();
    };

    conn.onmessage = function(e) {
        const messageData = JSON.parse(e.data);
        appendMessage(messageData);
    };

    conn.onclose = function(e) {
        console.log("Verbindung getrennt.");
        statusBadge.textContent = 'Getrennt';
        statusBadge.classList.replace('bg-success', 'bg-danger');
    };
    
    conn.onerror = function(e) {
        console.error("WebSocket Fehler:", e);
    };

    // --- Chat-Funktionen ---

    // Lädt alte Nachrichten beim Start
    async function loadChatHistory() {
        try {
            const response = await fetch('backend/get_chat_history.php');
            const history = await response.json();
            chatMessages.innerHTML = ''; // Leere den Chat-Bereich
            history.forEach(msg => appendMessage(msg));
        } catch (error) {
            console.error('Fehler beim Laden des Chat-Verlaufs:', error);
        }
    }

    // Fügt eine Nachricht zum Chat-Fenster hinzu
    function appendMessage(msg) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('mb-2');

        let imageHtml = '';
        if (msg.image_url) {
            // WICHTIG: Basis-URL anpassen!
            imageHtml = `<a href="backend/${msg.image_url}" target="_blank"><img src="backend/${msg.image_url}" class="img-fluid rounded mt-1" style="max-height: 150px;"></a>`;
        }
        
        messageElement.innerHTML = `
            <div>
                <strong class="text-primary">${escapeHtml(msg.user_name)}</strong>
                <small class="text-muted ms-2">${new Date(msg.timestamp).toLocaleTimeString('de-DE')}</small>
            </div>
            <div>${escapeHtml(msg.message_text || '')}</div>
            ${imageHtml}
        `;

        chatMessages.appendChild(messageElement);
        // Automatisch nach unten scrollen
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // --- Event Listener ---
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userName = userNameInput.value.trim();
        const messageText = messageInput.value.trim();

        if (!userName) {
            alert('Bitte gib deinen Namen ein.');
            return;
        }
        if (!messageText) return; // Keine leeren Textnachrichten senden

        const messageData = {
            user_name: userName,
            message_text: messageText,
            image_url: null, // Wird vom Server hinzugefügt
            timestamp: new Date().toISOString()
        };

        // Nachricht über WebSocket an alle anderen senden
        conn.send(JSON.stringify(messageData));
        
        // Eigene Nachricht auch anzeigen
        appendMessage(messageData);
        
        // Nachricht in DB speichern (ohne Bild)
        const formData = new FormData();
        formData.append('user_name', userName);
        formData.append('message_text', messageText);
        fetch('backend/handle_chat_upload.php', { method: 'POST', body: formData });

        messageInput.value = ''; // Input leeren
    });

    photoInput.addEventListener('change', () => {
        const file = photoInput.files[0];
        const userName = userNameInput.value.trim();

        if (!file || !userName) {
            alert('Bitte gib zuerst deinen Namen ein, bevor du ein Bild hochlädst.');
            return;
        }

        const formData = new FormData();
        formData.append('user_name', userName);
        formData.append('image', file);

        // Bild wird per normalem POST hochgeladen.
        // Das PHP-Skript benachrichtigt dann den WebSocket-Server.
        fetch('backend/handle_chat_upload.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(result => {
            if (!result.success) {
                alert('Fehler beim Upload: ' + result.error);
            }
        })
        .catch(error => console.error('Upload-Fehler:', error));
        
        photoInput.value = ''; // File-Input zurücksetzen
    });

    // --- Hilfsfunktion ---
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});