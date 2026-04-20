function renderResTableGrid(date){
  var g=ge("resTableGrid"); g.innerHTML="";
  var secs=activeResSection==="all"?sections:sections.filter(function(s){return s.id===activeResSection;});
  secs.forEach(function(sec){
    if(activeResSection==="all"){var l=document.createElement("div");l.className="section-label";l.textContent=sec.name;g.appendChild(l);}
    sec.tables.forEach(function(t){
      var rs=reservations.filter(function(r){return r.table===t.id&&r.date===date&&r.status!=="cancelled";}).sort(function(a,b){return a.from.localeCompare(b.from);});
      var st=resStatus(t.id,date);
      var div=document.createElement("div"); div.className="tmesa";
      if(selectedTableId===t.id) div.style.outline="2px solid #fff";
      div.innerHTML='<span class="tid">'+t.label+'</span><div class="tslots">'+(rs.length?rs.map(function(r){return '<span class="tslot">'+r.from+'–'+r.to+'</span>';}).join(""):'<span class="tslot">Libre</span>')+'</div>';
      div.addEventListener("click",function(){selectedTableId=selectedTableId===t.id?null:t.id;renderReservationsTab();});
      applyResColor(div,st); g.appendChild(div);
    });
  });
}

function renderReservationsTab(){
  renderSectionPills("resSectionPills",activeResSection,"setResSection");
  var d=ge("filterDate").value||today();
  renderResTableGrid(d); renderDetailPanel(d);
}

function setResSection(id){activeResSection=id==="all"?"all":parseInt(id);selectedTableId=null;renderReservationsTab();}

function renderDetailPanel(d){
  var panel=ge("resDetailPanel");
  if(!selectedTableId){panel.innerHTML="";return;}
  var t=allTables().find(function(x){return x.id===selectedTableId;});
  var sec=sections.find(function(s){return s.tables.some(function(x){return x.id===selectedTableId;});});
  var rs=reservations.filter(function(r){return r.table===selectedTableId&&r.date===d;}).sort(function(a,b){return a.from.localeCompare(b.from);});
  var rows=rs.length?rs.map(function(r){
    return '<div class="res-row"><div><h4 style="font-size:13px;font-weight:600">'+r.name+' · '+r.guests+' pax · '+r.from+'–'+r.to+'</h4>'
      +'<p style="font-size:11px;color:#aaa;margin-top:2px">'+(r.notes||"Sin detalles")+'</p></div>'
      +'<div style="display:flex;align-items:center;gap:6px"><span class="res-badge badge-'+r.status+'">'+(r.status==="confirmed"?"Confirmada":"Pendiente")+'</span>'
      +'<button class="res-act-btn" onclick="toggleResStatus('+r.id+')">'+(r.status==="confirmed"?"⟳":"✓")+'</button>'
      +'<button class="res-act-btn del" onclick="deleteRes('+r.id+')">✕</button></div></div>';
  }).join(""):'<div style="padding:20px;text-align:center;color:#666;font-size:13px">Sin reservas</div>';
  panel.innerHTML='<div class="detail-panel"><div class="detail-header"><h3>Mesa '+t.label+(sec?" · "+sec.name:"")+" — "+rs.length+' reserva'+(rs.length!==1?"s":"")+'</h3>'
    +'<div style="display:flex;gap:8px"><button class="btn-primary" style="font-size:12px;padding:5px 12px" onclick="openResModal('+selectedTableId+')">+ Reserva</button>'
    +'<button style="background:transparent;border:none;color:#aaa;font-size:20px;cursor:pointer" onclick="selectedTableId=null;renderReservationsTab()">✕</button>'
    +'</div></div><div class="res-list">'+rows+'</div></div>';
}

function toggleResStatus(id){var r=reservations.find(function(x){return x.id===id;});if(r)r.status=r.status==="confirmed"?"pending":"confirmed";renderReservationsTab();saveToCloud();}
function deleteRes(id){reservations=reservations.filter(function(x){return x.id!==id;});renderReservationsTab();saveToCloud();}

function openResModal(tableId){
  var t=tableId?allTables().find(function(x){return x.id===tableId;}):null;
  ge("resModalTitle").textContent="Nueva reserva"; ge("resModalSub").textContent=t?"Mesa "+t.label:"";
  ge("mName").value=""; ge("mGuests").value=2; ge("mDate").value=ge("filterDate").value||today();
  ge("mFrom").value="17:00"; ge("mTo").value="19:00"; ge("mNotes").value="";
  var s=ge("mTable"); s.innerHTML='<option value="">Sin asignar</option>';
  sections.forEach(function(sec){var og=document.createElement("optgroup");og.label=sec.name;sec.tables.forEach(function(tb){var o=document.createElement("option");o.value=tb.id;o.textContent=tb.label;if(tableId===tb.id)o.selected=true;og.appendChild(o);});s.appendChild(og);});
  ge("resModalOverlay").classList.add("open");
}

function saveReservation(){
  reservations.push({id:Date.now(),name:ge("mName").value||"Sin nombre",guests:parseInt(ge("mGuests").value)||1,date:ge("mDate").value,from:ge("mFrom").value,to:ge("mTo").value,table:parseInt(ge("mTable").value)||null,notes:ge("mNotes").value,status:"confirmed"});
  ge("resModalOverlay").classList.remove("open"); renderReservationsTab(); saveToCloud();
}
