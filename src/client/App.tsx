import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_COMPANY_SLUG, GOOGLE_MAPS_API_KEY } from './config';
import AddressStep from './components/AddressStep';
import MapStep from './components/MapStep';
import QuestionsStep from './components/QuestionsStep';
import EstimateStep from './components/EstimateStep';
import LeadCaptureStep from './components/LeadCaptureStep';
import AdminDashboard from './components/AdminDashboard';

type Step = 'address' | 'map' | 'questions' | 'estimate' | 'lead-capture';

interface WizardData {
  address?: string;
  lat?: number;
  lng?: number;
  polygons_json?: string;
  footprint_sqft?: number;
  pitchLabel?: string;
  pitchDegrees?: number;
  stories?: number;
  material?: string;
  condition?: string;
  price_range_low?: number;
  price_range_high?: number;
  roof_surface_sqft?: number;
}

const TOTAL_STEPS = 5;

function App() {
  // Route to admin dashboard if path starts with /admin
  const isAdmin = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

  if (isAdmin) {
    return <AdminDashboard />;
  }

  const [step, setStep] = useState<Step>('address');
  const [data, setData] = useState<WizardData>({});
  const [companyName, setCompanyName] = useState('RoofRange');
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [disclaimer, setDisclaimer] = useState('Final price requires on-site inspection.');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [mapsReady, setMapsReady] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch(`/api/config/${DEFAULT_COMPANY_SLUG}`);
        if (res.ok) {
          const config = await res.json();
          if (config.company) {
            setCompanyName(config.company.name);
            setPrimaryColor(config.company.primary_color || '#3b82f6');
            setDisclaimer(config.company.disclaimer_text || 'Final price requires on-site inspection.');
            setPhone(config.company.phone || '');
          }
        }
      } catch (e) {
        console.warn('Could not load config:', e);
      }
      setLoading(false);
    }
    loadConfig();
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--color-primary', primaryColor);
  }, [primaryColor]);

  // Poll until Google Maps API is loaded (more reliable than callback)
  useEffect(() => {
    if (GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') return;

    // Check if already loaded
    if (typeof google !== 'undefined' && google.maps) {
      setMapsReady(true);
      return;
    }

    // Load the script if not already loading
    if (!document.getElementById('google-maps-script')) {
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&loading=async`;
      script.async = true;
      script.defer = true;
      script.onerror = () => console.error('Google Maps API failed to load');
      document.head.appendChild(script);
    }

    // Poll for Maps API availability
    const interval = setInterval(() => {
      if (typeof google !== 'undefined' && google.maps && google.maps.places) {
        setMapsReady(true);
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  const progressPercent = (() => {
    const stepOrder: Step[] = ['address', 'map', 'questions', 'estimate', 'lead-capture'];
    const idx = stepOrder.indexOf(step);
    return ((idx) / (TOTAL_STEPS - 1)) * 100;
  })();

  const stepNumber = (() => {
    const stepOrder: Step[] = ['address', 'map', 'questions', 'estimate', 'lead-capture'];
    return stepOrder.indexOf(step) + 1;
  })();

  const submitLead = useCallback(async (contact: { name: string; phone: string; email: string }) => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const payload = {
        company_id: 'demo-company-id',
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        address: data.address || '',
        lat: data.lat || 0,
        lng: data.lng || 0,
        polygons_json: data.polygons_json || '[]',
        footprint_sqft: data.footprint_sqft || 0,
        roof_surface_sqft: data.roof_surface_sqft || 0,
        pitch_label: data.pitchLabel || '',
        pitch_degrees: data.pitchDegrees || 0,
        stories: data.stories || 1,
        material: data.material || '',
        condition: data.condition || '',
        price_range_low: data.price_range_low || 0,
        price_range_high: data.price_range_high || 0,
      };
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to submit lead');
    } catch (e) {
      console.error('Lead submission error:', e);
      setSubmitError('Something went wrong saving your estimate.');
    } finally {
      setSubmitting(false);
    }
  }, [data]);

  if (loading) {
    return (
      <div className="app-shell">
        <header className="app-header">
          <div className="header-content">
            <span className="app-logo">🏠</span>
            <span className="app-name">RoofRange</span>
          </div>
        </header>
        <main className="app-main">
          <div className="loading-screen">
            <div className="loading-spinner">⏳</div>
            <p>Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-content">
          <span className="app-logo">🏠</span>
          <span className="app-name">{companyName}</span>
          {phone && <a href={`tel:${phone}`} className="header-phone">{phone}</a>}
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${progressPercent}%` }} />
          <span className="progress-text">Step {stepNumber} of {TOTAL_STEPS}</span>
        </div>
      </header>
      <main className="app-main">
        {step === 'address' && (
          <AddressStep mapsReady={mapsReady} onNext={(d) => {
            setData((prev) => ({ ...prev, address: d.address, lat: d.lat, lng: d.lng }));
            setStep('map');
          }} />
        )}
        {step === 'map' && (
          <MapStep
            mapsReady={mapsReady}
            address={data.address || ''}
            lat={data.lat || 0}
            lng={data.lng || 0}
            onNext={(d) => {
              setData((prev) => ({ ...prev, ...d }));
              setStep('questions');
            }}
            onBack={() => setStep('address')}
          />
        )}
        {step === 'questions' && (
          <QuestionsStep
            onNext={(q) => {
              setData((prev) => ({ ...prev, ...q }));
              setStep('estimate');
            }}
            onBack={() => setStep('map')}
          />
        )}
        {step === 'estimate' && (
          <EstimateStep
            data={{
              footprint_sqft: data.footprint_sqft || 0,
              pitchLabel: data.pitchLabel || '',
              pitchDegrees: data.pitchDegrees || 0,
              stories: data.stories || 1,
              material: data.material || 'asphalt',
              condition: data.condition || 'curious',
              polygons_json: data.polygons_json || '[]',
            }}
            onNext={(e) => {
              setData((prev) => ({ ...prev, ...e }));
              setStep('lead-capture');
            }}
            onBack={() => setStep('questions')}
          />
        )}
        {step === 'lead-capture' && (
          <LeadCaptureStep
            priceLow={data.price_range_low || 0}
            priceHigh={data.price_range_high || 0}
            onSubmit={submitLead}
            submitting={submitting}
            submitError={submitError}
          />
        )}
      </main>
      <footer className="app-footer">
        <p className="disclaimer-text">{disclaimer}</p>
      </footer>
    </div>
  );
}

export default App;