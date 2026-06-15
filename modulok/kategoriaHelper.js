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

  const cleanAlkategoriaId = alkategoriaId ? Number(alkategoriaId) : null;

  if (cleanAlkategoriaId) {
    const [result] = await db.promise().query(
      `
        INSERT INTO altemak (modul_id, alkategoria_id, nev)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)
      `,
      [modulId, cleanAlkategoriaId, cleanNev]
    );

    return result.insertId;
  }

  /*
    ÚJ RUGALMAS ÚT:
    Főkategória → Altéma → Kérdés

    Ilyenkor nincs alkategória, ezért:
    altemak.alkategoria_id = NULL

    Az adott főkategóriához tartozást nem az altemak tábla,
    hanem a kategoria_kapcsolo sor fogja rögzíteni:
    fokategoria_id = foId
    alkategoria_id = NULL
    altema_id = altId
  */

  const [existingRows] = await db.promise().query(
    `
      SELECT id
      FROM altemak
      WHERE modul_id = ?
        AND alkategoria_id IS NULL
        AND nev = ?
      LIMIT 1
    `,
    [modulId, cleanNev]
  );

  if (existingRows.length > 0) {
    return existingRows[0].id;
  }

  const [result] = await db.promise().query(
    `
      INSERT INTO altemak (modul_id, alkategoria_id, nev)
      VALUES (?, NULL, ?)
    `,
    [modulId, cleanNev]
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

  const [existingRows] = await db.promise().query(
    `
      SELECT id
      FROM kategoria_kapcsolo
      WHERE modul_id = ?
        AND fokategoria_id = ?
        AND (
          (? IS NULL AND alkategoria_id IS NULL)
          OR alkategoria_id = ?
        )
        AND (
          (? IS NULL AND altema_id IS NULL)
          OR altema_id = ?
        )
      LIMIT 1
    `,
    [cleanModulId, foId, alId, alId, altId, altId]
  );

  if (existingRows.length > 0) {
    return existingRows[0].id;
  }

  const [insertResult] = await db.promise().query(
    `
      INSERT INTO kategoria_kapcsolo
        (modul_id, fokategoria_id, alkategoria_id, altema_id)
      VALUES (?, ?, ?, ?)
    `,
    [cleanModulId, foId, alId, altId]
  );

  return insertResult.insertId;
}

module.exports = {
  resolveKategoriaKapcsoloId
};