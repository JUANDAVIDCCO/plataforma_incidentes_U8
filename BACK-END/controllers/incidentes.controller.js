const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const modelo = require("../modelos/incidentes.model");

const directorioAdjuntos = path.join(__dirname, "../uploads");
const tiposPermitidos = new Set([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/webm",
    "video/quicktime",
]);

async function eliminarArchivo(ruta) {
    if (ruta) await fs.unlink(ruta).catch(() => {});
}

async function guardarAdjunto(archivo) {
    const { fileTypeFromFile } = await import("file-type");
    const tipoDetectado = await fileTypeFromFile(archivo.path);
    if (!tipoDetectado || !tiposPermitidos.has(tipoDetectado.mime)) {
        const error = new Error("El contenido no corresponde a una imagen o video compatible");
        error.statusCode = 400;
        throw error;
    }

    const archivoRuta = `${randomUUID()}.${tipoDetectado.ext}`;
    const rutaDestino = path.join(directorioAdjuntos, archivoRuta);
    await fs.rename(archivo.path, rutaDestino);
    const nombreOriginal = path.basename(archivo.originalname.replace(/\\/g, "/"));
    // eslint-disable-next-line no-control-regex -- elimina caracteres de control del nombre del archivo
    const archivoNombre = nombreOriginal.replace(/[\u0000-\u001F\u007F]/g, "")
        .slice(0, 180) || `adjunto.${tipoDetectado.ext}`;

    return {
        rutaDestino,
        datos: {
            archivoRuta,
            archivoNombre,
            archivoMime: tipoDetectado.mime,
        },
    };
}

function ocultarRutaAdjunto(incidente) {
    if (!incidente) return incidente;
    const datos = { ...incidente };
    delete datos.archivoRuta;
    return datos;
}

const prioridadesValidas = new Set(["Baja", "Media", "Alta", "Crítica"]);
const estadosValidos = new Set(["Registrado", "En revisión", "Resuelto"]);

function normalizarTexto(valor) {
    if (typeof valor !== "string") return "";
    // eslint-disable-next-line no-control-regex -- elimina caracteres de control de la entrada
    return valor.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
}

function normalizarPrioridad(valor) {
    const texto = normalizarTexto(valor || "");
    const mapa = {
        baja: "Baja",
        media: "Media",
        alta: "Alta",
        crítica: "Crítica",
        critica: "Crítica",
    };
    return mapa[texto.toLowerCase()] || texto;
}

function normalizarEstado(valor) {
    const texto = normalizarTexto(valor || "");
    const mapa = {
        registrado: "Registrado",
        "en revision": "En revisión",
        "en revisión": "En revisión",
        resuelto: "Resuelto",
    };
    return mapa[texto.toLowerCase()] || texto;
}

function validarDatos(body, estadoPredeterminado) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return { error: "Envía un body JSON con titulo y prioridad" };
    }

    const titulo = normalizarTexto(body.titulo ?? body.tipo);
    const descripcion = normalizarTexto(body.descripcion ?? "");
    const prioridad = normalizarPrioridad(body.prioridad);
    const estado = body.estado === undefined
        ? estadoPredeterminado
        : normalizarEstado(body.estado);

    if (!titulo || titulo.length > 100) {
        return { error: "titulo es obligatorio y debe tener como máximo 100 caracteres" };
    }
    if (/[<>]/.test(titulo)) {
        return { error: "titulo no puede contener etiquetas HTML" };
    }
    if (descripcion && /[<>]/.test(descripcion)) {
        return { error: "descripcion no puede contener etiquetas HTML" };
    }
    if (descripcion) {
        const palabras = descripcion.split(/\s+/).filter(Boolean).length;
        if (palabras > 200) {
            return { error: "descripcion no puede superar las 200 palabras" };
        }
    }
    if (!prioridadesValidas.has(prioridad)) {
        return { error: "prioridad debe ser Baja, Media, Alta o Crítica" };
    }
    if (!estadosValidos.has(estado)) {
        return { error: "estado debe ser Registrado, En revisión o Resuelto" };
    }

    return { datos: { titulo, descripcion: descripcion || null, prioridad, estado } };
}

async function listar(req, res) {
    try {
        const incidentes = await modelo.listar({
            q: req.query.q,
            prioridad: req.query.prioridad,
            estado: req.query.estado,
        });
        res.json(incidentes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function obtener(req, res) {
    try {
        const incidente = await modelo.buscarPorId(req.params.id);
        if (!incidente) {
            return res.status(404).json({ error: "Incidente no encontrado" });
        }
        res.json(ocultarRutaAdjunto(incidente));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function crear(req, res) {
    const resultado = validarDatos(req.body, "Registrado");
    if (resultado.error) {
        await eliminarArchivo(req.file?.path);
        return res.status(400).json({ error: resultado.error });
    }

    let rutaAdjuntoGuardado;
    try {
        const adjunto = req.file ? await guardarAdjunto(req.file) : { datos: {} };
        rutaAdjuntoGuardado = adjunto.rutaDestino;
        const incidente = await modelo.crear({ ...resultado.datos, ...adjunto.datos });
        res.status(201).json(ocultarRutaAdjunto(incidente));
    } catch (error) {
        await eliminarArchivo(req.file?.path);
        await eliminarArchivo(rutaAdjuntoGuardado);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
}

async function actualizar(req, res) {
    const resultado = validarDatos(req.body, undefined);
    if (resultado.error) {
        return res.status(400).json({ error: resultado.error });
    }

    try {
        const incidente = await modelo.actualizar(req.params.id, resultado.datos);
        if (!incidente) {
            return res.status(404).json({ error: "Incidente no encontrado" });
        }
        res.json(ocultarRutaAdjunto(incidente));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function eliminar(req, res) {
    try {
        const incidente = await modelo.buscarPorId(req.params.id);
        if (!incidente) {
            return res.status(404).json({ error: "Incidente no encontrado" });
        }

        const eliminado = await modelo.eliminar(req.params.id);
        if (!eliminado) {
            return res.status(404).json({ error: "Incidente no encontrado" });
        }
        if (incidente.archivoRuta) {
            await eliminarArchivo(path.join(directorioAdjuntos, path.basename(incidente.archivoRuta)));
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function obtenerArchivo(req, res) {
    try {
        const incidente = await modelo.buscarPorId(req.params.id);
        if (!incidente) {
            return res.status(404).json({ error: "Incidente no encontrado" });
        }
        if (!incidente.archivoRuta || !incidente.archivoMime) {
            return res.status(404).json({ error: "El incidente no tiene un archivo adjunto" });
        }

        const ruta = path.join(directorioAdjuntos, path.basename(incidente.archivoRuta));
        res.type(incidente.archivoMime).sendFile(ruta, (error) => {
            if (error && !res.headersSent) {
                res.status(error.statusCode || 500).json({ error: "No se pudo leer el archivo adjunto" });
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = { listar, obtener, obtenerArchivo, crear, actualizar, eliminar };