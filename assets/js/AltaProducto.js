// 1. Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDflDjy8z3y6TOkbn5OUAg8iwfvo6xptiw",
  authDomain: "inventario-6a5b7.firebaseapp.com",
  projectId: "inventario-6a5b7",
  storageBucket: "inventario-6a5b7.firebasestorage.app",
  messagingSenderId: "655864902994",
  appId: "1:655864902994:web:4497feaaa8da3a6171768b",
  measurementId: "G-YEPLHBRXFL"
};
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { 
    getFirestore, doc, setDoc, collection, getDocs, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- FUNCIÓN PARA GENERAR EL ID ---
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

        if (campoID) {
            campoID.innerText = idFinal;
        }

    } catch (error) {
        console.error("Error al generar ID:", error);
        if (campoID) campoID.innerText = "9999";
    }
}

// --- FUNCIÓN PARA GUARDAR EL PRODUCTO (CON STOCK IDEAL) ---
async function guardarNuevoProducto() {
    const id = document.getElementById('reg-id').innerText;
    const nombreInput = document.getElementById('reg-nombre').value.trim().toUpperCase();
    const seccionInput = document.getElementById('reg-seccion').value;
    const stockInput = parseInt(document.getElementById('reg-stock').value) || 0;
    
    // CAPTURAMOS EL NUEVO CAMPO DEL STOCK IDEAL
    const stockIdealInput = parseInt(document.getElementById('reg-stock-ideal').value) || 0;

    // Validación extendida
    if (!nombreInput || !seccionInput) {
        alert("⚠️ Por favor, completa el Nombre del Producto y selecciona una Sección/Ubicación.");
        return;
    }

    if (stockIdealInput <= 0) {
        alert("⚠️ El Stock Ideal debe ser mayor a 0 para que funcionen los colores del inventario.");
        return;
    }

    try {
        await setDoc(doc(db, "articulos", id), {
            nombre: nombreInput,
            seccion: seccionInput,
            cantidad: stockInput,
            stock_ideal: stockIdealInput, // <--- Dato clave para los tercios
            ultimaActualizacion: serverTimestamp() 
        });

        alert("✅ Producto " + id + " registrado con éxito.");
        limpiarCampos();
        await generarID(); 
    } catch (error) {
        console.error("Error al guardar:", error);
        alert("❌ Error al conectar con Firebase.");
    }
}

function limpiarCampos() {
    document.getElementById('reg-nombre').value = "";
    document.getElementById('reg-seccion').selectedIndex = 0;
    document.getElementById('reg-stock').value = "0";
    document.getElementById('reg-stock-ideal').value = "10"; // Valor por defecto
}

// Vinculación global
window.generarID = generarID;
window.guardarNuevoProducto = guardarNuevoProducto;
window.limpiarCampos = limpiarCampos;

// Ejecución automática
window.addEventListener('DOMContentLoaded', generarID);