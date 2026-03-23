import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { 
    getFirestore, collection, onSnapshot, query, orderBy, doc, updateDoc 
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDflDjy8z3y6TOkbn5OUAg8iwfvo6xptiw",
    authDomain: "inventario-6a5b7.firebaseapp.com",
    projectId: "inventario-6a5b7",
    storageBucket: "inventario-6a5b7.firebasestorage.app",
    messagingSenderId: "655864902994",
    appId: "1:655864902994:web:4497feaaa8da3a6171768b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let productosCargados = []; 
let ultimoEstadoStock = {}; 
let cambiosPendientes = { entradas: [], salidas: [] };
let timerNotificacion = null;

const nombreArchivoLogo = "logo.png"; 

// --- NOTIFICACIONES ---
async function inicializarNotificaciones() {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    if (permission === "granted" && "serviceWorker" in navigator) {
        navigator.serviceWorker.register('sw.js').catch(err => console.log("Error SW:", err));
    }
}

function enviarNotificacionNativa(titulo, cuerpo) {
    if (Notification.permission === "granted") {
        const logoPath = new URL(`assets/img/${nombreArchivoLogo}`, window.location.href).href;
        const opciones = { body: cuerpo, icon: logoPath, badge: logoPath, vibrate: [200, 100, 200] };
        navigator.serviceWorker.ready.then(reg => reg.showNotification(titulo, opciones));
    }
}

inicializarNotificaciones();

// --- TABLA DE INVENTARIO (VINCULADA AL ALTA) ---
function aplicarFiltros() {
    const cuerpo = document.getElementById('cuerpoTabla');
    const bus = document.getElementById('inputBusqueda').value.toLowerCase();
    const sec = document.getElementById('filtroSeccion').value;
    
    if (!cuerpo) return;
    cuerpo.innerHTML = "";

    productosCargados.forEach(p => {
        const idFormateado = String(p.id).padStart(4, '0');
        if ((p.nombre.toLowerCase().includes(bus) || idFormateado.includes(bus)) && (sec === "todos" || p.seccion === sec)) {
            
            const cant = Number(p.cantidad) || 0;
            const ideal = Number(p.stock_ideal) || 0;
            
            // VINCULACIÓN: Usamos 'unidad' porque así se guarda en tu script de Alta
            const unidadTexto = p.unidad || "Pz"; 
            
            const porc = ideal > 0 ? (cant / ideal) : 1;
            let clase = porc <= 0.33 ? 'fila-critica' : porc <= 0.66 ? 'fila-media' : 'fila-optima';

            cuerpo.innerHTML += `
                <tr class="${clase}">
                    <td>${idFormateado}</td>
                    <td style="font-weight:700;">${p.nombre.toUpperCase()}</td>
                    <td>${p.seccion || 'N/A'}</td>
                    <td style="text-align: center;">
                        <b>${cant}</b> <small style="color: #555; font-weight: bold;">${unidadTexto}</small> 
                        <div style="font-size: 0.75em; color: #777;">Meta: ${ideal}</div>
                    </td>
                    <td>${p.ultimaActualizacion ? new Date(p.ultimaActualizacion.seconds * 1000).toLocaleDateString() : '---'}</td>
                    <td style="text-align: center;">
                        <button class="btn-editar" onclick="editarStockMaximo('${p.id}', '${p.nombre}', ${ideal})">✏️</button>
                    </td>
                </tr>`;
        }
    });
}

// --- ESCUCHA EN TIEMPO REAL ---
const q = query(collection(db, "articulos"), orderBy("__name__", "asc"));

onSnapshot(q, (snapshot) => {
    let tempProductos = [];
    snapshot.docChanges().forEach((change) => {
        const p = change.doc.data();
        const id = change.doc.id;
        const stockNuevo = Number(p.cantidad);
        const unidadMedida = p.unidad || "Pz"; // Vinculado al alta

        if (change.type === "modified" && ultimoEstadoStock[id] !== undefined) {
            const stockAnterior = ultimoEstadoStock[id];
            if (stockNuevo !== stockAnterior) {
                const item = { 
                    nom: (p.nombre || "Prod").toUpperCase(), 
                    dif: Math.abs(stockNuevo - stockAnterior), 
                    total: stockNuevo,
                    med: unidadMedida 
                };
                if (stockNuevo > stockAnterior) cambiosPendientes.entradas.push(item);
                else cambiosPendientes.salidas.push(item);

                clearTimeout(timerNotificacion);
                timerNotificacion = setTimeout(procesarNotificacionesCampana, 1500);
            }
        }
        ultimoEstadoStock[id] = stockNuevo;
    });

    snapshot.forEach(docSnap => tempProductos.push({ id: docSnap.id, ...docSnap.data() }));
    productosCargados = tempProductos;
    actualizarResumenDashboard(tempProductos);
    aplicarFiltros(); 
});

function procesarNotificacionesCampana() {
    const tiempo = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true});
    if (cambiosPendientes.entradas.length > 0) {
        const msg = cambiosPendientes.entradas.map(c => `• ${c.nom}: +${c.dif} ${c.med} (Total: ${c.total})`).join('\n');
        enviarNotificacionNativa(`📥 360: ENTRADA (${tiempo})`, msg);
    }
    if (cambiosPendientes.salidas.length > 0) {
        const msg = cambiosPendientes.salidas.map(c => `• ${c.nom}: -${c.dif} ${c.med} (Quedan: ${c.total})`).join('\n');
        enviarNotificacionNativa(`📤 360: SALIDA (${tiempo})`, msg);
    }
    cambiosPendientes = { entradas: [], salidas: [] };
}

// --- WHATSAPP Y MODAL ---
window.enviarWhatsAppResurtido = function() {
    const lCriticos = document.getElementById('listaCriticos');
    const lMedios = document.getElementById('listaMedios');
    lCriticos.innerHTML = ""; lMedios.innerHTML = "";
    let hayItems = false;

    productosCargados.forEach(p => {
        const porc = p.stock_ideal > 0 ? (p.cantidad / p.stock_ideal) : 1;
        const unidad = p.unidad || "Pz"; 
        if (porc <= 0.66) {
            hayItems = true;
            const sugerencia = p.stock_ideal - p.cantidad;
            const html = `
                <div class="card-pedido">
                    <input type="checkbox" class="check-pedido" ${porc <= 0.33 ? "checked" : ""}>
                    <div style="flex:1; margin-left:10px;">
                        <strong>${p.nombre.toUpperCase()}</strong>
                        <div style="font-size:10px; color:#888;">Faltan: ${sugerencia} ${unidad}</div>
                    </div>
                    <input type="number" class="input-cant-pedido" data-nombre="${p.nombre}" data-medida="${unidad}" value="${sugerencia}" style="width:60px;">
                </div>`;
            if (porc <= 0.33) lCriticos.innerHTML += html; else lMedios.innerHTML += html;
        }
    });
    if (!hayItems) return alert("Todo en orden en 360.");
    document.getElementById('modalPedido').style.display = 'flex';
};

window.procesarEnvioWhatsApp = function() {
    let mensaje = `*SOLICITUD DE PEDIDO - TRES SESENTA (360)*\n\n`;
    let items = false;
    document.querySelectorAll('.card-pedido').forEach(card => {
        if (card.querySelector('.check-pedido').checked) {
            const input = card.querySelector('.input-cant-pedido');
            mensaje += `✅ *${input.dataset.nombre.toUpperCase()}* - ${input.value} ${input.dataset.medida}\n`;
            items = true;
        }
    });
    if (!items) return alert("Selecciona productos.");
    window.open(`https://wa.me/5218332349431?text=${encodeURIComponent(mensaje)}`, '_blank');
};

function actualizarResumenDashboard(productos) {
    let c = 0, b = 0, o = 0;
    productos.forEach(p => {
        const porc = p.stock_ideal > 0 ? (p.cantidad / p.stock_ideal) : 1;
        if (porc <= 0.33) c++; else if (porc <= 0.66) b++; else o++;
    });
    if(document.getElementById('resumenCritico')) document.getElementById('resumenCritico').innerText = c;
    if(document.getElementById('resumenMedio')) document.getElementById('resumenMedio').innerText = b;
    if(document.getElementById('resumenOptimo')) document.getElementById('resumenOptimo').innerText = o;
}

window.editarStockMaximo = async function(id, nom, ideal) {
    const nuevo = prompt(`Nueva meta para ${nom}:`, ideal);
    if (nuevo !== null && !isNaN(nuevo)) await updateDoc(doc(db, "articulos", id), { stock_ideal: Number(nuevo) });
};

window.cerrarModal = () => document.getElementById('modalPedido').style.display = 'none';
document.getElementById('inputBusqueda')?.addEventListener('input', aplicarFiltros);
document.getElementById('filtroSeccion')?.addEventListener('change', aplicarFiltros);
