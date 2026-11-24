#!/usr/bin/env node
// Preenche o "asin" das ofertas da Amazon em data/ofertas.json, seguindo o link curto do canal.
// Com o ASIN, gerar-campanhas.mjs escreve o link direto https://www.amazon.com.br/dp/<ASIN>?tag=...
// Oferta da Amazon sem ASIN não entra no site (não existe card da Amazon sem link com a tag).
//
//   node scripts/resolver-amazon.mjs            resolve as que faltam
//   node scripts/resolver-amazon.mjs --todas    resolve de novo todas as ofertas da Amazon

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { asinDoEndereco, resolverAsin } from './amazon.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARQUIVO = path.join(RAIZ, 'data/ofertas.json');
const TODAS = process.argv.includes('--todas');

const dados = JSON.parse(await readFile(ARQUIVO, 'utf8'));
const faltam = dados.ofertas.filter((o) => o.loja === 'amazon' && !o.exemplo && (TODAS || !o.asin));
let certas = 0;
for (const o of faltam) {
  try {
    o.asin = asinDoEndereco(o.link) || await resolverAsin(o.link);
    certas++;
    console.log(`${o.id}: ${o.asin}`);
  } catch (erro) {
    console.warn(`${o.id}: ASIN não encontrado (${erro.message}); fica fora do site até a próxima rodada`);
  }
}
if (certas) await writeFile(ARQUIVO, JSON.stringify(dados, null, 2) + '\n');
console.log(`Amazon: ${certas} de ${faltam.length} ofertas resolvidas.`);
