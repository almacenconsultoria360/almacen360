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
  appId: "1:655864902994:web:4497feaaa8da3a6171768b",
  measurementId: "G-YEPLHBRXFL"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- 1. LÓGICA DE SEMÁFORO ---
function calcularClaseStock(cantidad, stockIdeal) {
    if (!stockIdeal || stockIdeal <= 0) return '';
    const porcentaje = (cantidad / stockIdeal);
    if (porcentaje <= 0.33) return 'fila-critica';
    if (porcentaje <= 0.66) return 'fila-media';
    return 'fila-optima';
}

// --- 2. CARGA Y ACTUALIZACIÓN EN TIEMPO REAL ---
const cuerpoTabla = document.getElementById('cuerpoTabla');
const q = query(collection(db, "articulos"), orderBy("__name__", "asc"));

onSnapshot(q, (snapshot) => {
    cuerpoTabla.innerHTML = ""; 

    let totalCriticos = 0;
    let totalMedios = 0;
    let totalOptimos = 0;

    snapshot.forEach((docSnap) => {
        const p = docSnap.data();
        const cant = Number(p.cantidad) || 0;
        const ideal = Number(p.stock_ideal) || 0;
        const claseColor = calcularClaseStock(cant, ideal);
        
        if (claseColor === 'fila-critica') totalCriticos++;
        else if (claseColor === 'fila-media') totalMedios++;
        else if (claseColor === 'fila-optima') totalOptimos++;

        const fecha = p.ultimaActualizacion 
            ? p.ultimaActualizacion.toDate().toLocaleDateString() 
            : "---";

        cuerpoTabla.innerHTML += `
            <tr class="${claseColor}">
                <td class="id-celda" style="color: #999; font-size: 10px;">${docSnap.id}</td>
                <td>
                    <span class="nombre-producto" title="${p.nombre}">${p.nombre}</span>
                </td>
                <td style="color: #666;">${p.seccion}</td>
                <td style="text-align: center;">
                    <div style="font-weight: 800; font-size: 1.1em;">${cant}</div>
                    <div style="font-size: 9px; color: #555; font-weight: 700;">MAX: ${ideal}</div>
                </td>
                <td class="celda-fecha"><small>${fecha}</small></td>
                <td style="text-align: center;">
                    <button class="btn-editar" 
                            style="border:none; background:none; cursor:pointer; font-size: 1.2rem;"
                            onclick="editarProducto('${docSnap.id}', '${p.nombre}', ${ideal})">
                        ✏️
                    </button>
                </td>
            </tr>
        `;
    });

    document.getElementById('resumenCritico').innerText = totalCriticos;
    document.getElementById('resumenMedio').innerText = totalMedios;
    document.getElementById('resumenOptimo').innerText = totalOptimos;
    
    aplicarFiltros();
});

// --- 3. FUNCIÓN PARA EDITAR STOCK MÁXIMO ---
window.editarProducto = async function(id, nombreActual, idealActual) {
    const nuevoIdeal = prompt(`Definir nuevo STOCK MÁXIMO para: ${nombreActual}`, idealActual);
    
    if (nuevoIdeal !== null && !isNaN(nuevoIdeal) && parseInt(nuevoIdeal) > 0) {
        try {
            await updateDoc(doc(db, "articulos", id), {
                stock_ideal: parseInt(nuevoIdeal),
                ultimaActualizacion: serverTimestamp()
            });
        } catch (error) {
            alert("❌ Error al actualizar");
        }
    }
};

// --- 4. FILTROS ---
window.aplicarFiltros = function() {
    const busqueda = document.getElementById("inputBusqueda").value.toLowerCase().trim();
    const seccionFiltro = document.getElementById("filtroSeccion").value;
    const filas = cuerpoTabla.querySelectorAll('tr');

    filas.forEach(fila => {
        const idText = fila.cells[0].innerText.toLowerCase();
        const nombreText = fila.cells[1].innerText.toLowerCase();
        const ubicacionText = fila.cells[2].innerText.toLowerCase();

        const coincideBusqueda = idText.includes(busqueda) || 
                                 nombreText.includes(busqueda) || 
                                 ubicacionText.includes(busqueda);
                                 
        const coincideSeccion = (seccionFiltro === 'todos' || ubicacionText.includes(seccionFiltro.toLowerCase()));

        fila.style.display = (coincideBusqueda && coincideSeccion) ? "" : "none";
    });
}

// --- 5. FUNCIÓN WHATSAPP (SOLO CRÍTICOS) ---
window.enviarWhatsAppResurtido = function() {
    const numeroTelefono = "5218331188000"; // REEMPLAZAR CON NÚMERO REAL
    const filasCriticas = document.querySelectorAll("#cuerpoTabla tr.fila-critica");

    if (filasCriticas.length === 0) {
        alert("✅ El inventario no tiene productos en estado crítico.");
        return;
    }

    let mensaje = `*📦 TRES SESENTA - SOLICITUD DE RESURTIDO*\n`;
    mensaje += `_Estado: Stock Crítico detectado_\n\n`;

    filasCriticas.forEach(fila => {
        const nombre = fila.cells[1].innerText.trim();
        const ubicacion = fila.cells[2].innerText.trim();
        const stockInfo = fila.cells[3].innerText.replace(/\n/g, " ").trim();
        
        mensaje += `🔹 *${nombre}*\n`;
        mensaje += `   • Ubicación: ${ubicacion}\n`;
        mensaje += `   • ${stockInfo}\n\n`;
    });

    mensaje += `_Enviado desde el Sistema 360._`;
    const url = `https://wa.me/${numeroTelefono}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
}

// Eventos iniciales
document.addEventListener('DOMContentLoaded', () => {
    const inputBusqueda = document.getElementById('inputBusqueda');
    const filtroSeccion = document.getElementById('filtroSeccion');
    if(inputBusqueda) inputBusqueda.addEventListener('keyup', aplicarFiltros);
    if(filtroSeccion) filtroSeccion.addEventListener('change', aplicarFiltros);
});