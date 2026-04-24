function purgeHistory(){
  var cutoff=Date.now()-24*60*60*1000;
  history24=history24.filter(function(h){return h.closedAt>cutoff;});
  renderHistorial();
}

function renderHistorial(){
  var el=ge("histList");
  if(!history24.length){el.innerHTML='<p style="color:#666;font-size:13px;text-align:center;padding:30px">'+t('history.empty')+'</p>';return;}
  el.innerHTML=history24.slice().sort(function(a,b){return b.closedAt-a.closedAt;}).map(function(h){
    var d=new Date(h.closedAt);
    var t=d.getHours().toString().padStart(2,"0")+":"+d.getMinutes().toString().padStart(2,"0");
    var badge=h.method==="EC"
      ?'<span style="background:#1d3a6a;color:#7ab4f5;padding:2px 8px;border-radius:10px;font-size:11px">'+t('history.card')+'</span>'
      :'<span style="background:#1d4a2e;color:#7ed4a7;padding:2px 8px;border-radius:10px;font-size:11px">'+t('history.cash')+'</span>';
    return '<div class="hist-row">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><h4>'+t('tables.table')+' '+h.tableLabel+(h.sectionName?" · "+h.sectionName:"")+'</h4><span style="font-size:16px;font-weight:700;color:#7ed4a7">€'+h.total.toFixed(2)+'</span></div>'
      +'<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">'+badge+'<span style="font-size:11px;color:#666">'+t+'</span></div>'
      +'<p style="font-size:11px;color:#666">'+h.items.map(function(i){return i.qty+'× '+i.name;}).join(", ")+'</p></div>';
  }).join("");
}
