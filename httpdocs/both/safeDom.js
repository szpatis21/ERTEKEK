export function escapeHTML(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#x27;');
}

export function escapeAttr(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#x27;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}

export function setText(el, value) {
    if (!el) return;
    el.textContent = value ?? '';
}

export function appendTextWithBreaks(parent, value) {
    if (!parent) return;

    const lines = String(value ?? '').split('\n');

    lines.forEach((line, index) => {
        if (index > 0) parent.appendChild(document.createElement('br'));
        parent.appendChild(document.createTextNode(line));
    });
}

export function safeMarkdownLiteToHtml(rawText) {
    if (!rawText) return '';

    const lines = String(rawText).split('\n');
    let html = '';
    let inList = false;

    for (const line of lines) {
        let t = escapeHTML(line.trim());

        // Saját, korlátozott markdown: **félkövér**
        t = t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        if (t.startsWith('* ') || t.startsWith('- ')) {
            if (!inList) {
                html += '<ul style="padding-left:25px;margin:15px 0;border-left:3px solid #ff9800;">';
                inList = true;
            }

            html += `<li style="margin-bottom:8px;padding-left:5px;">${t.substring(2)}</li>`;
            continue;
        }

        if (inList) {
            html += '</ul>';
            inList = false;
        }

        if (t.startsWith('# ')) {
            html += `<h1 style="color:#333;border-bottom:2px solid #ff9800;padding-bottom:5px;margin-top:20px;font-size:1.5em;">${t.substring(2)}</h1>`;
        } else if (t.startsWith('### ')) {
            html += `<h3 style="color:#ff6500;margin-top:15px;font-size:1.2em;">${t.substring(4)}</h3>`;
        } else if (t) {
            html += `<p style="margin:0 0 10px 0;">${t}</p>`;
        } else {
            html += '<br>';
        }
    }

    if (inList) html += '</ul>';

    return html;
}