<?php
header("Access-Control-Allow-Origin: https://cbs.pfadfinder-kissing.de");
header("Content-Type: application/json; charset=utf-8");

include("mysql_con.php");

// Sicherheits-Check: Nur POST-Requests erlauben
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    die(json_encode(['error' => 'Methode nicht erlaubt']));
}

// Benutzername aus dem Formular holen (Sicherheits-TODO: In Zukunft mit echtem Login verknüpfen)
$userName = $_POST['user_name'] ?? 'Anonymer Fahrer';
$messageText = $_POST['message_text'] ?? null;
$imageUrl = null;

// Ordner für Uploads erstellen, falls nicht vorhanden
$uploadDir = 'uploads/chat/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Bild-Upload verarbeiten
if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
    // Sicherheitsprüfungen
    $file = $_FILES['image'];
    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!in_array($file['type'], $allowedTypes)) {
        die(json_encode(['error' => 'Nur JPG, PNG und GIF sind erlaubt.']));
    }
    if ($file['size'] > 5 * 1024 * 1024) { // 5 MB Limit
        die(json_encode(['error' => 'Datei ist zu groß (max. 5 MB).']));
    }

    // Sicherer, einzigartiger Dateiname
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $newFilename = uniqid('chat_', true) . '.' . $extension;
    $uploadPath = $uploadDir . $newFilename;

    if (move_uploaded_file($file['tmp_name'], $uploadPath)) {
        $imageUrl = $uploadPath;
    } else {
        die(json_encode(['error' => 'Fehler beim Speichern des Bildes.']));
    }
}

// Wenn weder Text noch Bild vorhanden sind, abbrechen
if (empty($messageText) && empty($imageUrl)) {
    die(json_encode(['error' => 'Keine Nachricht oder Bild zum Senden.']));
}

try {
    // Nachricht in die Datenbank eintragen
    $sql = "INSERT INTO chat_messages (user_name, message_text, image_url) VALUES (?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sss", $userName, $messageText, $imageUrl);
    $stmt->execute();
    $insertId = $conn->insert_id;
    $stmt->close();
    
    // Bereite die Nachricht für den WebSocket-Server vor
    $messageData = [
        'id' => $insertId,
        'user_name' => $userName,
        'message_text' => $messageText,
        'image_url' => $imageUrl,
        'timestamp' => date("Y-m-d H:i:s")
    ];

    // Benachrichtige den WebSocket-Server über die neue Nachricht
    // Wir senden die Daten per HTTP-Request an einen internen Port des Chat-Servers
    $ch = curl_init('http://127.0.0.1:8081'); // Interner Benachrichtigungs-Port
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['action' => 'broadcast', 'data' => $messageData]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    curl_close($ch);

    echo json_encode(['success' => true, 'message' => 'Nachricht gesendet', 'data' => $messageData]);

} catch (Exception $e) {
    http_response_code(500);
    error_log("Chat message error: " . $e->getMessage());
    echo json_encode(['error' => 'Fehler beim Senden der Nachricht.']);
}

$conn->close();
?>