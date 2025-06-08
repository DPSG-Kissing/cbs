jQuery(document).ready(function ($) {
    // Globale Variablen für Karte, API-Schlüssel und die Route
    let map;
    const apiKey = '5b3ce3597851110001cf62486cf2bc15daf74038b2d9f06d44b8f3db';
    let routeLayer = null;

    /**
     * Initialisiert die Leaflet-Karte.
     */
    function initializeMap() {
        try {
            map = L.map('route_map').setView([48.303808, 10.974612], 13); // Startansicht auf Kissing

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
                maxZoom: 19
            }).addTo(map);

            console.log('Karte für Routenplanung initialisiert.');
        } catch (error) {
            console.error('Fehler bei der Karten-Initialisierung:', error);
            $('#route_map').html('<div class="alert alert-danger">Karte konnte nicht geladen werden.</div>');
        }
    }

    /**
     * Führt eine GET-Anfrage aus, um die Anmeldungsdaten zu holen.
     * @param {string} path - Der Pfad zum Backend-Skript.
     * @returns {Promise<Array>} - Ein Promise, das die Daten der Anmeldungen zurückgibt.
     */
    function getAnmeldungen(path) {
        return axios.get(path).then(response => response.data);
    }

    /**
     * Berechnet die optimale Route über den OpenRouteService.
     * @param {Array} jobs - Eine Liste von Orten (Bäumen), die besucht werden sollen.
     * @returns {Promise<Object>} - Ein Promise, das die berechnete Route zurückgibt.
     */
    async function calculateRoute(jobs) {
        // Annahme: Es gibt nur ein Fahrzeug, das am ersten Punkt startet.
        const vehicle = {
            id: 1,
            profile: 'driving-car',
            start: jobs[0].location, // Startet beim ersten Baum
            end: jobs[0].location    // Kehrt zum ersten Baum zurück
        };

        const requestPayload = {
            jobs: jobs,
            vehicles: [vehicle],
            options: {
                g: true // Geometrie der Route zurückgeben
            }
        };

        try {
            const response = await axios.post('https://api.openrouteservice.org/optimization', requestPayload, {
                headers: {
                    'Authorization': apiKey,
                    'Content-Type': 'application/json',
                }
            });
            console.log('Routenberechnung erfolgreich:', response.data);
            return response.data;
        } catch (error) {
            console.error('Fehler bei der Routenberechnung:', error.response ? error.response.data : error.message);
            throw new Error('Die Route konnte nicht berechnet werden. Prüfen Sie die API-Konsole.');
        }
    }

    /**
     * Zeichnet die berechnete Route und die Stopps auf der Karte.
     * @param {Object} routeData - Die von der API zurückgegebene Route.
     */
    function displayRoute(routeData) {
        if (!routeData || !routeData.routes || routeData.routes.length === 0) {
            alert('Keine gültige Route gefunden.');
            return;
        }

        // Vorherige Routen-Layer entfernen
        if (routeLayer) {
            map.removeLayer(routeLayer);
        }
        routeLayer = L.layerGroup().addTo(map);

        const route = routeData.routes[0];
        const geometry = route.geometry;

        // Die Geometrie ist ein Polyline-kodierter String, den wir dekodieren müssen.
        // Leaflet hat keine eingebaute Funktion, daher hier eine Standard-Implementierung.
        const decodedPolyline = L.Polyline.fromEncoded(geometry).getLatLngs();

        // Route als Linie auf der Karte zeichnen
        L.polyline(decodedPolyline, {
            color: '#0d6efd',
            weight: 5,
            opacity: 0.7
        }).addTo(routeLayer);

        // Marker für jeden Stopp in der optimierten Reihenfolge setzen
        route.steps.forEach((step, index) => {
            if (step.type === 'job') {
                const location = [step.location[1], step.location[0]];
                L.marker(location)
                    .addTo(routeLayer)
                    .bindPopup(`<b>Stopp ${index}:</b><br>Anmeldung ID: ${step.id}`)
                    .bindTooltip(`Stopp ${index}`, { permanent: false, direction: 'top' });
            }
        });

        // Karte auf die Route zoomen
        map.fitBounds(L.polyline(decodedPolyline).getBounds(), { padding: [50, 50] });
    }

    /**
     * Hauptfunktion: Holt Daten, berechnet die Route und zeigt sie an.
     */
    async function main() {
        initializeMap();
        
        try {
            // Zeige Ladeindikator
            $('#route_map').append('<div id="loading-overlay" class="d-flex justify-content-center align-items-center" style="position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.7); z-index:1000;"><div class="spinner-border text-primary" role="status"><span class="sr-only">Lade...</span></div></div>');

            const anmeldungen = await getAnmeldungen('../backend/get_data.php');

            // Nur nicht abgeholte Bäume für die Routenplanung berücksichtigen
            const jobs = anmeldungen
                .filter(anmeldung => anmeldung.status == 0 && anmeldung.lat && anmeldung.lng)
                .map(anmeldung => ({
                    id: anmeldung.id,
                    location: [parseFloat(anmeldung.lng), parseFloat(anmeldung.lat)]
                }));

            if (jobs.length < 2) {
                alert('Nicht genügend (mind. 2) nicht abgeholte Bäume für eine Routenplanung vorhanden.');
                $('#loading-overlay').remove();
                return;
            }

            const routeData = await calculateRoute(jobs);
            displayRoute(routeData);

        } catch (error) {
            console.error(error);
            alert(error.message);
        } finally {
            // Ladeindikator entfernen
            $('#loading-overlay').remove();
        }
    }

    // Authentifizierung prüfen und Hauptfunktion starten
    checkCookie(); // Stellt sicher, dass der Benutzer eingeloggt ist (aus auth.js)
    main();
});