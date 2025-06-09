/**
 * CBS Overview - Optimiertes JavaScript
 * Verantwortlich für das Laden, Anzeigen und Verwalten der Anmeldungsdaten.
 */
document.addEventListener("DOMContentLoaded", function() {
    // Globale Variablen für den Zustand der Anwendung
    let anmeldungenData = []; // Speichert alle Originaldaten vom Server
    let filteredData = [];    // Speichert die gefilterten und sortierten Daten zur Anzeige
    let showCompleted = true; // Steuert, ob erledigte Einträge angezeigt werden
    let currentSort = { column: 'strasse', order: 'asc' }; // Standard-Sortierung
    let mapManager; // Die Karten-Manager-Instanz

    // Referenzen auf wichtige DOM-Elemente
    const tableBody = document.getElementById("table_overview");
    const filterInput = document.getElementById("filter-input");
    const filterButton = document.getElementById("filter-button");
    const refreshButton = document.getElementById("refresh-data");
    const clearSearchButton = document.getElementById("clear-search");

    /**
     * Initialisiert die Leaflet-Karte mithilfe des CBSMapManager.
     */
    async function initMap() {
        if (typeof CBSMapManager !== 'undefined') {
            mapManager = new CBSMapManager();
            await mapManager.init('overview_map');
            console.log("Karten-Manager erfolgreich initialisiert.");
        } else {
            console.error("CBSMapManager ist nicht definiert. Stellen Sie sicher, dass leaflet-map-manager.js korrekt geladen wird.");
            document.getElementById('overview_map').innerHTML = '<div class="alert alert-danger">Karten-Manager konnte nicht geladen werden.</div>';
        }
    }

    /**
     * Lädt die Anmeldungsdaten vom Server.
     */
    async function fetchData() {
        showLoadingSpinner(true);
        try {
            // Mit 'no-cache' wird sichergestellt, dass immer frische Daten geladen werden
            const response = await fetch("backend/get_data.php", { cache: 'no-cache' });
            if (!response.ok) {
                throw new Error(`HTTP-Fehler! Status: ${response.status}`);
            }
            const data = await response.json();
            // Sicherstellen, dass die Daten ein Array sind
            anmeldungenData = Array.isArray(data) ? data : [];
            applyFiltersAndRender();
        } catch (error) {
            console.error("Fehler beim Abrufen der Daten:", error);
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Fehler beim Laden der Daten. Bitte versuchen Sie es später erneut.</td></tr>`;
        } finally {
            showLoadingSpinner(false);
        }
    }

    /**
     * Führt alle Schritte zum Filtern, Sortieren und Anzeigen der Daten aus.
     */
    function applyFiltersAndRender() {
        // 1. Nach Suchbegriff filtern
        const searchTerm = filterInput.value.toLowerCase();
        let tempData = anmeldungenData;
        if (searchTerm) {
            tempData = anmeldungenData.filter(item => {
                return Object.values(item).some(val =>
                    String(val).toLowerCase().includes(searchTerm)
                );
            });
        }

        // 2. Nach "erledigt"-Status filtern
        if (!showCompleted) {
            tempData = tempData.filter(item => item.status == 0);
        }
        
        filteredData = tempData;

        // 3. Daten sortieren
        sortData();
        
        // 4. UI-Komponenten neu rendern
        renderTable();
        updateStats();
        if (mapManager) {
            renderMapMarkers();
        }
    }

    /**
     * Sortiert die `filteredData` basierend auf `currentSort`.
     */
    function sortData() {
        filteredData.sort((a, b) => {
            let valA = a[currentSort.column];
            let valB = b[currentSort.column];

            // Typgerechter Vergleich
            if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            } else {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
            }

            if (valA < valB) return currentSort.order === 'asc' ? -1 : 1;
            if (valA > valB) return currentSort.order === 'asc' ? 1 : -1;
            return 0;
        });
    }

    /**
     * Baut die HTML-Tabelle aus den `filteredData` neu auf.
     * Dies ist die Kernfunktion zur Lösung des Problems.
     */
    function renderTable() {
        if (!tableBody) return;
        tableBody.innerHTML = ""; // Vorhandene Zeilen leeren

        if (filteredData.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center p-5 text-muted">Keine Einträge für die aktuelle Auswahl gefunden.</td></tr>`;
            return;
        }

        // Der `rowNumber` wird hier jetzt korrekt über die ID des Eintrags geholt.
        filteredData.forEach(item => {
            const rowClass = item.status == 1 ? "table-success" : "";
            const isDone = item.status == 1;

            // Hier wird die HTML-Zeile mit genau 8 <td>-Elementen erstellt.
            const rowHtml = `
                <tr id="row-${item.id}" class="${rowClass}" data-id="${item.id}">
                    <td class="text-center">
                        <div class="form-check d-flex justify-content-center">
                            <input class="form-check-input" type="checkbox" value="${item.id}" aria-label="Eintrag ${item.id} auswählen">
                        </div>
                    </td>
                    <td>${item.id}</td>
                    <td>${escapeHtml(item.name)}</td>
                    <td>${escapeHtml(item.strasse)}</td>
                    <td><a href="tel:${escapeHtml(item.telefonnummer)}">${escapeHtml(item.telefonnummer)}</a></td>
                    <td class="text-center">${item.cb_anzahl}</td>
                    <td class="text-end">€ ${parseFloat(item.geld).toFixed(2)}</td>
                    <td class="text-center">
                        <div class="btn-group btn-group-sm" role="group">
                            <button class="btn btn-${isDone ? 'secondary' : 'success'} btn-status" data-id="${item.id}" data-status="${isDone ? 0 : 1}" title="${isDone ? 'Auf nicht abgeholt setzen' : 'Auf abgeholt setzen'}">
                                <i class="bi bi-check-lg"></i>
                            </button>
                            <button class="btn btn-primary btn-locate" data-lat="${item.lat}" data-lng="${item.lng}" title="Auf Karte anzeigen">
                                <i class="bi bi-geo-alt-fill"></i>
                            </button>
                            <button class="btn btn-danger btn-delete" data-id="${item.id}" title="Löschen">
                                <i class="bi bi-trash-fill"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            tableBody.insertAdjacentHTML('beforeend', rowHtml);
        });
    }

    /**
     * Aktualisiert die Statistik-Kacheln.
     */
    function updateStats() {
        const total = anmeldungenData.length;
        const completed = anmeldungenData.filter(item => item.status == 1).length;
        const money = anmeldungenData.reduce((sum, item) => sum + parseFloat(item.geld), 0);

        document.getElementById("stats-total").textContent = total;
        document.getElementById("stats-completed").textContent = completed;
        document.getElementById("stats-money").textContent = `€ ${money.toFixed(2)}`;
    }

    /**
     * Zeichnet die Marker auf der Karte basierend auf den gefilterten Daten.
     */
    function renderMapMarkers() {
        mapManager.clearMarkers();
        filteredData.forEach(item => {
            if (item.lat && item.lng) {
                mapManager.addMarker(item.lat, item.lng, item);
            }
        });
        mapManager.fitToMarkers();
    }
    
    /**
     * Behandelt Aktionen wie Statusänderung oder Löschen eines Eintrags.
     */
    async function handleTableAction(action, id, params = {}) {
        let url, body, successMessage;

        if (action === 'status') {
            url = 'backend/change.php';
            body = new URLSearchParams({ id, status: params.status });
            successMessage = `Status für Eintrag #${id} erfolgreich geändert.`;
        } else if (action === 'delete') {
            if (!confirm(`Soll der Eintrag mit der ID #${id} wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.`)) return;
            url = 'backend/delete.php';
            body = new URLSearchParams({ id });
            successMessage = `Eintrag #${id} erfolgreich gelöscht.`;
        } else {
            return;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body
            });
            const result = await response.json();
            if (result.success) {
                console.log(successMessage);
                await fetchData(); // Daten neu laden, um die Ansicht zu aktualisieren
            } else {
                throw new Error(result.message || 'Die Aktion ist fehlgeschlagen.');
            }
        } catch (error) {
            console.error(`Fehler bei Aktion '${action}' für ID ${id}:`, error);
            alert(`Ein Fehler ist aufgetreten: ${error.message}`);
        }
    }

    /**
     * Richtet alle Event-Listener für die Seite ein.
     */
    function setupEventListeners() {
        // Filter-Eingabefeld
        filterInput.addEventListener("keyup", debounce(applyFiltersAndRender, 300));
        clearSearchButton.addEventListener("click", () => {
            filterInput.value = '';
            applyFiltersAndRender();
        });

        // Button zum Ein-/Ausblenden erledigter Einträge
        filterButton.addEventListener("click", () => {
            showCompleted = !showCompleted;
            filterButton.innerHTML = showCompleted ? '<i class="bi bi-funnel-fill me-2"></i> Abgeholte ausblenden' : '<i class="bi bi-funnel me-2"></i> Abgeholte einblenden';
            filterButton.classList.toggle('btn-warning');
            filterButton.classList.toggle('btn-secondary');
            applyFiltersAndRender();
        });

        // Button zum Aktualisieren der Daten
        refreshButton.addEventListener("click", fetchData);

        // Sortier-Buttons im Tabellenkopf
        document.querySelectorAll('#main-content thead th button').forEach(button => {
            button.addEventListener('click', (e) => {
                const column = e.currentTarget.id.replace('sort-', '');
                if (currentSort.column === column) {
                    currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort.column = column;
                    currentSort.order = 'asc';
                }
                applyFiltersAndRender();
            });
        });
        
        // Event-Delegation für Aktions-Buttons in der Tabelle
        tableBody.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            const id = button.closest('tr').dataset.id;
            if (!id) return;

            if (button.classList.contains('btn-status')) {
                handleTableAction('status', id, { status: button.dataset.status });
            } else if (button.classList.contains('btn-delete')) {
                handleTableAction('delete', id);
            } else if (button.classList.contains('btn-locate')) {
                const lat = button.dataset.lat;
                const lng = button.dataset.lng;
                if (mapManager && lat && lng) {
                    mapManager.map.setView([lat, lng], 18);
                }
            }
        });
    }

    // --- Hilfsfunktionen ---

    function showLoadingSpinner(show) {
        const spinnerRow = `<tr><td colspan="8" class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Lade...</span></div><p class="mt-2 text-muted">Daten werden geladen...</p></td></tr>`;
        if (show && tableBody) {
            tableBody.innerHTML = spinnerRow;
        }
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return str.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // --- Start der Anwendung ---
    initMap();
    fetchData();
    setupEventListeners();
});