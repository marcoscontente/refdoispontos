<?php
// Recebe os pedidos de /quero/ ("Quero esse relógio") e grava uma linha por envio em quero.csv.
// A planilha fica FORA da pasta pública do site (uma pasta acima de public_html), em
// quero-privado/quero.csv — abra pelo Gerenciador de Arquivos do hPanel.
// Se essa pasta não puder ser criada, usa quero/dados/, bloqueada por .htaccess.
//
// GET ?verificar=1 só diz se a gravação está funcionando (não mostra nenhum envio).

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

function responder($codigo, $dados) {
  http_response_code($codigo);
  echo json_encode($dados, JSON_UNESCAPED_UNICODE);
  exit;
}

function pasta_dos_dados() {
  $fora = dirname(__DIR__, 2) . '/quero-privado';
  if (is_dir($fora) || @mkdir($fora, 0700, true)) {
    if (is_writable($fora)) return [$fora, 'fora da pasta pública'];
  }
  $dentro = __DIR__ . '/dados';
  if (!is_dir($dentro)) @mkdir($dentro, 0700, true);
  if (!file_exists($dentro . '/.htaccess')) {
    @file_put_contents($dentro . '/.htaccess', "Require all denied\nDeny from all\n");
  }
  return [$dentro, 'quero/dados (bloqueada)'];
}

// Célula que começa com = + - @ vira texto no Excel, para não executar fórmula.
function celula($v) {
  $v = trim(preg_replace('/\s+/u', ' ', (string) $v));
  return preg_match('/^[=+\-@\t\r]/', $v) ? "'" . $v : $v;
}

function campo($nome, $max) {
  $v = isset($_POST[$nome]) && is_string($_POST[$nome]) ? trim($_POST[$nome]) : '';
  return mb_substr($v, 0, $max);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['verificar'])) {
  [$pasta, $onde] = pasta_dos_dados();
  responder(200, ['ok' => is_writable($pasta), 'onde' => $onde]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  responder(405, ['ok' => false, 'erro' => 'Use o formulário da página.']);
}

// Robô: preencheu o campo escondido ou enviou rápido demais. Finge que deu certo e não grava.
$t = isset($_POST['t']) ? (int) $_POST['t'] : 0;
$segundos = $t > 0 ? (microtime(true) * 1000 - $t) / 1000 : 999;
if (campo('site', 200) !== '' || $segundos < 3) {
  responder(200, ['ok' => true]);
}

$marca = campo('marca', 80);
$modelo = campo('modelo', 120);
$cor = campo('cor', 60);
$referencia = campo('referencia', 60);
$nome = campo('nome', 80);
$email = campo('email', 120);
$telefone = campo('telefone', 20);

$faltando = [];
if (mb_strlen($marca) < 2) $faltando[] = 'marca';
if (mb_strlen($modelo) < 2) $faltando[] = 'modelo';
if ($faltando) {
  responder(422, ['ok' => false, 'erro' => 'Preencha: ' . implode(', ', $faltando) . '.']);
}
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
  responder(422, ['ok' => false, 'erro' => 'Confira o e-mail ou deixe em branco.']);
}
$digitos = preg_replace('/\D/', '', $telefone);
if ($digitos !== '' && (strlen($digitos) < 10 || strlen($digitos) > 13)) {
  responder(422, ['ok' => false, 'erro' => 'Confira o telefone ou deixe em branco.']);
}

[$pasta, $onde] = pasta_dos_dados();
$arquivo = $pasta . '/quero.csv';

// Limite: no máximo 5 envios por hora do mesmo endereço (guardado só como código, não o IP).
$ip = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|ref-quero');
$limite = $pasta . '/limite.json';
$agora = time();
$registro = is_file($limite) ? (json_decode((string) @file_get_contents($limite), true) ?: []) : [];
foreach ($registro as $k => $vezes) {
  $registro[$k] = array_values(array_filter($vezes, fn($x) => $x > $agora - 3600));
  if (!$registro[$k]) unset($registro[$k]);
}
if (count($registro[$ip] ?? []) >= 5) {
  responder(429, ['ok' => false, 'erro' => 'Muitos envios seguidos.']);
}
$registro[$ip][] = $agora;
@file_put_contents($limite, json_encode($registro), LOCK_EX);

$novo = !is_file($arquivo);
$f = @fopen($arquivo, 'a');
if (!$f) responder(500, ['ok' => false, 'erro' => 'Não foi possível guardar o pedido.']);
flock($f, LOCK_EX);
if ($novo) {
  fwrite($f, "\xEF\xBB\xBF"); // BOM: o Excel abre os acentos certos
  fputcsv($f, ['data', 'marca', 'modelo', 'cor', 'referência', 'nome', 'e-mail', 'telefone'], ';');
}
date_default_timezone_set('America/Sao_Paulo');
fputcsv($f, array_map('celula', [date('Y-m-d H:i'), $marca, $modelo, $cor, $referencia, $nome, $email, $telefone]), ';');
flock($f, LOCK_UN);
fclose($f);

responder(200, ['ok' => true]);
