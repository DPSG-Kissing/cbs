/**
 * CBS Leaflet Map Manager
 * Version: 2.2.0 (Mit robuster, direkter OpenRouteService-Anbindung)
 */
class CBSMapManager {
    constructor(options = {}) {
        this.options = {
            defaultLat: 48.303808,
            defaultLng: 10.974612,
            defaultZoom: 15,
            maxZoom: 19,
            tileProvider: 'osm',
            enableClustering: true,
            enableGeolocation: true,
            ...options
        };

        this.map = null;
        this.markersGroup = null;
        this.userLocationMarker = null;
        this.routeLayer = null; // Layer für die gezeichnete Route
        this.apiKey = '5b3ce3597851110001cf62486cf2bc15daf74038b2d9f06d44b8f3db';
        
        this.tileProviders = {
            osm: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© OpenStreetMap' },
        };

        this.icons = {
            pending: this.createCustomIcon('#dc3545', 'P'),
            completed: this.createCustomIcon('#198754', '✓'),
            user: this.createCustomIcon('#0d6efd', '●'),
            route: this.createCustomIcon('#ffc107', '🏁')
        };
        
        this.eventHandlers = new Map();
    }

    async init(containerId) {
        try {
            this.map = L.map(containerId, {
                center: [this.options.defaultLat, this.options.defaultLng],
                zoom: this.options.defaultZoom,
            });
            this.setTileProvider(this.options.tileProvider);
            if (this.options.enableClustering) this.initMarkerClustering();
            if (this.options.enableGeolocation) this.initGeolocation();
            this.setupEventListeners();
        } catch (error) {
            console.error("Karten-Initialisierung fehlgeschlagen:", error);
            document.getElementById(containerId).innerHTML = '<div class="alert alert-danger">Karte konnte nicht geladen werden.</div>';
        }
    }

    createCustomIcon(color, symbol) {
        const svgIcon = `<svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg"><path fill="${color}" stroke="#fff" stroke-width="1" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 12.5 12.5 28.5 12.5 28.5s12.5-16 12.5-28.5C25 5.6 19.4 0 12.5 0z"/><text x="12.5" y="19" font-size="14" font-family="Arial, sans-serif" fill="white" text-anchor="middle" font-weight="bold">${symbol}</text></svg>`;
        return L.divIcon({ html: svgIcon, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], className: '' });
    }

    setTileProvider(key) {
        if (this.currentTileLayer) this.map.removeLayer(this.currentTileLayer);
        const provider = this.tileProviders[key];
        if (provider) {
            this.currentTileLayer = L.tileLayer(provider.url, { attribution: provider.attribution }).addTo(this.map);
        }
    }

    initMarkerClustering() {
        this.markersGroup = L.markerClusterGroup();
        this.map.addLayer(this.markersGroup);
    }

    initGeolocation() {
        this.map.on('locationfound', e => this.updateUserLocation(e.latlng));
        this.map.on('locationerror', e => alert(`Standortfehler: ${e.message}`));
    }
    
    addMarker(lat, lng, data) {
        const icon = this.icons[data.status == 1 ? 'completed' : 'pending'];
        const marker = L.marker([lat, lng], { icon: icon, title: data.name });
        marker.bindPopup(this.createPopupContent(data));
        (this.markersGroup || this.map).addLayer(marker);
    }
    
    createPopupContent(data) {
        const statusText = data.status == 1 ? 'Abgeholt' : 'Nicht abgeholt';
        return `<h6>${this.escapeHtml(data.name)}</h6><p class="mb-1"><small>${this.escapeHtml(data.strasse)}</small></p><span class="badge bg-${data.status == 1 ? 'success' : 'danger'}">${statusText}</span><button class="btn btn-sm btn-outline-primary mt-2 w-100 cbs-route-btn" data-lat="${data.lat}" data-lng="${data.lng}">🗺️ Route hierhin</button>`;
    }

    updateUserLocation(latlng) {
        if (!this.userLocationMarker) {
            this.userLocationMarker = L.marker(latlng, { icon: this.icons.user, zIndexOffset: 1000 }).addTo(this.map);
        } else {
            this.userLocationMarker.setLatLng(latlng);
        }
        this.map.setView(latlng, 16);
    }

    startLocationTracking() {
        this.map.locate({ watch: true });
    }

    stopLocationTracking() {
        this.map.stopLocate();
        if (this.userLocationMarker) {
            this.map.removeLayer(this.userLocationMarker);
            this.userLocationMarker = null;
        }
    }

    clearMarkers() {
        this.markersGroup?.clearLayers();
    }
    
    fitToMarkers(padding = [40, 40]) {
        if (this.markersGroup && this.markersGroup.getLayers().length > 0) {
            this.map.fitBounds(this.markersGroup.getBounds(), { padding });
        }
    }
    
    setupEventListeners() {
        this.map.on('popupopen', e => {
            const routeBtn = e.popup.getElement().querySelector('.cbs-route-btn');
            routeBtn?.addEventListener('click', () => {
                this.showRoute(routeBtn.dataset.lat, routeBtn.dataset.lng);
            });
        });
    }

    async showRoute(lat, lng) {
        if (!this.userLocationMarker) {
            alert('Bitte zuerst den eigenen Standort über den "Standort anzeigen"-Button aktivieren.');
            return;
        }

        if (this.routeLayer) {
            this.map.removeLayer(this.routeLayer);
        }
        
        const start = this.userLocationMarker.getLatLng();
        const end = L.latLng(lat, lng);
        const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${this.apiKey}&start=${start.lng},${start.lat}&end=${end.lng},${end.lat}`;

        // Visuelles Feedback für den Nutzer
        const tempPopup = L.popup().setLatLng(end).setContent('Route wird berechnet...').openOn(this.map);

        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json();
                console.error("OpenRouteService Fehler:", errorData);
                throw new Error(`Fehler vom Routen-Service (Code: ${response.status}). Prüfen Sie die Browser-Konsole.`);
            }
            const data = await response.json();
            
            if (!data.features || data.features.length === 0) {
                throw new Error("Keine Route vom Service zurückgegeben.");
            }

            const coordinates = data.features[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
            this.routeLayer = L.layerGroup().addTo(this.map);

            L.polyline(coordinates, { color: '#0d6efd', weight: 5, opacity: 0.7 }).addTo(this.routeLayer);
            L.marker(start, { icon: this.icons.user }).addTo(this.routeLayer).bindPopup('Start');
            L.marker(end, { icon: this.icons.route }).addTo(this.routeLayer).bindPopup('Ziel');

            this.map.fitBounds(L.polyline(coordinates).getBounds(), { padding: [50, 50] });

        } catch (error) {
            alert(`Routing fehlgeschlagen: ${error.message}`);
        } finally {
            this.map.closePopup(tempPopup);
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
}