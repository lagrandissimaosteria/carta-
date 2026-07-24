// ─── CREDENZIALI SUPABASE ────────────────────────────────────────────────────
const SB_URL = "https://aznqjmhzbehpmvxnxbzs.supabase.co";
const SB_KEY = "sb_publishable_FnsZcIMLdfbaABqmwx3I2A_rXfRmHhY";
const DB_USER = "default";

var _useRestFallback = SB_KEY.startsWith("sb_publishable_") || SB_KEY.startsWith("sb_");

const CAT_ORDER = ["Spumante","Bianco","Macerato","Rosato","Rosso","Naturale","Dolce","Passito","Liquoroso","Altro","AltriFormati"];
// Ordine enologico interno ai "Altri Formati" (esclude la categoria contenitore).
const CAT_ORDER_ENO = CAT_ORDER.filter(function(c){ return c!=="AltriFormati"; });
const CAT_LABELS = {
  Rosso:"Rossi", Bianco:"Bianchi", Rosato:"Rosati", Spumante:"Bolle",
  Naturale:"Naturali", Dolce:"Dolci", Passito:"Passiti", Liquoroso:"Liquorosi",
  Macerato:"Macerati", Altro:"Altro", AltriFormati:"Altri Formati"
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
  AltriFormati:"#607080",// acciaio blu
  Altro:     "#787068"   // grigio caldo neutro
};

// ── STATO GLOBALE ─────────────────────────────────────────────────────────────
var currentView = 'calice'; // 'calice' | 'mescita' | 'cantina'
var db={}, catConfig=[], fCat="tutti", fSearch="";
var pMin=0, pMax=500, pMaxG=500;
var fState={paese:"",regione:"",produttore:"",vitigno:"",annata:""};
var fFresco=false;
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
function _fresco(w){ return w&&w.inFresco?"<span class='w-fresco' title='Servito in fresco' aria-label='in fresco'>\u2744\uFE0E</span>":""; }
function _ensureFrescoCSS(){
  if(document.getElementById("fresco-css")) return;
  var st=document.createElement("style"); st.id="fresco-css";
  st.textContent=".w-fresco{display:inline-block;margin-left:7px;font-size:1.35em;line-height:1;vertical-align:middle;color:#0f9fe0;text-shadow:0 0 3px rgba(130,222,255,.95),0 0 7px rgba(40,170,235,.7),0 0 14px rgba(40,170,235,.4),0 0 22px rgba(40,170,235,.2);animation:frescoNeon 2.4s ease-in-out infinite}"
    +"@keyframes frescoNeon{0%,100%{opacity:.92;transform:scale(1);text-shadow:0 0 3px rgba(130,222,255,.8),0 0 6px rgba(40,170,235,.5),0 0 11px rgba(40,170,235,.28)}50%{opacity:1;transform:scale(1.14);text-shadow:0 0 3px rgba(170,235,255,1),0 0 8px rgba(40,170,235,.85),0 0 16px rgba(40,170,235,.55),0 0 26px rgba(40,170,235,.3)}}"
    +"@media(max-width:640px){.w-fresco{font-size:1.55em;margin-left:6px}}"
    +"@media(prefers-reduced-motion:reduce){.w-fresco{animation:none;opacity:1;transform:none;text-shadow:0 0 3px rgba(130,222,255,.9),0 0 8px rgba(40,170,235,.6),0 0 15px rgba(40,170,235,.35)}}"
    +".fresco-legenda{font-family:inherit;font-size:11px;letter-spacing:.05em;color:#8C7E72;text-align:center;padding:26px 12px 10px;border-top:1px solid rgba(26,22,18,.07);margin-top:14px}"
    +".fresco-legenda .w-fresco{font-size:1em;margin:0 6px 0 0}"
    +".fresco-toggle{margin-left:12px;padding:5px 13px;border:1px solid rgba(15,159,224,.45);border-radius:999px;background:transparent;color:#0f9fe0;font-family:inherit;font-size:12px;letter-spacing:.04em;cursor:pointer;white-space:nowrap;transition:background .15s,color .15s,border-color .15s;line-height:1.4}"
    +".fresco-toggle:hover{background:rgba(15,159,224,.08)}"
    +".fresco-toggle.active{background:#0f9fe0;border-color:#0f9fe0;color:#fff;box-shadow:0 0 8px rgba(40,170,235,.45)}"
    +"@media(max-width:640px){.fresco-toggle{margin-left:8px;padding:5px 11px;font-size:11px}}"
    +".drawer-fresco{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;box-sizing:border-box;margin:2px 0 16px;padding:12px;font-size:13px;letter-spacing:.05em}"
    +".drawer-fresco .df-ice{font-size:1.25em;line-height:1}"
    /* ── GERARCHIA CARTA: paese / regione / cru ── */
    +".grp-l1{font-family:var(--font-serif);font-size:15px;font-weight:500;letter-spacing:.15em;text-transform:uppercase;color:var(--ink);padding:30px 0 9px 16px;border-bottom:1px solid var(--line-s)}"
    +".sezione-titolo + .grp-l1{padding-top:18px}"
    +".grp-l2{font-family:var(--font-sans);font-size:10px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-2);padding:18px 0 7px 16px}"
    +".grp-l3{font-family:var(--font-serif);font-style:italic;font-size:13.5px;letter-spacing:.03em;color:var(--ink-3);padding:12px 0 6px 16px}"
    +".grp-l1 + .grp-l2{padding-top:12px}.grp-l2 + .grp-l3{padding-top:6px}"
    +"@media(max-width:640px){.grp-l1{font-size:13px;padding:22px 0 8px 14px}.grp-l2{padding-left:14px;padding-top:14px}.grp-l3{padding-left:14px;font-size:12.5px}}";
  document.head.appendChild(st);
}
function _setStatus(state){
  var dot=document.getElementById("sb-dot"),lbl=document.getElementById("sb-lbl"); if(!dot)return;
  dot.className=state; lbl.textContent={ok:"Live",sync:"Sync...",err:"Offline",off:"Offline"}[state]||"DB";
}
function _pgEsc(s){ return String(s).replace(/'/g,"''"); }

async function _fetchWinesRaw(){
  if(!_useRestFallback && _sb){
    var r=await _sb.from("cm_wines").select("data").eq("user_id",DB_USER);
    if(r.error) throw r.error;
    if(!r.data||!r.data.length) return [];
    if(r.data.length===1) return r.data[0].data||[];
    // Più righe (struttura legacy): merge identico a manager.js
    return r.data.flatMap(function(row){
      var d=row.data;
      if(Array.isArray(d)) return d;
      if(d&&typeof d==="object") return [d];
      return [];
    });
  } else {
    // REST path: rimuove limit=1 per recuperare eventuali righe multiple
    var url=SB_URL+"/rest/v1/cm_wines?select=data&user_id=eq."+encodeURIComponent(_pgEsc(DB_USER));
    var resp=await fetch(url,{headers:{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY,"Accept":"application/json"}});
    if(!resp.ok){ var errText=await resp.text(); throw new Error("HTTP "+resp.status+": "+errText); }
    var rows=await resp.json();
    if(!rows||!rows.length) return [];
    if(rows.length===1) return rows[0].data||[];
    // Più righe: merge
    return rows.flatMap(function(row){
      var d=row.data;
      if(Array.isArray(d)) return d;
      if(d&&typeof d==="object") return [d];
      return [];
    });
  }
}

var _BOLLE=["Champagne","Champagne Rosè","Metodo Classico","Metodo Classico Rosato",
            "Rifermentato","Rifermentato Rosso","Rifermentato Rosato","Col Fondo",
            "Colfondo","Ancestrale","Metodo Charmat","Sidro","Sidro di Pera",
            "Petillant","Spumante","Bolle"];
// ── FORMATI BOTTIGLIA ─────────────────────────────────────────────────────────
// La 0,75 è la carta "normale". Tutto il resto (mezze, litro, magnum e oltre)
// finisce in una sezione dedicata: è così che un sommelier legge la lista.
var FMT_BUCKETS=[
  {key:"grandi",label:"Grandi Formati", test:function(f){ return f>=1.5; }},
  {key:"litro", label:"Litro",          test:function(f){ return f>0.75&&f<1.5; }},
  {key:"mezze", label:"Mezze Bottiglie",test:function(f){ return f<0.75; }}
];
function _fmtBucket(f){
  for(var i=0;i<FMT_BUCKETS.length;i++) if(FMT_BUCKETS[i].test(f)) return FMT_BUCKETS[i].key;
  return "grandi";
}
var _FMT_NOMI={0.1875:"Piccola",0.25:"Quarto",0.375:"Mezza",0.5:"0,50 L",1:"Litro",
  1.5:"Magnum",2:"Jéroboam",2.25:"Marie-Jeanne",3:"Doppia Magnum",4.5:"Réhoboam",
  5:"5 L",6:"Mathusalem",9:"Salmanazar",12:"Balthazar",15:"Nabuchodonosor"};
function _fmtNome(f){ return _FMT_NOMI[f]||(String(f).replace(".",",")+" L"); }
function _fmtLitri(f){ return String(f).replace(".",",")+" L"; }

// ── ORDINE SOMMELIER ─────────────────────────────────────────────────────────
// Italia e Francia in testa (peso reale in carta), il resto alfabetico.
var PAESE_ORDER=["Italia","Francia"];
function _paeseRank(p){ var i=PAESE_ORDER.indexOf(p||""); return i<0?PAESE_ORDER.length:i; }
function _cmpTxt(a,b){
  a=String(a||"").trim(); b=String(b||"").trim();
  if(!a&&!b) return 0;
  if(!a) return 1;            // valori mancanti in coda, non in testa
  if(!b) return -1;
  return a.localeCompare(b,"it",{sensitivity:"base"});
}
// paese → regione → cru/zona → produttore → nome → annata (dalla più vecchia)
function _cmpSommelier(a,b){
  var d=_paeseRank(a.paese||a.nazione)-_paeseRank(b.paese||b.nazione); if(d) return d;
  d=_cmpTxt(a.paese||a.nazione,b.paese||b.nazione); if(d) return d;
  d=_cmpTxt(a.regione,b.regione); if(d) return d;
  d=_cmpCru(_cru(a),_cru(b)); if(d) return d;
  d=_cmpTxt(a.produttore,b.produttore); if(d) return d;
  d=_cmpTxt(a.n,b.n); if(d) return d;
  return (parseInt(a.annata,10)||0)-(parseInt(b.annata,10)||0);
}
function _cru(w){ return (w.zona&&w.zona!==w.regione)?w.zona:""; }
// Il cru vuoto ordina PRIMA: i vini generici della regione stanno sotto
// l'intestazione di regione, i cru aprono sottosezioni proprie sotto di essi.
function _cmpCru(a,b){
  a=String(a||"").trim(); b=String(b||"").trim();
  if(!a&&!b) return 0; if(!a) return -1; if(!b) return 1;
  return a.localeCompare(b,"it",{sensitivity:"base"});
}

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
function _capVitigni(s){
  if(!s) return s;
  var lower=["di","del","della","dei","degli","de","d","e","in","da"];
  return s.split(",").map(function(seg){
    var t=seg.trim();
    if(!t) return t;
    return t.toLowerCase().split(/\s+/).map(function(word,i){
      if(!word) return word;
      // Gestisce apostrofo: "d'avola" → "d'Avola"
      var apos=word.indexOf("'");
      if(apos>0){
        var pre=word.slice(0,apos+1);
        var post=word.slice(apos+1);
        return pre+(post?post.charAt(0).toUpperCase()+post.slice(1):"");
      }
      if(i===0||lower.indexOf(word)<0){
        return word.charAt(0).toUpperCase()+word.slice(1);
      }
      return word;
    }).join(" ");
  }).join(", ");
}

async function loadWines(){
  var wines=await _fetchWinesRaw();
  wines=wines.filter(function(w){ return (w.giacenza||0)>0; });
  var d={}; CAT_ORDER.forEach(function(t){ d[t]=[]; });
  wines.forEach(function(w){
    var rawTipo=w.tipologia||"Altro";
    var fmt=parseFloat(w.formato)||0.75;
    var tipoEno=getCategoryByTipologia(rawTipo);
    // Qualunque formato diverso dalla 0,75 esce dalla sua categoria enologica e
    // confluisce in "Altri Formati", dove viene poi risuddiviso per bucket e tipologia.
    var cat=fmt!==0.75?"AltriFormati":tipoEno;
    if(!d[cat]) d[cat]=[];
    var nome=w.nome||w.nomeVino||w.n||"";
    var prod=w.produttore||"";
    var pCarta=w.prezzoCarta||"";
    var pNum=pCarta?parseFloat(String(pCarta).replace(/[^0-9.,]/g,"").replace(/\.(?=\d{3})/g,"").replace(",","."))||0:0;
    var pCalice=parseFloat(w.prezzoCalice||w.prezzoAlCalice)||0;
    var _paese=inferPaese(w.nazione,w.regione,w.zona);
    d[cat].push({
      id:w.id, n:nome, produttore:prod, annata:w.annata||"",
      inFresco:!!w.inFresco,
      p:pNum>0?"€ "+_fmtP(pNum):"",
      b:pCalice>0?"€ "+_fmtP(pCalice):"",
      prezzo_carta:pNum,
      prezzo_calice:pCalice,
      vitigno:_capVitigni(w.vitigni||w.vitigno||""),
      regione:w.regione||"", zona:w.zona||"",
      nazione:_paese, paese:_paese,
      tipologia:CAT_LABELS[tipoEno]||tipoEno,
      _tipoKey:tipoEno,
      _fmt:fmt,
      _fmtBucket:_fmtBucket(fmt),
      formato:fmt!==0.75?fmt:null,
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
  if(currentView==='mescita'){
    // Il tetto è tarato sulla bottiglia da 0,75: applicarlo ai grandi formati
    // azzererebbe la sezione per costruzione, non per assenza di etichette.
    if(cat==='AltriFormati') return wines.filter(function(w){ return w.prezzo_carta>0; });
    return wines.filter(function(w){ return w.prezzo_carta>0&&w.prezzo_carta<=MESCITA_MAX_PREZZO; });
  }
  return wines; // 'cantina': tutti
}

// ── FUZZY SEARCH CONDIVISO (identico a manager.js, senza SKU lato pubblico) ──
function _normDup(s){
  return String(s||"").toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[-_''.]/g," ")
    .replace(/\b(le|la|il|lo|i|gli|di|del|della|dei|degli|delle|de|du|von|van|the|domaine|chateau|clos|mas|finca)\b/g,"")
    .replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
}
function _trigramSim(a,b){
  if(!a&&!b) return 1; if(!a||!b) return 0;
  function tg(s){ var p="  "+s+"  ",set=new Set(); for(var i=0;i<p.length-2;i++) set.add(p.slice(i,i+3)); return set; }
  var ta=tg(a),tb=tg(b),inter=0;
  ta.forEach(function(t){ if(tb.has(t)) inter++; });
  return (2*inter)/(ta.size+tb.size);
}
function _lev(a,b){
  if(a===b) return 0; var m=a.length,n=b.length; if(!m) return n; if(!n) return m;
  var prev=new Array(n+1),cur=new Array(n+1),i,j;
  for(j=0;j<=n;j++) prev[j]=j;
  for(i=1;i<=m;i++){ cur[0]=i;
    for(j=1;j<=n;j++){ var cost=a[i-1]===b[j-1]?0:1; cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+cost); }
    var t=prev; prev=cur; cur=t;
  }
  return prev[n];
}
function _fuzzyMatch(q,haystack){
  q=_normDup(q); if(!q) return true;
  var hayNorm=_normDup(haystack);
  if(hayNorm.indexOf(q)>=0) return true;
  var qt=q.split(" ").filter(Boolean), ht=hayNorm.split(" ").filter(Boolean);
  if(!ht.length) return false;
  return qt.every(function(tok){
    if(tok.length<=2) return ht.some(function(x){ return x.indexOf(tok)>=0; });
    return ht.some(function(x){
      if(x.indexOf(tok)>=0) return true;
      if(_trigramSim(tok,x)>=0.82) return true;
      return _lev(tok,x) <= (tok.length<=6?1:2);
    });
  });
}

function _matchesFilters(w){
  if(fFresco&&!w.inFresco) return false;
  if(fSearch){
    var hay=[w.n,w.produttore,w.vitigno,w.zona,w.regione,w.paese,w.nazione,w.annata].filter(Boolean).join(" ");
    if(!_fuzzyMatch(fSearch,hay)) return false;
  }
  if(fState.paese&&(w.paese||"").toLowerCase()!==fState.paese.toLowerCase()) return false;
  if(fState.regione&&(w.regione||"").toLowerCase()!==fState.regione.toLowerCase()) return false;
  if(fState.produttore&&(w.produttore||"").toLowerCase()!==fState.produttore.toLowerCase()) return false;
  if(fState.vitigno&&!(w.vitigno||"").toLowerCase().includes(fState.vitigno.toLowerCase())) return false;
  if(fState.annata&&(w.annata||"").toString()!==fState.annata) return false;
  if(w._p>0&&w._p<pMin) return false;
  if(pMax<pMaxG&&w._p>pMax) return false;
  return true;
}

function applyFilters(){ _ensureFrescoCSS();
  var sortSel=document.getElementById("sort-sel");
  var sortVal=sortSel?sortSel.value:"default";
  var html=""; var total=0;
  var catsToShow=fCat==="tutti"?catConfig.map(function(c){return c.nome;}):[fCat];

  catsToShow.forEach(function(cat){
    var wines=_getViewFilteredWines(cat).filter(_matchesFilters);
    var manuale=(sortVal!=="default");
    if(sortVal==="az") wines.sort(function(a,b){return _cmpTxt(a.n,b.n);});
    else if(sortVal==="za") wines.sort(function(a,b){return _cmpTxt(b.n,a.n);});
    else if(sortVal==="asc") wines.sort(function(a,b){return a._p-b._p;});
    else if(sortVal==="desc") wines.sort(function(a,b){return b._p-a._p;});
    else wines.sort(_cmpSommelier);
    if(!wines.length) return;
    total+=wines.length;

    html+="<div class=\"sezione\"><div class=\"sezione-titolo\">"+esc(CAT_LABELS[cat]||cat)+"</div>";
    if(currentView==='calice'){
      // Lista breve: la gerarchia geografica sarebbe rumore, resta piatta.
      wines.forEach(function(w){ html+=_buildCaliceRow(w,cat); });
    } else if(manuale){
      // Ordinamento esplicito scelto dall'utente: nessun raggruppamento.
      wines.forEach(function(w){ html+=_buildWineRow(w,cat); });
    } else if(cat==='AltriFormati'){
      html+=_renderAltriFormati(wines);
    } else {
      html+=_renderGeo(wines,cat);
    }
    html+="</div>";
  });

  var rc=document.getElementById("results-count");
  var viewLabel=currentView==='calice'?"al calice":currentView==='mescita'?"carta breve":"in cantina";
  if(rc) rc.textContent=total+" etichett"+(total===1?"a":"e")+" "+viewLabel;
  var wl=document.getElementById("wine-list");
  var _legenda = html.indexOf("w-fresco")>=0
    ? "<div class=\"fresco-legenda\"><span class=\"w-fresco\">\u2744\uFE0E</span>servito in fresco</div>"
    : "";
  if(wl) wl.innerHTML=html?(html+_legenda):"<div class=\"vuoto\">Nessun vino trovato.</div>";
  _syncFabBadge();
}

// ── RENDER GERARCHICO ─────────────────────────────────────────────────────────
// Paese → Regione → Cru. Le intestazioni si emettono solo quando il valore cambia
// e solo se valorizzato: una regione vuota non produce una riga fantasma.
function _renderGeo(wines,cat){
  var html="",curP=null,curR=null,curC=null,regEmessa=false;
  wines.forEach(function(w){
    var p=w.paese||w.nazione||"Altre Provenienze";
    var r=w.regione||"";
    var c=_cru(w);
    if(p!==curP){ html+="<div class='grp-l1'>"+esc(p)+"</div>"; curP=p; curR=null; curC=null; regEmessa=false; }
    if(r!==curR){
      // Le regioni vuote ordinano in coda: se il paese ha già aperto sottosezioni
      // servono comunque un'intestazione, o i vini finirebbero sotto quella sbagliata.
      if(r){ html+="<div class='grp-l2'>"+esc(r)+"</div>"; regEmessa=true; }
      else if(regEmessa){ html+="<div class='grp-l2'>Altre Zone</div>"; }
      curR=r; curC=null;
    }
    if(c!==curC){ if(c) html+="<div class='grp-l3'>"+esc(c)+"</div>"; curC=c; }
    html+=_buildWineRow(w,cat);
  });
  return html;
}

// Altri Formati: bucket dimensionale → tipologia enologica → ordine sommelier.
// Profondità volutamente ferma a due livelli: la geografia resta sulla riga.
function _renderAltriFormati(wines){
  var html="",byBucket={};
  wines.forEach(function(w){ (byBucket[w._fmtBucket]=byBucket[w._fmtBucket]||[]).push(w); });
  FMT_BUCKETS.forEach(function(b){
    var arr=byBucket[b.key]; if(!arr||!arr.length) return;
    html+="<div class='grp-l1'>"+esc(b.label)+"</div>";
    var byTipo={};
    arr.forEach(function(w){ var k=w._tipoKey||"Altro"; (byTipo[k]=byTipo[k]||[]).push(w); });
    CAT_ORDER_ENO.forEach(function(t){
      var list=byTipo[t]; if(!list||!list.length) return;
      html+="<div class='grp-l2'>"+esc(CAT_LABELS[t]||t)+"</div>";
      list.sort(_cmpSommelier).forEach(function(w){ html+=_buildWineRow(w,"AltriFormati"); });
    });
  });
  return html;
}

function _buildWineRow(w,cat){
  var slug=cat.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
  var accentColor=CAT_COLORS[cat]||"#787068";
  var annata=w.annata?"<span class='w-annata'>"+esc(w.annata)+"</span>":"";
  var formato=w.formato?"<span class='w-formato' title='"+esc(_fmtLitri(w.formato))+"'>"+esc(_fmtNome(w.formato))+"</span>":"";
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
    +    "<div class='w-nome'>"+esc(w.n)+_fresco(w)+annata+formato+"</div>"
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
  if(w.vitigno)    meta.push("<span class='w-vitigno'>"+esc(w.vitigno)+"</span>");
  meta.push("<span class='w-tipo-label' style='color:"+accentColor+"'>"+esc(catLabel)+"</span>");
  var metaHtml="<div class='w-meta'>"+meta.join("<span class='w-sep'>\u00b7</span>")+"</div>";
  var geo=[];
  if(w.zona)                        geo.push(esc(w.zona));
  if(w.regione&&w.regione!==w.zona) geo.push(esc(w.regione));
  if(w.nazione)                     geo.push(esc(w.nazione));
  var geoHtml=geo.length?"<div class='w-geo'>"+geo.join("<span class='w-sep'>\u00b7</span>")+"</div>":"";
  return "<div class='vino vino-"+slug+" vino-calice' data-id='"+w.id+"' style='--accent:"+accentColor+"'>"
    +"<div class='w-accent-bar'></div>"
    +"<div class='w-body'>"
    +  "<div class='w-sx'>"
    +    "<div class='w-nome'>"+esc(w.n)+_fresco(w)+annata+"</div>"
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
  buildSortBar();
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
  // Aggiungi stato alla history del browser così il tasto "indietro" funziona
  history.pushState({mobileLanding:false, view:view}, "", "");
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
}

// Intercetta il tasto "indietro" del browser su mobile
window.addEventListener("popstate", function(e){
  // Solo su mobile (landing visibile = siamo in modalità mobile)
  var landing=document.getElementById("mobile-landing");
  if(!landing) return;
  // Se siamo nella lista (landing nascosta), torna alla landing
  if(document.body.classList.contains("mobile-list-view")){
    backToLanding();
  }
});

function buildSidebar(){
  var inner=document.getElementById("sidebar-inner"); if(!inner) return;
  var html="";
  var catOpen=(fCat!=="tutti");
  // Titolo sezione categoria dipende dalla vista
  var catTitle = currentView==='mescita' ? "Carta Breve" : "Categoria";
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
    if(n===0) return; // niente chip fantasma: il conteggio è già filtrato per vista
    html+="<li class=\"cat-item"+(fCat===c.nome?" active":"")+"\" data-cat=\""+esc(c.nome)+"\">"
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
      {field:"vitigno",label:"Vitigno"},
      {field:"annata",label:"Annata"}
    ].forEach(function(f){
      var vals=_getUniqueVals(f.field); if(!vals.length) return;
      if(f.field==="annata") vals=vals.slice().sort(function(a,b){ return parseInt(b)||0-(parseInt(a)||0); });
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

function _hasFresco(){
  return catConfig.some(function(c){ return _getViewFilteredWines(c.nome).some(function(w){ return w.inFresco; }); });
}
function toggleFresco(){ fFresco=!fFresco; applyFilters(); buildSortBar(); buildSidebar(); }
function buildSortBar(){
  var wrap=document.getElementById("sort-bar-wrap"); if(!wrap) return;
  _ensureFrescoCSS();
  var cur=(document.getElementById("sort-sel")||{}).value||"default";
  var opts=[["default","Ordine sommelier"],["az","A → Z"],["za","Z → A"],["asc","Prezzo ↑"],["desc","Prezzo ↓"]];
  var html="<span class=\"sort-label\">Ordina</span><select class=\"sort-select\" id=\"sort-sel\" onchange=\"applyFilters()\">";
  opts.forEach(function(o){ html+="<option value=\""+o[0]+"\""+(cur===o[0]?" selected":"")+">"+o[1]+"</option>"; });
  html+="</select>";
  if(fFresco||_hasFresco()){
    html+="<button type=\"button\" class=\"fresco-toggle"+(fFresco?" active":"")+"\" onclick=\"toggleFresco()\" aria-pressed=\""+(fFresco?"true":"false")+"\">\u2744\uFE0E In fresco</button>";
  }
  wrap.innerHTML=html;
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
      if(field==="vitigno"){ w[field].split(",").forEach(function(v){ var t=_capVitigni(v.trim()); if(t) set.add(t); }); }
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
  fCat="tutti"; fSearch=""; pMin=0; pMax=pMaxG; fFresco=false;
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
  [["Produttore",w.produttore],["Formato",w.formato?(_fmtNome(w.formato)+" · "+_fmtLitri(w.formato)):null],["Regione",w.regione],
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
function _countActiveFilters(){ var n=0; if(fCat!=="tutti")n++; if(fSearch)n++; if(pMin>0||pMax<pMaxG)n++; if(fState.paese)n++; if(fState.regione)n++; if(fState.produttore)n++; if(fState.vitigno)n++; if(fState.annata)n++; if(fFresco)n++; return n; }
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
  // Toggle "In fresco" in cima al drawer (i filtri su mobile stanno qui, non nella sort-bar)
  if(fFresco || _hasFresco()){
    _ensureFrescoCSS();
    var ft=document.createElement("button");
    ft.type="button";
    ft.className="fresco-toggle drawer-fresco"+(fFresco?" active":"");
    ft.setAttribute("aria-pressed", fFresco?"true":"false");
    ft.innerHTML="<span class=\"df-ice\">\u2744\uFE0E</span> Solo vini in fresco";
    ft.addEventListener("click",function(){ toggleFresco(); closeDrawer(); });
    body.insertBefore(ft, body.firstChild);
  }
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
