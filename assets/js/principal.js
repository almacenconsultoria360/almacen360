const menuToggle = document.getElementById('menuToggle');
const dropdownMenu = document.getElementById('dropdownMenu');

// Abrir y cerrar menú
menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('show');
    
    // Animación de la hamburguesa (opcional)
    menuToggle.classList.toggle('active');
});

// Cerrar si se hace clic afuera
window.addEventListener('click', (e) => {
    if (!dropdownMenu.contains(e.target) && dropdownMenu.classList.contains('show')) {
        dropdownMenu.classList.remove('show');
    }
});

// Función global por si se necesita en otros archivos
window.volverAtras = function() {
    window.history.back();
};
function volverAtras() {
    window.history.back();
}