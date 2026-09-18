// Cinemeta (o catalogo oficial do Stremio) usado apenas como fonte de **ids**, nao de
// dados: os titulos, datas, imagens e sinopses continuam a vir do TMDB.
//
// Serve duas coisas, so no wrestling (WWE, AEW, TNA):
//   - a numeracao de temporada/episodio que os addons de streams esperam, porque e a
//     do IMDb e nem sempre coincide com a do TMDB (ver `withStreamNumbers` em store.js);
//   - o id `tt...` de eventos em que o TMDB nao traz o campo `imdb_id` (ver
//     `scripts/resolve-imdb.js`).
//
// Nao precisa de chave.
const { getJson } = require('./httpx');
const cache = require('./cache');

const BASE = 'https://v3-cinemeta.strem.io';
const HOUR = 60 * 60 * 1000;
const DIA = 24 * HOUR;

function isImdbId(id) {
  return /^tt\d+$/.test(String(id || ''));
}

function dia(valor) {
  const texto = String(valor || '');
  return /^\d{4}-\d{2}-\d{2}/.test(texto) ? texto.slice(0, 10) : null;
}

function ano(meta) {
  const m = String((meta && (meta.year || meta.releaseInfo)) || '').match(/(\d{4})/);
  return m ? Number(m[1]) : null;
}

// Episodios de um programa, com a numeracao do IMDb.
async function episodes(imdb) {
  if (!isImdbId(imdb)) return [];
  return cache.memo(
    `cinemeta:episodios:${imdb}`,
    6 * HOUR,
    async () => {
      const json = await getJson(`${BASE}/meta/series/${imdb}.json`, { timeout: 15000, retries: 1 });
      const videos = (json && json.meta && json.meta.videos) || [];
      return videos
        .map((v) => {
          const season = Number(v.season);
          const number = Number(v.episode != null ? v.episode : v.number);
          if (!Number.isFinite(season) || season <= 0 || !Number.isFinite(number) || number <= 0) return null;
          return { season, number, airdate: dia(v.released || v.firstAired), name: String(v.name || '').trim() };
        })
        .filter(Boolean)
        .sort((a, b) => a.season - b.season || a.number - b.number);
    },
    { staleMs: 3 * DIA }
  );
}

// Pesquisa por nome no catalogo do Cinemeta. Devolve poucas dezenas de resultados por
// termo -- chega para confirmar o id de um evento concreto.
async function search(tipo, termo) {
  const texto = String(termo || '').trim();
  if (!texto) return [];
  return cache.memo(
    `cinemeta:pesquisa:${tipo}:${texto.toLowerCase()}`,
    6 * HOUR,
    async () => {
      const url = `${BASE}/catalog/${tipo}/top/search=${encodeURIComponent(texto)}.json`;
      const json = await getJson(url, { timeout: 15000, retries: 1 });
      const metas = (json && json.metas) || [];
      return metas
        .filter((m) => isImdbId(m.id))
        .map((m) => ({ imdb: m.id, name: String(m.name || '').trim(), year: ano(m), type: tipo }));
    },
    { staleMs: 3 * DIA }
  );
}

// Ficha de um evento, so com o que serve para confirmar que e o mesmo: nome, ano e data.
async function movie(imdb) {
  if (!isImdbId(imdb)) return null;
  return cache.memo(
    `cinemeta:movie:${imdb}`,
    12 * HOUR,
    async () => {
      const json = await getJson(`${BASE}/meta/movie/${imdb}.json`, { timeout: 15000, retries: 1 });
      const meta = (json && json.meta) || null;
      if (!meta) return null;
      return { imdb, name: String(meta.name || '').trim(), year: ano(meta), date: dia(meta.released) };
    },
    { staleMs: 7 * DIA }
  );
}

module.exports = { isImdbId, episodes, search, movie };
