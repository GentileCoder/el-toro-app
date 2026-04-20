function renderCatFilter(){
  var s=ge("artCatFilter"); if(!s) return;
  var cur=s.value;
  s.innerHTML='<option value="">Todas las categorías</option>'+categories.map(function(c){return '<option value="'+c+'"'+(cur===c?" selected":"")+'>'+c+'</option>';}).join("");
}

function renderArticulos(){
  var filter=ge("artCatFilter").value;
  var list=filter?articulos.filter(function(a){return a.cat===filter;}):articulos;
  var el=ge("artList");
  if(!list.length){el.innerHTML='<p style="color:#666;font-size:13px;text-align:center;padding:30px">No hay artículos</p>';return;}
  var grouped={},order=[];
  list.forEach(function(a){if(!grouped[a.cat]){grouped[a.cat]=[];order.push(a.cat);}grouped[a.cat].push(a);});
  el.innerHTML=order.map(function(cat){
    return '<div style="margin-bottom:16px"><div class="art-group-label">'+cat+'</div>'
      +grouped[cat].map(function(a){return '<div class="art-row"><span style="font-size:13px">'+a.name+'</span><div style="display:flex;align-items:center;gap:10px"><span style="font-size:14px;font-weight:600;color:#7ed4a7">€'+a.price.toFixed(2)+'</span><button class="res-act-btn" onclick="openArtModal('+a.id+')">✎</button><button class="res-act-btn del" onclick="deleteArticulo('+a.id+')">✕</button></div></div>';}).join("")
      +'</div>';
  }).join("");
}

function openCatModal(){renderCatList();ge("catModalOverlay").classList.add("open");}
function closeCatModal(){ge("catModalOverlay").classList.remove("open");renderCatFilter();renderArticulos();saveToCloud();}
function renderCatList(){ge("catList").innerHTML=categories.map(function(c,i){return '<div class="cat-row"><span style="flex:1;font-size:13px">'+c+'</span><button class="res-act-btn del" onclick="deleteCategory('+i+')">✕</button></div>';}).join("");}
function addCategory(){var inp=ge("newCatName");var name=inp.value.trim();if(!name||categories.indexOf(name)>=0)return;categories.push(name);inp.value="";renderCatList();}
function deleteCategory(i){categories.splice(i,1);renderCatList();}

function openArtModal(id){
  editingArtId=id;
  var a=id?articulos.find(function(x){return x.id===id;}):null;
  ge("artModalTitle").textContent=a?"Editar artículo":"Nuevo artículo";
  ge("artName").value=a?a.name:"";
  ge("artPrice").value=a?a.price:"";
  ge("artCat").innerHTML=categories.map(function(c){return '<option value="'+c+'"'+(a&&a.cat===c?" selected":"")+'>'+c+'</option>';}).join("");
  ge("artModalOverlay").classList.add("open");
}

function saveArticulo(){
  var name=ge("artName").value.trim();
  var cat=ge("artCat").value;
  var price=parseFloat(ge("artPrice").value)||0;
  if(!name) return;
  if(editingArtId){var a=articulos.find(function(x){return x.id===editingArtId;});if(a){a.name=name;a.cat=cat;a.price=price;}}
  else{articulos.push({id:Date.now(),name:name,cat:cat,price:price});}
  ge("artModalOverlay").classList.remove("open");
  renderArticulos();
  saveToCloud();
}

function deleteArticulo(id){articulos=articulos.filter(function(a){return a.id!==id;});renderArticulos();saveToCloud();}
