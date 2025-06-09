<?php
header("Access-Control-Allow-Origin: https://cbs.pfadfinder-kissing.de");
header("Content-Type: application/json; charset=utf-8");

include("mysql_con.php");

try {
    // Lade die letzten 50 Nachrichten, die älteste zuerst
    $sql = "SELECT id, user_name, message_text, image_url, timestamp 
            FROM (
                SELECT * FROM chat_messages ORDER BY id DESC LIMIT 50
            ) AS last_50
            ORDER BY id ASC";
            
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $result = $stmt->get_result();
    $messages = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    
    echo json_encode($messages);

} catch (Exception $e) {
    http_response_code(500);
    error_log("Chat history error: " . $e->getMessage());
    echo json_encode(['error' => 'Fehler beim Laden des Chat-Verlaufs.']);
}

$conn->close();
?>