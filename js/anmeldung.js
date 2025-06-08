/**
 * CBS Anmeldung - Vereinfachte funktionierende Version
 * Für die Christbaum-Sammlung DPSG Kissing
 */

document.addEventListener("DOMContentLoaded", function() {
    let selectedAddressIndex = null;
    let geocodingResults = [];
    let selectedMarker = null;
    let map = null;

    // Basis-Karte initialisieren
    initializeMap();
    setupEventListeners();

    function initializeMap() {
        try {
            // Einfache Leaflet-Karte ohne komplexen Manager
            map = L.map('mapid').setView([48.303808, 10.974612], 15);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
                maxZoom: 19
            }).addTo(map);

            console.log('Karte erfolgreich initialisiert');
        } catch (error) {
            console.error('Fehler bei der Karten-Initialisierung:', error);
            document.getElementById('map-loading').innerHTML = '<p class="text-danger">Karte konnte nicht geladen werden</p>';
        }
    }

    function setupEventListeners() {
        // Hauptformular
        const checkForm = document.getElementById("check");
        if (checkForm) {
            checkForm.addEventListener("submit", handleAddressSearch);
        }

        // Input-Validierung
        setupFormValidation();
    }

    function setupFormValidation() {
        const fields = ['name', 'telefonnummer', 'inputMoney', 'cb_anzahl', 'inputAddress'];
        
        fields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.addEventListener('blur', () => validateField(element));
                element.addEventListener('input', () => clearFieldError(element));
            }
        });

        // Telefonnummer-Filter
        const phoneInput = document.getElementById("telefonnummer");
        if (phoneInput) {
            phoneInput.addEventListener("input", function() {
                this.value = this.value.replace(/[^\d\s\-\+\(\)]/g, '');
            });
        }

        // Anzahl Bäume-Filter
        const treeCountInput = document.getElementById("cb_anzahl");
        if (treeCountInput) {
            treeCountInput.addEventListener("input", function() {
                let value = this.value.replace(/[^\d]/g, '');
                if (parseInt(value) > 50) value = "50";
                this.value = value;
            });
        }

        // Geld-Filter
        const moneyInput = document.getElementById("inputMoney");
        if (moneyInput) {
            moneyInput.addEventListener("input", function() {
                let value = this.value.replace(/[^\d.,]/g, '');
                value = value.replace(',', '.');
                this.value = value;
            });
        }
    }

    async function handleAddressSearch(event) {
        event.preventDefault();

        const addressInput = document.getElementById("inputAddress");
        const inputAddress = addressInput.value.trim();
        
        if (!inputAddress || inputAddress.length < 3) {
            showNotification("Bitte geben Sie eine gültige Adresse ein", "warning");
            return;
        }

        // Validiere alle Felder
        if (!validateAllFields()) {
            showNotification("Bitte füllen Sie alle Felder korrekt aus", "warning");
            return;
        }

        try {
            showLoading(true);
            
            // Geocoding mit OpenRouteService
            const results = await performGeocoding(inputAddress);
            
            if (results && results.length > 0) {
                geocodingResults = results;
                displayAddressOptions(results);
            } else {
                showNotification("Keine Adressen gefunden. Bitte überprüfen Sie die Eingabe.", "warning");
            }
            
        } catch (error) {
            console.error("Geocoding error:", error);
            showNotification("Fehler bei der Adresssuche", "error");
        } finally {
            showLoading(false);
        }
    }

    async function performGeocoding(query) {
        const apiKey = '5b3ce3597851110001cf62486cf2bc15daf74038b2d9f06d44b8f3db';
        const params = new URLSearchParams({
            'api_key': apiKey,
            'text': query,
            'boundary.circle.lon': 10.974612,
            'boundary.circle.lat': 48.303808,
            'boundary.circle.radius': 5,
            'boundary.country': 'DE',
            'size': 10
        });

        const url = `https://api.openrouteservice.org/geocode/search?${params.toString()}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Geocoding-Service nicht verfügbar (${response.status})`);
        }

        const data = await response.json();
        return data.features || [];
    }

    function displayAddressOptions(features) {
        let content = '<div class="alert alert-info mb-3">Wählen Sie die korrekte Adresse aus:</div>';
        
        features.forEach((feature, index) => {
            const props = feature.properties;
            const confidence = Math.round((props.confidence || 0) * 100);
            const fullAddress = props.label || props.name;

            content += `
                <div class='address-option mb-3' data-index='${index}'>
                    <div class="card">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h6 class="card-title mb-1">${escapeHtml(fullAddress)}</h6>
                                <span class="badge bg-primary">${confidence}%</span>
                            </div>
                            <div class="d-grid">
                                <button class='btn btn-outline-primary adresseAnschauen' 
                                        data-index='${index}'
                                        type="button">
                                    📍 Adresse auswählen
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`;
        });

        const proofElement = document.getElementById("proof");
        if (proofElement) {
            proofElement.innerHTML = content;
            proofElement.classList.remove("invisible");
            
            // Event listeners für Adress-Buttons
            proofElement.querySelectorAll('.adresseAnschauen').forEach(button => {
                button.addEventListener('click', handleAddressSelection);
            });
        }
    }

    function handleAddressSelection(event) {
        const index = parseInt(event.target.dataset.index);
        
        if (isNaN(index) || !geocodingResults[index]) {
            showNotification("Fehler bei der Adressauswahl", "error");
            return;
        }

        selectedAddressIndex = index;
        const feature = geocodingResults[index];
        
        // Marker auf Karte setzen
        displayAddressOnMap(feature);
        
        // Bestätigungs-Button anzeigen
        showConfirmButton(event.target.closest('.address-option'));
    }

    function displayAddressOnMap(feature) {
        const coordinates = feature.geometry.coordinates;
        const lat = coordinates[1];
        const lng = coordinates[0];
        
        // Vorherigen Marker entfernen
        if (selectedMarker) {
            map.removeLayer(selectedMarker);
        }
        
        // Karte zentrieren
        map.setView([lat, lng], 18);
        
        // Neuen Marker hinzufügen
        selectedMarker = L.marker([lat, lng]).addTo(map);
        selectedMarker.bindPopup(`
            <div class="text-center">
                <h6>📍 Ausgewählte Adresse</h6>
                <p><strong>${escapeHtml(feature.properties.label)}</strong></p>
            </div>
        `).openPopup();
    }

    function showConfirmButton(parentElement) {
        // Entferne vorherige Bestätigungs-Buttons
        document.querySelectorAll('.confirm-address-btn').forEach(btn => btn.remove());
        
        const confirmButton = document.createElement('button');
        confirmButton.className = 'btn btn-success w-100 mt-2 confirm-address-btn';
        confirmButton.innerHTML = '✅ Adresse bestätigen und Anmeldung abschließen';
        confirmButton.type = 'button';
        
        confirmButton.addEventListener('click', handleFinalSubmission);
        
        const cardBody = parentElement.querySelector('.card-body');
        cardBody.appendChild(confirmButton);
    }

    async function handleFinalSubmission() {
        if (selectedAddressIndex === null) {
            showNotification("Bitte wählen Sie zuerst eine Adresse aus", "warning");
            return;
        }

        const formData = collectFormData();
        
        try {
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
                showNotification("Fehler beim Speichern: " + (result.message || "Unbekannter Fehler"), "error");
            }
            
        } catch (error) {
            console.error("Submission error:", error);
            showNotification("Netzwerkfehler beim Speichern der Anmeldung", "error");
        } finally {
            showLoading(false);
        }
    }

    function collectFormData() {
        const feature = geocodingResults[selectedAddressIndex];
        
        return {
            name: document.getElementById("name").value.trim(),
            lat: feature.geometry.coordinates[1],
            lng: feature.geometry.coordinates[0],
            strasse: feature.properties.label || feature.properties.name,
            money: parseFloat(document.getElementById("inputMoney").value),
            telefonnummer: document.getElementById("telefonnummer").value.trim(),
            cb_anzahl: parseInt(document.getElementById("cb_anzahl").value),
            address_confidence: feature.properties.confidence,
            submission_timestamp: new Date().toISOString()
        };
    }

    function showSuccessConfirmation(formData) {
        const confirmation = document.getElementById("confirmation");
        const confirmationDetails = document.getElementById("confirmationDetails");

        if (confirmation && confirmationDetails) {
            confirmationDetails.innerHTML = `
                <li><strong>👤 Name:</strong> ${escapeHtml(formData.name)}</li>
                <li><strong>📍 Adresse:</strong> ${escapeHtml(formData.strasse)}</li>
                <li><strong>📞 Telefon:</strong> ${escapeHtml(formData.telefonnummer)}</li>
                <li><strong>💰 Bezahlt:</strong> €${formData.money.toFixed(2)}</li>
                <li><strong>🎄 Anzahl Bäume:</strong> ${formData.cb_anzahl}</li>
                <li><strong>📅 Angemeldet:</strong> ${new Date().toLocaleDateString('de-DE')}</li>
            `;

            confirmation.classList.remove("invisible");
            confirmation.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function resetForm() {
        // Formular zurücksetzen
        document.getElementById("check").reset();
        document.getElementById("cb_anzahl").value = "1";
        
        // UI zurücksetzen
        hideAddressOptions();
        selectedAddressIndex = null;
        geocodingResults = [];
        
        if (selectedMarker) {
            map.removeLayer(selectedMarker);
            selectedMarker = null;
        }
    }

    function hideAddressOptions() {
        const proofElement = document.getElementById("proof");
        if (proofElement) {
            proofElement.innerHTML = '';
            proofElement.classList.add('invisible');
        }
    }

    function validateField(element) {
        const value = element.value.trim();
        let isValid = true;
        let message = '';

        switch (element.id) {
            case 'name':
                isValid = value.length >= 2;
                message = 'Name muss mindestens 2 Zeichen lang sein';
                break;
            case 'telefonnummer':
                isValid = /^[\d\s\-\+\(\)]{8,}$/.test(value);
                message = 'Gültige Telefonnummer erforderlich';
                break;
            case 'inputMoney':
                isValid = !isNaN(parseFloat(value)) && parseFloat(value) >= 0;
                message = 'Gültiger Geldbetrag erforderlich';
                break;
            case 'cb_anzahl':
                const num = parseInt(value);
                isValid = !isNaN(num) && num >= 1 && num <= 50;
                message = 'Anzahl muss zwischen 1 und 50 liegen';
                break;
            case 'inputAddress':
                isValid = value.length >= 3;
                message = 'Adresse muss mindestens 3 Zeichen lang sein';
                break;
        }

        if (!isValid) {
            showFieldError(element, message);
        } else {
            clearFieldError(element);
        }

        return isValid;
    }

    function validateAllFields() {
        const fields = ['name', 'telefonnummer', 'inputMoney', 'cb_anzahl', 'inputAddress'];
        let allValid = true;

        fields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element && !validateField(element)) {
                allValid = false;
            }
        });

        return allValid;
    }

    function showFieldError(element, message) {
        element.classList.add('is-invalid');
        
        let feedback = element.parentNode.querySelector('.invalid-feedback');
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.className = 'invalid-feedback';
            element.parentNode.appendChild(feedback);
        }
        feedback.textContent = message;
    }

    function clearFieldError(element) {
        element.classList.remove('is-invalid');
        const feedback = element.parentNode.querySelector('.invalid-feedback');
        if (feedback) {
            feedback.remove();
        }
    }

    // Utility functions
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    function showLoading(show) {
        const button = document.getElementById('check_button');
        const spinner = button.querySelector('.spinner-border');
        
        if (show) {
            button.disabled = true;
            spinner.classList.remove('d-none');
        } else {
            button.disabled = false;
            spinner.classList.add('d-none');
        }
    }

    function showNotification(message, type = 'info', duration = 5000) {
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
            <div>${escapeHtml(message)}</div>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
    }

    console.log('CBS Anmeldung - Vereinfachte Version erfolgreich geladen');
});