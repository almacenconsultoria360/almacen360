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

let productosParaCargar = {};
let todosLosProductos = [];
let datosValidacion = { entrega: "", autoriza: "" };

// 1. CARGAR DATOS PARA EL BUSCADOR
async function precargarProductos() {
    const querySnapshot = await getDocs(collection(db, "articulos"));
    todosLosProductos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// 2. LÓGICA DEL BUSCADOR
window.buscarEnFirebase = function() {
    const term = document.getElementById('inputBusqueda').value.toLowerCase();
    const lista = document.getElementById('resultados-busqueda');
    
    if (term.length < 1) { lista.style.display = 'none'; return; }

    const filtrados = todosLosProductos.filter(p => 
        p.id.toLowerCase().includes(term) || 
        (p.nombre && p.nombre.toLowerCase().includes(term))
    );

    lista.innerHTML = "";
    if (filtrados.length > 0) {
        lista.style.display = 'block';
        filtrados.forEach(p => {
            const div = document.createElement('div');
            div.className = 'item-resultado';
            div.innerHTML = `<div><b>${p.id}</b> - ${p.nombre}</div> <small>${p.seccion}</small>`;
            div.onclick = () => seleccionarProducto(p);
            lista.appendChild(div);
        });
    } else { lista.style.display = 'none'; }
}

function seleccionarProducto(p) {
    if (productosParaCargar[p.id]) {
        productosParaCargar[p.id].cantidad += 1;
    } else {
        productosParaCargar[p.id] = { nombre: p.nombre, seccion: p.seccion, cantidad: 1 };
    }
    document.getElementById('inputBusqueda').value = "";
    document.getElementById('resultados-busqueda').style.display = 'none';
    actualizarTabla();
}

function actualizarTabla() {
    const cuerpo = document.getElementById('lista-carga-cuerpo');
    cuerpo.innerHTML = "";
    Object.keys(productosParaCargar).forEach(id => {
        const p = productosParaCargar[id];
        cuerpo.innerHTML += `
            <tr>
                <td><b>${id}</b></td>
                <td>${p.nombre}</td>
                <td>${p.seccion}</td>
                <td style="text-align:center;">
                    <input type="number" class="input-cantidad-lista" value="${p.cantidad}" onchange="window.cambiarCantidad('${id}', this.value)">
                </td>
                <td><button onclick="window.quitarDeLista('${id}')" style="color:red; border:none; background:none; cursor:pointer; font-size:1.5rem;">&times;</button></td>
            </tr>`;
    });
}

// 3. FLUJO DE VALIDACIÓN (MODALES)
window.procesarEntradaManual = function() {
    if (Object.keys(productosParaCargar).length === 0) return alert("Lista vacía.");
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
                finalizarTodo();
            }
        } else {
            alert("❌ Empleado no encontrado.");
            document.getElementById(idInput).value = "";
        }
    } catch (e) { alert("Error de conexión."); }
};

async function finalizarTodo() {
    try {
        const ids = Object.keys(productosParaCargar);
        for (const id of ids) {
            const p = productosParaCargar[id];
            
            // Intento de actualización de Stock
            const docRef = doc(db, "articulos", id);
            await updateDoc(docRef, {
                cantidad: increment(p.cantidad),
                ultimaActualizacion: serverTimestamp()
            });

            // Intento de guardado de Historial
            // Si la colección 'entradas_historial' no existe, se creará sola aquí
            await addDoc(collection(db, "entradas_historial"), {
                productoId: id,
                nombre: p.nombre,
                cantidadIngresada: p.cantidad,
                quienEntrega: datosValidacion.entrega,
                quienAutoriza: datosValidacion.autoriza,
                fecha: serverTimestamp()
            });
        }
        alert("✅ Inventario actualizado correctamente.");
        location.reload();
    } catch (e) { 
        console.error("Error completo:", e);
        // Esta alerta te dirá el error real de Firebase
        alert("❌ FALLO TÉCNICO: " + e.message); 
    }
}

window.cambiarCantidad = (id, v) => { productosParaCargar[id].cantidad = parseInt(v) || 1; };
window.quitarDeLista = (id) => { delete productosParaCargar[id]; actualizarTabla(); };
window.cerrarModalesValidacion = () => { 
    document.getElementById('modal-entrega').style.display = 'none'; 
    document.getElementById('modal-autoriza').style.display = 'none'; 
};

precargarProductos();