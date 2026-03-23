import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc, increment, serverTimestamp, addDoc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

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

let productosParaSacar = {};
let todosLosProductos = [];
let datosValidacion = { entrega: "", autoriza: "" };

async function precargarProductos() {
    const querySnapshot = await getDocs(collection(db, "articulos"));
    todosLosProductos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

window.buscarEnFirebase = function() {
    const term = document.getElementById('inputBusqueda').value.toLowerCase();
    const lista = document.getElementById('resultados-busqueda');
    if (term.length < 1) { lista.style.display = 'none'; return; }

    const filtrados = todosLosProductos.filter(p => 
        p.id.toLowerCase().includes(term) || (p.nombre && p.nombre.toLowerCase().includes(term))
    );

    lista.innerHTML = "";
    if (filtrados.length > 0) {
        lista.style.display = 'block';
        filtrados.forEach(p => {
            const div = document.createElement('div');
            div.className = 'item-resultado';
            div.innerHTML = `<div><b>${p.id}</b> - ${p.nombre}</div> <small>Stock: ${p.cantidad}</small>`;
            div.onclick = () => seleccionarProducto(p);
            lista.appendChild(div);
        });
    } else { lista.style.display = 'none'; }
}

function seleccionarProducto(p) {
    if (productosParaSacar[p.id]) {
        productosParaSacar[p.id].cantidad += 1;
    } else {
        productosParaSacar[p.id] = { nombre: p.nombre, stockActual: p.cantidad, cantidad: 1 };
    }
    document.getElementById('inputBusqueda').value = "";
    document.getElementById('resultados-busqueda').style.display = 'none';
    actualizarTabla();
}

function actualizarTabla() {
    const cuerpo = document.getElementById('lista-salida-cuerpo');
    cuerpo.innerHTML = "";
    Object.keys(productosParaSacar).forEach(id => {
        const p = productosParaSacar[id];
        cuerpo.innerHTML += `
            <tr>
                <td><b>${id}</b></td>
                <td>${p.nombre}</td>
                <td style="color: ${p.stockActual < 5 ? 'red' : 'green'}; font-weight: bold;">${p.stockActual}</td>
                <td style="text-align:center;">
                    <input type="number" class="input-cantidad-lista" value="${p.cantidad}" onchange="window.cambiarCantidad('${id}', this.value)">
                </td>
                <td><button onclick="window.quitarDeLista('${id}')" style="color:red; border:none; background:none; cursor:pointer;">&times;</button></td>
            </tr>`;
    });
}

window.procesarSalidaManual = function() {
    const ids = Object.keys(productosParaSacar);
    if (ids.length === 0) return alert("Lista vacía.");

    // VALIDACIÓN DE STOCK
    for (const id of ids) {
        const p = productosParaSacar[id];
        if (p.cantidad > p.stockActual) {
            alert(`❌ ERROR: No hay suficiente stock de "${p.nombre}". \nSolicitado: ${p.cantidad} \nExistente: ${p.stockActual}`);
            return;
        }
    }

    document.getElementById('modal-entrega').style.display = 'flex';
    document.getElementById('inputEmpleadoEntrega').focus();
};

window.validarEmpleado = async function(tipo) {
    const idInput = tipo === 'entrega' ? 'inputEmpleadoEntrega' : 'inputEmpleadoAutoriza';
    const codigo = document.getElementById(idInput).value.trim();
    try {
        const docSnap = await getDoc(doc(db, "empleados", codigo));
        if (docSnap.exists()) {
            datosValidacion[tipo] = docSnap.data().nombre;
            if (tipo === 'entrega') {
                document.getElementById('modal-entrega').style.display = 'none';
                document.getElementById('modal-autoriza').style.display = 'flex';
                document.getElementById('inputEmpleadoAutoriza').focus();
            } else {
                finalizarTodo();
            }
        } else { alert("❌ Empleado no encontrado."); }
    } catch (e) { alert("Error de conexión."); }
};

async function finalizarTodo() {
    try {
        console.log("Iniciando proceso de guardado..."); // <--- Agrega esto
        for (const id of Object.keys(productosParaSacar)) {
            const p = productosParaSacar[id];
            
            console.log(`Actualizando stock de: ${id}`);
            const docRef = doc(db, "articulos", id);
            await updateDoc(docRef, {
                cantidad: increment(-p.cantidad), 
                ultimaActualizacion: serverTimestamp()
            });

            console.log(`Intentando crear registro en historial para: ${id}`);
            // IMPORTANTE: Asegúrate de que los nombres coincidan con los del objeto datosValidacion
            await addDoc(collection(db, "salidas_historial"), {
                productoId: id,
                nombre: p.nombre,
                cantidadRetirada: p.cantidad,
                quienRetira: datosValidacion.entrega, 
                quienAutoriza: datosValidacion.autoriza,
                fecha: serverTimestamp()
            });
        }
        alert("✅ Salida registrada con éxito.");
        location.reload();
    } catch (e) { 
        console.error("ERROR DETECTADO:", e); // <--- Esto te dirá el fallo en la consola (F12)
        alert("❌ FALLO AL GUARDAR: " + e.message); 
    }
}

window.cambiarCantidad = (id, v) => { productosParaSacar[id].cantidad = parseInt(v) || 1; };
window.quitarDeLista = (id) => { delete productosParaSacar[id]; actualizarTabla(); };
window.cerrarModalesValidacion = () => { 
    document.getElementById('modal-entrega').style.display = 'none'; 
    document.getElementById('modal-autoriza').style.display = 'none'; 
};

precargarProductos();