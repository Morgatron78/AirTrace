// Pure unit conversions/formatters, no React/DB — mirrors dates.js's own
// style. Every place weight or height gets displayed goes through one of
// these, per the design principle already used for formatClock: store the
// real number, convert only at the display layer.

const KG_TO_LB = 2.2046226218

export function kgToLb(kg) { return kg * KG_TO_LB }
export function lbToKg(lb) { return lb / KG_TO_LB }

export function toStonePounds(lb) {
  const totalLb = Math.round(lb)
  const stone = Math.floor(totalLb / 14)
  const remainder = totalLb % 14
  return `${stone}st ${remainder}lb`
}

// unit: 'stlb' | 'kg' — the one place this branch lives, so the Settings
// toggle stays a one-function change rather than touching every call site.
export function formatWeightKg(kg, unit) {
  return unit === 'kg' ? `${kg.toFixed(1)} kg` : toStonePounds(kgToLb(kg))
}

export function cmToFeetInches(cm) {
  const totalInches = Math.round(cm / 2.54)
  const feet = Math.floor(totalInches / 12)
  const inches = totalInches % 12
  return { feet, inches }
}

export function feetInchesToCm(feet, inches) {
  return (feet * 12 + inches) * 2.54
}

// BMI is a fixed function of weight and height — always computed here,
// never read from Apple Health's own separate BMI channel, which has
// confirmed independent glitches unrelated to the weight channel itself.
export function bmiFromWeightKg(kg, heightCm) {
  const heightM = heightCm / 100
  return kg / (heightM * heightM)
}
