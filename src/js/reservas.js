function renderResTableGrid(date){
  var g=ge("resTableGrid"); g.innerHTML="";
  var secs=activeResSection==="all"?sections:sections.filter(function(s){return s.id===activeResSection;});
  secs.forEach(function(sec){
    if(activeResSection==="all"){var l=document.createElement("div");l.className="section-label";l.textContent=sec.name;g.appendChild(l);}
    sec.tables.forEach(function(tbl){
      var rs=reservations.filter(function(r){return r.table===tbl.id&&r.date===date&&r.status!=="cancelled";}).sort(function(a,b){return a.from.localeCompare(b.from);});
      var st=resStatus(tbl.id,date);
      var div=document.createElement("div"); div.className="tmesa";
      if(selectedTableId===tbl.id) div.style.outline="2px solid #fff";
      div.innerHTML='<span class="tid">'+tbl.label+'</span><div class="tslots">'+(rs.length?rs.map(function(r){return '<span class="tslot">'+r.from+'–'+r.to+'</span>';}).join(""):'<span class="tslot">'+t('reservations.free')+'</span>')+'</div>';
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

function renderBookView(date){
  var el=ge("resBookView");
  var secs=activeResSection==="all"?sections:sections.filter(function(s){return s.id===activeResSection;});
  var html='<div class="res-book-wrap">';
  secs.forEach(function(sec){
    if(activeResSection==="all") html+='<div class="res-book-section-label">'+sec.name+'</div>';
    sec.tables.forEach(function(tbl){
      var isDouble=tbl.type==="double";
      if(isDouble){
        var slotNames=tbl.slots||["A","B"];
        var wholeItems=reservations.filter(function(r){return r.table===tbl.id&&r.date===date&&r.status!=="cancelled"&&(r.slot===null||r.slot===undefined);}).sort(function(a,b){return a.from.localeCompare(b.from);});
        var s0Items=reservations.filter(function(r){return r.table===tbl.id&&r.date===date&&r.status!=="cancelled"&&r.slot===0;}).sort(function(a,b){return a.from.localeCompare(b.from);});
        var s1Items=reservations.filter(function(r){return r.table===tbl.id&&r.date===date&&r.status!=="cancelled"&&r.slot===1;}).sort(function(a,b){return a.from.localeCompare(b.from);});
        var rowA=s0Items.map(function(r){return {r:r,blocked:false};}).concat(wholeItems.map(function(r){return {r:r,blocked:false,whole:true};})).sort(function(a,b){return a.r.from.localeCompare(b.r.from);});
        var rowB=s1Items.map(function(r){return {r:r,blocked:false};}).concat(wholeItems.map(function(r){return {r:r,blocked:true};})).sort(function(a,b){return a.r.from.localeCompare(b.r.from);});
        html+=renderTLRow(tbl.label,slotNames[0],rowA,tbl.id,0);
        html+=renderTLRow(tbl.label,slotNames[1],rowB,tbl.id,1);
      } else {
        var items=reservations.filter(function(r){return r.table===tbl.id&&r.date===date&&r.status!=="cancelled";}).sort(function(a,b){return a.from.localeCompare(b.from);}).map(function(r){return {r:r,blocked:false};});
        html+=renderTLRow(tbl.label,null,items,tbl.id,null);
      }
    });
  });
  el.innerHTML=html+'</div>';
}

function renderTLRow(tblLabel,slotName,items,tblId,slot){
  var label='<div class="res-tl-label"><strong>'+tblLabel+'</strong>'+(slotName?'<span class="res-book-slot">'+slotName+'</span>':'')+'</div>';
  var cells='';
  for(var i=0;i<3;i++){
    var it=items[i];
    if(!it){
      cells+='<div class="res-tl-slot empty" onclick="openResModal('+tblId+','+(slot===null?'null':slot)+')">+</div>';
    } else if(it.blocked){
      cells+='<div class="res-tl-slot blocked"><div class="slot-time">'+it.r.from+'–'+it.r.to+'</div><div style="font-size:10px;color:#555">'+t('tables.whole')+'</div></div>';
    } else {
      var r=it.r;
      cells+='<div class="res-tl-slot filled'+(it.whole?' whole':'')+'">'
        +'<div class="slot-time">'+r.from+'–'+r.to+'</div>'
        +'<div class="slot-name">'+r.name+(it.whole?' <span class="res-book-slot">'+t('tables.whole')+'</span>':'')+'</div>'
        +'<div class="slot-foot">'
        +'<span>'+r.guests+' '+t('reservations.pax')+'</span>'
        +' <span class="res-badge badge-'+r.status+'" style="font-size:9px;padding:1px 5px">'+t(r.status==="confirmed"?"reservations.confirmed":"reservations.pending")+'</span>'
        +' <button class="qty-btn" onclick="toggleResStatus('+r.id+')">'+(r.status==="confirmed"?"⟳":"✓")+'</button>'
        +' <button class="qty-btn" style="color:#fca5a5" onclick="deleteRes('+r.id+')">✕</button>'
        +'</div></div>';
    }
  }
  return '<div class="res-tl-row">'+label+cells+'</div>';
}

function setResSection(id){activeResSection=id==="all"?"all":parseInt(id);selectedTableId=null;renderReservationsTab();}

function renderDetailPanel(d){
  var panel=ge("resDetailPanel");
  if(!selectedTableId){panel.innerHTML="";return;}
  var tbl=allTables().find(function(x){return x.id===selectedTableId;});
  var sec=sections.find(function(s){return s.tables.some(function(x){return x.id===selectedTableId;});});
  var rs=reservations.filter(function(r){return r.table===selectedTableId&&r.date===d;}).sort(function(a,b){return a.from.localeCompare(b.from);});
  var rows=rs.length?rs.map(function(r){
    return '<div class="res-row"><div><h4 style="font-size:13px;font-weight:600">'+r.name+' · '+r.guests+' '+t('reservations.pax')+' · '+r.from+'–'+r.to+'</h4>'
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

function openResModal(tableId,slotIdx){
  var tbl=tableId?allTables().find(function(x){return x.id===tableId;}):null;
  ge("resModalTitle").textContent=t('res_modal.title'); ge("resModalSub").textContent=tbl?t('tables.table')+" "+tbl.label:"";
  ge("mName").value=""; ge("mGuests").value=2; ge("mDate").value=ge("filterDate").value||today();
  ge("mFrom").value="17:00"; ge("mTo").value="19:00"; ge("mNotes").value="";
  var s=ge("mTable"); s.innerHTML='<option value="">'+t('reservations.unassigned')+'</option>';
  sections.forEach(function(sec){var og=document.createElement("optgroup");og.label=sec.name;sec.tables.forEach(function(tb){var o=document.createElement("option");o.value=tb.id;o.textContent=tb.label;if(tableId===tb.id)o.selected=true;og.appendChild(o);});s.appendChild(og);});
  updateResModalSlot(slotIdx);
  ge("resModalOverlay").classList.add("open");
}

function updateResModalSlot(preselect){
  var tableId=parseInt(ge("mTable").value);
  var tbl=tableId?allTables().find(function(x){return x.id===tableId;}):null;
  var isDouble=tbl&&tbl.type==="double";
  ge("mSlotRow").style.display=isDouble?"":"none";
  if(isDouble){
    var slots=tbl.slots||["A","B"];
    ge("mSlot").innerHTML='<option value="null">'+t('tables.whole')+'</option>'
      +slots.map(function(name,i){return '<option value="'+i+'">'+name+'</option>';}).join("");
    if(preselect!==undefined&&preselect!==null) ge("mSlot").value=String(preselect);
  }
}

function saveReservation(){
  var tableId=parseInt(ge("mTable").value)||null;
  var tbl=tableId?allTables().find(function(x){return x.id===tableId;}):null;
  var slotVal=ge("mSlot").value;
  var slot=tbl&&tbl.type==="double"?(slotVal==="null"?null:parseInt(slotVal)):null;
  reservations.push({id:Date.now(),name:ge("mName").value||t('reservations.no_name'),guests:parseInt(ge("mGuests").value)||1,date:ge("mDate").value,from:ge("mFrom").value,to:ge("mTo").value,table:tableId,slot:slot,notes:ge("mNotes").value,status:"confirmed"});
  ge("resModalOverlay").classList.remove("open"); renderReservationsTab(); saveToCloud();
}
