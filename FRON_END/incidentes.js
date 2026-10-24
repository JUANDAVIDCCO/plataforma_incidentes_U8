import { solicitar } from "./api.js";
import {
  actualizarIncidente,
  crearIncidenteConAdjunto,
  descargarAdjuntoIncidente,
  eliminarIncidente,
  obtenerIncidentes,
} from "./incidentesApi.js";

const acceso = document.querySelector("#accessState");
const panel = document.querySelector("#dashboard");
const cuenta = document.querySelector("#accountArea");
const cuentaLabel = document.querySelector("#accountLabel");
const filas = document.querySelector("#incidentRows");
const vacio = document.querySelector("#emptyState");
const dialogo = document.querySelector("#incidentDialog");
const formulario = document.querySelector("#incidentForm");
const mensaje = document.querySelector("#feedback");
const archivoInput = document.querySelector("#incidentFile");
const vistaAdjunto = document.querySelector("#attachmentPreview");
const rolEtiqueta = { admin: "Administración", tecnico: "Técnico" };
const tamanoMaximoArchivo = 25 * 1024 * 1024;
let usuario = null;
let editandoId = null;
let urlVistaAdjunto = null;

function mostrarMensaje(texto, tipo = "success") {
  mensaje.textContent = texto;
  mensaje.className = `feedback feedback-${tipo}`;
  mensaje.hidden = !texto;
}

function celda(texto, etiqueta) {
  const elemento = document.createElement("td");
  elemento.dataset.label = etiqueta;
  elemento.textContent = texto;
  return elemento;
}

function clasePrioridad(prioridad) {
  return {
    Baja: "priority-low",
    Media: "priority-medium",
    Alta: "priority-high",
    "Crítica": "priority-critical",
  }[prioridad] || "priority-medium";
}

function limpiarVistaAdjunto() {
  if (urlVistaAdjunto) URL.revokeObjectURL(urlVistaAdjunto);
  urlVistaAdjunto = null;
  vistaAdjunto.replaceChildren();
  vistaAdjunto.hidden = true;
}

function mostrarVistaAdjunto() {
  limpiarVistaAdjunto();
  const archivo = archivoInput.files[0];
  if (!archivo) return;

  if (archivo.size > tamanoMaximoArchivo) {
    archivoInput.value = "";
    mostrarMensaje("El archivo no puede superar los 25 MB.", "error");
    return;
  }
  if (!archivo.type.startsWith("image/") && !archivo.type.startsWith("video/")) {
    archivoInput.value = "";
    mostrarMensaje("Selecciona una imagen o un video compatible.", "error");
    return;
  }

  urlVistaAdjunto = URL.createObjectURL(archivo);
  const vista = document.createElement(archivo.type.startsWith("image/") ? "img" : "video");
  vista.src = urlVistaAdjunto;
  if (vista instanceof HTMLImageElement) vista.alt = `Vista previa de ${archivo.name}`;
  if (vista instanceof HTMLVideoElement) {
    vista.controls = true;
    vista.preload = "metadata";
  }
  vistaAdjunto.replaceChildren(vista);
  vistaAdjunto.hidden = false;
}

async function descargarAdjunto(incidente) {
  try {
    const archivo = await descargarAdjuntoIncidente(incidente.id);
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = incidente.archivoNombre || "adjunto";
    document.body.append(enlace);
    enlace.click();
    enlace.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (error) {
    mostrarMensaje(error.message, "error");
  }
}

function crearFila(incidente) {
  const fila = document.createElement("tr");
  const celdaIncidente = celda(incidente.titulo ?? incidente.tipo ?? "Sin nombre", "Incidente");
  if (incidente.archivoNombre) {
    const descargar = document.createElement("button");
    descargar.className = "text-button";
    descargar.type = "button";
    descargar.textContent = "Descargar adjunto";
    descargar.addEventListener("click", () => descargarAdjunto(incidente));
    celdaIncidente.append(document.createElement("br"), descargar);
  }
  fila.append(celdaIncidente);

  const prioridad = celda("", "Prioridad");
  const insignia = document.createElement("span");
  insignia.className = `priority-badge ${clasePrioridad(incidente.prioridad)}`;
  insignia.textContent = incidente.prioridad;
  prioridad.append(insignia);
  fila.append(prioridad, celda(incidente.estado, "Estado"));

  const acciones = celda("", "Acciones");
  const grupo = document.createElement("div");
  grupo.className = "row-actions";
  const editar = document.createElement("button");
  editar.className = "text-button";
  editar.type = "button";
  editar.textContent = "Editar";
  editar.addEventListener("click", () => abrirDialogo(incidente));
  grupo.append(editar);

  if (usuario.rol === "admin") {
    const borrar = document.createElement("button");
    borrar.className = "text-button text-danger";
    borrar.type = "button";
    borrar.textContent = "Eliminar";
    borrar.addEventListener("click", () => borrarIncidente(incidente));
    grupo.append(borrar);
  }

  acciones.append(grupo);
  fila.append(acciones);
  return fila;
}

function actualizarResumen(incidentes) {
  document.querySelector("#totalCount").textContent = incidentes.length;
  document.querySelector("#registeredCount").textContent = incidentes.filter((incidente) => incidente.estado === "Registrado").length;
  document.querySelector("#reviewCount").textContent = incidentes.filter((incidente) => incidente.estado === "En revisión").length;
  document.querySelector("#resolvedCount").textContent = incidentes.filter((incidente) => incidente.estado === "Resuelto").length;
}

async function cargarIncidentes() {
  const filtros = {
    q: document.querySelector("#searchInput").value.trim(),
    prioridad: document.querySelector("#priorityFilter").value,
    estado: document.querySelector("#stateFilter").value,
  };

  try {
    const incidentes = await obtenerIncidentes(filtros);
    filas.replaceChildren(...incidentes.map(crearFila));
    vacio.hidden = incidentes.length > 0;
    document.querySelector("#resultCount").textContent = `${incidentes.length} ${incidentes.length === 1 ? "resultado" : "resultados"}`;
    actualizarResumen(incidentes);
  } catch (error) {
    mostrarMensaje(error.message, "error");
  }
}

function abrirDialogo(incidente = null) {
  limpiarVistaAdjunto();
  editandoId = incidente?.id ?? null;
  formulario.reset();
  archivoInput.disabled = editandoId !== null;
  formulario.elements.titulo.value = incidente?.titulo ?? incidente?.tipo ?? "";
  formulario.elements.descripcion.value = incidente?.descripcion ?? "";
  formulario.elements.prioridad.value = incidente?.prioridad ?? "Media";
  formulario.elements.estado.value = incidente?.estado ?? "Registrado";
  document.querySelector("#dialogTitle").textContent = incidente ? "Editar incidente" : "Nuevo incidente";
  dialogo.showModal();
  formulario.elements.titulo.focus();
}

async function guardarIncidente(evento) {
  evento.preventDefault();
  const datosFormulario = new FormData(formulario);
  const boton = document.querySelector("#saveIncidentButton");
  boton.disabled = true;
  try {
    if (editandoId === null) {
      await crearIncidenteConAdjunto(datosFormulario);
      mostrarMensaje("Incidente registrado.");
    } else {
      await actualizarIncidente(editandoId, Object.fromEntries(datosFormulario));
      mostrarMensaje("Incidente actualizado.");
    }
    dialogo.close();
    limpiarVistaAdjunto();
    await cargarIncidentes();
  } catch (error) {
    mostrarMensaje(error.message, "error");
  } finally {
    boton.disabled = false;
  }
}

async function borrarIncidente(incidente) {
  if (!window.confirm(`¿Eliminar el incidente "${incidente.titulo ?? incidente.tipo}"?`)) return;
  try {
    await eliminarIncidente(incidente.id);
    mostrarMensaje("Incidente eliminado.");
    await cargarIncidentes();
  } catch (error) {
    mostrarMensaje(error.message, "error");
  }
}

async function iniciar() {
  if (!sessionStorage.getItem("token")) {
    acceso.hidden = false;
    return;
  }

  try {
    usuario = await solicitar("/sesion");
    acceso.hidden = true;
    panel.hidden = false;
    cuenta.hidden = false;
    cuentaLabel.textContent = `${usuario.correo} · ${rolEtiqueta[usuario.rol] || usuario.rol}`;
    await cargarIncidentes();
  } catch {
    sessionStorage.removeItem("token");
    acceso.hidden = false;
  }
}

document.querySelector("#newIncidentButton").addEventListener("click", () => abrirDialogo());
document.querySelector("#refreshButton").addEventListener("click", cargarIncidentes);
document.querySelector("#filterForm").addEventListener("submit", (evento) => evento.preventDefault());
document.querySelector("#filterForm").addEventListener("input", cargarIncidentes);
document.querySelector("#filterForm").addEventListener("change", cargarIncidentes);
formulario.addEventListener("submit", guardarIncidente);
archivoInput.addEventListener("change", mostrarVistaAdjunto);
document.querySelector("#closeDialogButton").addEventListener("click", () => {
  dialogo.close();
  limpiarVistaAdjunto();
});
document.querySelector("#cancelDialogButton").addEventListener("click", () => {
  dialogo.close();
  limpiarVistaAdjunto();
});
document.querySelector("#logoutButton").addEventListener("click", () => {
  sessionStorage.removeItem("token");
  window.location.reload();
});

iniciar();