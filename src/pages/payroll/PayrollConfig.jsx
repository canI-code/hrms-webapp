import { useState, useEffect } from 'react';
import { getPayrollConfigAPI, updatePayrollConfigAPI } from '../../api/axios';
import { toast } from 'react-toastify';
import { FiDollarSign, FiSave } from 'react-icons/fi';

const PayrollConfig = () => {
  const [form, setForm] = useState({
    pfPercentage: 12, esiPercentage: 1.75, esiGrossLimit: 21000,
    professionalTax: 200, tdsEnabled: true, overtimeMultiplier: 1.5,
    hraPercentage: 40, allowancesPercentage: 10
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getPayrollConfigAPI();
        setForm(res.data);
      } catch { toast.error('Failed to load payroll config'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updatePayrollConfigAPI(form);
      toast.success('Payroll configuration saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <FiDollarSign /> Payroll Configuration
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        {/* Statutory Deductions */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Statutory Deductions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PF (% of Basic)</label>
              <input type="number" step="0.01" value={form.pfPercentage} onChange={e => set('pfPercentage', parseFloat(e.target.value) || 0)}
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ESI (% of Gross)</label>
              <input type="number" step="0.01" value={form.esiPercentage} onChange={e => set('esiPercentage', parseFloat(e.target.value) || 0)}
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ESI Gross Limit (₹)</label>
              <input type="number" value={form.esiGrossLimit} onChange={e => set('esiGrossLimit', parseInt(e.target.value) || 0)}
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
              <p className="text-xs text-gray-400 mt-1">ESI applies only if gross salary ≤ this amount</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Professional Tax (₹/month)</label>
              <input type="number" value={form.professionalTax} onChange={e => set('professionalTax', parseInt(e.target.value) || 0)}
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
        </div>

        {/* Tax Settings */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Tax Settings</h2>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.tdsEnabled} onChange={e => set('tdsEnabled', e.target.checked)} className="rounded text-primary-600" />
            <span className="text-sm text-gray-700">Auto-calculate TDS (Income Tax) based on tax slabs</span>
          </label>
        </div>

        {/* Overtime & Defaults */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Overtime & Defaults</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Overtime Multiplier</label>
              <input type="number" step="0.1" value={form.overtimeMultiplier} onChange={e => set('overtimeMultiplier', parseFloat(e.target.value) || 1)}
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
              <p className="text-xs text-gray-400 mt-1">e.g. 1.5 = 150% of hourly rate</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default HRA (% of Basic)</label>
              <input type="number" step="0.1" value={form.hraPercentage} onChange={e => set('hraPercentage', parseFloat(e.target.value) || 0)}
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Allowances (% of Basic)</label>
              <input type="number" step="0.1" value={form.allowancesPercentage} onChange={e => set('allowancesPercentage', parseFloat(e.target.value) || 0)}
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2.5 rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium">
            <FiSave /> {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PayrollConfig;
