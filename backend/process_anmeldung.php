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

$sql = $conn->prepare("INSERT INTO anmeldungen (name, strasse, lat, lng, cb_anzahl) VALUES (?,?,?,?,?);");
$sql->bind_param("ssddi", $name, $strasse, $lat, $lng, $cb_anzahl);

$name = $_POST['name'];
$strasse = $_POST['strasse'];
$lat = $_POST['lat'];
$lng = $_POST['lng'];
$cb_anzahl = $_POST['cb_anzahl'];

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

if (empty($_POST['cb_anzahl'])) {
    $errors['cb_anzahl'] = 'Anzahl Bäume is required.';
}

if (!empty($errors)) {
    $data['success'] = false;
    $data['errors'] = $errors;
} else {
    $data['success'] = true;
    $data['message'] = 'Success!';
}

echo json_encode($data);