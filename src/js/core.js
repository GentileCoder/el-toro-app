var sections=[], reservations=[], settingsCopy=[];
var categories=["Comida","Bebida","Softdrink","Café","Postre","Vino","Cerveza","Otro"];
var articulos=[], editingArtId=null;
var openTables={};
var history24=[];
var selectedTableId=null, activeResSection="all", activeMesasSection="all";
var pendingItems=[];
var currentOrderTableId=null;
var planWeekOffset=0;
var planData={};

var DAY_NAMES=["Martes","Miércoles","Jueves","Viernes","Sábado"];
var DAY_OFFSETS=[1,2,3,4,5];
var SLOTS={1:["Fijo","Springer 1","Springer 2"],2:["Fijo","Springer 1","Springer 2"],3:["Fijo","Springer 1","Springer 2"],4:["Fijo 1","Fijo 2","Springer"],5:["Fijo 1","Fijo 2","Springer"]};

var WORKER_URL=localStorage.getItem("puro_worker_url")||"";
var saveTimeout=null;

function ge(id){return document.getElementById(id);}
function today(){return new Date().toISOString().split("T")[0];}
function allTables(){return sections.reduce(function(a,s){return a.concat(s.tables);},[]);}
function orderTotal(items){return items.reduce(function(s,i){return s+i.price*i.qty;},0);}

function setSyncStatus(msg,color){
  var el=ge("syncStatus");
  if(el) el.innerHTML='<span class="sync-dot" style="background:'+color+'"></span>'+msg;
}

function saveToCloud(){
  if(!WORKER_URL) return;
  clearTimeout(saveTimeout);
  saveTimeout=setTimeout(function(){
    setSyncStatus("Guardando…","#e8c67c");
    var payload={sections:sections,reservations:reservations,categories:categories,articulos:articulos,planData:planData,openTables:openTables};
    var hdrs={"Content-Type":"application/json"};
    if(window.authToken) hdrs["Authorization"]="Bearer "+window.authToken;
    fetch(WORKER_URL,{method:"POST",headers:hdrs,body:JSON.stringify(payload)})
      .then(function(){setSyncStatus("Guardado ✓","#7ed4a7");})
      .catch(function(){setSyncStatus("Sin conexión","#e87c7c");});
  },800);
}

function loadFromCloud(callback){
  if(!WORKER_URL){setSyncStatus("Sin URL","#e87c7c");callback();return;}
  setSyncStatus("Cargando…","#e8c67c");
  var loadHdrs={};
  if(window.authToken) loadHdrs["Authorization"]="Bearer "+window.authToken;
  fetch(WORKER_URL,{headers:loadHdrs})
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.sections&&d.sections.length) sections=d.sections;
      if(d.reservations) reservations=d.reservations;
      if(d.categories&&d.categories.length) categories=d.categories;
      if(d.articulos&&d.articulos.length) articulos=d.articulos;
      if(d.planData) planData=d.planData;
      if(d.openTables) openTables=d.openTables;
      setSyncStatus("Sincronizado ✓","#7ed4a7");
      callback();
    })
    .catch(function(){
      setSyncStatus("Sin conexión","#e87c7c");
      callback();
    });
}

function applyResColor(el,status){
  var bg=status==="free"?"#1d4a2e":status==="once"?"#4a3a1d":"#4a1d1d";
  var fg=status==="free"?"#7ed4a7":status==="once"?"#e8c67c":"#e87c7c";
  el.style.setProperty("background-color",bg,"important");
  el.style.setProperty("color",fg,"important");
  el.querySelectorAll(".tid,.tslot").forEach(function(c){c.style.setProperty("color",fg,"important");});
}
function applyMesaColor(el,isOpen){
  var bg=isOpen?"#4a1d1d":"#1d4a2e";
  var fg=isOpen?"#e87c7c":"#7ed4a7";
  el.style.setProperty("background-color",bg,"important");
  el.style.setProperty("color",fg,"important");
  el.querySelectorAll(".tid,.tslot").forEach(function(c){c.style.setProperty("color",fg,"important");});
}
function resStatus(tableId,date){
  var rs=reservations.filter(function(r){return r.table===tableId&&r.date===date&&r.status!=="cancelled";});
  if(!rs.length) return "free";
  return rs.length===1?"once":"multi";
}

function renderSectionPills(cid,active,fn){
  var el=ge(cid);
  var h='<button class="pill'+(active==="all"?" active":"")+'" onclick="'+fn+'(\'all\')">Todas</button>';
  sections.forEach(function(s){h+='<button class="pill'+(active===s.id?" active":"")+'" onclick="'+fn+'('+s.id+')">'+s.name+'</button>';});
  el.innerHTML=h;
}

function openUrlModal(){ge("workerUrlInput").value=WORKER_URL;ge("urlModalOverlay").classList.add("open");}
function saveWorkerUrl(){
  var url=ge("workerUrlInput").value.trim();
  WORKER_URL=url;
  localStorage.setItem("puro_worker_url",url);
  ge("urlModalOverlay").classList.remove("open");
  loadFromCloud(function(){renderCatFilter();renderArticulos();renderReservationsTab();renderMesasOverview();renderHistorial();});
}

function switchTab(id,el){
  document.querySelectorAll(".tab").forEach(function(t){t.classList.remove("active");});
  document.querySelectorAll(".content").forEach(function(c){c.classList.remove("active");});
  if(el)el.classList.add("active");
  ge("tab-"+id).classList.add("active");
  if(id==="historial") renderHistorial();
  if(id==="plan"){renderPlan();renderPlanDisplay();}
  if(id==="usuarios") renderUsuarios();
}

function init(){
  ge("headerDate").textContent=new Date().toLocaleDateString("es-DE",{weekday:"long",day:"numeric",month:"long"});
  sections=[
    {id:1,name:"Interior",tables:[{id:101,label:"1"},{id:102,label:"2"},{id:103,label:"4"},{id:104,label:"5"},{id:105,label:"6"},{id:106,label:"7"},{id:107,label:"8"},{id:108,label:"9"},{id:109,label:"10"},{id:110,label:"11"},{id:111,label:"12"}]},
    {id:2,name:"Terraza",tables:[{id:201,label:"T1"},{id:202,label:"T2"},{id:203,label:"T3"},{id:204,label:"T4"},{id:205,label:"T5"}]},
    {id:3,name:"Barra",tables:[{id:301,label:"B1"},{id:302,label:"B2"},{id:303,label:"B3"}]}
  ];
  reservations=[
    {id:1,name:"García Familia",guests:4,date:today(),from:"13:30",to:"15:30",table:101,notes:"Cumpleaños",status:"confirmed"},
    {id:2,name:"Müller, Hans",guests:2,date:today(),from:"20:00",to:"21:30",table:101,notes:"",status:"confirmed"},
    {id:3,name:"Fernández, Ana",guests:6,date:today(),from:"19:30",to:"22:00",table:104,notes:"Sin gluten",status:"pending"}
  ];
  articulos=[
    {id:1,name:"Patatas bravas",cat:"Comida",price:4.50},
    {id:2,name:"Jamón ibérico",cat:"Comida",price:9.00},
    {id:3,name:"Cerveza Estrella",cat:"Cerveza",price:3.50},
    {id:4,name:"Agua mineral",cat:"Softdrink",price:2.00},
    {id:5,name:"Café solo",cat:"Café",price:1.80},
    {id:6,name:"Rioja Crianza",cat:"Vino",price:5.50}
  ];
  ge("filterDate").value=today();
  ge("filterDate").addEventListener("change",function(){selectedTableId=null;renderReservationsTab();});
  loadFromCloud(function(){
    renderCatFilter(); renderArticulos();
    renderReservationsTab(); renderMesasOverview(); renderHistorial();
  });
  setInterval(purgeHistory,60000);
}
