const form = document.querySelector("#search-form");
const queryInput = document.querySelector("#query");
const hero = document.querySelector("#hero");
const resultsSection = document.querySelector("#results-section");
const resultsTitle = document.querySelector("#results-title");
const statusBox = document.querySelector("#status");
const panels = {
  web: document.querySelector("#web-results"),
  images: document.querySelector("#images-results"),
  videos: document.querySelector("#videos-results"),
  news: document.querySelector("#news-results")
};
let activeTab = "web";
let currentQuery = "";

function safeText(value="") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[char]));
}
function showEmpty(container, message) {
  container.innerHTML = `<div class="empty">${safeText(message)}</div>`;
}
function setStatus(message) { statusBox.textContent = message; }
function activateTab(tab) {
  activeTab = tab;
  document.querySelectorAll(".tab").forEach(button => button.classList.toggle("active", button.dataset.tab === tab));
  Object.entries(panels).forEach(([key, panel]) => panel.classList.toggle("hidden", key !== tab));
  setStatus("");
}
document.querySelectorAll(".tab").forEach(button => button.addEventListener("click", () => {
  activateTab(button.dataset.tab);
  if (button.dataset.tab === "images") searchImages(currentQuery);
  if (button.dataset.tab === "videos") searchVideos(currentQuery);
  if (button.dataset.tab === "news") searchNews(currentQuery);
  if (button.dataset.tab === "web") searchWeb(currentQuery);
}));
document.querySelectorAll("[data-query]").forEach(button => button.addEventListener("click", () => {
  queryInput.value = button.dataset.query;
  form.requestSubmit();
}));
document.querySelector("#new-search").addEventListener("click", () => {
  resultsSection.classList.add("hidden");
  hero.classList.remove("hidden");
  queryInput.focus();
  window.scrollTo({top:0,behavior:"smooth"});
});
form.addEventListener("submit", event => {
  event.preventDefault();
  const query = queryInput.value.trim();
  if (!query) return;
  currentQuery = query;
  resultsTitle.textContent = `“${query}”`;
  hero.classList.add("hidden");
  resultsSection.classList.remove("hidden");
  activateTab("web");
  window.scrollTo({top:0,behavior:"smooth"});
  searchWeb(query);
});

async function searchWeb(query) {
  panels.web.innerHTML = "";
  setStatus("Buscando páginas…");
  try {
    const url = `https://es.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=0&gsrlimit=10&prop=extracts|info&exintro=1&explaintext=1&inprop=url&format=json&origin=*`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("No se pudo conectar con Wikipedia");
    const data = await response.json();
    const pages = Object.values(data.query?.pages || {}).sort((a,b) => (a.index||0)-(b.index||0));
    if (!pages.length) {
      showEmpty(panels.web, "No encontramos páginas en Wikipedia para esta búsqueda. Prueba con otras palabras.");
      setStatus("0 resultados");
      return;
    }
    panels.web.innerHTML = pages.map(page => {
      const href = page.fullurl || `https://es.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g,"_"))}`;
      return `<article class="result-card"><div class="result-url">es.wikipedia.org</div><a href="${safeText(href)}" target="_blank" rel="noopener noreferrer">${safeText(page.title)}</a><p>${safeText((page.extract || "Consulta esta página para ver más información.").slice(0,420))}</p></article>`;
    }).join("");
    setStatus(`${pages.length} páginas encontradas`);
  } catch (error) {
    showEmpty(panels.web, "No se pudieron cargar las páginas. Comprueba tu conexión e inténtalo de nuevo.");
    setStatus("Error al buscar");
  }
}
async function searchImages(query) {
  panels.images.innerHTML = "";
  setStatus("Buscando imágenes…");
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent("filetype:bitmap " + query)}&gsrnamespace=6&gsrlimit=18&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=420&format=json&origin=*`;
    const response = await fetch(url);
    if (!response.ok) throw new Error();
    const data = await response.json();
    const pages = Object.values(data.query?.pages || {});
    const images = pages.map(p => ({title:p.title, info:p.imageinfo?.[0]})).filter(x => x.info?.thumburl || x.info?.url);
    if (!images.length) { showEmpty(panels.images,"No encontramos imágenes para esa búsqueda. Prueba con otras palabras."); setStatus("0 imágenes"); return; }
    panels.images.innerHTML = images.map(item => {
      const src = item.info.thumburl || item.info.url;
      const page = item.info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g,"_"))}`;
      return `<article class="image-card"><a href="${safeText(page)}" target="_blank" rel="noopener noreferrer"><img loading="lazy" src="${safeText(src)}" alt="${safeText(item.title)}"><p>${safeText(item.title.replace(/^File:/,""))}</p></a></article>`;
    }).join("");
    setStatus(`${images.length} imágenes encontradas en Wikimedia Commons`);
  } catch (error) { showEmpty(panels.images,"No se pudieron cargar las imágenes. Inténtalo otra vez."); setStatus("Error al buscar imágenes"); }
}
async function searchVideos(query) {
  panels.videos.innerHTML = "";
  setStatus("Buscando vídeos…");
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent("filetype:video " + query)}&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url|mime|extmetadata&format=json&origin=*`;
    const response = await fetch(url);
    if (!response.ok) throw new Error();
    const data = await response.json();
    const pages = Object.values(data.query?.pages || {}).filter(p => {
      const info = p.imageinfo?.[0];
      return info && ((info.mime || "").startsWith("video/") || /\.(webm|ogv|ogg|mp4)$/i.test(info.url || p.title));
    });
    if (!pages.length) {
      showEmpty(panels.videos, "No encontramos vídeos alojados en Wikimedia Commons para esa búsqueda. Prueba con otras palabras.");
      setStatus("0 vídeos");
      return;
    }
    panels.videos.innerHTML = pages.map(p => {
      const info = p.imageinfo[0], url = info.descriptionurl || info.url;
      return `<article class="result-card"><div class="result-url">Wikimedia Commons · vídeo</div><a href="${safeText(url)}" target="_blank" rel="noopener noreferrer">▷ ${safeText(p.title.replace(/^File:/,""))}</a><p>Abre la ficha del vídeo para reproducirlo y consultar su licencia.</p></article>`;
    }).join("");
    setStatus(`${pages.length} vídeos encontrados en Wikimedia Commons`);
  } catch (error) { showEmpty(panels.videos,"No se pudieron cargar los vídeos. Inténtalo otra vez."); setStatus("Error al buscar vídeos"); }
}
async function searchNews(query) {
  panels.news.innerHTML = "";
  setStatus("Buscando noticias…");
  try {
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=ArtList&format=json&maxrecords=10&sort=HybridRel`;
    const response = await fetch(url);
    if (!response.ok) throw new Error();
    const data = await response.json();
    const articles = data.articles || [];
    if (!articles.length) { showEmpty(panels.news,"No encontramos noticias para esa búsqueda. Prueba con otras palabras."); setStatus("0 noticias"); return; }
    panels.news.innerHTML = articles.map(article => {
      const date = article.seendate ? article.seendate.slice(0,8) : "";
      return `<article class="result-card"><div class="result-url">${safeText(article.domain || article.sourcecountry || "Fuente de noticias")}${date ? " · " + safeText(date) : ""}</div><a href="${safeText(article.url || "#")}" target="_blank" rel="noopener noreferrer">${safeText(article.title || "Noticia")}</a><p>${safeText(article.source || "Artículo publicado en una fuente externa.")}</p></article>`;
    }).join("");
    setStatus(`${articles.length} noticias encontradas`);
  } catch (error) { showEmpty(panels.news,"El servicio de noticias no respondió. Prueba de nuevo más tarde."); setStatus("Error al buscar noticias"); }
}
