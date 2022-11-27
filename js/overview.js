jQuery(document).ready(function ($) {
    let map;
    let standort;
    let standort_circle;
    checkCookie();
    make_map();


    function make_map() {
        map = new L.Map('overview_map');
        var osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        var osmAttrib = 'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors';
        var osm = new L.TileLayer(osmUrl, {attribution: osmAttrib});

        map.setView(new L.LatLng(48.303808, 10.974612), 15);
        map.addLayer(osm);
        var request = new XMLHttpRequest();
        var url = "../backend/get_data.php";
        var greenIcon = new L.Icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });
        var redIcon = new L.Icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        var list = "";
        var summe = 0;
        var anzahl_gesamt = 0;

        request.open('POST', url, true);
        request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        request.onreadystatechange = function () {
            if (request.readyState === XMLHttpRequest.DONE) {
                if (request.status === 200) {
                    var response = JSON.parse(request.response);
                    for (var i = 0; i < response.length; i++) {
                        let color=""
                        if(response[i].status == 0){
                            color = "table-danger";
                            var marker = L.marker([response[i].lat, response[i].lng], {icon: redIcon}).addTo(map);
                        }else{
                            color = "table-success";
                            var marker = L.marker([response[i].lat, response[i].lng], {icon: greenIcon}).addTo(map);
                        }

                        marker.bindPopup("<b>Name: " + response[i].name + "</b><br>Tel: " + response[i].telefonnummer + "<br><p>Anzahl: " + response[i].cb_anzahl + "</p><button value='" + response[i].id + "' data-status='" + response[i].status + "' class='btn btn-success table_status_abgeholt'>Abgeholt</button>");
                        list = list + "<tr class='" + color + "'><th scope='row'>" + (i+1) + "</th><td>" + response[i].name + "</td><td>" + response[i].strasse + "</td><td>" + response[i].telefonnummer + "</td><td>" + response[i].cb_anzahl + "</td><td>" + Number.parseFloat(response[i].geld).toFixed(2) + "\u20AC" + "</td><td><button value='" + response[i].id + "' class='btn btn-danger table_del'>Löschen</button><button value='" + response[i].id + "' data-status='" + response[i].status + "' class='btn btn-success table_status_abgeholt'>Abgeholt</button></td></tr>";
                        summe = summe + Number.parseFloat(response[i].geld).toFixed(2);
                        anzahl_gesamt = anzahl_gesamt + response[i].cb_anzahl;
                    }
                    list = list + "<tr class='table-success'><th scope='row'></th><td>Summe</td><td></td><td></td><td>" + anzahl_gesamt + "</td><td>" + summe.toFixed(2) + "\u20AC" + "</td><td></td></tr>";
                    document.getElementById('table_overview').innerHTML = list;
                }
            }
        };
        request.send();
    }
    $("#refresh_pos").click(function (event) {
        map.locate({setView: true, maxZoom: 10});
        map.on('locationfound', onLocationFound);
        map.on('locationerror', onLocationError);
    });

    function onLocationFound(e) {
        var radius = e.accuracy;

        try{
            map.removeLayer(standort);
            map.removeLayer(standort_circle);
        }catch(err){

        }

        standort = new L.marker(e.latlng);
        standort_circle = new L.circle(e.latlng, radius);

        map.addLayer(standort);
        map.addLayer(standort_circle);
    }

    function onLocationError(e) {
        alert(e.message);
    }

    $(document).on('click', '.table_del', function () {
        if (confirm('Den ausgewhälten eintrag Löschen?')) {
            var formData = {
                id: $(this).val(),
            };
            $.ajax({
                type: "POST",
                url: "backend/delete.php",
                data: formData,
                dataType: "json",
                encode: true,
            }).done(function (data) {
                console.log(data);
                if (data.success !== true){
                    window.alert("Fehler beim löschen aus der Datenbank.\nBitte seite neu laden!");
                }else{
                    location.reload();
                }
            });
        } else {
        }
    });

    $(document).on('click', '.table_status_abgeholt', function () {
            let status = 0
            if($(this).data("status")===0){status = 1}else{status = 0};
            var formData = {
                id: $(this).val(),
                status: status,
            };
            $.ajax({
                type: "POST",
                url: "backend/change.php",
                data: formData,
                dataType: "json",
                encode: true,
            }).done(function (data) {
                console.log(data);
                if (data.success !== true){
                    window.alert("Fehler beim updaten der Datenbank.\nBitte seite neu laden!");
                }else{
                    location.reload();
                }
            });
    });
});