#!/usr/bin/env node
// Preenche o id `tt...` dos eventos de wrestling (WWE, AEW, TNA) que o TMDB nao traz,
// procurando pelo nome no Cinemeta, e grava em data/shows.json.
//
//   node scripts/resolve-imdb.js            # mostra o que encontraria, sem gravar
//   node scripts/resolve-imdb.js --gravar   # grava
//
// Nao precisa de chave. Os dados dos eventos nao mudam: so o campo `imdb`.
const fs = require('fs');
const path = require('path');

const imdbids = require('../lib/imdbids');
const { WRESTLING_KEYS } = require('../lib/promotions');

const FICHEIRO = path.join(__dirname, '..', 'data', 'shows.json');
const GRAVAR = process.argv.includes('--gravar');

(async () => {
  const dados = JSON.parse(fs.readFileSync(FICHEIRO, 'utf8'));
  let totalEncontrados = 0;
  let totalFaltam = 0;

  for (const key of WRESTLING_KEYS) {
    const bloco = dados[key];
    if (!bloco || !Array.isArray(bloco.movies)) continue;
    const semId = bloco.movies.filter((m) => !m.imdb).length;
    if (!semId) {
      console.log(`${key}: todos os ${bloco.movies.length} eventos ja tem id`);
      continue;
    }
    process.stdout.write(`${key}: ${semId} eventos sem id, a procurar`);
    const r = await imdbids.fillMissing(bloco.movies, key, {
      onProgress: (feitos, total) => {
        if (feitos % 25 === 0 || feitos === total) process.stdout.write('.');
      },
    });
    const amb = (r.ambiguos || []).length;
    console.log(` encontrados ${r.encontrados}, sem correspondencia ${r.faltam}${amb ? `, ${amb} ambiguos descartados` : ''}`);
    for (const a of (r.ambiguos || []).slice(0, 4)) console.log(`   ambiguo: ${a.imdb}  ${a.date}  ${a.name}`);
    for (const d of r.detalhes.slice(0, 8)) console.log(`   ${d.imdb}  ${d.date}  ${d.name}`);
    if (r.detalhes.length > 8) console.log(`   (e mais ${r.detalhes.length - 8})`);
    bloco.movies = r.movies;
    totalEncontrados += r.encontrados;
    totalFaltam += r.faltam;
  }

  console.log(`\ntotal: ${totalEncontrados} ids novos | ${totalFaltam} sem correspondencia no IMDb`);
  for (const key of WRESTLING_KEYS) {
    const mv = (dados[key] && dados[key].movies) || [];
    console.log(`  ${key}: ${mv.filter((m) => m.imdb).length}/${mv.length} com id`);
  }

  if (!GRAVAR) {
    console.log('\n(ensaio: nada gravado -- corre com --gravar para escrever)');
    return;
  }
  fs.writeFileSync(FICHEIRO, JSON.stringify(dados));
  console.log('\ndata/shows.json gravado');
})().catch((e) => {
  console.error('ERRO', e);
  process.exit(1);
});
