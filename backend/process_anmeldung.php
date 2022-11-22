<?php
$servername = "db5006048456.hosting-data.io";
$username = "dbu1208048";
$password = "!xk?5Q4ry$!dL9Qk";
$dbname = "dbs5065641";

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
mysqli_set_charset($conn, "utf8");

$sql = $conn->prepare("INSERT INTO anmeldungen (name, strasse, telefonnummer, lat, lng, cb_anzahl, geld) VALUES (?,?,?,?,?,?,?)");
$sql->bind_param("sssddid", $name, $strasse, $telefonnummer, $lat, $lng, $cb_anzahl, $money);

$name = $_POST['name'];
$strasse = $_POST['strasse'];
$telefonnummer = $_POST['telefonnummer'];
$lat = $_POST['lat'];
$lng = $_POST['lng'];
$cb_anzahl = $_POST['cb_anzahl'];
$money = $_POST['money'];

$sql->execute();
$sql->close();
$conn->close();

// Json Output
$errors = [];
$data = [];

if (empty($_POST['name'])) {
    $errors['name'] = 'Name is required.';
}

if (empty($_POST['strasse'])) {
    $errors['strass'] = 'Strasse is required.';
}

if (empty($_POST['telefonnummer'])) {
    $errors['telefonnummer'] = 'Telefonnummer is required.';
}

if (empty($_POST['cb_anzahl'])) {
    $errors['cb_anzahl'] = 'Anzahl Bäume is required.';
}

if (empty($_POST['money'])) {
    $errors['money'] = 'Bezahltes Geld is required.';
}

if (!empty($errors)) {
    $data['success'] = false;
    $data['errors'] = $errors;
} else {
    $data['success'] = true;
    $data['message'] = 'Success!';
}

echo json_encode($data);