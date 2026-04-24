function renderMesasOverview(){
  renderSectionPills("mesasSectionPills",activeMesasSection,"setMesasSection");
  var g=ge("mesasGrid"); g.innerHTML="";
  var secs=activeMesasSection==="all"?sections:sections.filter(function(s){return s.id===activeMesasSection;});
  secs.forEach(function(sec){
    if(activeMesasSection==="all"){var l=document.createElement("div");l.className="section-label";l.textContent=sec.name;g.appendChild(l);}
    sec.tables.forEach(function(tbl){
      var div=document.createElement("div"); div.className="tmesa";
      if(tbl.type==="double"){
        var slotNames=tbl.slots||["A","B"];
        var wholeOrder=openTables[tbl.id];
        var s0Order=openTables[tbl.id+"_0"];
        var s1Order=openTables[tbl.id+"_1"];
        var anyOpen=!!(wholeOrder||s0Order||s1Order);
        var info;
        if(wholeOrder){
          info='<span class="tslot">'+t('tables.whole')+' · €'+orderTotal(wholeOrder.items).toFixed(2)+'</span>';
        } else {
          info='<span class="tslot">'+slotNames[0]+': '+(s0Order?'€'+orderTotal(s0Order.items).toFixed(2):t('tables.free'))+'</span>'
              +'<span class="tslot">'+slotNames[1]+': '+(s1Order?'€'+orderTotal(s1Order.items).toFixed(2):t('tables.free'))+'</span>';
        }
        div.innerHTML='<span class="tid">'+tbl.label+'</span><div class="tslots">'+info+'</div>';
        div.addEventListener("click",function(){openDoubleTablePicker(tbl.id);});
        applyMesaColor(div,anyOpen);
      } else {
        var isOpen=!!openTables[tbl.id];
        var order=openTables[tbl.id];
        var info2=isOpen?'<span class="tslot">€'+orderTotal(order.items).toFixed(2)+'</span><span class="tslot">'+order.items.length+t('tables.items_suffix')+'</span>':'<span class="tslot">'+t('tables.free')+'</span>';
        div.innerHTML='<span class="tid">'+tbl.label+'</span><div class="tslots">'+info2+'</div>';
        div.addEventListener("click",function(){openOrderView(tbl.id,null);});
        applyMesaColor(div,isOpen);
      }
      g.appendChild(div);
    });
  });
}

function openDoubleTablePicker(tblId){
  var tbl=allTables().find(function(x){return x.id===tblId;});
  var slotNames=tbl.slots||["A","B"];
  ge("tableSlotTitle").textContent=t('tables.table')+' '+tbl.label;
  var opts=[
    {slot:null,label:t('tables.whole'),key:tblId},
    {slot:0,label:slotNames[0],key:tblId+"_0"},
    {slot:1,label:slotNames[1],key:tblId+"_1"}
  ];
  ge("tableSlotBtns").innerHTML=opts.map(function(o){
    var order=openTables[o.key];
    var info=order?(' · €'+orderTotal(order.items).toFixed(2)+' / '+order.items.length+t('tables.items_suffix')):'';
    var status=order?'':' <span style="font-size:11px;color:#6b7280">'+t('tables.free')+'</span>';
    return '<button class="btn-secondary" style="width:100%;text-align:left;padding:10px 14px" onclick="ge(\'tableSlotOverlay\').classList.remove(\'open\');openOrderView('+tblId+','+(o.slot===null?'null':o.slot)+')">'
      +'<strong>'+o.label+'</strong>'+info+status+'</button>';
  }).join("");
  ge("tableSlotOverlay").classList.add("open");
}

function setMesasSection(id){activeMesasSection=id==="all"?"all":parseInt(id);renderMesasOverview();}

function openOrderView(tableId,slot){
  currentOrderTableId=tableId;
  currentOrderSlot=(slot===0||slot===1)?slot:null;
  pendingItems=[];
  var tbl=allTables().find(function(x){return x.id===tableId;});
  var label=t('tables.table')+" "+(tbl?tbl.label:tableId);
  if(tbl&&tbl.type==="double"){
    var slotNames=tbl.slots||["A","B"];
    label+=currentOrderSlot!==null?' · '+slotNames[currentOrderSlot]:' ('+t('tables.whole')+')';
  }
  ge("orderTitle").textContent=label;
  ge("mesasOverview").style.display="none";
  ge("orderView").classList.add("active");
  renderOrderCats(); renderTicket();
}

function closeOrderView(){
  pendingItems=[];
  var key=getOrderKey(currentOrderTableId,currentOrderSlot);
  var order=openTables[key];
  if(order&&order.items.length===0) delete openTables[key];
  ge("mesasOverview").style.display="";
  ge("orderView").classList.remove("active");
  currentOrderTableId=null; currentOrderSlot=null;
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
  var key=getOrderKey(currentOrderTableId,currentOrderSlot);
  if(!openTables[key]) openTables[key]={items:[],openedAt:Date.now()};
  var order=openTables[key];
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
  var order=openTables[getOrderKey(currentOrderTableId,currentOrderSlot)];
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
  if(!allItems.length){ge("ticketItems").innerHTML='<div style="padding:20px;text-align:center;color:#555;font-size:13px">'+t('tables.no_items')+'</div>';ge("ticketTotal").textContent="€0.00";return;}
  ge("ticketItems").innerHTML=allItems.map(function(it){
    var style=it.pending?"opacity:0.55":"";
    return '<div class="ticket-row" style="'+style+'">'
      +'<span class="trow-name">'+it.name+(it.pending?' <span style="font-size:10px;color:#e8c67c">'+t('tables.pending')+'</span>':'')+'</span>'
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
  var order=openTables[getOrderKey(currentOrderTableId,currentOrderSlot)]; if(!order) return;
  var it=order.items.find(function(i){return i.id===artId;});
  if(!it) return;
  it.qty+=delta;
  if(it.qty<=0) order.items=order.items.filter(function(i){return i.id!==artId;});
  renderTicket();
}

function openPayModal(){
  var order=openTables[getOrderKey(currentOrderTableId,currentOrderSlot)]; if(!order||!order.items.length) return;
  ge("payTotal").textContent="€"+orderTotal(order.items).toFixed(2);
  ge("payModalSub").textContent=ge("orderTitle").textContent;
  ge("payModalOverlay").classList.add("open");
}

function closeTable(method){
  var key=getOrderKey(currentOrderTableId,currentOrderSlot);
  var order=openTables[key]; if(!order) return;
  var tbl=allTables().find(function(x){return x.id===currentOrderTableId;});
  var sec=sections.find(function(s){return s.tables.some(function(x){return x.id===currentOrderTableId;});});
  var slotSuffix=tbl&&tbl.type==="double"?(currentOrderSlot!==null?' · '+(tbl.slots||["A","B"])[currentOrderSlot]:' ('+t('tables.whole')+')'):'';
  history24.push({tableLabel:(tbl?tbl.label:currentOrderTableId)+slotSuffix,sectionName:sec?sec.name:"",total:orderTotal(order.items),method:method,closedAt:Date.now(),items:JSON.parse(JSON.stringify(order.items))});
  delete openTables[key];
  ge("payModalOverlay").classList.remove("open");
  closeOrderView();
  renderHistorial();
  saveToCloud();
}

function openTableSettings(){settingsCopy=JSON.parse(JSON.stringify(sections));renderSettingsSections();ge("settingsOverlay").classList.add("open");}

function renderSettingsSections(){
  ge("settingsSections").innerHTML=settingsCopy.map(function(sec){
    return '<div class="settings-section"><div class="settings-section-header"><input class="sec-rename-input" type="text" id="secname'+sec.id+'" value="'+sec.name+'"><button class="sec-btn danger" onclick="deleteSection('+sec.id+')">'+t('tables.delete_section')+'</button></div>'
      +'<div class="settings-tables-list">'+sec.tables.map(function(tb){
        var isDouble=tb.type==="double";
        var slots=tb.slots||["A","B"];
        return '<div class="tbl-settings-row">'
          +'<input class="tbl-num-inp" type="text" id="tn'+tb.id+'" value="'+tb.label+'" placeholder="'+t('res_modal.name_ph')+'">'
          +'<button class="tbl-del-btn" onclick="deleteTableFromSection('+sec.id+','+tb.id+')">✕</button>'
          +'</div>'
          +'<div class="tbl-type-row">'
          +'<select class="tbl-type-sel" id="ttype'+tb.id+'" onchange="toggleTableType('+tb.id+')">'
          +'<option value="single"'+(isDouble?'':' selected')+'>'+t('tables.single')+'</option>'
          +'<option value="double"'+(isDouble?' selected':'')+'>'+t('tables.double')+'</option>'
          +'</select>'
          +'</div>'
          +'<div class="tbl-slots-row" id="tslots'+tb.id+'" style="display:'+(isDouble?'flex':'none')+';gap:6px">'
          +'<input class="tbl-slot-inp" type="text" id="ts0_'+tb.id+'" value="'+slots[0]+'" placeholder="A">'
          +'<input class="tbl-slot-inp" type="text" id="ts1_'+tb.id+'" value="'+slots[1]+'" placeholder="B">'
          +'</div>';
      }).join("")
      +'<button class="tbl-add-btn" onclick="addTableToSection('+sec.id+')">'+t('tables.add_table')+'</button></div></div>';
  }).join("");
}

function toggleTableType(tbId){
  var sel=ge("ttype"+tbId); var row=ge("tslots"+tbId);
  if(row) row.style.display=sel.value==="double"?"flex":"none";
}

function addSection(){var inp=ge("newSectionName");var name=inp.value.trim();if(!name)return;settingsCopy.push({id:Date.now(),name:name,tables:[]});inp.value="";renderSettingsSections();}
function deleteSection(id){settingsCopy=settingsCopy.filter(function(s){return s.id!==id;});renderSettingsSections();}
function addTableToSection(secId){var sec=settingsCopy.find(function(s){return s.id===secId;});if(!sec)return;var nid=Date.now();sec.tables.push({id:nid,label:""});renderSettingsSections();setTimeout(function(){var i=ge("tn"+nid);if(i)i.focus();},50);}
function deleteTableFromSection(secId,tId){var sec=settingsCopy.find(function(s){return s.id===secId;});if(sec)sec.tables=sec.tables.filter(function(t){return t.id!==tId;});renderSettingsSections();}

function saveTableSettings(){
  sections=settingsCopy.map(function(sec){
    var ne=ge("secname"+sec.id);
    return {id:sec.id,name:ne?ne.value:sec.name,tables:sec.tables.map(function(tb){
      var e=ge("tn"+tb.id);
      var typeEl=ge("ttype"+tb.id);
      var type=typeEl?typeEl.value:(tb.type||"single");
      var obj={id:tb.id,label:e?e.value:tb.label,type:type};
      if(type==="double"){
        var s0=ge("ts0_"+tb.id); var s1=ge("ts1_"+tb.id);
        obj.slots=[(s0&&s0.value)||"A",(s1&&s1.value)||"B"];
      }
      return obj;
    }).filter(function(tb){return tb.label.trim()!="";})};
  }).filter(function(s){return s.name.trim()!="";});
  ge("settingsOverlay").classList.remove("open");
  activeMesasSection="all"; activeResSection="all";
  renderMesasOverview(); renderReservationsTab(); saveToCloud();
}
