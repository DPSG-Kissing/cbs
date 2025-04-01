<?php
header("Content-Type: application/json");

// Das korrekt gehashte Passwort (SHA-256)
$correctHash = "9db623f8b84efb6cd12fca05c34f1cb26f7e0ac6477c757d80ed4f30d1707697";

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
