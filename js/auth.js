function hash(string) {
    const utf8 = new TextEncoder().encode(string);
    return crypto.subtle.digest('SHA-256', utf8).then((hashBuffer) => {
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray
            .map((bytes) => bytes.toString(16).padStart(2, '0'))
            .join('');
        return hashHex;
    });
}

function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    let expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}


function checkCookie() {
    let user_pwhash = getCookie("hash");
    var formData = {
        password_hash: user_pwhash,
    };
    $.ajax({
        type: "POST",
        url: "backend/login.php",
        data: formData,
        dataType: "json",
        encode: true,
    }).done(function (data) {
        if (data.success !== true) {
            $('#myModal').modal({
                keyboard: false,
                backdrop: 'static'
            })
            $("#myModal").modal('toggle');
        } else {

        }
    });
}

jQuery(document).ready(function ($) {
    $("#login").submit(function (event) {
        event.preventDefault();
        hash($("#password").val()).then(function (pw_hash) {
                var formData = {
                    password_hash: pw_hash,
                };
                $.ajax({
                    type: "POST",
                    url: "backend/login.php",
                    data: formData,
                    dataType: "json",
                    encode: true,
                }).done(function (data) {
                    if (data.success !== true) {
                        window.alert("Fehler, falsches Passwort!");
                    } else {
                        setCookie("hash", pw_hash, 1);
                        $("#myModal").modal('toggle');
                    }

                });
            }
        );
    });
});