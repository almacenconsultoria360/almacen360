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

// --- CONFIGURACIÓN DE NOTIFICACIONES MULTIPLATAFORMA ---
const logoPath = "assets/img/logo360.png"; // Asegúrate que esta ruta sea correcta en tu carpeta

async function inicializarNotificaciones() {
    if (!("Notification" in window)) return;

    const permission = await Notification.requestPermission();
    
    // Registro del Service Worker para Celulares
    if (permission === "granted" && "serviceWorker" in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log("Service Worker Activo para 360"))
            .catch(err => console.log("Error en SW:", err));
    }
}

function enviarNotificacionNativa(titulo, cuerpo) {
    if (Notification.permission === "granted") {
        const fullLogoUrl = new URL(logoPath, window.location.href).href;
        const opciones = {
            body: cuerpo,
            icon: fullLogoUrl,
            badge: fullLogoUrl, // Icono pequeño para la barra de Android
            vibrate: [200, 100, 200], // Vibración para el celular
            tag: '360-inventario'
        };

        // Si el Service Worker está listo (Celular), enviamos por ahí
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(titulo, opciones);
        });
    }
}

// Recordatorio cada 5 horas para 360
setInterval(() => {
    let bajos = productosCargados.filter(p => {
        const porc = p.stock_ideal > 0 ? (p.cantidad / p.stock_ideal) : 1;
        return porc <= 0.66;
    });

    if (bajos.length > 0) {
        enviarNotificacionNativa(
            "🏢 TRES SESENTA (360) - STOCK BAJO",
            `Hay ${bajos.length} productos que necesitan resurtido pronto.`
        );
    }
}, 18000000);

inicializarNotificaciones();

// --- ESCUCHA DE FIREBASE + LÓGICA DE CAMBIOS ---
const q = query(collection(db, "articulos"), orderBy("__name__", "asc"));

onSnapshot(q, (snapshot) => {
    let tempProductos = [];
    
    snapshot.docChanges().forEach((change) => {
        const p = change.doc.data();
        const id = change.doc.id;
        const stockNuevo = Number(p.cantidad);

        if (change.type === "modified" && ultimoEstadoStock[id] !== undefined) {
            const stockAnterior = ultimoEstadoStock[id];
            if (stockNuevo !== stockAnterior) {
                const item = { nom: (p.nombre || "Prod").toUpperCase(), dif: Math.abs(stockNuevo - stockAnterior), total: stockNuevo };
                if (stockNuevo > stockAnterior) cambiosPendientes.entradas.push(item);
                else cambiosPendientes.salidas.push(item);

                clearTimeout(timerNotificacion);
                timerNotificacion = setTimeout(procesarNotificacionesCampana, 1500);
            }
        }
        ultimoEstadoStock[id] = stockNuevo;
    });

    snapshot.forEach(docSnap => {
        tempProductos.push({ id: docSnap.id, ...docSnap.data() });
    });

    productosCargados = tempProductos;
    actualizarResumenDashboard(tempProductos);
    aplicarFiltros(); 
});

function procesarNotificacionesCampana() {
    const ahora = new Date();
    const tiempo = ahora.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true});
    
    if (cambiosPendientes.entradas.length > 0) {
        const msg = cambiosPendientes.entradas.map(c => `• ${c.nom}: +${c.dif} (Total: ${c.total})`).join('\n');
        enviarNotificacionNativa(`📥 360: ENTRADA (${tiempo})`, msg);
    }
    if (cambiosPendientes.salidas.length > 0) {
        const msg = cambiosPendientes.salidas.map(c => `• ${c.nom}: -${c.dif} (Quedan: ${c.total})`).join('\n');
        enviarNotificacionNativa(`📤 360: SALIDA (${tiempo})`, msg);
    }
    cambiosPendientes = { entradas: [], salidas: [] };
}

// --- FUNCIONES RESTANTES (TABLA, WHATSAPP, MODAL) ---
function aplicarFiltros() {
    const cuerpo = document.getElementById('cuerpoTabla');
    const bus = document.getElementById('inputBusqueda').value.toLowerCase();
    const sec = document.getElementById('filtroSeccion').value;
    if (!cuerpo) return;
    cuerpo.innerHTML = "";

    productosCargados.forEach(p => {
        if ((p.nombre.toLowerCase().includes(bus) || p.id.toLowerCase().includes(bus)) && (sec === "todos" || p.seccion === sec)) {
            const porc = p.stock_ideal > 0 ? (p.cantidad / p.stock_ideal) : 1;
            let clase = porc <= 0.33 ? 'fila-critica' : porc <= 0.66 ? 'fila-media' : 'fila-optima';
            cuerpo.innerHTML += `
                <tr class="${clase}">
                    <td>${p.id}</td>
                    <td style="font-weight:700;">${p.nombre.toUpperCase()}</td>
                    <td>${p.seccion || 'N/A'}</td>
                    <td style="text-align: center;"><b>${p.cantidad}</b> <small>/ ${p.stock_ideal}</small></td>
                    <td>${p.ultimaActualizacion ? new Date(p.ultimaActualizacion.seconds * 1000).toLocaleDateString() : '---'}</td>
                    <td style="text-align: center;">
                        <button class="btn-editar" onclick="editarStockMaximo('${p.id}', '${p.nombre}', ${p.stock_ideal})">✏️</button>
                    </td>
                </tr>`;
        }
    });
}

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

window.enviarWhatsAppResurtido = function() {
    const lCriticos = document.getElementById('listaCriticos');
    const lMedios = document.getElementById('listaMedios');
    lCriticos.innerHTML = ""; lMedios.innerHTML = "";
    let hayItems = false;

    productosCargados.forEach(p => {
        const porc = p.stock_ideal > 0 ? (p.cantidad / p.stock_ideal) : 1;
        if (porc <= 0.66) {
            hayItems = true;
            const estaMarcado = (porc <= 0.33) ? "checked" : "";
            const html = `
                <div class="card-pedido">
                    <input type="checkbox" class="check-pedido" ${estaMarcado} style="width:20px; height:20px;">
                    <div style="flex:1; margin-left:10px;">
                        <strong>${p.nombre.toUpperCase()}</strong>
                        <div style="font-size:10px; color:#888;">Faltan: ${p.stock_ideal - p.cantidad} pz</div>
                    </div>
                    <input type="number" class="input-cant-pedido" data-nombre="${p.nombre}" value="${p.stock_ideal - p.cantidad}" min="1" style="width:50px;">
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
            mensaje += `✅ *${input.dataset.nombre.toUpperCase()}* - ${input.value} pz\n`;
            items = true;
        }
    });
    if (!items) return alert("Selecciona productos.");
    window.open(`https://wa.me/5218331188000?text=${encodeURIComponent(mensaje)}`, '_blank');
};

window.editarStockMaximo = async function(id, nom, ideal) {
    const nuevo = prompt(`Nueva meta para ${nom}:`, ideal);
    if (nuevo !== null && !isNaN(nuevo)) await updateDoc(doc(db, "articulos", id), { stock_ideal: Number(nuevo) });
};

window.cerrarModal = () => document.getElementById('modalPedido').style.display = 'none';
document.getElementById('inputBusqueda')?.addEventListener('input', aplicarFiltros);
document.getElementById('filtroSeccion')?.addEventListener('change', aplicarFiltros);
