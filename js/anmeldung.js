document.addEventListener("DOMContentLoaded", function() {
    let jsonResponse;
    let map;
    let marker;
    let selectedAddressIndex;
    let isSubmitting = false;

    // Karte initialisieren
    initializeMap();
    setupEventListeners();

    function initializeMap() {
        map = L.map("mapid");
        // Standardansicht auf Kissing setzen
        map.setView([48.303808, 10.974612], 13);
    }

    function setupEventListeners() {
        // Adresse überprüfen
        const checkForm = document.getElementById("check");
        checkForm?.addEventListener("submit", handleAddressCheck);

        // Adressenauswahl und Bestätigung
        const proofElement = document.getElementById("proof");
        proofElement?.addEventListener("click", handleProofClick);

        // Input-Validierung
        setupInputValidation();
    }

    function setupInputValidation() {
        // Telefonnummer-Validierung
        const phoneInput = document.getElementById("telefonnummer");
        phoneInput?.addEventListener("input", function() {
            this.value = this.value.replace(/[^\d\s\-\+\(\)]/g, '');
        });

        // Geld-Input-Validierung
        const moneyInput = document.getElementById("inputMoney");
        moneyInput?.addEventListener("input", function() {
            const value = parseFloat(this.value);
            if (value < 0) this.value = 0;
        });

        // Name-Validierung
        const nameInput = document.getElementById("name");
        nameInput?.addEventListener("input", function() {
            this.value = this.value.replace(/[^\p{L}\s\-\.]/gu, '');
        });
    }

    async function handleAddressCheck(event) {
        event.preventDefault();

        if (isSubmitting) return;

        const inputAddress = document.getElementById("inputAddress").value.trim();
        
        if (!inputAddress || inputAddress.length < 3) {
            showNotification("Bitte geben Sie eine gültige Adresse ein (mindestens 3 Zeichen)", "warning");
            return;
        }

        try {
            showLoading(true);
            
            const uri = `https://api.openrouteservice.org/geocode/search?` +
                `api_key=5b3ce3597851110001cf62486cf2bc15daf74038b2d9f06d44b8f3db&` +
                `text=${encodeURIComponent(inputAddress)}&` +
                `boundary.circle.lon=10.974612&` +
                `boundary.circle.lat=48.303808&` +
                `boundary.circle.radius=5&` +
                `boundary.country=DE&` +
                `sources=openstreetmap&` +
                `layers=address&` +
                `size=10`;

            const response = await fetch(uri);
            
            if (!response.ok) {
                throw new Error(`Geocoding-Service nicht verfügbar (${response.status})`);
            }

            const data = await response.json();
            jsonResponse = data;

            if (data.features && data.features.length > 0) {
                displayAddressOptions(data.features);
            } else {
                showNotification("Keine Adressen in der Nähe von Kissing gefunden. Bitte überprüfen Sie die Eingabe.", "warning");
                hideAddressOptions();
            }
        } catch (error) {
            console.error("Geocoding error:", error);
            showNotification("Fehler bei der Adresssuche: " + error.message, "error");
            hideAddressOptions();
        } finally {
            showLoading(false);
        }
    }

    function displayAddressOptions(features) {
        let proof = '<div class="alert alert-info">Wählen Sie die korrekte Adresse aus:</div>';
        
        features.forEach((feature, index) => {
            const confidence = feature.properties.confidence || 0;
            const confidenceClass = confidence > 0.8 ? 'success' : confidence > 0.6 ? 'warning' : 'secondary';
            
            proof += `
                <div class='row mb-2 address-option' data-index='${index}'>
                    <div class='col-8 col-md-9'>
                        <div class="card">
                            <div class="card-body py-2">
                                <h6 class="card-title mb-1">${escapeHtml(feature.properties.label || feature.properties.name)}</h6>
                                <small class="text-muted">
                                    Genauigkeit: <span class="badge bg-${confidenceClass}">${Math.round(confidence * 100)}%</span>
                                </small>
                            </div>
                        </div>
                    </div>
                    <div class='col-4 col-md-3 d-flex align-items-center'>
                        <button value='${index}' class='btn btn-primary btn-sm w-100 adresseAnschauen'>
                            Anschauen
                        </button>
                    </div>
                </div>`;
        });

        const proofElement = document.getElementById("proof");
        if (proofElement) {
            proofElement.innerHTML = proof;
            proofElement.classList.remove("invisible");
            
            // Scroll zu den Optionen
            proofElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    function hideAddressOptions() {
        const proofElement = document.getElementById("proof");
        if (proofElement) {
            proofElement.innerHTML = '';
            proofElement.classList.add('invisible');
        }
        
        // Bestätigung verstecken
        hideConfirmation();
    }

    function handleProofClick(event) {
        if (event.target.classList.contains("adresseAnschauen")) {
            handleAddressSelection(event);
        } else if (event.target.id === 'confirm_button') {
            handleConfirmation(event);
        }
    }

    function handleAddressSelection(event) {
        // Vorherige Auswahl zurücksetzen
        resetPreviousSelection();

        // Neue Auswahl markieren
        const selectedOption = event.target.closest('.address-option');
        selectedOption.classList.add('selected');
        event.target.classList.add("clicked");

        selectedAddressIndex = parseInt(event.target.value);
        
        if (!jsonResponse.features[selectedAddressIndex]) {
            showNotification("Fehler bei der Adressauswahl", "error");
            return;
        }

        try {
            displayAddressOnMap(selectedAddressIndex);
            showConfirmButton(event.target.parentElement);
        } catch (error) {
            console.error("Map display error:", error);
            showNotification("Fehler bei der Kartenanzeige", "error");
        }
    }

    function resetPreviousSelection() {
        // Entferne vorherige Markierungen
        document.querySelectorAll('.address-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        document.querySelectorAll('.adresseAnschauen').forEach(button => {
            button.classList.remove('clicked');
        });

        // Entferne vorherigen Bestätigungsbutton
        const existingConfirmButton = document.getElementById('confirm_button');
        if (existingConfirmButton) {
            existingConfirmButton.remove();
        }
    }

    function displayAddressOnMap(index) {
        const feature = jsonResponse.features[index];
        const coordinates = feature.geometry.coordinates;

        // Alten Marker entfernen
        if (marker) {
            map.removeLayer(marker);
        }

        // OSM Layer initialisieren falls noch nicht geschehen
        if (map.hasLayer === undefined || !map.hasLayer) {
            const osmUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
            const osmAttrib = "Map data © <a href='https://openstreetmap.org'>OpenStreetMap</a> contributors";
            const osm = L.tileLayer(osmUrl, { attribution: osmAttrib });
            map.addLayer(osm);
        }

        // Karte zentrieren und Marker setzen
        const lat = coordinates[1];
        const lng = coordinates[0];
        
        map.setView([lat, lng], 18);
        
        marker = L.marker([lat, lng], {
            title: feature.properties.label || feature.properties.name
        });
        
        marker.bindPopup(`
            <div class="text-center">
                <strong>${escapeHtml(feature.properties.label || feature.properties.name)}</strong><br>
                <small class="text-muted">Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}</small>
            </div>
        `);
        
        map.addLayer(marker);
        
        // Popup anzeigen
        marker.openPopup();
    }

    function showConfirmButton(parentElement) {
        const confirmButton = document.createElement('button');
        confirmButton.classList.add('btn', 'btn-success', 'btn-sm', 'w-100', 'mt-2');
        confirmButton.innerText = 'Adresse bestätigen';
        confirmButton.id = 'confirm_button';
        confirmButton.type = 'button';
        
        parentElement.appendChild(confirmButton);
    }

    async function handleConfirmation(event) {
        if (isSubmitting) return;

        // Formulardaten validieren
        const validationResult = validateFormData();
        if (!validationResult.isValid) {
            showNotification("Bitte füllen Sie alle Felder korrekt aus:\n" + validationResult.errors.join('\n'), "warning");
            return;
        }

        const formData = collectFormData();
        
        try {
            isSubmitting = true;
            showLoading(true);
            
            const response = await fetch("backend/process_anmeldung.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            const result = await response.json();
            
            if (result.success) {
                showSuccessConfirmation(formData);
                resetForm();
            } else {
                if (result.errors) {
                    const errorMessages = Object.values(result.errors).join('\n');
                    showNotification("Validierungsfehler:\n" + errorMessages, "error");
                } else {
                    showNotification(result.message || "Fehler beim Speichern der Anmeldung", "error");
                }
            }
        } catch (error) {
            console.error("Submission error:", error);
            showNotification("Netzwerkfehler beim Speichern der Anmeldung", "error");
        } finally {
            isSubmitting = false;
            showLoading(false);
        }
    }

    function validateFormData() {
        const errors = [];
        
        const name = document.getElementById("name").value.trim();
        if (!name || name.length < 2) {
            errors.push("Name muss mindestens 2 Zeichen lang sein");
        }

        const telefon = document.getElementById("telefonnummer").value.trim();
        if (!telefon || !/^[\d\s\-\+\(\)]{8,}$/.test(telefon)) {
            errors.push("Gültige Telefonnummer erforderlich (mindestens 8 Zeichen)");
        }

        const money = document.getElementById("inputMoney").value;
        if (!money || parseFloat(money) < 0) {
            errors.push("Gültiger Geldbetrag erforderlich");
        }

        const cbAnzahl = document.getElementById("cb_anzahl").value;
        if (!cbAnzahl || parseInt(cbAnzahl) < 1 || parseInt(cbAnzahl) > 10) {
            errors.push("Anzahl Bäume muss zwischen 1 und 10 liegen");
        }

        if (selectedAddressIndex === undefined || !jsonResponse?.features[selectedAddressIndex]) {
            errors.push("Bitte wählen Sie eine gültige Adresse aus");
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    function collectFormData() {
        const feature = jsonResponse.features[selectedAddressIndex];
        
        return {
            name: document.getElementById("name").value.trim(),
            lat: feature.geometry.coordinates[1],
            lng: feature.geometry.coordinates[0],
            strasse: feature.properties.label || feature.properties.name,
            money: parseFloat(document.getElementById("inputMoney").value),
            telefonnummer: document.getElementById("telefonnummer").value.trim(),
            cb_anzahl: parseInt(document.getElementById("cb_anzahl").value),
        };
    }

    function showSuccessConfirmation(formData) {
        const confirmation = document.getElementById("confirmation");
        const confirmationDetails = document.getElementById("confirmationDetails");

        if (confirmation && confirmationDetails) {
            confirmationDetails.innerHTML = `
                <li><strong>Name:</strong> ${escapeHtml(formData.name)}</li>
                <li><strong>Adresse:</strong> ${escapeHtml(formData.strasse)}</li>
                <li><strong>Telefonnummer:</strong> ${escapeHtml(formData.telefonnummer)}</li>
                <li><strong>Bezahlt:</strong> €${formData.money.toFixed(2)}</li>
                <li><strong>Anzahl Bäume:</strong> ${formData.cb_anzahl}</li>
            `;

            confirmation.classList.remove("invisible");
            
            // Scroll zur Bestätigung
            confirmation.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Auto-hide nach 10 Sekunden
            setTimeout(() => {
                confirmation.classList.add("invisible");
            }, 10000);
        }
    }

    function resetForm() {
        // Formular zurücksetzen
        document.getElementById("name").value = "";
        document.getElementById("telefonnummer").value = "";
        document.getElementById("inputMoney").value = "";
        document.getElementById("inputAddress").value = "";
        document.getElementById("cb_anzahl").selectedIndex = 0;

        // UI zurücksetzen
        hideAddressOptions();
        
        // Marker entfernen
        if (marker) {
            map.removeLayer(marker);
        }

        // Variablen zurücksetzen
        selectedAddressIndex = undefined;
        jsonResponse = null;
    }

    function hideConfirmation() {
        const confirmation = document.getElementById("confirmation");
        if (confirmation) {
            confirmation.classList.add("invisible");
        }
    }

    // Hilfsfunktionen
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    function showLoading(show) {
        let loader = document.getElementById('loading-indicator');
        if (show && !loader) {
            loader = document.createElement('div');
            loader.id = 'loading-indicator';
            loader.className = 'position-fixed top-50 start-50 translate-middle';
            loader.style.zIndex = '9999';
            loader.innerHTML = `
                <div class="d-flex flex-column align-items-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Laden...</span>
                    </div>
                    <small class="mt-2 text-muted">Wird verarbeitet...</small>
                </div>
            `;
            document.body.appendChild(loader);
        } else if (!show && loader) {
            loader.remove();
        }
    }

    function showNotification(message, type = 'info') {
        const alertClass = {
            'success': 'alert-success',
            'error': 'alert-danger',
            'warning': 'alert-warning',
            'info': 'alert-info'
        }[type] || 'alert-info';

        const notification = document.createElement('div');
        notification.className = `alert ${alertClass} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
        notification.style.zIndex = '10000';
        notification.style.maxWidth = '400px';
        notification.innerHTML = `
            <div style="white-space: pre-line;">${escapeHtml(message)}</div>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(notification);

        // Auto-remove nach 7 Sekunden
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 7000);
    }
});
