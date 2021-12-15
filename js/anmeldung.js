jQuery(document).ready(function ($) {
    var jsonResponse;
    var lat;
    var lng;
    var name;
    var cb_anzahl;
    var map;
    $("#check").submit(function (event) {

        event.preventDefault();
        name = $("#name").val();
        cb_anzahl = $("#cb_anzahl").val();
        var request = new XMLHttpRequest();
        request.responseType = 'json';
        uri = "https://api.openrouteservice.org/geocode/search?api_key=5b3ce3597851110001cf62486cf2bc15daf74038b2d9f06d44b8f3db&text=" + $("#inputAddress").val() + "&boundary.circle.lon=10.974612&boundary.circle.lat=48.303808&boundary.circle.radius=3&boundary.country=DE&sources=openstreetmap&layers=address&size=20"
        request.open('GET', encodeURI(uri), true);
        request.onload = function () {
            jsonResponse = request.response;
            console.log(jsonResponse);
            if (jsonResponse.features.length > 0) {
                var proof = "";
                for (var i = 0; i < jsonResponse.features.length; i++) {
                    proof = proof + "<div class='row'><div class='col-md-2'>" + jsonResponse.features[i].properties.name + "</div><div class='col-md-2'><button value='" + i + "' class='btn btn-primary anmeldung'>Ja</button></div></div>"

                }

// create the tile layer with correct attribution
                document.getElementById('proof').innerHTML = proof
                document.getElementById("proof").classList.remove('invisible');
                document.getElementById("back").classList.remove('invisible');
                document.getElementById("check_button").classList.add('invisible');
            } else {
                window.alert("Die Adresse konnte nicht gefunden werden");
            }
        };
        request.send(null);

    });
    $(document).on('click', '.anmeldung', function () {
        var formData = {
            name: name,
            lat: jsonResponse.features[$(this).val()].geometry.coordinates[1],
            lng: jsonResponse.features[$(this).val()].geometry.coordinates[0],
            strasse: jsonResponse.features[0].properties.name,
            cb_anzahl: cb_anzahl,
        };
        $.ajax({
            type: "POST",
            url: "backend/process_anmeldung.php",
            data: formData,
            dataType: "json",
            encode: true,
        }).done(function (data) {
            console.log(data);

        });
        map = new L.Map('mapid');
        var osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        var osmAttrib = 'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors';
        var osm = new L.TileLayer(osmUrl, {attribution: osmAttrib});

        map.setView(new L.LatLng(jsonResponse.features[$(this).val()].geometry.coordinates[1], jsonResponse.features[$(this).val()].geometry.coordinates[0]), 20);
        map.addLayer(osm);
        var marker = L.marker([jsonResponse.features[$(this).val()].geometry.coordinates[1], jsonResponse.features[$(this).val()].geometry.coordinates[0]]).addTo(map);
    });
    $("#back").click(function (event) {
        map.remove();
        document.getElementById("proof").classList.add('invisible');
        document.getElementById("back").classList.add('invisible');
        document.getElementById("check_button").classList.remove('invisible');
        document.getElementById('inputAddress').value = '';
        document.getElementById('proof').innerHTML = ""
    });
});