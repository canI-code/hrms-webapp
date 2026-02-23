/**
 * Calculate monthly income tax (TDS) based on Indian New Tax Regime (FY 2024-25).
 * 
 * Tax Slabs (Annual):
 *   0 - 3,00,000         → Nil
 *   3,00,001 - 7,00,000  → 5%
 *   7,00,001 - 10,00,000 → 10%
 *   10,00,001 - 12,00,000 → 15%
 *   12,00,001 - 15,00,000 → 20%
 *   Above 15,00,000       → 30%
 * 
 * Standard deduction: ₹75,000 under new regime.
 * 
 * @param {number} annualGross - Annual gross salary
 * @returns {number} Monthly TDS (tax deducted at source)
 */
export const calculateMonthlyTax = (annualGross) => {
  const standardDeduction = 75000;
  const taxableIncome = Math.max(0, annualGross - standardDeduction);

  const slabs = [
    { limit: 300000, rate: 0 },
    { limit: 700000, rate: 0.05 },
    { limit: 1000000, rate: 0.10 },
    { limit: 1200000, rate: 0.15 },
    { limit: 1500000, rate: 0.20 },
    { limit: Infinity, rate: 0.30 },
  ];

  let tax = 0;
  let prev = 0;
  for (const slab of slabs) {
    if (taxableIncome <= prev) break;
    const taxableInSlab = Math.min(taxableIncome, slab.limit) - prev;
    tax += taxableInSlab * slab.rate;
    prev = slab.limit;
  }

  // 4% cess on tax
  tax = tax * 1.04;

  // Monthly TDS
  return Math.round(tax / 12);
};

/**
 * Get detailed tax breakdown
 * @param {number} annualGross 
 * @returns {object} Detailed breakdown
 */
export const getTaxBreakdown = (annualGross) => {
  const standardDeduction = 75000;
  const taxableIncome = Math.max(0, annualGross - standardDeduction);

  const slabs = [
    { label: '0 - 3L', limit: 300000, rate: 0 },
    { label: '3L - 7L', limit: 700000, rate: 0.05 },
    { label: '7L - 10L', limit: 1000000, rate: 0.10 },
    { label: '10L - 12L', limit: 1200000, rate: 0.15 },
    { label: '12L - 15L', limit: 1500000, rate: 0.20 },
    { label: 'Above 15L', limit: Infinity, rate: 0.30 },
  ];

  let baseTax = 0;
  let prev = 0;
  const breakdown = [];

  for (const slab of slabs) {
    if (taxableIncome <= prev) {
      breakdown.push({ ...slab, amount: 0, tax: 0 });
    } else {
      const amount = Math.min(taxableIncome, slab.limit) - prev;
      const tax = amount * slab.rate;
      breakdown.push({ ...slab, amount, tax });
      baseTax += tax;
    }
    prev = slab.limit;
  }

  const cess = Math.round(baseTax * 0.04);
  const totalAnnualTax = Math.round(baseTax + cess);
  const monthlyTDS = Math.round(totalAnnualTax / 12);

  return {
    annualGross,
    standardDeduction,
    taxableIncome,
    slabs: breakdown,
    baseTax: Math.round(baseTax),
    cess,
    totalAnnualTax,
    monthlyTDS,
  };
};
