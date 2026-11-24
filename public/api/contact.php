<?php
/**
 * Formulaire de contact — version PHP pour hébergement mutualisé (équivalent de form-handler/).
 *
 * Reçoit POST /api/contact (réécrit vers ce fichier par .htaccess), valide les champs,
 * filtre les robots et envoie la demande par e-mail via la fonction mail() de l'hébergeur.
 * Aucune donnée n'est stockée ni journalisée.
 *
 * Réglages : modifier les trois constantes ci-dessous si besoin.
 * Prérequis : PHP 8.1 ou plus récent.
 */

const MAIL_TO   = 'contact@financiale.fr';            // destinataire des demandes
const MAIL_FROM = 'gestion@financiale-corporate.fr';  // doit être une adresse du domaine hébergé
const ALLOWED_HOSTS = ['www.financiale-corporate.fr', 'financiale-corporate.fr', 'www.financiale.fr', 'financiale.fr'];

header('X-Robots-Tag: noindex');

$wantsJson = str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json');

function reply(int $status, array $body, bool $json): never {
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
    $value = mb_substr(str_replace("\0", '', $value), 0, $max);
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

$sent = mail(MAIL_TO, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers, '-f' . MAIL_FROM);

$sent
    ? reply(200, ['ok' => true], $wantsJson)
    : reply(502, ['ok' => false, 'error' => 'mail_failed'], $wantsJson);
