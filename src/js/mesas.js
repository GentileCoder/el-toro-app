function renderMesasOverview(){
  renderSectionPills("mesasSectionPills",activeMesasSection,"setMesasSection");
  var g=ge("mesasGrid"); g.innerHTML="";
  var secs=activeMesasSection==="all"?sections:sections.filter(function(s){return s.id===activeMesasSection;});
  secs.forEach(function(sec){
    if(activeMesasSection==="all"){var l=document.createElement("div");l.className="section-label";l.textContent=sec.name;g.appendChild(l);}
    sec.tables.forEach(function(t){
      var isOpen=!!openTables[t.id];
      var order=openTables[t.id];
      var total=isOpen?orderTotal(order.items):0;
      var div=document.createElement("div"); div.className="tmesa";
      var info=isOpen?'<span class="tslot">€'+total.toFixed(2)+'</span><span class="tslot">'+order.items.length+' art.</span>':'<span class="tslot">Libre</span>';
      div.innerHTML='<span class="tid">'+t.label+'</span><div class="tslots">'+info+'</div>';
      div.addEventListener("click",function(){openOrderView(t.id);});
      applyMesaColor(div,isOpen); g.appendChild(div);
    });
  });
}

function setMesasSection(id){activeMesasSection=id==="all"?"all":parseInt(id);renderMesasOverview();}

function openOrderView(tableId){
  currentOrderTableId=tableId; pendingItems=[];
  var t=allTables().find(function(x){return x.id===tableId;});
  ge("orderTitle").textContent="Mesa "+(t?t.label:tableId);
  ge("mesasOverview").style.display="none";
  ge("orderView").classList.add("active");
  renderOrderCats(); renderTicket();
}

function closeOrderView(){
  pendingItems=[];
  var order=openTables[currentOrderTableId];
  if(order&&order.items.length===0) delete openTables[currentOrderTableId];
  ge("mesasOverview").style.display="";
  ge("orderView").classList.remove("active");
  currentOrderTableId=null;
  renderMesasOverview();
}

function renderOrderCats(){
  var grouped={},order=[];
  articulos.forEach(function(a){if(!grouped[a.cat]){grouped[a.cat]=[];order.push(a.cat);}grouped[a.cat].push(a);});
  ge("orderCats").innerHTML=order.map(function(cat){
    return '<div class="cat-section"><div class="cat-header">'+cat+'</div>'
      +grouped[cat].map(function(a){return '<div class="art-item" onclick="addToOrder('+a.id+')">'+'<span class="art-item-name">'+a.name+'</span><span class="art-item-price">€'+a.price.toFixed(2)+'</span></div>';}).join("")
      +'</div>';
  }).join("");
}

function addToOrder(artId){
  var a=articulos.find(function(x){return x.id===artId;});
  if(!a||!currentOrderTableId) return;
  var existing=pendingItems.find(function(i){return i.id===artId;});
  if(existing) existing.qty++;
  else pendingItems.push({id:artId,name:a.name,price:a.price,qty:1});
  renderTicket();
}

function confirmAddToOrder(){
  if(!pendingItems.length) return;
  if(!openTables[currentOrderTableId]) openTables[currentOrderTableId]={items:[],openedAt:Date.now()};
  var order=openTables[currentOrderTableId];
  pendingItems.forEach(function(p){
    var ex=order.items.find(function(i){return i.id===p.id;});
    if(ex) ex.qty+=p.qty;
    else order.items.push({id:p.id,name:p.name,price:p.price,qty:p.qty});
  });
  pendingItems=[];
  closeOrderView();
  saveToCloud();
}

function renderTicket(){
  var order=openTables[currentOrderTableId];
  var confirmed=order?order.items:[];
  var allItems=JSON.parse(JSON.stringify(confirmed));
  pendingItems.forEach(function(p){
    var ex=allItems.find(function(i){return i.id===p.id;});
    if(ex) ex.qty+=p.qty;
    else allItems.push({id:p.id,name:p.name,price:p.price,qty:p.qty,pending:true});
  });
  allItems.forEach(function(i){
    var inPending=pendingItems.find(function(p){return p.id===i.id;});
    var inConfirmed=confirmed.find(function(c){return c.id===i.id;});
    if(inPending&&!inConfirmed) i.pending=true;
  });
  if(!allItems.length){ge("ticketItems").innerHTML='<div style="padding:20px;text-align:center;color:#555;font-size:13px">Sin artículos</div>';ge("ticketTotal").textContent="€0.00";return;}
  ge("ticketItems").innerHTML=allItems.map(function(it){
    var style=it.pending?"opacity:0.55":"";
    return '<div class="ticket-row" style="'+style+'">'
      +'<span class="trow-name">'+it.name+(it.pending?' <span style="font-size:10px;color:#e8c67c">(pendiente)</span>':'')+'</span>'
      +'<div class="trow-qty">'
      +(it.pending
        ?'<button class="qty-btn" onclick="changePending('+it.id+',-1)">−</button><span style="font-size:13px;min-width:16px;text-align:center">'+it.qty+'</span><button class="qty-btn" onclick="changePending('+it.id+',1)">+</button>'
        :'<button class="qty-btn" onclick="changeQty('+it.id+',-1)">−</button><span style="font-size:13px;min-width:16px;text-align:center">'+it.qty+'</span><button class="qty-btn" onclick="changeQty('+it.id+',1)">+</button>')
      +'</div><span class="trow-price">€'+(it.price*it.qty).toFixed(2)+'</span></div>';
  }).join("");
  ge("ticketTotal").textContent="€"+orderTotal(allItems).toFixed(2);
}

function changePending(artId,delta){
  var it=pendingItems.find(function(i){return i.id===artId;});
  if(!it) return;
  it.qty+=delta;
  if(it.qty<=0) pendingItems=pendingItems.filter(function(i){return i.id!==artId;});
  renderTicket();
}

function changeQty(artId,delta){
  var order=openTables[currentOrderTableId]; if(!order) return;
  var it=order.items.find(function(i){return i.id===artId;});
  if(!it) return;
  it.qty+=delta;
  if(it.qty<=0) order.items=order.items.filter(function(i){return i.id!==artId;});
  renderTicket();
}

function openPayModal(){
  var order=openTables[currentOrderTableId]; if(!order||!order.items.length) return;
  ge("payTotal").textContent="€"+orderTotal(order.items).toFixed(2);
  ge("payModalSub").textContent=ge("orderTitle").textContent;
  ge("payModalOverlay").classList.add("open");
}

function closeTable(method){
  var order=openTables[currentOrderTableId]; if(!order) return;
  var t=allTables().find(function(x){return x.id===currentOrderTableId;});
  var sec=sections.find(function(s){return s.tables.some(function(x){return x.id===currentOrderTableId;});});
  history24.push({tableLabel:t?t.label:currentOrderTableId,sectionName:sec?sec.name:"",total:orderTotal(order.items),method:method,closedAt:Date.now(),items:JSON.parse(JSON.stringify(order.items))});
  delete openTables[currentOrderTableId];
  ge("payModalOverlay").classList.remove("open");
  closeOrderView();
  renderHistorial();
  saveToCloud();
}

function openTableSettings(){settingsCopy=JSON.parse(JSON.stringify(sections));renderSettingsSections();ge("settingsOverlay").classList.add("open");}

function renderSettingsSections(){
  ge("settingsSections").innerHTML=settingsCopy.map(function(sec){
    return '<div class="settings-section"><div class="settings-section-header"><input class="sec-rename-input" type="text" id="secname'+sec.id+'" value="'+sec.name+'"><button class="sec-btn danger" onclick="deleteSection('+sec.id+')">✕ Sección</button></div>'
      +'<div class="settings-tables-list">'+sec.tables.map(function(t){return '<div class="tbl-settings-row"><input class="tbl-num-inp" type="text" id="tn'+t.id+'" value="'+t.label+'" placeholder="Nombre"><button class="tbl-del-btn" onclick="deleteTableFromSection('+sec.id+','+t.id+')">✕</button></div>';}).join("")
      +'<button class="tbl-add-btn" onclick="addTableToSection('+sec.id+')">+ Mesa</button></div></div>';
  }).join("");
}

function addSection(){var inp=ge("newSectionName");var name=inp.value.trim();if(!name)return;settingsCopy.push({id:Date.now(),name:name,tables:[]});inp.value="";renderSettingsSections();}
function deleteSection(id){settingsCopy=settingsCopy.filter(function(s){return s.id!==id;});renderSettingsSections();}
function addTableToSection(secId){var sec=settingsCopy.find(function(s){return s.id===secId;});if(!sec)return;var nid=Date.now();sec.tables.push({id:nid,label:""});renderSettingsSections();setTimeout(function(){var i=ge("tn"+nid);if(i)i.focus();},50);}
function deleteTableFromSection(secId,tId){var sec=settingsCopy.find(function(s){return s.id===secId;});if(sec)sec.tables=sec.tables.filter(function(t){return t.id!==tId;});renderSettingsSections();}

function saveTableSettings(){
  sections=settingsCopy.map(function(sec){
    var ne=ge("secname"+sec.id);
    return {id:sec.id,name:ne?ne.value:sec.name,tables:sec.tables.map(function(t){var e=ge("tn"+t.id);return{id:t.id,label:e?e.value:t.label};}).filter(function(t){return t.label.trim()!="";})};
  }).filter(function(s){return s.name.trim()!="";});
  ge("settingsOverlay").classList.remove("open");
  activeMesasSection="all"; activeResSection="all";
  renderMesasOverview(); renderReservationsTab(); saveToCloud();
}
