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

async function cargarEstadisticas() {
    try {
        const listaBajo = document.getElementById('lista-stock-bajo');
        if (!listaBajo) return;
        listaBajo.innerHTML = ""; 

        // 1. Cargar Artículos y detectar Stock Bajo
        const snapArticulos = await getDocs(collection(db, "articulos"));
        document.getElementById('total-productos').innerText = snapArticulos.size;

        snapArticulos.forEach(doc => {
            const p = doc.data();
            const stockActual = parseInt(p.cantidad) || 0;
            const stockIdeal = parseInt(p.stock_ideal) || 0; 

            // Lógica: Si hay menos del 30% del ideal, va a la lista roja
            if (stockIdeal > 0 && stockActual <= (stockIdeal * 0.3)) {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'alerta-item';
                itemDiv.innerHTML = `
                    <div class="info-producto">
                        <span class="nombre-destacado">${p.nombre || 'Sin nombre'}</span>
                        <span class="id-sub">ID: ${doc.id}</span>
                    </div>
                    <div class="metricas-stock">
                        <div class="dato-actual">
                            <small>Existencia:</small>
                            <b>${stockActual}</b>
                        </div>
                        <div class="dato-ideal">
                            <small>Ideal:</small>
                            <span>${stockIdeal}</span>
                        </div>
                    </div>
                `;
                listaBajo.appendChild(itemDiv);
            }
        });

        // 2. Tiempos para Hoy (Entradas/Salidas)
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const snapEntradas = await getDocs(collection(db, "entradas_historial"));
        let contEntradas = 0;
        snapEntradas.forEach(doc => {
            const f = doc.data().fecha?.toDate();
            if (f && f >= hoy) contEntradas++;
        });
        document.getElementById('entradas-hoy').innerText = contEntradas;

        const snapSalidas = await getDocs(collection(db, "salidas_historial"));
        let contSalidas = 0;
        snapSalidas.forEach(doc => {
            const f = doc.data().fecha?.toDate();
            if (f && f >= hoy) contSalidas++;
        });
        document.getElementById('salidas-hoy').innerText = contSalidas;

        const snapBajas = await getDocs(collection(db, "bajas_historial"));
        document.getElementById('bajas-totales').innerText = snapBajas.size;

    } catch (error) {
        console.error("Error en el Tablero 360:", error);
    }
}

// --- FUNCIÓN WHATSAPP ---
window.enviarWhatsAppCompra = function() {
    const numeroTelefono = "5218333372700"; // REEMPLAZA CON EL NÚMERO REAL
    const items = document.querySelectorAll('.alerta-item');

    if (items.length === 0) {
        alert("No hay productos en stock crítico para pedir.");
        return;
    }

    let mensaje = `*📦 TRES SESENTA CONSULTORÍA - PEDIDO DE RESURTIDO*\n`;
    mensaje += `_Fecha: ${new Date().toLocaleDateString()}_\n\n`;
    mensaje += `Se requiere la compra urgente de:\n\n`;

    items.forEach(item => {
        const nombre = item.querySelector('.nombre-destacado').innerText;
        const id = item.querySelector('.id-sub').innerText;
        const actual = item.querySelector('.dato-actual b').innerText;
        const ideal = item.querySelector('.dato-ideal span').innerText;
        
        mensaje += `🔹 *${nombre}*\n`;
        mensaje += `   • ${id}\n`;
        mensaje += `   • Existencia: ${actual} | Ideal: ${ideal}\n\n`;
    });

    mensaje += `_Enviado desde el Sistema Inventario 360._`;

    const url = `https://wa.me/${numeroTelefono}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
}

window.onload = cargarEstadisticas;