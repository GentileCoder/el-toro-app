function getMondayOfWeek(offset){
  var d=new Date(); var day=d.getDay();
  var diff=d.getDate()-(day===0?6:day-1);
  d.setDate(diff+offset*7); d.setHours(0,0,0,0); return d;
}

function planKey(date,slot){return date.toISOString().split("T")[0]+"|"+slot;}

function renderPlan(){
  var mon=getMondayOfWeek(planWeekOffset);
  var sat=new Date(mon); sat.setDate(mon.getDate()+5);
  ge("planWeekLabel").textContent=mon.toLocaleDateString("es-DE",{day:"numeric",month:"short"})+" – "+sat.toLocaleDateString("es-DE",{day:"numeric",month:"short",year:"numeric"});
  var grid=ge("planGrid"); grid.innerHTML="";
  DAY_OFFSETS.forEach(function(offset,i){
    var date=new Date(mon); date.setDate(mon.getDate()+offset);
    var slots=SLOTS[i+1];
    var col=document.createElement("div"); col.className="plan-day";
    var dayDate=date.toLocaleDateString("es-DE",{day:"numeric",month:"short"});
    col.innerHTML='<div class="plan-day-header">'+DAY_NAMES[i]+'<span style="font-weight:400;color:#888;margin-left:6px;font-size:10px">'+dayDate+'</span></div>'
      +slots.map(function(slot){var k=planKey(date,slot);var val=planData[k]||"";return '<div class="plan-slot"><div class="plan-slot-label">'+slot+'</div><input type="text" placeholder="Nombre..." value="'+val+'" data-key="'+k+'" oninput="planData[this.dataset.key]=this.value"></div>';}).join("");
    grid.appendChild(col);
  });
}

function shiftWeek(dir){planWeekOffset+=dir;renderPlan();}

function savePlan(){
  planData={};
  document.querySelectorAll("#planGrid input").forEach(function(inp){if(inp.value.trim())planData[inp.dataset.key]=inp.value.trim();});
  saveToCloud();
  renderPlanDisplay();
  var btn=event.target;btn.textContent="✓ Guardado";setTimeout(function(){btn.textContent="Guardar";},1500);
}

function renderPlanDisplay(){
  var el=ge("planDisplay");
  if(!el) return;
  var hasData=Object.keys(planData).length>0;
  if(!hasData){el.innerHTML="";return;}
  var mon=getMondayOfWeek(planWeekOffset);
  var html='<div style="border-top:1px solid #2a2a2a;padding-top:16px"><p style="font-size:11px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:.8px;margin-bottom:12px">Resumen</p>'
    +'<div style="display:flex;gap:0;border-radius:10px;overflow:hidden;border:1px solid #2a2a2a">';
  DAY_OFFSETS.forEach(function(offset,i){
    var date=new Date(mon); date.setDate(mon.getDate()+offset);
    var slots=SLOTS[i+1];
    html+='<div style="flex:1;border-right:'+(i<4?'1px solid #2a2a2a':'none')+'">'
      +'<div class="plan-day-header" style="text-align:center">'+DAY_NAMES[i]+'</div>';
    slots.forEach(function(slot){
      var val=planData[planKey(date,slot)]||"—";
      html+='<div style="padding:8px 10px;border-top:1px solid #2a2a2a">'
        +'<div class="plan-slot-label">'+slot+'</div>'
        +'<div style="font-size:12px;font-weight:500;color:'+(val==="—"?"#444":"#f0ece3")+'">'+val+'</div>'
        +'</div>';
    });
    html+='</div>';
  });
  html+='</div></div>';
  el.innerHTML=html;
}
