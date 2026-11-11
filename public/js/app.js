// Confirmación previa a acciones destructivas.
// Se usa un atributo data-confirm en el formulario en lugar de un manejador en línea,
// para poder aplicar una política de seguridad de contenido sin scripts embebidos.
document.addEventListener("submit", (evento) => {
  const mensaje = evento.target?.dataset?.confirm;
  if (mensaje && !window.confirm(mensaje)) evento.preventDefault();
});
