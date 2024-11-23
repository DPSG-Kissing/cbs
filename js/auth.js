// Hashing-Funktion für das Passwort (SHA-256)
async function hash(string) {
    const utf8 = new TextEncoder().encode(string);
    const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Cookie-Management
function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/`;
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
    const modal = new bootstrap.Modal(document.getElementById("myModal"), {
        backdrop: 'static',
        keyboard: false,
    });
    modal.show();

    document.getElementById("login").addEventListener("submit", async function(event) {
        event.preventDefault(); // Verhindert Standard-Submit

        const password = document.getElementById("password").value;
        const passwordHash = await hash(password);

        const isValid = await validatePasswordHash(passwordHash);
        if (isValid) {
            setCookie("password_hash", passwordHash, 1); // Speichert Hash als Cookie
            modal.hide();
        } else {
            alert("Falsches Passwort. Bitte versuche es erneut.");
        }
    });
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

        const result = await response.json();
        return result.success;
    } catch (error) {
        console.error("Fehler bei der Anfrage:", error);
        return false;
    }
}

// Starte die Passwortprüfung beim Laden der Seite
document.addEventListener("DOMContentLoaded", checkPassword);