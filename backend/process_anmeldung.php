<?php
include("mysql_con.php");

// JSON-Daten von der Anfrage dekodieren
$data = json_decode(file_get_contents("php://input"), true);

$sql = $conn->prepare("INSERT INTO anmeldungen (name, strasse, telefonnummer, lat, lng, cb_anzahl, geld) VALUES (?,?,?,?,?,?,?)");
$sql->bind_param("sssddid", $name, $strasse, $telefonnummer, $lat, $lng, $cb_anzahl, $money);

$name = $data['name'];
$strasse = $data['strasse'];
$telefonnummer = $data['telefonnummer'];
$lat = $data['lat'];
$lng = $data['lng'];
$cb_anzahl = $data['cb_anzahl'];
$money = $data['money'];

$sql->execute();
$sql->close();
$conn->close();

// Antwort erstellen
$errors = [];
$response = ["success" => true, "message" => "Success!"];

if (empty($data['name'])) $errors['name'] = 'Name is required.';
if (empty($data['strasse'])) $errors['strasse'] = 'Strasse is required.';
if (empty($data['telefonnummer'])) $errors['telefonnummer'] = 'Telefonnummer is required.';
if (empty($data['cb_anzahl'])) $errors['cb_anzahl'] = 'Anzahl Bäume is required.';
if (empty($data['money'])) $errors['money'] = 'Bezahltes Geld is required.';

if (!empty($errors)) {
    $response['success'] = false;
    $response['errors'] = $errors;
}

echo json_encode($response);
