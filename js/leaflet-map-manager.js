/**
 * CBS Leaflet Map Manager
 * Moderne Karten-Verwaltung für das Christbaum-Sammlung Tool
 * Version: 2.cbs-layer-modal-content {
    background: white;
    border-radius: 8px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow: auto;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}

.cbs-layer-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #dee2e6;
}

.cbs-layer-modal-header h3 {
    margin: 0;
    font-size: 1.25rem;
}

.cbs-layer-close {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #6c757d;
}

.cbs-layer-modal-body {
    padding: 16px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 12px;
}

.cbs-layer-option {
    border: 2px solid #dee2e6;
    border-radius: 8px;
    padding: 8px;
    cursor: pointer;
    text-align: center;
    transition: all 0.2s ease;
}

.cbs-layer-option:hover {
    border-color: #0d6efd;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.cbs-layer-option.active {
    border-color: #0d6efd;
    background: #e7f3ff;
}

.cbs-layer-preview {
    width: 100%;
    height: 60px;
    background-size: cover;
    background-position: center;
    border-radius: 4px;
    margin-bottom: 8px;
    background-color: #f8f9fa;
}

.cbs-layer-name {
    font-size: 0.875rem;
    font-weight: 500;
}

.cbs-tooltip {
    background: rgba(0,0,0,0.8);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.875rem;
    padding: 4px 8px;
}

@media (max-width: 768px) {
    .cbs-popup-actions {
        flex-direction: column;
    }
    
    .cbs-layer-modal-body {
        grid-template-columns: repeat(2, 1fr);
    }
}
`;

// Export the CBSMapManager class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CBSMapManager;
} else if (typeof window !== 'undefined') {
    window.CBSMapManager = CBSMapManager;
}

/**
 * Usage Example:
 * 
 * // Initialize the map
 * const mapManager = new CBSMapManager({
 *     enableGeolocation: true,
 *     enableClustering: true,
 *     enableRouting: true,
 *     tileProvider: 'osm'
 * });
 * 
 * // Initialize map in container
 * await mapManager.init('mapid');
 * 
 * // Add event listeners
 * mapManager.on('statusChange', (data) => {
 *     console.log('Status change requested:', data);
 *     // Handle status change API call
 * });
 * 
 * mapManager.on('locationFound', (data) => {
 *     console.log('User location found:', data.latlng);
 * });
 * 
 * // Add markers
 * const markerData = {
 *     id: 1,
 *     name: 'Max Mustermann',
 *     strasse: 'Hauptstraße 1',
 *     telefonnummer: '08233123456',
 *     cb_anzahl: 2,
 *     geld: 8.00,
 *     status: 0,
 *     lat: 48.303808,
 *     lng: 10.974612
 * };
 * 
 * mapManager.addMarker(
 *     markerData.lat, 
 *     markerData.lng, 
 *     markerData
 * );
 * 
 * // Start location tracking
 * mapManager.startLocationTracking();
 * 
 * // Fit map to all markers
 * mapManager.fitToMarkers();
 */0.0
 * 
 * Features:
 * - Multi-Provider Tile Support
 * - Advanced Marker Clustering
 * - Real-time Location Tracking
 * - Route Planning Integration
 * - Offline Support
 * - Touch Gestures
 * - Accessibility Support
 */

class CBSMapManager {
    constructor(options = {}) {
        this.options = {
            // Default Kissing coordinates
            defaultLat: 48.303808,
            defaultLng: 10.974612,
            defaultZoom: 15,
            maxZoom: 19,
            minZoom: 8,
            
            // Map providers
            tileProvider: 'osm', // osm, satellite, terrain
            enableClustering: true,
            clusterRadius: 50,
            
            // Features
            enableGeolocation: true,
            enableOffline: false,
            enableRouting: false,
            enableDrawing: false,
            
            // Performance
            preferCanvas: true,
            updateWhenIdle: true,
            updateWhenZooming: false,
            
            // Accessibility
            keyboard: true,
            worldCopyJump: false,
            
            ...options
        };

        this.map = null;
        this.markersGroup = null;
        this.userLocationMarker = null;
        this.userLocationCircle = null;
        this.routeControl = null;
        this.drawControl = null;
        
        // Tile layer providers
        this.tileProviders = {
            osm: {
                url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
                maxZoom: 19
            },
            osmDE: {
                url: 'https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png',
                attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
                maxZoom: 18
            },
            satellite: {
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                attribution: '© <a href="https://www.esri.com/">Esri</a>, DigitalGlobe, GeoEye, Earthstar Geographics',
                maxZoom: 17
            },
            terrain: {
                url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
                attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors, © <a href="http://viewfinderpanoramas.org">SRTM</a>',
                maxZoom: 17
            },
            cartodb: {
                url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
                maxZoom: 19
            }
        };

        // Custom icons
        this.icons = {
            pending: this.createCustomIcon('#dc3545', 'pending'),
            completed: this.createCustomIcon('#198754', 'completed'),
            user: this.createCustomIcon('#0d6efd', 'user'),
            route: this.createCustomIcon('#ffc107', 'route')
        };

        this.eventHandlers = new Map();
        this.isInitialized = false;
    }

    /**
     * Initialize the map
     */
    async init(containerId) {
        try {
            if (this.isInitialized) {
                console.warn('Map already initialized');
                return this.map;
            }

            // Create map instance
            this.map = L.map(containerId, {
                center: [this.options.defaultLat, this.options.defaultLng],
                zoom: this.options.defaultZoom,
                maxZoom: this.options.maxZoom,
                minZoom: this.options.minZoom,
                preferCanvas: this.options.preferCanvas,
                updateWhenIdle: this.options.updateWhenIdle,
                updateWhenZooming: this.options.updateWhenZooming,
                keyboard: this.options.keyboard,
                worldCopyJump: this.options.worldCopyJump,
                zoomControl: false // We'll add custom controls
            });

            // Add custom zoom control
            this.addZoomControl();

            // Add tile layer
            this.setTileProvider(this.options.tileProvider);

            // Initialize marker clustering
            if (this.options.enableClustering) {
                this.initMarkerClustering();
            }

            // Initialize geolocation
            if (this.options.enableGeolocation) {
                this.initGeolocation();
            }

            // Initialize routing
            if (this.options.enableRouting) {
                await this.initRouting();
            }

            // Initialize drawing tools
            if (this.options.enableDrawing) {
                await this.initDrawing();
            }

            // Initialize offline support
            if (this.options.enableOffline) {
                await this.initOfflineSupport();
            }

            // Add scale control
            L.control.scale({
                position: 'bottomleft',
                metric: true,
                imperial: false
            }).addTo(this.map);

            // Load saved map state
            this.loadMapState();

            // Setup event listeners
            this.setupEventListeners();

            this.isInitialized = true;
            this.emit('mapInitialized', { map: this.map });

            return this.map;

        } catch (error) {
            console.error('Failed to initialize map:', error);
            throw new Error(`Map initialization failed: ${error.message}`);
        }
    }

    /**
     * Create custom icon
     */
    createCustomIcon(color, type) {
        const svgIcon = `
            <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
                <path fill="${color}" stroke="#fff" stroke-width="2" 
                      d="M12.5 0C5.6 0 0 5.6 0 12.5c0 12.5 12.5 28.5 12.5 28.5s12.5-16 12.5-28.5C25 5.6 19.4 0 12.5 0z"/>
                <circle fill="#fff" cx="12.5" cy="12.5" r="6"/>
                ${this.getIconSymbol(type)}
            </svg>
        `;

        return L.divIcon({
            html: svgIcon,
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            className: `cbs-marker cbs-marker-${type}`
        });
    }

    /**
     * Get icon symbol based on type
     */
    getIconSymbol(type) {
        const symbols = {
            pending: '<text x="12.5" y="17" text-anchor="middle" fill="#dc3545" font-size="12" font-weight="bold">!</text>',
            completed: '<text x="12.5" y="17" text-anchor="middle" fill="#198754" font-size="10">✓</text>',
            user: '<circle fill="#0d6efd" cx="12.5" cy="12.5" r="3"/>',
            route: '<text x="12.5" y="17" text-anchor="middle" fill="#ffc107" font-size="8">🚚</text>'
        };
        return symbols[type] || '';
    }

    /**
     * Add custom zoom control
     */
    addZoomControl() {
        const customZoomControl = L.control.zoom({
            position: 'topright'
        });

        // Add layer switcher
        const layerControl = L.control({
            position: 'topright'
        });

        layerControl.onAdd = () => {
            const div = L.DomUtil.create('div', 'leaflet-bar cbs-layer-control');
            div.innerHTML = `
                <a href="#" title="Kartenstil ändern" role="button" aria-label="Kartenstil ändern">
                    <span class="cbs-layer-icon">🗺️</span>
                </a>
            `;

            L.DomEvent.on(div, 'click', (e) => {
                L.DomEvent.stopPropagation(e);
                L.DomEvent.preventDefault(e);
                this.showLayerSwitcher();
            });

            return div;
        };

        customZoomControl.addTo(this.map);
        layerControl.addTo(this.map);
    }

    /**
     * Show layer switcher modal
     */
    showLayerSwitcher() {
        const modal = document.createElement('div');
        modal.className = 'cbs-layer-modal';
        modal.innerHTML = `
            <div class="cbs-layer-modal-content">
                <div class="cbs-layer-modal-header">
                    <h3>Kartenstil auswählen</h3>
                    <button class="cbs-layer-close">&times;</button>
                </div>
                <div class="cbs-layer-modal-body">
                    ${Object.entries(this.tileProviders).map(([key, provider]) => `
                        <div class="cbs-layer-option ${key === this.options.tileProvider ? 'active' : ''}" 
                             data-provider="${key}">
                            <div class="cbs-layer-preview" style="background-image: url('${this.getPreviewImage(key)}')"></div>
                            <div class="cbs-layer-name">${this.getProviderName(key)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('.cbs-layer-close').onclick = () => modal.remove();
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        modal.querySelectorAll('.cbs-layer-option').forEach(option => {
            option.onclick = () => {
                const provider = option.dataset.provider;
                this.setTileProvider(provider);
                modal.remove();
            };
        });
    }

    /**
     * Set tile provider
     */
    setTileProvider(providerKey) {
        if (this.currentTileLayer) {
            this.map.removeLayer(this.currentTileLayer);
        }

        const provider = this.tileProviders[providerKey];
        if (!provider) {
            console.error('Unknown tile provider:', providerKey);
            return;
        }

        this.currentTileLayer = L.tileLayer(provider.url, {
            attribution: provider.attribution,
            maxZoom: provider.maxZoom,
            crossOrigin: true
        });

        this.currentTileLayer.addTo(this.map);
        this.options.tileProvider = providerKey;
        this.saveMapState();
    }

    /**
     * Initialize marker clustering
     */
    initMarkerClustering() {
        this.markersGroup = L.markerClusterGroup({
            maxClusterRadius: this.options.clusterRadius,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: true,
            zoomToBoundsOnClick: true,
            removeOutsideVisibleBounds: true,
            animate: true,
            animateAddingMarkers: true,
            iconCreateFunction: (cluster) => {
                const count = cluster.getChildCount();
                let size = 'small';
                
                if (count > 100) size = 'large';
                else if (count > 10) size = 'medium';

                return L.divIcon({
                    html: `<div class="cbs-cluster-inner">${count}</div>`,
                    className: `cbs-cluster cbs-cluster-${size}`,
                    iconSize: [40, 40]
                });
            }
        });

        this.map.addLayer(this.markersGroup);
    }

    /**
     * Initialize geolocation
     */
    initGeolocation() {
        this.map.on('locationfound', (e) => {
            this.updateUserLocation(e.latlng, e.accuracy);
            this.emit('locationFound', e);
        });

        this.map.on('locationerror', (e) => {
            console.warn('Location error:', e.message);
            this.emit('locationError', e);
        });
    }

    /**
     * Initialize routing (requires additional plugin)
     */
    async initRouting() {
        try {
            // Check if routing plugin is available
            if (typeof L.Routing === 'undefined') {
                console.warn('Leaflet Routing plugin not loaded. Loading dynamically...');
                await this.loadRoutingPlugin();
            }

            this.routeControl = L.Routing.control({
                waypoints: [],
                routeWhileDragging: false,
                addWaypoints: false,
                createMarker: () => null, // Don't create default markers
                lineOptions: {
                    styles: [
                        { color: '#0d6efd', weight: 6, opacity: 0.7 },
                        { color: '#ffffff', weight: 2, opacity: 1 }
                    ]
                }
            });

        } catch (error) {
            console.error('Failed to initialize routing:', error);
        }
    }

    /**
     * Initialize drawing tools (requires additional plugin)
     */
    async initDrawing() {
        try {
            if (typeof L.Draw === 'undefined') {
                console.warn('Leaflet Draw plugin not loaded. Loading dynamically...');
                await this.loadDrawPlugin();
            }

            const drawnItems = new L.FeatureGroup();
            this.map.addLayer(drawnItems);

            this.drawControl = new L.Control.Draw({
                edit: {
                    featureGroup: drawnItems
                },
                draw: {
                    polygon: true,
                    polyline: true,
                    rectangle: true,
                    circle: true,
                    marker: true,
                    circlemarker: false
                }
            });

            this.map.addControl(this.drawControl);

        } catch (error) {
            console.error('Failed to initialize drawing tools:', error);
        }
    }

    /**
     * Initialize offline support
     */
    async initOfflineSupport() {
        try {
            // Simple offline tile caching
            if ('serviceWorker' in navigator && 'caches' in window) {
                const cacheName = 'cbs-map-tiles';
                this.tileCache = await caches.open(cacheName);
                
                // Intercept tile requests for caching
                this.map.on('tileload', (e) => {
                    this.cacheTile(e.tile.src);
                });
            }
        } catch (error) {
            console.error('Failed to initialize offline support:', error);
        }
    }

    /**
     * Add marker to map
     */
    addMarker(lat, lng, data = {}, options = {}) {
        const markerOptions = {
            icon: this.icons[data.status === 1 ? 'completed' : 'pending'],
            title: data.name || 'Anmeldung',
            alt: data.name || 'Christbaum-Anmeldung',
            riseOnHover: true,
            ...options
        };

        const marker = L.marker([lat, lng], markerOptions);
        
        // Add popup
        if (data) {
            const popupContent = this.createPopupContent(data);
            marker.bindPopup(popupContent, {
                maxWidth: 300,
                className: 'cbs-popup'
            });
        }

        // Add tooltip
        if (data.name) {
            marker.bindTooltip(data.name, {
                direction: 'top',
                offset: [0, -40],
                className: 'cbs-tooltip'
            });
        }

        // Store data on marker
        marker.cbsData = data;

        // Add to cluster group or map
        if (this.markersGroup) {
            this.markersGroup.addLayer(marker);
        } else {
            marker.addTo(this.map);
        }

        return marker;
    }

    /**
     * Create popup content
     */
    createPopupContent(data) {
        const statusText = data.status === 1 ? 'Abgeholt' : 'Nicht abgeholt';
        const statusClass = data.status === 1 ? 'success' : 'danger';
        
        return `
            <div class="cbs-popup-content">
                <div class="cbs-popup-header">
                    <h6 class="mb-1">${this.escapeHtml(data.name || 'Unbekannt')}</h6>
                    <span class="badge bg-${statusClass}">${statusText}</span>
                </div>
                <div class="cbs-popup-body">
                    <p class="mb-1"><strong>📍</strong> ${this.escapeHtml(data.strasse || 'Keine Adresse')}</p>
                    <p class="mb-1"><strong>📞</strong> ${this.escapeHtml(data.telefonnummer || 'Keine Nummer')}</p>
                    <p class="mb-1"><strong>🎄</strong> ${data.cb_anzahl || 1} Bäume</p>
                    <p class="mb-2"><strong>💰</strong> €${parseFloat(data.geld || 0).toFixed(2)}</p>
                </div>
                <div class="cbs-popup-actions">
                    <button class="btn btn-sm btn-outline-primary cbs-route-btn" 
                            data-lat="${data.lat}" data-lng="${data.lng}"
                            title="Route hierhin">
                        🗺️ Route
                    </button>
                    <button class="btn btn-sm btn-outline-${statusClass} cbs-status-btn" 
                            data-id="${data.id}" data-status="${data.status}"
                            title="Status ändern">
                        ${data.status === 1 ? '↩️ Zurücksetzen' : '✅ Abholen'}
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Update user location
     */
    updateUserLocation(latlng, accuracy = null) {
        // Remove existing location markers
        if (this.userLocationMarker) {
            this.map.removeLayer(this.userLocationMarker);
        }
        if (this.userLocationCircle) {
            this.map.removeLayer(this.userLocationCircle);
        }

        // Add new location marker
        this.userLocationMarker = L.marker(latlng, {
            icon: this.icons.user,
            title: 'Ihr Standort',
            zIndexOffset: 1000
        }).addTo(this.map);

        // Add accuracy circle if provided
        if (accuracy) {
            this.userLocationCircle = L.circle(latlng, {
                radius: Math.min(accuracy, 1000),
                color: '#0d6efd',
                fillColor: '#0d6efd',
                fillOpacity: 0.1,
                weight: 2
            }).addTo(this.map);
        }
    }

    /**
     * Start location tracking
     */
    startLocationTracking() {
        if (!this.options.enableGeolocation) {
            console.warn('Geolocation not enabled');
            return;
        }

        this.map.locate({
            watch: true,
            setView: false,
            maxZoom: 16,
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        });
    }

    /**
     * Stop location tracking
     */
    stopLocationTracking() {
        this.map.stopLocate();
        
        if (this.userLocationMarker) {
            this.map.removeLayer(this.userLocationMarker);
            this.userLocationMarker = null;
        }
        if (this.userLocationCircle) {
            this.map.removeLayer(this.userLocationCircle);
            this.userLocationCircle = null;
        }
    }

    /**
     * Clear all markers
     */
    clearMarkers() {
        if (this.markersGroup) {
            this.markersGroup.clearLayers();
        }
    }

    /**
     * Fit map to markers
     */
    fitToMarkers(padding = [20, 20]) {
        if (this.markersGroup && this.markersGroup.getLayers().length > 0) {
            this.map.fitBounds(this.markersGroup.getBounds(), {
                padding: padding
            });
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Save map state on move/zoom
        this.map.on('moveend zoomend', () => {
            this.saveMapState();
        });

        // Handle popup button clicks
        this.map.on('popupopen', (e) => {
            const popup = e.popup;
            const content = popup.getElement();
            
            // Route button
            const routeBtn = content.querySelector('.cbs-route-btn');
            if (routeBtn) {
                routeBtn.onclick = (event) => {
                    event.preventDefault();
                    const lat = parseFloat(routeBtn.dataset.lat);
                    const lng = parseFloat(routeBtn.dataset.lng);
                    this.showRoute(lat, lng);
                };
            }

            // Status button
            const statusBtn = content.querySelector('.cbs-status-btn');
            if (statusBtn) {
                statusBtn.onclick = (event) => {
                    event.preventDefault();
                    const id = statusBtn.dataset.id;
                    const status = parseInt(statusBtn.dataset.status);
                    this.emit('statusChange', { id, status, button: statusBtn });
                };
            }
        });
    }

    /**
     * Show route to location
     */
    showRoute(lat, lng) {
        if (!this.routeControl) {
            alert('Routing nicht verfügbar');
            return;
        }

        if (!this.userLocationMarker) {
            alert('Bitte aktivieren Sie zunächst die Standortbestimmung');
            return;
        }

        const userPos = this.userLocationMarker.getLatLng();
        const destination = L.latLng(lat, lng);

        this.routeControl.setWaypoints([userPos, destination]);
        
        if (!this.map.hasLayer(this.routeControl)) {
            this.routeControl.addTo(this.map);
        }
    }

    /**
     * Save map state to localStorage
     */
    saveMapState() {
        try {
            const center = this.map.getCenter();
            const state = {
                lat: center.lat,
                lng: center.lng,
                zoom: this.map.getZoom(),
                tileProvider: this.options.tileProvider,
                timestamp: Date.now()
            };
            
            localStorage.setItem('cbsMapState', JSON.stringify(state));
        } catch (error) {
            console.warn('Failed to save map state:', error);
        }
    }

    /**
     * Load map state from localStorage
     */
    loadMapState() {
        try {
            const stateStr = localStorage.getItem('cbsMapState');
            if (!stateStr) return;

            const state = JSON.parse(stateStr);
            
            // Check if state is not too old (24 hours)
            if (Date.now() - state.timestamp > 24 * 60 * 60 * 1000) {
                return;
            }

            if (state.lat && state.lng && state.zoom) {
                this.map.setView([state.lat, state.lng], state.zoom);
            }

            if (state.tileProvider && state.tileProvider !== this.options.tileProvider) {
                this.setTileProvider(state.tileProvider);
            }
        } catch (error) {
            console.warn('Failed to load map state:', error);
        }
    }

    /**
     * Event system
     */
    on(event, callback) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(callback);
    }

    off(event, callback) {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(callback);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Utility methods
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    getProviderName(key) {
        const names = {
            osm: 'OpenStreetMap',
            osmDE: 'OSM Deutschland',
            satellite: 'Satellit',
            terrain: 'Gelände',
            cartodb: 'CartoDB Light'
        };
        return names[key] || key;
    }

    getPreviewImage(key) {
        // You would implement actual preview images here
        return `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60"><rect width="100" height="60" fill="#e9ecef"/><text x="50" y="35" text-anchor="middle" fill="#6c757d">' + this.getProviderName(key) + '</text></svg>')}`;
    }

    /**
     * Load external plugins dynamically
     */
    async loadRoutingPlugin() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async loadDrawPlugin() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/leaflet-draw@1.0.4/dist/leaflet.draw.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Destroy map instance
     */
    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        this.eventHandlers.clear();
        this.isInitialized = false;
    }
}

// CSS for custom map styles (should be added to your CSS file)
const mapStyles = `
.cbs-cluster {
    background: linear-gradient(135deg, #eb8d00, #ff6b35);
    border: 3px solid #ffffff;
    border-radius: 50%;
    color: white;
    font-weight: bold;
    text-align: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    transition: all 0.2s ease;
}

.cbs-cluster:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}

.cbs-cluster-small { width: 30px; height: 30px; font-size: 12px; }
.cbs-cluster-medium { width: 40px; height: 40px; font-size: 14px; }
.cbs-cluster-large { width: 50px; height: 50px; font-size: 16px; }

.cbs-cluster-inner {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
}

.cbs-marker {
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
    transition: all 0.2s ease;
}

.cbs-marker:hover {
    transform: scale(1.1);
    filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));
}

.cbs-popup-content {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.cbs-popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid #dee2e6;
}

.cbs-popup-actions {
    display: flex;
    gap: 8px;
    margin-top: 12px;
}

.cbs-popup-actions .btn {
    flex: 1;
    font-size: 0.875rem;
}

.cbs-layer-control {
    background: white;
    border-radius: 4px;
    box-shadow: 0 1px 5px rgba(0,0,0,0.4);
}

.cbs-layer-control a {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    color: #333;
    font-size: 16px;
}

.cbs-layer-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
}

.