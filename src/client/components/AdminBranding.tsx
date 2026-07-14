import { useState, useEffect } from 'react';

export default function AdminBranding() {
  const [name, setName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [phone, setPhone] = useState('');
  const [disclaimer, setDisclaimer] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/config/demo');
        const data = await res.json();
        if (data.company) {
          setName(data.company.name || '');
          setPrimaryColor(data.company.primary_color || '#3b82f6');
          setPhone(data.company.phone || '');
          setDisclaimer(data.company.disclaimer_text || '');
        }
      } catch {
        // ignore
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'roofrange-admin-2026',
          name,
          primary_color: primaryColor,
          phone,
          disclaimer_text: disclaimer,
        }),
      });
      if (res.ok) {
        setMessage('Branding saved! Refresh to see changes.');
      } else {
        setMessage('Failed to save');
      }
    } catch {
      setMessage('Network error');
    }
    setSaving(false);
  };

  return (
    <div className="admin-branding">
      <div className="admin-section-header">
        <h2>Branding Settings</h2>
        <p className="admin-section-desc">Customize how your company appears on the estimate page.</p>
      </div>

      <div className="branding-form">
        <div className="form-group">
          <label className="form-label" htmlFor="company-name">Company Name</label>
          <input id="company-name" type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="primary-color">Primary Color</label>
          <div className="color-input-row">
            <input id="primary-color" type="color" className="color-picker" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} />
            <span className="color-hex">{primaryColor}</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="company-phone">Phone Number</label>
          <input id="company-phone" type="text" className="form-input" value={phone} onChange={e => setPhone(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="disclaimer-text">Disclaimer Text</label>
          <textarea id="disclaimer-text" className="form-input form-textarea" value={disclaimer} onChange={e => setDisclaimer(e.target.value)} rows={3} />
        </div>
      </div>

      {message && <div className="admin-message">{message}</div>}

      <button className="btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Branding'}
      </button>
    </div>
  );
}