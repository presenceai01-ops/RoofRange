import { useState } from 'react';
import AdminLeads from './AdminLeads';
import AdminPricing from './AdminPricing';
import AdminBranding from './AdminBranding';
import AdminLogin from './AdminLogin';
import { ADMIN_SESSION_KEY } from '../admin-config';

type AdminTab = 'leads' | 'pricing' | 'branding';

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem(ADMIN_SESSION_KEY) === 'authenticated'
  );
  const [activeTab, setActiveTab] = useState<AdminTab>('leads');

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setAuthenticated(false);
  };

  if (!authenticated) {
    return <AdminLogin onLogin={() => setAuthenticated(true)} />;
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-header-left">
          <span className="admin-logo">🔧</span>
          <h1 className="admin-title">RoofRange Admin</h1>
        </div>
        <div className="admin-header-right">
          <a href="/" className="admin-link">← View Site</a>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <nav className="admin-nav">
        <button
          className={`admin-nav-btn ${activeTab === 'leads' ? 'active' : ''}`}
          onClick={() => setActiveTab('leads')}
        >
          📋 Leads
        </button>
        <button
          className={`admin-nav-btn ${activeTab === 'pricing' ? 'active' : ''}`}
          onClick={() => setActiveTab('pricing')}
        >
          💰 Pricing
        </button>
        <button
          className={`admin-nav-btn ${activeTab === 'branding' ? 'active' : ''}`}
          onClick={() => setActiveTab('branding')}
        >
          🎨 Branding
        </button>
      </nav>

      <main className="admin-content">
        {activeTab === 'leads' && <AdminLeads />}
        {activeTab === 'pricing' && <AdminPricing />}
        {activeTab === 'branding' && <AdminBranding />}
      </main>
    </div>
  );
}