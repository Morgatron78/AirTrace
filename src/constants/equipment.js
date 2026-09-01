// Your machine is on fixed pressure, not auto-titrating, so pressure
// stats/copy throughout reflect that rather than assuming an APAP-style
// range.
export const EQUIPMENT = {
  machine: {
    brand: 'ResMed', model: 'AirSense 10 Elite', serial: '23251368459', lastSynced: '29 Aug 2026 · 08:52', filterChanged: '2026-07-02',
    settingsDate: '31 Dec 2025',
    mode: 'CPAP',
    epr: 'Full time', eprLevel: 3,
    humidityLevel: 4,
    ramp: 'Off',
    antibacterialFilter: 'No',
    climateControl: 'Auto',
    essentials: 'Plus',
    humidifier: 'On',
  },
  mask: { brand: 'ResMed', model: 'AirFit F40', cushionSize: 'Medium', cushionChanged: '2026-08-05', lastCleaned: '2026-08-27', headgearWashed: '2026-08-14' },
  pressureMode: 'fixed',
  fixedPressure: 10,
}

export const DEFAULT_TARGETS = { ahi: 5, leak: 24, usage: 4, compliance: 70, maskOff: 2, bedtime: 22.5 }
