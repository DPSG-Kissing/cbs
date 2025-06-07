document.addEventListener("DOMContentLoaded", function() {
    let map;
    let standort;
    let standort_circle;
    let locationEnabled = false;
    const apiBase = "https://cbs.pfadfinder-kissing.de/backend/";
    
    // Verbesserte Icon-Konfiguration
    const redIcon = L.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
    });

    const greenIcon = L.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
    });

    let markersGroup = L.markerClusterGroup({ 
        maxClusterRadius: 50, 
        zoomToBoundsOnClick: true,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false
    });
    
    let showAbgeholte = false;
    let currentData = [];

    // Initialisierung
    initializeMap();
    setupEventListeners();
    fetchAndDisplayData();

    function initializeMap() {
        map = L.map("overview_map");
        const osmUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
        const osmAttrib = "Map data © <a href='https://openstreetmap.org'>OpenStreetMap</a> contributors";
        const osm = L.tileLayer(osmUrl, { attribution: osmAttrib });

        // Gespeicherte Kartenposition laden oder Standardposition setzen
        const savedLat = sessionStorage.getItem("lat");
        const savedLng = sessionStorage.getItem("lng");
        const savedZoom = sessionStorage.getItem("zoom");

        if (savedLat && savedLng && savedZoom) {
            map.setView([parseFloat(savedLat), parseFloat(savedLng)], parseInt(savedZoom));
        } else {
            map.setView([48.303808, 10.974612], 15);
        }

        map.addLayer(osm);
        
        // Kartenposition speichern bei Änderung
        map.on('moveend', function() {
            const center = map.getCenter();
            const zoom = map.getZoom();
            sessionStorage.setItem("lat", center.lat);
            sessionStorage.setItem("lng", center.lng);
            sessionStorage.setItem("zoom", zoom);
        });

        // Location Event Handler
        map.on("locationfound", onLocationFound);
        map.on("locationerror", onLocationError);
    }

    function onLocationFound(e) {
        const radius = Math.min(e.accuracy, 1000); // Maximal 1km Radius

        if (standort) {
            map.removeLayer(standort);
            map.removeLayer(standort_circle);
        }

        standort = L.marker(e.latlng, {
            title: "Ihr Standort"
        });
        standort_circle = L.circle(e.latlng, {
            radius: radius,
            color: 'blue',
            fillColor: '#30f',
            fillOpacity: 0.2
        });

        map.addLayer(standort);
        map.addLayer(standort_circle);
    }

    function onLocationError(e) {
        console.error("Location error:", e.message);
        showNotification("Standort konnte nicht ermittelt werden: " + e.message, "warning");
    }

    function setupEventListeners() {
        // Standort Toggle
        const toggleButton = document.getElementById("toggle-location");
        toggleButton?.addEventListener("click", toggleLocation);

        // Filter Button
        const filterButton = document.getElementById("filter-button");
        filterButton?.addEventListener("click", toggleAbgeholteFilter);

        // Such-Input
        const searchInput = document.getElementById("filter-input");
        searchInput?.addEventListener("input", handleSearch);
    }

    function toggleLocation() {
        const toggleButton = document.getElementById("toggle-location");
        locationEnabled = !locationEnabled;
        
        if (locationEnabled) {
            map.locate({ 
                setView: true, 
                maxZoom: 16,
                enableHighAccuracy: true,
                timeout: 10000
            });
            toggleButton.textContent = "Standort Verbergen";
        } else {
            if (standort) {
                map.removeLayer(standort);
                map.removeLayer(standort_circle);
            }
            toggleButton.textContent = "Standort Anzeigen";
        }
    }

    function toggleAbgeholteFilter() {
        showAbgeholte = !showAbgeholte;
        const filterButton = document.getElementById("filter-button");
        filterButton.textContent = showAbgeholte ? 
            "Abgeholte ausblenden" : "Abgeholte einblenden";
        
        updateDisplay();
    }

    function handleSearch(event) {
        const filter = event.target.value.toLowerCase().trim();
        const rows = document.querySelectorAll("#table_overview tr");

        rows.forEach((row, index) => {
            if (index === rows.length - 1) return; // Summe-Zeile ignorieren
            
            const cells = row.querySelectorAll("td");
            const match = Array.from(cells).some(cell =>
                cell.textContent.toLowerCase().includes(filter)
            );

            row.style.display = match ? "" : "none";
        });
    }

    async function fetchAndDisplayData() {
        try {
            showLoading(true);
            
            const response = await fetch(`${apiBase}get_data.php`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            currentData = data;
            updateDisplay();
            
        } catch (error) {
            console.error("Error fetching data:", error);
            showNotification("Fehler beim Laden der Daten: " + error.message, "error");
        } finally {
            showLoading(false);
        }
    }

    function updateDisplay() {
        updateMap(currentData);
        updateTable(currentData);
    }

    function updateMap(data) {
        markersGroup.clearLayers();

        data.forEach(entry => {
            const icon = entry.status == 0 ? redIcon : greenIcon;
            const marker = L.marker([entry.lat, entry.lng], { icon });
            
            const statusText = entry.status == 0 ? "Nicht Abgeholt" : "Abgeholt";
            const buttonColor = entry.status == 0 ? "btn-danger" : "btn-success";
            const buttonText = entry.status == 0 ? "Als Abgeholt markieren" : "Als Nicht Abgeholt markieren";

            marker.bindPopup(`
                <div class="popup-content">
                    <h6><strong>${escapeHtml(entry.name)}</strong></h6>
                    <p><strong>Tel:</strong> ${escapeHtml(entry.telefonnummer)}<br>
                    <strong>Straße:</strong> ${escapeHtml(entry.strasse)}<br>
                    <strong>Anzahl:</strong> ${entry.cb_anzahl}<br>
                    <strong>Bezahlt:</strong> €${parseFloat(entry.geld).toFixed(2)}<br>
                    <strong>Status:</strong> ${statusText}</p>
                    <button value="${entry.id}" data-status="${entry.status}" 
                            class="btn ${buttonColor} btn-sm btn-status w-100">
                        ${buttonText}
                    </button>
                </div>
            `);

            marker.options.entryId = entry.id;
            markersGroup.addLayer(marker);
        });

        map.addLayer(markersGroup);
        setupMapButtonListeners();
    }

    function updateTable(data) {
        const tableBody = document.getElementById("table_overview");
        if (!tableBody) return;

        let rows = "";
        let summe = 0;
        let anzahlGesamt = 0;
        let displayedCount = 0;

        data.forEach((entry, index) => {
            const color = entry.status == 0 ? "table-danger" : "table-success";
            const shouldShow = entry.status == 0 || showAbgeholte;
            const displayStyle = shouldShow ? "" : "display: none;";
            
            if (shouldShow) {
                displayedCount++;
                summe += parseFloat(entry.geld);
                anzahlGesamt += parseInt(entry.cb_anzahl);
            }

            rows += `
                <tr id="row-${entry.id}" class="${color}" style="${displayStyle}">
                    <th scope="row">${index + 1}</th>
                    <td>${escapeHtml(entry.name)}</td>
                    <td>${escapeHtml(entry.strasse)}</td>
                    <td>${escapeHtml(entry.telefonnummer)}</td>
                    <td>${entry.cb_anzahl}</td>
                    <td>€${parseFloat(entry.geld).toFixed(2)}</td>
                    <td>
                        <div class="btn-group" role="group">
                            <button value="${entry.id}" class="btn btn-sm btn-danger table_del" 
                                    data-name="${escapeHtml(entry.name)}" 
                                    data-strasse="${escapeHtml(entry.strasse)}"
                                    title="Eintrag löschen">
                                Löschen
                            </button>
                            <button value="${entry.id}" data-status="${entry.status}" 
                                    class="btn btn-sm btn-success table_status_abgeholt"
                                    title="Status ändern">
                                ${entry.status == 0 ? "Abgeholt" : "Zurücksetzen"}
                            </button>
                        </div>
                    </td>
                </tr>`;
        });

        // Summenzeile
        rows += `
            <tr class="table-info">
                <th scope="row"><strong>Summe (${displayedCount})</strong></th>
                <td><strong>Gesamt</strong></td>
                <td colspan="2"></td>
                <td><strong>${anzahlGesamt}</strong></td>
                <td><strong>€${summe.toFixed(2)}</strong></td>
                <td></td>
            </tr>`;

        tableBody.innerHTML = rows;
        setupTableButtonListeners();
    }

    function setupTableButtonListeners() {
        // Löschen-Buttons
        document.querySelectorAll(".table_del").forEach(button => {
            button.addEventListener("click", handleDelete);
        });

        // Status-Buttons
        document.querySelectorAll(".table_status_abgeholt").forEach(button => {
            button.addEventListener("click", handleStatusChange);
        });
    }

    function setupMapButtonListeners() {
        map.on("popupopen", function(e) {
            const popupButton = e.popup.getElement().querySelector(".btn-status");
            if (popupButton) {
                popupButton.addEventListener("click", handleStatusChange);
            }
        });
    }

    async function handleDelete(event) {
        const entryId = event.target.value;
        const entryName = event.target.dataset.name;
        const entryStrasse = event.target.dataset.strasse;

        if (!confirm(`Möchten Sie wirklich den Eintrag von "${entryName}, ${entryStrasse}" löschen?`)) {
            return;
        }

        try {
            showLoading(true);
            
            const response = await fetch(`${apiBase}delete.php`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: `id=${encodeURIComponent(entryId)}`,
            });

            const result = await response.json();
            
            if (result.success) {
                showNotification("Eintrag erfolgreich gelöscht", "success");
                await fetchAndDisplayData();
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

    async function handleStatusChange(event) {
        const entryId = event.target.value;
        const currentStatus = parseInt(event.target.dataset.status);
        const newStatus = currentStatus === 0 ? 1 : 0;

        try {
            showLoading(true);
            
            const response = await fetch(`${apiBase}change.php`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: `id=${encodeURIComponent(entryId)}&status=${newStatus}`,
            });

            const result = await response.json();
            
            if (result.success) {
                const statusText = newStatus === 1 ? "abgeholt" : "nicht abgeholt";
                showNotification(`Status erfolgreich auf "${statusText}" geändert`, "success");
                await fetchAndDisplayData();
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

    // Hilfsfunktionen
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showLoading(show) {
        // Einfacher Loading-Indikator
        let loader = document.getElementById('loading-indicator');
        if (show && !loader) {
            loader = document.createElement('div');
            loader.id = 'loading-indicator';
            loader.className = 'position-fixed top-50 start-50 translate-middle';
            loader.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Laden...</span></div>';
            document.body.appendChild(loader);
        } else if (!show && loader) {
            loader.remove();
        }
    }

    function showNotification(message, type = 'info') {
        // Einfache Notification
        const alertClass = {
            'success': 'alert-success',
            'error': 'alert-danger',
            'warning': 'alert-warning',
            'info': 'alert-info'
        }[type] || 'alert-info';

        const notification = document.createElement('div');
        notification.className = `alert ${alertClass} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
        notification.style.zIndex = '9999';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(notification);

        // Auto-remove nach 5 Sekunden
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
});
