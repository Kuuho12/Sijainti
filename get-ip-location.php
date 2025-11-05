<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=utf-8");

// --- 1) Apufunktio: hae asiakkaan IP ---
function getClientIp() {
    $keys = [
        'HTTP_CF_CONNECTING_IP',
        'HTTP_X_REAL_IP',
        'HTTP_CLIENT_IP',
        'HTTP_X_FORWARDED_FOR',
        'REMOTE_ADDR'
    ];

    foreach ($keys as $key) {
        if (!empty($_SERVER[$key])) {
            $ip = explode(',', $_SERVER[$key])[0];
            $ip = trim($ip);
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }
    }
    return null;
}

// --- 2) Anonymisoi IP (poista viimeinen osa tai nollaa) ---
function anonymizeIp($ip) {
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
        // IPv4: korvaa viimeinen oktetti nollalla
        $parts = explode('.', $ip);
        $parts[3] = '0';
        return implode('.', $parts);
    } elseif (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
        $packed = inet_pton($ip); // IPv6 binäärimuotoon (16 tavua)
        if ($packed === false) return $ip;

        // Nollataan viimeiset 10 tavua (80 bittiä)
        // $packed = substr($packed, 0, 6) . str_repeat("\0", 10);
        // Nollataan viimeiset 2 tavua (16 bittiä):
        $packed = substr($packed, 0, 14) . "\0\0";
        
        $anon = @inet_ntop($packed);
        return $anon ?: $ip;
    }
    return $ip;
}

$clientIp = getClientIp();
if (!$clientIp) {
    http_response_code(400);
    echo json_encode(['error' => 'Could not determine client IP']);
    exit;
}

$anonIp = anonymizeIp($clientIp);

// --- 3) Määrittele välimuistin polku ---
$cacheDir = __DIR__ . '/cache';
if (!is_dir($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}
$cacheFile = $cacheDir . '/ipcache_' . md5($anonIp) . '.json';
$cacheTime = 600; // sekunteina = 10 minuuttia

// --- 4) Jos välimuisti on voimassa, palauta se ---
if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < $cacheTime) {
    $cached = file_get_contents($cacheFile);
    echo $cached;
    exit;
}

// --- 5) Tee pyyntö ip-api.com:iin ---
if (filter_var($anonIp, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
    $encodedIp = '[' . $anonIp . ']';
} else {
    $encodedIp = $anonIp;
}
$target = "http://ip-api.com/json/" . rawurlencode($encodedIp) .
    "?fields=status,message,country,regionName,city,zip,lat,lon,timezone,isp,org,as,query";

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $target,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 5,
    CURLOPT_CONNECTTIMEOUT => 3,
    CURLOPT_FOLLOWLOCATION => true
]);

$response = curl_exec($ch);
$err = curl_error($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false || $status >= 400) {
    http_response_code(502);
    echo json_encode([
        'status' => 'fail',
        'message' => 'Failed to fetch upstream API',
        'error' => $err ?: "HTTP $status"
    ]);
    exit;
}

// --- 6) Tallenna välimuisti ja palauta tulos ---
$data = json_decode($response, true);
if (json_last_error() === JSON_ERROR_NONE) {
    $data['_proxied_client_ip'] = $anonIp;
    $json = json_encode($data);
    file_put_contents($cacheFile, $json);
    echo $json;
} else {
    // jos upstream ei palauta kelvollista JSONia
    file_put_contents($cacheFile, $response);
    echo $response;
}