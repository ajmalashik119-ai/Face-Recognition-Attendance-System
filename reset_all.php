<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
require_once '../config/database.php';

$data = json_decode(file_get_contents('php://input'), true);
$confirm = $data['confirm'] ?? false;

if (!$confirm) {
    echo json_encode(['success' => false, 'error' => 'Confirmation required']);
    exit;
}

try {
    // Only reset today's attendance, keep history
    $today = date('Y-m-d');
    $stmt = $pdo->prepare("DELETE FROM attendance WHERE checkin_date = ?");
    $stmt->execute([$today]);
    
    echo json_encode(['success' => true, 'message' => 'Today\'s attendance reset successfully']);
} catch(Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>