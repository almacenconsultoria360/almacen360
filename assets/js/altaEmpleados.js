import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore, doc, setDoc, collection, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

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

// --- GENERAR ID DINÁMICO ---
async function generarID() {
    const campoID = document.getElementById('emp-id');
    if (campoID) campoID.innerText = "wait...";

    try {
        const colRef = collection(db, "empleados");
        const snapshot = await getDocs(colRef);
        let maxNum = 0;

        snapshot.forEach((doc) => {
            const numActual = parseInt(doc.id.replace("E", ""), 10);
            if (!isNaN(numActual) && numActual > maxNum) {
                maxNum = numActual;
            }
        });

        const siguiente = maxNum + 1;
        const idFinal = "E" + siguiente.toString().padStart(3, '0');
        campoID.innerText = idFinal;
    } catch (error) {
        console.error("Error:", error);
        campoID.innerText = "E001";
    }
}

// --- VALIDACIONES DE SEGURIDAD ---
function validarDatos(nombre, numero, correo) {
    // Validar campos vacíos
    if (!nombre || !numero || !correo) {
        alert("⚠️ Todos los campos son obligatorios.");
        return false;
    }

    // Validar que el número tenga exactamente 10 dígitos (Formato México)
    const regexTelefono = /^[0-9]{10}$/;
    if (!regexTelefono.test(numero)) {
        alert("⚠️ El número de teléfono debe tener exactamente 10 dígitos numéricos.");
        return false;
    }

    // Validar formato de correo electrónico
    const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regexCorreo.test(correo)) {
        alert("⚠️ Por favor, ingresa un correo electrónico válido.");
        return false;
    }

    return true;
}

// --- GUARDAR EN FIREBASE ---
async function guardarEmpleado() {
    const id = document.getElementById('emp-id').innerText;
    const nombre = document.getElementById('emp-nombre').value.trim().toUpperCase();
    const numero = document.getElementById('emp-numero').value.trim();
    const correo = document.getElementById('emp-correo').value.trim().toLowerCase(); // Correo siempre en minúsculas

    // Ejecutar validaciones antes de procesar
    if (!validarDatos(nombre, numero, correo)) return;

    try {
        await setDoc(doc(db, "empleados", id), {
            nombre: nombre,
            numero: numero,
            correo: correo,
            fechaAlta: serverTimestamp()
        });

        alert(`✅ Empleado ${id} (${nombre}) registrado con éxito.`);
        limpiarCampos();
        generarID(); 
    } catch (error) {
        console.error("Error Firebase:", error);
        alert("❌ Error al conectar con Firebase. Revisa tu conexión.");
    }
}

function limpiarCampos() {
    document.getElementById('emp-nombre').value = "";
    document.getElementById('emp-numero').value = "";
    document.getElementById('emp-correo').value = "";
}

// Globalizar funciones
window.guardarEmpleado = guardarEmpleado;
window.limpiarCampos = limpiarCampos;

document.addEventListener('DOMContentLoaded', generarID);