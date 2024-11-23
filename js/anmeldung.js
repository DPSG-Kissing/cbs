document.addEventListener("DOMContentLoaded", function() {
    let jsonResponse;
    let map;
    let marker;
    let id_check;
    let currentConfirmation = null;

    // Initialisiere die Karte
    map = new L.Map("mapid");

    // Überprüfen Button klick
    document.getElementById("check").addEventListener("submit", function(event) {
        event.preventDefault();

        const inputAddress = document.getElementById("inputAddress").value;
        const uri = `https://api.openrouteservice.org/geocode/search?api_key=5b3ce3597851110001cf62486cf2bc15daf74038b2d9f06d44b8f3db&text=${encodeURIComponent(inputAddress)}&boundary.circle.lon=10.974612&boundary.circle.lat=48.303808&boundary.circle.radius=3&boundary.country=DE&sources=openstreetmap&layers=address&size=20`;

        fetch(uri)
            .then((response) => response.json())
            .then((data) => {
                jsonResponse = data;
                if (jsonResponse.features.length > 0) {
                    let proof = "";
                    jsonResponse.features.forEach((feature, index) => {
                        proof += `
                        <div class='row'>
                            <div class='col-6 col-md-4'>${feature.properties.name}</div>
                            <div class='col-2'>
                                <button value='${index}' class='btn btn-primary adresseAnschauen'>Adresse anschauen</button>
                            </div>
                        </div>`;
                    });

                    const proofElement = document.getElementById("proof");
                    if (proofElement) {
                        proofElement.innerHTML = proof;
                        proofElement.classList.remove("invisible");
                    } else {
                        console.error("Das Element mit der ID 'proof' wurde nicht gefunden.");
                    }
                } else {
                    alert("Die Adresse konnte nicht gefunden werden");
                }
            })
            .catch((error) => console.error("Fehler bei der Anfrage:", error));
    });

    // Adresse anschauen
    document.getElementById("proof").addEventListener("click", function(event) {
        if (event.target.classList.contains("adresseAnschauen")) {
            // Entferne den Bestätigungsbutton der vorherigen Auswahl
            const previousButton = document.querySelector(".adresseAnschauen.clicked");
            if (previousButton) {
                const parent = previousButton.parentElement;
                const confirmButton = parent.querySelector(".btn-success");
                if (confirmButton) {
                    confirmButton.remove();
                }
                previousButton.classList.remove("clicked");
            }

            // Markiere die neue Auswahl
            event.target.classList.add("clicked");

            // Entferne den alten Marker, falls vorhanden
            try {
                map.removeLayer(marker);
            } catch (err) {}

            // Setze die ID der aktuellen Auswahl
            id_check = event.target.value;
            const coordinates = jsonResponse.features[id_check].geometry.coordinates;

            // Initialisiere Karte mit OSM-Backend
            const osmUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
            const osmAttrib = "Map data © <a href='https://openstreetmap.org'>OpenStreetMap</a> contributors";
            const osm = new L.TileLayer(osmUrl, { attribution: osmAttrib });

            map.setView(new L.LatLng(coordinates[1], coordinates[0]), 20);
            map.addLayer(osm);

            marker = L.marker([coordinates[1], coordinates[0]]);
            map.addLayer(marker);

            // Bestätigungsbutton anzeigen
            const confirmButton = document.createElement('button');
            confirmButton.classList.add('btn', 'btn-success');
            confirmButton.innerText = 'Bestätigen';
            confirmButton.id = 'confirm_button';
            event.target.parentElement.appendChild(confirmButton);
        }
    });

    // Bestätigen Button klick
    document.getElementById("proof").addEventListener("click", function(event) {
        if (event.target.id === 'confirm_button') {
            // Formulardaten erfassen
            const formData = {
                name: document.getElementById("name").value,
                lat: jsonResponse.features[id_check].geometry.coordinates[1],
                lng: jsonResponse.features[id_check].geometry.coordinates[0],
                strasse: jsonResponse.features[id_check].properties.name,
                money: document.getElementById("inputMoney").value,
                telefonnummer: document.getElementById("telefonnummer").value,
                cb_anzahl: document.getElementById("cb_anzahl").value,
            };

            // Daten an Backend senden
            fetch("backend/process_anmeldung.php", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(formData),
                })
                .then((response) => response.json())
                .then((data) => {
                    if (data.success === true) {
                        // Bestätigungsmeldung anzeigen
                        const confirmation = document.getElementById("confirmation");
                        const confirmationDetails = document.getElementById("confirmationDetails");

                        confirmationDetails.innerHTML = `
                            <li><strong>Name:</strong> ${formData.name}</li>
                            <li><strong>Adresse:</strong> ${formData.strasse}</li>
                            <li><strong>Telefonnummer:</strong> ${formData.telefonnummer}</li>
                            <li><strong>Bezahlt:</strong> €${formData.money}</li>
                            <li><strong>Anzahl Bäume:</strong> ${formData.cb_anzahl}</li>
                        `;

                        confirmation.classList.remove("invisible");

                        // Felder zurücksetzen
                        document.getElementById("name").value = "";
                        document.getElementById("telefonnummer").value = "";
                        document.getElementById("inputMoney").value = "";
                        document.getElementById("inputAddress").value = "";

                        // Entferne Bestätigungsbutton
                        document.getElementById("confirm_button").remove();

                        // Verstecke die Adressvorschläge
                        document.getElementById("proof").innerHTML = '';
                        document.getElementById("proof").classList.add('invisible');

                        // Bestätigung bleibt so lange sichtbar, bis eine neue Adresse bestätigt wird
                    }
                })
                .catch((error) => console.error("Fehler bei der Anmeldung:", error));
        }
    });
});