<?php
use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use Cbs\ChatServer;

require dirname(__FILE__) . '/vendor/autoload.php';
require dirname(__FILE__) . '/backend/ChatServer.php';

// Der Haupt-WebSocket-Server für die Echtzeit-Kommunikation
$server = IoServer::factory(
    new HttpServer(
        new WsServer(
            new ChatServer()
        )
    ),
    8583 // Port für die WebSocket-Verbindungen
);

echo "WebSocket-Server läuft auf Port 8583\n";
$server->run();
?>