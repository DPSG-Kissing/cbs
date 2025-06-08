/**
 * CBS Overview - Integration mit modernem Leaflet Map Manager
 * Aktualisierte Version für bessere Performance und UX
 */

document.addEventListener("DOMContentLoaded", function() {
    let mapManager;
    let locationEnabled = false;
    const apiBase = "https://cbs.pfadfinder-kissing.de/backend/";
    
    let showAbgeholte = false;
    let currentData = [];
    let isLoading = false;

    // Initialisierung
    initializeApplication();

    async function initializeApplication() {
        try {
            // Moderne Leaflet Map Manager initialisieren
            mapManager = new CBSMapManager({
                enableGeolocation: true,
                enableClustering: true,
                enableRouting: false, // Vorerst deaktiviert
                tileProvider: 'osm',
                clusterRadius: 50,
                defaultZoom: 15
            });

            // Karte initialisieren
            await mapManager.init('overview_map');

            // Event Listeners einrichten
            setupEventListeners();
            setupMapEventListeners();
            
            // Daten laden
            await fetchAndDisplayData();
            
            // Automatische Synchronisation starten
            setupAutoRefresh();
            
            console.log('CBS Overview erfolgreich initialisiert');
            
        } catch (error) {
            console.error('Fehler bei der Initialisierung:', error);
            showNotification('Fehler beim Laden der Karte. Bitte laden Sie die Seite neu.', 'error');
        }
    }

    function setupEventListeners() {
        // Standort Toggle
        const toggleButton = document.getElementById("toggle-location");
        if (toggleButton) {
            toggleButton.addEventListener("click", toggleLocation);
        }

        // Filter Button
        const filterButton = document.getElementById("filter-button");
        if (filterButton) {
            filterButton.addEventListener("click", toggleAbgeholteFilter);
        }

        // Such-Input mit Debouncing
        const searchInput = document.getElementById("filter-input");
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener("input", (event) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    handleSearch(event);
                }, 300);
            });
        }

        // Refresh Button
        const refreshButton = document.getElementById("refresh-data");
        if (refreshButton) {
            refreshButton.addEventListener("click", () => {
                fetchAndDisplayData(true);
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyboardShortcuts);
    }

    function setupMapEventListeners() {
        // Status change events vom Map Manager
        mapManager.on('statusChange', async (data) => {
            await handleStatusChange(data);
        });

        // Location events
        mapManager.on('locationFound', (data) => {
            showNotification('Standort gefunden', 'success');
        });

        mapManager.on('locationError', (data) => {
            showNotification('Standort konnte nicht ermittelt werden: ' + data.message, 'warning');
        });

        // Map initialization event
        mapManager.on('mapInitialized', () => {
            console.log('Karte erfolgreich initialisiert');
        });
    }

    function toggleLocation() {
        const toggleButton = document.getElementById("toggle-location");
        locationEnabled = !locationEnabled;
        
        if (locationEnabled) {
            mapManager.startLocationTracking();
            toggleButton.textContent = "Standort verbergen";
            toggleButton.classList.remove('btn-primary');
            toggleButton.classList.add('btn-success');
        } else {
            mapManager.stopLocationTracking();
            toggleButton.textContent = "Standort anzeigen";
            toggleButton.classList.remove('btn-success');
            toggleButton.classList.add('btn-primary');
        }
    }

    function toggleAbgeholteFilter() {
        showAbgeholte = !showAbgeholte;
        const filterButton = document.getElementById("filter-button");
        
        if (filterButton) {
            filterButton.textContent = showAbgeholte ? 
                "Abgeholte ausblenden" : "Abgeholte einblenden";
            filterButton.classList.toggle('btn-warning');
            filterButton.classList.toggle('btn-info');
        }
        
        updateDisplay();
    }

    function handleSearch(event) {
        const filter = event.target.value.toLowerCase().trim();
        const rows = document.querySelectorAll("#table_overview tr");

        rows.forEach((row, index) => {
            if (index === rows.length - 1) return; // Summe-Zeile ignorieren
            
            if (!filter) {
                row.style.display = "";
                return;
            }

            const cells = row.querySelectorAll("td");
            const match = Array.from(cells).some(cell =>
                cell.textContent.toLowerCase().includes(filter)
            );

            row.style.display = match ? "" : "none";
        });

        updateVisibleStatistics();
    }

    function handleKeyboardShortcuts(event) {
        if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
            event.preventDefault();
            fetchAndDisplayData(true);
        }

        if (event.key === 'f' && !event.ctrlKey && !event.metaKey) {
            const searchInput = document.getElementById("filter-input");
            if (searchInput && document.activeElement !== searchInput) {
                event.preventDefault();
                searchInput.focus();
            }
        }

        if (event.key === 'l' && !event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            toggleLocation();
        }

        if (event.key === 'Escape') {
            const searchInput = document.getElementById("filter-input");
            if (searchInput && searchInput.value) {
                searchInput.value = '';
                handleSearch({ target: searchInput });
            }
        }
    }

    async function fetchAndDisplayData(forceRefresh = false) {
        if (isLoading && !forceRefresh) return;
        
        try {
            isLoading = true;
            if (forceRefresh) showLoading(true);
            
            const url = forceRefresh ? 
                `${apiBase}get_data.php?_t=${Date.now()}` : 
                `${apiBase}get_data.php`;
            
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": forceRefresh ? "no-cache" : "max-age=5"
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!Array.isArray(data)) {
                throw new Error('Invalid data format received');
            }

            currentData = data;
            updateDisplay();
            
            if (forceRefresh) {
                showNotification(`${data.length} Einträge erfolgreich aktualisiert`, 'success');
            }
            
        } catch (error) {
            console.error("Error fetching data:", error);
            showNotification("Fehler beim Laden der Daten: " + error.message, "error");
        } finally {
            isLoading = false;
            if (forceRefresh) showLoading(false);
        }
    }

    function updateDisplay() {
        updateMap(currentData);
        updateTable(currentData);
        updateStatistics(currentData);
    }

    function updateMap(data) {
        mapManager.clearMarkers();
        data.forEach(entry => {
            try {
                const markerData = {
                    id: entry.id,
                    name: entry.name,
                    strasse: entry.strasse,
                    telefonnummer: entry.telefonnummer,
                    cb_anzahl: parseInt(entry.cb_anzahl),
                    geld: parseFloat(entry.geld),
                    status: parseInt(entry.status),
                    lat: parseFloat(entry.lat),
                    lng: parseFloat(entry.lng)
                };

                if (isNaN(markerData.lat) || isNaN(markerData.lng)) return;
                mapManager.addMarker(markerData.lat, markerData.lng, markerData);
                
            } catch (error) {
                console.error('Error adding marker for entry:', entry.id, error);
            }
        });

        if (data.length > 0) {
            setTimeout(() => mapManager.fitToMarkers([20, 20]), 100);
        }
    }

    function updateTable(data) {
        const tableBody = document.getElementById("table_overview");
        if (!tableBody) return;

        let rows = "";
        data.forEach((entry, index) => {
            const statusClass = entry.status == 1 ? "table-success" : "table-danger";
            const shouldShow = entry.status == 0 || showAbgeholte;
            const displayStyle = shouldShow ? "" : "display: none;";
            
            rows += `
                <tr id="row-${entry.id}" class="${statusClass}" style="${displayStyle}" data-entry-id="${entry.id}" data-status="${entry.status}">
                    <th scope="row">${index + 1}</th>
                    <td>
                        <div class="d-flex align-items-center">
                            <span>${escapeHtml(entry.name)}</span>
                            ${entry.status == 1 ? '<span class="badge bg-success ms-auto">✓</span>' : ''}
                        </div>
                    </td>
                    <td><span title="${escapeHtml(entry.strasse)}">${escapeHtml(truncateText(entry.strasse, 30))}</span></td>
                    <td><a href="tel:${escapeHtml(entry.telefonnummer)}">${escapeHtml(entry.telefonnummer)}</a></td>
                    <td class="text-center"><span class="badge bg-primary">${entry.cb_anzahl}</span></td>
                    <td class="text-end"><strong>€${parseFloat(entry.geld).toFixed(2)}</strong></td>
                    <td>
                        <div class="btn-group btn-group-sm" role="group">
                            <button class="btn btn-outline-primary btn-map" data-lat="${entry.lat}" data-lng="${entry.lng}" title="Auf Karte anzeigen">📍</button>
                            <button class="btn btn-outline-${entry.status == 1 ? 'warning' : 'success'} btn-status" data-id="${entry.id}" data-status="${entry.status}" title="${entry.status == 1 ? 'Als nicht abgeholt markieren' : 'Als abgeholt markieren'}">${entry.status == 1 ? '↩️' : '✅'}</button>
                            <button class="btn btn-outline-danger btn-delete" data-id="${entry.id}" data-name="${escapeHtml(entry.name)}" data-strasse="${escapeHtml(entry.strasse)}" title="Eintrag löschen">🗑️</button>
                        </div>
                    </td>
                </tr>`;
        });

        tableBody.innerHTML = rows;
        setupTableButtonListeners();
        updateTableStatistics(data);
    }

    function updateTableStatistics(data) {
        const visibleData = showAbgeholte ? data : data.filter(entry => entry.status == 0);
        const totalEntries = visibleData.length;
        const totalTrees = visibleData.reduce((sum, entry) => sum + parseInt(entry.cb_anzahl), 0);
        const totalMoney = visibleData.reduce((sum, entry) => sum + parseFloat(entry.geld), 0);
        const completedEntries = visibleData.filter(entry => entry.status == 1).length;

        const tableBody = document.getElementById("table_overview");
        const existingStatsRow = tableBody.querySelector('.table-stats');
        if (existingStatsRow) existingStatsRow.remove();

        const statsRow = `<tr class="table-info table-stats"><th scope="row"><strong>📊</strong></th><td><strong>Gesamt (${totalEntries})</strong></td><td colspan="2"><small>${completedEntries} abgeholt, ${totalEntries - completedEntries} offen</small></td><td class="text-center"><strong>${totalTrees}</strong></td><td class="text-end"><strong>€${totalMoney.toFixed(2)}</strong></td><td></td></tr>`;
        tableBody.insertAdjacentHTML('beforeend', statsRow);
    }

    function updateStatistics(data) {
        const statsElements = {
            total: document.getElementById('stats-total'),
            completed: document.getElementById('stats-completed'),
            money: document.getElementById('stats-money')
        };
        const stats = {
            total: data.length,
            completed: data.filter(entry => entry.status == 1).length,
            money: data.reduce((sum, entry) => sum + parseFloat(entry.geld), 0)
        };
        Object.keys(statsElements).forEach(key => {
            if (statsElements[key]) {
                statsElements[key].textContent = key === 'money' ? `€${stats[key].toFixed(2)}` : stats[key];
            }
        });
    }

    function updateVisibleStatistics() {
        const visibleRows = document.querySelectorAll("#table_overview tr:not(.table-stats):not([style*='display: none'])");
        const count = visibleRows.length;
        
        const searchInput = document.getElementById("filter-input");
        const indicator = document.getElementById('search-results') || createSearchResultsIndicator();
        
        if (searchInput && searchInput.value.trim()) {
            indicator.textContent = `${count} Ergebnisse gefunden`;
            indicator.style.display = 'block';
        } else {
            indicator.style.display = 'none';
        }
    }

    function createSearchResultsIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'search-results';
        indicator.className = 'alert alert-info alert-sm mt-2';
        const searchInput = document.getElementById("filter-input");
        if (searchInput && searchInput.parentNode) {
            searchInput.parentNode.appendChild(indicator);
        }
        return indicator;
    }

    function setupTableButtonListeners() {
        document.querySelectorAll(".btn-map").forEach(button => {
            button.addEventListener("click", (event) => {
                event.preventDefault();
                const lat = parseFloat(button.dataset.lat);
                const lng = parseFloat(button.dataset.lng);
                if (!isNaN(lat) && !isNaN(lng)) {
                    mapManager.map.setView([lat, lng], 18);
                    document.getElementById('overview_map').scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
        });

        document.querySelectorAll(".btn-status").forEach(button => {
            button.addEventListener("click", (event) => {
                event.preventDefault();
                handleStatusChange({ id: button.dataset.id, status: parseInt(button.dataset.status), button });
            });
        });

        document.querySelectorAll(".btn-delete").forEach(button => {
            button.addEventListener("click", (event) => {
                event.preventDefault();
                handleDelete(button);
            });
        });
    }

    async function handleStatusChange({ id, status }) {
        const newStatus = status === 0 ? 1 : 0;
        try {
            showLoading(true);
            const response = await fetch(`${apiBase}change.php`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `id=${encodeURIComponent(id)}&status=${newStatus}`,
            });
            const result = await response.json();
            if (result.success) {
                showNotification(`Status erfolgreich auf "${newStatus === 1 ? "abgeholt" : "nicht abgeholt"}" geändert`, "success");
                await fetchAndDisplayData(true); // Direkte Aktualisierung für alle
            } else {
                throw new Error(result.message || "Statusänderung fehlgeschlagen");
            }
        } catch (error) {
            console.error("Status change error:", error);
            showNotification("Fehler beim Ändern des Status: " + error.message, "error");
        } finally {
            showLoading(false);
        }
    }

    async function handleDelete(button) {
        const { id, name, strasse } = button.dataset;
        const confirmed = await showConfirmDialog('Eintrag löschen', `Möchten Sie den Eintrag für "${name}, ${strasse}" wirklich löschen?`);
        if (!confirmed) return;

        try {
            showLoading(true);
            const response = await fetch(`${apiBase}delete.php`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `id=${encodeURIComponent(id)}`,
            });
            const result = await response.json();
            if (result.success) {
                showNotification("Eintrag erfolgreich gelöscht", "success");
                await fetchAndDisplayData(true); // Direkte Aktualisierung für alle
            } else {
                throw new Error(result.message || "Löschen fehlgeschlagen");
            }
        } catch (error) {
            console.error("Delete error:", error);
            showNotification("Fehler beim Löschen: " + error.message, "error");
        } finally {
            showLoading(false);
        }
    }
    
    // ** NEU: Automatische Aktualisierungslogik **
    function setupAutoRefresh() {
        setInterval(async () => {
            // Nur aktualisieren, wenn der Tab sichtbar ist und keine andere Aktion läuft
            if (!isLoading && document.visibilityState === 'visible') {
                const refreshButton = document.getElementById("refresh-data");
                const icon = refreshButton ? refreshButton.querySelector('i') : null;

                if (icon) icon.classList.add('bi-spin'); // Startet die Animation
                
                await fetchAndDisplayData(false); // `false`, um Lade-Overlay zu vermeiden
                
                if (icon) {
                    // Animation nach kurzer Verzögerung stoppen, damit sie sichtbar ist
                    setTimeout(() => icon.classList.remove('bi-spin'), 500);
                }
            }
        }, 7500); // Aktualisierungsintervall: 7,5 Sekunden

        // Auch aktualisieren, wenn der Tab wieder sichtbar wird
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && !isLoading) {
                fetchAndDisplayData(true);
            }
        });
    }

    // Utility functions
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    function truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    function showLoading(show) {
        let loader = document.getElementById('loading-indicator');
        if (show && !loader) {
            loader = document.createElement('div');
            loader.id = 'loading-indicator';
            loader.className = 'position-fixed top-50 start-50 translate-middle';
            loader.style.zIndex = '9999';
            loader.innerHTML = `<div class="d-flex flex-column align-items-center bg-white p-4 rounded shadow"><div class="spinner-border text-primary mb-2" role="status"></div><small class="text-muted">Lade...</small></div>`;
            document.body.appendChild(loader);
        } else if (!show && loader) {
            loader.remove();
        }
    }

    function showNotification(message, type = 'info', duration = 5000) {
        const alertClass = { 'success': 'alert-success', 'error': 'alert-danger', 'warning': 'alert-warning' }[type] || 'alert-info';
        const notification = document.createElement('div');
        notification.className = `alert ${alertClass} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
        notification.style.zIndex = '10000';
        notification.innerHTML = `<div>${escapeHtml(message)}</div><button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), duration);
    }

    async function showConfirmDialog(title, message) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal fade show d-block';
            modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
            modal.innerHTML = `<div class="modal-dialog"><div class="modal-content"><div class="modal-header"><h5 class="modal-title">${escapeHtml(title)}</h5></div><div class="modal-body"><p>${escapeHtml(message)}</p></div><div class="modal-footer"><button type="button" class="btn btn-secondary" data-action="cancel">Abbrechen</button><button type="button" class="btn btn-danger" data-action="confirm">Löschen</button></div></div></div>`;
            document.body.appendChild(modal);
            modal.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                if (action) {
                    resolve(action === 'confirm');
                    modal.remove();
                }
            });
        });
    }
});