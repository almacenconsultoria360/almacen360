

// 1. Configuración de Firebase (Usa tus propias credenciales aquí)
  const firebaseConfig = {
  apiKey: "AIzaSyDflDjy8z3y6TOkbn5OUAg8iwfvo6xptiw",
  authDomain: "inventario-6a5b7.firebaseapp.com",
  projectId: "inventario-6a5b7",
  storageBucket: "inventario-6a5b7.firebasestorage.app",
  messagingSenderId: "655864902994",
  appId: "1:655864902994:web:4497feaaa8da3a6171768b",
  measurementId: "G-YEPLHBRXFL"
};


// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let productoActualRef = null; // Guardará la referencia al producto en la DB

// 2. Función que se dispara al escanear el código
function mostrarModal(codigoEscaneado) {
    const dbRef = database.ref('productos/' + codigoEscaneado);

    dbRef.once('value').then((snapshot) => {
        if (snapshot.exists()) {
            const producto = snapshot.val();
            productoActualRef = dbRef;

            // Llenamos los campos de la tabla
            document.getElementById('cell-id').innerText = codigoEscaneado;
            document.getElementById('cell-nombre').innerText = producto.nombre;
            
            // NUEVO: Llenamos la sección/ubicación desde Firebase
            document.getElementById('cell-seccion').innerText = producto.seccion || "No asignada";
            
            document.getElementById('cell-actual').innerText = producto.stock;
            document.getElementById('input-agregar').value = 1;
            
            document.getElementById('modal-overlay').style.display = 'flex';
        } else {
            alert("Producto no encontrado en la base de datos.");
        }
    });
}

// 3. Función del Botón "AGREGAR"
function confirmarCambioEnDB() {
    const cantidadAAgregar = parseInt(document.getElementById('input-agregar').value);
    const stockActual = parseInt(document.getElementById('cell-actual').innerText);

    if (isNaN(cantidadAAgregar) || cantidadAAgregar <= 0) {
        alert("Por favor, ingresa una cantidad válida.");
        return;
    }

    const nuevoStock = stockActual + cantidadAAgregar;

    // Actualizamos en Firebase
    productoActualRef.update({
        stock: nuevoStock
    }).then(() => {
        alert("¡Stock actualizado correctamente!");
        cerrarModal();
    }).catch((error) => {
        console.error("Error al actualizar:", error);
    });
}

// 4. Función del Botón "LIMPIAR"
function limpiarInput() {
    document.getElementById('input-agregar').value = "";
    document.getElementById('input-agregar').focus();
}

// 5. Función para cerrar el Modal (Botón X)
function cerrarModal() {
    document.getElementById('modal-overlay').style.display = 'none';
    productoActualRef = null;
}
