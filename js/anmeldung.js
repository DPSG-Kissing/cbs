jQuery(document).ready(function ($) {
    checkCookie();

    var jsonResponse;
    var map;
    map = new L.Map('mapid');
    var marker;
    var id_check;

    $("#check").submit(function (event) {
        event.preventDefault();
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
                    proof = proof + "<div class='row'><div class='col-6 col-md-4'>" + jsonResponse.features[i].properties.name + "</div><div class='col-2'><button value='" + i + "' class='btn btn-primary anmeldung'>Ja</button></div></div>"
                }
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
        $(".anmeldung").removeClass("clicked");
        $(this).toggleClass("clicked");
        $(this).unbind('mouseenter mouseleave');
        try{
            map.removeLayer(marker);
        }catch(err){

        }
        marker = null;
        id_check = $(this).val();
        var osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        var osmAttrib = 'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors';
        var osm = new L.TileLayer(osmUrl, {attribution: osmAttrib});

        map.setView(new L.LatLng(jsonResponse.features[id_check].geometry.coordinates[1], jsonResponse.features[id_check].geometry.coordinates[0]), 20);
        map.addLayer(osm);
        marker= L.marker([jsonResponse.features[id_check].geometry.coordinates[1], jsonResponse.features[id_check].geometry.coordinates[0]]);
        map.addLayer(marker);
        document.getElementById("proof_data").classList.remove('invisible');
    });
    $("#back").click(function (event) {
        try{
            map.removeLayer(marker);
        }catch(err){

        }
        document.getElementById("proof").classList.add('invisible');
        document.getElementById("back").classList.add('invisible');
        document.getElementById("check_button").classList.remove('invisible');
        document.getElementById('inputAddress').value = '';
        document.getElementById('proof').innerHTML = "";
        document.getElementById("proof_data").classList.add('invisible');
    });
    $("#proof_data").click(function (event) {
        var formData = {
            name: $("#name").val(),
            lat: jsonResponse.features[id_check].geometry.coordinates[1],
            lng: jsonResponse.features[id_check].geometry.coordinates[0],
            strasse: jsonResponse.features[id_check].properties.name,
            money: $("#inputMoney").val(),
            telefonnummer: $("#telefonnummer").val(),
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
            if (data.success !== true){
                window.alert("Fehler beim eintragen in die Datenbank.\nBitte seite neu laden!");
            }else{
                location.reload();
            }

        });
    });
});