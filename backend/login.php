<?php
header("Content-Type: application/json");

// Das korrekt gehashte Passwort (SHA-256)
$correctHash = "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Passwort-Hash aus der Anfrage lesen
    $inputHash = $_POST['password_hash'] ?? '';

    // Überprüfen, ob der Hash korrekt ist
    if ($inputHash === $correctHash) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["success" => false, "message" => "Falsches Passwort."]);
    }
    exit;
}

// Fallback bei ungültigen Anfragen
http_response_code(400);
echo json_encode(["success" => false, "message" => "Ungültige Anfrage."]);
