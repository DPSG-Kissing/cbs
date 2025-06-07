/**
 * CBS Anmeldung - Integration mit modernem Leaflet Map Manager
 * Erweiterte Version mit verbesserter UX und Geocoding
 */

document.addEventListener("DOMContentLoaded", function() {
    let mapManager;
    let geocodingResults = [];
    let selectedAddressIndex = null;
    let selectedMarker = null;
    let isSubmitting = false;

    // Geocoding Configuration
    const geocodingConfig = {
        apiKey: '5b3ce3597851110001cf62486cf2bc15daf74038b2d9f06d44b8f3db',
        baseUrl: 'https://api.openrouteservice.org/geocode/search',
        boundary: {
            circle: {
                lat: 48.303808,
                lon: 10.974612,
                radius: 5 // 5km Radius um Kissing
            }
        },
        filters: {
            country: 'DE',
            sources: 'openstreetmap',
            layers: 'address,street',
            size: 15
        }
    };

    // Initialisierung
    initializeApplication();

    async function initializeApplication() {
        try {
            // Moderne Leaflet Map Manager initialisieren
            mapManager = new CBSMapManager({
                enableGeolocation: false, // Für Anmeldung nicht nötig
                enableClustering: false,  // Nur ein Marker
                enableRouting: false,
                tileProvider: 'osm',
                defaultZoom: 13,
                minZoom: 10,
                maxZoom: 19
            });

            // Karte initialisieren
            await mapManager.init('mapid');

            // Event Listeners einrichten
            setupEventListeners();
            setupFormValidation();
            
            console.log('CBS Anmeldung erfolgreich initialisiert');
            
        } catch (error) {
            console.error('Fehler bei der Initialisierung:', error);
            showNotification('Fehler beim Laden der Karte. Bitte laden Sie die Seite neu.', 'error');
        }
    }

    function setupEventListeners() {
        // Hauptformular für Adresssuche
        const checkForm = document.getElementById("check");
        if (checkForm) {
            checkForm.addEventListener("submit", handleAddressSearch);
        }

        // Adressenauswahl
        const proofElement = document.getElementById("proof");
        if (proofElement) {
            proofElement.addEventListener("click", handleProofClick);
        }

        // Auto-complete für Adresseingabe
        const addressInput = document.getElementById("inputAddress");
        if (addressInput) {
            let autocompleteTimeout;
            addressInput.addEventListener("input", (event) => {
                clearTimeout(autocompleteTimeout);
                autocompleteTimeout = setTimeout(() => {
                    handleAutocomplete(event.target.value);
                }, 500);
            });
        }

        // Enter-Taste für Adresseingabe
        if (addressInput) {
            addressInput.addEventListener("keydown", (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    checkForm.dispatchEvent(new Event('submit'));
                }
            });
        }
    }

    function setupFormValidation() {
        // Real-time Validierung für alle Felder
        const fields = {
            name: {
                element: document.getElementById("name"),
                validate: (value) => value.trim().length >= 2,
                message: "Name muss mindestens 2 Zeichen lang sein"
            },
            telefonnummer: {
                element: document.getElementById("telefonnummer"),
                validate: (value) => /^[\d\s\-\+\(\)]{8,}$/.test(value.trim()),
                message: "Gültige Telefonnummer erforderlich (mindestens 8 Zeichen)"
            },
            inputMoney: {
                element: document.getElementById("inputMoney"),
                validate: (value) => !isNaN(parseFloat(value)) && parseFloat(value) >= 0,
                message: "Gültiger Geldbetrag erforderlich"
            },
            cb_anzahl: {
                element: document.getElementById("cb_anzahl"),
                validate: (value) => {
                    const num = parseInt(value);
                    return !isNaN(num) && num >= 1 && num <= 10;
                },
                message: "Anzahl muss zwischen 1 und 10 liegen"
            }
        };

        Object.entries(fields).forEach(([key, config]) => {
            if (config.element) {
                config.element.addEventListener("blur", () => {
                    validateField(config.element, config.validate, config.message);
                });

                config.element.addEventListener("input", () => {
                    clearFieldError(config.element);
                });
            }
        });

        // Spezielle Eingabe-Filter
        setupInputFilters();
    }

    function setupInputFilters() {
        // Telefonnummer: Nur erlaubte Zeichen
        const phoneInput = document.getElementById("telefonnummer");
        if (phoneInput) {
            phoneInput.addEventListener("input", function() {
                this.value = this.value.replace(/[^\d\s\-\+\(\)]/g, '');
            });
        }

        // Name: Nur Buchstaben, Leerzeichen, Bindestrich
        const nameInput = document.getElementById("name");
        if (nameInput) {
            nameInput.addEventListener("input", function() {
                this.value = this.value.replace(/[^\p{L}\s\-\.]/gu, '');
            });
        }

        // Geld: Nur Zahlen und Dezimalpunkt
        const moneyInput = document.getElementById("inputMoney");
        if (moneyInput) {
            moneyInput.addEventListener("input", function() {
                let value = this.value.replace(/[^\d.,]/g, '');
                value = value.replace(',', '.');
                
                // Nur ein Dezimalpunkt erlauben
                const parts = value.split('.');
                if (parts.length > 2) {
                    value = parts[0] + '.' + parts.slice(1).join('');
                }
                
                // Maximal 2 Dezimalstellen
                if (parts[1] && parts[1].length > 2) {
                    value = parts[0] + '.' + parts[1].substring(0, 2);
                }
                
                this.value = value;
            });
        }
    }

    function validateField(element, validator, message) {
        const isValid = validator(element.value);
        
        if (!isValid) {
            showFieldError(element, message);
            return false;
        } else {
            clearFieldError(element);
            return true;
        }
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

    async function handleAddressSearch(event) {
        event.preventDefault();

        if (isSubmitting) return;

        const addressInput = document.getElementById("inputAddress");
        const inputAddress = addressInput.value.trim();
        
        if (!inputAddress || inputAddress.length < 3) {
            showNotification("Bitte geben Sie eine gültige Adresse ein (mindestens 3 Zeichen)", "warning");
            addressInput.focus();
            return;
        }

        try {
            showLoading(true);
            const results = await performGeocoding(inputAddress);
            
            if (results && results.length > 0) {
                geocodingResults = results;
                displayAddressOptions(results);
                
                // Auto-scroll zu den Optionen
                document.getElementById("proof").scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'nearest' 
                });
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

    async function handleAutocomplete(query) {
        if (!query || query.length < 3) return;

        try {
            const results = await performGeocoding(query, 5); // Weniger Ergebnisse für Autocomplete
            
            // Einfache Autocomplete-Dropdown erstellen
            showAutocompleteDropdown(results);
            
        } catch (error) {
            console.warn("Autocomplete error:", error);
        }
    }

    async function performGeocoding(query, maxResults = null) {
        const params = new URLSearchParams({
            'api_key': geocodingConfig.apiKey,
            'text': query,
            'boundary.circle.lon': geocodingConfig.boundary.circle.lon,
            'boundary.circle.lat': geocodingConfig.boundary.circle.lat,
            'boundary.circle.radius': geocodingConfig.boundary.circle.radius,
            'boundary.country': geocodingConfig.filters.country,
            'sources': geocodingConfig.filters.sources,
            'layers': geocodingConfig.filters.layers,
            'size': maxResults || geocodingConfig.filters.size
        });

        const url = `${geocodingConfig.baseUrl}?${params.toString()}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Geocoding-Service nicht verfügbar (${response.status})`);
        }

        const data = await response.json();
        
        if (!data.features) {
            throw new Error('Ungültige Antwort vom Geocoding-Service');
        }

        return data.features.filter(feature => {
            // Zusätzliche Filterung für bessere Ergebnisse
            const props = feature.properties;
            return props.confidence > 0.5 && // Mindest-Konfidenz
                   props.label && 
                   feature.geometry && 
                   feature.geometry.coordinates;
        });
    }

    function displayAddressOptions(features) {
        let content = '<div class="alert alert-info mb-3">Wählen Sie die korrekte Adresse aus:</div>';
        
        features.forEach((feature, index) => {
            const props = feature.properties;
            const confidence = props.confidence || 0;
            const confidencePercent = Math.round(confidence * 100);
            
            let confidenceClass = 'secondary';
            if (confidence > 0.8) confidenceClass = 'success';
            else if (confidence > 0.6) confidenceClass = 'warning';
            
            // Adressteile extrahieren
            const addressParts = {
                name: props.name || '',
                housenumber: props.housenumber || '',
                street: props.street || '',
                locality: props.locality || '',
                region: props.region || ''
            };

            const fullAddress = props.label || 
                               `${addressParts.street} ${addressParts.housenumber}, ${addressParts.locality}`.trim();

            content += `
                <div class='address-option mb-3' data-index='${index}'>
                    <div class="card h-100">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h6 class="card-title mb-1">${escapeHtml(fullAddress)}</h6>
                                <span class="badge bg-${confidenceClass}">${confidencePercent}%</span>
                            </div>
                            
                            <div class="address-details mb-2">
                                ${addressParts.locality ? `<small class="text-muted d-block">📍 ${escapeHtml(addressParts.locality)}</small>` : ''}
                                ${addressParts.region ? `<small class="text-muted d-block">🗺️ ${escapeHtml(addressParts.region)}</small>` : ''}
                            </div>
                            
                            <div class="d-grid">
                                <button class='btn btn-outline-primary adresseAnschauen' 
                                        data-index='${index}'
                                        type="button">
                                    📍 Adresse auf Karte anzeigen
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
        }
    }

    function showAutocompleteDropdown(features) {
        const addressInput = document.getElementById("inputAddress");
        if (!addressInput || features.length === 0) return;

        // Entferne existierende Dropdown
        const existingDropdown = document.getElementById('address-autocomplete');
        if (existingDropdown) {
            existingDropdown.remove();
        }

        // Erstelle neue Dropdown
        const dropdown = document.createElement('div');
        dropdown.id = 'address-autocomplete';
        dropdown.className = 'list-group position-absolute w-100';
        dropdown.style.zIndex = '1000';
        dropdown.style.maxHeight = '200px';
        dropdown.style.overflowY = 'auto';

        features.slice(0, 5).forEach(feature => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'list-group-item list-group-item-action text-start';
            item.innerHTML = `
                <div>${escapeHtml(feature.properties.label || feature.properties.name)}</div>
                <small class="text-muted">${Math.round((feature.properties.confidence || 0) * 100)}% Übereinstimmung</small>
            `;
            
            item.addEventListener('click', () => {
                addressInput.value = feature.properties.label || feature.properties.name;
                dropdown.remove();
                
                // Trigger address search
                document.getElementById("check").dispatchEvent(new Event('submit'));
            });
            
            dropdown.appendChild(item);
        });

        // Positioniere Dropdown
        const inputRect = addressInput.getBoundingClientRect();
        const container = addressInput.parentNode;
        container.style.position = 'relative';
        container.appendChild(dropdown);

        // Schließe Dropdown bei Klick außerhalb
        const closeDropdown = (event) => {
            if (!dropdown.contains(event.target) && event.target !== addressInput) {
                dropdown.remove();
                document.removeEventListener('click', closeDropdown);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeDropdown);
        }, 100);
    }

    function hideAddressOptions() {
        const proofElement = document.getElementById("proof");
        if (proofElement) {
            proofElement.innerHTML = '';
            proofElement.classList.add('invisible');
        }
        
        hideConfirmation();
        clearMapSelection();
    }

    function handleProofClick(event) {
        if (event.target.classList.contains("adresseAnschauen")) {
            handleAddressSelection(event);
        } else if (event.target.id === 'confirm_button') {
            handleConfirmation(event);
        }
    }

    function handleAddressSelection(event) {
        const index = parseInt(event.target.dataset.index);
        
        if (isNaN(index) || !geocodingResults[index]) {
            showNotification("Fehler bei der Adressauswahl", "error");
            return;
        }

        // Reset previous selection
        resetPreviousSelection();

        // Mark new selection
        const selectedOption = event.target.closest('.address-option');
        selectedOption.classList.add('selected');
        event.target.classList.add("clicked");

        selectedAddressIndex = index;
        
        try {
            displayAddressOnMap(index);
            showConfirmButton(selectedOption);
        } catch (error) {
            console.error("Map display error:", error);
            showNotification("Fehler bei der Kartenanzeige", "error");
        }
    }

    function resetPreviousSelection() {
        // Remove previous selection styling
        document.querySelectorAll('.address-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        document.querySelectorAll('.adresseAnschauen').forEach(button => {
            button.classList.remove('clicked');
        });

        // Remove previous confirm button
        const existingConfirmButton = document.getElementById('confirm_button');
        if (existingConfirmButton) {
            existingConfirmButton.remove();
        }

        clearMapSelection();
    }

    function displayAddressOnMap(index) {
        const feature = geocodingResults[index];
        const coordinates = feature.geometry.coordinates;
        const props = feature.properties;

        // Clear previous marker
        clearMapSelection();

        const lat = coordinates[1];
        const lng = coordinates[0];
        
        // Validate coordinates
        if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
            throw new Error('Ungültige Koordinaten');
        }

        // Center map on location
        mapManager.map.setView([lat, lng], 18);
        
        // Add marker with custom popup
        const markerData = {
            name: props.label || props.name,
            confidence: Math.round((props.confidence || 0) * 100),
            type: 'address_selection'
        };

        selectedMarker = mapManager.addMarker(lat, lng, markerData, {
            icon: mapManager.createCustomIcon('#0d6efd', 'address_selection')
        });

        // Custom popup content for address selection
        const popupContent = `
            <div class="text-center">
                <h6 class="mb-2">📍 Ausgewählte Adresse</h6>
                <p class="mb-2"><strong>${escapeHtml(props.label || props.name)}</strong></p>
                <small class="text-muted d-block mb-2">
                    Koordinaten: ${lat.toFixed(6)}, ${lng.toFixed(6)}
                </small>
                <small class="text-muted">
                    Genauigkeit: ${Math.round((props.confidence || 0) * 100)}%
                </small>
            </div>
        `;

        selectedMarker.bindPopup(popupContent).openPopup();
    }

    function clearMapSelection() {
        if (selectedMarker) {
            mapManager.map.removeLayer(selectedMarker);
            selectedMarker = null;
        }
    }

    function showConfirmButton(parentElement) {
        const confirmButton = document.createElement('button');
        confirmButton.className = 'btn btn-success w-100 mt-2';
        confirmButton.innerHTML = '✅ Adresse bestätigen und fortfahren';
        confirmButton.id = 'confirm_button';
        confirmButton.type = 'button';
        
        const cardBody = parentElement.querySelector('.card-body');
        cardBody.appendChild(confirmButton);

        // Smooth scroll to button
        setTimeout(() => {
            confirmButton.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }, 100);
    }

    async function handleConfirmation(event) {
        if (isSubmitting) return;

        // Validate all form data
        const validationResult = validateAllFormData();
        if (!validationResult.isValid) {
            showValidationErrors(validationResult.errors);
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

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                showSuccessConfirmation(formData);
                resetForm();
                
                // Track successful submission
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'form_submit', {
                        event_category: 'CBS',
                        event_label: 'Anmeldung',
                        value: formData.cb_anzahl
                    });
                }
            } else {
                handleSubmissionError(result);
            }
            
        } catch (error) {
            console.error("Submission error:", error);
            showNotification("Netzwerkfehler beim Speichern der Anmeldung. Bitte versuchen Sie es erneut.", "error");
        } finally {
            isSubmitting = false;
            showLoading(false);
        }
    }

    function validateAllFormData() {
        const errors = [];
        
        // Name validation
        const name = document.getElementById("name").value.trim();
        if (!name || name.length < 2) {
            errors.push({ field: 'name', message: 'Name muss mindestens 2 Zeichen lang sein' });
        }

        // Phone validation
        const telefon = document.getElementById("telefonnummer").value.trim();
        if (!telefon || !/^[\d\s\-\+\(\)]{8,}$/.test(telefon)) {
            errors.push({ field: 'telefonnummer', message: 'Gültige Telefonnummer erforderlich (mindestens 8 Zeichen)' });
        }

        // Money validation
        const money = document.getElementById("inputMoney").value;
        const moneyValue = parseFloat(money);
        if (!money || isNaN(moneyValue) || moneyValue < 0) {
            errors.push({ field: 'inputMoney', message: 'Gültiger Geldbetrag erforderlich (≥ 0)' });
        }
        if (moneyValue > 1000) {
            errors.push({ field: 'inputMoney', message: 'Geldbetrag scheint unrealistisch hoch zu sein' });
        }

        // Tree count validation
        const cbAnzahl = document.getElementById("cb_anzahl").value;
        const cbAnzahlValue = parseInt(cbAnzahl);
        if (!cbAnzahl || isNaN(cbAnzahlValue) || cbAnzahlValue < 1 || cbAnzahlValue > 10) {
            errors.push({ field: 'cb_anzahl', message: 'Anzahl Bäume muss zwischen 1 und 10 liegen' });
        }

        // Address validation
        if (selectedAddressIndex === null || !geocodingResults[selectedAddressIndex]) {
            errors.push({ field: 'address', message: 'Bitte wählen Sie eine gültige Adresse aus' });
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    function showValidationErrors(errors) {
        // Clear previous errors
        document.querySelectorAll('.is-invalid').forEach(el => {
            el.classList.remove('is-invalid');
        });
        document.querySelectorAll('.invalid-feedback').forEach(el => {
            el.remove();
        });

        // Show new errors
        errors.forEach(error => {
            if (error.field !== 'address') {
                const element = document.getElementById(error.field);
                if (element) {
                    showFieldError(element, error.message);
                }
            }
        });

        // Show general error message
        const errorMessages = errors.map(e => e.message).join('\n');
        showNotification("Bitte korrigieren Sie folgende Fehler:\n\n" + errorMessages, "warning");

        // Focus first error field
        const firstErrorField = errors.find(e => e.field !== 'address');
        if (firstErrorField) {
            const element = document.getElementById(firstErrorField.field);
            if (element) {
                element.focus();
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    function handleSubmissionError(result) {
        if (result.errors && typeof result.errors === 'object') {
            // Server validation errors
            Object.entries(result.errors).forEach(([field, message]) => {
                const element = document.getElementById(field);
                if (element) {
                    showFieldError(element, message);
                }
            });
            
            const errorMessages = Object.values(result.errors).join('\n');
            showNotification("Validierungsfehler vom Server:\n\n" + errorMessages, "error");
        } else {
            showNotification(result.message || "Fehler beim Speichern der Anmeldung", "error");
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
            
            // Additional metadata
            address_confidence: feature.properties.confidence,
            submission_timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent.substring(0, 200) // Truncated for privacy
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
            
            // Scroll to confirmation
            confirmation.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
            
            // Auto-hide nach 15 Sekunden
            setTimeout(() => {
                if (!confirmation.classList.contains('invisible')) {
                    confirmation.classList.add("invisible");
                }
            }, 15000);

            // Success sound (if browser supports it)
            playSuccessSound();
        }
    }

    function playSuccessSound() {
        try {
            // Simple success beep using Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            // Ignore audio errors - not critical
            console.debug('Success sound not available:', error);
        }
    }

    function resetForm() {
        // Clear form fields
        const fieldsToReset = ['name', 'telefonnummer', 'inputMoney', 'inputAddress'];
        fieldsToReset.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.value = '';
                clearFieldError(element);
            }
        });

        // Reset select field
        const cbAnzahlSelect = document.getElementById("cb_anzahl");
        if (cbAnzahlSelect) {
            cbAnzahlSelect.selectedIndex = 0;
        }

        // Clear UI state
        hideAddressOptions();
        clearMapSelection();
        
        // Reset variables
        selectedAddressIndex = null;
        geocodingResults = [];

        // Focus first field
        const nameInput = document.getElementById("name");
        if (nameInput) {
            nameInput.focus();
        }

        // Clear any autocomplete dropdowns
        const autocompleteDropdown = document.getElementById('address-autocomplete');
        if (autocompleteDropdown) {
            autocompleteDropdown.remove();
        }
    }

    function hideConfirmation() {
        const confirmation = document.getElementById("confirmation");
        if (confirmation) {
            confirmation.classList.add("invisible");
        }
    }

    // Utility functions
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
                <div class="d-flex flex-column align-items-center bg-white p-4 rounded shadow">
                    <div class="spinner-border text-primary mb-2" role="status">
                        <span class="visually-hidden">Laden...</span>
                    </div>
                    <small class="text-muted">Adresse wird verarbeitet...</small>
                </div>
            `;
            document.body.appendChild(loader);
        } else if (!show && loader) {
            loader.remove();
        }
    }

    function showNotification(message, type = 'info', duration = 7000) {
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
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Schließen"></button>
        `;

        document.body.appendChild(notification);

        // Auto-remove
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 150);
            }
        }, duration);

        // Accessibility: Announce important messages
        if (type === 'error' || type === 'warning') {
            announceToScreenReader(message);
        }
    }

    function announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    // Keyboard navigation support
    document.addEventListener('keydown', (event) => {
        // Escape key: Cancel current operation
        if (event.key === 'Escape') {
            // Close autocomplete dropdown
            const autocompleteDropdown = document.getElementById('address-autocomplete');
            if (autocompleteDropdown) {
                autocompleteDropdown.remove();
                return;
            }

            // Clear address selection
            if (selectedAddressIndex !== null) {
                resetPreviousSelection();
                hideAddressOptions();
                return;
            }

            // Focus address input
            const addressInput = document.getElementById('inputAddress');
            if (addressInput) {
                addressInput.focus();
            }
        }

        // Ctrl/Cmd + Enter: Quick submit if form is valid
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            if (selectedAddressIndex !== null) {
                const confirmButton = document.getElementById('confirm_button');
                if (confirmButton) {
                    confirmButton.click();
                }
            }
        }
    });

    // Auto-save form data to localStorage (privacy-conscious)
    function autoSaveFormData() {
        try {
            const formData = {
                name: document.getElementById("name").value,
                telefonnummer: document.getElementById("telefonnummer").value,
                cb_anzahl: document.getElementById("cb_anzahl").value,
                inputMoney: document.getElementById("inputMoney").value,
                timestamp: Date.now()
            };

            // Only save if there's actual content and it's recent
            if (formData.name || formData.telefonnummer) {
                localStorage.setItem('cbsFormDraft', JSON.stringify(formData));
            }
        } catch (error) {
            console.debug('Auto-save failed:', error);
        }
    }

    function loadFormDraft() {
        try {
            const draftStr = localStorage.getItem('cbsFormDraft');
            if (!draftStr) return;

            const draft = JSON.parse(draftStr);
            
            // Only load if draft is less than 1 hour old
            if (Date.now() - draft.timestamp > 60 * 60 * 1000) {
                localStorage.removeItem('cbsFormDraft');
                return;
            }

            // Ask user if they want to restore the draft
            if (confirm('Es wurde ein nicht gesendetes Formular gefunden. Möchten Sie es wiederherstellen?')) {
                if (draft.name) document.getElementById("name").value = draft.name;
                if (draft.telefonnummer) document.getElementById("telefonnummer").value = draft.telefonnummer;
                if (draft.cb_anzahl) document.getElementById("cb_anzahl").value = draft.cb_anzahl;
                if (draft.inputMoney) document.getElementById("inputMoney").value = draft.inputMoney;
                
                showNotification('Formular-Entwurf wiederhergestellt', 'info');
            }
            
            // Clear the draft
            localStorage.removeItem('cbsFormDraft');
            
        } catch (error) {
            console.debug('Draft loading failed:', error);
        }
    }

    // Setup auto-save listeners
    ['name', 'telefonnummer', 'cb_anzahl', 'inputMoney'].forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.addEventListener('input', debounce(autoSaveFormData, 1000));
        }
    });

    // Load draft on page load
    loadFormDraft();

    // Clear draft on successful submission
    function clearFormDraft() {
        try {
            localStorage.removeItem('cbsFormDraft');
        } catch (error) {
            console.debug('Draft clearing failed:', error);
        }
    }

    // Debounce utility function
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

    // Performance monitoring
    function logPerformanceMetrics() {
        try {
            const navigation = performance.getEntriesByType('navigation')[0];
            const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
            
            console.debug('CBS Anmeldung Performance:', {
                pageLoadTime: Math.round(loadTime),
                domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart),
                mapInitialized: performance.now()
            });
        } catch (error) {
            console.debug('Performance monitoring not available:', error);
        }
    }

    // Log performance metrics after initialization
    setTimeout(logPerformanceMetrics, 1000);

    // Error boundary for uncaught errors
    window.addEventListener('error', (event) => {
        console.error('CBS Anmeldung Error:', event.error);
        
        // Don't show technical errors to users, but log them
        if (event.error && event.error.message) {
            // Only show user-friendly error for critical failures
            if (event.error.message.includes('mapManager') || 
                event.error.message.includes('geocoding')) {
                showNotification(
                    'Ein technischer Fehler ist aufgetreten. Bitte laden Sie die Seite neu.',
                    'error'
                );
            }
        }
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (mapManager) {
            mapManager.destroy();
        }
    });

    // Accessibility improvements
    function enhanceAccessibility() {
        // Add ARIA labels where missing
        const addressInput = document.getElementById('inputAddress');
        if (addressInput && !addressInput.getAttribute('aria-label')) {
            addressInput.setAttribute('aria-label', 'Adresse für Christbaum-Abholung eingeben');
        }

        // Add form field descriptions
        const fields = [
            { id: 'name', description: 'Vor- und Nachname für die Anmeldung' },
            { id: 'telefonnummer', description: 'Telefonnummer für Rückfragen' },
            { id: 'inputMoney', description: 'Bezahlter Betrag in Euro' },
            { id: 'cb_anzahl', description: 'Anzahl der abzuholenden Christbäume' }
        ];

        fields.forEach(({ id, description }) => {
            const element = document.getElementById(id);
            if (element && !element.getAttribute('aria-describedby')) {
                const descId = `${id}-description`;
                element.setAttribute('aria-describedby', descId);
                
                // Add hidden description
                const descElement = document.createElement('span');
                descElement.id = descId;
                descElement.className = 'sr-only';
                descElement.textContent = description;
                element.parentNode.appendChild(descElement);
            }
        });
    }

    // Apply accessibility enhancements
    enhanceAccessibility();

    console.log('CBS Anmeldung - Moderne Version erfolgreich geladen');
});

/**
 * CSS Additions for enhanced styling (add to your CSS file):
 * 
 * .address-option.selected {
 *     border: 2px solid #0d6efd;
 *     background-color: #e7f3ff;
 * }
 * 
 * .address-option .card {
 *     transition: all 0.2s ease;
 * }
 * 
 * .address-option:hover .card {
 *     transform: translateY(-2px);
 *     box-shadow: 0 4px 8px rgba(0,0,0,0.1);
 * }
 * 
 * .adresseAnschauen.clicked {
 *     background-color: #0d6efd;
 *     color: white;
 *     border-color: #0d6efd;
 * }
 * 
 * #address-autocomplete {
 *     border: 1px solid #dee2e6;
 *     border-top: none;
 *     border-radius: 0 0 0.375rem 0.375rem;
 *     box-shadow: 0 4px 6px rgba(0,0,0,0.1);
 * }
 * 
 * #address-autocomplete .list-group-item {
 *     border-left: none;
 *     border-right: none;
 *     border-radius: 0;
 * }
 * 
 * #address-autocomplete .list-group-item:hover {
 *     background-color: #f8f9fa;
 * }
 * 
 * @media (max-width: 768px) {
 *     .address-option {
 *         margin-bottom: 1rem;
 *     }
 *     
 *     #address-autocomplete {
 *         font-size: 0.9rem;
 *     }
 * }
 */Tp66hVFApGn+DyvmMZBjyX3O/GTR8BKnfH8N2QQAoUXr/**
 * CBS Anmeldung - Integration mit modernem Leaflet Map Manager
 * Erweiterte Version mit verbesserter UX und Geocoding
 */

document.addEventListener("DOMContent
