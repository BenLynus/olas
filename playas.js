// Ajustes de cada playa. Este es el archivo que se toca para afinar los avisos.
//
//  marino / viento : punto donde se pide la previsión (mar adentro para el oleaje).
//  orienta         : hacia dónde mira la playa, en grados (270 = oeste). El viento "de tierra"
//                    es el que sopla desde el lado contrario (orienta + 180).
//  swellDir        : [desde, hasta] dirección del mar de fondo que entra bien a la playa.
//  factor          : cuánta energía llega realmente (1 = totalmente expuesta, 0.7 = más protegida).
//  marea.mejor     : [mínimo, máximo] en metros sobre el nivel medio. Fuera de ese tramo
//                    la playa funciona peor (ej. Roche con marea llena se queda en orillera).
//
// Valores iniciales aproximados: hay que corregirlos con lo que se sepa de cada sitio.
(typeof window !== 'undefined' ? window : globalThis).PLAYAS = [
  {
    id: 'santamaria', nombre: 'Santa María del Mar', zona: 'Cádiz',
    marino: { lat: 36.51, lon: -6.33 }, viento: { lat: 36.52, lon: -6.30 },
    orienta: 275, swellDir: [245, 320], factor: 0.8,
    marea: { mejor: [-3, 3], nota: 'Sin preferencia de marea (por ajustar).' }
  },
  {
    id: 'cortadura', nombre: 'Cortadura de Cádiz', zona: 'Cádiz',
    marino: { lat: 36.48, lon: -6.31 }, viento: { lat: 36.49, lon: -6.27 },
    orienta: 250, swellDir: [235, 310], factor: 0.8,
    marea: { mejor: [-3, 3], nota: 'Sin preferencia de marea (por ajustar).' }
  },
  {
    id: 'roche', nombre: 'Roche', zona: 'Conil',
    marino: { lat: 36.32, lon: -6.17 }, viento: { lat: 36.33, lon: -6.14 },
    orienta: 250, swellDir: [235, 310], factor: 0.9,
    marea: { mejor: [-3, 0.3], nota: 'Con marea llena se queda en orillera: se penaliza por encima de +0,3 m.' }
  },
  {
    id: 'barrosa', nombre: 'La Barrosa', zona: 'Chiclana',
    marino: { lat: 36.35, lon: -6.21 }, viento: { lat: 36.36, lon: -6.17 },
    orienta: 240, swellDir: [230, 310], factor: 0.8,
    marea: { mejor: [-3, 3], nota: 'Sin preferencia de marea (por ajustar).' }
  },
  {
    id: 'palmar', nombre: 'El Palmar', zona: 'Vejer',
    marino: { lat: 36.22, lon: -6.12 }, viento: { lat: 36.24, lon: -6.07 },
    orienta: 255, swellDir: [235, 315], factor: 1.0,
    marea: { mejor: [-3, 3], nota: 'Sin preferencia de marea (por ajustar).' }
  }
];
