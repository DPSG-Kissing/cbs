/**
 * CBS Anmeldung - Korrigierte JavaScript-Version
 * Für die Christbaum-Sammlung DPSG Kissing
 * Version: 2.1.1
 */

document.addEventListener("DOMContentLoaded", function() {
    console.log("CBS Anmeldung wird initialisiert...");
    
    // Global variables
    let selectedAddressIndex = null;
    let geocodingResults = [];
    let selectedMarker = null;
    let map = null;
    let isSubmitting = false;

    // Initialize application
    initializeApp();

    /**
     * Initialize the complete application
     */
    function initializeApp() {
        try {
            // Initialize map
            initializeMap();
            
            // Setup event listeners
            setupEventListeners();
            
            // Setup form validation
            setupFormValidation();
            
            console.log("CBS Anmeldung erfolgreich initialisiert");
        } catch (error) {
            console.error("Fehler bei der Initialisierung:", error);
            showNotification("Fehler beim Laden der Anwendung", "error");
        }
    }

    /**
     * Initialize the map component
     */
    function initializeMap() {
        try {
            // Simple Leaflet map initialization
            map = L.map('mapid').setView([48.303808, 10.974612], 15);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
                maxZoom: 19
            }).addTo(map);

            // Hide loading indicator
            const mapLoading = document.getElementById('map-loading');
            if (mapLoading) {
                mapLoading.style.display = 'none';
            }
            
            console.log('Karte erfolgreich initialisiert');
        } catch (error) {
            console.error('Fehler bei der Karten-Initialisierung:', error);
            const mapLoading = document.getElementById('map-loading');
            if (mapLoading) {
                mapLoading.innerHTML = '<p class="text-danger">Karte konnte nicht geladen werden</p>';
            }
        }
    }

    /**
     * Setup all event listeners
     */
    function setupEventListeners() {
        // Main registration form
        const registrationForm = document.getElementById("registrationForm") || document.getElementById("check");
        if (registrationForm) {
            registrationForm.addEventListener("submit", handleFormSubmit);
        }

        // Input field formatting
        setupInputFormatting();
        
        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyboardShortcuts);
    }

    /**
     * Setup input formatting for better UX
     */
    function setupInputFormatting() {
        // Phone number formatting
        const phoneInput = document.getElementById("telefonnummer");
        if (phoneInput) {
            phoneInput.addEventListener("input", function(e) {
                // Only allow numbers, spaces, and common phone characters
                let value = e.target.value.replace(/[^\d\s\-\+\(\)]/g, '');
                
                // Auto-format German phone numbers
                if (value.startsWith('0')) {
                    value = value.replace(/^0/, '+49 ');
                }
                
                e.target.value = value;
            });
        }

        // Money input formatting
        const moneyInput = document.getElementById("inputMoney");
        if (moneyInput) {
            moneyInput.addEventListener("input", function(e) {
                let value = e.target.value.replace(/[^\d.,]/g, '');
                value = value.replace(',', '.');
                e.target.value = value;
            });
            
            moneyInput.addEventListener("blur", function(e) {
                const value = parseFloat(e.target.value);
                if (!isNaN(value)) {
                    e.target.value = value.toFixed(2);
                }
            });
        }

        // Tree count input
        const treeCountInput = document.getElementById("cb_anzahl");
        if (treeCountInput) {
            treeCountInput.addEventListener("input", function(e) {
                let value = parseInt(e.target.value.replace(/[^\d]/g, ''));
                if (value > 50) value = 50;
                if (value < 1) value = 1;
                e.target.value = value || 1;
            });
        }
    }

    /**
     * Setup form validation
     */
    function setupFormValidation() {
        const fields = ['name', 'telefonnummer', 'inputMoney', 'cb_anzahl', 'inputAddress'];
        
        fields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.addEventListener('blur', () => validateField(element));
                element.addEventListener('input', () => clearFieldError(element));
            }
        });
    }

    /**
     * Handle form submission
     */
    async function handleFormSubmit(event) {
        event.preventDefault();
        
        if (isSubmitting) {
            return;
        }

        if (!validateForm()) {
            showNotification("Bitte füllen Sie alle Felder korrekt aus", "warning");
            return;
        }

        const addressInput = document.getElementById("inputAddress");
        const address = addressInput.value.trim();
        
        if (address.length < 3) {
            showNotification("Bitte geben Sie eine gültige Adresse ein", "warning");
            return;
        }

        try {
            isSubmitting = true;
            setSubmitButtonLoading(true);
            
            const results = await performGeocoding(address);
            
            if (results && results.length > 0) {
                geocodingResults = results;
                displayAddressOptions(results);
            } else {
                showNotification("Keine Adressen gefunden. Bitte überprüfen Sie die Eingabe.", "warning");
            }
            
        } catch (error) {
            console.error("Geocoding error:", error);
            showNotification("Fehler bei der Adresssuche: " + error.message, "error");
        } finally {
            isSubmitting = false;
            setSubmitButtonLoading(false);
        }
    }

    /**
     * Perform geocoding using OpenRouteService
     */
    async function performGeocoding(query) {
        const apiKey = '5b3ce3597851110001cf62486cf2bc15daf74038b2d9f06d44b8f3db';
        const params = new URLSearchParams({
            'api_key': apiKey,
            'text': query,
            'boundary.circle.lon': 10.974612,
            'boundary.circle.lat': 48.303808,
            'boundary.circle.radius': 10,
            'boundary.country': 'DE',
            'size': 10,
            'layers': 'address,venue'
        });

        const url = `https://api.openrouteservice.org/geocode/search?${params.toString()}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Geocoding-Service nicht verfügbar (HTTP ${response.status})`);
        }

        const data = await response.json();
        return data.features || [];
    }

    /**
     * Display address selection options
     */
    function displayAddressOptions(features) {
        const resultsContainer = document.getElementById("addressResults") || document.getElementById("proof");
        
        if (!resultsContainer) {
            console.error("Address results container not found");
            return;
        }

        let content = '<div class="alert alert-info mb-3">';
        content += '<i class="bi bi-info-circle me-2"></i>';
        content += 'Wählen Sie die korrekte Adresse aus:';
        content += '</div>';
        
        features.forEach((feature, index) => {
            const props = feature.properties;
            const confidence = Math.round((props.confidence || 0) * 100);
            const fullAddress = props.label || props.name || 'Unbekannte Adresse';
            const locality = props.locality || props.region || '';

            content += `
                <div class='address-option mb-3' data-index='${index}'>
                    <div class="card">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                    <h6 class="card-title mb-1">${escapeHtml(fullAddress)}</h6>
                                    ${locality ? `<small class="text-muted">${escapeHtml(locality)}</small>` : ''}
                                </div>
                                <span class="badge bg-primary">${confidence}%</span>
                            </div>
                            <div class="d-grid">
                                <button class='btn btn-outline-primary select-address-btn' 
                                        data-index='${index}'
                                        type="button">
                                    <i class="bi bi-geo-alt me-2"></i>
                                    Adresse auswählen
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`;
        });

        resultsContainer.innerHTML = content;
        resultsContainer.classList.remove("d-none", "invisible");
        resultsContainer.classList.add("show");
        
        // Setup event listeners for address selection
        resultsContainer.querySelectorAll('.select-address-btn').forEach(button => {
            button.addEventListener('click', handleAddressSelection);
        });
        
        // Scroll to results
        resultsContainer.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
        });
    }

    /**
     * Handle address selection
     */
    function handleAddressSelection(event) {
        const index = parseInt(event.target.dataset.index);
        
        if (isNaN(index) || !geocodingResults[index]) {
            showNotification("Fehler bei der Adressauswahl", "error");
            return;
        }

        selectedAddressIndex = index;
        const feature = geocodingResults[index];
        
        // Display address on map
        displayAddressOnMap(feature);
        
        // Show confirmation button
        showConfirmButton(event.target.closest('.address-option'));
        
        // Update button states
        document.querySelectorAll('.select-address-btn').forEach(btn => {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-outline-primary');
            btn.innerHTML = '<i class="bi bi-geo-alt me-2"></i>Adresse auswählen';
        });
        
        event.target.classList.remove('btn-outline-primary');
        event.target.classList.add('btn-primary');
        event.target.innerHTML = '<i class="bi bi-check me-2"></i>Ausgewählt';
    }

    /**
     * Display selected address on map
     */
    function displayAddressOnMap(feature) {
        const coordinates = feature.geometry.coordinates;
        const lat = coordinates[1];
        const lng = coordinates[0];
        
        // Remove previous marker
        if (selectedMarker) {
            map.removeLayer(selectedMarker);
        }
        
        // Center map on location
        map.setView([lat, lng], 18);
        
        // Add new marker
        selectedMarker = L.marker([lat, lng]).addTo(map);
        
        // Create popup content
        const popupContent = `
            <div class="text-center">
                <h6 class="mb-2"><i class="bi bi-geo-alt-fill text-primary"></i> Ausgewählte Adresse</h6>
                <p class="mb-0"><strong>${escapeHtml(feature.properties.label)}</strong></p>
            </div>
        `;
        
        selectedMarker.bindPopup(popupContent).openPopup();
        
        // Scroll map into view
        document.getElementById('mapid').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
    }

    /**
     * Show confirmation button
     */
    function showConfirmButton(parentElement) {
        // Remove any existing confirm buttons
        document.querySelectorAll('.confirm-address-btn').forEach(btn => btn.remove());
        
        const confirmButton = document.createElement('button');
        confirmButton.className = 'btn btn-success w-100 mt-2 confirm-address-btn';
        confirmButton.type = 'button';
        confirmButton.innerHTML = `
            <i class="bi bi-check-circle me-2"></i>
            Adresse bestätigen und Anmeldung abschließen
        `;
        
        confirmButton.addEventListener('click', handleFinalSubmission);
        
        const cardBody = parentElement.querySelector('.card-body');
        cardBody.appendChild(confirmButton);
    }

    /**
     * Handle final form submission
     */
    async function handleFinalSubmission() {
        if (selectedAddressIndex === null) {
            showNotification("Bitte wählen Sie zuerst eine Adresse aus", "warning");
            return;
        }

        if (isSubmitting) {
            return;
        }

        const formData = collectFormData();
        
        if (!formData) {
            showNotification("Fehler beim Sammeln der Formulardaten", "error");
            return;
        }

        try {
            isSubmitting = true;
            setSubmitButtonLoading(true);
            
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
                showNotification("Anmeldung erfolgreich gespeichert!", "success");
            } else {
                throw new Error(result.message || "Unbekannter Serverfehler");
            }
            
        } catch (error) {
            console.error("Submission error:", error);
            showNotification("Fehler beim Speichern: " + error.message, "error");
        } finally {
            isSubmitting = false;
            setSubmitButtonLoading(false);
        }
    }

    /**
     * Collect form data for submission
     */
    function collectFormData() {
        if (selectedAddressIndex === null || !geocodingResults[selectedAddressIndex]) {
            return null;
        }

        const feature = geocodingResults[selectedAddressIndex];
        
        const nameElement = document.getElementById("name");
        const phoneElement = document.getElementById("telefonnummer");
        const moneyElement = document.getElementById("inputMoney");
        const treesElement = document.getElementById("cb_anzahl");
        
        if (!nameElement || !phoneElement || !moneyElement || !treesElement) {
            console.error("Required form elements not found");
            return null;
        }
        
        return {
            name: nameElement.value.trim(),
            lat: feature.geometry.coordinates[1],
            lng: feature.geometry.coordinates[0],
            strasse: feature.properties.label || feature.properties.name,
            money: parseFloat(moneyElement.value) || 0,
            telefonnummer: phoneElement.value.trim(),
            cb_anzahl: parseInt(treesElement.value) || 1,
            address_confidence: feature.properties.confidence || 0,
            submission_timestamp: new Date().toISOString()
        };
    }

    /**
     * Show success confirmation
     */
    function showSuccessConfirmation(formData) {
        const confirmation = document.getElementById("confirmation");
        const confirmationDetails = document.getElementById("confirmationDetails");

        if (confirmation && confirmationDetails) {
            confirmationDetails.innerHTML = `
                <li><strong><i class="bi bi-person-fill"></i> Name:</strong> ${escapeHtml(formData.name)}</li>
                <li><strong><i class="bi bi-geo-alt-fill"></i> Adresse:</strong> ${escapeHtml(formData.strasse)}</li>
                <li><strong><i class="bi bi-telephone-fill"></i> Telefon:</strong> ${escapeHtml(formData.telefonnummer)}</li>
                <li><strong><i class="bi bi-cash-coin"></i> Bezahlt:</strong> €${formData.money.toFixed(2)}</li>
                <li><strong><i class="bi bi-tree-fill"></i> Anzahl Bäume:</strong> ${formData.cb_anzahl}</li>
                <li><strong><i class="bi bi-calendar-fill"></i> Angemeldet:</strong> ${new Date().toLocaleDateString('de-DE')}</li>
            `;

            confirmation.classList.remove("d-none", "invisible");
            confirmation.classList.add("show");
            confirmation.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }
    }

    /**
     * Reset form to initial state
     */
    function resetForm() {
        // Reset form elements
        const form = document.getElementById("registrationForm") || document.getElementById("check");
        if (form) {
            form.reset();
        }
        
        // Reset tree count to default
        const treesElement = document.getElementById("cb_anzahl");
        if (treesElement) {
            treesElement.value = "1";
        }
        
        // Hide address results
        const resultsContainer = document.getElementById("addressResults") || document.getElementById("proof");
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
            resultsContainer.classList.add('d-none');
            resultsContainer.classList.remove('show');
        }
        
        // Reset global variables
        selectedAddressIndex = null;
        geocodingResults = [];
        
        // Remove map marker
        if (selectedMarker) {
            map.removeLayer(selectedMarker);
            selectedMarker = null;
        }
        
        // Clear validation states
        document.querySelectorAll('.is-invalid').forEach(el => {
            el.classList.remove('is-invalid');
        });
        
        document.querySelectorAll('.invalid-feedback').forEach(el => {
            el.textContent = '';
        });
    }

    /**
     * Validate complete form
     */
    function validateForm() {
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

    /**
     * Validate individual field
     */
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
                const money = parseFloat(value);
                isValid = !isNaN(money) && money >= 0 && money <= 999.99;
                message = 'Gültiger Geldbetrag zwischen 0 und 999.99 Euro erforderlich';
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

    /**
     * Show field validation error
     */
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

    /**
     * Clear field validation error
     */
    function clearFieldError(element) {
        element.classList.remove('is-invalid');
        const feedback = element.parentNode.querySelector('.invalid-feedback');
        if (feedback) {
            feedback.textContent = '';
        }
    }

    /**
     * Set submit button loading state
     */
    function setSubmitButtonLoading(loading) {
        const button = document.getElementById('submitButton') || document.getElementById('check_button');
        const spinner = document.getElementById('submitSpinner') || button?.querySelector('.spinner-border');
        
        if (button) {
            button.disabled = loading;
            if (spinner) {
                if (loading) {
                    spinner.classList.remove('d-none');
                } else {
                    spinner.classList.add('d-none');
                }
            }
            
            if (loading) {
                button.style.opacity = '0.7';
            } else {
                button.style.opacity = '1';
            }
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    function handleKeyboardShortcuts(event) {
        // Escape key - clear form or close modals
        if (event.key === 'Escape') {
            const resultsContainer = document.getElementById("addressResults") || document.getElementById("proof");
            if (resultsContainer && !resultsContainer.classList.contains('d-none')) {
                resetForm();
            }
        }
        
        // Enter key in address field - trigger search
        if (event.key === 'Enter' && event.target.id === 'inputAddress') {
            event.preventDefault();
            const form = document.getElementById("registrationForm") || document.getElementById("check");
            if (form) {
                form.dispatchEvent(new Event('submit'));
            }
        }
    }

    /**
     * Show notification to user
     */
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
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Schließen"></button>
        `;

        document.body.appendChild(notification);

        // Auto-remove notification
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    console.log('CBS Anmeldung - Korrigierte Version erfolgreich geladen');
});