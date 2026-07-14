import { useState, useEffect, Fragment } from 'react';
import { DEFAULT_COMPANY_SLUG } from '../config';

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  footprint_sqft: number;
  roof_surface_sqft: number;
  pitch_label: string;
  material: string;
  condition: string;
  stories: number;
  price_range_low: number;
  price_range_high: number;
  status: string;
  created_at: string;
  polygons_json: string;
}

const STATUS_NAMES: Record<string, string> = {
  new: 'New', contacted: 'Contacted', quoted: 'Quoted', won: 'Won', lost: 'Lost',
};

export default function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { loadLeads(); }, []);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${DEFAULT_COMPANY_SLUG}?token=roofrange-admin-2026`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setLeads(data.leads || []);
    } catch {
      setError('Failed to load leads.');
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    } catch { /* ignore */ }
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return d; }
  };

  const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

  if (loading) return <div className="admin-loading">Loading leads...</div>;
  if (error) return <div className="admin-error">{error}</div>;

  return (
    <div className="admin-leads">
      <div className="admin-section-header">
        <h2>Leads ({leads.length})</h2>
        <button className="btn-secondary btn-small" onClick={loadLeads}>↻ Refresh</button>
      </div>

      {leads.length === 0 ? (
        <div className="admin-empty-state">
          <p>No leads yet. Share your RoofRange link to start collecting leads.</p>
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Sq Ft</th>
                <th>Estimate</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => (
                <Fragment key={lead.id}>
                  <tr className="admin-table-row" onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}>
                    <td className="td-name">{lead.name}</td>
                    <td className="td-contact">
                      {lead.phone && <div>{lead.phone}</div>}
                      {lead.email && <div className="contact-email">{lead.email}</div>}
                    </td>
                    <td>{Math.round(lead.roof_surface_sqft || lead.footprint_sqft).toLocaleString()}</td>
                    <td className="td-estimate">{fmt(lead.price_range_low)} – {fmt(lead.price_range_high)}</td>
                    <td>
                      <select
                        className={`status-dropdown status-${lead.status}`}
                        value={lead.status}
                        onClick={e => e.stopPropagation()}
                        onChange={e => updateStatus(lead.id, e.target.value)}
                      >
                        {Object.entries(STATUS_NAMES).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="td-date">{formatDate(lead.created_at)}</td>
                  </tr>
                  {expandedId === lead.id && (
                    <tr className="admin-detail-row">
                      <td colSpan={6}>
                        <div className="admin-detail-content">
                          <div className="detail-grid">
                            <div><strong>Address:</strong> {lead.address || 'N/A'}</div>
                            <div><strong>Roof pitch:</strong> {lead.pitch_label || 'N/A'}</div>
                            <div><strong>Material:</strong> {lead.material || 'N/A'}</div>
                            <div><strong>Condition:</strong> {lead.condition || 'N/A'}</div>
                            <div><strong>Stories:</strong> {lead.stories || 'N/A'}</div>
                            <div><strong>Footprint:</strong> {lead.footprint_sqft ? `${Math.round(lead.footprint_sqft).toLocaleString()} sqft` : 'N/A'}</div>
                            <div><strong>Surface:</strong> {lead.roof_surface_sqft ? `${Math.round(lead.roof_surface_sqft).toLocaleString()} sqft` : 'N/A'}</div>
                            <div><strong>Polygons:</strong> {lead.polygons_json && lead.polygons_json !== '[]' ? 'Yes' : 'No'}</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}