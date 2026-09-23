// Inline SVG icon set (stroke icons, 24×24) and lookup tables for directions, indicators and measures.
const paths = {
  bus: '<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 21v-3M16 21v-3"/><circle cx="8" cy="14.5" r=".8"/><circle cx="16" cy="14.5" r=".8"/>',
  tree: '<path d="M12 21v-6"/><path d="M12 3c-3 0-5 2.4-5 5 0 .8.2 1.5.5 2.1A4 4 0 0 0 9 18h6a4 4 0 0 0 1.5-7.9c.3-.6.5-1.3.5-2.1 0-2.6-2-5-5-5z"/>',
  school:
    '<path d="M3 9l9-5 9 5-9 5-9-5z"/><path d="M7 11v5c0 1.5 2.2 3 5 3s5-1.5 5-3v-5"/><path d="M21 9v6"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
  tool: '<path d="M14.5 5.5a4 4 0 0 0-5 5L4 16l4 4 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-3-1-1-3 2.5-2.5z"/>',
  heart:
    '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M9 11h2l1-2 1 4 1-2h1"/>',
  alert: '<path d="M12 4l9 16H3l9-16z"/><path d="M12 10v4M12 17v.5"/>',
  bolt: '<path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z"/>',
  coin: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  spark:
    '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
  pin: '<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2"/>',
  drop: '<path d="M12 3s-6 6.5-6 11a6 6 0 0 0 12 0c0-4.5-6-11-6-11z"/>',
  wind: '<path d="M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3M3 12h7"/>',
  road: '<path d="M6 21L9 3M18 21L15 3M12 5v2M12 11v2M12 17v2"/>',
  camera: '<rect x="3" y="7" width="13" height="9" rx="2"/><path d="M16 10l5-2v8l-5-2M7 16l-1 4"/>',
  chat: '<path d="M4 5h16v11H9l-5 4V5z"/><path d="M8 10h8M8 13h5"/>',
  light:
    '<rect x="8" y="2" width="8" height="16" rx="3"/><circle cx="12" cy="6" r="1.4"/><circle cx="12" cy="10" r="1.4"/><circle cx="12" cy="14" r="1.4"/><path d="M12 18v4"/>',
  tram: '<rect x="5" y="5" width="14" height="12" rx="3"/><path d="M5 11h14M9 2h6M12 2v3M8 21l2-4M16 21l-2-4"/>',
  flame:
    '<path d="M12 21a6 6 0 0 0 6-6c0-4-3-6-4-10-2 2-3 4-3 6-1-1-1.5-2-1.5-3C7 10 6 12.5 6 15a6 6 0 0 0 6 6z"/>',
  ball: '<circle cx="12" cy="12" r="8"/><path d="M4.5 9.5c3 1 6 1 7.5-5.3M19.5 14.5c-3-1-6-1-7.5 5.3M8 5.5c1 3 4 6 11.5 5"/>',
  walk: '<circle cx="13" cy="4" r="2"/><path d="M11 21l2-6-3-3 1-4 3 3h3M8 13l2-5"/><path d="M3 21h18" stroke-dasharray="2 2"/>',
  pipe: '<path d="M3 8h8v8h10M3 12h4M17 12v8"/><circle cx="11" cy="8" r="1"/>',
  city: '<path d="M3 21V9l5-3v15M8 21V4h8v17M16 21v-9h5v9M11 8h2M11 12h2M11 16h2"/>',
  trophy:
    '<path d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  ai: '<rect x="4" y="6" width="16" height="12" rx="4"/><path d="M12 2v4M9 11v2M15 11v2M2 12h2M20 12h2"/>',
};

export const icon = (name, cls = '') =>
  `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${paths[name] ?? paths.spark}</svg>`;

/** Direction icons in the order of engine `areas`. */
export const areaIcons = ['bus', 'tree', 'school', 'shield', 'tool'];

/** Indicator icons and short plain-language names, keyed by indicator code. */
export const indicatorInfo = {
  T1: { icon: 'road', short: 'Дороги' },
  T2: { icon: 'bus', short: 'Автобусы' },
  E1: { icon: 'tree', short: 'Зелень' },
  E2: { icon: 'wind', short: 'Воздух' },
  S1: { icon: 'school', short: 'Школы' },
  S2: { icon: 'heart', short: 'Поликлиники' },
  B1: { icon: 'camera', short: 'Улицы' },
  B2: { icon: 'walk', short: 'Движение' },
  C1: { icon: 'drop', short: 'ЖКХ' },
  C2: { icon: 'chat', short: 'Обращения' },
};

export const measureIcons = {
  M1: 'bus',
  M2: 'light',
  M3: 'tram',
  M4: 'tree',
  M5: 'flame',
  M6: 'wind',
  M7: 'school',
  M8: 'heart',
  M9: 'ball',
  M10: 'camera',
  M11: 'walk',
  M12: 'chat',
  M13: 'pipe',
  M14: 'tool',
};
