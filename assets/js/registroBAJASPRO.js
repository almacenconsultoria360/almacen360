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

function escucharBajas() {
    const cuerpoTabla = document.getElementById('tabla-bajas-cuerpo');
    const q = query(collection(db, "bajas_historial"), orderBy("fecha", "desc"));

    onSnapshot(q, (snapshot) => {
        cuerpoTabla.innerHTML = ""; 

        if (snapshot.empty) {
            cuerpoTabla.innerHTML = "<tr><td colspan='5' style='text-align:center;'>No hay registros de bajas registradas.</td></tr>";
            return;
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            const fecha = data.fecha ? data.fecha.toDate().toLocaleString('es-MX') : "Registrando...";

            cuerpoTabla.innerHTML += `
                <tr>
                    <td style="color:#000; font-weight:bold;">${fecha}</td>
                    <td><code style="background:#eee; padding:2px 5px; border-radius:4px;">${data.productoId}</code></td>
                    <td>${data.nombre}</td>
                    <td style="text-align:center;">
                        <span class="col-baja-stock">${data.cantidadAlMomento} unidades</span>
                    </td>
                    <td class="motivo-baja">${data.motivo || "Eliminación manual"}</td>
                </tr>
            `;
        });
    }, (error) => {
        console.error("Error al cargar historial de bajas:", error);
    });
}

escucharBajas();