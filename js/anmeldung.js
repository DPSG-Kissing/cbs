jQuery(document).ready(function ($) {
    var jsonResponse;
    var lat;
    var lng;
    var map;
    $("#check").submit(function (event) {

        event.preventDefault();
        var request = new XMLHttpRequest();
        request.responseType = 'json';
        uri = "https://api.openrouteservice.org/geocode/search?api_key=5b3ce3597851110001cf62486cf2bc15daf74038b2d9f06d44b8f3db&text=" + $("#inputAddress").val() + "&boundary.circle.lon=10.974612&boundary.circle.lat=48.303808&boundary.circle.radius=3&boundary.country=DE&sources=openstreetmap&layers=address&size=1"
        request.open('GET', encodeURI(uri), true);
        request.onload = function () {
            jsonResponse = request.response;
            console.log(jsonResponse);
            if(jsonResponse.features.length > 0) {
                document.getElementById('strasse_check').innerHTML = jsonResponse.features[0].properties.name
                document.getElementById("proof").classList.remove('invisible');
                lat=jsonResponse.features[0].geometry.coordinates[1];
                lng=jsonResponse.features[0].geometry.coordinates[0];

                map = new L.Map('mapid');

// create the tile layer with correct attribution
                var osmUrl='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
                var osmAttrib='Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors';
                var osm = new L.TileLayer(osmUrl, {attribution: osmAttrib});

                map.setView(new L.LatLng(lat, lng),20);
                map.addLayer(osm);
                var marker = L.marker([lat, lng]).addTo(map);
            }else{
                window.alert("Die Adresse konnte nicht gefunden werden");
            }
        };
        request.send(null);


    });
    $("#anmeldung").click(function (event) {
    var formData = {
        name: $("#name").val(),
        lat: lat,
        lng: lng,
        strasse: jsonResponse.features[0].properties.name,
        cb_anzahl: $("#cb_anzahl").val(),
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
    });
    $("#back").click(function (event) {
        document.getElementById("proof").classList.add('invisible');
        document.getElementById('inputAddress').value='';
    });
});