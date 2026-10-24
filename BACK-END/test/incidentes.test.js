const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const jwt = require('jsonwebtoken');
const { crear } = require('../controllers/incidentes.controller');
const modelo = require('../modelos/incidentes.model');
const app = require('../index');

function ejecutarCrear(body) {
  return new Promise((resolve) => {
    let statusCode = null;
    let payload = null;

    const req = { body };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        payload = data;
        return this;
      },
      send() {
        return this;
      },
    };

    crear(req, res).then(() => resolve({ statusCode, payload })).catch((error) => {
      resolve({ statusCode, payload: { error: error.message } });
    });
  });
}

test('crear acepta un incidente con titulo', async () => {
  let statusCode = null;
  let payload = null;

  const req = {
    body: {
      titulo: 'Phishing',
      descripcion: 'Ataque por correo falso con enlaces sospechosos y solicitud urgente de credenciales.',
      prioridad: 'Alta',
      estado: 'Registrado',
    },
  };

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      payload = data;
      return this;
    },
    send() {
      return this;
    },
  };

  await crear(req, res);

  assert.equal(statusCode, 201);
  assert.equal(payload.titulo, 'Phishing');
  assert.equal(payload.descripcion, 'Ataque por correo falso con enlaces sospechosos y solicitud urgente de credenciales.');
  assert.equal(payload.prioridad, 'Alta');
  assert.equal(payload.estado, 'Registrado');
});

test('listar filtra por texto, prioridad y estado juntos', async () => {
  const resultado = await modelo.listar({
    q: 'phishing',
    prioridad: 'Alta',
    estado: 'Registrado',
  });

  assert.ok(Array.isArray(resultado));
  assert.ok(resultado.length > 0);
  for (const incidente of resultado) {
    assert.match((incidente.titulo || '').toLowerCase(), /phishing/);
    assert.equal(incidente.prioridad, 'Alta');
    assert.equal(incidente.estado, 'Registrado');
  }
});

test('crear normaliza prioridad y estado en minúsculas', async () => {
  const respuesta = await ejecutarCrear({
    titulo: 'Ransomware',
    descripcion: 'Ataque con cifrado y extorsión',
    prioridad: 'alta',
    estado: 'en revision',
  });

  assert.equal(respuesta.statusCode, 201);
  assert.equal(respuesta.payload.prioridad, 'Alta');
  assert.equal(respuesta.payload.estado, 'En revisión');
});

test('crear rechaza un titulo con etiquetas HTML', async () => {
  const respuesta = await ejecutarCrear({
    titulo: '<script>alert(1)</script>',
    descripcion: 'Intento de inyección no válido',
    prioridad: 'Media',
    estado: 'Registrado',
  });

  assert.equal(respuesta.statusCode, 400);
  assert.match(respuesta.payload.error, /titulo no puede contener etiquetas HTML/i);
});

test('crear rechaza una descripcion con más de 200 palabras', async () => {
  const descripcion = Array.from({ length: 201 }, (_, index) => `palabra${index + 1}`).join(' ');

  const respuesta = await ejecutarCrear({
    titulo: 'Phishing masivo',
    descripcion,
    prioridad: 'Alta',
    estado: 'Registrado',
  });

  assert.equal(respuesta.statusCode, 400);
  assert.match(respuesta.payload.error, /descripcion no puede superar las 200 palabras/i);
});

test('crear rechaza prioridad inválida', async () => {
  const respuesta = await ejecutarCrear({
    titulo: 'Malware',
    descripcion: 'Se detectó un comportamiento sospechoso',
    prioridad: 'Urgente',
    estado: 'Registrado',
  });

  assert.equal(respuesta.statusCode, 400);
  assert.match(respuesta.payload.error, /prioridad debe ser Baja, Media, Alta o Crítica/i);
});

test('crear permite subir y descargar un adjunto autenticado', async () => {
  const servidor = app.listen(0, '127.0.0.1');
  let incidenteId = null;
  let baseUrl;

  try {
    await once(servidor, 'listening');
    baseUrl = `http://127.0.0.1:${servidor.address().port}`;
    const token = jwt.sign({ correo: 'prueba@example.invalid', rol: 'admin' }, process.env.JWT_SECRET);
    const sesion = await fetch(`${baseUrl}/sesion`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(sesion.status, 200);
    assert.equal(sesion.headers.get('cache-control'), 'no-store');
    const sesionRevalidada = await fetch(`${baseUrl}/sesion`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'If-None-Match': sesion.headers.get('etag'),
      },
    });
    assert.equal(sesionRevalidada.status, 200);
    assert.equal(sesionRevalidada.headers.get('cache-control'), 'no-store');

    const datos = new FormData();
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/9mgAAAAASUVORK5CYII=', 'base64');
    datos.append('titulo', 'Incidente con adjunto de prueba');
    datos.append('prioridad', 'Baja');
    datos.append('estado', 'Registrado');
    datos.append('archivo', new Blob([png], { type: 'image/png' }), 'evidencia.png');

    const subida = await fetch(`${baseUrl}/incidentes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: datos,
    });
    const incidente = await subida.json();
    assert.equal(subida.status, 201);
    assert.equal(subida.headers.get('cache-control'), 'no-store');
    assert.equal(incidente.archivoMime, 'image/png');
    assert.equal(incidente.archivoNombre, 'evidencia.png');
    assert.equal('archivoRuta' in incidente, false);
    incidenteId = incidente.id;

    const descarga = await fetch(`${baseUrl}/incidentes/${incidenteId}/archivo`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(descarga.status, 200);
    assert.deepEqual(Buffer.from(await descarga.arrayBuffer()), png);

    const borrado = await fetch(`${baseUrl}/incidentes/${incidenteId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(borrado.status, 204);
    incidenteId = null;
  } finally {
    if (incidenteId) {
      const token = jwt.sign({ correo: 'prueba@example.invalid', rol: 'admin' }, process.env.JWT_SECRET);
      await fetch(`${baseUrl}/${incidenteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    await new Promise((resolve) => servidor.close(resolve));
  }
});
