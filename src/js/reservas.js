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
  renderSectionPills("resSectionPills",activeResSection,"setResSection");
  var d=ge("filterDate").value||today();
  renderResTableGrid(d); renderDetailPanel(d);
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

function openResModal(tableId){
  var tbl=tableId?allTables().find(function(x){return x.id===tableId;}):null;
  ge("resModalTitle").textContent=t('res_modal.title'); ge("resModalSub").textContent=tbl?t('tables.table')+" "+tbl.label:"";
  ge("mName").value=""; ge("mGuests").value=2; ge("mDate").value=ge("filterDate").value||today();
  ge("mFrom").value="17:00"; ge("mTo").value="19:00"; ge("mNotes").value="";
  var s=ge("mTable"); s.innerHTML='<option value="">'+t('reservations.unassigned')+'</option>';
  sections.forEach(function(sec){var og=document.createElement("optgroup");og.label=sec.name;sec.tables.forEach(function(tb){var o=document.createElement("option");o.value=tb.id;o.textContent=tb.label;if(tableId===tb.id)o.selected=true;og.appendChild(o);});s.appendChild(og);});
  ge("resModalOverlay").classList.add("open");
}

function saveReservation(){
  reservations.push({id:Date.now(),name:ge("mName").value||t('reservations.no_name'),guests:parseInt(ge("mGuests").value)||1,date:ge("mDate").value,from:ge("mFrom").value,to:ge("mTo").value,table:parseInt(ge("mTable").value)||null,notes:ge("mNotes").value,status:"confirmed"});
  ge("resModalOverlay").classList.remove("open"); renderReservationsTab(); saveToCloud();
}
