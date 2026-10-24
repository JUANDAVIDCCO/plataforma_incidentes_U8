const usuarios = [
    {
        id: 1,
        correo: "jcabezas@soc.com",
        clave: "$2b$10$n5ZDeFxYQSOWuP2ha/k2UeVfeFaoEWjrgFEgRz./UpSW7h0n68KrS",
        rol: "admin",
    },
    {
        id: 2,
        correo: "dcondor@soc.com",
        clave: "$2b$10$n5ZDeFxYQSOWuP2ha/k2UeVfeFaoEWjrgFEgRz./UpSW7h0n68KrS",
        rol: "tecnico",
    },
];

async function buscarPorCorreo(correo) {
    return usuarios.find((usuario) => usuario.correo === correo);
}

module.exports = { buscarPorCorreo };