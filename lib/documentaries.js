// Documentarios da WWE: sobre lutadores (personagens) e sobre a historia da empresa.
// Aparecem no catalogo WWE, no genero "Documentarios" (a "subpasta" do Explorar).
//
// A lista e escrita a mao; o id IMDb, o poster e a sinopse vem do Cinemeta (sem chave).
// Com o id IMDb, as fichas sao as do Cinemeta e os addons de streams respondem por eles.
// `scripts/refresh-data.js --docs` guarda o resultado em data/wwe-docs.json, para os
// catalogos responderem logo em arranques a frio; o que faltar resolve-se em execucao.
// Titulos que o Cinemeta nao encontre ficam simplesmente de fora.
const { getJson, mapLimit } = require('./httpx');
const cache = require('./cache');

const BASE = 'https://v3-cinemeta.strem.io';
const HOUR = 60 * 60 * 1000;
const TTL = 24 * HOUR;
// Espera maxima no primeiro pedido; o resto termina em segundo plano (fica em cache).
const FIRST_WAIT_MS = 8000;

const GENRE = 'Documentários';
const GROUPS = {
  wrestlers: 'Lutadores',
  company: 'História da WWE',
};

const bakedDocs = require('../data/wwe-docs.json');

// `query`: termo de pesquisa no Cinemeta (por omissao, o titulo);
// `match`: texto que o nome no Cinemeta tem de conter (por omissao, o titulo);
// `year`: ano de estreia (tolerancia de um ano).
const DOCUMENTARIES = [
  // ---- lutadores ----
  { title: 'Mr. McMahon', type: 'series', year: 2024, group: 'wrestlers' },
  { title: 'Undertaker: The Last Ride', query: 'Last Ride', match: 'last ride', type: 'series', year: 2020, group: 'wrestlers' },
  { title: 'Hulk Hogan: Real American', query: 'Hulk Hogan', match: 'hulk hogan', type: 'series', year: 2025, group: 'wrestlers' },
  { title: 'The Heartbreak Kid: Becoming Shawn Michaels', query: 'Shawn Michaels', match: 'becoming shawn michaels', type: 'movie', year: 2026, group: 'wrestlers' },
  { title: 'American Nightmare: Becoming Cody Rhodes', query: 'Cody Rhodes', match: 'becoming cody rhodes', type: 'movie', year: 2023, group: 'wrestlers' },
  { title: 'Andre the Giant', type: 'movie', year: 2018, group: 'wrestlers' },
  { title: "The Epic Journey of Dwayne 'The Rock' Johnson", query: 'Dwayne The Rock Johnson', match: 'epic journey of dwayne', type: 'movie', year: 2012, group: 'wrestlers' },
  { title: 'Rock vs. Cena: Once in a Lifetime', query: 'Rock Cena', match: 'once in a lifetime', type: 'movie', year: 2012, group: 'wrestlers' },
  { title: 'Bruno Sammartino', type: 'movie', year: 2019, group: 'wrestlers' },
  { title: 'Vice Versa: Chyna', query: 'Chyna', match: 'vice versa chyna', type: 'movie', year: 2021, group: 'wrestlers' },
  { title: 'The Legacy of Stone Cold Steve Austin', query: 'Steve Austin', match: 'legacy of stone cold', type: 'movie', year: 2008, group: 'wrestlers' },
  { title: 'Brock Lesnar: Here Comes the Pain', query: 'Brock Lesnar', match: 'here comes the pain', type: 'movie', year: 2003, group: 'wrestlers' },
  { title: 'Twist of Fate: The Matt and Jeff Hardy Story', query: 'Jeff Hardy', match: 'twist of fate', type: 'movie', year: 2008, group: 'wrestlers' },
  { title: 'The Bret Hart Story: The Best There Is, the Best There Was, the Best There Ever Will Be', query: 'Bret Hart', match: 'bret hart story', type: 'movie', year: 2005, group: 'wrestlers' },
  { title: 'Dusty Rhodes: Celebrating the Dream', query: 'Dusty Rhodes', match: 'celebrating the dream', type: 'movie', year: 2015, group: 'wrestlers' },
  { title: 'Woooooo! Becoming Ric Flair', query: 'Ric Flair', match: 'becoming ric flair', type: 'movie', year: 2022, group: 'wrestlers' },
  { title: 'Bray Wyatt: Becoming Immortal', query: 'Bray Wyatt', match: 'becoming immortal', type: 'movie', year: 2024, group: 'wrestlers' },
  { title: 'Chyna: Wrestling with Demons', query: 'Chyna', match: 'wrestling with demons', type: 'movie', year: 2023, group: 'wrestlers' },
  { title: 'The Resurrection of Jake the Snake', query: 'Jake the Snake', match: 'jake the snake', type: 'movie', year: 2015, group: 'wrestlers' },
  { title: 'Hitman Hart: Wrestling with Shadows', match: 'wrestling with shadows', type: 'movie', year: 1998, group: 'wrestlers' },
  { title: 'Bret Hart: Survival of the Hitman', query: 'Survival of the Hitman', match: 'survival of the hitman', type: 'movie', year: 2010, group: 'wrestlers' },
  { title: 'Hart & Soul: The Hart Family Anthology', match: 'hart family', type: 'movie', year: 2010, group: 'wrestlers' },
  { title: 'The Self Destruction of the Ultimate Warrior', query: 'Self Destruction', match: 'self destruction of the ultimate warrior', type: 'movie', year: 2005, group: 'wrestlers' },
  { title: 'Warrior: The Ultimate Legend', match: 'ultimate legend', type: 'movie', year: 2014, group: 'wrestlers' },
  { title: 'Stone Cold Steve Austin: The Bottom Line on the Most Popular Superstar of All Time', match: 'bottom line', type: 'movie', year: 2011, group: 'wrestlers' },
  { title: 'Shawn Michaels: Heartbreak & Triumph', match: 'heartbreak', type: 'movie', year: 2007, group: 'wrestlers' },
  { title: 'Triple H: Thy Kingdom Come', match: 'thy kingdom come', type: 'movie', year: 2013, group: 'wrestlers' },
  { title: 'CM Punk: Best in the World', match: 'best in the world', type: 'movie', year: 2012, group: 'wrestlers' },
  { title: 'Daniel Bryan: Just Say Yes! Yes! Yes!', match: 'just say yes', type: 'movie', year: 2015, group: 'wrestlers' },
  { title: 'Batista: I Walk Alone', match: 'i walk alone', type: 'movie', year: 2009, group: 'wrestlers' },
  { title: 'Randy Orton: The Evolution of a Predator', match: 'evolution of a predator', type: 'movie', year: 2012, group: 'wrestlers' },
  { title: 'Rey Mysterio: The Life of a Masked Man', match: 'life of a masked man', type: 'movie', year: 2011, group: 'wrestlers' },
  { title: 'Eddie Guerrero: Cheating Death, Stealing Life', match: 'cheating death', type: 'movie', year: 2004, group: 'wrestlers' },
  { title: "Mick Foley's Greatest Hits & Misses: A Life in Wrestling", query: 'Mick Foley', match: 'greatest hits', type: 'movie', year: 2004, group: 'wrestlers' },
  { title: 'Macho Man: The Randy Savage Story', query: 'Randy Savage', match: 'randy savage story', type: 'movie', year: 2014, group: 'wrestlers' },
  { title: 'The American Dream: The Dusty Rhodes Story', match: 'dusty rhodes', type: 'movie', year: 2006, group: 'wrestlers' },
  { title: 'Edge: A Decade of Decadence', match: 'decade of decadence', type: 'movie', year: 2008, group: 'wrestlers' },
  { title: 'Breaking the Code: Behind the Walls of Chris Jericho', query: 'Chris Jericho', match: 'breaking the code', type: 'movie', year: 2010, group: 'wrestlers' },
  { title: 'Brian Pillman: Loose Cannon', query: 'Brian Pillman', match: 'loose cannon', type: 'movie', year: 2006, group: 'wrestlers' },
  { title: 'Finding Hulk Hogan', query: 'Hulk Hogan', type: 'movie', year: 2010, group: 'wrestlers' },
  // ---- historia da WWE ----
  { title: 'WWE: Unreal', match: 'unreal', type: 'series', year: 2025, group: 'company' },
  { title: 'WWE 24', type: 'series', year: 2015, group: 'company' },
  { title: 'WWE Chronicle', type: 'series', year: 2018, group: 'company' },
  { title: 'WWE Untold', type: 'series', year: 2018, group: 'company' },
  { title: 'WWE Ruthless Aggression', match: 'ruthless aggression', type: 'series', year: 2020, group: 'company' },
  { title: 'Biography: WWE Legends', match: 'wwe legends', type: 'series', year: 2021, group: 'company' },
  { title: 'WWE Rivals', match: 'rivals', type: 'series', year: 2022, group: 'company' },
  { title: 'WWE Evil', type: 'series', year: 2022, group: 'company' },
  { title: 'The Monday Night War: WWE vs. WCW', match: 'monday night war', type: 'series', year: 2014, group: 'company' },
  { title: 'Dark Side of the Ring', type: 'series', year: 2019, group: 'company' },
  { title: 'The Broken Skull Sessions', match: 'broken skull', type: 'series', year: 2019, group: 'company' },
  { title: 'Beyond the Mat', type: 'movie', year: 1999, group: 'company' },
  { title: 'The Rise and Fall of ECW', match: 'rise and fall of ecw', type: 'movie', year: 2004, group: 'company' },
  { title: 'The Rise and Fall of WCW', match: 'rise and fall of wcw', type: 'movie', year: 2009, group: 'company' },
  { title: 'The True Story of WrestleMania', match: 'true story of wrestlemania', type: 'movie', year: 2011, group: 'company' },
  { title: 'The Attitude Era', match: 'attitude era', type: 'movie', year: 2012, group: 'company' },
];

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function keyOf(doc) {
  return `${doc.type}:${normalize(doc.title)}`;
}

function yearOf(text) {
  const m = String(text || '').match(/(\d{4})/);
  return m ? Number(m[1]) : null;
}

// Melhor resultado da pesquisa: o nome tem de conter o texto de `match` e o ano
// bater certo (+-1). Nome igual ao titulo e ano exacto desempatam.
function pick(doc, metas) {
  const needle = normalize(doc.match || doc.title);
  const full = normalize(doc.title);
  let best = null;
  let bestScore = -1;
  for (const meta of metas || []) {
    if (!/^tt\d+$/.test(String(meta.id || ''))) continue;
    const name = normalize(meta.name);
    if (!name.includes(needle)) continue;
    const year = yearOf(meta.releaseInfo || meta.year);
    if (doc.year && year && Math.abs(year - doc.year) > 1) continue;
    const score = (name === full ? 4 : 0) + (doc.year && year === doc.year ? 2 : 0) + (meta.poster ? 1 : 0);
    if (score > bestScore) {
      best = meta;
      bestScore = score;
    }
  }
  return best;
}

async function resolve(doc) {
  const url = `${BASE}/catalog/${doc.type}/top/search=${encodeURIComponent(doc.query || doc.title)}.json`;
  const found = await getJson(url, { timeout: 15000, retries: 2 });
  const hit = pick(doc, found && found.metas);
  if (!hit) return null;
  const full = await getJson(`${BASE}/meta/${doc.type}/${hit.id}.json`, { timeout: 15000, retries: 2 });
  const meta = (full && full.meta) || hit;
  // A pesquisa nem sempre traz o ano: confirma-se na ficha completa.
  const year = yearOf(meta.releaseInfo || meta.year);
  if (doc.year && year && Math.abs(year - doc.year) > 1) return null;
  return {
    key: keyOf(doc),
    imdb: hit.id,
    type: doc.type,
    group: doc.group,
    name: String(meta.name || hit.name || doc.title).trim(),
    year: yearOf(meta.releaseInfo || meta.year) || doc.year || null,
    releaseInfo: meta.releaseInfo || (meta.year ? String(meta.year) : doc.year ? String(doc.year) : null),
    poster: meta.poster || hit.poster || null,
    background: meta.background || null,
    summary: String(meta.description || '').trim(),
    rating: meta.imdbRating || null,
  };
}

function baked() {
  return Array.isArray(bakedDocs) ? bakedDocs : [];
}

// Resolve todos os titulos da lista (os guardados no repositorio nao se repetem).
async function resolveAll({ skipBaked = true } = {}) {
  const have = new Map(skipBaked ? baked().map((d) => [d.key, d]) : []);
  const missing = DOCUMENTARIES.filter((doc) => !have.has(keyOf(doc)));
  // O Cinemeta falha pesquisas quando recebe muitas seguidas: poucas de cada vez.
  const found = await mapLimit(missing, 2, 250, resolve);
  missing.forEach((doc, i) => {
    if (found[i]) have.set(keyOf(doc), found[i]);
  });
  // Do mais recente para o mais antigo, sem titulos repetidos (no mesmo ano, a ordem
  // da lista escrita a mao).
  const seen = new Set();
  const out = [];
  for (const doc of DOCUMENTARIES) {
    const item = have.get(keyOf(doc));
    if (!item || seen.has(item.imdb)) continue;
    seen.add(item.imdb);
    out.push(item);
  }
  return out.sort((a, b) => (b.year || 0) - (a.year || 0));
}

// Lista para os catalogos. Se tudo ja estiver em data/wwe-docs.json, responde de
// imediato; senao espera ate FIRST_WAIT_MS pelo Cinemeta e devolve o que houver.
async function list() {
  const stored = baked();
  const complete = DOCUMENTARIES.every((doc) => stored.some((d) => d.key === keyOf(doc)));
  if (complete) return resolveAll();
  const pending = cache.memo('docs:wwe', TTL, () => resolveAll(), { staleMs: 7 * 24 * HOUR });
  const timeout = new Promise((r) => setTimeout(() => r(null), FIRST_WAIT_MS));
  // Se o Cinemeta demorar, a resolucao continua em segundo plano (cache.memo).
  const value = await Promise.race([pending.catch(() => null), timeout]);
  return value || stored;
}

// Ids IMDb dos documentarios guardados (para os deixar fora de outras listas).
function imdbSet() {
  return new Set(baked().map((doc) => doc.imdb));
}

function preview(doc) {
  const group = GROUPS[doc.group] || null;
  return {
    id: doc.imdb,
    type: doc.type,
    name: doc.name,
    poster: doc.poster || `https://images.metahub.space/poster/medium/${doc.imdb}/img`,
    posterShape: 'poster',
    ...(doc.background ? { background: doc.background } : {}),
    description: [group ? `Documentário · ${group}` : 'Documentário', doc.summary].filter(Boolean).join('\n\n'),
    ...(doc.releaseInfo ? { releaseInfo: doc.releaseInfo } : {}),
    genres: ['Wrestling', 'WWE', GENRE, ...(group ? [group] : [])],
    ...(doc.rating ? { imdbRating: String(doc.rating) } : {}),
  };
}

module.exports = { GENRE, GROUPS, DOCUMENTARIES, list, resolveAll, preview, keyOf, imdbSet };
