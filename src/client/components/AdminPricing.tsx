import { useState, useEffect } from 'react';

const MATERIALS = [
  { key: 'asphalt', label: 'Asphalt Shingle' },
  { key: 'metal', label: 'Metal' },
  { key: 'tile', label: 'Tile/Clay' },
  { key: 'flat', label: 'Flat/Membrane' },
];

interface PricingRow {
  material: string;
  price_low: number;
  price_mid: number;
  price_high: number;
}

export default function AdminPricing() {
  const [rows, setRows] = useState<PricingRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/config/demo');
        const data = await res.json();
        if (data.pricing) {
          setRows(data.pricing.map((p: any) => ({
            material: p.material,
            price_low: Number(p.price_low),
            price_mid: Number(p.price_mid),
            price_high: Number(p.price_high),
          })));
        }
      } catch {
        setRows(MATERIALS.map(m => ({ material: m.key, price_low: 0, price_mid: 0, price_high: 0 })));
      }
    }
    load();
  }, []);

  const updateRow = (material: string, field: 'price_low' | 'price_mid' | 'price_high', value: string) => {
    setRows(prev => prev.map(r =>
      r.material === material ? { ...r, [field]: Number(value) || 0 } : r
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'roofrange-admin-2026',
          pricing: rows,
        }),
      });
      if (res.ok) {
        setMessage('Pricing saved successfully!');
      } else {
        setMessage('Failed to save pricing');
      }
    } catch {
      setMessage('Network error');
    }
    setSaving(false);
  };

  return (
    <div className="admin-pricing">
      <div className="admin-section-header">
        <h2>Pricing Configuration</h2>
        <p className="admin-section-desc">Set the cost per square (100 sqft) for each material type.</p>
      </div>

      <div className="pricing-table-wrapper">
        <table className="admin-table pricing-table">
          <thead>
            <tr>
              <th>Material</th>
              <th>Low ($/sq)</th>
              <th>Typical ($/sq)</th>
              <th>High ($/sq)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.material}>
                <td className="td-material">{MATERIALS.find(m => m.key === row.material)?.label || row.material}</td>
                <td><input type="number" className="pricing-input" value={row.price_low} onChange={e => updateRow(row.material, 'price_low', e.target.value)} /></td>
                <td><input type="number" className="pricing-input" value={row.price_mid} onChange={e => updateRow(row.material, 'price_mid', e.target.value)} /></td>
                <td><input type="number" className="pricing-input" value={row.price_high} onChange={e => updateRow(row.material, 'price_high', e.target.value)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {message && <div className="admin-message">{message}</div>}

      <button className="btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Pricing'}
      </button>
    </div>
  );
}