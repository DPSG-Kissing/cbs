<?php
$servername = "127.0.0.1"; //Servername
$username = "cbsammlung"; //Benutzername
$password = "Ca0WGf7gnjtF4TuAP6yz"; //Passwort
$dbname = "cbsammlung"; //Datenbankname

// Erstelle eine Verbindung
$conn = new mysqli($servername, $username, $password, $dbname);

// Verbindung prüfen
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Setze den Zeichensatz auf UTF-8
$conn->set_charset("utf8");
?>
