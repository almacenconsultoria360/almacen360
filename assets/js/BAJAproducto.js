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

let todosLosProductos = [];
let productoParaEliminar = null; // Guardamos el objeto completo aquí

async function cargarDB() {
    const snap = await getDocs(collection(db, "articulos"));
    todosLosProductos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

window.buscarEnFirebase = function() {
    const term = document.getElementById('inputBusqueda').value.toLowerCase();
    const lista = document.getElementById('resultados-busqueda');
    if (term.length < 1) { lista.style.display = 'none'; return; }

    const filtrados = todosLosProductos.filter(p => 
        p.id.toLowerCase().includes(term) || (p.nombre && p.nombre.toLowerCase().includes(term))
    );

    lista.innerHTML = "";
    filtrados.forEach(p => {
        const div = document.createElement('div');
        div.className = 'item-resultado';
        div.innerHTML = `<b>${p.id}</b> - ${p.nombre}`;
        div.onclick = () => agregarALista(p);
        lista.appendChild(div);
    });
    lista.style.display = 'block';
}

function agregarALista(p) {
    const contenedor = document.getElementById('contenedor-lista-bajas');
    if (document.getElementById(`card-${p.id}`)) return;

    const card = document.createElement('div');
    card.className = 'tarjeta-baja-item';
    card.id = `card-${p.id}`;
    card.innerHTML = `
        <button class="btn-quitar-lista" onclick="quitarDeVista('${p.id}')">✕</button>
        <div class="info-item">
            <h3>${p.nombre}</h3>
            <p>ID: ${p.id} | Existencia Final: <b>${p.cantidad}</b></p>
        </div>
        <button class="btn-borrar-trigger" onclick="prepararEliminacion(${JSON.stringify(p).replace(/"/g, '&quot;')})">
            ELIMINAR
        </button>
    `;
    contenedor.appendChild(card);
    document.getElementById('resultados-busqueda').style.display = 'none';
    document.getElementById('inputBusqueda').value = "";
}

window.quitarDeVista = (id) => {
    document.getElementById(`card-${id}`).remove();
}

window.prepararEliminacion = (p) => {
    productoParaEliminar = p;
    document.getElementById('texto-confirmacion').innerText = `¿Borrar permanentemente "${p.nombre}" y registrar la baja?`;
    document.getElementById('modal-confirmar').style.display = 'flex';
}

window.cerrarModal = () => {
    document.getElementById('modal-confirmar').style.display = 'none';
}

window.eliminarDefinitivo = async function() {
    if (!productoParaEliminar) return;

    try {
        // 1. REGISTRAR EN EL HISTORIAL DE BAJAS
        await addDoc(collection(db, "bajas_historial"), {
            productoId: productoParaEliminar.id,
            nombre: productoParaEliminar.nombre,
            cantidadAlMomento: productoParaEliminar.cantidad,
            fecha: serverTimestamp(),
            motivo: "Eliminación de sistema"
        });

        // 2. ELIMINAR EL DOCUMENTO REAL
        await deleteDoc(doc(db, "articulos", productoParaEliminar.id));

        document.getElementById(`card-${productoParaEliminar.id}`).remove();
        cerrarModal();
        alert("✅ Producto eliminado y registro guardado en el historial.");
        cargarDB();
    } catch (e) {
        alert("Error en el proceso: " + e.message);
    }
}

cargarDB();