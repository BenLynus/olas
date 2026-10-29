// Aviso de olas por Telegram. Solo escribe cuando se acercan olas: si ninguna playa cumple 2 o más de las 4
// condiciones (tamaño, periodo, fuerza, viento) en los próximos días, no manda nada.
// Usa las mismas reglas que la web (nucleo.js y playas.js).
//
//   node parte.js            -> escribe el aviso en pantalla y, si hay credenciales y son las 10:00 en Madrid, lo envía.
//   FORZAR=1 node parte.js   -> lo envía a cualquier hora; si no hay olas, manda un mensaje de prueba.
//
// Credenciales (nunca en el código): TELEGRAM_TOKEN y TELEGRAM_CHAT_ID, como variables de entorno o secretos de GitHub.
require('./playas.js');
require('./nucleo.js');
const O = globalThis.Olas;
const { f1, f0, rango, nombreDir, fechaLarga } = O;

const HORA_ENVIO = 10; // hora de Madrid
const DIAS_AVISO = 6; // hoy y los 5 días siguientes
const NIVEL = { 4: 'Excelente', 3: 'Buena pinta', 2: 'Alertita' };

function cuando(d) { return d === 0 ? 'hoy' : d === 1 ? 'mañana' : `en ${d} días`; }

function construir(datos) {
  const fechas = datos[0].fechas, bloques = [];
  for (let d = 0; d < DIAS_AVISO && d < fechas.length; d++) {
    const filas = datos.map((b) => ({ b, g: O.condDia(b, d) })).filter((x) => x.g)
      .sort((a, c) => c.g.n - a.g.n || c.g.rep.ev.potencia - a.g.rep.ev.potencia);
    if (!filas.length) continue;
    const lineas = [`<b>${fechaLarga(fechas[d], d)}</b>${d ? ` (${cuando(d)})` : ''}`];
    filas.forEach(({ b, g }) => {
      const q = g.rep, c = g.c, m = (ok) => (ok ? '✓' : '✗');
      lineas.push(`• <b>${b.p.nombre}</b>: ${NIVEL[g.n]}, ${g.n} de 4 (${rango(g.v)})`);
      lineas.push(`   ${m(c.tam)} Tamaño ${f1(q.h)} m · ${m(c.per)} Periodo ${f0(q.T)} s · ${m(c.pot)} Fuerza ${f1(q.ev.potencia)} kW/m · ${m(c.vie)} Viento ${f0(q.kn)} kn ${nombreDir(q.wdir).split(' ')[0].toLowerCase()}`);
    });
    bloques.push(lineas.join('\n'));
  }
  return bloques.length ? ['<b>Olas a la vista</b>', '', ...bloques.map((x) => x + '\n')].join('\n').trim() : null;
}

async function enviar(texto) {
  const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: texto, parse_mode: 'HTML', disable_web_page_preview: true })
  });
  if (!r.ok) throw new Error(`Telegram respondió ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

(async () => {
  const datos = await O.cargar(globalThis.PLAYAS);
  const aviso = construir(datos);
  console.log(aviso ? aviso.replace(/<\/?b>/g, '') : 'Sin olas a la vista en los próximos días: no hay nada que avisar.');
  const forzar = !!process.env.FORZAR;
  const texto = aviso || (forzar ? 'Prueba del aviso de olas: la conexión con Telegram funciona. Ahora mismo no hay olas a la vista.' : null);
  if (!texto) return;
  if (!process.env.TELEGRAM_TOKEN || !process.env.TELEGRAM_CHAT_ID) { console.log('\n[sin credenciales de Telegram: no se envía nada]'); return; }
  const hora = +new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Madrid' }).format(new Date());
  if (hora !== HORA_ENVIO && !forzar) { console.log(`\n[son las ${hora} h en Madrid, el aviso sale a las ${HORA_ENVIO}: no se envía]`); return; }
  await enviar(texto);
  console.log('\n[enviado por Telegram]');
})().catch((e) => { console.error(e.message); process.exit(1); });
