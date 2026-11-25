// Saisonplan-Daten. Hier ändern, wenn sich Termine verschieben – sonst nichts anfassen nötig.
window.PLAN = {
  asOf: '25.11.2026',
  player: {
    name: 'Leo Woborsky', number: 19, position: 'Stürmer',
    club: 'Pioneers Vorarlberg', league: 'win2day ICE Hockey League',
    homeVenue: 'Vorarlberghalle Feldkirch'
  },
  range: { start: '2026-12-01', end: '2027-09-01' },

  // Standard-Phasen. Leo/Coach können sie im Kalender unter „Planung anpassen“ ändern;
  // diese Werte gelten nur, bis dort etwas gespeichert wurde (oder nach „Standard wiederherstellen“).
  phases: [
    { key: 'saison', from: '2026-12-01', to: '2027-02-28' },
    { key: 'urlaub', from: '2027-03-01', to: '2027-03-14' },
    { key: 'camp',   from: '2027-03-15', to: '2027-03-28' },
    { key: 'trans',  from: '2027-03-29', to: '2027-03-31' },
    { key: 'sommer', from: '2027-04-01', to: '2027-09-01' }
  ],
  aprilCampDefault: '2027-04-12',
  // Kürzel: [Name, Stadt, Badge-Text]. Logo-Datei: logos/<KÜRZEL>.png
  teams: {
    IBK: ['HC TWK Innsbruck', 'Innsbruck', 'IBK'],
    HCP: ['HC Pustertal Wölfe', 'Bruneck', 'HCP'],
    OLI: ['HK Olimpija Ljubljana', 'Ljubljana', 'OLI'],
    VSV: ['EC VSV Villach', 'Villach', 'VSV'],
    VIC: ['Vienna Capitals', 'Wien', 'VIC'],
    AVS: ['Fehérvár AV19', 'Székesfehérvár', 'AV19'],
    KAC: ['EC-KAC Klagenfurt', 'Klagenfurt', 'KAC'],
    HCB: ['HCB Südtirol Alperia', 'Bozen', 'HCB'],
    MIL: ['HC Milano', 'Mailand', 'MIL'],
    RBS: ['EC Red Bull Salzburg', 'Salzburg', 'RBS'],
    G99: ['Graz99ers', 'Graz', 'G99'],
    BWL: ['Black Wings Linz', 'Linz', 'BWL'],
    FTC: ['FTC Budapest', 'Budapest', 'FTC']
  },

  // [Datum, Uhrzeit, H = Heim / A = Auswärts, Gegner-Kürzel]
  games: [
    ['2026-12-04', '19:30', 'H', 'IBK'], ['2026-12-06', '18:00', 'A', 'HCP'],
    ['2026-12-12', '16:00', 'A', 'OLI'], ['2026-12-13', '17:30', 'A', 'VSV'],
    ['2026-12-16', '19:30', 'H', 'VIC'], ['2026-12-18', '19:15', 'A', 'AVS'],
    ['2026-12-20', '17:30', 'A', 'KAC'], ['2026-12-22', '19:30', 'H', 'HCB'],
    ['2026-12-26', '18:00', 'H', 'MIL'], ['2026-12-28', '19:15', 'A', 'IBK'],
    ['2026-12-30', '19:30', 'H', 'HCP'], ['2027-01-02', '17:00', 'A', 'MIL'],
    ['2027-01-03', '16:00', 'A', 'HCB'], ['2027-01-06', '16:30', 'A', 'RBS'],
    ['2027-01-09', '19:30', 'H', 'VSV'], ['2027-01-10', '17:00', 'H', 'AVS'],
    ['2027-01-17', '17:00', 'H', 'VIC'], ['2027-01-22', '19:30', 'H', 'G99'],
    ['2027-01-24', '15:00', 'A', 'VSV'], ['2027-01-27', '19:15', 'A', 'KAC'],
    ['2027-02-03', '19:30', 'H', 'BWL'], ['2027-02-06', '17:30', 'A', 'G99'],
    ['2027-02-07', '17:30', 'A', 'VIC'], ['2027-02-17', '19:30', 'H', 'FTC'],
    ['2027-02-19', '19:30', 'H', 'RBS'], ['2027-02-21', '15:30', 'A', 'FTC'],
    ['2027-02-24', '19:15', 'H', 'KAC']
  ]
};
