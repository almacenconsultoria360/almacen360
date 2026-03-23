import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

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

function escucharSalidas() {
    const cuerpoTabla = document.getElementById('tabla-salidas-cuerpo');
    // Escuchamos la colección de salidas ordenada por fecha
    const q = query(collection(db, "salidas_historial"), orderBy("fecha", "desc"));

    onSnapshot(q, (snapshot) => {
        cuerpoTabla.innerHTML = ""; 

        if (snapshot.empty) {
            cuerpoTabla.innerHTML = "<tr><td colspan='6' style='text-align:center;'>No hay registros de salidas.</td></tr>";
            return;
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            // Convertimos la fecha de Firebase a formato local México
            const fecha = data.fecha ? data.fecha.toDate().toLocaleString('es-MX') : "Procesando...";

            cuerpoTabla.innerHTML += `
                <tr>
                    <td style="color:#800000; font-weight:bold;">${fecha}</td>
                    <td><b>${data.productoId}</b></td>
                    <td>${data.nombre}</td>
                    <td style="text-align:center; color:#d32f2f; font-weight:bold;">-${data.cantidadRetirada}</td>
                    <td><span class="badge-empleado">${data.quienRetira}</span></td>
                    <td><span class="badge-empleado">${data.quienAutoriza}</span></td>
                </tr>
            `;
        });
    }, (error) => {
        console.error("Error en tiempo real de salidas:", error);
    });
}

escucharSalidas();