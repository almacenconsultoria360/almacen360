import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { 
    getFirestore, doc, setDoc, collection, getDocs, serverTimestamp 
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

async function generarID() {
    const campoID = document.getElementById('reg-id');
    if (campoID) campoID.innerText = "Cargando...";

    try {
        const colRef = collection(db, "articulos");
        const querySnapshot = await getDocs(colRef);
        let maxID = 0;

        querySnapshot.forEach((doc) => {
            const idNumerico = parseInt(doc.id);
            if (!isNaN(idNumerico) && idNumerico > maxID) {
                maxID = idNumerico;
            }
        });

        const siguiente = maxID + 1;
        const idFinal = siguiente.toString().padStart(4, '0');
        if (campoID) campoID.innerText = idFinal;

    } catch (error) {
        console.error("Error al generar ID:", error);
        if (campoID) campoID.innerText = "0001";
    }
}

async function guardarNuevoProducto() {
    const id = document.getElementById('reg-id').innerText;
    const nombre = document.getElementById('reg-nombre').value.trim().toUpperCase();
    const seccion = document.getElementById('reg-seccion').value;
    const stock = parseFloat(document.getElementById('reg-stock').value) || 0;
    const stockIdeal = parseFloat(document.getElementById('reg-stock-ideal').value) || 0;
    const unidad = document.getElementById('reg-unidad').value;

    if (!nombre || !seccion) {
        alert("⚠️ Por favor, completa el Nombre y selecciona la Bodega o Sección.");
        return;
    }

    try {
        await setDoc(doc(db, "articulos", id), {
            nombre: nombre,
            seccion: seccion,
            cantidad: stock,
            stock_ideal: stockIdeal,
            unidad: unidad,
            ultimaActualizacion: serverTimestamp() 
        });

        alert(`✅ Producto ${id} registrado en ${seccion} con éxito.`);
        limpiarCampos();
        await generarID(); 
    } catch (error) {
        alert("❌ Error al conectar con Firebase.");
    }
}

function limpiarCampos() {
    document.getElementById('reg-nombre').value = "";
    document.getElementById('reg-seccion').selectedIndex = 0;
    document.getElementById('reg-stock').value = "0";
    document.getElementById('reg-stock-ideal').value = "10";
    document.getElementById('reg-unidad').selectedIndex = 0;
}

window.guardarNuevoProducto = guardarNuevoProducto;
window.limpiarCampos = limpiarCampos;
window.addEventListener('DOMContentLoaded', generarID);