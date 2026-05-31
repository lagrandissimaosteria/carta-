// ─── CREDENZIALI SUPABASE ────────────────────────────────────────────────────
// FIX: supabase-js v2 non supporta le "publishable key" (sb_publishable_...).
// Usa la "anon / public" key dal pannello: Project Settings → API → anon public
// (inizia con eyJhbGciOiJIUzI1NiIs…)
// In alternativa, se SB_KEY è una publishable key, il codice prova a costruire
// la chiamata REST diretta come fallback automatico.
const SB_URL = "https://aznqjmhzbehpmvxnxbzs.supabase.co";
const SB_KEY = "sb_publishable_FnsZcIMLdfbaABqmwx3I2A_rXfRmHhY";
// ↑ Sostituisci con la tua anon key eyJ... per il funzionamento ottimale.
//   Il fallback REST funziona ma non supporta realtime.
const DB_USER = "default";

// ── RILEVAZIONE TIPO CHIAVE ──────────────────────────────────────────────────
// Le publishable key non funzionano con createClient → usiamo REST diretto
var _useRestFallback = SB_KEY.startsWith("sb_publishable_") || SB_KEY.startsWith("sb_");

// Ordine categorie visualizzate come "Sezioni" nella carta
const CAT_ORDER = ["Spumante","Bianco","Macerato","Rosato","Rosso","Naturale","Dolce","Passito","Liquoroso","Magnum","Altro"];
const CAT_LABELS = {
  Rosso:"Rossi", Bianco:"Bianchi", Rosato:"Rosati", Spumante:"Bolle",
  Naturale:"Naturali", Dolce:"Dolci", Passito:"Passiti", Liquoroso:"Liquorosi",
  Macerato:"Macerati", Magnum:"Grandi Formati", Altro:"Altro"
};

// Mappa colori sidebar per categoria
const CAT_COLORS = {
  Spumante:"#4a90c4", Bianco:"#c8a84b", Macerati:"#b07d3a", Macerato:"#b07d3a",
  Rosato:"#c8607a", Rosso:"#8B1A1A", Naturale:"#3a6b4a",
  Dolce:"#9b59b6", Passito:"#c0392b", Liquoroso:"#d35400",
  Magnum:"#32ADE6", Altro:"#78716c"
};

var db={}, catConfig=[], fCat="tutti", fSearch="";
var pMin=0, pMax=500, pMaxG=500;
var fState={paese:"",regione:"",produttore:"",vitigno:""};
var _idxById=new Map();
var _sb=null;

// ── INFERISCE IL PAESE DALLA REGIONE ─────────────────────────────────────────
var _REGIONE_TO_PAESE = {
  // Italia
  "abruzzo":"Italia","alto adige":"Italia","basilicata":"Italia","calabria":"Italia",
  "campania":"Italia","emilia romagna":"Italia","emilia-romagna":"Italia",
  "friuli venezia giulia":"Italia","friuli":"Italia","lazio":"Italia",
  "liguria":"Italia","lombardia":"Italia","marche":"Italia","molise":"Italia",
  "piemonte":"Italia","puglia":"Italia","sardegna":"Italia","sicilia":"Italia",
  "toscana":"Italia","trentino alto adige":"Italia","trentino":"Italia",
  "umbria":"Italia","valle d'aosta":"Italia","veneto":"Italia",
  "collio":"Italia","colli euganei":"Italia","soave":"Italia","amarone":"Italia",
  // Francia
  "alsazia":"Francia","ardeche":"Francia","ardèche":"Francia",
  "auvergne":"Francia","beaujolais":"Francia","bordeaux":"Francia",
  "borgogna":"Francia","chablis":"Francia","champagne":"Francia",
  "cotes catalanes":"Francia","côtes catalanes":"Francia",
  "jura":"Francia","languedoc":"Francia","languedoc – roussillon":"Francia",
  "languedoc - roussillon":"Francia","loira":"Francia","loire":"Francia",
  "nuova aquitania – charente":"Francia","nuova aquitania – dordogna":"Francia",
  "provenza":"Francia","provence":"Francia","rodano":"Francia","rhône":"Francia",
  "rhone":"Francia","roussillon":"Francia","savoia":"Francia",
  "sud ouest":"Francia","alsace":"Francia","bourgogne":"Francia",
  // Germania
  "baden":"Germania","franconia":"Germania","mosella":"Germania","mosel":"Germania",
  "pfalz":"Germania","rheingau":"Germania","rheinhessen":"Germania",
  "ahr":"Germania","nahe":"Germania","württemberg":"Germania",
  // Austria
  "burgenland":"Austria","niederösterreich":"Austria","steiermark":"Austria",
  "wagram":"Austria","wachau":"Austria","kamptal":"Austria","kremstal":"Austria",
  "vienna":"Austria","wien":"Austria","vino di vienna":"Austria",
  // Spagna
  "andalusia":"Spagna","bierzo":"Spagna","canarias":"Spagna",
  "castilla y leon":"Spagna","catalogna":"Spagna","catalunya":"Spagna",
  "gran canaria":"Spagna","lanzarote":"Spagna","manchuela":"Spagna",
  "paesi baschi":"Spagna","pais vasco":"Spagna","priorat":"Spagna",
  "rias baixas":"Spagna","ribera del duero":"Spagna","rioja":"Spagna",
  "tenerife":"Spagna","villanueva de avila":"Spagna","navarra":"Spagna",
  "jerez":"Spagna","madrid":"Spagna","la mancha":"Spagna","galicia":"Spagna",
  "andia":"Spagna",
  // Portogallo
  "alentejo":"Portogallo","bairrada":"Portogallo","douro":"Portogallo",
  "minho":"Portogallo","serra da estrela":"Portogallo","vinho verde":"Portogallo",
  "duriense":"Portogallo","algarve":"Portogallo","beira":"Portogallo",
  // Slovenia
  "collio sloveno":"Slovenia","brda":"Slovenia","karst":"Slovenia",
  // Grecia
  "santorini":"Grecia","naoussa":"Grecia","nemea":"Grecia","crete":"Grecia",
  "creta":"Grecia","makedonia":"Grecia","macedonia":"Grecia",
  // Bulgaria
  "rila":"Bulgaria","thrace":"Bulgaria","tracia":"Bulgaria",
  // Serbia
  "serbia":"Serbia","sumadija":"Serbia",
  // Australia
  "margaret river":"Australia","victoria":"Australia","barossa":"Australia",
  "mclaren vale":"Australia","hunter valley":"Australia","tasmania":"Australia",
  // Nuova Zelanda
  "central otago":"Nuova Zelanda","marlborough":"Nuova Zelanda",
  "hawke's bay":"Nuova Zelanda","nelson":"Nuova Zelanda",
  // Cile
  "maipo valley":"Cile","colchagua":"Cile","casablanca":"Cile","leyda":"Cile",
  // Sudafrica
  "western cape":"Sudafrica","stellenbosch":"Sudafrica","swartland":"Sudafrica",
  // Stati Uniti
  "sonoma":"Stati Uniti","napa":"Stati Uniti","napa valley":"Stati Uniti",
  "willamette":"Stati Uniti","oregon":"Stati Uniti","finger lakes":"Stati Uniti",
  // Svizzera
  "aargau":"Svizzera","valais":"Svizzera","vaud":"Svizzera","ticino":"Svizzera",
  // Libano
  "valle della beeka":"Libano","bekaa":"Libano","beka":"Libano",
};

function inferPaese(nazione, regione, zona){
  if(nazione) return nazione;
  var r = (regione||zona||"").toLowerCase().trim();
  if(!r) return "";
  if(_REGIONE_TO_PAESE[r]) return _REGIONE_TO_PAESE[r];
  var keys = Object.keys(_REGIONE_TO_PAESE);
  for(var i=0;i<keys.length;i++){
    if(r.indexOf(keys[i])>-1 || keys[i].indexOf(r)>-1) return _REGIONE_TO_PAESE[keys[i]];
  }
  return "";
}

// ── GESTIONE OVERFLOW BODY (modal + drawer possono coesistere su mobile) ──────
var _overlayCount = 0;
function _lockScroll(){ _overlayCount++; document.body.style.overflow="hidden"; }
function _unlockScroll(){ _overlayCount=Math.max(0,_overlayCount-1); if(_overlayCount===0) document.body.style.overflow=""; }

function esc(s){var d=document.createElement("div");d.textContent=s||"";return d.innerHTML;}

function _setStatus(state){
  var dot=document.getElementById("sb-dot");
  var lbl=document.getElementById("sb-lbl");
  if(!dot)return;
  dot.className=state;
  var labels={ok:"Live",sync:"Sync...",err:"Offline",off:"Offline"};
  lbl.textContent=labels[state]||"DB";
}

// ── FETCH DATI: supporta sia supabase-js sia REST diretto (fallback publishable key) ──
async function _fetchWinesRaw(){
  if(!_useRestFallback && _sb){
    // Percorso normale: supabase-js con anon key
    var r = await _sb.from("cm_wines").select("data").eq("user_id", DB_USER).maybeSingle();
    if(r.error) throw r.error;
    return (r.data && r.data.data) ? r.data.data : [];
  } else {
    // Fallback REST diretto per publishable key (o quando _sb non disponibile)
    // Nota: le publishable key supportano le REST API ma non il realtime
    var url = SB_URL + "/rest/v1/cm_wines?select=data&user_id=eq." + encodeURIComponent(DB_USER) + "&limit=1";
    var resp = await fetch(url, {
      headers: {
        "apikey": SB_KEY,
        "Authorization": "Bearer " + SB_KEY,
        "Accept": "application/json"
      }
    });
    if(!resp.ok){
      var errText = await resp.text();
      throw new Error("HTTP " + resp.status + ": " + errText);
    }
    var rows = await resp.json();
    return (rows && rows.length && rows[0].data) ? rows[0].data : [];
  }
}

async function loadWines(){
  var wines = await _fetchWinesRaw();
  // Filtra solo vini con giacenza > 0
  wines = wines.filter(function(w){ return (w.giacenza||0) > 0; });
  // Costruisci db per categoria (tipologia)
  var d = {};
  CAT_ORDER.forEach(function(t){ d[t] = []; });
  wines.forEach(function(w){
    var rawTipo = w.tipologia || "Altro";
    var fmt = parseFloat(w.formato) || 0.75;
    var cat;
    if(fmt > 0.75){
      cat = "Magnum";
    } else {
      cat = (function(t){
        var BOLLE = ["Champagne","Champagne Rosè","Metodo Classico","Metodo Classico Rosato",
                     "Rifermentato","Rifermentato Rosso","Rifermentato Rosato","Col Fondo",
                     "Colfondo","Ancestrale","Metodo Charmat","Sidro","Sidro di Pera",
                     "Petillant","Spumante","Bolle"];
        if(BOLLE.indexOf(t) > -1) return "Spumante";
        if(t==="Bianco" || t==="Bianchi" || t==="Bianko") return "Bianco";
        if(t==="Rosso" || t==="Rossi") return "Rosso";
        if(t==="Rosato" || t==="Rosati") return "Rosato";
        if(t==="Macerato" || t==="Macerati" || t==="Orange") return "Macerato";
        if(t==="Naturale") return "Naturale";
        if(t==="Dolce" || t==="Vino Dolce") return "Dolce";
        if(t==="Passito" || t==="Passito rosso") return "Passito";
        if(t==="Liquoroso" || t==="Vino Liquoroso" || t==="Vino Ossidativo") return "Liquoroso";
        return "Altro";
      })(rawTipo);
    }
    if(!d[cat]) d[cat] = [];
    var nome = w.nome || w.nomeVino || w.n || "";
    var prod = w.produttore || "";
    var pCarta = w.prezzoCarta || "";
    var _fmtP = function(v){ var s=parseFloat(v).toFixed(2); return s.replace(/\.00$/,"").replace(/(\.\d)0$/,"$1"); };
    var pNum = pCarta ? parseFloat(String(pCarta).replace(/[^0-9.,]/g,"").replace(",",".")) || 0 : 0;
    var pFmt = pNum > 0 ? "€ " + _fmtP(pNum) : "";
    d[cat].push({
      id: w.id,
      n: nome,
      produttore: prod,
      annata: w.annata || "",
      p: pFmt,
      b: (w.prezzoCalice||w.prezzoAlCalice) ? "€ "+_fmtP(parseFloat(w.prezzoCalice||w.prezzoAlCalice)) : "",
      vitigno: w.vitigni || w.vitigno || "",
      regione: w.regione || "",
      zona: w.zona || "",
      nazione: inferPaese(w.nazione, w.regione, w.zona),
      paese: inferPaese(w.nazione, w.regione, w.zona),
      tipologia: cat,
      formato: fmt > 0.75 ? fmt : null,
      qty: w.giacenza || 0,
      note: w.noteVeloce || w.note || "",
      _p: pNum
    });
  });
  // Costruisci catConfig dai tipi presenti
  catConfig = CAT_ORDER.filter(function(t){ return d[t] && d[t].length > 0; })
    .map(function(t){ return { nome: t, label: CAT_LABELS[t]||t, colore: CAT_COLORS[t]||"#888" }; });
  // Ricalcola pMaxG dai prezzi reali dei vini
  var allPrices = Object.values(d).reduce(function(acc,arr){ return acc.concat(arr.map(function(w){ return w._p||0; })); },[]);
  var realMax = allPrices.length ? Math.max.apply(null, allPrices) : 500;
  var newMax = Math.ceil(realMax/50)*50; if(newMax < 50) newMax = 50;
  if(pMaxG !== newMax){ pMaxG = newMax; pMax = newMax; pMin = 0; }
  return d;
}

// ── REALTIME (solo con anon key / supabase-js) ────────────────────────────────
async function _sbListen(){
  if(_useRestFallback || !_sb) return; // il realtime non funziona con publishable key
  try{
    _sb.channel("cm-wines-changes")
      .on("postgres_changes",{event:"*",schema:"public",table:"cm_wines"},function(){
        _setStatus("sync");
        loadWines().then(function(d){
          db=d; _buildIdxById(); applyFilters(); buildSidebar(); _setStatus("ok");
        }).catch(function(){ _setStatus("err"); });
      }).subscribe();
  }catch(e){}
}

// ── POLLING FALLBACK (usato con publishable key — aggiorna ogni 60s) ──────────
var _pollInterval = null;
function _startPolling(){
  if(_pollInterval) return;
  _pollInterval = setInterval(function(){
    _setStatus("sync");
    loadWines().then(function(d){
      db=d; _buildIdxById(); applyFilters(); buildSidebar(); _setStatus("ok");
    }).catch(function(){ _setStatus("err"); });
  }, 60000);
}

async function init(){
  _setStatus("sync");
  try{
    if(!_useRestFallback){
      // Percorso normale con anon key
      _sb = supabase.createClient(SB_URL, SB_KEY);
    }
    db = await loadWines();
    _buildIdxById();
    applyFilters(); buildSidebar(); buildSortBar();
    _setStatus("ok");
    if(!_useRestFallback){
      _sbListen();
    } else {
      // Con publishable key: polling ogni 60s come fallback al realtime
      _startPolling();
    }
  }catch(e){
    _setStatus("err");
    var wl = document.getElementById("wine-list");
    if(wl) wl.innerHTML="<div class=\"vuoto\">Errore caricamento dati.<br><small style='opacity:.6'>"+esc(e.message||"Controlla la connessione")+"</small></div>";
    console.error("[carta] init error:", e);
  }
}

function _buildIdxById(){
  _idxById.clear();
  Object.keys(db).forEach(function(cat){
    (db[cat]||[]).forEach(function(w){ _idxById.set(w.id,{v:w,c:cat}); });
  });
}

function applyFilters(){
  var sortSel = document.getElementById("sort-sel");
  var sortVal = sortSel ? sortSel.value : "default";
  var html=""; var total=0;
  var catsToShow = fCat==="tutti" ? catConfig.map(function(c){return c.nome;}) : [fCat];
  catsToShow.forEach(function(cat){
    var wines = (db[cat]||[]).filter(function(w){
      if(fSearch){
        var q=fSearch.toLowerCase();
        var hay=(w.n||"")+(w.produttore||"")+(w.vitigno||"")+(w.regione||"")+(w.paese||"")+(w.nazione||"")+(w.annata||"");
        if(hay.toLowerCase().indexOf(q)<0) return false;
      }
      if(fState.paese && (w.paese||"").toLowerCase()!==fState.paese.toLowerCase()) return false;
      if(fState.regione && (w.regione||"").toLowerCase()!==fState.regione.toLowerCase()) return false;
      if(fState.produttore && (w.produttore||"").toLowerCase()!==fState.produttore.toLowerCase()) return false;
      if(fState.vitigno && !(w.vitigno||"").toLowerCase().includes(fState.vitigno.toLowerCase())) return false;
      if(w._p<pMin || (pMax<pMaxG && w._p>pMax)) return false;
      return true;
    });
    if(sortVal==="az") wines.sort(function(a,b){return(a.n||"").localeCompare(b.n||"","it");});
    else if(sortVal==="za") wines.sort(function(a,b){return(b.n||"").localeCompare(a.n||"","it");});
    else if(sortVal==="asc") wines.sort(function(a,b){return a._p-b._p;});
    else if(sortVal==="desc") wines.sort(function(a,b){return b._p-a._p;});
    if(!wines.length) return;
    total += wines.length;
    var label = CAT_LABELS[cat]||cat;
    html += "<div class=\"sezione\"><div class=\"sezione-titolo\">"+esc(label)+"</div>";
    wines.forEach(function(w){ html += _buildWineRow(w,cat); });
    html += "</div>";
  });
  var rc = document.getElementById("results-count");
  if(rc) rc.textContent = total+" etichett"+(total===1?"a":"e");
  var wl = document.getElementById("wine-list");
  if(wl) wl.innerHTML = html || "<div class=\"vuoto\">Nessun vino trovato.</div>";
  _syncFabBadge();
  document.querySelectorAll(".vino[data-id]").forEach(function(el){
    el.addEventListener("click",function(){ openModal(el.getAttribute("data-id")); });
  });
}

function _buildWineRow(w,cat){
  var slug = cat.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
  var cls = "vino vino-"+slug;

  // 1. Nome + annata inline corsivo + badge formato se grande
  var annataHtml = w.annata
    ? "<span class=\"vino-annata\">"+esc(w.annata)+"</span>"
    : "";
  var formatoBadge = w.formato
    ? "<span style=\"display:inline-block;margin-left:6px;font-size:9px;font-weight:700;padding:1px 6px;border:1px solid rgba(50,173,230,.5);color:#32ADE6;background:rgba(50,173,230,.1);border-radius:3px;vertical-align:middle;letter-spacing:.04em\">"+esc(w.formato+"L")+"</span>"
    : "";
  var nomeHtml = "<div class=\"vino-nome\">"+esc(w.n)+annataHtml+formatoBadge+"</div>";

  // 2. Produttore
  var prodHtml = w.produttore
    ? "<div class=\"vino-prod\">"+esc(w.produttore)+"</div>"
    : "";

  // 3. Vitigno corsivo
  var vitignoHtml = w.vitigno
    ? "<div class=\"vino-vitigno\">"+esc(w.vitigno)+"</div>"
    : "";

  // 4. Geo
  var geoParts = [];
  if(w.zona)    geoParts.push("<span class=\"vino-regione\">"+esc(w.zona)+"</span>");
  if(w.regione && w.regione !== w.zona) geoParts.push("<span class=\"vino-regione\">"+esc(w.regione)+"</span>");
  if(w.nazione) geoParts.push("<span class=\"vino-paese-tag\">"+esc(w.nazione)+"</span>");
  var geoHtml = geoParts.length
    ? "<div class=\"vino-geo\">"+geoParts.join("<span class='vino-geo-sep'>·</span>")+"</div>"
    : "";

  // 5. Prezzo
  var prezzoHtml = "<div class=\"vino-prezzo\">"+(w.p||"—")+"</div>"
    +(w.b ? "<div class=\"vino-bicchiere\">calice "+esc(w.b)+"</div>" : "");

  return "<div class=\""+cls+"\" data-id=\""+w.id+"\">"
    +"<div class=\"vino-sx\">"+nomeHtml+prodHtml+vitignoHtml+geoHtml+"</div>"
    +"<div class=\"vino-dx\">"+prezzoHtml+"</div>"
    +"</div>";
}

function buildSidebar(){
  var html="";
  // ── Search box (sidebar desktop + drawer mobile) ──────────────────
  var sv = fSearch||"";
  html+="<div class=\"sb-search-wrap\">"
    +"<input class=\"sb-search-input\" id=\"sb-search-input\" type=\"search\" "
    +"placeholder=\"Cerca vino, produttore…\" value=\""+esc(sv)+"\" "
    +"oninput=\"onSearch(this)\" autocomplete=\"off\">"
    +(sv?"<button class=\"sb-search-clear\" onclick=\"clearSearch()\">×</button>":"")
    +"</div>";
  // ── Sezione Categorie come accordion
  var catOpen = (fCat !== "tutti");
  html+="<div class=\"sb-acc-wrap"+(catOpen?" open":"")+"\" id=\"wrap-acc-cat\">"
    +"<div class=\"sb-acc-head\" onclick=\"_toggleAcc('acc-cat')\">"
    +"<span class=\"sb-acc-title\">Categoria</span>"
    +"<span class=\"sb-acc-arrow\">▼</span></div>"
    +"<div class=\"sb-acc-body\" id=\"acc-cat\">"
    +"<ul class=\"cat-list\">"
    +"<li class=\"cat-item"+(fCat==="tutti"?" active":"")+"\" data-cat=\"tutti\">"
    +"<span class=\"cat-dot\"></span><span class=\"cat-label\">Tutte le etichette</span>"
    +"<span class=\"cat-count\">"+countAll()+"</span></li>";
  catConfig.forEach(function(c){
    var n = (db[c.nome]||[]).length;
    html+="<li class=\"cat-item"+(fCat===c.nome?" active":"")+"\" data-cat=\""+esc(c.nome)+"\">"
      +"<span class=\"cat-dot\" style=\"background:"+c.colore+"\"></span>"
      +"<span class=\"cat-label\">"+esc(c.label||c.nome)+"</span>"
      +"<span class=\"cat-count\">"+n+"</span></li>";
  });
  html+="</ul></div></div>";
  // Filtri accordion
  [
    {field:"paese",      label:"Paese"},
    {field:"regione",    label:"Regione"},
    {field:"produttore", label:"Produttore"},
    {field:"vitigno",    label:"Vitigno"}
  ].forEach(function(f){
    var vals = _getUniqueVals(f.field); if(!vals.length) return;
    var isOpen = !!(fState[f.field]);
    var uid = "acc-"+f.field;
    var tuttiLabel = (f.field==="paese"||f.field==="regione") ? "Tutti" : "Tutte";
    html+="<div class=\"sb-acc-wrap"+(isOpen?" open":"")+"\" id=\"wrap-"+uid+"\">"
      +"<div class=\"sb-acc-head\" onclick=\"_toggleAcc('"+uid+"')\">"
      +"<span class=\"sb-acc-title\">"+f.label+"</span>"
      +"<span class=\"sb-acc-arrow\">▼</span></div>"
      +"<div class=\"sb-acc-body\" id=\""+uid+"\">"
      +"<ul class=\"sb-filter-list\">"
      +"<li class=\"sb-filter-item"+(fState[f.field]===""?" active":"")+"\" "
        +"onclick=\"fState['"+f.field+"']='';applyFilters();buildSidebar();\">"+tuttiLabel+"</li>";
    vals.forEach(function(v){
      var isAct = fState[f.field]===v;
      html+="<li class=\"sb-filter-item"+(isAct?" active":"")+" sb-fval\" "
        +"data-field=\""+esc(f.field)+"\" data-val=\""+esc(v)+"\">"
        +esc(v)+"</li>";
    });
    html+="</ul></div></div>";
  });
  // Prezzo accordion
  var prezzoOpen = (pMin>0||pMax<pMaxG);
  html+="<div class=\"sb-acc-wrap"+(prezzoOpen?" open":"")+"\" id=\"wrap-acc-prezzo\">"
    +"<div class=\"sb-acc-head\" onclick=\"_toggleAcc('acc-prezzo')\">"
    +"<span class=\"sb-acc-title\">Prezzo bottiglia</span>"
    +"<span class=\"sb-acc-arrow\">▼</span></div>"
    +"<div class=\"sb-acc-body\" id=\"acc-prezzo\">"
    +"<div class=\"price-row\"><span>€ "+pMin+"</span><span>€ "+pMax+(pMax>=pMaxG?"+":"")+"</span></div>"
    +"<div class=\"dual-range-wrap\"><div class=\"dual-range-track\"></div>"
    +"<div class=\"dual-range-fill\" id=\"range-fill\"></div>"
    +"<input type=\"range\" id=\"range-min\" min=\"0\" max=\""+pMaxG+"\" step=\"5\" value=\""+pMin+"\" oninput=\"onRangeMin(this.value)\">"
    +"<input type=\"range\" id=\"range-max\" min=\"0\" max=\""+pMaxG+"\" step=\"5\" value=\""+pMax+"\" oninput=\"onRangeMax(this.value)\"></div>"
    +"</div></div>";
  html+="<div class=\"sb-sec\" style=\"padding-top:8px\"><button class=\"btn-reset-all\" onclick=\"resetAll()\">↺ Reset filtri</button></div>";
  document.getElementById("sidebar-inner").innerHTML = html;
  _updateRangeFill();
  document.querySelectorAll(".cat-item[data-cat], .sb-btn[data-cat]").forEach(function(el){
    el.addEventListener("click",function(){ setFCat(el.getAttribute("data-cat")); });
  });
  // BUG5 fix: event delegation per filtri con apostrofi nei valori
  document.querySelectorAll("#sidebar-inner .sb-fval[data-field]").forEach(function(el){
    el.addEventListener("click",function(){
      fState[el.getAttribute("data-field")] = el.getAttribute("data-val");
      applyFilters(); buildSidebar();
    });
  });
}

function _toggleAcc(id){
  var body = document.getElementById(id); if(!body) return;
  var wrap = document.getElementById("wrap-"+id); if(!wrap) return;
  wrap.classList.toggle("open");
}

function buildSortBar(){
  var wrap = document.getElementById("sort-bar-wrap"); if(!wrap) return;
  wrap.innerHTML="<span class=\"sort-label\">Ordina</span>"
    +"<select class=\"sort-select\" id=\"sort-sel\" onchange=\"applyFilters()\"><option value=\"default\">Default</option>"
    +"<option value=\"az\">A → Z</option><option value=\"za\">Z → A</option>"
    +"<option value=\"asc\">Prezzo ↑</option><option value=\"desc\">Prezzo ↓</option></select>";
}

function countAll(){ return catConfig.reduce(function(s,c){return s+(db[c.nome]||[]).length;},0); }
function _getUniqueVals(field){
  var set=new Set();
  catConfig.forEach(function(c){
    (db[c.nome]||[]).forEach(function(w){
      if(!w[field]) return;
      if(field==="vitigno"){
        w[field].split(",").forEach(function(v){ var t=v.trim(); if(t) set.add(t); });
      } else {
        set.add(w[field]);
      }
    });
  });
  return Array.from(set).sort(function(a,b){ return a.localeCompare(b,"it"); });
}
function setFCat(cat){ fCat=cat; applyFilters(); buildSidebar(); }
function onRangeMin(v){ v=parseInt(v); if(v>pMax-5)v=pMax-5; pMin=v; applyFilters(); _updateRangeFill(); var el=document.getElementById("range-min"); if(el)el.value=v; }
function onRangeMax(v){ v=parseInt(v); if(v<pMin+5)v=pMin+5; pMax=v; applyFilters(); _updateRangeFill(); var el=document.getElementById("range-max"); if(el)el.value=v; }
function _updateRangeFill(){ var fill=document.getElementById("range-fill"); if(!fill)return; var p1=pMin/pMaxG*100,p2=pMax/pMaxG*100; fill.style.left=p1+"%"; fill.style.width=(p2-p1)+"%"; }
function onSearch(inp){ fSearch=inp.value; var cl=document.getElementById("search-clear"); if(cl)cl.classList.toggle("show",!!fSearch); var sb=document.getElementById("sb-search-input"); if(sb&&sb!==inp)sb.value=fSearch; applyFilters(); }
function clearSearch(){ fSearch=""; var inp=document.getElementById("search-input"); if(inp)inp.value=""; var cl=document.getElementById("search-clear"); if(cl)cl.classList.remove("show"); var sb=document.getElementById("sb-search-input"); if(sb)sb.value=""; applyFilters(); }
function resetAll(){ fCat="tutti"; fSearch=""; pMin=0; pMax=pMaxG; fState={paese:"",regione:"",produttore:"",vitigno:""}; var inp=document.getElementById("search-input"); if(inp)inp.value=""; var cl=document.getElementById("search-clear"); if(cl)cl.classList.remove("show"); applyFilters(); buildSidebar(); }

// ── MODAL DETTAGLIO VINO ──────────────────────────────────────────────────────
function openModal(id){
  var item=_idxById.get(id); if(!item)return;
  var w=item.v, cat=item.c;

  var catEl = document.getElementById("modal-cat");
  var nomeEl = document.getElementById("modal-nome");
  var annataEl = document.getElementById("modal-annata");
  var prezzoEl = document.getElementById("modal-prezzo");
  var bodyEl = document.getElementById("modal-body");
  var noteEl = document.getElementById("modal-note-wrap");

  if(catEl) catEl.textContent = CAT_LABELS[cat]||cat;
  if(nomeEl) nomeEl.textContent = w.n;
  if(annataEl) annataEl.textContent = w.annata?"Annata "+w.annata:"";

  var p="";
  if(w.p) p+="<div class=\"modal-p-item\"><div class=\"modal-p-lbl\">Bottiglia</div><div class=\"modal-p-val\">"+esc(w.p)+"</div></div>";
  if(w.b) p+="<div class=\"modal-p-item\"><div class=\"modal-p-lbl\">Al calice</div><div class=\"modal-p-val\">"+esc(w.b)+"</div></div>";
  if(prezzoEl) prezzoEl.innerHTML = p;

  var body="";
  [
    ["Produttore", w.produttore],
    ["Formato", w.formato?(w.formato+"L"):null],
    ["Regione", w.regione],
    ["Zona", w.zona && w.zona!==w.regione ? w.zona : null],
    ["Nazione", w.nazione],
    ["Vitigno", w.vitigno],
    ["Tipologia", w.tipologia]
  ].forEach(function(r){
    if(r[1]) body+="<div class=\"modal-row\"><span class=\"modal-lbl\">"+r[0]+"</span><span class=\"modal-val\">"+esc(r[1])+"</span></div>";
  });
  if(bodyEl) bodyEl.innerHTML = body||"<p style=\"color:var(--grey);font-size:13px\">Nessun dettaglio disponibile.</p>";

  // Nota sommelier — mostra solo se presente
  if(noteEl){
    if(w.note && w.note.trim()){
      noteEl.style.display="block";
      var noteTxtEl = document.getElementById("modal-note-text");
      if(noteTxtEl) noteTxtEl.textContent = w.note;
    } else {
      noteEl.style.display="none";
    }
  }

  var modal = document.getElementById("modal");
  if(modal) modal.classList.add("show");

  // Previeni scroll body su mobile quando il modal è aperto
  _lockScroll();
}
function closeModal(e){ if(e && e.target!==document.getElementById("modal")) return; closeModalDirect(); }
function closeModalDirect(){
  var modal = document.getElementById("modal");
  if(modal) modal.classList.remove("show");
  _unlockScroll();
}
document.addEventListener("keydown",function(e){ if(e.key==="Escape") closeModalDirect(); });

// ── DRAWER FILTRI MOBILE ──────────────────────────────────────────────────────
function _countActiveFilters(){ var n=0; if(fCat!=="tutti")n++; if(fSearch)n++; if(pMin>0||pMax<pMaxG)n++; if(fState.paese)n++; if(fState.regione)n++;  if(fState.produttore)n++; if(fState.vitigno)n++; return n; }
function _syncFabBadge(){
  var n=_countActiveFilters();
  var b=document.getElementById("fab-badge");
  if(b){ b.textContent=n; b.classList.toggle("show",n>0); }
  // Aggiorna anche il contatore nel drawer handle se visibile
  var dh = document.getElementById("drawer-handle-count");
  if(dh){ dh.textContent = n>0 ? " ("+n+")" : ""; }
}

function openDrawer(){
  var body=document.getElementById("drawer-body");
  var src=document.getElementById("sidebar-inner");
  if(!body || !src) return;
  body.innerHTML=src.innerHTML;
  document.getElementById("filter-drawer").classList.add("open");
  document.getElementById("drawer-overlay").classList.add("show");
  _lockScroll();
  // Ricollega i listener dopo innerHTML replace
  document.querySelectorAll("#drawer-body .cat-item[data-cat], #drawer-body .sb-btn[data-cat]").forEach(function(el){
    el.addEventListener("click",function(){ setFCat(el.getAttribute("data-cat")); closeDrawer(); });
  });
  // BUG5 fix: event delegation per filtri con apostrofi nei valori (drawer)
  document.querySelectorAll("#drawer-body .sb-fval[data-field]").forEach(function(el){
    el.addEventListener("click",function(){
      fState[el.getAttribute("data-field")] = el.getAttribute("data-val");
      applyFilters(); buildSidebar(); closeDrawer();
    });
  });
  // Ricollega range sliders nel drawer
  var rMin = body.querySelector("#range-min");
  var rMax = body.querySelector("#range-max");
  if(rMin) rMin.addEventListener("input", function(){ onRangeMin(this.value); _syncDrawerRangeFill(); });
  if(rMax) rMax.addEventListener("input", function(){ onRangeMax(this.value); _syncDrawerRangeFill(); });
}
function _syncDrawerRangeFill(){
  var fill = document.querySelector("#drawer-body #range-fill");
  if(!fill) return;
  var p1=pMin/pMaxG*100, p2=pMax/pMaxG*100;
  fill.style.left=p1+"%"; fill.style.width=(p2-p1)+"%";
}
function closeDrawer(){
  var fd = document.getElementById("filter-drawer");
  var ov = document.getElementById("drawer-overlay");
  if(fd) fd.classList.remove("open");
  if(ov) ov.classList.remove("show");
  _unlockScroll();
  _syncFabBadge();
}

// ── TOUCH SWIPE per chiudere il drawer trascinando verso il basso ─────────────
(function(){
  var startY=0, drawerEl=null;
  document.addEventListener("touchstart",function(e){
    drawerEl = document.getElementById("filter-drawer");
    if(!drawerEl || !drawerEl.classList.contains("open")) return;
    startY = e.touches[0].clientY;
  },{passive:true});
  document.addEventListener("touchend",function(e){
    if(!drawerEl || !drawerEl.classList.contains("open")) return;
    var dy = e.changedTouches[0].clientY - startY;
    if(dy > 80) closeDrawer(); // swipe down > 80px chiude il drawer
  },{passive:true});
})();

init();
