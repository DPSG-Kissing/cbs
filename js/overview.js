document.addEventListener("DOMContentLoaded", function() {
    let map;
    let standort;
    let standort_circle;
    let locationEnabled = false; // Zustand der Standortanzeige
    const apiBase = "https://cbs.pfadfinder-kissing.de/backend/";

    const redIcon = new L.Icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
    });

    const greenIcon = new L.Icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
    });

    let markersGroup = L.markerClusterGroup({ maxClusterRadius: 50, zoomToBoundsOnClick: true });
    let showAbgeholte = false; // Zustand für "Abgeholte einblenden"

    make_map();
    setupLocationToggle();
    setupFilterButton();
    setupSearchInput();
    fetchAndDisplayData();

    function make_map() {
        map = L.map("overview_map");
        const osmUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
        const osmAttrib = "Map data © <a href='https://openstreetmap.org'>OpenStreetMap</a> contributors";
        const osm = new L.TileLayer(osmUrl, { attribution: osmAttrib });

        if (sessionStorage.getItem("lat") && sessionStorage.getItem("lng") && sessionStorage.getItem("zoom")) {
            map.setView(
                new L.LatLng(sessionStorage.getItem("lat"), sessionStorage.getItem("lng")),
                sessionStorage.getItem("zoom")
            );
        } else {
            map.setView(new L.LatLng(48.303808, 10.974612), 15);
        }

        map.addLayer(osm);
        map.on("locationfound", onLocationFound);
        map.on("locationerror", onLocationError);
    }

    function onLocationFound(e) {
        const radius = e.accuracy;

        if (standort) {
            map.removeLayer(standort);
            map.removeLayer(standort_circle);
        }

        standort = L.marker(e.latlng);
        standort_circle = L.circle(e.latlng, radius);

        map.addLayer(standort);
        map.addLayer(standort_circle);
    }

    function onLocationError(e) {
        alert(e.message);
    }

    function setupLocationToggle() {
        const toggleButton = document.getElementById("toggle-location");
        toggleButton.addEventListener("click", () => {
            locationEnabled = !locationEnabled;
            if (locationEnabled) {
                map.locate({ setView: true, maxZoom: 10 });
                toggleButton.textContent = "Standort Verbergen";
            } else {
                if (standort) {
                    map.removeLayer(standort);
                    map.removeLayer(standort_circle);
                }
                toggleButton.textContent = "Standort Anzeigen";
            }
        });
    }

    async function fetchAndDisplayData() {
        try {
            const response = await fetch(`${apiBase}get_data.php`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            });

            if (!response.ok) throw new Error("Fehler beim Abrufen der Daten");

            const data = await response.json();
            updateMap(data);
            updateTable(data);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    }

    function updateMap(data) {
        markersGroup.clearLayers(); // Alte Marker entfernen

        data.forEach((entry) => {
            const icon = entry.status == 0 ? redIcon : greenIcon;

            const marker = L.marker([entry.lat, entry.lng], { icon });
            const buttonColor = entry.status == 0 ? "btn-danger" : "btn-success";

            marker.bindPopup(
                `<b>Name: ${entry.name}</b><br>
                Tel: ${entry.telefonnummer}<br>
                Straße: ${entry.strasse}<br>
                <p>Anzahl: ${entry.cb_anzahl}</p>
                <button value="${entry.id}" data-status="${entry.status}" class="btn ${buttonColor} btn-status">
                    ${entry.status == 0 ? "Abgeholt" : "Nicht Abgeholt"}
                </button>`
            );

            marker.options.id = entry.id; // ID für Updates speichern
            markersGroup.addLayer(marker);
        });

        map.addLayer(markersGroup);
        setupMapButtonListeners(); // Popup-Button-Listener erneut setzen
    }

    function updateTable(data) {
        const tableBody = document.getElementById("table_overview");
        let rows = "";
        let summe = 0;
        let anzahlGesamt = 0;

        data.forEach((entry, index) => {
            const color = entry.status == 0 ? "table-danger" : "table-success";
            const displayStyle = entry.status == 0 || showAbgeholte ? "" : "display: none;";
            summe += parseFloat(entry.geld);
            anzahlGesamt += parseInt(entry.cb_anzahl);

            rows += `
                <tr id="${index}" class="${color}" style="${displayStyle}">
                    <th scope="row">${index + 1}</th>
                    <td>${entry.name}</td>
                    <td>${entry.strasse}</td>
                    <td>${entry.telefonnummer}</td>
                    <td>${entry.cb_anzahl}</td>
                    <td>${parseFloat(entry.geld).toFixed(2)}€</td>
                    <td>
                        <button value="${entry.id}" class="btn btn-danger table_del" data-name="${entry.name}" data-strasse="${entry.strasse}">Löschen</button>
                        <button value="${entry.id}" data-status="${entry.status}" class="btn btn-success table_status_abgeholt">Abgeholt</button>
                    </td>
                </tr>`;
        });

        rows += `
            <tr class="table-success">
                <th scope="row"></th>
                <td>Summe</td>
                <td></td>
                <td></td>
                <td>${anzahlGesamt}</td>
                <td>${summe.toFixed(2)}€</td>
                <td></td>
            </tr>`;

        tableBody.innerHTML = rows;
        setupButtonListeners(); // Button-Listener erneut setzen
    }

    function setupFilterButton() {
        const filterButton = document.getElementById("filter-button");
        filterButton.addEventListener("click", () => {
            showAbgeholte = !showAbgeholte;
            fetchAndDisplayData(); // Tabelle aktualisieren
        });
    }

    function setupSearchInput() {
        const searchInput = document.getElementById("filter-input");
        searchInput.addEventListener("input", function() {
            const filter = this.value.toLowerCase();
            const rows = document.querySelectorAll("#table_overview tr");

            rows.forEach((row, index) => {
                if (index === rows.length - 1) return; // Summe-Zeile ignorieren
                const cells = row.querySelectorAll("td");
                const match = Array.from(cells).some((cell) =>
                    cell.textContent.toLowerCase().includes(filter)
                );

                row.style.display = match ? "" : "none";
            });
        });
    }

    function setupButtonListeners() {
        // Event-Listener für "Löschen"-Button
        document.querySelectorAll(".table_del").forEach((button) => {
            button.addEventListener("click", async function() {
                const entryId = this.value;
                const entryName = this.dataset.name;
                const entryStrasse = this.dataset.strasse;

                if (confirm(`Möchten Sie wirklich den Eintrag von "${entryName}, ${entryStrasse}" löschen?`)) {
                    try {
                        const response = await fetch(`${apiBase}delete.php`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/x-www-form-urlencoded",
                            },
                            body: `id=${entryId}`,
                        });

                        if (!response.ok) throw new Error("Fehler beim Löschen des Eintrags");

                        const result = await response.json();
                        if (result.success) {
                            fetchAndDisplayData(); // Aktualisieren der Karte und Tabelle
                        } else {
                            console.error(result.message || "Löschen fehlgeschlagen");
                        }
                    } catch (error) {
                        console.error("Fehler beim Löschen des Eintrags:", error);
                    }
                }
            });
        });

        // Event-Listener für "Status ändern"-Button
        document.querySelectorAll(".table_status_abgeholt").forEach((button) => {
            button.addEventListener("click", async function() {
                const entryId = this.value;
                const currentStatus = parseInt(this.dataset.status);
                const newStatus = currentStatus === 0 ? 1 : 0;

                try {
                    const response = await fetch(`${apiBase}change.php`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                        body: `id=${entryId}&status=${newStatus}`,
                    });

                    if (!response.ok) throw new Error("Fehler beim Ändern des Status");

                    const result = await response.json();
                    if (result.success) {
                        fetchAndDisplayData(); // Karte und Tabelle aktualisieren
                    } else {
                        console.error(result.message || "Statusänderung fehlgeschlagen");
                    }
                } catch (error) {
                    console.error("Fehler beim Ändern des Status:", error);
                }
            });
        });
    }


    function setupMapButtonListeners() {
        map.on("popupopen", function(e) {
            const popupButton = e.popup.getElement().querySelector(".btn-status");
            if (popupButton) {
                popupButton.addEventListener("click", async function() {
                    const entryId = this.value;
                    const currentStatus = parseInt(this.dataset.status);
                    const newStatus = currentStatus === 0 ? 1 : 0;

                    try {
                        const response = await fetch(`${apiBase}change.php`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/x-www-form-urlencoded",
                            },
                            body: `id=${entryId}&status=${newStatus}`,
                        });

                        if (!response.ok) throw new Error("Fehler beim Ändern des Status");

                        const result = await response.json();
                        if (result.success) {
                            fetchAndDisplayData(); // Karte und Tabelle aktualisieren
                        } else {
                            console.error(result.message || "Statusänderung fehlgeschlagen");
                        }
                    } catch (error) {
                        console.error("Fehler beim Ändern des Status:", error);
                    }
                });
            }
        });
    }
});