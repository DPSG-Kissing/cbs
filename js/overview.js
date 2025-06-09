/**
 * CBS Overview - Optimierte Version
 * Version: 2.0.0
 * Optimiert für bessere Performance und Tabellendarstellung
 */
document.addEventListener("DOMContentLoaded", function() {
    // Globale Variablen
    let anmeldungenData = [];
    let filteredData = [];
    let showCompleted = true;
    let currentSort = { column: 'strasse', order: 'asc' };
    let mapManager;
    let isLocationTracking = false;

    // DOM-Elemente
    const tableBody = document.getElementById('table_overview_body');
    const filterInput = document.getElementById("filter-input");
    const filterButton = document.getElementById("filter-button");
    const refreshButton = document.getElementById("refresh-data");
    const clearSearchButton = document.getElementById("clear-search");
    const toggleLocationButton = document.getElementById("toggle-location");
    const fitMarkersButton = document.getElementById("fit-to-markers");
    const exportButton = document.getElementById("export-data");
    const fullscreenButton = document.getElementById("map-fullscreen");

    /**
     * Initialisiert die Leaflet-Karte
     */
    async function initMap() {
        try {
            if (typeof CBSMapManager !== 'undefined') {
                mapManager = new CBSMapManager({
                    enableClustering: true,
                    enableGeolocation: true
                });
                await mapManager.init('overview_map');
                
                // Map-Buttons einrichten
                setupMapControls();
                
                // Loading-Indikator entfernen
                const mapLoading = document.getElementById('map-loading');
                if (mapLoading) mapLoading.style.display = 'none';
                
                console.log("Karten-Manager erfolgreich initialisiert.");
            }
        } catch (error) {
            console.error("Fehler bei der Karten-Initialisierung:", error);
            document.getElementById('overview_map').innerHTML = 
                '<div class="alert alert-danger m-3">Karte konnte nicht geladen werden.</div>';
        }
    }

    /**
     * Lädt die Anmeldungsdaten vom Server
     */
    async function fetchData() {
        showLoadingState(true);
        
        try {
            const response = await fetch("backend/get_data.php", { 
                cache: 'no-cache',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP-Fehler! Status: ${response.status}`);
            }
            
            const data = await response.json();
            anmeldungenData = Array.isArray(data) ? data : [];
            
            // Daten verarbeiten und anzeigen
            applyFiltersAndRender();
            
            // Erfolgs-Feedback
            showNotification('Daten erfolgreich geladen', 'success', 2000);
            
        } catch (error) {
            console.error("Fehler beim Abrufen der Daten:", error);
            showErrorState("Fehler beim Laden der Daten. Bitte versuchen Sie es später erneut.");
        } finally {
            showLoadingState(false);
        }
    }

    /**
     * Wendet Filter an und rendert die UI neu
     */
    function applyFiltersAndRender() {
        // 1. Suchfilter anwenden
        const searchTerm = filterInput.value.toLowerCase().trim();
        let tempData = anmeldungenData;
        
        if (searchTerm) {
            tempData = anmeldungenData.filter(item => {
                return Object.values(item).some(val => 
                    String(val).toLowerCase().includes(searchTerm)
                );
            });
        }

        // 2. Status-Filter anwenden
        if (!showCompleted) {
            tempData = tempData.filter(item => item.status == 0);
        }
        
        filteredData = tempData;

        // 3. Sortierung anwenden
        sortData();
        
        // 4. UI aktualisieren
        renderTable();
        updateStats();
        if (mapManager) {
            renderMapMarkers();
        }
    }

    /**
     * Sortiert die gefilterten Daten
     */
    function sortData() {
        filteredData.sort((a, b) => {
            let valA = a[currentSort.column];
            let valB = b[currentSort.column];

            // Sonderbehandlung für verschiedene Datentypen
            if (currentSort.column === 'geld' || currentSort.column === 'cb_anzahl') {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
            } else if (currentSort.column === 'status') {
                valA = parseInt(valA) || 0;
                valB = parseInt(valB) || 0;
            } else if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = (valB || '').toLowerCase();
            }

            if (valA < valB) return currentSort.order === 'asc' ? -1 : 1;
            if (valA > valB) return currentSort.order === 'asc' ? 1 : -1;
            return 0;
        });
    }

    /**
     * Rendert die Tabelle mit optimierter Struktur
     */
    function renderTable() {
        if (!tableBody) return;
        
        // Tabelle leeren
        tableBody.innerHTML = "";

        if (filteredData.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center p-5 text-muted">
                        <i class="bi bi-inbox fs-1 d-block mb-3"></i>
                        Keine Einträge für die aktuelle Auswahl gefunden.
                    </td>
                </tr>`;
            return;
        }

        // Zeilen erstellen
        const fragment = document.createDocumentFragment();
        
        filteredData.forEach((item, index) => {
            const row = createTableRow(item, index);
            fragment.appendChild(row);
        });
        
        tableBody.appendChild(fragment);
        
        // Gesamt-Zeile hinzufügen
        addSummaryRow();
    }

    /**
     * Erstellt eine Tabellenzeile
     */
    function createTableRow(item, index) {
        const tr = document.createElement('tr');
        tr.id = `row-${item.id}`;
        tr.className = item.status == 1 ? 'table-success' : '';
        tr.dataset.id = item.id;
        
        const isDone = item.status == 1;
        
        tr.innerHTML = `
            <td class="text-center">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" 
                           value="${item.id}" 
                           id="check-${item.id}"
                           aria-label="Eintrag ${item.id} auswählen">
                </div>
            </td>
            <td class="fw-bold">${item.id}</td>
            <td class="text-truncate" style="max-width: 150px;" title="${escapeHtml(item.name)}">
                ${escapeHtml(item.name)}
            </td>
            <td class="text-truncate" style="max-width: 300px;" title="${escapeHtml(item.strasse)}">
                ${escapeHtml(item.strasse)}
            </td>
            <td class="text-nowrap">
                <a href="tel:${escapeHtml(item.telefonnummer)}" class="text-decoration-none">
                    <i class="bi bi-telephone-fill me-1"></i>${escapeHtml(item.telefonnummer)}
                </a>
            </td>
            <td class="text-center fw-bold">${item.cb_anzahl}</td>
            <td class="text-end fw-bold">€${parseFloat(item.geld).toFixed(2)}</td>
            <td class="text-center">
                <div class="btn-group btn-group-sm" role="group" aria-label="Aktionen für ${escapeHtml(item.name)}">
                    <button class="btn btn-${isDone ? 'secondary' : 'success'} btn-status" 
                            data-id="${item.id}" 
                            data-status="${isDone ? 0 : 1}" 
                            title="${isDone ? 'Als nicht abgeholt markieren' : 'Als abgeholt markieren'}"
                            aria-label="${isDone ? 'Als nicht abgeholt markieren' : 'Als abgeholt markieren'}">
                        <i class="bi bi-${isDone ? 'arrow-counterclockwise' : 'check-lg'}"></i>
                    </button>
                    <button class="btn btn-primary btn-locate" 
                            data-lat="${item.lat}" 
                            data-lng="${item.lng}" 
                            title="Auf Karte anzeigen"
                            aria-label="Auf Karte anzeigen">
                        <i class="bi bi-geo-alt-fill"></i>
                    </button>
                    <button class="btn btn-danger btn-delete" 
                            data-id="${item.id}" 
                            title="Eintrag löschen"
                            aria-label="Eintrag löschen">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                </div>
            </td>`;
        
        return tr;
    }

    /**
     * Fügt eine Zusammenfassungszeile hinzu
     */
    function addSummaryRow() {
        const total = filteredData.length;
        const totalMoney = filteredData.reduce((sum, item) => sum + parseFloat(item.geld || 0), 0);
        const totalTrees = filteredData.reduce((sum, item) => sum + parseInt(item.cb_anzahl || 0), 0);
        const completed = filteredData.filter(item => item.status == 1).length;
        
        const summaryRow = document.createElement('tr');
        summaryRow.className = 'summary-row table-light fw-bold';
        summaryRow.innerHTML = `
    <td></td>
    <td></td>
    <td colspan="2" class="text-end fw-bold">Gesamt (${total}):</td>
    <td></td>
    <td class="text-center">${totalTrees}</td>
    <td class="text-end">€${totalMoney.toFixed(2)}</td>
    <td></td>`;
        
        tableBody.appendChild(summaryRow);
    }

    /**
     * Aktualisiert die Statistik-Karten
     */
    function updateStats() {
        const total = anmeldungenData.length;
        const completed = anmeldungenData.filter(item => item.status == 1).length;
        const money = anmeldungenData.reduce((sum, item) => sum + parseFloat(item.geld || 0), 0);

        // Mit Animation aktualisieren
        animateValue('stats-total', total);
        animateValue('stats-completed', completed);
        animateValue('stats-money', `€${money.toFixed(2)}`);
    }

    /**
     * Animiert Wertänderungen
     */
    function animateValue(elementId, endValue) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        element.style.transform = 'scale(1.1)';
        element.textContent = endValue;
        
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 200);
    }

    /**
     * Rendert Marker auf der Karte
     */
    function renderMapMarkers() {
        if (!mapManager) return;
        
        mapManager.clearMarkers();
        
        filteredData.forEach(item => {
            if (item.lat && item.lng) {
                mapManager.addMarker(parseFloat(item.lat), parseFloat(item.lng), item);
            }
        });
        
        // Karte an Marker anpassen
        if (filteredData.length > 0) {
            mapManager.fitToMarkers();
        }
    }

    /**
     * Behandelt Tabellen-Aktionen
     */
    async function handleTableAction(action, id, params = {}) {
        const confirmMessages = {
            delete: `Möchten Sie den Eintrag #${id} wirklich löschen?\nDiese Aktion kann nicht rückgängig gemacht werden.`,
            status: params.status == 1 ? `Eintrag #${id} als abgeholt markieren?` : `Eintrag #${id} als nicht abgeholt markieren?`
        };

        if (action === 'delete' && !confirm(confirmMessages.delete)) {
            return;
        }

        showLoadingState(true, 'Verarbeite Anfrage...');

        try {
            const url = action === 'status' ? 'backend/change.php' : 'backend/delete.php';
            const body = new URLSearchParams({ 
                id, 
                ...(action === 'status' && { status: params.status })
            });

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body
            });

            const result = await response.json();
            
            if (result.success) {
                const messages = {
                    status: `Status erfolgreich geändert`,
                    delete: `Eintrag erfolgreich gelöscht`
                };
                
                showNotification(messages[action], 'success');
                
                // Lokale Aktualisierung für bessere Performance
                if (action === 'status') {
                    updateLocalData(id, { status: params.status });
                } else if (action === 'delete') {
                    removeLocalData(id);
                }
                
                applyFiltersAndRender();
            } else {
                throw new Error(result.message || 'Aktion fehlgeschlagen');
            }
        } catch (error) {
            console.error(`Fehler bei ${action}:`, error);
            showNotification(`Fehler: ${error.message}`, 'error');
            await fetchData(); // Bei Fehler neu laden
        } finally {
            showLoadingState(false);
        }
    }

    /**
     * Lokale Datenaktualisierung
     */
    function updateLocalData(id, updates) {
        const index = anmeldungenData.findIndex(item => item.id == id);
        if (index !== -1) {
            anmeldungenData[index] = { ...anmeldungenData[index], ...updates };
        }
    }

    /**
     * Lokales Entfernen von Daten
     */
    function removeLocalData(id) {
        anmeldungenData = anmeldungenData.filter(item => item.id != id);
    }

    /**
     * Map-Controls einrichten
     */
    function setupMapControls() {
        // Standort-Toggle
        if (toggleLocationButton) {
            toggleLocationButton.addEventListener('click', () => {
                if (!mapManager) return;
                
                if (isLocationTracking) {
                    mapManager.stopLocationTracking();
                    toggleLocationButton.innerHTML = '<i class="bi bi-geo-alt-fill me-2"></i><span>Standort anzeigen</span>';
                    isLocationTracking = false;
                } else {
                    mapManager.startLocationTracking();
                    toggleLocationButton.innerHTML = '<i class="bi bi-geo-fill me-2"></i><span>Standort ausblenden</span>';
                    isLocationTracking = true;
                }
            });
        }

        // Fit to markers
        if (fitMarkersButton) {
            fitMarkersButton.addEventListener('click', () => {
                if (mapManager) mapManager.fitToMarkers();
            });
        }

        // Export
        if (exportButton) {
            exportButton.addEventListener('click', exportData);
        }

        // Fullscreen
        if (fullscreenButton) {
            fullscreenButton.addEventListener('click', toggleFullscreen);
        }
    }

    /**
     * Event-Listener einrichten
     */
    function setupEventListeners() {
        // Such-Eingabe
        if (filterInput) {
            filterInput.addEventListener('input', debounce(applyFiltersAndRender, 300));
            filterInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    applyFiltersAndRender();
                }
            });
        }

        // Such-Reset
        if (clearSearchButton) {
            clearSearchButton.addEventListener('click', () => {
                filterInput.value = '';
                applyFiltersAndRender();
                filterInput.focus();
            });
        }

        // Filter-Toggle
        if (filterButton) {
            filterButton.addEventListener('click', () => {
                showCompleted = !showCompleted;
                filterButton.innerHTML = showCompleted 
                    ? '<i class="bi bi-funnel-fill me-2"></i><span>Abgeholte ausblenden</span>'
                    : '<i class="bi bi-funnel me-2"></i><span>Abgeholte einblenden</span>';
                filterButton.classList.toggle('btn-warning');
                filterButton.classList.toggle('btn-secondary');
                applyFiltersAndRender();
            });
        }

        // Refresh
        if (refreshButton) {
            refreshButton.addEventListener('click', async () => {
                refreshButton.querySelector('i').classList.add('bi-spin');
                await fetchData();
                refreshButton.querySelector('i').classList.remove('bi-spin');
            });
        }

        // Sortier-Buttons
        document.querySelectorAll('#main-content thead th button').forEach(button => {
            button.addEventListener('click', (e) => {
                const column = e.currentTarget.id.replace('sort-', '');
                
                // Sortierrichtung umschalten
                if (currentSort.column === column) {
                    currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort.column = column;
                    currentSort.order = 'asc';
                }
                
                // Visuelles Feedback
                updateSortIndicators();
                applyFiltersAndRender();
            });
        });

        // Tabellen-Aktionen (Event Delegation)
        if (tableBody) {
            tableBody.addEventListener('click', async (e) => {
                const button = e.target.closest('button');
                if (!button) return;

                const row = button.closest('tr');
                const id = row?.dataset.id;
                if (!id) return;

                if (button.classList.contains('btn-status')) {
                    await handleTableAction('status', id, { status: button.dataset.status });
                } else if (button.classList.contains('btn-delete')) {
                    await handleTableAction('delete', id);
                } else if (button.classList.contains('btn-locate')) {
                    const lat = parseFloat(button.dataset.lat);
                    const lng = parseFloat(button.dataset.lng);
                    if (mapManager && lat && lng) {
                        mapManager.map.setView([lat, lng], 18);
                        // Popup öffnen
                        const item = anmeldungenData.find(d => d.id == id);
                        if (item) {
                            mapManager.map.eachLayer(layer => {
                                if (layer.getLatLng && 
                                    layer.getLatLng().lat === lat && 
                                    layer.getLatLng().lng === lng) {
                                    layer.openPopup();
                                }
                            });
                        }
                    }
                }
            });
        }

        // Checkbox "Alle auswählen" (falls vorhanden)
        const selectAllCheckbox = document.getElementById('select-all');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                const checkboxes = tableBody.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(cb => cb.checked = e.target.checked);
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Strg/Cmd + F: Fokus auf Suche
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                filterInput?.focus();
            }
            // F5: Refresh
            if (e.key === 'F5') {
                e.preventDefault();
                refreshButton?.click();
            }
        });
    }

    /**
     * Sortier-Indikatoren aktualisieren
     */
    function updateSortIndicators() {
        document.querySelectorAll('#main-content thead th button').forEach(button => {
            const column = button.id.replace('sort-', '');
            const icon = button.querySelector('i');
            
            if (column === currentSort.column) {
                icon.className = currentSort.order === 'asc' 
                    ? 'bi bi-sort-up' 
                    : 'bi bi-sort-down';
                button.classList.add('active');
            } else {
                icon.className = 'bi bi-sort';
                button.classList.remove('active');
            }
        });
    }

    /**
     * Daten exportieren
     */
    function exportData() {
        const dataToExport = filteredData.length > 0 ? filteredData : anmeldungenData;
        
        // CSV erstellen
        const headers = ['ID', 'Name', 'Straße', 'Telefon', 'Anzahl', 'Betrag', 'Status', 'Lat', 'Lng'];
        const csvContent = [
            headers.join(';'),
            ...dataToExport.map(item => [
                item.id,
                item.name,
                item.strasse,
                item.telefonnummer,
                item.cb_anzahl,
                item.geld,
                item.status == 1 ? 'Abgeholt' : 'Offen',
                item.lat,
                item.lng
            ].join(';'))
        ].join('\n');

        // Download auslösen
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `CBS_Export_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        
        showNotification('Export erfolgreich', 'success');
    }

    /**
     * Vollbild-Modus für Karte
     */
    function toggleFullscreen() {
        const mapContainer = document.getElementById('overview_map');
        if (!mapContainer) return;

        if (!document.fullscreenElement) {
            mapContainer.requestFullscreen().then(() => {
                fullscreenButton.innerHTML = '<i class="bi bi-fullscreen-exit"></i>';
            }).catch(err => {
                console.error('Vollbild-Fehler:', err);
            });
        } else {
            document.exitFullscreen().then(() => {
                fullscreenButton.innerHTML = '<i class="bi bi-fullscreen"></i>';
            });
        }
    }

    // === Hilfsfunktionen ===

    /**
     * Zeigt/Versteckt Ladeanimation
     */
    function showLoadingState(show, message = 'Daten werden geladen...') {
        if (show) {
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center py-5">
                            <div class="spinner-border text-primary mb-3" role="status">
                                <span class="visually-hidden">Lädt...</span>
                            </div>
                            <p class="text-muted">${message}</p>
                        </td>
                    </tr>`;
            }
        }
    }

    /**
     * Zeigt Fehlerzustand
     */
    function showErrorState(message) {
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-5 text-danger">
                        <i class="bi bi-exclamation-triangle-fill fs-1 d-block mb-3"></i>
                        ${escapeHtml(message)}
                    </td>
                </tr>`;
        }
    }

    /**
     * Zeigt Benachrichtigungen
     */
    function showNotification(message, type = 'info', duration = 3000) {
        const alertClass = {
            'success': 'alert-success',
            'error': 'alert-danger',
            'warning': 'alert-warning',
            'info': 'alert-info'
        }[type] || 'alert-info';

        const iconClass = {
            'success': 'bi-check-circle-fill',
            'error': 'bi-exclamation-triangle-fill',
            'warning': 'bi-exclamation-circle-fill',
            'info': 'bi-info-circle-fill'
        }[type] || 'bi-info-circle-fill';

        const notification = document.createElement('div');
        notification.className = `alert ${alertClass} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
        notification.style.zIndex = '9999';
        notification.style.minWidth = '300px';
        notification.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="bi ${iconClass} me-2"></i>
                <div>${escapeHtml(message)}</div>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;

        document.body.appendChild(notification);

        // Auto-remove
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 150);
        }, duration);
    }

    /**
     * HTML-Escape
     */
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    /**
     * Debounce-Funktion
     */
    function debounce(func, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // === Initialisierung ===
    
    console.log('CBS Overview v2.0.0 - Initialisiere...');
    
    // Karte initialisieren
    initMap();
    
    // Event-Listener einrichten
    setupEventListeners();
    
    // Initiale Daten laden
    fetchData();
    
    // Auto-Refresh alle 5 Minuten (optional)
    setInterval(() => {
        if (!document.hidden) { // Nur wenn Tab aktiv
            fetchData();
        }
    }, 300000);
    
    // Page Visibility API
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            // Daten aktualisieren wenn Tab wieder aktiv wird
            fetchData();
        }
    });
});