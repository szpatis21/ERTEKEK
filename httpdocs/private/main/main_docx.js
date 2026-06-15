function safeFileName(name) {
  return String(name || 'ertekeles.docx')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim() || 'ertekeles.docx';
}

function parseFileNameFromDisposition(disposition) {
  if (!disposition) return null;

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch (_) {
      return utf8Match[1].trim();
    }
  }

  const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
  return plainMatch ? plainMatch[1].trim() : null;
}

function getActiveKitoltesId(meglevok = null) {
  const fromCard = meglevok?.dataset?.kitoltesId || meglevok?.dataset?.id;
  if (fromCard) return fromCard;

  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('kitoltes_id') || params.get('idk');
  if (fromUrl) return fromUrl;

  const selected = document.querySelector('.meglevok.kijelolt, .meglevok.aktiv, .meglevok[data-kitoltes-id]');
  return selected?.dataset?.kitoltesId || selected?.dataset?.id || null;
}

function getChartImage() {
  const canvas = document.getElementById('fokategoriaChart')
    || document.getElementById('szummChart')
    || document.querySelector('canvas');

  if (!canvas || typeof canvas.toDataURL !== 'function') return '';

  try {
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.warn('A diagram képként történő exportja nem sikerült:', error);
    return '';
  }
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeFileName(filename || 'ertekeles.docx');
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function generateDocxTemplateExport(meglevok = null) {
  const kitoltesId = getActiveKitoltesId(meglevok);

  if (!kitoltesId) {
    alert('Nem található a kitöltés azonosítója a DOCX exporthoz.');
    return;
  }

  document.body.style.cursor = 'wait';

  try {
    const response = await fetch('/api/export-docx-template', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        kitoltesId,
        chartImage: getChartImage()
      })
    });

    if (!response.ok) {
      let message = 'DOCX export hiba történt.';
      try {
        const data = await response.json();
        if (data?.message) message = data.message;
      } catch (_) {}
      throw new Error(message);
    }

    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition');
    const filename = parseFileNameFromDisposition(disposition) || 'ertekeles.docx';
    triggerDownload(blob, filename);
  } catch (error) {
    console.error('DOCX export hiba:', error);
    alert(error.message || 'Hiba történt a DOCX export során.');
  } finally {
    document.body.style.cursor = 'default';
  }
}
