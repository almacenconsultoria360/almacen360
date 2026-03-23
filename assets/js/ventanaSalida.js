import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { 
    getFirestore, doc, getDoc, updateDoc, increment, serverTimestamp, collection, addDoc 
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

let productosEnCola = {}; 
let barcode = '';
let datosValidacion = { entrega: "", autoriza: "" }; 

// --- DETECTOR DE ESCÁNER ---
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'Enter') {
        if (barcode !== '') {
            agregarALista(barcode.trim());
            barcode = '';
            e.preventDefault(); 
        }
    } else if (e.key.length === 1) {
        barcode += e.key;
    }
});

async function agregarALista(id) {
    if (productosEnCola[id]) {
        productosEnCola[id].cantidadQuitar += 1;
        actualizarInterfaz();
        return;
    }
    const docRef = doc(db, "articulos", id);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const p = docSnap.data();
            productosEnCola[id] = {
                nombre: p.nombre,
                seccion: p.seccion || "General",
                stockActual: p.cantidad,
                cantidadQuitar: 1
            };
            actualizarInterfaz();
        } else {
            alert("❌ El código [" + id + "] no existe.");
        }
    } catch (error) { console.error(error); }
}

function actualizarInterfaz() {
    const modal = document.getElementById('modal-lista-carga');
    const cuerpo = document.getElementById('lista-escaneo-cuerpo');
    const ids = Object.keys(productosEnCola);
    modal.style.display = ids.length > 0 ? 'flex' : 'none';
    cuerpo.innerHTML = "";
    ids.forEach(id => {
        const p = productosEnCola[id];
        cuerpo.innerHTML += `
            <tr>
                <td style="font-weight:bold;">${id}</td>
                <td>${p.nombre}</td>
                <td>${p.seccion}</td>
                <td style="text-align: center;">
                    <input type="number" class="input-cantidad-lista" value="${p.cantidadQuitar}" 
                    onchange="window.cambiarCantidadManual('${id}', this.value)">
                </td>
                <td>
                    <button onclick="window.eliminarDeLista('${id}')" style="color:red; border:none; background:none; cursor:pointer; font-size:1.5rem;">&times;</button>
                </td>
            </tr>`;
    });
}

// --- FLUJO DE VALIDACIÓN ---
window.procesarSalidaCompleta = function() {
    // Validar stock antes de pedir firmas
    const ids = Object.keys(productosEnCola);
    for (const id of ids) {
        const p = productosEnCola[id];
        if (p.cantidadQuitar > p.stockActual) {
            return alert(`❌ Stock Insuficiente para: ${p.nombre}\nDisponible: ${p.stockActual}`);
        }
    }
    document.getElementById('modal-lista-carga').style.display = 'none';
    document.getElementById('modal-entrega').style.display = 'flex';
    document.getElementById('inputEmpleadoEntrega').focus();
};

window.validarEmpleado = async function(tipo) {
    const idInput = tipo === 'entrega' ? 'inputEmpleadoEntrega' : 'inputEmpleadoAutoriza';
    const codigo = document.getElementById(idInput).value.trim();

    try {
        const docRef = doc(db, "empleados", codigo);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            datosValidacion[tipo] = docSnap.data().nombre;
            if (tipo === 'entrega') {
                document.getElementById('modal-entrega').style.display = 'none';
                document.getElementById('modal-autoriza').style.display = 'flex';
                document.getElementById('inputEmpleadoAutoriza').focus();
            } else {
                document.getElementById('modal-autoriza').style.display = 'none';
                ejecutarGuardadoFinal();
            }
        } else {
            alert("❌ Empleado no encontrado.");
            document.getElementById(idInput).value = "";
        }
    } catch (e) { alert("Error de permisos."); }
};

async function ejecutarGuardadoFinal() {
    const ids = Object.keys(productosEnCola);
    try {
        for (const id of ids) {
            const p = productosEnCola[id];
            await updateDoc(doc(db, "articulos", id), {
                cantidad: increment(-p.cantidadQuitar),
                ultimaActualizacion: serverTimestamp()
            });

            await addDoc(collection(db, "salidas_historial"), {
                productoId: id,
                nombre: p.nombre,
                cantidadRetirada: p.cantidadQuitar,
                quienRetira: datosValidacion.entrega,
                quienAutoriza: datosValidacion.autoriza,
                fecha: serverTimestamp(),
                metodo: "ESCANER"
            });
        }
        alert("✅ Salida Registrada con Éxito.");
        location.reload();
    } catch (e) { alert("Error al guardar: " + e.message); }
}

window.eliminarDeLista = (id) => { delete productosEnCola[id]; actualizarInterfaz(); };
window.cambiarCantidadManual = (id, v) => { if(productosEnCola[id]) productosEnCola[id].cantidadQuitar = parseInt(v) || 1; };
window.cerrarModalLista = () => { location.reload(); };