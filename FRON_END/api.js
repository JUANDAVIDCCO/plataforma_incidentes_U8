const BASE_URL = window.BACKEND_URL || window.location.origin;

async function enviar(ruta, opciones = {}) {
  const token = sessionStorage.getItem("token");
  const encabezados = { ...(opciones.headers || {}) };
  const esFormData = typeof FormData !== "undefined" && opciones.body instanceof FormData;

  if (!esFormData && !encabezados["Content-Type"]) {
    encabezados["Content-Type"] = "application/json";
  }

  if (token) {
    encabezados.Authorization = `Bearer ${token}`;
  }

  return fetch(`${BASE_URL}${ruta}`, {
    ...opciones,
    headers: encabezados
  });
}

async function solicitar(ruta, opciones = {}) {
  const respuesta = await enviar(ruta, opciones);

  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    throw new Error(datos && datos.error ? datos.error : `Error ${respuesta.status}`);
  }

  return datos;
}

async function solicitarArchivo(ruta) {
  const respuesta = await enviar(ruta);
  if (!respuesta.ok) {
    const datos = await respuesta.json().catch(() => null);
    throw new Error(datos?.error || `Error ${respuesta.status}`);
  }
  return respuesta.blob();
}

export { solicitar, solicitarArchivo };
