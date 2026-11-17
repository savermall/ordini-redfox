/* Red Fox — Portale Ordini (statico, GitHub Pages) */
(function(){
'use strict';
var C = window.CATALOGO;
var EMAIL_ORDINI = 'robertomallamaci@gmail.com';
var FORI = { T04: 104, A84: 84 };
var LS = 'redfox_ordine_v1';

function settimane(){ var out=[], y=26, w=48;
  for(var i=0;i<25;i++){ out.push({key:w+'/'+y, w:w, y:y, consigliata:i<6}); w+=2; if(w>52){ w=w-52; y+=1; } }
  return out; }
var SETTIMANE = settimane();

var state = { settimana: SETTIMANE[0].key, cat:'tutte', q:'', soloNew:false, cliente:{}, cart:{}, prezzo:'0,23' };
try{ var s=JSON.parse(localStorage.getItem(LS)||'null'); if(s) Object.assign(state,s); }catch(e){}
function salva(){ try{ localStorage.setItem(LS, JSON.stringify(state)); }catch(e){} }

function $(s,r){ return (r||document).querySelector(s); }
function $$(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function num(v){ var n=parseFloat(String(v).replace(',','.')); return isFinite(n)?n:0; }
function euro(n){ return n.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})+' €'; }
function int(n){ return n.toLocaleString('it-IT'); }

function dispo(a, sett){
  if(!a.dispo) return {stato:'libera', max:null};
  var v=a.dispo[sett];
  if(v===undefined) return {stato:'libera', max:null};
  if(v===null||v===0) return {stato:'esaurito', max:0};
  return {stato:'limitata', max:v};
}

function renderCategorie(){
  var el=$('#catList'), tot=C.articoli.length;
  el.innerHTML = '<li><button data-cat="tutte" class="'+(state.cat==='tutte'?'attiva':'')+'">Tutte le categorie <span class="n">'+tot+'</span></button></li>' +
    C.categorie.map(function(c){ return '<li><button data-cat="'+esc(c.nome)+'" class="'+(state.cat===c.nome?'attiva':'')+'">'+esc(c.nome)+' <span class="n">'+c.n+'</span></button></li>'; }).join('');
}

function renderSettimane(){
  var el=$('#weeks');
  el.innerHTML = SETTIMANE.map(function(s){
    var inCart = Object.keys(state.cart).some(function(k){ return k.slice(-s.key.length-1)==='|'+s.key; });
    return '<button class="week '+(s.consigliata?'consigliata':'')+' '+(s.key===state.settimana?'attiva':'')+' '+(inCart?'has':'')+'" data-sett="'+s.key+'">'+s.key+(s.consigliata?'<span class="dot">consigliata</span>':'')+'</button>';
  }).join('');
}

function filtrati(){
  var q=state.q.trim().toLowerCase();
  return C.articoli.filter(function(a){
    if(state.cat!=='tutte' && a.categoria!==state.cat) return false;
    if(state.soloNew && !a.new) return false;
    if(!q) return true;
    return (a.codice+' '+a.descrizione+' '+(a.serie||'')+' '+a.categoria).toLowerCase().indexOf(q)>=0;
  });
}

function renderProdotti(){
  var list=filtrati(), cont=$('#prodotti');
  $('#titoloCat').textContent = state.cat==='tutte'?'Tutte le categorie':state.cat;
  $('#subCat').textContent = list.length+' varietà · settimana '+state.settimana;
  if(!list.length){ cont.innerHTML='<div class="vuoto-cart">Nessun articolo con questi filtri.</div>'; return; }
  var gruppi=new Map();
  list.forEach(function(a){ var k=a.serie||'Altre varietà'; if(!gruppi.has(k)) gruppi.set(k,[]); gruppi.get(k).push(a); });
  var html='';
  gruppi.forEach(function(arr,serie){
    html += '<div class="serie-titolo">'+esc(serie)+' <span style="font-weight:500;text-transform:none;letter-spacing:0">'+arr.length+'</span></div><div class="grid">';
    arr.forEach(function(a){
      var key=a.codice+'|'+state.settimana, inCart=state.cart[key];
      html += '<article class="prod '+(inCart?'in-cart':'')+'" data-code="'+esc(a.codice)+'">'+
        '<div class="foto">'+
          (a.foto?'<img loading="lazy" src="'+esc(a.foto)+'" alt="'+esc(a.descrizione)+'">':'')+
          (a.new?'<span class="badge new">Novità</span>':(a.import?'<span class="badge imp">Import</span>':''))+
          '<span class="cod">'+esc(a.codice)+'</span></div>'+
        '<div class="body"><div><div class="nome">'+esc(a.descrizione)+'</div><div class="serie">'+esc(a.categoria)+'</div></div>'+
        '<div class="riga-q"><input class="qta '+(inCart?'attiva':'')+'" type="number" min="0" step="1" inputmode="numeric" placeholder="0" value="'+(inCart?inCart.qta:'')+'" aria-label="Contenitori '+esc(a.descrizione)+'">'+
        '<select class="cont" aria-label="Contenitore"><option value="T04"'+(!inCart||inCart.cont!=='A84'?' selected':'')+'>T04 (104)</option><option value="A84"'+(inCart&&inCart.cont==='A84'?' selected':'')+'>A84 (84)</option></select>'+
        '</div></div></article>';
    });
    html += '</div>';
  });
  cont.innerHTML = html;
}

function aggiornaProdottiInput(){
  $$('#prodotti .prod').forEach(function(card){
    var key=card.dataset.code+'|'+state.settimana, it=state.cart[key], q=$('.qta',card);
    if(q){ q.value = it?it.qta:''; q.classList.toggle('attiva',!!it); }
    card.classList.toggle('in-cart',!!it);
  });
}

function setRiga(codice, qta, cont){
  var key=codice+'|'+state.settimana;
  var a=C.articoli.find(function(x){ return x.codice===codice; });
  var q=Math.max(0,Math.floor(num(qta)));
  if(!q){ delete state.cart[key]; }
  else { var prev=state.cart[key]||{};
    state.cart[key]={codice:codice, sett:state.settimana, qta:q, cont:cont||prev.cont||'T04', descrizione:a.descrizione, serie:a.serie, categoria:a.categoria};
  }
  salva(); aggiornaBarra();
}

function righe(){ return Object.keys(state.cart).map(function(k){ return state.cart[k]; }); }
function totali(){
  var r=righe(), cont=0, piante=0;
  r.forEach(function(x){ cont+=x.qta; piante+=x.qta*(FORI[x.cont]||104); });
  var p=num(state.prezzo);
  return {n:r.length, cont:cont, piante:piante, valore:piante/1000*p};
}
function aggiornaBarra(){
  var t=totali();
  $('#bRighe').textContent=t.n; $('#bCont').textContent=int(t.cont);
  $('#bPiante').textContent=int(t.piante); $('#bVal').textContent=euro(t.valore);
  $('#btnOrdine').disabled = t.n===0;
  $('#btnOrdine').textContent = t.n?('Rivedi ordine ('+t.n+')'):'Rivedi ordine';
}

function apriOrdine(){
  var r=righe().sort(function(a,b){ return a.sett.localeCompare(b.sett)||a.categoria.localeCompare(b.categoria); });
  var corpo=$('#ordineCorpo');
  if(!r.length){ corpo.innerHTML='<div class="vuoto-cart">Nessun articolo selezionato.</div>'; }
  else{
    var perSett=new Map();
    r.forEach(function(x){ if(!perSett.has(x.sett)) perSett.set(x.sett,[]); perSett.get(x.sett).push(x); });
    var h='';
    perSett.forEach(function(arr,sett){
      h += '<div class="sett-gruppo"><h4>Settimana '+esc(sett)+'</h4><table class="righe"><thead><tr><th>Codice</th><th>Varietà</th><th>Serie</th><th>Cont.</th><th class="num">Contenitori</th><th class="num">Piante</th><th class="num">Valore</th><th></th></tr></thead><tbody>';
      arr.forEach(function(x){
        var piante=x.qta*(FORI[x.cont]||104);
        h += '<tr><td>'+esc(x.codice)+'</td><td>'+esc(x.descrizione)+'</td><td style="color:var(--grigio)">'+esc(x.serie||'')+'</td><td>'+(x.cont==='A84'?'A84':'T04')+'</td>'+
          '<td class="num"><input type="number" min="0" style="width:70px;padding:5px;border:1px solid var(--bordo);border-radius:7px;text-align:center" value="'+x.qta+'" data-mod="'+esc(x.codice+'|'+x.sett)+'"></td>'+
          '<td class="num">'+int(piante)+'</td><td class="num">'+euro(piante/1000*num(state.prezzo))+'</td>'+
          '<td><button class="btn-link" data-del="'+esc(x.codice+'|'+x.sett)+'" title="Rimuovi">✕</button></td></tr>';
      });
      h += '</tbody></table></div>';
    });
    var t=totali();
    h += '<div class="tot"><span>Righe: <b>'+t.n+'</b></span><span>Contenitori: <b>'+int(t.cont)+'</b></span><span>Piante: <b>'+int(t.piante)+'</b></span><span>Valore: <b>'+euro(t.valore)+'</b></span></div>';
    corpo.innerHTML=h;
  }
  var c=state.cliente;
  $('#clCliente').value=c.codice||''; $('#clNome').value=c.nome||''; $('#clDest').value=c.destinatario||'';
  $('#clInd').value=c.indirizzo||''; $('#clRef').value=c.referente||''; $('#clTel').value=c.telefono||'';
  $('#clMail').value=c.email||''; $('#clNote').value=c.note||'';
  $('#prezzo').value=state.prezzo||'0,23';
  $('#statoInvio').innerHTML=''; $('#btnMailto').style.display='none';
  $('#overlay').classList.add('on');
}
function chiudiOrdine(){ $('#overlay').classList.remove('on'); }

function buildRows(){
  var r=righe().sort(function(a,b){ return a.sett.localeCompare(b.sett); });
  var rows=[['SETT','CODICE','VARIETÀ','SERIE','CATEGORIA','CONTENITORE','CONTENITORI','PIANTE','PREZZO/1000','VALORE']];
  r.forEach(function(x){
    var piante=x.qta*(FORI[x.cont]||104);
    rows.push([x.sett,x.codice,x.descrizione,x.serie||'',x.categoria,x.cont,x.qta,piante,num(state.prezzo),Number((piante/1000*num(state.prezzo)).toFixed(2))]);
  });
  var t=totali();
  rows.push([]);
  rows.push(['','','','','','TOTALE',t.cont,t.piante,'',Number(t.valore.toFixed(2))]);
  return rows;
}
function buildWorkbook(){
  var wb=XLSX.utils.book_new();
  var ws=XLSX.utils.aoa_to_sheet(buildRows());
  ws['!cols']=[{wch:8},{wch:9},{wch:26},{wch:18},{wch:24},{wch:11},{wch:12},{wch:10},{wch:11},{wch:11}];
  XLSX.utils.book_append_sheet(wb,ws,'Ordine');
  var bySett={};
  righe().forEach(function(x){ (bySett[x.sett]=bySett[x.sett]||[]).push(x); });
  Object.keys(bySett).sort().forEach(function(s){
    var a=[['CODICE','VARIETÀ','SERIE','CONT.','CONTENITORI','PIANTE']];
    bySett[s].forEach(function(x){ a.push([x.codice,x.descrizione,x.serie||'',x.cont,x.qta,x.qta*(FORI[x.cont]||104)]); });
    var w=XLSX.utils.aoa_to_sheet(a);
    w['!cols']=[{wch:9},{wch:28},{wch:18},{wch:8},{wch:12},{wch:10}];
    XLSX.utils.book_append_sheet(wb,w,'Sett '+s.replace('/','-'));
  });
  return wb;
}
function scaricaExcel(){
  if(!window.XLSX){ scaricaCSV(); return; }
  var wb=buildWorkbook();
  XLSX.writeFile(wb,'Ordine_RedFox_'+((state.cliente.nome||'cliente').replace(/\W+/g,'_'))+'_'+new Date().toISOString().slice(0,10)+'.xlsx');
}
function scaricaCSV(){
  var csv=buildRows().map(function(r){ return r.map(function(c){ return '"'+String(c==null?'':c).replace(/"/g,'""')+'"'; }).join(';'); }).join('\r\n');
  var blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='Ordine_RedFox.csv'; a.click();
}

function riepilogoTesto(){
  var r=righe().sort(function(a,b){ return a.sett.localeCompare(b.sett); });
  var t=totali(), c=state.cliente;
  var s='NUOVO ORDINE RED FOX — stagione '+C.stagione+'\n\n';
  s+='Cliente: '+(c.codice||'-')+' — '+(c.nome||'-')+'\n';
  if(c.destinatario) s+='Destinatario: '+c.destinatario+'\n';
  if(c.indirizzo) s+='Indirizzo: '+c.indirizzo+'\n';
  if(c.referente) s+='Referente: '+c.referente+'\n';
  if(c.telefono) s+='Telefono: '+c.telefono+'\n';
  if(c.email) s+='Email: '+c.email+'\n';
  var cur='';
  r.forEach(function(x){
    if(x.sett!==cur){ cur=x.sett; s+='\nSETTIMANA '+cur+'\n'; }
    s+='  '+x.codice+'  '+x.descrizione+'  —  '+x.qta+' x '+x.cont+' ('+(x.qta*(FORI[x.cont]||104))+' piante)\n';
  });
  s+='\nTOTALE: '+t.n+' righe · '+t.cont+' contenitori · '+int(t.piante)+' piante · '+euro(t.valore)+'\n';
  s+='Prezzo per 1.000 + Lic. + Suppl.: '+state.prezzo+'\n';
  if(c.note) s+='\nNote: '+c.note+'\n';
  return s;
}

function mostraStato(tipo,msg){ $('#statoInvio').innerHTML='<div class="avviso '+tipo+'">'+esc(msg)+'</div>'; }

function inviaOrdine(){
  var t=totali();
  if(!t.n) return;
  if(!state.cliente.nome){ mostraStato('err','Inserisci almeno il nome del cliente prima di inviare.'); return; }
  var btn=$('#btnInvia'); btn.disabled=true; btn.textContent='Invio…';
  mostraStato('info','Invio in corso…');
  var fd=new FormData();
  fd.append('_subject','Ordine Red Fox — '+state.cliente.nome+' — '+new Date().toLocaleDateString('it-IT'));
  fd.append('_template','table');
  fd.append('_captcha','false');
  fd.append('Cliente',(state.cliente.codice||'')+' '+state.cliente.nome);
  fd.append('Destinatario',state.cliente.destinatario||'-');
  fd.append('Riepilogo',riepilogoTesto());
  fd.append('Righe',String(t.n));
  fd.append('Contenitori',String(t.cont));
  fd.append('Piante',String(t.piante));
  fd.append('Valore',euro(t.valore));
  try{
    if(window.XLSX){
      var buf=XLSX.write(buildWorkbook(),{bookType:'xlsx',type:'array'});
      fd.append('allegato',new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),
        'Ordine_'+(state.cliente.nome||'cliente').replace(/\W+/g,'_')+'.xlsx');
    }
  }catch(e){ console.warn('attach',e); }
  fetch('https://formsubmit.co/ajax/'+EMAIL_ORDINI,{method:'POST',body:fd,headers:{Accept:'application/json'}})
    .then(function(res){ if(!res.ok) throw new Error('HTTP '+res.status); return res.json().catch(function(){ return {}; }); })
    .then(function(j){ if(j && (j.success===false || j.success==='false')) throw new Error(j.message||'invio rifiutato');
      mostraStato('ok','Ordine inviato. Trovi riepilogo ed Excel in '+EMAIL_ORDINI+'.');
      setTimeout(chiudiOrdine,1600);
    })
    .catch(function(e){
      mostraStato('err','Invio automatico non riuscito ('+e.message+'). Scarica l\'Excel oppure usa il pulsante email.');
      $('#btnMailto').style.display='inline-block';
    })
    .then(function(){ btn.disabled=false; btn.textContent='Invia ordine'; });
}

function aggiornaTestata(){
  var c=state.cliente;
  $('#hCliente').textContent=c.nome||'Nessun cliente impostato';
  $('#hCliente').className='cliente-val'+(c.nome?'':' vuoto');
  $('#hCliente2').textContent=c.codice?('Cod. '+c.codice):'';
}

function collegaEventi(){
  $('#catList').addEventListener('click',function(e){
    var b=e.target.closest('button[data-cat]'); if(!b) return;
    state.cat=b.dataset.cat; salva(); renderCategorie(); renderProdotti(); window.scrollTo({top:0,behavior:'smooth'});
  });
  $('#weeks').addEventListener('click',function(e){
    var b=e.target.closest('button[data-sett]'); if(!b) return;
    state.settimana=b.dataset.sett; salva(); renderSettimane(); renderProdotti();
  });
  var tmr;
  $('#cerca').addEventListener('input',function(e){
    state.q=e.target.value; clearTimeout(tmr); tmr=setTimeout(function(){ salva(); renderProdotti(); },180);
  });
  $('#soloNew').addEventListener('change',function(e){ state.soloNew=e.target.checked; salva(); renderProdotti(); });
  $('#prodotti').addEventListener('input',function(e){
    if(!e.target.classList.contains('qta')) return;
    var card=e.target.closest('.prod'); if(!card) return;
    setRiga(card.dataset.code,e.target.value,$('.cont',card).value);
    card.classList.toggle('in-cart',!!state.cart[card.dataset.code+'|'+state.settimana]);
  });
  $('#prodotti').addEventListener('change',function(e){
    var card=e.target.closest('.prod'); if(!card) return;
    if(e.target.classList.contains('cont')){
      var it=state.cart[card.dataset.code+'|'+state.settimana];
      if(it){ it.cont=e.target.value; salva(); aggiornaBarra(); }
    }
  });
  $('#btnOrdine').addEventListener('click',apriOrdine);
  $('#btnChiudi').addEventListener('click',chiudiOrdine);
  $('#overlay').addEventListener('click',function(e){ if(e.target.id==='overlay') chiudiOrdine(); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape') chiudiOrdine(); });
  $('#ordineCorpo').addEventListener('input',function(e){
    var mod=e.target.dataset.mod; if(!mod) return;
    var it=state.cart[mod]; if(!it) return;
    var q=Math.floor(num(e.target.value));
    if(q<=0) delete state.cart[mod]; else it.qta=q;
    salva(); aggiornaBarra(); aggiornaProdottiInput();
  });
  $('#ordineCorpo').addEventListener('click',function(e){
    var del=e.target.dataset.del; if(!del) return;
    delete state.cart[del]; salva(); aggiornaBarra(); aggiornaProdottiInput(); apriOrdine();
  });
  $('#btnExcel').addEventListener('click',scaricaExcel);
  $('#btnStampa').addEventListener('click',function(){ window.print(); });
  $('#btnInvio').addEventListener('click',inviaOrdine);
  $('#btnSvuota').addEventListener('click',function(){
    if(!confirm('Svuotare tutto l\'ordine?')) return;
    state.cart={}; salva(); aggiornaBarra(); aggiornaProdottiInput(); apriOrdine();
  });
  $('#datiCliente').addEventListener('input',function(e){
    var map={clCliente:'codice',clNome:'nome',clDest:'destinatario',clInd:'indirizzo',clRef:'referente',clTel:'telefono',clMail:'email',clNote:'note'};
    if(map[e.target.id]){ state.cliente[map[e.target.id]]=e.target.value; salva(); aggiornaTestata(); }
  });
  $('#prezzo').addEventListener('input',function(e){ state.prezzo=e.target.value; salva(); });
  $('#btnMailto').addEventListener('click',function(){
    var s=encodeURIComponent(riepilogoTesto());
    location.href='mailto:'+EMAIL_ORDINI+'?subject='+encodeURIComponent('Ordine Red Fox — '+(state.cliente.nome||''))+'&body='+s;
  });
  $('#btnPulisci').addEventListener('click',function(){
    state.q=''; state.cat='tutte'; state.soloNew=false;
    $('#cerca').value=''; $('#soloNew').checked=false;
    salva(); renderCategorie(); renderProdotti();
  });
}

function init(){
  $('#stagione').textContent='Stagione '+C.stagione;
  $('#agente').textContent=C.agente;
  renderCategorie(); renderSettimane(); renderProdotti(); aggiornaBarra(); aggiornaTestata(); collegaEventi();
}
document.addEventListener('DOMContentLoaded',init);
})();
