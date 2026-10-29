// Reglas de cálculo compartidas: las usan la web (index.html) y el parte de Telegram (parte.js).
// Aquí están las notas de surf y bugui, las 4 condiciones del radar y las frases de consejo.
(function (root) {
  var DIAS_VISTA = 7, H0 = 7, H1 = 20, NH = H1 - H0 + 1;
  var DIR8 = ['Norte', 'Nordeste', 'Levante', 'Solano (SE)', 'Sur', 'Lebeche (SO)', 'Poniente', 'Noroeste'];
  var TL = { tierra: 'de tierra', lateral: 'lateral', mar: 'de mar' };
  var CIELO = { sol: 'Despejado', parcial: 'Nubes y claros', nublado: 'Nublado', niebla: 'Niebla', lluvia: 'Lluvia', tormenta: 'Tormenta' };

  function nombreDir(g) { return DIR8[Math.round(((g % 360) + 360) % 360 / 45) % 8]; }
  function distAng(a, b) { var d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }
  function f1(x) { return (Math.round(x * 10) / 10).toString().replace('.', ','); }
  function f0(x) { return Math.round(x).toString(); }
  function hh(h) { return (h < 10 ? '0' : '') + h; }
  function hm(min) { var t = Math.round(min); return hh(Math.floor(t / 60) % 24) + ':' + hh(t % 60); }
  function rango(v) { return v ? hh(v[0]) + '–' + hh(v[1]) + ' h' : ''; }

  // ---------- Cálculo ----------
  function baseEstrellas(pw) {
    var th = [0, 0.8, 2, 4.5, 8, 14];
    if (pw >= th[5]) return 5;
    for (var i = 0; i < 5; i++) if (pw < th[i + 1]) return i + (pw - th[i]) / (th[i + 1] - th[i]);
    return 5;
  }
  function tipoViento(p, wdir) {
    var d = distAng(wdir, (p.orienta + 180) % 360);
    return d <= 50 ? 'tierra' : d <= 100 ? 'lateral' : 'mar';
  }
  function factorViento(p, kn, wdir) {
    var t = tipoViento(p, wdir);
    if (t === 'tierra') return kn <= 18 ? 1 : kn <= 25 ? 0.8 : 0.5;
    if (t === 'lateral') return kn <= 8 ? 0.95 : kn <= 14 ? 0.75 : 0.5;
    return kn <= 4 ? 0.9 : kn <= 9 ? 0.6 : kn <= 15 ? 0.4 : 0.2;
  }
  function factorDir(p, dir) {
    var a = p.swellDir[0], b = p.swellDir[1];
    if (dir >= a && dir <= b) return 1;
    var d = Math.min(distAng(dir, a), distAng(dir, b));
    return Math.max(0, 1 - d / 40);
  }
  function factorMarea(p, nivel) {
    var lo = p.marea.mejor[0], hi = p.marea.mejor[1];
    if (nivel >= lo && nivel <= hi) return 1;
    var exceso = nivel > hi ? nivel - hi : lo - nivel;
    return Math.max(0.3, 1 - exceso * 0.7);
  }
  function r05(x) { return Math.round(x * 2) / 2; }
  // Surf: con olas pequeñas y poca potencia se disfruta. Bugui: pide 1 m o más, buen periodo y potencia.
  function evalHora(p, o) {
    var pw = 0.5 * o.h * o.h * o.T * p.factor;
    var comun = factorDir(p, o.dir) * factorViento(p, o.kn, o.wdir) * factorMarea(p, o.nivel);
    var fh = o.h >= 1 ? 1 : Math.max(0, (o.h - 0.5) / 0.5);
    var ft = o.T >= 9 ? 1 : o.T >= 7 ? 0.7 : 0.4;
    return {
      surf: r05(baseEstrellas(pw * 1.6) * comun),
      bb: r05(baseEstrellas(pw * 0.8) * comun * fh * ft),
      potencia: pw, tipo: tipoViento(p, o.wdir)
    };
  }

  function mareas(nivel) {
    var out = [];
    for (var i = 1; i < nivel.length - 1; i++) {
      var a = nivel[i - 1], b = nivel[i], c = nivel[i + 1];
      if (a == null || b == null || c == null) continue;
      var alta = b > a && b >= c, baja = b < a && b <= c;
      if (!alta && !baja) continue;
      var den = a - 2 * b + c, off = den ? 0.5 * (a - c) / den : 0;
      out.push({ tipo: alta ? 'pleamar' : 'bajamar', min: (i + off) * 60, nivel: b - 0.25 * (a - c) * off });
    }
    return out;
  }

  function categoriaCielo(code) {
    if (code <= 1) return 'sol';
    if (code === 2) return 'parcial';
    if (code === 3) return 'nublado';
    if (code === 45 || code === 48) return 'niebla';
    if (code >= 95) return 'tormenta';
    return 'lluvia';
  }

  function procesar(p, mar, vie) {
    var hm_ = mar.hourly, hv = vie.hourly, n = hm_.time.length, horas = [];
    for (var i = 0; i < n; i++) {
      var h = hm_.swell_wave_height[i], T = hm_.swell_wave_period[i], dir = hm_.swell_wave_direction[i];
      if (h == null || T == null) { h = hm_.wave_height[i]; T = hm_.wave_period[i]; dir = hm_.wave_direction[i]; }
      horas.push({
        t: hm_.time[i], dia: Math.floor(i / 24), hora: i % 24,
        h: h || 0, T: T || 0, dir: dir == null ? 270 : dir,
        kn: hv.wind_speed_10m[i] || 0, wdir: hv.wind_direction_10m[i] || 0, racha: hv.wind_gusts_10m[i] || 0,
        presion: hv.pressure_msl[i], nivel: hm_.sea_level_height_msl[i] == null ? 0 : hm_.sea_level_height_msl[i],
        temp: hv.temperature_2m[i], cielo: categoriaCielo(hv.weather_code[i] || 0), pp: hv.precipitation_probability[i] || 0,
        noche: hv.is_day[i] === 0, agua: hm_.sea_surface_temperature ? hm_.sea_surface_temperature[i] : null
      });
    }
    horas.forEach(function (x) { x.ev = evalHora(p, x); });
    return { p: p, horas: horas, mareas: mareas(horas.map(function (x) { return x.nivel; })), fechas: horas.filter(function (x) { return x.hora === 12; }).map(function (x) { return x.t.slice(0, 10); }) };
  }

  function ventana(hs, key) {
    var mejor = hs.reduce(function (m, x) { return !m || x.ev[key] > m.ev[key] ? x : m; }, null);
    if (mejor.ev[key] < 1) return { mejor: mejor, v: null };
    var ini = mejor.hora, fin = mejor.hora, u = mejor.ev[key] - 0.5, byH = {};
    hs.forEach(function (x) { byH[x.hora] = x; });
    while (byH[ini - 1] && byH[ini - 1].ev[key] >= u) ini--;
    while (byH[fin + 1] && byH[fin + 1].ev[key] >= u) fin++;
    return { mejor: mejor, v: [ini, fin + 1] };
  }
  function resumenDia(b, d) {
    var hs = b.horas.filter(function (x) { return x.dia === d && x.hora >= H0 && x.hora <= H1; });
    var s = ventana(hs, 'surf'), g = ventana(hs, 'bb');
    var top = g.mejor.ev.bb > s.mejor.ev.surf ? g.mejor : s.mejor;
    return { horas: hs, ms: s.mejor, mb: g.mejor, vs: s.v, vb: g.v, top: top, nota: Math.max(s.mejor.ev.surf, g.mejor.ev.bb) };
  }


  function nombreDia(fecha, i) {
    if (i === 0) return 'Hoy';
    return new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
  }
  function fechaLarga(fecha, i) {
    var s = new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    return i === 0 ? 'hoy, ' + s : s;
  }


  var UMBRAL = { tam: 1, per: 10, pot: 4, vMedio: 12, vFuerte: 18 };
  function esLevanteOSur(g) { var i = Math.round(((g % 360) + 360) % 360 / 45) % 8; return i === 2 || i === 4; }
  function condiciones(x) {
    return {
      tam: x.h >= UMBRAL.tam,
      per: x.T >= UMBRAL.per,
      pot: x.ev.potencia >= UMBRAL.pot,
      vie: x.kn <= UMBRAL.vMedio || (x.kn <= UMBRAL.vFuerte && esLevanteOSur(x.wdir))
    };
  }
  function contar(c) { return (c.tam ? 1 : 0) + (c.per ? 1 : 0) + (c.pot ? 1 : 0) + (c.vie ? 1 : 0); }
  function condDia(b, d) {
    var hs = resumenDia(b, d).horas, max = 0, rep = null;
    hs.forEach(function (x) {
      var c = condiciones(x);
      x.nc = c.tam || c.pot ? contar(c) : 0; // sin tamaño ni fuerza no hay ola, aunque el periodo y el viento cuadren
      if (x.nc > max || (x.nc === max && rep && x.ev.potencia > rep.ev.potencia)) { max = x.nc; rep = x; }
    });
    if (max < 2) return null;
    var i = hs.indexOf(rep), ini = i, fin = i;
    while (ini > 0 && hs[ini - 1].nc >= max) ini--;
    while (fin < hs.length - 1 && hs[fin + 1].nc >= max) fin++;
    return { n: max, rep: rep, c: condiciones(rep), v: [hs[ini].hora, hs[fin].hora + 1] };
  }

  function tramos(hs, claveFn, etiquetaFn) {
    var out = [];
    hs.forEach(function (x) {
      var k = claveFn(x), u = out[out.length - 1];
      if (u && u.k === k) u.fin = x.hora; else out.push({ k: k, label: etiquetaFn(x), ini: x.hora, fin: x.hora });
    });
    return out;
  }

  // Qué tabla llevarse: la frase que resume el día de esa playa.
  function consejo(b, r) {
    var s = r.ms.ev.surf, g = r.mb.ev.bb, p = b.p, t, q;
    if (s < 2 && g < 2) return '<b>Flojo.</b> Ola muy pequeña o con el viento y la marea en contra: hoy no merece la pena.';
    if (g >= 3) {
      q = r.mb;
      t = (s >= 3 ? '<b>Buen día para los dos.</b> ' : '') + '<b>Llévate el bugui</b>: tiene tamaño y fuerza (' + f1(q.h) + ' m a ' + f0(q.T) + ' s), mejor ' + rango(r.vb) + '.';
      if (s >= 3) t += ' El surf también funciona: ' + rango(r.vs) + '.';
    } else if (g >= 2) {
      q = r.mb;
      t = '<b>Bugui aceptable</b> ' + rango(r.vb) + ', sin pasarse de fuerza. Para surf ' + (s >= 2 ? 'va mejor: ' + rango(r.vs) + '.' : 'queda corto.');
    } else {
      q = r.ms;
      t = '<b>Pequeñito y con poca fuerza: mejor la tabla de surf</b>' + (r.vs ? ' (' + rango(r.vs) + ')' : '') + '. El bugui se queda corto.';
    }
    if (q.nivel > p.marea.mejor[1] || q.nivel < p.marea.mejor[0]) t += ' Ojo: a esa hora la marea no es la buena aquí.';
    return t;
  }


  function pedir(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }); }
  function cargar(playas) {
    var tz = '&timezone=Europe%2FMadrid&forecast_days=' + DIAS_VISTA;
    return Promise.all(playas.map(function (p) {
      var u1 = 'https://marine-api.open-meteo.com/v1/marine?latitude=' + p.marino.lat + '&longitude=' + p.marino.lon + '&hourly=swell_wave_height,swell_wave_period,swell_wave_direction,wave_height,wave_period,wave_direction,sea_level_height_msl,sea_surface_temperature' + tz;
      var u2 = 'https://api.open-meteo.com/v1/forecast?latitude=' + p.viento.lat + '&longitude=' + p.viento.lon + '&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,temperature_2m,weather_code,precipitation_probability,is_day&wind_speed_unit=kn' + tz;
      return Promise.all([pedir(u1), pedir(u2)]).then(function (r) { return procesar(p, r[0], r[1]); });
    }));
  }


  root.Olas = { DIAS_VISTA, H0, H1, NH, DIR8, TL, CIELO, nombreDir, distAng, f1, f0, hh, hm, rango, evalHora, mareas, procesar, ventana, resumenDia, nombreDia, fechaLarga, UMBRAL, condiciones, contar, condDia, tramos, consejo, cargar };
})(typeof window !== 'undefined' ? window : globalThis);
