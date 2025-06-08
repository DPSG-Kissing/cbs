// Hashing-Funktion für das Passwort (SHA-256)
async function hash(string) {
    const utf8 = new TextEncoder().encode(string);
    const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `expires=${d.toUTCString()}`;
    const sameSite = "SameSite=None"; // Für Drittanbieter-Kontexte
    const secure = "Secure"; // Nur über HTTPS senden
    document.cookie = `${name}=${value}; ${expires}; path=/; ${sameSite}; ${secure}`;
}

function getCookie(name) {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        const c = cookies[i].trim();
        if (c.startsWith(`${name}=`)) {
            return c.substring(name.length + 1);
        }
    }
    return null;
}

// Prüft, ob der Benutzer bereits eingeloggt ist
async function checkPassword() {
    const storedHash = getCookie("password_hash");
    if (!storedHash) {
        showLoginModal();
        return;
    }

    // Prüfe den gespeicherten Hash beim Server
    const isValid = await validatePasswordHash(storedHash);
    if (!isValid) {
        showLoginModal();
    } else {
        console.log("Bereits eingeloggt.");
    }
}

// Zeigt das Login-Popup an
function showLoginModal() {
    const modalElement = document.getElementById("myModal");
    if (!modalElement) {
        console.error("Modal-Element nicht gefunden!");
        return;
    }

    // Bootstrap 5 Modal initialisieren
    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        const modal = new bootstrap.Modal(modalElement, {
            backdrop: 'static',
            keyboard: false,
            focus: true
        });

        modal.show();

        // Event Listener für das Formular
        const loginForm = document.getElementById("login");
        if (loginForm) {
            // Entferne alte Event Listener, um doppelte Ausführungen zu vermeiden
            const newForm = loginForm.cloneNode(true);
            loginForm.parentNode.replaceChild(newForm, loginForm);
            
            newForm.addEventListener("submit", async function(event) {
                event.preventDefault();

                // KORRIGIERT: .trim() entfernt versehentliche Leerzeichen
                const password = document.getElementById("password").value.trim();
                const passwordHash = await hash(password);

                const isValid = await validatePasswordHash(passwordHash);
                if (isValid) {
                    setCookie("password_hash", passwordHash, 1); // Cookie für 1 Tag setzen
                    modal.hide();
                    // Seite neu laden nach erfolgreichem Login, um Inhalte zu aktualisieren
                    window.location.reload();
                } else {
                    alert("Falsches Passwort. Bitte versuche es erneut.");
                }
            });
        }
    } else {
        console.error("Bootstrap Modal nicht verfügbar!");
        // Fallback ohne Bootstrap
        modalElement.style.display = 'block';
    }
}

// Validiert den Passwort-Hash beim Server
async function validatePasswordHash(hash) {
    try {
        const response = await fetch("backend/login.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `password_hash=${encodeURIComponent(hash)}`,
        });

        // Prüft, ob der HTTP-Status erfolgreich war (z.B. 200 OK)
        if (!response.ok) {
            console.error(`Fehler vom Server: ${response.status} (${response.statusText})`);
            return false;
        }

        const result = await response.json();
        return result.success;
    } catch (error) {
        console.error("Fehler bei der Anfrage:", error);
        return false;
    }
}

// Starte die Passwortprüfung beim Laden der Seite
document.addEventListener("DOMContentLoaded", checkPassword);