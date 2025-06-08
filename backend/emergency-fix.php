<?php
// CBS Tool - Notfall-Reparatur
// Behebt die häufigsten Probleme automatisch

if (php_sapi_name() !== 'cli') {
    die("Aus Sicherheitsgründen nur über CLI ausführbar!\nVerwendung: php emergency_fix.php\n");
}

echo "\nCBS Tool - Notfall-Reparatur\n";
echo "=============================\n\n";

$fixes_applied = 0;

// 1. Erstelle fehlende Tabellen
echo "1. Prüfe Datenbanktabellen...\n";

try {
    include("mysql_con.php");
    
    // Settings-Tabelle
    $result = $conn->query("SHOW TABLES LIKE 'settings'");
    if ($result->num_rows == 0) {
        echo "  → Erstelle 'settings' Tabelle...\n";
        
        $sql = "CREATE TABLE `settings` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `setting_key` VARCHAR(100) UNIQUE NOT NULL,
            `setting_value` TEXT,
            `description` VARCHAR(255),
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_setting_key (setting_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        if ($conn->query($sql)) {
            echo "  ✓ Settings-Tabelle erstellt\n";
            $fixes_applied++;
        }
    }
    
    // Anmeldungen-Tabelle
    $result = $conn->query("SHOW TABLES LIKE 'anmeldungen'");
    if ($result->num_rows == 0) {
        echo "  → Erstelle 'anmeldungen' Tabelle...\n";
        
        $sql = "CREATE TABLE `anmeldungen` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `name` VARCHAR(255) NOT NULL,
            `strasse` VARCHAR(255) NOT NULL,
            `telefonnummer` VARCHAR(50) NOT NULL,
            `lat` DECIMAL(10, 8) NOT NULL,
            `lng` DECIMAL(11, 8) NOT NULL,
            `cb_anzahl` INT NOT NULL DEFAULT 1,
            `geld` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            `status` TINYINT(1) NOT NULL DEFAULT 0,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_status (status),
            INDEX idx_strasse (strasse),
            INDEX idx_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        if ($conn->query($sql)) {
            echo "  ✓ Anmeldungen-Tabelle erstellt\n";
            $fixes_applied++;
        }
    }
    
} catch (Exception $e) {
    echo "  ✗ Datenbankfehler: " . $e->getMessage() . "\n";
}

// 2. Standard-Einstellungen setzen
echo "\n2. Setze Standard-Einstellungen...\n";

try {
    $default_settings = [
        'admin_password_hash' => [
            'value' => 'dd26d2dc2a72e8b5b1528b24e4a7602c5e7c8e7e5b8b0c6dc60b1797db8c2ed2',
            'description' => 'Admin-Passwort Hash (Standard: christbaum2024)'
        ],
        'rate_limit_attempts' => [
            'value' => '5',
            'description' => 'Maximale Login-Versuche'
        ],
        'rate_limit_window' => [
            'value' => '300',
            'description' => 'Zeitfenster für Rate-Limiting in Sekunden'
        ]
    ];
    
    foreach ($default_settings as $key => $setting) {
        $stmt = $conn->prepare("INSERT INTO settings (setting_key, setting_value, description) 
                               VALUES (?, ?, ?) 
                               ON DUPLICATE KEY UPDATE setting_value = setting_value");
        $stmt->bind_param("sss", $key, $setting['value'], $setting['description']);
        
        if ($stmt->execute() && $stmt->affected_rows > 0) {
            echo "  ✓ $key gesetzt\n";
            $fixes_applied++;
        }
        $stmt->close();
    }
    
} catch (Exception $e) {
    echo "  ✗ Fehler beim Setzen der Einstellungen: " . $e->getMessage() . "\n";
}

// 3. Datei-Berechtigungen prüfen und korrigieren
echo "\n3. Prüfe Datei-Berechtigungen...\n";

$files_to_check = [
    'mysql_con.php' => 0644,
    'login.php' => 0644,
    'get_data.php' => 0644,
    'process_anmeldung.php' => 0644,
    'change.php' => 0644,
    'delete.php' => 0644
];

foreach ($files_to_check as $file => $recommended_perms) {
    if (file_exists($file)) {
        $current_perms = substr(sprintf('%o', fileperms($file)), -4);
        if ($current_perms !== sprintf('%04o', $recommended_perms)) {
            if (@chmod($file, $recommended_perms)) {
                echo "  ✓ $file: Berechtigungen korrigiert ($current_perms → " . sprintf('%04o', $recommended_perms) . ")\n";
                $fixes_applied++;
            } else {
                echo "  ⚠ $file: Konnte Berechtigungen nicht ändern\n";
            }
        }
    } else {
        echo "  ⚠ $file: Datei fehlt\n";
    }
}

// 4. Test-Eintrag erstellen
echo "\n4. Erstelle Test-Eintrag...\n";

try {
    $check = $conn->query("SELECT COUNT(*) as count FROM anmeldungen");
    $count = $check->fetch_assoc()['count'];
    
    if ($count == 0) {
        $stmt = $conn->prepare("INSERT INTO anmeldungen (name, strasse, telefonnummer, lat, lng, cb_anzahl, geld, status) 
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        
        $test_data = [
            'name' => 'Test Mustermann',
            'strasse' => 'Hauptstraße 1, 86438 Kissing',
            'telefonnummer' => '08233 123456',
            'lat' => 48.303808,
            'lng' => 10.974612,
            'cb_anzahl' => 1,
            'geld' => 4.00,
            'status' => 0
        ];
        
        $stmt->bind_param("sssddidi", 
            $test_data['name'],
            $test_data['strasse'],
            $test_data['telefonnummer'],
            $test_data['lat'],
            $test_data['lng'],
            $test_data['cb_anzahl'],
            $test_data['geld'],
            $test_data['status']
        );
        
        if ($stmt->execute()) {
            echo "  ✓ Test-Eintrag erstellt\n";
            $fixes_applied++;
        }
        $stmt->close();
    }
    
} catch (Exception $e) {
    echo "  ✗ Fehler beim Erstellen des Test-Eintrags: " . $e->getMessage() . "\n";
}

// 5. .htaccess erstellen (falls nicht vorhanden)
echo "\n5. Prüfe .htaccess...\n";

if (!file_exists('../.htaccess')) {
    $htaccess_content = '# Deny access to sensitive files
<FilesMatch "\.(php|sql|log)$">
    Order Deny,Allow
    Deny from all
    Allow from 127.0.0.1
</FilesMatch>

# Allow specific PHP files
<FilesMatch "^(login|get_data|process_anmeldung|change|delete)\.php$">
    Order Allow,Deny
    Allow from all
</FilesMatch>

# Protect mysql_con.php
<Files "mysql_con.php">
    Order Deny,Allow
    Deny from all
</Files>';

    if (file_put_contents('../.htaccess', $htaccess_content)) {
        echo "  ✓ .htaccess erstellt\n";
        $fixes_applied++;
    }
}

// Zusammenfassung
echo "\n=============================\n";
echo "Reparatur abgeschlossen!\n";
echo "Fixes angewendet: $fixes_applied\n\n";

if ($fixes_applied > 0) {
    echo "Standard-Passwort: christbaum2024\n";
    echo "\nBitte testen Sie jetzt die Anwendung im Browser.\n";
} else {
    echo "Keine Probleme gefunden oder alle Fixes bereits angewendet.\n";
}

echo "\nFühren Sie 'php diagnostics.php' für eine vollständige Diagnose aus.\n\n";

$conn->close();