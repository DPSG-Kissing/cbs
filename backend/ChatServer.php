<?php
namespace Cbs;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class ChatServer implements MessageComponentInterface {
    protected $clients;

    public function __construct() {
        $this->clients = new \SplObjectStorage;
        echo "Chat-Server gestartet...\n";
    }

    public function onOpen(ConnectionInterface $conn) {
        // Neuen Client speichern
        $this->clients->attach($conn);
        echo "Neue Verbindung! ({$conn->resourceId})\n";
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        // Nachrichten von Clients an alle anderen Clients senden
        echo "Nachricht von {$from->resourceId}: $msg\n";
        foreach ($this->clients as $client) {
            if ($from !== $client) {
                // Der Sender erhält seine eigene Nachricht nicht zurück (er hat sie ja schon)
                $client->send($msg);
            }
        }
    }

    public function onClose(ConnectionInterface $conn) {
        // Client entfernen
        $this->clients->detach($conn);
        echo "Verbindung {$conn->resourceId} wurde getrennt\n";
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo "Ein Fehler ist aufgetreten: {$e->getMessage()}\n";
        $conn->close();
    }
}
?>