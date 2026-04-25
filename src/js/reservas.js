function renderResTableGrid(date){
  var g=ge("resTableGrid"); g.innerHTML="";
  var secs=activeResSection==="all"?sections:sections.filter(function(s){return s.id===activeResSection;});
  secs.forEach(function(sec){
    if(activeResSection==="all"){var l=document.createElement("div");l.className="section-label";l.textContent=sec.name;g.appendChild(l);}
    sec.tables.forEach(function(tbl){
      var rs=reservations.filter(function(r){return resTableIds(r).indexOf(tbl.id)!==-1&&r.date===date&&r.status!=="cancelled";}).sort(function(a,b){return a.from.localeCompare(b.from);});
      var st=resStatus(tbl.id,date);
      var div=document.createElement("div"); div.className="tmesa";
      if(selectedTableId===tbl.id) div.style.outline="2px solid #fff";
      div.innerHTML='<span class="tid">'+tbl.label+'</span><div class="tslots">'+(rs.length?rs.map(function(r){return '<span class="tslot">'+(r.openEnd?r.from+' →':r.from+'–'+r.to)+'</span>';}).join(""):'<span class="tslot">'+t('reservations.free')+'</span>')+'</div>';
      div.addEventListener("click",function(){selectedTableId=selectedTableId===tbl.id?null:tbl.id;renderReservationsTab();});
      applyResColor(div,st); g.appendChild(div);
    });
  });
}

function renderReservationsTab(){
  var d=ge("filterDate").value||today();
  var isBook=activeResView==="book";
  renderSectionPills("resSectionPills",activeResSection,"setResSection");
  ge("resTableGrid").style.display=isBook?"none":"";
  ge("resBookView").style.display=isBook?"":"none";
  if(isBook){if(ge("resDetailPanel"))ge("resDetailPanel").innerHTML="";renderBookView(d);}
  else{renderResTableGrid(d);renderDetailPanel(d);}
  document.querySelectorAll(".view-btn").forEach(function(b){b.classList.toggle("active",b.getAttribute("data-view")===activeResView);});
}

function setResView(v){activeResView=v;selectedTableId=null;renderReservationsTab();}

function calcLanes(items,closeMin){
  var laneEnds=[];
  items.forEach(function(r){
    var fromM=timeToMinutes(r.from);
    var toM=r.openEnd?closeMin:timeToMinutes(r.to);
    var lane=-1;
    for(var i=0;i<laneEnds.length;i++){if(fromM>=laneEnds[i]){lane=i;break;}}
    if(lane===-1){lane=laneEnds.length;laneEnds.push(0);}
    r._lane=lane; laneEnds[lane]=toM;
  });
  return Math.max(1,laneEnds.length);
}

function renderBookView(date){
  var el=ge("resBookView");
  var openMin=timeToMinutes(restaurantHours.open);
  var closeMin=timeToMinutes(restaurantHours.close);
  var span=closeMin-openMin;
  if(span<=0){el.innerHTML='';return;}
  var secs=activeResSection==="all"?sections:sections.filter(function(s){return s.id===activeResSection;});

  // Pass 1 — build row data
  var rows=[];
  secs.forEach(function(sec){
    var secLabel=activeResSection==="all"?sec.name:null;
    var firstInSec=true;
    sec.tables.forEach(function(tbl){
      var all=reservations.filter(function(r){return resTableIds(r).indexOf(tbl.id)!==-1&&r.date===date&&r.status!=="cancelled";});
      var secName=firstInSec?secLabel:null;
      firstInSec=false;
      if(tbl.type==="double"){
        var sn=tbl.slots||["A","B"];
        var whole=all.filter(function(r){return r.slot===null||r.slot===undefined;});
        var s0=all.filter(function(r){return r.slot===0;});
        var s1=all.filter(function(r){return r.slot===1;});
        rows.push({secName:secName,tblLabel:tbl.label,slotName:sn[0],tblId:tbl.id,slot:0,rc:'double-a',
          items:s0.map(function(r){return Object.assign({},r);}).concat(whole.map(function(r){return Object.assign({},r,{_wholeRow:'a'});}))});
        rows.push({secName:null,tblLabel:tbl.label,slotName:sn[1],tblId:tbl.id,slot:1,rc:'double-b',
          items:s1.map(function(r){return Object.assign({},r);}).concat(whole.map(function(r){return Object.assign({},r,{_wholeRow:'b'});}))});
      } else {
        rows.push({secName:secName,tblLabel:tbl.label,slotName:null,tblId:tbl.id,slot:null,rc:'',
          items:all.map(function(r){return Object.assign({},r);})});
      }
    });
  });

  // Pass 2 — detect adjacency for multi-table reservations
  for(var i=0;i<rows.length-1;i++){
    var cur=rows[i], nxt=rows[i+1];
    var curIds=cur.items.filter(function(r){return resTableIds(r).length>1&&r._wholeRow!=='b';}).map(function(r){return r.id;});
    var nxtIds=nxt.items.filter(function(r){return resTableIds(r).length>1&&r._wholeRow!=='b';}).map(function(r){return r.id;});
    var shared=curIds.filter(function(id){return nxtIds.indexOf(id)!==-1;});
    if(shared.length){cur.connBelow=shared; nxt.connAbove=shared;}
  }

  // Pass 3 — render
  var ticks='';
  for(var h=openMin;h<=closeMin;h+=60){var p=(h-openMin)/span*100;ticks+='<div class="tl-tick" style="left:'+p.toFixed(1)+'%">'+minutesToTime(h)+'</div>';}
  var html='<div class="tl-book-wrap"><div class="tl-header"><div class="tl-row-label"></div><div class="tl-track-header">'+ticks+'</div></div>';
  rows.forEach(function(row){
    if(row.secName) html+='<div class="res-book-section-label">'+row.secName+'</div>';
    html+=renderTLRow(row,openMin,closeMin,span);
  });
  el.innerHTML=html+'</div>';
}

function renderTLRow(row,openMin,closeMin,span){
  var rc=row.rc||'';
  if(row.connBelow&&rc.indexOf('double-a')===-1) rc=(rc+' tl-linked-below').trim();
  var sorted=row.items.sort(function(a,b){return a.from.localeCompare(b.from);});
  var laneCount=calcLanes(sorted,closeMin);
  var trackH=laneCount*72;
  var label='<div class="tl-row-label"><strong>'+row.tblLabel+'</strong>'+(row.slotName?'<span class="res-book-slot">'+row.slotName+'</span>':'')+'</div>';
  var gridLines='';
  for(var h=openMin+60;h<closeMin;h+=60){var p=(h-openMin)/span*100;gridLines+='<div class="tl-grid-line" style="left:'+p.toFixed(1)+'%"></div>';}
  var bars=sorted.map(function(r){
    var fromM=timeToMinutes(r.from);
    var toM=r.openEnd?closeMin:timeToMinutes(r.to);
    var left=Math.max(0,(fromM-openMin)/span*100);
    var width=Math.max(0.5,Math.min(100-left,(toM-fromM)/span*100));
    var topPct=r._lane/laneCount*100;
    var hPct=1/laneCount*100;
    var isWholeB=r._wholeRow==='b';
    var isWhole=r._wholeRow!==undefined;
    var otherIds=resTableIds(r).filter(function(id){return id!==row.tblId;});
    var isMulti=otherIds.length>0;
    var otherLabels=otherIds.map(function(id){var tb=allTables().find(function(x){return x.id===id;});return tb?tb.label:id;}).join(', ');
    var noBot=isWhole&&r._wholeRow==='a'||(row.connBelow&&row.connBelow.indexOf(r.id)!==-1);
    var noTop=isWholeB||(row.connAbove&&row.connAbove.indexOf(r.id)!==-1);
    var cls='tl-res'+(r.openEnd?' open-end':'')+(isWhole?' whole':'')+(isWholeB?' whole-b':'')+(isMulti?' multi-tbl':'')+(noBot?' no-br-bot':'')+(noTop?' no-br-top':'');
    var timeStr=r.openEnd?r.from+' →':r.from+'–'+r.to;
    var style='left:'+left.toFixed(2)+'%;width:'+width.toFixed(2)+'%;top:'+topPct.toFixed(2)+'%;height:'+hPct.toFixed(2)+'%';
    if(isWholeB||noTop){
      return '<div class="'+cls+'" style="'+style+'" onclick="event.stopPropagation()"></div>';
    }
    return '<div class="'+cls+'" style="'+style+'" onclick="event.stopPropagation()">'
      +'<div class="tl-res-time">'+timeStr+(isMulti?' <span class="res-multi-badge">+'+otherLabels+'</span>':'')+'</div>'
      +'<div class="tl-res-name">'+r.name+' · '+r.guests+' '+t('reservations.pax')+'</div>'
      +'<div class="tl-res-foot">'
      +'<span class="res-badge badge-'+r.status+'" style="font-size:9px;padding:1px 4px">'+t(r.status==="confirmed"?"reservations.confirmed":"reservations.pending")+'</span>'
      +' <button class="qty-btn" onclick="toggleResStatus('+r.id+')">'+(r.status==="confirmed"?"⟳":"✓")+'</button>'
      +' <button class="qty-btn" style="color:#fca5a5" onclick="deleteRes('+r.id+')">✕</button>'
      +'</div></div>';
  }).join('');
  var clickSlot=row.slot===null?'null':row.slot;
  var track='<div class="tl-track" style="height:'+trackH+'px" onclick="openResModal('+row.tblId+','+clickSlot+')">'+gridLines+bars+'</div>';
  return '<div class="tl-row'+(rc?' '+rc:'')+'">' +label+track+'</div>';
}

function setResSection(id){activeResSection=id==="all"?"all":parseInt(id);selectedTableId=null;renderReservationsTab();}

function renderDetailPanel(d){
  var panel=ge("resDetailPanel");
  if(!selectedTableId){panel.innerHTML="";return;}
  var tbl=allTables().find(function(x){return x.id===selectedTableId;});
  var sec=sections.find(function(s){return s.tables.some(function(x){return x.id===selectedTableId;});});
  var rs=reservations.filter(function(r){return resTableIds(r).indexOf(selectedTableId)!==-1&&r.date===d;}).sort(function(a,b){return a.from.localeCompare(b.from);});
  var rows=rs.length?rs.map(function(r){
    var timeDisp=r.openEnd?r.from+' →':r.from+'–'+r.to;
    return '<div class="res-row"><div><h4 style="font-size:13px;font-weight:600">'+r.name+' · '+r.guests+' '+t('reservations.pax')+' · '+timeDisp+'</h4>'
      +'<p style="font-size:11px;color:#aaa;margin-top:2px">'+(r.notes||t('reservations.no_details'))+'</p></div>'
      +'<div style="display:flex;align-items:center;gap:6px"><span class="res-badge badge-'+r.status+'">'+t(r.status==="confirmed"?'reservations.confirmed':'reservations.pending')+'</span>'
      +'<button class="res-act-btn" onclick="toggleResStatus('+r.id+')">'+(r.status==="confirmed"?"⟳":"✓")+'</button>'
      +'<button class="res-act-btn del" onclick="deleteRes('+r.id+')">✕</button></div></div>';
  }).join(""):'<div style="padding:20px;text-align:center;color:#666;font-size:13px">'+t('reservations.none')+'</div>';
  panel.innerHTML='<div class="detail-panel"><div class="detail-header"><h3>'+t('tables.table')+' '+tbl.label+(sec?" · "+sec.name:"")+" — "+rs.length+' '+t(rs.length!==1?'reservations.plural':'reservations.singular')+'</h3>'
    +'<div style="display:flex;gap:8px"><button class="btn-primary" style="font-size:12px;padding:5px 12px" onclick="openResModal('+selectedTableId+')">'+t('reservations.add')+'</button>'
    +'<button style="background:transparent;border:none;color:#aaa;font-size:20px;cursor:pointer" onclick="selectedTableId=null;renderReservationsTab()">✕</button>'
    +'</div></div><div class="res-list">'+rows+'</div></div>';
}

function toggleResStatus(id){var r=reservations.find(function(x){return x.id===id;});if(r)r.status=r.status==="confirmed"?"pending":"confirmed";renderReservationsTab();saveToCloud();}
function deleteRes(id){reservations=reservations.filter(function(x){return x.id!==id;});renderReservationsTab();saveToCloud();}

function toggleOpenEnd(){var open=ge("mOpenEnd").checked;ge("mToWrap").style.display=open?"none":"";}

function openResModal(tableId,slotIdx){
  ge("resModalTitle").textContent=t('res_modal.title');
  ge("resModalSub").textContent="";
  ge("mName").value=""; ge("mGuests").value=2; ge("mDate").value=ge("filterDate").value||today();
  ge("mFrom").value="17:00"; ge("mTo").value="19:00"; ge("mNotes").value="";
  ge("mOpenEnd").checked=false; ge("mToWrap").style.display="";
  selectedModalTables=tableId?[tableId]:[];
  renderModalTablePicker(slotIdx);
  ge("resModalOverlay").classList.add("open");
}

function renderModalTablePicker(preselect){
  var html='';
  sections.forEach(function(sec){
    html+='<div class="table-picker-section">'+sec.name+'</div><div class="table-picker-row">';
    sec.tables.forEach(function(tb){
      var sel=selectedModalTables.indexOf(tb.id)!==-1;
      html+='<button type="button" class="table-picker-pill'+(sel?' sel':'')+'" onclick="toggleModalTable('+tb.id+')">'+tb.label+'</button>';
    });
    html+='</div>';
  });
  ge("mTablePicker").innerHTML=html;
  updateResModalSlot(preselect);
}

function toggleModalTable(id){
  var idx=selectedModalTables.indexOf(id);
  if(idx===-1) selectedModalTables.push(id);
  else selectedModalTables.splice(idx,1);
  renderModalTablePicker();
}

function updateResModalSlot(preselect){
  var showSlot=selectedModalTables.length===1;
  var tbl=showSlot?allTables().find(function(x){return x.id===selectedModalTables[0];}):null;
  var isDouble=tbl&&tbl.type==="double";
  ge("mSlotRow").style.display=(showSlot&&isDouble)?"":"none";
  if(showSlot&&isDouble){
    var slots=tbl.slots||["A","B"];
    ge("mSlot").innerHTML='<option value="null">'+t('tables.whole')+'</option>'
      +slots.map(function(name,i){return '<option value="'+i+'">'+name+'</option>';}).join("");
    if(preselect!==undefined&&preselect!==null) ge("mSlot").value=String(preselect);
  }
}

function saveReservation(){
  var tables=selectedModalTables.slice();
  var tableId=tables[0]||null;
  var tbl=tables.length===1?allTables().find(function(x){return x.id===tableId;}):null;
  var slotVal=ge("mSlot").value;
  var slot=tbl&&tbl.type==="double"&&tables.length===1?(slotVal==="null"?null:parseInt(slotVal)):null;
  var openEnd=ge("mOpenEnd").checked;
  var toVal=openEnd?"23:59":ge("mTo").value;
  reservations.push({id:Date.now(),name:ge("mName").value||t('reservations.no_name'),guests:parseInt(ge("mGuests").value)||1,date:ge("mDate").value,from:ge("mFrom").value,to:toVal,openEnd:openEnd,tables:tables,table:tableId,slot:slot,notes:ge("mNotes").value,status:"confirmed"});
  ge("resModalOverlay").classList.remove("open"); renderReservationsTab(); saveToCloud();
}
