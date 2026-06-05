// ─── CREDENZIALI SUPABASE ────────────────────────────────────────────────────
const SB_URL = "https://aznqjmhzbehpmvxnxbzs.supabase.co";
const SB_KEY = "sb_publishable_FnsZcIMLdfbaABqmwx3I2A_rXfRmHhY";
const DB_USER = "default";

var _useRestFallback = SB_KEY.startsWith("sb_publishable_") || SB_KEY.startsWith("sb_");

const CAT_ORDER = ["Spumante","Bianco","Macerato","Rosato","Rosso","Naturale","Dolce","Passito","Liquoroso","Magnum","Altro"];
const CAT_LABELS = {
  Rosso:"Rossi", Bianco:"Bianchi", Rosato:"Rosati", Spumante:"Bolle",
  Naturale:"Naturali", Dolce:"Dolci", Passito:"Passiti", Liquoroso:"Liquorosi",
  Macerato:"Macerati", Magnum:"Grandi Formati", Altro:"Altro"
};
const CAT_COLORS = {
  Spumante:  "#8EA8B8",  // grigio-azzurro polvere
  Bianco:    "#B5A060",  // oro antico
  Macerato:  "#9C7A50",  // cuoio
  Rosato:    "#B87878",  // cipria scura
  Rosso:     "#7A3030",  // borgogna spento
  Naturale:  "#5C7A58",  // verde oliva
  Dolce:     "#8A6A8A",  // malva cenere
  Passito:   "#8A4A40",  // terracotta
  Liquoroso: "#9A6030",  // ambra scura
  Magnum:    "#607080",  // acciaio blu
  Altro:     "#787068"   // grigio caldo neutro
};

// ── STATO GLOBALE ─────────────────────────────────────────────────────────────
var currentView = 'calice'; // 'calice' | 'mescita' | 'cantina'
var db={}, catConfig=[], fCat="tutti", fSearch="";
var pMin=0, pMax=500, pMaxG=500;
var fState={paese:"",regione:"",produttore:"",vitigno:""};
var _idxById=new Map();
var _sb=null;

var _REGIONE_TO_PAESE = {
  "abruzzo":"Italia","alto adige":"Italia","basilicata":"Italia","calabria":"Italia",
  "campania":"Italia","emilia romagna":"Italia","emilia-romagna":"Italia",
  "friuli venezia giulia":"Italia","friuli":"Italia","lazio":"Italia",
  "liguria":"Italia","lombardia":"Italia","marche":"Italia","molise":"Italia",
  "piemonte":"Italia","puglia":"Italia","sardegna":"Italia","sicilia":"Italia",
  "toscana":"Italia","trentino alto adige":"Italia","trentino":"Italia",
  "umbria":"Italia","valle d'aosta":"Italia","veneto":"Italia",
  "collio":"Italia","colli euganei":"Italia","soave":"Italia","amarone":"Italia",
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
  "baden":"Germania","franconia":"Germania","mosella":"Germania","mosel":"Germania",
  "pfalz":"Germania","rheingau":"Germania","rheinhessen":"Germania",
  "ahr":"Germania","nahe":"Germania","württemberg":"Germania",
  "burgenland":"Austria","niederösterreich":"Austria","steiermark":"Austria",
  "wagram":"Austria","wachau":"Austria","kamptal":"Austria","kremstal":"Austria",
  "vienna":"Austria","wien":"Austria","vino di vienna":"Austria",
  "andalusia":"Spagna","bierzo":"Spagna","canarias":"Spagna",
  "castilla y leon":"Spagna","catalogna":"Spagna","catalunya":"Spagna",
  "gran canaria":"Spagna","lanzarote":"Spagna","manchuela":"Spagna",
  "paesi baschi":"Spagna","pais vasco":"Spagna","priorat":"Spagna",
  "rias baixas":"Spagna","ribera del duero":"Spagna","rioja":"Spagna",
  "tenerife":"Spagna","villanueva de avila":"Spagna","navarra":"Spagna",
  "jerez":"Spagna","madrid":"Spagna","la mancha":"Spagna","galicia":"Spagna",
  "andia":"Spagna",
  "alentejo":"Portogallo","bairrada":"Portogallo","douro":"Portogallo",
  "minho":"Portogallo","serra da estrela":"Portogallo","vinho verde":"Portogallo",
  "duriense":"Portogallo","algarve":"Portogallo","beira":"Portogallo",
  "collio sloveno":"Slovenia","brda":"Slovenia","karst":"Slovenia",
  "santorini":"Grecia","naoussa":"Grecia","nemea":"Grecia","crete":"Grecia",
  "creta":"Grecia","makedonia":"Grecia","macedonia":"Grecia",
  "rila":"Bulgaria","thrace":"Bulgaria","tracia":"Bulgaria",
  "serbia":"Serbia","sumadija":"Serbia",
  "margaret river":"Australia","victoria":"Australia","barossa":"Australia",
  "mclaren vale":"Australia","hunter valley":"Australia","tasmania":"Australia",
  "central otago":"Nuova Zelanda","marlborough":"Nuova Zelanda",
  "hawke's bay":"Nuova Zelanda","nelson":"Nuova Zelanda",
  "maipo valley":"Cile","colchagua":"Cile","casablanca":"Cile","leyda":"Cile",
  "western cape":"Sudafrica","stellenbosch":"Sudafrica","swartland":"Sudafrica",
  "sonoma":"Stati Uniti","napa":"Stati Uniti","napa valley":"Stati Uniti",
  "willamette":"Stati Uniti","oregon":"Stati Uniti","finger lakes":"Stati Uniti",
  "aargau":"Svizzera","valais":"Svizzera","vaud":"Svizzera","ticino":"Svizzera",
  "valle della beeka":"Libano","bekaa":"Libano","beka":"Libano",
};

function inferPaese(nazione, regione, zona){
  if(nazione) return nazione;
  var r=(regione||zona||"").toLowerCase().trim(); if(!r) return "";
  if(_REGIONE_TO_PAESE[r]) return _REGIONE_TO_PAESE[r];
  var keys=Object.keys(_REGIONE_TO_PAESE);
  for(var i=0;i<keys.length;i++){ if(r.indexOf(keys[i])>-1||keys[i].indexOf(r)>-1) return _REGIONE_TO_PAESE[keys[i]]; }
  return "";
}

var _overlayCount=0;
function _lockScroll(){ _overlayCount++; document.body.style.overflow="hidden"; }
function _unlockScroll(){ _overlayCount=Math.max(0,_overlayCount-1); if(_overlayCount===0) document.body.style.overflow=""; }
function esc(s){ var d=document.createElement("div"); d.textContent=s||""; return d.innerHTML; }
function _setStatus(state){
  var dot=document.getElementById("sb-dot"),lbl=document.getElementById("sb-lbl"); if(!dot)return;
  dot.className=state; lbl.textContent={ok:"Live",sync:"Sync...",err:"Offline",off:"Offline"}[state]||"DB";
}
function _pgEsc(s){ return String(s).replace(/'/g,"''"); }

async function _fetchWinesRaw(){
  if(!_useRestFallback && _sb){
    var r=await _sb.from("cm_wines").select("data").eq("user_id",DB_USER).maybeSingle();
    if(r.error) throw r.error;
    return (r.data&&r.data.data)?r.data.data:[];
  } else {
    var url=SB_URL+"/rest/v1/cm_wines?select=data&user_id=eq."+encodeURIComponent(_pgEsc(DB_USER))+"&limit=1";
    var resp=await fetch(url,{headers:{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY,"Accept":"application/json"}});
    if(!resp.ok){ var errText=await resp.text(); throw new Error("HTTP "+resp.status+": "+errText); }
    var rows=await resp.json();
    return (rows&&rows.length&&rows[0].data)?rows[0].data:[];
  }
}

var _BOLLE=["Champagne","Champagne Rosè","Metodo Classico","Metodo Classico Rosato",
            "Rifermentato","Rifermentato Rosso","Rifermentato Rosato","Col Fondo",
            "Colfondo","Ancestrale","Metodo Charmat","Sidro","Sidro di Pera",
            "Petillant","Spumante","Bolle"];
function getCategoryByTipologia(t){
  if(_BOLLE.indexOf(t)>-1) return "Spumante";
  if(t==="Bianco"||t==="Bianchi") return "Bianco";
  if(t==="Rosso"||t==="Rossi") return "Rosso";
  if(t==="Rosato"||t==="Rosati") return "Rosato";
  if(t==="Macerato"||t==="Macerati"||t==="Orange") return "Macerato";
  if(t==="Naturale") return "Naturale";
  if(t==="Dolce"||t==="Vino Dolce") return "Dolce";
  if(t==="Passito"||t==="Passito rosso") return "Passito";
  if(t==="Liquoroso"||t==="Vino Liquoroso"||t==="Vino Ossidativo") return "Liquoroso";
  return "Altro";
}
function _fmtP(v){ var s=parseFloat(v).toFixed(2); return s.replace(/\.00$/,"").replace(/(\.\d)0$/,"$1"); }

async function loadWines(){
  var wines=await _fetchWinesRaw();
  wines=wines.filter(function(w){ return (w.giacenza||0)>0; });
  var d={}; CAT_ORDER.forEach(function(t){ d[t]=[]; });
  wines.forEach(function(w){
    var rawTipo=w.tipologia||"Altro";
    var fmt=parseFloat(w.formato)||0.75;
    var cat=fmt>0.75?"Magnum":getCategoryByTipologia(rawTipo);
    if(!d[cat]) d[cat]=[];
    var nome=w.nome||w.nomeVino||w.n||"";
    var prod=w.produttore||"";
    var pCarta=w.prezzoCarta||"";
    var pNum=pCarta?parseFloat(String(pCarta).replace(/[^0-9.,]/g,"").replace(/\.(?=\d{3})/g,"").replace(",","."))||0:0;
    var pCalice=parseFloat(w.prezzoCalice||w.prezzoAlCalice)||0;
    var _paese=inferPaese(w.nazione,w.regione,w.zona);
    d[cat].push({
      id:w.id, n:nome, produttore:prod, annata:w.annata||"",
      p:pNum>0?"€ "+_fmtP(pNum):"",
      b:pCalice>0?"€ "+_fmtP(pCalice):"",
      prezzo_carta:pNum,
      prezzo_calice:pCalice,
      vitigno:w.vitigni||w.vitigno||"",
      regione:w.regione||"", zona:w.zona||"",
      nazione:_paese, paese:_paese,
      tipologia:cat,
      formato:fmt>0.75?fmt:null,
      qty:w.giacenza||0,
      note:w.noteVeloce||w.note||"",
      _p:pNum
    });
  });
  catConfig=CAT_ORDER.filter(function(t){ return d[t]&&d[t].length>0; })
    .map(function(t){ return {nome:t,label:CAT_LABELS[t]||t,colore:CAT_COLORS[t]||"#888"}; });
  var allPrices=Object.values(d).reduce(function(acc,arr){ return acc.concat(arr.map(function(w){ return w._p||0; })); },[]);
  var realMax=allPrices.length?Math.max.apply(null,allPrices):500;
  var newMax=Math.ceil(realMax/50)*50; if(newMax<50) newMax=50;
  if(pMaxG!==newMax){
    var uCMax=(pMax<pMaxG), uCMin=(pMin>0);
    pMaxG=newMax;
    if(!uCMax) pMax=newMax;
    if(!uCMin) pMin=0;
  }
  return d;
}

// ── REALTIME / POLLING ────────────────────────────────────────────────────────
async function _sbListen(){
  if(_useRestFallback||!_sb) return;
  try{
    _sb.channel("cm-wines-changes")
      .on("postgres_changes",{event:"*",schema:"public",table:"cm_wines"},function(){
        _setStatus("sync");
        loadWines().then(function(d){ db=d; _buildIdxById(); applyFilters(); buildSidebar(); _setStatus("ok"); }).catch(function(){ _setStatus("err"); });
      }).subscribe();
  }catch(e){}
}
var _pollInterval=null;
var _pollInFlight=false;
function _startPolling(){
  if(_pollInterval) return;
  _pollInterval=setInterval(function(){
    if(_pollInFlight) return;
    _pollInFlight=true;
    _setStatus("sync");
    loadWines().then(function(d){ db=d; _buildIdxById(); applyFilters(); buildSidebar(); _setStatus("ok"); }).catch(function(){ _setStatus("err"); }).finally(function(){ _pollInFlight=false; });
  },60000);
}

async function init(){
  _setStatus("sync");
  try{
    if(!_useRestFallback){ _sb=supabase.createClient(SB_URL,SB_KEY); }
    db=await loadWines(); _buildIdxById();
    _syncViewUI(currentView);
    applyFilters(); buildSidebar(); buildSortBar();
    // ── EVENT DELEGATION: unico listener su #wine-list invece di N listener per vino ──
    var _wl=document.getElementById("wine-list");
    if(_wl) _wl.addEventListener("click",function(e){
      var el=e.target.closest(".vino[data-id]"); if(el) openModal(el.getAttribute("data-id"));
    });
    _setStatus("ok");
    if(!_useRestFallback){ _sbListen(); } else { _startPolling(); }
  }catch(e){
    _setStatus("err");
    var wl=document.getElementById("wine-list");
    if(wl) wl.innerHTML="<div class=\"vuoto\">Errore caricamento dati.<br><small style='opacity:.6'>"+esc(e.message||"Controlla la connessione")+"</small></div>";
    console.error("[carta] init error:",e);
  }
}

function _buildIdxById(){
  _idxById.clear();
  Object.keys(db).forEach(function(cat){
    (db[cat]||[]).forEach(function(w){ if(w.id!=null) _idxById.set(String(w.id),{v:w,c:cat}); });
  });
}

var MESCITA_MAX_PREZZO = 45; // soglia massima bottiglia per vista mescita

// ── MACRO-FILTRO PER VISTA ────────────────────────────────────────────────────
function _getViewFilteredWines(cat){
  var wines=(db[cat]||[]);
  if(currentView==='calice') return wines.filter(function(w){ return w.prezzo_calice>0; });
  if(currentView==='mescita') return wines.filter(function(w){ return w.prezzo_carta>0&&w.prezzo_carta<=MESCITA_MAX_PREZZO; });
  return wines; // 'cantina': tutti
}

function _matchesFilters(w){
  if(fSearch){
    var q=fSearch.toLowerCase();
    var hay=(w.n||"")+(w.produttore||"")+(w.vitigno||"")+(w.zona||"")+(w.regione||"")+(w.paese||"")+(w.nazione||"")+(w.annata||"");
    if(hay.toLowerCase().indexOf(q)<0) return false;
  }
  if(fState.paese&&(w.paese||"").toLowerCase()!==fState.paese.toLowerCase()) return false;
  if(fState.regione&&(w.regione||"").toLowerCase()!==fState.regione.toLowerCase()) return false;
  if(fState.produttore&&(w.produttore||"").toLowerCase()!==fState.produttore.toLowerCase()) return false;
  if(fState.vitigno&&!(w.vitigno||"").toLowerCase().includes(fState.vitigno.toLowerCase())) return false;
  if(w._p>0&&w._p<pMin) return false;
  if(pMax<pMaxG&&w._p>pMax) return false;
  return true;
}

function applyFilters(){
  var sortSel=document.getElementById("sort-sel");
  var sortVal=sortSel?sortSel.value:"default";
  var html=""; var total=0;
  var catsToShow=fCat==="tutti"?catConfig.map(function(c){return c.nome;}):[fCat];

  catsToShow.forEach(function(cat){
    var wines=_getViewFilteredWines(cat).filter(_matchesFilters);
    if(sortVal==="az") wines.sort(function(a,b){return(a.n||"").localeCompare(b.n||"","it");});
    else if(sortVal==="za") wines.sort(function(a,b){return(b.n||"").localeCompare(a.n||"","it");});
    else if(sortVal==="asc") wines.sort(function(a,b){return a._p-b._p;});
    else if(sortVal==="desc") wines.sort(function(a,b){return b._p-a._p;});
    if(!wines.length) return;
    total+=wines.length;

    if(currentView==='calice'){
      html+="<div class=\"sezione\"><div class=\"sezione-titolo\">"+esc(CAT_LABELS[cat]||cat)+"</div>";
      wines.forEach(function(w){ html+=_buildCaliceRow(w,cat); });
      html+="</div>";
    } else if(currentView==='mescita'){
      html+="<div class=\"sezione\"><div class=\"sezione-titolo\">"+esc(CAT_LABELS[cat]||cat)+"</div>";
      wines.forEach(function(w){ html+=_buildWineRow(w,cat); });
      html+="</div>";
    } else {
      html+="<div class=\"sezione\"><div class=\"sezione-titolo\">"+esc(CAT_LABELS[cat]||cat)+"</div>";
      wines.forEach(function(w){ html+=_buildWineRow(w,cat); });
      html+="</div>";
    }
  });

  var rc=document.getElementById("results-count");
  var viewLabel=currentView==='calice'?"al calice":currentView==='mescita'?"in mescita":"in cantina";
  if(rc) rc.textContent=total+" etichett"+(total===1?"a":"e")+" "+viewLabel;
  var wl=document.getElementById("wine-list");
  if(wl) wl.innerHTML=html||"<div class=\"vuoto\">Nessun vino trovato.</div>";
  _syncFabBadge();
}

function _buildWineRow(w,cat){
  var slug=cat.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
  var accentColor=CAT_COLORS[cat]||"#787068";
  var annata=w.annata?"<span class='w-annata'>"+esc(w.annata)+"</span>":"";
  var formato=w.formato?"<span class='w-formato'>"+esc(w.formato+"L")+"</span>":"";
  var meta=[];
  if(w.produttore) meta.push("<span class='w-prod'>"+esc(w.produttore)+"</span>");
  if(w.vitigno)    meta.push("<span class='w-vitigno'>"+esc(w.vitigno)+"</span>");
  var metaHtml=meta.length?"<div class='w-meta'>"+meta.join("<span class='w-sep'>\u00b7</span>")+"</div>":"";
  var geo=[];
  if(w.zona)                        geo.push(esc(w.zona));
  if(w.regione&&w.regione!==w.zona) geo.push(esc(w.regione));
  if(w.nazione)                     geo.push(esc(w.nazione));
  var geoHtml=geo.length?"<div class='w-geo'>"+geo.join("<span class='w-sep'>\u00b7</span>")+"</div>":"";
  var priceHtml="<div class='w-price-wrap'>"
    +"<span class='w-price'>"+(w.p||"\u2014")+"</span>"
    +(w.b?"<span class='w-calice'>"+esc(w.b)+"</span>":"")
    +"</div>";
  return "<div class='vino vino-"+slug+"' data-id='"+w.id+"' style='--accent:"+accentColor+"'>"
    +"<div class='w-accent-bar'></div>"
    +"<div class='w-body'>"
    +  "<div class='w-sx'>"
    +    "<div class='w-nome'>"+esc(w.n)+annata+formato+"</div>"
    +    metaHtml+geoHtml
    +  "</div>"
    +  "<div class='w-dx'>"+priceHtml+"</div>"
    +"</div>"
    +"</div>";
}

// Vista calice: mostra prezzo al calice + info categoria
function _buildCaliceRow(w,cat){
  var slug=cat.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
  var accentColor=CAT_COLORS[cat]||"#787068";
  var catLabel=CAT_LABELS[cat]||cat;
  var annata=w.annata?"<span class='w-annata'>"+esc(w.annata)+"</span>":"";
  var meta=[];
  if(w.produttore) meta.push("<span class='w-prod'>"+esc(w.produttore)+"</span>");
  meta.push("<span class='w-tipo-label' style='color:"+accentColor+"'>"+esc(catLabel)+"</span>");
  var metaHtml="<div class='w-meta'>"+meta.join("<span class='w-sep'>\u00b7</span>")+"</div>";
  var geo=[];
  if(w.zona)                        geo.push(esc(w.zona));
  if(w.regione&&w.regione!==w.zona) geo.push(esc(w.regione));
  var geoHtml=geo.length?"<div class='w-geo'>"+geo.join("<span class='w-sep'>\u00b7</span>")+"</div>":"";
  return "<div class='vino vino-"+slug+" vino-calice' data-id='"+w.id+"' style='--accent:"+accentColor+"'>"
    +"<div class='w-accent-bar'></div>"
    +"<div class='w-body'>"
    +  "<div class='w-sx'>"
    +    "<div class='w-nome'>"+esc(w.n)+annata+"</div>"
    +    metaHtml+geoHtml
    +  "</div>"
    +  "<div class='w-dx'><span class='w-price'>"+esc(w.b)+"</span></div>"
    +"</div>"
    +"</div>";
}

// ── SYNC UI IN BASE ALLA VISTA ────────────────────────────────────────────────
function _syncViewUI(view){
  // Active state bottoni desktop
  document.querySelectorAll(".btn-view[data-view]").forEach(function(el){
    el.classList.toggle("active",el.getAttribute("data-view")===view);
  });
  var isCantina=(view==='cantina');
  var isMescita=(view==='mescita');
  // Filtri sidebar: visibili con cantina E mescita
  var sf=document.getElementById("sidebar-filters");
  if(sf){ sf.classList.toggle("visible", isCantina||isMescita); }
  // Search bar destra: visibile solo con cantina
  var sbw=document.getElementById("search-bar-wrap");
  if(sbw){ sbw.classList.toggle("visible",isCantina); }
  // Reset filtri avanzati se non cantina
  if(!isCantina){
    fSearch=""; fCat="tutti";
    fState={paese:"",regione:"",produttore:"",vitigno:""};
    pMin=0; pMax=pMaxG;
    var inp=document.getElementById("search-input"); if(inp) inp.value="";
    var cl=document.getElementById("search-clear"); if(cl) cl.classList.remove("show");
    document.querySelectorAll("#range-min").forEach(function(el){el.value=0;});
    document.querySelectorAll("#range-max").forEach(function(el){el.value=pMaxG;});
    _updateRangeFill();
  }
}

// ── CAMBIO VISTA (desktop) ────────────────────────────────────────────────────
function setView(view){
  currentView=view;
  _syncViewUI(view);
  applyFilters(); buildSidebar();
}

// ── CAMBIO VISTA (mobile: da landing) ────────────────────────────────────────
function setViewMobile(view){
  currentView=view;
  _syncViewUI(view);
  var landing=document.getElementById("mobile-landing");
  var back=document.getElementById("btn-back-mobile");
  if(landing){
    landing.classList.add("is-leaving");
    setTimeout(function(){ landing.classList.add("hidden"); }, 220);
  }
  if(back) back.style.display="flex";
  document.body.classList.add("mobile-list-view");
  var mHero=document.getElementById("mobile-hero");
  if(mHero) mHero.style.display="";
  applyFilters(); buildSidebar();
}

function backToLanding(){
  currentView='calice';
  var landing=document.getElementById("mobile-landing");
  var back=document.getElementById("btn-back-mobile");
  if(landing){
    landing.classList.remove("hidden");
    requestAnimationFrame(function(){ landing.classList.remove("is-leaving"); });
  }
  if(back) back.style.display="none";
  document.body.classList.remove("mobile-list-view");
  var mHero=document.getElementById("mobile-hero");
  if(mHero) mHero.style.display="none";
}

function buildSidebar(){
  var inner=document.getElementById("sidebar-inner"); if(!inner) return;
  var html="";
  var catOpen=(fCat!=="tutti");
  // Titolo sezione categoria dipende dalla vista
  var catTitle = currentView==='mescita' ? "Categorie in Mescita" : "Categoria";
  html+="<div class=\"sb-acc-wrap"+(catOpen?" open":"")+" \" id=\"wrap-acc-cat\">"
    +"<div class=\"sb-acc-head\" onclick=\"_toggleAcc(this)\">"
    +"<span class=\"sb-acc-title\">"+catTitle+"</span>"
    +"<span class=\"sb-acc-arrow\">▼</span></div>"
    +"<div class=\"sb-acc-body\" id=\"acc-cat\">"
    +"<ul class=\"cat-list\">"
    +"<li class=\"cat-item"+(fCat==="tutti"?" active":"")+"\" data-cat=\"tutti\">"
    +"<span class=\"cat-dot\"></span><span class=\"cat-label\">Tutte le etichette</span>"
    +"<span class=\"cat-count\">"+countAllFiltered()+"</span></li>";
  catConfig.forEach(function(c){
    var n=_countFiltered(c.nome);
    html+="<li class=\"cat-item"+(fCat===c.nome?" active":"")+(n===0?" cat-empty":"")+"\" data-cat=\""+esc(c.nome)+"\">"
      +"<span class=\"cat-dot\" style=\"background:"+c.colore+"\"></span>"
      +"<span class=\"cat-label\">"+esc(c.label||c.nome)+"</span>"
      +"<span class=\"cat-count\">"+n+"</span></li>";
  });
  html+="</ul></div></div>";
  // Filtri avanzati solo per cantina
  if(currentView==='cantina'){
    [
      {field:"paese",label:"Paese"},
      {field:"regione",label:"Regione"},
      {field:"produttore",label:"Produttore"},
      {field:"vitigno",label:"Vitigno"}
    ].forEach(function(f){
      var vals=_getUniqueVals(f.field); if(!vals.length) return;
      var isOpen=!!(fState[f.field]);
      var uid="acc-"+f.field;
      var tuttiLabel=(f.field==="paese"||f.field==="regione")?"Tutti":"Tutte";
      html+="<div class=\"sb-acc-wrap"+(isOpen?" open":"")+"\" id=\"wrap-"+uid+"\">"
        +"<div class=\"sb-acc-head\" onclick=\"_toggleAcc(this)\">"
        +"<span class=\"sb-acc-title\">"+f.label+"</span>"
        +"<span class=\"sb-acc-arrow\">▼</span></div>"
        +"<div class=\"sb-acc-body\" id=\""+uid+"\">"
        +"<ul class=\"sb-filter-list\">"
        +"<li class=\"sb-filter-item"+(fState[f.field]===""?" active":"")+"\" "
          +"onclick=\"fState['"+f.field+"']='';applyFilters();buildSidebar();\">"+tuttiLabel+"</li>";
      vals.forEach(function(v){
        html+="<li class=\"sb-filter-item"+(fState[f.field]===v?" active":"")+" sb-fval\" "
          +"data-field=\""+esc(f.field)+"\" data-val=\""+esc(v)+"\">"+esc(v)+"</li>";
      });
      html+="</ul></div></div>";
    });
    var prezzoOpen=(pMin>0||pMax<pMaxG);
    html+="<div class=\"sb-acc-wrap"+(prezzoOpen?" open":"")+"\" id=\"wrap-acc-prezzo\">"
      +"<div class=\"sb-acc-head\" onclick=\"_toggleAcc(this)\">"
      +"<span class=\"sb-acc-title\">Prezzo bottiglia</span>"
      +"<span class=\"sb-acc-arrow\">▼</span></div>"
      +"<div class=\"sb-acc-body\" id=\"acc-prezzo\">"
      +"<div class=\"price-row\"><span>€ "+pMin+"</span><span>€ "+pMax+(pMax>=pMaxG?"+":"")+"</span></div>"
      +"<div class=\"dual-range-wrap\"><div class=\"dual-range-track\"></div>"
      +"<div class=\"dual-range-fill\" id=\"range-fill\"></div>"
      +"<input type=\"range\" id=\"range-min\" min=\"0\" max=\""+pMaxG+"\" step=\"5\" value=\""+pMin+"\" oninput=\"onRangeMin(this.value)\" onchange=\"onRangeMinEnd(this.value)\">"
      +"<input type=\"range\" id=\"range-max\" min=\"0\" max=\""+pMaxG+"\" step=\"5\" value=\""+pMax+"\" oninput=\"onRangeMax(this.value)\" onchange=\"onRangeMaxEnd(this.value)\"></div>"
      +"</div></div>";
    html+="<div class=\"sb-sec\" style=\"padding-top:8px\"><button class=\"btn-reset-all\" onclick=\"resetAll()\">↺ Reset filtri</button></div>";
  }
  inner.innerHTML=html;
  _updateRangeFill();
  inner.querySelectorAll(".cat-item[data-cat]").forEach(function(el){
    el.addEventListener("click",function(){ setFCat(el.getAttribute("data-cat")); });
  });
  inner.querySelectorAll(".sb-fval[data-field]").forEach(function(el){
    el.addEventListener("click",function(){
      fState[el.getAttribute("data-field")]=el.getAttribute("data-val");
      applyFilters(); buildSidebar();
    });
  });
  _refreshDrawer();
}
function _toggleAcc(headEl){ var wrap=headEl.parentElement; if(wrap) wrap.classList.toggle("open"); }

function buildSortBar(){
  var wrap=document.getElementById("sort-bar-wrap"); if(!wrap) return;
  var cur=(document.getElementById("sort-sel")||{}).value||"default";
  var opts=[["default","Default"],["az","A → Z"],["za","Z → A"],["asc","Prezzo ↑"],["desc","Prezzo ↓"]];
  var html="<span class=\"sort-label\">Ordina</span><select class=\"sort-select\" id=\"sort-sel\" onchange=\"applyFilters()\">";
  opts.forEach(function(o){ html+="<option value=\""+o[0]+"\""+(cur===o[0]?" selected":"")+">"+o[1]+"</option>"; });
  wrap.innerHTML=html+"</select>";
}

function countAll(){ return catConfig.reduce(function(s,c){return s+(db[c.nome]||[]).length;},0); }
function _countFiltered(cat){
  return _getViewFilteredWines(cat).filter(_matchesFilters).length;
}
function countAllFiltered(){ return catConfig.reduce(function(s,c){return s+_countFiltered(c.nome);},0); }
function _getUniqueVals(field){
  var set=new Set();
  catConfig.forEach(function(c){
    _getViewFilteredWines(c.nome).forEach(function(w){
      var fields=["paese","regione","produttore","vitigno"];
      for(var i=0;i<fields.length;i++){
        var f=fields[i]; if(f===field||!fState[f]) continue;
        if(f==="vitigno"){ if(!(w.vitigno||"").toLowerCase().includes(fState[f].toLowerCase())) return; }
        else { if((w[f]||"").toLowerCase()!==fState[f].toLowerCase()) return; }
      }
      if(!w[field]) return;
      if(field==="vitigno"){ w[field].split(",").forEach(function(v){ var t=v.trim(); if(t) set.add(t); }); }
      else { set.add(w[field]); }
    });
  });
  return Array.from(set).sort(function(a,b){ return a.localeCompare(b,"it"); });
}
function setFCat(cat){ fCat=cat; applyFilters(); buildSidebar(); }
function _updatePriceLabel(){ var pr=document.querySelectorAll(".price-row"); pr.forEach(function(el){ var spans=el.querySelectorAll("span"); if(spans[0]) spans[0].textContent="€ "+pMin; if(spans[1]) spans[1].textContent="€ "+pMax+(pMax>=pMaxG?"+":""); }); }
function onRangeMin(v){ v=parseInt(v); if(v>pMax-5)v=pMax-5; pMin=v; applyFilters(); _updateRangeFill(); _updatePriceLabel(); document.querySelectorAll("#range-min").forEach(function(el){el.value=v;}); }
function onRangeMax(v){ v=parseInt(v); if(v<pMin+5)v=pMin+5; pMax=v; applyFilters(); _updateRangeFill(); _updatePriceLabel(); document.querySelectorAll("#range-max").forEach(function(el){el.value=v;}); }
function onRangeMinEnd(v){ onRangeMin(v); buildSidebar(); }
function onRangeMaxEnd(v){ onRangeMax(v); buildSidebar(); }
function _updateRangeFill(){ var fill=document.getElementById("range-fill"); if(!fill)return; var p1=pMin/pMaxG*100,p2=pMax/pMaxG*100; fill.style.left=p1+"%"; fill.style.width=(p2-p1)+"%"; }
var _searchDebounce=null;
function onSearch(inp){ fSearch=inp.value; var cl=document.getElementById("search-clear"); if(cl) cl.classList.toggle("show",!!fSearch); clearTimeout(_searchDebounce); _searchDebounce=setTimeout(applyFilters,150); }
function clearSearch(){ fSearch=""; var inp=document.getElementById("search-input"); if(inp) inp.value=""; var cl=document.getElementById("search-clear"); if(cl) cl.classList.remove("show"); applyFilters(); }
function resetAll(){
  fCat="tutti"; fSearch=""; pMin=0; pMax=pMaxG;
  fState={paese:"",regione:"",produttore:"",vitigno:""};
  var inp=document.getElementById("search-input"); if(inp) inp.value="";
  var cl=document.getElementById("search-clear"); if(cl) cl.classList.remove("show");
  document.querySelectorAll("#range-min").forEach(function(el){el.value=0;});
  document.querySelectorAll("#range-max").forEach(function(el){el.value=pMaxG;});
  _updateRangeFill(); _syncDrawerRangeFill();
  applyFilters(); buildSidebar();
}

// ── MODAL DETTAGLIO VINO ──────────────────────────────────────────────────────
function openModal(id){
  var item=_idxById.get(String(id)); if(!item) return;
  var w=item.v, cat=item.c;
  var catEl=document.getElementById("modal-cat");
  var nomeEl=document.getElementById("modal-nome");
  var annataEl=document.getElementById("modal-annata");
  var prezzoEl=document.getElementById("modal-prezzo");
  var bodyEl=document.getElementById("modal-body");
  var noteEl=document.getElementById("modal-note-wrap");
  if(catEl) catEl.textContent=CAT_LABELS[cat]||cat;
  if(nomeEl) nomeEl.textContent=w.n;
  if(annataEl) annataEl.textContent=w.annata?"Annata "+w.annata:"";
  var p="";
  if(w.p) p+="<div class=\"modal-p-item\"><div class=\"modal-p-lbl\">Bottiglia</div><div class=\"modal-p-val\">"+esc(w.p)+"</div></div>";
  if(w.b) p+="<div class=\"modal-p-item\"><div class=\"modal-p-lbl\">Al calice</div><div class=\"modal-p-val\">"+esc(w.b)+"</div></div>";
  if(prezzoEl) prezzoEl.innerHTML=p;
  var body="";
  [["Produttore",w.produttore],["Formato",w.formato?(w.formato+"L"):null],["Regione",w.regione],
   ["Zona",w.zona&&w.zona!==w.regione?w.zona:null],["Nazione",w.nazione],["Vitigno",w.vitigno],["Tipologia",w.tipologia]
  ].forEach(function(r){ if(r[1]) body+="<div class=\"modal-row\"><span class=\"modal-lbl\">"+r[0]+"</span><span class=\"modal-val\">"+esc(r[1])+"</span></div>"; });
  if(bodyEl) bodyEl.innerHTML=body||"<p style=\"color:var(--grey);font-size:13px\">Nessun dettaglio disponibile.</p>";
  if(noteEl){
    if(w.note&&w.note.trim()){
      noteEl.style.display="block";
      var noteTxtEl=document.getElementById("modal-note-text");
      if(noteTxtEl) noteTxtEl.textContent=w.note;
    } else { noteEl.style.display="none"; }
  }
  var modal=document.getElementById("modal");
  if(modal) modal.classList.add("show");
  _lockScroll();
}
function closeModal(e){ if(e&&e.target!==document.getElementById("modal")) return; closeModalDirect(); }
function closeModalDirect(){ var modal=document.getElementById("modal"); if(modal) modal.classList.remove("show"); _unlockScroll(); }
document.addEventListener("keydown",function(e){ if(e.key==="Escape") closeModalDirect(); });

// ── DRAWER FILTRI MOBILE ──────────────────────────────────────────────────────
function _countActiveFilters(){ var n=0; if(fCat!=="tutti")n++; if(fSearch)n++; if(pMin>0||pMax<pMaxG)n++; if(fState.paese)n++; if(fState.regione)n++; if(fState.produttore)n++; if(fState.vitigno)n++; return n; }
function _syncFabBadge(){
  var n=_countActiveFilters();
  var b=document.getElementById("fab-badge");
  if(b){ b.textContent=n; b.classList.toggle("show",n>0); }
  var dh=document.getElementById("drawer-handle-count");
  if(dh){ dh.textContent=n>0?" ("+n+")":""; }
}
function openDrawer(){
  var body=document.getElementById("drawer-body");
  var src=document.getElementById("sidebar-inner");
  if(!body||!src) return;
  document.getElementById("filter-drawer").classList.add("open");
  document.getElementById("drawer-overlay").classList.add("show");
  _lockScroll();
  _refreshDrawer();
}
function _refreshDrawer(){
  var fd=document.getElementById("filter-drawer"); if(!fd||!fd.classList.contains("open")) return;
  // Ricostruisce il body del drawer con lo stato aggiornato
  var body=document.getElementById("drawer-body");
  var src=document.getElementById("sidebar-inner");
  if(!body||!src) return;
  body.innerHTML=src.innerHTML;
  body.querySelectorAll("[id]").forEach(function(el){ el.removeAttribute("id"); });
  var ranges=body.querySelectorAll("input[type=range]");
  if(ranges[0]) ranges[0].classList.add("drawer-range-min");
  if(ranges[1]) ranges[1].classList.add("drawer-range-max");
  body.querySelectorAll(".cat-item[data-cat],.sb-btn[data-cat]").forEach(function(el){
    el.addEventListener("click",function(){ setFCat(el.getAttribute("data-cat")); closeDrawer(); });
  });
  body.querySelectorAll(".sb-fval[data-field]").forEach(function(el){
    el.addEventListener("click",function(){
      fState[el.getAttribute("data-field")]=el.getAttribute("data-val");
      applyFilters(); buildSidebar(); closeDrawer();
    });
  });
  var rMin=body.querySelector(".drawer-range-min");
  var rMax=body.querySelector(".drawer-range-max");
  if(rMin){ rMin.addEventListener("input",function(){ onRangeMin(this.value); _syncDrawerRangeFill(); }); rMin.addEventListener("change",function(){ onRangeMinEnd(this.value); }); }
  if(rMax){ rMax.addEventListener("input",function(){ onRangeMax(this.value); _syncDrawerRangeFill(); }); rMax.addEventListener("change",function(){ onRangeMaxEnd(this.value); }); }
  _syncDrawerRangeFill();
}
function _syncDrawerRangeFill(){
  var body=document.getElementById("drawer-body"); if(!body) return;
  var fill=body.querySelector(".dual-range-fill"); if(!fill) return;
  var p1=pMin/pMaxG*100,p2=pMax/pMaxG*100;
  fill.style.left=p1+"%"; fill.style.width=(p2-p1)+"%";
}
function closeDrawer(){
  var fd=document.getElementById("filter-drawer"),ov=document.getElementById("drawer-overlay");
  if(fd) fd.classList.remove("open");
  if(ov) ov.classList.remove("show");
  _unlockScroll(); _syncFabBadge();
}
(function(){
  var startY=0,drawerEl=null;
  document.addEventListener("touchstart",function(e){
    drawerEl=document.getElementById("filter-drawer");
    if(!drawerEl||!drawerEl.classList.contains("open")) return;
    startY=e.touches[0].clientY;
  },{passive:true});
  document.addEventListener("touchend",function(e){
    if(!drawerEl||!drawerEl.classList.contains("open")) return;
    if(e.changedTouches[0].clientY-startY>80) closeDrawer();
  },{passive:true});
})();

init();
