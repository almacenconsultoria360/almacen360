import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { 
    getFirestore, collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp 
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
let cambiosPendientes = { entradas: [], salidas: [], criticos: [] };
let timerNotificacion = null;

// --- CONFIGURACIÓN DE LOGO ---
// Asegúrate de que este nombre sea exacto al de tu carpeta en VS Code
const nombreArchivoLogo = "logo.png"; 

function solicitarPermisoNotificaciones() {
    if ("Notification" in window) {
        Notification.requestPermission();
    }
}

function enviarNotificacionNativa(titulo, cuerpo) {
    if ("Notification" in window && Notification.permission === "granted") {
        // Esto construye la ruta completa (http://127.0.0.1...) para que el sistema operativo la encuentre
        const logoPath = new URL(`assets/img/${nombreArchivoLogo}`, window.location.href).href;
        
        new Notification(titulo, {
            body: cuerpo,
            icon: logoPath,
            badge: logoPath
        });
    }
}

// Recordatorio cada 5 horas
setInterval(() => {
    let bajos = productosCargados.filter(p => {
        const porc = p.stock_ideal > 0 ? (p.cantidad / p.stock_ideal) : 1;
        return porc <= 0.66;
    });

    if (bajos.length > 0) {
        enviarNotificacionNativa(
            "🏢 TRES SESENTA (360) - REVISIÓN",
            `Hay ${bajos.length} productos con stock bajo/crítico actualmente.`
        );
    }
}, 18000000);

solicitarPermisoNotificaciones();

// --- FUNCIONALIDAD DE LA TABLA ---
function aplicarFiltros() {
    const cuerpo = document.getElementById('cuerpoTabla');
    const bus = document.getElementById('inputBusqueda').value.toLowerCase();
    const sec = document.getElementById('filtroSeccion').value;
    
    if (!cuerpo) return;
    cuerpo.innerHTML = "";

    productosCargados.forEach(p => {
        const coincideBus = p.nombre.toLowerCase().includes(bus) || p.id.toLowerCase().includes(bus);
        const coincideSec = (sec === "todos") || (p.seccion === sec);

        if (coincideBus && coincideSec) {
            const cant = Number(p.cantidad) || 0;
            const ideal = Number(p.stock_ideal) || 0;
            const porc = ideal > 0 ? (cant / ideal) : 1;
            const fecha = p.ultimaActualizacion ? new Date(p.ultimaActualizacion.seconds * 1000).toLocaleDateString() : '---';
            
            let clase = 'fila-optima';
            if (porc <= 0.33) clase = 'fila-critica';
            else if (porc <= 0.66) clase = 'fila-media';

            cuerpo.innerHTML += `
                <tr class="${clase}">
                    <td data-label="ID">${p.id}</td>
                    <td data-label="PRODUCTO" style="font-weight:700;">${p.nombre.toUpperCase()}</td>
                    <td data-label="UBICACIÓN">${p.seccion || 'N/A'}</td>
                    <td data-label="STOCK / MAX" style="text-align: center;"><b>${cant}</b> <small>/ ${ideal}</small></td>
                    <td data-label="ACTUALIZADO">${fecha}</td>
                    <td data-label="ACCIÓN" style="text-align: center;">
                        <button class="btn-editar" onclick="editarStockMaximo('${p.id}', '${p.nombre}', ${ideal})">✏️</button>
                    </td>
                </tr>`;
        }
    });
}

// --- ESCUCHA DE FIREBASE + NOTIFICACIONES ---
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
    const tiempo = `${ahora.toLocaleDateString()} ${ahora.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true})}`;
    
    if (cambiosPendientes.entradas.length > 0) {
        const msg = cambiosPendientes.entradas.map(c => `• ${c.nom}: +${c.dif} (Stock: ${c.total})`).join('\n');
        window.registrarMovimientoLocal('entrada', '360 - ENTRADAS', msg);
        enviarNotificacionNativa(`📥 360 INVENTARIO: ENTRADA`, `${tiempo}\n${msg}`);
    }
    if (cambiosPendientes.salidas.length > 0) {
        const msg = cambiosPendientes.salidas.map(c => `• ${c.nom}: -${c.dif} (Quedan: ${c.total})`).join('\n');
        window.registrarMovimientoLocal('salida', '360 - SALIDAS', msg);
        enviarNotificacionNativa(`📤 360 INVENTARIO: SALIDA`, `${tiempo}\n${msg}`);
    }
    cambiosPendientes = { entradas: [], salidas: [], criticos: [] };
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

// --- FUNCIONES DE VENTANA (WHATSAPP Y EDITAR) ---
window.enviarWhatsAppResurtido = function() {
    const lCriticos = document.getElementById('listaCriticos');
    const lMedios = document.getElementById('listaMedios');
    lCriticos.innerHTML = ""; 
    lMedios.innerHTML = "";
    let hayItems = false;

    productosCargados.forEach(p => {
        const cant = Number(p.cantidad) || 0;
        const ideal = Number(p.stock_ideal) || 0;
        const porc = ideal > 0 ? (cant / ideal) : 1;

        if (porc <= 0.66) {
            hayItems = true;
            const estaMarcado = (porc <= 0.33) ? "checked" : "";
            const sugerencia = ideal - cant; 

            const html = `
                <div class="card-pedido">
                    <input type="checkbox" class="check-pedido" ${estaMarcado} style="width:20px; height:20px; accent-color:#7c4dff;">
                    <div style="flex:1; margin-left:10px;">
                        <strong>${p.nombre.toUpperCase()}</strong>
                        <div style="font-size:10px; color:#888;">Faltan: ${ideal - cant} pz</div>
                    </div>
                    <input type="number" class="input-cant-pedido" 
                           data-nombre="${p.nombre}" 
                           value="${sugerencia}" 
                           min="1" 
                           style="width:50px; padding:5px; border-radius:5px; border:1px solid #ddd;">
                </div>`;

            if (porc <= 0.33) lCriticos.innerHTML += html; 
            else lMedios.innerHTML += html;
        }
    });

    if (!hayItems) return alert("El inventario de 360 está en niveles óptimos.");
    document.getElementById('modalPedido').style.display = 'flex';
};

window.procesarEnvioWhatsApp = function() {
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString('es-MX');
    const hora = ahora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    let mensaje = `*SOLICITUD DE PEDIDO - TRES SESENTA (360)*\n`;
    mensaje += `📅 ${fecha} | 🕒 ${hora}\n`;
    mensaje += `------------------------------------------\n\n`;

    let productosSeleccionados = false;
    document.querySelectorAll('.card-pedido').forEach(card => {
        const checkbox = card.querySelector('.check-pedido');
        const inputCant = card.querySelector('.input-cant-pedido');

        if (checkbox.checked) {
            const cantidad = parseInt(inputCant.value);
            if (cantidad > 0) {
                mensaje += `✅ *${inputCant.dataset.nombre.toUpperCase()}*\n      Cantidad: *${cantidad} pz*\n\n`;
                productosSeleccionados = true;
            }
        }
    });

    if (!productosSeleccionados) return alert("Selecciona al menos un producto con la cajita.");

    const numeroDestino = "5218331188000"; 
    window.open(`https://wa.me/${numeroDestino}?text=${encodeURIComponent(mensaje)}`, '_blank');
};

window.editarStockMaximo = async function(id, nom, ideal) {
    const nuevo = prompt(`Nueva meta para ${nom}:`, ideal);
    if (nuevo !== null && !isNaN(nuevo)) {
        await updateDoc(doc(db, "articulos", id), { stock_ideal: Number(nuevo) });
    }
};

window.cerrarModal = () => document.getElementById('modalPedido').style.display = 'none';

// --- EVENTOS ---
document.getElementById('inputBusqueda')?.addEventListener('input', aplicarFiltros);
document.getElementById('filtroSeccion')?.addEventListener('change', aplicarFiltros);