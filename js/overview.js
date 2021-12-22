jQuery(document).ready(function ($) {
    checkCookie();
    make_map();
    function make_map() {
        var map = new L.Map('overview_map');
        var osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        var osmAttrib = 'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors';
        var osm = new L.TileLayer(osmUrl, {attribution: osmAttrib});

        map.setView(new L.LatLng(48.303808, 10.974612), 14);
        map.addLayer(osm);
        var request = new XMLHttpRequest();
        var url = "../backend/get_data.php";

        var list = "";

        request.open('POST', url, true);
        request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        request.onreadystatechange = function () {
            if (request.readyState === XMLHttpRequest.DONE) {
                if (request.status === 200) {
                    var response = JSON.parse(request.response);
                    for (var i = 0; i < response.length; i++) {
                        var marker = L.marker([response[i].lat, response[i].lng]).addTo(map);
                        marker.bindPopup("<b>Name: " + response[i].name + "</b><br><p>Anzahl: " + response[i].cb_anzahl + "</p>");
                        list = list + "<tr><th scope='row'>" + (i+1) + "</th><td>" + response[i].name + "</td><td>" + response[i].strasse + "</td><td>" + response[i].cb_anzahl + "</td><td>" + response[i].geld + "</td><td><button value='" + response[i].id + "' class='btn btn-danger table_del'>Löschen</button></td></tr>";
                    }
                    document.getElementById('table_overview').innerHTML = list;
                }
            }
        };
        request.send();
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
});