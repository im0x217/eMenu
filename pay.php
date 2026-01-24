<?php
// pay.php - New Payment Processor
// 1. Clean environment
ob_start(); 
error_reporting(E_ALL);
ini_set('display_errors', 1);

// 2. Capture Data
$server   = $_POST['server_select'] ?? 'septum';
$username = $_POST['username'] ?? 'Oyuncu';
$email    = $_POST['email'] ?? 'test@example.com';
$phone    = $_POST['phone'] ?? '05555555555';
$amount   = isset($_POST['amount']) ? (float)$_POST['amount'] : 0;

if ($amount <= 0) die("Tutar hatası: Lütfen bir tutar seçin.");

/* ======================================================
   SCENARIO A: RUST TURKIYE -> PAYWANT
   ====================================================== */
if ($server === 'rust_turkiye') {

    $apiKey     = "9FH3-PAY-WANT-YLYWAZ0Y-LTVO";      
    $apiSecret  = "R7OD70EPG757";   
    
    // --- DATA PREPARATION ---
    $userIP          = "88.255.123.123"; // Using the working Hardcoded IP
    $amountKurus     = (int)($amount * 100); 
    $orderNumber     = time(); 
    
    $userID          = "user_" . $orderNumber; 
    $userAccountName = preg_replace('/[^a-zA-Z0-9]/', '', $username);
    if(strlen($userAccountName) < 3) $userAccountName = "Player";
    
    $cleanPhone      = preg_replace('/\D/', '', $phone);
    if(strlen($cleanPhone) < 10) $cleanPhone = "05555555555";

    // URLs
    $successUrl = "https://rustturkiye.net/payment/success.php";
    $failUrl    = "https://rustturkiye.net/payment/fatal.php";

    // HASH
    $hashString = "$orderNumber|$userAccountName|$userID|$email|$amountKurus|$apiKey|$apiSecret";
    $hash       = base64_encode(hash('sha256', $hashString, true));

    // PAYLOAD
    $postData = array(
        "proApi"          => true,
        "apiKey"          => $apiKey,
        "hash"            => $hash,
        "userID"          => $userID,
        "userEmail"       => $email,
        "userAccountName" => $userAccountName,
        "userPhone"       => $cleanPhone,
        "userIPAddress"   => $userIP,
        "clientLang"      => "TR",
        "returnUrl"       => $successUrl,
        "cancelUrl"       => $failUrl,
        "productData"     => array(
            "name"           => "RustBakiye",
            "amount"         => $amountKurus, 
            "extraData"      => $orderNumber, 
            "paymentChannel" => "1,2,3", 
            "commissionType" => 1 
        )
    );

    // CURL REQUEST
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://api.paywant.com/gateway.php");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_POST, 1);
    
    // FIX: Force correct separator
    $query_string = http_build_query($postData, '', '&');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $query_string);
    
    // FIX: Explicit Header to tell Paywant this is Form Data
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'Content-Type: application/x-www-form-urlencoded',
        'Content-Length: ' . strlen($query_string)
    ));
    
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    
    if (curl_errno($ch)) {
        die('Curl Hatası: ' . curl_error($ch));
    }
    curl_close($ch);

    $result = json_decode($response, true);

    if (isset($result["Status"]) && $result["Status"] == 100) {
        ob_end_clean();
        header("Location: " . $result["Message"]);
        exit;
    } else {
        echo "<h1>Paywant Hatası</h1>";
        echo "<pre>";
        print_r($result);
        echo "</pre>";
        echo "<hr><h3>Gönderilen String:</h3>";
        echo $query_string;
        exit;
    }

/* ======================================================
   SCENARIO B: SEPTUM RUST -> LIDIO
   ====================================================== */
} else {

    // Session only for Lidio
    if (session_status() == PHP_SESSION_NONE) {
        session_start();
    }

    $SIGNATURE_SECRET = "D39fgpRJvxB5omEmgK4XRa08uUaRKTP37PgL007Z5ithaHRCNFcTsucbBFw2tzwk";
    $CALLBACK_URL = "https://rustturkiye.net/cron/payment/callback.php";

    $reference = "REF-" . time() . rand(100,999);
    $lidioOrder = "INV-" . time();
    $cleanPhone = preg_replace('/\D/', '', $phone);

    $payload = [
        "signature_secret" => $SIGNATURE_SECRET,
        "amount"           => $amount,
        "currency"         => "TRY",
        "description"      => $username . " Bakiye",
        "has_installment"  => true,
        "customer_name"    => $username,
        "customer_email"   => $email,
        "customer_phone"   => $cleanPhone,
        "reference"        => $reference,
        "order_number"     => $lidioOrder,
        "callback_url"     => $CALLBACK_URL,
        "expires_at"       => date("Y-m-d\TH:i:s\Z", strtotime("+1 hour"))
    ];

    $_SESSION['payment'] = [
        'username' => $username,
        'email'    => $email,
        'phone'    => $cleanPhone,
        'amount'   => $amount,
        'ref'      => $reference
    ];

    $ch = curl_init("https://www.pay2out.com/api/payment/create");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => ["Content-Type: application/json"],
        CURLOPT_POSTFIELDS     => json_encode($payload),
    ]);

    $response = curl_exec($ch);
    curl_close($ch);

    $result = json_decode($response, true);

    if (!empty($result['success']) && $result['success'] == 1 && !empty($result['payment_url'])) {
        ob_end_clean();
        header("Location: " . $result['payment_url']);
        exit;
    }

    echo "<h3>Lidio Hatası</h3><pre>";
    print_r($result);
    echo "</pre>";
    exit;
}
?>