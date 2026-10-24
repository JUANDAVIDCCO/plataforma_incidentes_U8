require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const databaseUrlString = process.env.DATABASE_URL;
if (!databaseUrlString) {
    throw new Error("Falta la variable DATABASE_URL");
}

const pool = new Pool({
    connectionString: databaseUrlString,
    ssl: databaseUrlString.includes(".render.com") || process.env.DB_SSL === "true"
        ? { rejectUnauthorized: false }
        : false,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function normalizarBusqueda(valor) {
    return String(valor ?? "").trim().toLowerCase();
}

async function listar(filtros = {}) {
    const termino = normalizarBusqueda(filtros.q);
    const prioridad = normalizarBusqueda(filtros.prioridad);
    const estado = normalizarBusqueda(filtros.estado);
    const condiciones = [];

    if (termino) {
        condiciones.push({
            OR: [
                { titulo: { contains: termino } },
                { descripcion: { contains: termino } },
                { prioridad: { contains: termino } },
                { estado: { contains: termino } },
            ],
        });
    }
    if (prioridad) condiciones.push({ prioridad: { equals: prioridad } });
    if (estado) condiciones.push({ estado: { equals: estado } });

    return prisma.incidente.findMany({
        where: condiciones.length ? { AND: condiciones } : undefined,
        orderBy: { id: "asc" },
        select: {
            id: true,
            titulo: true,
            descripcion: true,
            prioridad: true,
            estado: true,
            archivoNombre: true,
            archivoMime: true,
        },
    });
}

async function buscarPorId(id) {
    return prisma.incidente.findUnique({
        where: { id: Number(id) },
    });
}

async function crear(datos) {
    return prisma.incidente.create({
        data: {
            titulo: datos.titulo ?? datos.tipo,
            descripcion: datos.descripcion ?? null,
            prioridad: datos.prioridad,
            estado: datos.estado,
            archivoRuta: datos.archivoRuta ?? null,
            archivoNombre: datos.archivoNombre ?? null,
            archivoMime: datos.archivoMime ?? null,
        },
        select: {
            id: true,
            titulo: true,
            descripcion: true,
            prioridad: true,
            estado: true,
            archivoNombre: true,
            archivoMime: true,
        },
    });
}

async function actualizar(id, datos) {
    const incidenteActual = await buscarPorId(id);
    if (!incidenteActual) return null;

    return prisma.incidente.update({
        where: { id: Number(id) },
        data: {
            titulo: datos.titulo ?? incidenteActual.titulo,
            descripcion: datos.descripcion ?? incidenteActual.descripcion,
            prioridad: datos.prioridad ?? incidenteActual.prioridad,
            estado: datos.estado ?? incidenteActual.estado,
        },
    });
}

async function eliminar(id) {
    try {
        await prisma.incidente.delete({
            where: { id: Number(id) },
        });
        return true;
    } catch (error) {
        if (error?.code === "P2025") {
            return false;
        }
        throw error;
    }
}

async function verificarConexion() {
    await prisma.$queryRaw`SELECT 1`;
}

module.exports = { listar, buscarPorId, crear, actualizar, eliminar, verificarConexion };
