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
            // KORREKTUR: Routing wird hier aktiviert
            mapManager = new CBSMapManager({
                enableGeolocation: true,
                enableClustering: true,
                enableRouting: true, 
                tileProvider: 'osm',
                clusterRadius: 50,
                defaultZoom: 15
            });

            await mapManager.init('overview_map');
            setupEventListeners();
            await fetchAndDisplayData();
            setupAutoRefresh();
            console.log('CBS Overview erfolgreich initialisiert');
            
        } catch (error) {
            console.error('Fehler bei der Initialisierung:', error);
            showNotification('Fehler beim Laden der Karte. Bitte laden Sie die Seite neu.', 'error');
        }
    }

    function setupEventListeners() {
        document.getElementById("toggle-location")?.addEventListener("click", toggleLocation);
        document.getElementById("filter-button")?.addEventListener("click", toggleAbgeholteFilter);
        document.getElementById("refresh-data")?.addEventListener("click", () => fetchAndDisplayData(true));
        
        const searchInput = document.getElementById("filter-input");
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener("input", (event) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => handleSearch(event), 300);
            });
        }
    }

    function toggleLocation() {
        const toggleButton = document.getElementById("toggle-location");
        locationEnabled = !locationEnabled;
        if (locationEnabled) {
            mapManager.startLocationTracking();
            toggleButton.innerHTML = '<i class="bi bi-geo-alt-fill me-2"></i> Standort verbergen';
            toggleButton.classList.replace('btn-primary', 'btn-danger');
        } else {
            mapManager.stopLocationTracking();
            toggleButton.innerHTML = '<i class="bi bi-geo-alt-fill me-2"></i> Standort anzeigen';
            toggleButton.classList.replace('btn-danger', 'btn-primary');
        }
    }

    function toggleAbgeholteFilter() {
        showAbgeholte = !showAbgeholte;
        updateDisplay();
    }
    
    function handleSearch(event) {
        // ... (unverändert)
    }

    async function fetchAndDisplayData(forceRefresh = false) {
        if (isLoading && !forceRefresh) return;
        isLoading = true;
        try {
            const url = `${apiBase}get_data.php${forceRefresh ? '?_t='+Date.now() : ''}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            if (!Array.isArray(data)) throw new Error('Invalid data format');
            currentData = data;
            updateDisplay();
        } catch (error) {
            console.error("Error fetching data:", error);
            showNotification("Fehler beim Laden der Daten.", "error");
        } finally {
            isLoading = false;
        }
    }

    function updateDisplay() {
        const filteredData = showAbgeholte ? currentData : currentData.filter(d => d.status == 0);
        mapManager.clearMarkers();
        filteredData.forEach(entry => mapManager.addMarker(entry.lat, entry.lng, entry));
        if (filteredData.length > 0) mapManager.fitToMarkers();
        updateTable(filteredData);
        updateStatistics(currentData);
    }
    
    function updateTable(data) {
        const tableBody = document.getElementById("table_overview");
        if (!tableBody) return;
        let rows = "";
        data.forEach((entry, index) => {
            rows += `<tr id="row-${entry.id}"><th>${index + 1}</th><td>${escapeHtml(entry.name)}</td><td>${escapeHtml(entry.strasse)}</td><td>...</td></tr>`;
        });
        tableBody.innerHTML = rows || '<tr><td colspan="4" class="text-center">Keine Daten zum Anzeigen.</td></tr>';
    }

    function updateStatistics(data) {
        // ... (unverändert)
    }
    
    function setupAutoRefresh() {
        setInterval(() => {
            if (!isLoading && document.visibilityState === 'visible') {
                fetchAndDisplayData(false);
            }
        }, 7500);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
    
    function showNotification(message, type = 'info') {
        // ... (unverändert)
    }
});