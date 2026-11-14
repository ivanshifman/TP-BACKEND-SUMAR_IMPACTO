// Confirmación previa a acciones destructivas.
// Se usa un atributo data-confirm en el formulario en lugar de un manejador en línea,
// para poder aplicar una política de seguridad de contenido sin scripts embebidos.
document.addEventListener("submit", (evento) => {
  const mensaje = evento.target?.dataset?.confirm;
  if (mensaje && !window.confirm(mensaje)) evento.preventDefault();
});

const proyecto = document.querySelector("#proyecto");
const rubro = document.querySelector("#rubro");

if (proyecto && rubro) {
  const actualizarRubros = (limpiarSeleccion) => {
    const opcionProyecto = proyecto.selectedOptions[0];
    const nombresRubros = opcionProyecto?.dataset.rubros ? JSON.parse(opcionProyecto.dataset.rubros) : [];
    rubro.replaceChildren(new Option(rubro.dataset.placeholder, ""));

    for (const nombre of nombresRubros) {
      rubro.add(new Option(nombre, nombre));
    }

    if (proyecto.value) rubro.add(new Option("Otro", "otro"));
    rubro.disabled = !proyecto.value;
    if (limpiarSeleccion) rubro.value = "";
  };

  proyecto.addEventListener("change", () => actualizarRubros(true));
  actualizarRubros(false);
}
