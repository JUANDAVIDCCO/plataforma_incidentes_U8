import { solicitar, solicitarArchivo } from "./api.js";

export function obtenerIncidentes(filtros = {}) {
  const parametros = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor) parametros.set(clave, valor);
  }
  const query = parametros.size ? `?${parametros}` : "";
  return solicitar(`/incidentes${query}`);
}

export function crearIncidente(datos) {
  return solicitar("/incidentes", { method: "POST", body: JSON.stringify(datos) });
}

export function crearIncidenteConAdjunto(datos) {
  return solicitar("/incidentes", { method: "POST", body: datos });
}

export function descargarAdjuntoIncidente(id) {
  return solicitarArchivo(`/incidentes/${encodeURIComponent(id)}/archivo`);
}

export function actualizarIncidente(id, datos) {
  return solicitar(`/incidentes/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}

export function eliminarIncidente(id) {
  return solicitar(`/incidentes/${encodeURIComponent(id)}`, { method: "DELETE" });
}