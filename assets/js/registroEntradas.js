import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, collection, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

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

async function cargarHistorial() {
    const cuerpoTabla = document.getElementById('tabla-historial-cuerpo');
    cuerpoTabla.innerHTML = "<tr><td colspan='6' style='text-align:center;'>Cargando registros...</td></tr>";

    try {
        // Consultamos la colección ordenada por fecha descendente
        const q = query(collection(db, "entradas_historial"), orderBy("fecha", "desc"));
        const querySnapshot = await getDocs(q);

        cuerpoTabla.innerHTML = ""; // Limpiamos el mensaje de carga

        if (querySnapshot.empty) {
            cuerpoTabla.innerHTML = "<tr><td colspan='6' style='text-align:center;'>No hay registros de entradas aún.</td></tr>";
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            
            // Formatear la fecha de Firebase a algo legible
            const fecha = data.fecha ? data.fecha.toDate().toLocaleString() : "Sin fecha";

            cuerpoTabla.innerHTML += `
                <tr>
                    <td class="col-fecha">${fecha}</td>
                    <td><b>${data.productoId}</b></td>
                    <td>${data.nombre}</td>
                    <td style="text-align:center; font-weight:bold; color: green;">+${data.cantidadIngresada}</td>
                    <td><span class="badge-empleado">${data.quienEntrega}</span></td>
                    <td><span class="badge-empleado">${data.quienAutoriza}</span></td>
                </tr>
            `;
        });

    } catch (error) {
        console.error("Error al cargar historial:", error);
        cuerpoTabla.innerHTML = "<tr><td colspan='6' style='text-align:center; color:red;'>Error al conectar con la base de datos.</td></tr>";
    }
}

// Ejecutar al cargar la página
cargarHistorial();