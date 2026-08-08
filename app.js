const $ = id => document.getElementById(id);
const form = $('nursingForm');
const resultSection = $('resultSection');
const installBtn = $('installBtn');
const themeBtn = $('themeBtn');
let deferredPrompt = null;
let submitMode = 'both';
const STORAGE_KEY = 'evolucao-enfermagem-historico-v1';
const THEME_KEY = 'evolucao-enfermagem-tema';
const FORM_FIELDS = ['patient','bed','unit','diagnosis','bp','hr','rr','spo2','temp','pain','resp','devices','diet','urine','skin','dietRoute','dietType','dietVolume','gastricResidual','thermalBed','phototherapy','phototherapyPct','general','bowel','shift','notes','customCare'];
const CALC_FIELDS = ['gestAgeWeeks','birthDate','refDate','calcWeight','feedMl','feedsDay','intakeMl','outputMl','doseMgKg','dripVolume','dripHours','dropFactor'];
const templates = {
  prematuridade: {
    diagnosis: 'Prematuridade',
    notes: 'Recém-nascido em acompanhamento neonatal, manter vigilância de padrão respiratório, termorregulação, aceitação alimentar, eliminações e sinais de instabilidade.',
    care: ['Monitorar sinais vitais conforme rotina e condição clínica.','Manter cuidados de higiene e conforto conforme necessidade.','Manter medidas de prevenção de lesão por pressão conforme avaliação de risco.']
  },
  sdr: {
    diagnosis: 'Síndrome do desconforto respiratório',
    notes: 'Manter observação de esforço respiratório, saturação, suporte ventilatório em uso e resposta aos cuidados.',
    care: ['Monitorar sinais vitais conforme rotina e condição clínica.','Avaliar dor e registrar resposta às medidas instituídas.','Manter cuidados com acessos e dispositivos, observando sinais de complicação.']
  },
  sepse: {
    diagnosis: 'Sepse neonatal',
    notes: 'Manter vigilância de temperatura, perfusão, padrão respiratório, aceitação alimentar, diurese e intercorrências no período.',
    care: ['Monitorar sinais vitais conforme rotina e condição clínica.','Controlar e registrar eliminações e balanço hídrico quando indicado.','Administrar medicamentos somente conforme prescrição válida, realizando as checagens de segurança aplicáveis.']
  },
  ictericia: {
    diagnosis: 'Icterícia neonatal',
    notes: 'Manter cuidados relacionados à fototerapia quando prescrita, proteção ocular conforme protocolo, hidratação/aceitação alimentar e eliminações.',
    care: ['Monitorar sinais vitais conforme rotina e condição clínica.','Controlar e registrar eliminações e balanço hídrico quando indicado.','Manter cuidados de higiene e conforto conforme necessidade.']
  }
};
const suggestionText = {
  prematuridade: 'Diagnósticos de enfermagem sugeridos para revisão: risco de termorregulação ineficaz; risco de infecção; nutrição desequilibrada conforme avaliação.\nResultados esperados: estabilidade térmica, sinais vitais adequados ao quadro, aceitação alimentar conforme prescrição, pele íntegra.\nIntervenções: monitorização clínica, controle térmico, cuidados com dieta/dispositivos, prevenção de infecção e lesão de pele.',
  sdr: 'Diagnósticos de enfermagem sugeridos para revisão: padrão respiratório ineficaz; troca gasosa prejudicada; risco de aspiração conforme suporte em uso.\nResultados esperados: saturação dentro da meta prescrita, redução de esforço respiratório, estabilidade hemodinâmica.\nIntervenções: monitorização respiratória, posicionamento, cuidados com oxigenoterapia/ventilação, registro de sinais de desconforto.',
  sepse: 'Diagnósticos de enfermagem sugeridos para revisão: risco de choque; hipertermia ou hipotermia conforme avaliação; risco de glicemia instável; risco de infecção relacionado a dispositivos.\nResultados esperados: temperatura e perfusão estáveis, diurese acompanhada, ausência de piora clínica no período.\nIntervenções: controle rigoroso de sinais vitais, balanço hídrico quando indicado, cuidados com acessos e administração segura de medicamentos prescritos.',
  ictericia: 'Diagnósticos de enfermagem sugeridos para revisão: risco de bilirrubina neonatal elevada; risco de volume de líquidos deficiente; risco de integridade da pele prejudicada conforme exposição.\nResultados esperados: fototerapia realizada conforme prescrição, aceitação alimentar acompanhada, eliminações registradas, pele e olhos protegidos conforme protocolo.\nIntervenções: cuidados com fototerapia, proteção ocular, controle de temperatura, registro de dieta, diurese e evacuação.'
};

function clean(value){ return (value || '').trim().replace(/\s+/g,' '); }
function sentence(value){ const v=clean(value); if(!v) return ''; return /[.!?]$/.test(v) ? v : `${v}.`; }
function showToast(msg){ const t=$('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>t.classList.remove('show'),1500); }
function capFirst(s){ return s ? s.charAt(0).toUpperCase()+s.slice(1) : s; }
function toNumber(value){ return Number(String(value || '').replace(',','.')); }
function escapeHtml(value){
  return String(value || '').replace(/[&<>"']/g, char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function updateDate(){
  const fmt=new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'});
  $('todayLabel').textContent=capFirst(fmt.format(new Date()).replace('.',''));
}

function updateVitalsSummary(){
  const vals=[$('bp').value,$('hr').value,$('rr').value,$('spo2').value,$('temp').value,$('pain').value].map(clean).filter(Boolean);
  $('vitalsSummary').textContent = vals.length ? `${vals.length} item${vals.length>1?'s':''} registrado${vals.length>1?'s':''}` : 'Preencher';
}
['bp','hr','rr','spo2','temp','pain'].forEach(id=>$(id).addEventListener('input',updateVitalsSummary));

function updateConnectionStatus(){
  const online = navigator.onLine;
  $('syncStatus').textContent = online ? 'Online - histórico local' : 'Offline - histórico local';
  $('connectionDot').classList.toggle('offline', !online);
}
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);

function applyTheme(theme){
  document.body.classList.toggle('light-theme', theme === 'light');
  localStorage.setItem(THEME_KEY, theme);
}
themeBtn.addEventListener('click',()=>{
  applyTheme(document.body.classList.contains('light-theme') ? 'dark' : 'light');
});

document.querySelectorAll('[data-focus]').forEach(btn=>btn.addEventListener('click',()=>{
  const panel=$('vitalsPanel');
  panel.scrollIntoView({behavior:'smooth',block:'center'});
  setTimeout(()=>$(btn.dataset.focus)?.focus(),350);
}));

function inferTemplateKey(){
  const explicit = $('templateSelect').value;
  if(explicit) return explicit;
  const text = clean($('diagnosis').value).toLowerCase();
  if(/prematur/.test(text)) return 'prematuridade';
  if(/\bsdr\b|desconforto respirat/.test(text)) return 'sdr';
  if(/sepse|infecc/.test(text)) return 'sepse';
  if(/icter|bilirrub/.test(text)) return 'ictericia';
  return '';
}

function updateSuggestions(){
  const key = inferTemplateKey();
  $('suggestions').value = key ? suggestionText[key] : '';
}

function applyTemplate(){
  const key = $('templateSelect').value;
  if(!key || !templates[key]){ showToast('Selecione um modelo'); return; }
  const tpl = templates[key];
  if(!$('diagnosis').value) $('diagnosis').value = tpl.diagnosis;
  const currentNotes = clean($('notes').value);
  $('notes').value = currentNotes ? `${currentNotes}\n${tpl.notes}` : tpl.notes;
  document.querySelectorAll('#careChecks input').forEach(input=>{
    if(tpl.care.includes(input.value)) input.checked = true;
  });
  updateSuggestions();
  showToast('Modelo aplicado');
}
$('templateSelect').addEventListener('change', updateSuggestions);
$('diagnosis').addEventListener('input', updateSuggestions);
$('applyTemplateBtn').addEventListener('click', applyTemplate);

function getHistory(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch{ return []; }
}

function setHistory(items){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0,30)));
}

function collectFormData(){
  const fields = {};
  FORM_FIELDS.forEach(id=>fields[id] = $(id).value);
  const checked = [...document.querySelectorAll('#careChecks input:checked')].map(input=>input.value);
  return {fields, checked, evolution:$('evolution').value, prescription:$('prescription').value};
}

function fillFormData(data){
  if(!data) return;
  Object.entries(data.fields || {}).forEach(([id,value])=>{ if($(id)) $(id).value = value; });
  document.querySelectorAll('#careChecks input').forEach(input=>{ input.checked = (data.checked || []).includes(input.value); });
  $('evolution').value = data.evolution || '';
  $('prescription').value = data.prescription || '';
  updateVitalsSummary();
  updateSuggestions();
}

function refreshHistorySelect(){
  const patient = clean($('patient').value);
  const options = getHistory().filter(item=>!patient || item.patient === patient);
  $('historySelect').innerHTML = '<option value="">Plantões salvos</option>' + options.map(item=>`<option value="${escapeHtml(item.id)}">${escapeHtml(item.patient || 'Sem paciente')} - ${escapeHtml(item.label)}</option>`).join('');
}

function saveHistory(){
  const patient = clean($('patient').value);
  if(!patient){ showToast('Informe o paciente'); return; }
  $('evolution').value = buildEvolution();
  $('prescription').value = buildPrescription();
  const now = new Date();
  const label = new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(now);
  const entry = {id:String(now.getTime()), patient, label, savedAt:now.toISOString(), ...collectFormData()};
  setHistory([entry, ...getHistory().filter(item=>item.id !== entry.id)]);
  refreshHistorySelect();
  showToast('Plantão salvo');
}

function loadHistory(){
  const id = $('historySelect').value;
  const item = getHistory().find(entry=>entry.id === id);
  if(!item){ showToast('Selecione um plantão'); return; }
  fillFormData(item);
  resultSection.classList.remove('hidden');
  showToast('Histórico carregado');
}
$('patient').addEventListener('input', refreshHistorySelect);
$('saveHistoryBtn').addEventListener('click', saveHistory);
$('loadHistoryBtn').addEventListener('click', loadHistory);

function updateCalculators(){
  const results = [];
  const gestAge = toNumber($('gestAgeWeeks').value);
  const birth = $('birthDate').value ? new Date(`${$('birthDate').value}T00:00:00`) : null;
  const ref = $('refDate').value ? new Date(`${$('refDate').value}T00:00:00`) : new Date();
  if(gestAge && birth && !Number.isNaN(birth.getTime())){
    const days = Math.max(0, Math.floor((ref - birth) / 86400000));
    const correctedDays = Math.round((gestAge * 7) + days - 280);
    const sign = correctedDays < 0 ? '-' : '';
    const absDays = Math.abs(correctedDays);
    results.push(`Idade corrigida: ${sign}${Math.floor(absDays / 7)}s${absDays % 7}d`);
  }
  const weight = toNumber($('calcWeight').value);
  const feedMl = toNumber($('feedMl').value);
  const feedsDay = toNumber($('feedsDay').value);
  if(weight && feedMl && feedsDay) results.push(`Dieta: ${Math.round((feedMl * feedsDay / weight) * 10) / 10} ml/kg/dia`);
  const intake = toNumber($('intakeMl').value);
  const output = toNumber($('outputMl').value);
  if(!Number.isNaN(intake) && !Number.isNaN(output) && ($('intakeMl').value || $('outputMl').value)) results.push(`Balanço hídrico: ${Math.round((intake - output) * 10) / 10} ml`);
  const dose = toNumber($('doseMgKg').value);
  if(weight && dose) results.push(`Dose total prescrita: ${Math.round((weight * dose) * 100) / 100} mg`);
  const volume = toNumber($('dripVolume').value);
  const hours = toNumber($('dripHours').value);
  const factor = toNumber($('dropFactor').value);
  if(volume && hours && factor) results.push(`Gotejamento: ${Math.round((volume * factor) / (hours * 60))} gotas/min`);
  $('calcResults').textContent = results.length ? results.join('\n') : 'Preencha os dados para calcular.';
}
CALC_FIELDS.forEach(id=>$(id).addEventListener('input', updateCalculators));

function buildEvolution(){
  const patient=clean($('patient').value);
  const bed=clean($('bed').value);
  const unit=clean($('unit').value);
  const shift=clean($('shift').value);
  const diagnosis=clean($('diagnosis').value);
  const openingParts=[];
  if(patient) openingParts.push(patient);
  else openingParts.push('Paciente avaliado(a)');
  if(unit) openingParts.push(`em ${unit}`);
  if(bed) openingParts.push(`em ${bed}`);
  if(shift) openingParts.push(`no turno da ${shift.toLowerCase()}`);

  const sections=[`${openingParts.join(' ')}.`];
  if(diagnosis) sections.push(`Diagnóstico/motivo informado: ${sentence(diagnosis)}`);

  const status=[sentence($('general').value)].filter(Boolean).join(' ');
  if(status) sections.push(status);

  const vitals=[];
  if(clean($('bp').value)) vitals.push(`PA ${clean($('bp').value)}`);
  if(clean($('hr').value)) vitals.push(`FC ${clean($('hr').value)}`);
  if(clean($('rr').value)) vitals.push(`FR ${clean($('rr').value)}`);
  if(clean($('spo2').value)) vitals.push(`SpO₂ ${clean($('spo2').value)}`);
  if(clean($('temp').value)) vitals.push(`T ${clean($('temp').value)}`);
  if(clean($('pain').value)) vitals.push(`dor ${clean($('pain').value)}`);
  if(vitals.length) sections.push(`Sinais/avaliações registrados: ${vitals.join('; ')}.`);

  const dietParts=[
    clean($('diet').value),
    clean($('dietRoute').value),
    clean($('dietType').value),
    clean($('dietVolume').value) ? `${clean($('dietVolume').value)}` : ''
  ].filter(Boolean);
  if(dietParts.length) sections.push(`Dieta: ${sentence(dietParts.join(', '))}`);

  const gastricResidual=clean($('gastricResidual').value);
  if(gastricResidual) sections.push(`Resíduo gástrico: ${sentence(gastricResidual)}`);

  const thermalBed=clean($('thermalBed').value);
  if(thermalBed) sections.push(`Acomodação: ${sentence(thermalBed)}`);

  const photo=clean($('phototherapy').value);
  const photoPct=clean($('phototherapyPct').value);
  if(photo || photoPct){
    const photoParts=[photo || 'Fototerapia', photoPct ? `${photoPct}` : ''].filter(Boolean);
    sections.push(`Fototerapia: ${sentence(photoParts.join(' - '))}`);
  }

  [
    ['resp','Respiração/suporte'],
    ['urine','Diurese'],
    ['bowel','Evacuação']
  ].forEach(([id,label])=>{ const v=clean($(id).value); if(v) sections.push(`${label}: ${sentence(v)}`); });

  const devices=clean($('devices').value); if(devices) sections.push(`Acessos/dispositivos: ${sentence(devices)}`);
  const skin=clean($('skin').value); if(skin) sections.push(`Pele/curativos: ${sentence(skin)}`);
  const notes=clean($('notes').value); if(notes) sections.push(`Observações/intercorrências: ${sentence(notes)}`);
  sections.push('Mantidos cuidados de enfermagem conforme avaliação, prescrição vigente e protocolo institucional.');
  return sections.join('\n');
}

function buildPrescription(){
  const checked=[...document.querySelectorAll('#careChecks input:checked')].map(i=>i.value);
  const custom=$('customCare').value.split('\n').map(clean).filter(Boolean).map(sentence);
  const items=[...checked,...custom];
  if(!items.length) return 'Nenhum cuidado foi selecionado. Marque somente intervenções aplicáveis à avaliação realizada, à prescrição vigente e ao protocolo institucional.';
  return items.map((item,index)=>`${index+1}. ${item}`).join('\n');
}

function showResult(which='evolution'){
  resultSection.classList.remove('hidden');
  document.querySelectorAll('.result-tab').forEach(b=>b.classList.toggle('active',b.dataset.result===which));
  $('evolutionView').classList.toggle('active',which==='evolution');
  $('prescriptionView').classList.toggle('active',which==='prescription');
  setTimeout(()=>resultSection.scrollIntoView({behavior:'smooth',block:'start'}),50);
}

document.querySelectorAll('.action-btn').forEach(btn=>btn.addEventListener('click',()=>submitMode=btn.dataset.mode));
form.addEventListener('submit',e=>{
  e.preventDefault();
  $('evolution').value=buildEvolution();
  $('prescription').value=buildPrescription();
  showResult(submitMode==='prescription'?'prescription':'evolution');
});

document.querySelectorAll('.result-tab').forEach(btn=>btn.addEventListener('click',()=>showResult(btn.dataset.result)));

document.querySelectorAll('.copy-btn').forEach(btn=>btn.addEventListener('click',async()=>{
  const target=$(btn.dataset.target);
  try{ await navigator.clipboard.writeText(target.value); showToast('Texto copiado'); }
  catch{ target.select(); document.execCommand('copy'); showToast('Texto copiado'); }
}));

$('clearBtn').addEventListener('click',()=>{
  form.reset(); $('evolution').value=''; $('prescription').value=''; resultSection.classList.add('hidden'); updateVitalsSummary(); updateSuggestions(); updateCalculators(); refreshHistorySelect(); window.scrollTo({top:0,behavior:'smooth'}); showToast('Formulário limpo');
});

document.querySelectorAll('.nav-item[data-scroll]').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active')); btn.classList.add('active');
  if(btn.dataset.scroll==='top') window.scrollTo({top:0,behavior:'smooth'});
  else if(btn.dataset.scroll==='result'){
    if(resultSection.classList.contains('hidden')){ $('evolution').value=buildEvolution(); $('prescription').value=buildPrescription(); }
    showResult('evolution');
  } else {
    if(resultSection.classList.contains('hidden')){ $('evolution').value=buildEvolution(); $('prescription').value=buildPrescription(); }
    showResult('prescription');
  }
}));

window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); deferredPrompt=e; installBtn.classList.remove('hidden'); });
installBtn.addEventListener('click',async()=>{ if(!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; installBtn.classList.add('hidden'); });
window.addEventListener('appinstalled',()=>{ installBtn.classList.add('hidden'); showToast('Aplicativo instalado'); });

if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js')); }
applyTheme(localStorage.getItem(THEME_KEY) || 'dark');
updateDate(); updateVitalsSummary();
updateConnectionStatus(); updateSuggestions(); updateCalculators(); refreshHistorySelect();
