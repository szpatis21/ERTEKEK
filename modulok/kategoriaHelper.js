async function getOrCreateFoId(db, modulId, nev, extra = {}) {
  const cleanNev = String(nev || '').trim();

  if (!cleanNev) {
    throw new Error('Hiányzó főkategória név.');
  }

  const [result] = await db.promise().query(
    `
      INSERT INTO fokategoriak (modul_id, nev, leiras, szin, chart)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id),
        leiras = COALESCE(VALUES(leiras), leiras),
        szin = COALESCE(VALUES(szin), szin),
        chart = COALESCE(VALUES(chart), chart)
    `,
    [
      modulId,
      cleanNev,
      extra.leiras ?? null,
      extra.szin ?? null,
      extra.chart ?? null
    ]
  );

  return result.insertId;
}

async function getOrCreateAlId(db, modulId, fokategoriaId, nev) {
  const cleanNev = String(nev || '').trim();

  if (!cleanNev) {
    return null;
  }

  const [result] = await db.promise().query(
    `
      INSERT INTO alkategoriak (modul_id, fokategoria_id, nev)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)
    `,
    [modulId, fokategoriaId, cleanNev]
  );

  return result.insertId;
}

async function getOrCreateAltId(db, modulId, alkategoriaId, nev) {
  const cleanNev = String(nev || '').trim();

  if (!cleanNev) {
    return null;
  }

  if (!alkategoriaId) {
    throw new Error('Altéma nem hozható létre alkategória nélkül.');
  }

  const [result] = await db.promise().query(
    `
      INSERT INTO altemak (modul_id, alkategoria_id, nev)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)
    `,
    [modulId, alkategoriaId, cleanNev]
  );

  return result.insertId;
}

async function resolveKategoriaKapcsoloId(db, {
  modulId,
  foKategoria,
  alKategoria = null,
  altTema = null,
  leiras = null,
  szin = null,
  chart = null
}) {
  const cleanModulId = Number(modulId);

  if (!Number.isInteger(cleanModulId) || cleanModulId <= 0) {
    throw new Error('Hiányzó vagy hibás modulId.');
  }

  const foId = await getOrCreateFoId(db, cleanModulId, foKategoria, {
    leiras,
    szin,
    chart
  });

  const alId = await getOrCreateAlId(db, cleanModulId, foId, alKategoria);
  const altId = await getOrCreateAltId(db, cleanModulId, alId, altTema);

  const [result] = await db.promise().query(
    `
      INSERT INTO kategoria_kapcsolo
        (modul_id, fokategoria_id, alkategoria_id, altema_id)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)
    `,
    [cleanModulId, foId, alId, altId]
  );

  return result.insertId;
}

module.exports = {
  resolveKategoriaKapcsoloId
};