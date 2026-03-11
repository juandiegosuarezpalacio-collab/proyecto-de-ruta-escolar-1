const APP = {
  students: [],
  barrios: [],
  queue: [],
  logs: [],
  route: 'Bachillerato - Parte 1',
  currentIndex: 0,
  sending: false,
  watchId: null,
  location: null,
  map: null,
  mapMarker: null,
  routeSentFlags: {},
  config: {
    modoEnvio: 'open_whatsapp',
    backendUrl: '',
    apiKey: ''
  }
};

const ROUTES = ['Bachillerato - Parte 1', 'Bachillerato - Parte 2', 'Primaria', 'Transición'];
const MESSAGE_TYPES = [
  { value: 'alistamiento', label: 'Ruta alistándose' },
  { value: 'barrio', label: 'Ingreso al barrio' },
  { value: 'cerca', label: 'Ruta cerca' },
  { value: 'retraso', label: 'Retraso' },
  { value: 'subio', label: 'Estudiante subió' },
  { value: 'llegada_colegio', label: 'Llegada al colegio' },
  { value: 'entrega', label: 'Entregado' },
  { value: 'personalizado', label: 'Personalizado' }
];

const $ = (id) => document.getElementById(id);

async function init() {
  loadConfig();
  await loadData();
  fillSelectors();
  restoreStudents();
  bindEvents();
  initMap();
  renderAll();
  log('Aplicación iniciada correctamente.');
}

async function loadData() {
  const studentsFallback = [
    { id: 'b1-1', nombre: 'Juan Pablo', acudiente: 'Mamá', telefono: '573225940033', barrio: 'El Turbai', ruta: 'Bachillerato - Parte 1', orden: 1, estado: 'pendiente' },
    { id: 'b1-2', nombre: 'Nicolás Bedoya', acudiente: 'Mamá', telefono: '573128840559', barrio: 'El Turbai', ruta: 'Bachillerato - Parte 1', orden: 2, estado: 'pendiente' },
    { id: 'b1-3', nombre: 'Dilan Gañán', acudiente: 'Abuela Teresa', telefono: '573206342481', barrio: 'El Turbai', ruta: 'Bachillerato - Parte 1', orden: 3, estado: 'pendiente' }
  ];
  const barriosFallback = ['Centro', 'El Turbai', 'Villa Carolina', 'La Isabela'];
  try {
    const [studentsRes, barriosRes] = await Promise.all([
      fetch('data/estudiantes.json'),
      fetch('data/barrios.json')
    ]);
    APP.students = studentsRes.ok ? await studentsRes.json() : studentsFallback;
    APP.barrios = barriosRes.ok ? await barriosRes.json() : barriosFallback;
  } catch (e) {
    APP.students = studentsFallback;
    APP.barrios = barriosFallback;
    log('Se cargaron datos de respaldo porque el navegador bloqueó los archivos locales.');
  }
}

function restoreStudents() {
  const saved = localStorage.getItem('ruta_escolar_students');
  if (saved) {
    try { APP.students = JSON.parse(saved); }
    catch (_) {}
  }
}

function persistStudents() {
  localStorage.setItem('ruta_escolar_students', JSON.stringify(APP.students));
}

function loadConfig() {
  const saved = localStorage.getItem('ruta_escolar_config');
  if (saved) {
    try { APP.config = { ...APP.config, ...JSON.parse(saved) }; }
    catch (_) {}
  }
}

function persistConfig() {
  localStorage.setItem('ruta_escolar_config', JSON.stringify(APP.config));
}

function fillSelectors() {
  const routeOptions = ROUTES.map(r => `<option value="${r}">${r}</option>`).join('');
  $('rutaSelect').innerHTML = routeOptions;
  $('studentRuta').innerHTML = routeOptions;
  $('rutaSelect').value = APP.route;

  $('studentBarrio').innerHTML = APP.barrios.map(b => `<option value="${b}">${b}</option>`).join('');
  $('tipoMensaje').innerHTML = MESSAGE_TYPES.map(t => `<option value="${t.value}">${t.label}</option>`).join('');
  $('modoEnvio').value = APP.config.modoEnvio;
  $('backendUrl').value = APP.config.backendUrl;
  $('apiKey').value = APP.config.apiKey;
}

function bindEvents() {
  document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
  $('btnConfigTop').addEventListener('click', () => switchTab('config'));
  $('rutaSelect').addEventListener('change', (e) => {
    APP.route = e.target.value;
    APP.currentIndex = 0;
    renderAll();
  });
  $('btnIniciarRuta').addEventListener('click', startRoute);
  $('btnSubio').addEventListener('click', markStudentPickedUp);
  $('btnAvisarActual').addEventListener('click', () => sendMessageToCurrent('cerca'));
  $('btnAvisarBarrio').addEventListener('click', sendBarrioMessage);
  $('btnRefrescarOrden').addEventListener('click', renderOrder);
  $('btnGPS').addEventListener('click', toggleGPS);
  $('btnGenerarMensaje').addEventListener('click', generatePreview);
  $('btnEnviarMensaje').addEventListener('click', sendPreviewMessage);
  $('btnMasivoRuta').addEventListener('click', queueMassiveRouteMessage);
  $('btnLlegadaColegio').addEventListener('click', queueArrivalMessage);
  $('btnProcesarCola').addEventListener('click', processQueue);
  $('btnPreguntarIA').addEventListener('click', askIA);
  $('btnUsarRespuestaIA').addEventListener('click', useIAResponse);
  $('studentForm').addEventListener('submit', saveStudent);
  $('btnLimpiarForm').addEventListener('click', clearForm);
  $('btnGuardarConfig').addEventListener('click', saveConfig);
  $('btnProbarBackend').addEventListener('click', testBackend);
  $('modoEnvio').addEventListener('change', () => { APP.config.modoEnvio = $('modoEnvio').value; updateConfigView(); persistConfig(); });
}

function currentRouteStudents() {
  return APP.students
    .filter(s => s.ruta === APP.route)
    .sort((a, b) => Number(a.orden) - Number(b.orden));
}

function currentStudent() {
  const list = currentRouteStudents();
  return list[APP.currentIndex] || null;
}

function renderAll() {
  $('rutaActivaTexto').textContent = APP.route;
  updateConfigView();
  renderOrder();
  renderStudents();
  renderQueue();
  renderStats();
  renderDestinations();
  renderLogs();
}

function renderStats() {
  const current = currentStudent();
  $('actualNombre').textContent = current ? current.nombre : 'Ruta terminada';
  $('actualBarrio').textContent = current ? current.barrio : '---';
  $('pendientesCount').textContent = currentRouteStudents().slice(APP.currentIndex).length;
  $('canalActivo').textContent = APP.config.modoEnvio === 'business' ? 'Business' : APP.config.modoEnvio === 'demo' ? 'Demo' : 'WhatsApp';
}

function renderOrder() {
  const list = currentRouteStudents();
  const current = currentStudent();
  $('ordenLista').innerHTML = list.map((s, idx) => `
    <article class="list-item ${current && current.id === s.id ? 'current' : ''}">
      <div class="list-top">
        <div>
          <strong>${s.orden}. ${s.nombre}</strong>
          <div class="meta">Acudiente: ${s.acudiente}<br>Barrio: ${s.barrio}<br>Tel: ${s.telefono}</div>
        </div>
        <span class="badge ${idx >= APP.currentIndex ? 'pending' : ''}">${idx >= APP.currentIndex ? 'Pendiente' : 'Recogido'}</span>
      </div>
      <div class="action-row">
        <button class="small-btn" onclick="editStudent('${s.id}')">Editar</button>
        <button class="small-btn" onclick="quickSend('${s.id}', 'cerca')">Avisar</button>
        <button class="small-btn danger" onclick="deleteStudent('${s.id}')">Borrar</button>
      </div>
    </article>
  `).join('') || '<div class="list-item">No hay estudiantes para esta ruta.</div>';
}

function renderStudents() {
  $('estudiantesLista').innerHTML = APP.students
    .sort((a,b) => a.ruta.localeCompare(b.ruta) || Number(a.orden)-Number(b.orden))
    .map(s => `
      <article class="list-item">
        <div class="list-top">
          <div>
            <strong>${s.nombre}</strong>
            <div class="meta">${s.ruta} · orden ${s.orden}<br>${s.barrio} · ${s.telefono}</div>
          </div>
          <span class="badge queue">${s.acudiente}</span>
        </div>
      </article>
    `).join('');
}

function renderDestinations() {
  const options = ['actual', 'toda_ruta', 'barrio_actual'].map(opt => {
    const label = opt === 'actual' ? 'Estudiante actual' : opt === 'toda_ruta' ? 'Toda la ruta' : 'Barrio actual';
    return `<option value="${opt}">${label}</option>`;
  }).join('');
  $('destinoMensaje').innerHTML = options;
}

function renderQueue() {
  $('colaMensajes').innerHTML = APP.queue.map((q, idx) => `
    <article class="list-item">
      <div class="list-top">
        <div>
          <strong>${q.title}</strong>
          <div class="meta">${q.phone || 'grupo'}<br>${q.body.slice(0, 100)}${q.body.length > 100 ? '...' : ''}</div>
        </div>
        <span class="badge queue">${q.status}</span>
      </div>
      <div class="action-row">
        <button class="small-btn" onclick="sendQueueItem(${idx})">Enviar</button>
        <button class="small-btn danger" onclick="removeQueueItem(${idx})">Quitar</button>
      </div>
    </article>
  `).join('') || '<div class="list-item">No hay mensajes en la bandeja.</div>';
}

function renderLogs() {
  $('bitacora').textContent = APP.logs.slice(-15).reverse().join('\n') || 'Sin eventos todavía.';
}

function updateConfigView() {
  $('backendEstado').textContent = APP.config.modoEnvio === 'business' ? 'Listo para backend' : APP.config.modoEnvio === 'demo' ? 'Solo simulación' : 'Abrir app';
}

function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tabName}`));
}

function log(message) {
  APP.logs.push(`[${new Date().toLocaleTimeString('es-CO')}] ${message}`);
  renderLogs();
}

function startRoute() {
  APP.currentIndex = 0;
  log(`Ruta iniciada: ${APP.route}.`);
  renderAll();
}

function markStudentPickedUp() {
  const student = currentStudent();
  if (!student) return log('No hay más estudiantes por recoger.');
  queueIndividualMessage(student, 'subio');
  APP.currentIndex += 1;
  log(`Se marcó como recogido: ${student.nombre}.`);
  renderAll();
}

function buildContext(student, custom = '') {
  return {
    estudiante: student?.nombre || 'el estudiante',
    acudiente: student?.acudiente || 'acudiente',
    barrio: student?.barrio || 'su barrio',
    ruta: student?.ruta || APP.route,
    minutos: 10,
    custom,
    extraLista: ''
  };
}

function generatePreview() {
  const type = $('tipoMensaje').value;
  const tone = $('tonoMensaje').value;
  const destination = $('destinoMensaje').value;
  const current = currentStudent();
  if (destination === 'toda_ruta') {
    $('mensajePreview').value = RUTA_IA.buildMassiveRouteMessage(APP.route, currentRouteStudents());
    return;
  }
  if (destination === 'barrio_actual') {
    const barrio = current?.barrio || 'el barrio actual';
    $('mensajePreview').value = `Hola familias. La ruta ya ingresó al barrio ${barrio}. Por favor alistar a los estudiantes.`;
    return;
  }
  $('mensajePreview').value = RUTA_IA.generate(type, tone, buildContext(current));
}

function queueIndividualMessage(student, type, overrideBody = '') {
  const tone = $('tonoMensaje').value || 'cercano';
  const body = overrideBody || RUTA_IA.generate(type, tone, buildContext(student));
  APP.queue.push({ title: `${type} - ${student.nombre}`, phone: student.telefono, body, status: 'pendiente' });
  renderQueue();
  log(`Mensaje agregado a bandeja para ${student.nombre}.`);
}

function sendMessageToCurrent(type) {
  const student = currentStudent();
  if (!student) return log('No hay estudiante actual para avisar.');
  queueIndividualMessage(student, type);
  switchTab('mensajes');
}

function sendBarrioMessage() {
  const student = currentStudent();
  if (!student) return log('No hay estudiante actual para identificar el barrio.');
  const list = currentRouteStudents().filter(s => s.barrio === student.barrio);
  const body = `Hola familias. La ruta ya ingresó al barrio ${student.barrio}. Por favor alistar a los estudiantes de este sector.`;
  list.forEach(s => APP.queue.push({ title: `Barrio ${student.barrio} - ${s.nombre}`, phone: s.telefono, body, status: 'pendiente' }));
  renderQueue();
  switchTab('mensajes');
  log(`Se agregaron ${list.length} avisos para el barrio ${student.barrio}.`);
}

function queueMassiveRouteMessage() {
  const list = currentRouteStudents();
  const body = RUTA_IA.buildMassiveRouteMessage(APP.route, list);
  list.forEach(s => APP.queue.push({ title: `Alistamiento - ${s.nombre}`, phone: s.telefono, body, status: 'pendiente' }));
  renderQueue();
  switchTab('mensajes');
  log(`Se cargó el mensaje masivo de alistamiento para ${APP.route}.`);
}

function queueArrivalMessage() {
  const list = currentRouteStudents();
  list.forEach(s => {
    const body = RUTA_IA.generate('llegada_colegio', $('tonoMensaje').value || 'cercano', buildContext(s));
    APP.queue.push({ title: `Llegada - ${s.nombre}`, phone: s.telefono, body, status: 'pendiente' });
  });
  renderQueue();
  switchTab('mensajes');
  log(`Se agregaron mensajes de llegada al colegio para ${APP.route}.`);
}

async function sendPreviewMessage() {
  const body = $('mensajePreview').value.trim();
  if (!body) return log('Primero genera o escribe un mensaje.');
  const destination = $('destinoMensaje').value;
  if (destination === 'toda_ruta') {
    currentRouteStudents().forEach(s => APP.queue.push({ title: `Manual ruta - ${s.nombre}`, phone: s.telefono, body, status: 'pendiente' }));
  } else if (destination === 'barrio_actual') {
    const current = currentStudent();
    if (!current) return log('No hay barrio actual activo.');
    currentRouteStudents().filter(s => s.barrio === current.barrio).forEach(s => APP.queue.push({ title: `Manual barrio - ${s.nombre}`, phone: s.telefono, body, status: 'pendiente' }));
  } else {
    const current = currentStudent();
    if (!current) return log('No hay estudiante actual.');
    APP.queue.push({ title: `Manual - ${current.nombre}`, phone: current.telefono, body, status: 'pendiente' });
  }
  renderQueue();
  await processQueue();
}

async function processQueue() {
  if (APP.sending) return;
  APP.sending = true;
  for (let i = 0; i < APP.queue.length; i += 1) {
    if (APP.queue[i].status === 'enviado') continue;
    await sendQueueItem(i);
  }
  APP.sending = false;
}

async function sendQueueItem(index) {
  const item = APP.queue[index];
  if (!item) return;
  item.status = 'enviando';
  renderQueue();
  try {
    await deliverMessage(item.phone, item.body);
    item.status = 'enviado';
    log(`Mensaje enviado a ${item.phone}.`);
  } catch (error) {
    item.status = 'error';
    log(`Error enviando a ${item.phone}: ${error.message}`);
  }
  renderQueue();
}

function removeQueueItem(index) {
  APP.queue.splice(index, 1);
  renderQueue();
}

async function deliverMessage(phone, body) {
  const phoneDigits = String(phone).replace(/\D/g, '');
  if (APP.config.modoEnvio === 'demo') {
    await new Promise(r => setTimeout(r, 250));
    return { ok: true };
  }
  if (APP.config.modoEnvio === 'open_whatsapp') {
    const encoded = encodeURIComponent(body);
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const url = isMobile ? `whatsapp://send?phone=${phoneDigits}&text=${encoded}` : `https://web.whatsapp.com/send?phone=${phoneDigits}&text=${encoded}`;
    const fallback = `https://wa.me/${phoneDigits}?text=${encoded}`;
    const opened = window.open(url, '_blank');
    if (!opened) window.open(fallback, '_blank');
    return { ok: true };
  }
  if (APP.config.modoEnvio === 'business') {
    const base = (APP.config.backendUrl || '').replace(/\/$/, '');
    if (!base) throw new Error('Falta URL del backend.');
    const res = await fetch(`${base}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': APP.config.apiKey || ''
      },
      body: JSON.stringify({ telefono: phoneDigits, mensaje: body })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) throw new Error(data.error || 'El backend no respondió bien.');
    return data;
  }
}

function askIA() {
  const answer = RUTA_IA.ask($('preguntaIA').value, { pending: currentRouteStudents().slice(APP.currentIndex).length, current: currentStudent()?.nombre });
  $('respuestaIA').textContent = answer;
}

function useIAResponse() {
  $('mensajePreview').value = $('respuestaIA').textContent.trim();
  switchTab('mensajes');
}

function saveStudent(event) {
  event.preventDefault();
  const payload = {
    id: $('studentId').value || `id-${Date.now()}`,
    nombre: $('studentNombre').value.trim(),
    acudiente: $('studentAcudiente').value.trim(),
    telefono: $('studentTelefono').value.trim(),
    ruta: $('studentRuta').value,
    barrio: $('studentBarrio').value,
    orden: Number($('studentOrden').value),
    lat: $('studentLat').value.trim() || null,
    lng: $('studentLng').value.trim() || null,
    estado: 'pendiente'
  };
  const idx = APP.students.findIndex(s => s.id === payload.id);
  if (idx >= 0) APP.students[idx] = payload; else APP.students.push(payload);
  persistStudents();
  clearForm();
  renderAll();
  log(`Se guardó el estudiante ${payload.nombre}.`);
}

function editStudent(id) {
  const s = APP.students.find(st => st.id === id);
  if (!s) return;
  $('studentId').value = s.id;
  $('studentNombre').value = s.nombre;
  $('studentAcudiente').value = s.acudiente;
  $('studentTelefono').value = s.telefono;
  $('studentRuta').value = s.ruta;
  $('studentBarrio').value = s.barrio;
  $('studentOrden').value = s.orden;
  $('studentLat').value = s.lat || '';
  $('studentLng').value = s.lng || '';
  switchTab('estudiantes');
}
window.editStudent = editStudent;

function deleteStudent(id) {
  APP.students = APP.students.filter(s => s.id !== id);
  persistStudents();
  renderAll();
  log('Se eliminó un estudiante.');
}
window.deleteStudent = deleteStudent;

function quickSend(id, type) {
  const s = APP.students.find(st => st.id === id);
  if (!s) return;
  queueIndividualMessage(s, type);
  switchTab('mensajes');
}
window.quickSend = quickSend;

function clearForm() {
  $('studentForm').reset();
  $('studentId').value = '';
}

function saveConfig() {
  APP.config = {
    modoEnvio: $('modoEnvio').value,
    backendUrl: $('backendUrl').value.trim(),
    apiKey: $('apiKey').value.trim()
  };
  persistConfig();
  updateConfigView();
  renderStats();
  log('Se guardó la configuración del canal de mensajes.');
}

async function testBackend() {
  if (APP.config.modoEnvio !== 'business') return log('La prueba de backend solo aplica en modo WhatsApp Business.');
  const base = (APP.config.backendUrl || '').replace(/\/$/, '');
  if (!base) return log('Primero escribe la URL del backend.');
  try {
    const res = await fetch(`${base}/health`, { headers: { 'x-api-key': APP.config.apiKey || '' } });
    const data = await res.json();
    $('backendEstado').textContent = data.ok ? 'Conectado' : 'Sin conexión';
    log(data.ok ? 'Backend conectado correctamente.' : 'El backend respondió pero con error.');
  } catch (e) {
    $('backendEstado').textContent = 'Sin conexión';
    log(`No fue posible conectar con el backend: ${e.message}`);
  }
}

function initMap() {
  APP.map = L.map('map').setView([4.566, -75.751], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(APP.map);
  APP.mapMarker = L.marker([4.566, -75.751]).addTo(APP.map).bindPopup('Ruta escolar');
}

function toggleGPS() {
  if (APP.watchId) {
    navigator.geolocation.clearWatch(APP.watchId);
    APP.watchId = null;
    $('gpsEstado').textContent = 'GPS apagado';
    $('gpsDetalle').textContent = 'Sin seguimiento';
    log('GPS desactivado.');
    return;
  }
  if (!navigator.geolocation) return log('Este celular no permite geolocalización.');
  APP.watchId = navigator.geolocation.watchPosition(onPosition, (err) => log(`Error GPS: ${err.message}`), { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
  $('gpsEstado').textContent = 'GPS encendido';
  log('GPS activado.');
}

function onPosition(pos) {
  APP.location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
  $('gpsDetalle').textContent = `${APP.location.lat.toFixed(5)}, ${APP.location.lng.toFixed(5)}`;
  APP.map.setView([APP.location.lat, APP.location.lng], 16);
  APP.mapMarker.setLatLng([APP.location.lat, APP.location.lng]).bindPopup('Ubicación actual de la ruta').openPopup();
  checkAutoNotifications();
}

function checkAutoNotifications() {
  const student = currentStudent();
  if (!student || !student.lat || !student.lng || !APP.location) return;
  const distance = haversine(APP.location.lat, APP.location.lng, Number(student.lat), Number(student.lng));
  if (distance <= 250 && !APP.routeSentFlags[`near-${student.id}`]) {
    APP.routeSentFlags[`near-${student.id}`] = true;
    queueIndividualMessage(student, 'cerca');
    log(`Autoaviso: la ruta está cerca de ${student.nombre}.`);
  }
  if (!APP.routeSentFlags[`barrio-${student.barrio}`] && distance <= 500) {
    APP.routeSentFlags[`barrio-${student.barrio}`] = true;
    sendBarrioMessage();
  }
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

document.addEventListener('DOMContentLoaded', init);
window.sendQueueItem = sendQueueItem;
window.removeQueueItem = removeQueueItem;
