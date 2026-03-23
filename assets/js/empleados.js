import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

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

async function cargarPersonal() {
    const contenedor = document.getElementById('contenedor-personal');
    const contador = document.getElementById('num-empleados');
    
    try {
        const querySnapshot = await getDocs(collection(db, "empleados"));
        contenedor.innerHTML = "";
        contador.innerText = querySnapshot.size;

        querySnapshot.forEach((doc) => {
            const emp = doc.data();
            const id = doc.id;
            
            const nombre = emp.nombre || 'Sin Nombre';
            const puesto = emp.puesto || 'General';
            
            // --- CORRECCIÓN CLAVE ---
            // Ahora lee directamente el campo 'numero' que tienes en Firebase
            const telefono = emp.numero || 'No registrado';
            const correo = emp.correo || emp.email || 'Sin correo';

            const card = document.createElement('div');
            card.className = 'tarjeta-empleado';
            card.innerHTML = `
                <div class="avatar-empleado">${nombre.charAt(0)}</div>
                <div class="info-empleado">
                    <h3>${nombre}</h3>
                    <p class="puesto">${puesto}</p>
                    <div class="contacto-detalles">
                        <div class="item-contacto">
                            <span>📞</span> ${telefono}
                        </div>
                        <div class="item-contacto">
                            <span>✉️</span> ${correo}
                        </div>
                    </div>
                    <span class="id-tag">ID: ${id}</span>
                </div>
                <div class="footer-card">
                    <span class="status-activo">Activo</span>
                </div>
            `;
            contenedor.appendChild(card);
        });
    } catch (error) {
        console.error("Error al cargar personal:", error);
        contenedor.innerHTML = "<p>Error al conectar con la base de datos.</p>";
    }
}

// Filtro mejorado para buscar por nombre, puesto, correo o número
window.filtrarPersonal = function() {
    let input = document.getElementById('inputBusqueda').value.toLowerCase();
    let tarjetas = document.getElementsByClassName('tarjeta-empleado');

    for (let i = 0; i < tarjetas.length; i++) {
        let texto = tarjetas[i].innerText.toLowerCase();
        tarjetas[i].style.display = texto.includes(input) ? "flex" : "none";
    }
}

window.onload = cargarPersonal;
function volverAtras() {
    window.history.back();
}