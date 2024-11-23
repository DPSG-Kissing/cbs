<?php
$servername = "sql180.your-server.de"; //Servername
$username = "cbsammlung"; //Benutzername
$password = "kzZzwkEuzWLT35cz"; //Passwort
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