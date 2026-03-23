import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, deleteDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

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

let todosLosEmpleados = [];
let empleadoParaEliminar = null;

async function cargarEmpleados() {
    // Nota: Cambia "empleados" por el nombre exacto de tu colección en Firebase
    const snap = await getDocs(collection(db, "empleados"));
    todosLosEmpleados = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

window.buscarEmpleado = function() {
    const term = document.getElementById('inputBusqueda').value.toLowerCase();
    const lista = document.getElementById('resultados-busqueda');
    if (term.length < 1) { lista.style.display = 'none'; return; }

    const filtrados = todosLosEmpleados.filter(e => 
        e.nombre.toLowerCase().includes(term) || e.id.toLowerCase().includes(term)
    );

    lista.innerHTML = "";
    filtrados.forEach(e => {
        const div = document.createElement('div');
        div.className = 'item-resultado';
        div.innerHTML = `👤 <b>${e.nombre}</b> (ID: ${e.id})`;
        div.onclick = () => agregarALista(e);
        lista.appendChild(div);
    });
    lista.style.display = 'block';
}

function agregarALista(e) {
    const contenedor = document.getElementById('contenedor-lista-empleados');
    if (document.getElementById(`card-${e.id}`)) return;

    const card = document.createElement('div');
    card.className = 'tarjeta-baja-item';
    card.id = `card-${e.id}`;
    card.innerHTML = `
        <button class="btn-quitar-lista" onclick="quitarDeVista('${e.id}')">✕</button>
        <div class="info-item">
            <h3>${e.nombre}</h3>
            <p>Puesto: ${e.puesto || 'No especificado'} | ID: <b>${e.id}</b></p>
        </div>
        <button class="btn-borrar-trigger" onclick="prepararBaja(${JSON.stringify(e).replace(/"/g, '&quot;')})">
            DAR DE BAJA
        </button>
    `;
    contenedor.appendChild(card);
    document.getElementById('resultados-busqueda').style.display = 'none';
    document.getElementById('inputBusqueda').value = "";
}

window.quitarDeVista = (id) => {
    document.getElementById(`card-${id}`).remove();
}

window.prepararBaja = (e) => {
    empleadoParaEliminar = e;
    document.getElementById('texto-confirmacion').innerText = `¿Seguro que deseas dar de baja a "${e.nombre}" del sistema?`;
    document.getElementById('modal-confirmar').style.display = 'flex';
}

window.cerrarModal = () => {
    document.getElementById('modal-confirmar').style.display = 'none';
}

window.eliminarEmpleadoDefinitivo = async function() {
    if (!empleadoParaEliminar) return;

    try {
        // 1. Guardar registro histórico
        await addDoc(collection(db, "bajas_empleados_historial"), {
            empleadoId: empleadoParaEliminar.id,
            nombre: empleadoParaEliminar.nombre,
            puesto: empleadoParaEliminar.puesto || 'N/A',
            fechaBaja: serverTimestamp(),
            tipo: "Baja de personal"
        });

        // 2. Eliminar de la colección principal
        await deleteDoc(doc(db, "empleados", empleadoParaEliminar.id));

        document.getElementById(`card-${empleadoParaEliminar.id}`).remove();
        cerrarModal();
        alert("👤 Empleado dado de baja correctamente.");
        cargarEmpleados(); // Recarga la lista local
    } catch (error) {
        alert("❌ Error: " + error.message);
    }
}

cargarEmpleados();