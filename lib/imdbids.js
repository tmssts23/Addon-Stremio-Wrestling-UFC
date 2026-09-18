// Descobre o id `tt...` de eventos em que o TMDB nao traz o campo `imdb_id`, procurando
// pelo nome no Cinemeta. So se usa no wrestling (WWE, AEW, TNA) e so para o id: os
// dados do evento continuam a ser os do TMDB.
//
// A correspondencia e conservadora, porque um id errado manda os addons de streams
// buscar outro evento. Exige tres coisas: o mesmo conjunto de palavras (tirada a marca
// da promocao e o ano), o mesmo ano, e que nenhum outro evento tenha ficado com o mesmo
// id. Assim, "WWE WrestleMania 42 – Saturday" nao casa com "WWE WrestleMania 42 in COSM
// Shared Reality" nem com a noite de domingo, e "TNA Unbreakable 2025" nao casa com "The
// Unbreakable Boy". Um id que falte e muito menos grave do que um id errado.
const cinemeta = require('./cinemeta');
const { mapLimit } = require('./httpx');

// Palavras que nao ajudam a distinguir edicoes.
const VAZIAS = new Set(['the', 'a', 'o', 'of', 'de', 'da', 'do', 'and', 'e', 'wwe', 'wwf', 'aew', 'tna', 'in', 'at', 'on']);
const MARCAS = /^(wwe|wwf|wcw|ecw|aew|tna|all elite wrestling|impact wrestling|total nonstop action)\b[:\s-]*/i;

function palavras(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

function significativas(texto) {
  return palavras(texto).filter((p) => !VAZIAS.has(p));
}

function semMarca(nome) {
  let texto = String(nome || '');
  for (let i = 0; i < 2; i++) texto = texto.replace(MARCAS, '');
  return texto.trim();
}

function anoDe(item) {
  if (item.year) return Number(item.year);
  const m = String(item.date || '').match(/^(\d{4})/);
  return m ? Number(m[1]) : null;
}

// Data em dias inteiros, para comparar duas datas sem contas de fuso horario.
function emDias(iso) {
  const valor = Date.parse(`${String(iso || '').slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(valor) ? Math.round(valor / (24 * 60 * 60 * 1000)) : null;
}

// O ano e comparado a parte, por isso nao conta como palavra: no TMDB um evento chama-se
// "WWE Royal Rumble 2024" e no IMDb "WWE Royal Rumble", com o ano no campo proprio.
function semAno(lista, ano) {
  return lista.filter((p) => !(/^\d{4}$/.test(p) && Math.abs(Number(p) - ano) <= 1));
}

function temAnoNoNome(nome, ano) {
  return palavras(nome).some((p) => /^\d{4}$/.test(p) && Math.abs(Number(p) - ano) <= 1);
}

// A ficha do IMDb tem de se identificar como da promocao. Sem isto, eventos com nome
// generico -- no TMDB ha um "Bad Blood" e um "Royal Rumble" sem prefixo -- casavam com
// qualquer filme homonimo do mesmo ano (o "Bad Blood" de 1987, por exemplo).
const MARCADORES = {
  wwe: /\b(wwe|wwf|wcw|ecw|nxt)\b/i,
  aew: /\b(aew|all elite)\b/i,
  tna: /\b(tna|impact|total nonstop)\b/i,
};

function daPromocao(promoKey, candidato) {
  const marcador = MARCADORES[promoKey];
  return marcador ? marcador.test(String(candidato.name || '')) : false;
}

// Um candidato serve quando o conjunto de palavras e **o mesmo**, nao apenas parecido. Um
// subconjunto nao chega: tirada a marca e o ano, "TNA Unbreakable 2025" fica em
// "unbreakable", que e subconjunto de "The Unbreakable Boy", e "AEW Blood & Guts" cabe
// dentro de "Blood, Guts and Sunshine: The History of Horror Made in Florida". Com
// igualdade, esses candidatos caem.
function serve(evento, candidato, promoKey) {
  if (!daPromocao(promoKey, candidato)) return false;
  const ano = anoDe(evento);
  if (!ano || !candidato.year) return false;
  // Quando o nome do evento traz o ano (ha uma edicao por ano), exige-se o mesmo ano:
  // senao a edicao de 2022 casaria com a ficha de 2023.
  const margem = temAnoNoNome(evento.name, ano) ? 0 : 1;
  if (Math.abs(candidato.year - ano) > margem) return false;
  const doEvento = semAno(significativas(evento.name), ano);
  if (!doEvento.length) return false;
  const doCandidato = semAno(significativas(candidato.name), ano);
  if (doEvento.length !== doCandidato.length) return false;
  const conjunto = new Set(doCandidato);
  return doEvento.every((p) => conjunto.has(p));
}

function pontos(evento, candidato) {
  const ano = anoDe(evento);
  const mesmoAno = candidato.year === ano ? 2 : 0;
  const tamanho = Math.abs(significativas(candidato.name).length - significativas(evento.name).length);
  return mesmoAno - tamanho / 10;
}

// Procura o id de um evento. Devolve `null` quando nao ha correspondencia segura.
async function lookup(evento, promoKey) {
  const termos = [evento.name, semMarca(evento.name)];
  const vistos = new Set();
  const candidatos = [];
  for (const termo of termos) {
    if (!termo || vistos.has(termo.toLowerCase())) continue;
    vistos.add(termo.toLowerCase());
    const achados = await cinemeta.search('movie', termo).catch(() => []);
    for (const a of achados) candidatos.push(a);
  }
  const bons = candidatos.filter((c) => serve(evento, c, promoKey));
  if (!bons.length) return null;
  bons.sort((a, b) => pontos(evento, b) - pontos(evento, a));

  // Confirmacao final pela data da propria ficha: a pesquisa so traz o ano, e um ano de
  // diferenca chega para trocar de edicao (o "WWE Bad Blood" do IMDb e de 05/10/2024,
  // nao do evento de 31/10/2025). Sem data na ficha, exige-se o mesmo ano.
  const ano = anoDe(evento);
  const diaEvento = emDias(evento.date);
  for (const candidato of bons) {
    const ficha = await cinemeta.movie(candidato.imdb).catch(() => null);
    if (!ficha) continue;
    const diaFicha = emDias(ficha.date);
    if (diaFicha !== null && diaEvento !== null) {
      if (Math.abs(diaFicha - diaEvento) <= 7) return candidato.imdb;
      continue;
    }
    if (ficha.year === ano) return candidato.imdb;
  }
  return null;
}

// Preenche o `imdb` dos eventos que nao o tem. Devolve a lista nova e o que aconteceu.
async function fillMissing(movies, promoKey, { concurrency = 4, spacing = 80, onProgress = null } = {}) {
  const faltam = movies.filter((m) => !m.imdb);
  if (!faltam.length) return { movies, encontrados: 0, faltam: 0, detalhes: [], ambiguos: [] };

  let feitos = 0;
  const ids = await mapLimit(faltam, concurrency, spacing, async (evento) => {
    const id = await lookup(evento, promoKey);
    feitos += 1;
    if (onProgress) onProgress(feitos, faltam.length);
    return id;
  });

  // Um id que caiba em dois eventos diferentes e ambiguo (ex.: duas noites do mesmo
  // evento, ou duas edicoes com ficha unica no IMDb): nesse caso nao se usa em nenhum.
  const quantos = new Map();
  for (const id of ids) if (id) quantos.set(id, (quantos.get(id) || 0) + 1);

  const porNome = new Map();
  const detalhes = [];
  const ambiguos = [];
  faltam.forEach((evento, i) => {
    const id = ids[i];
    if (!id) return;
    if (quantos.get(id) > 1) {
      ambiguos.push({ name: evento.name, date: evento.date, imdb: id });
      return;
    }
    porNome.set(`${evento.id}`, id);
    detalhes.push({ name: evento.name, date: evento.date, imdb: id });
  });

  const out = movies.map((m) => (m.imdb || !porNome.has(`${m.id}`) ? m : { ...m, imdb: porNome.get(`${m.id}`) }));
  return {
    movies: out,
    encontrados: porNome.size,
    faltam: faltam.length - porNome.size,
    detalhes,
    ambiguos,
  };
}

module.exports = { lookup, fillMissing, semMarca, significativas };
