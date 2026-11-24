<?php
/**
 * Formulaire de contact — version PHP pour hébergement mutualisé (équivalent de form-handler/).
 *
 * Reçoit POST /api/contact (réécrit vers ce fichier par .htaccess), valide les champs,
 * filtre les robots et envoie la demande par e-mail via la fonction mail() de l'hébergeur.
 * Aucune donnée n'est stockée ni journalisée.
 *
 * Réglages : modifier les trois constantes ci-dessous si besoin.
 * Compatible PHP 7.4 et plus récent.
 */

const MAIL_TO   = 'contact@financiale.fr';            // destinataire des demandes
const MAIL_FROM = 'gestion@financiale-corporate.fr';  // doit être une adresse du domaine hébergé
const ALLOWED_HOSTS = ['www.financiale-corporate.fr', 'financiale-corporate.fr', 'www.financiale.fr', 'financiale.fr'];

/*
 * Envoi par SMTP authentifié (recommandé) : déposer sur le serveur, à côté de ce fichier,
 * un fichier « smtp-config.php » (jamais dans Git) au format suivant :
 *
 *   <?php return [
 *     'host' => 'smtp.exemple.fr', 'port' => 587, 'secure' => 'tls',   // 'tls' (587) ou 'ssl' (465)
 *     'user' => 'adresse@domaine.fr', 'pass' => 'mot-de-passe',
 *     'from' => 'adresse@domaine.fr', 'to' => 'contact@financiale.fr',
 *   ];
 *
 * Sans ce fichier, la fonction mail() de l'hébergeur est utilisée (moins fiable : souvent classée en spam).
 */
$SMTP = is_file(__DIR__ . '/smtp-config.php') ? (require __DIR__ . '/smtp-config.php') : null;

header('X-Robots-Tag: noindex');

$wantsJson = strpos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;

function reply(int $status, array $body, bool $json): void {
    if ($json) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($body);
    } else {
        // Sans JavaScript : retour sur la page contact
        header('Location: /contact?' . ($status < 300 ? 'envoye=1' : 'erreur=1') . '#contenu', true, 303);
    }
    exit;
}

/** Client SMTP minimal (STARTTLS / SSL + AUTH LOGIN), sans dépendance. Renvoie true si le message est accepté. */
function smtp_send(array $c, string $to, string $subject, string $body, string $replyTo): bool {
    $secure = $c['secure'] ?? 'tls';
    $host = ($secure === 'ssl' ? 'ssl://' : '') . $c['host'];
    $fp = @stream_socket_client($host . ':' . (int) ($c['port'] ?? 587), $errno, $errstr, 15);
    if (!$fp) { error_log("contact SMTP: connexion impossible ($errstr)"); return false; }
    stream_set_timeout($fp, 15);
    $read = function () use ($fp) { $data = ''; while (($line = fgets($fp, 515)) !== false) { $data .= $line; if (isset($line[3]) && $line[3] === ' ') break; } return $data; };
    $cmd = function (string $line, string $expect) use ($fp, $read) { fwrite($fp, $line . "\r\n"); $r = $read(); if (strpos($r, $expect) !== 0) { error_log('contact SMTP: ' . trim(explode("\r\n", $r)[0])); return false; } return true; };
    $ehlo = 'EHLO ' . ($_SERVER['SERVER_NAME'] ?? 'localhost');
    if (strpos($read(), '220') !== 0) return false;
    if (!$cmd($ehlo, '250')) return false;
    if ($secure === 'tls') {
        if (!$cmd('STARTTLS', '220')) return false;
        if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT)) { error_log('contact SMTP: échec TLS'); return false; }
        if (!$cmd($ehlo, '250')) return false;
    }
    if (!empty($c['user'])) {
        if (!$cmd('AUTH LOGIN', '334') || !$cmd(base64_encode($c['user']), '334') || !$cmd(base64_encode($c['pass']), '235')) return false;
    }
    $from = $c['from'] ?? $c['user'];
    if (!$cmd("MAIL FROM:<$from>", '250') || !$cmd("RCPT TO:<$to>", '25') || !$cmd('DATA', '354')) return false;
    $headers = [
        'Date: ' . date('r'),
        'From: Site Financiale <' . $from . '>',
        'To: <' . $to . '>',
        'Reply-To: ' . $replyTo,
        'Subject: =?UTF-8?B?' . base64_encode($subject) . '?=',
        'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . substr(strrchr($from, '@'), 1) . '>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
    ];
    $data = implode("\r\n", $headers) . "\r\n\r\n" . chunk_split(base64_encode($body));
    if (!$cmd($data . "\r\n.", '250')) return false;
    $cmd('QUIT', '221');
    fclose($fp);
    return true;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    reply(405, ['ok' => false], $wantsJson);
}

// Origine : uniquement depuis le site lui-même
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && !in_array(parse_url($origin, PHP_URL_HOST), ALLOWED_HOSTS, true)) {
    reply(403, ['ok' => false], $wantsJson);
}

// Limite : 5 envois par heure et par visiteur (via un fichier temporaire anonymisé, effacé automatiquement)
$key = sys_get_temp_dir() . '/fin_contact_' . hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . date('YmdH'));
$hits = is_file($key) ? (int) file_get_contents($key) : 0;
if ($hits >= 5) {
    reply(429, ['ok' => false, 'error' => 'rate_limited'], $wantsJson);
}
@file_put_contents($key, (string) ($hits + 1));

// Champ piège rempli => robot : on répond « OK » sans rien envoyer
if (!empty($_POST['website'])) {
    reply(200, ['ok' => true], $wantsJson);
}

$fields = [
    'nom'       => ['Nom', true, 100],
    'prenom'    => ['Prénom', true, 100],
    'email'     => ['E-mail', true, 200],
    'telephone' => ['Téléphone', true, 40],
    'ville'     => ['Ville', false, 100],
    'profil'    => ['Profil', true, 100],
    'enjeu'     => ['Enjeu', true, 100],
    'horizon'   => ['Horizon de décision', false, 100],
    'message'   => ['Message', true, 4000],
];

$clean = [];
foreach ($fields as $name => [$label, $required, $max]) {
    $value = trim((string) ($_POST[$name] ?? ''));
    $value = str_replace("\0", '', $value);
    $value = function_exists('mb_substr') ? mb_substr($value, 0, $max) : substr($value, 0, $max);
    if ($required && $value === '') {
        reply(422, ['ok' => false, 'error' => "missing_$name"], $wantsJson);
    }
    $clean[$name] = $value;
}
if (!filter_var($clean['email'], FILTER_VALIDATE_EMAIL)) {
    reply(422, ['ok' => false, 'error' => 'invalid_email'], $wantsJson);
}

// Protection contre l'injection d'en-têtes : aucun retour à la ligne dans les champs courts
$oneLine = fn(string $s) => preg_replace('/[\r\n]+/', ' ', $s);

$body = "Nouvelle demande depuis le formulaire de contact du site.\n\n";
foreach ($fields as $name => [$label]) {
    $value = $name === 'message' ? $clean[$name] : $oneLine($clean[$name]);
    $body .= "$label : " . ($value !== '' ? $value : '—') . "\n";
}

$subject = 'Demande de diagnostic — ' . $oneLine($clean['prenom'] . ' ' . $clean['nom']) . ' (' . $oneLine($clean['enjeu']) . ')';
$headers = [
    'From' => 'Site Financiale <' . MAIL_FROM . '>',
    'Reply-To' => $oneLine($clean['email']),
    'Content-Type' => 'text/plain; charset=UTF-8',
    'Content-Transfer-Encoding' => '8bit',
    'MIME-Version' => '1.0',
];

if ($SMTP) {
    $sent = smtp_send($SMTP, $SMTP['to'] ?? MAIL_TO, $subject, $body, $oneLine($clean['email']));
} else {
    $sent = mail(MAIL_TO, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers, '-f' . MAIL_FROM);
}

$sent
    ? reply(200, ['ok' => true], $wantsJson)
    : reply(502, ['ok' => false, 'error' => 'mail_failed'], $wantsJson);
