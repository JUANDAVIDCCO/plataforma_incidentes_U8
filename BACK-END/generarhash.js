const bcrypt = require("bcryptjs");

const clave = "ClaveSegura123!";
 const hash = bcrypt.hashSync(clave, 10);

console.log("Clave en texto plano:", clave);
 console.log("Hash generado: ", hash);