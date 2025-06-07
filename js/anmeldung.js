document.addEventListener("DOMContentLoaded", function() {
    let jsonResponse;
    let map;
    let marker;
    let selectedAddressIndex;
    let isSubmitting = false;

    // Karte initialisieren
    initializeMap();
    setupEventListeners();

    function initializeMap() {
        map = L.map("mapid");
        // Standardansicht auf Kissing setzen
        map.setView([48.303808, 10.974612], 13);
    }

    function setupEventListeners() {
        // Adresse überprüfen
        const checkForm = document.getElementById("check");
        checkForm?.addEventListener("submit", handleAddressCheck);

        // Adressenauswahl
