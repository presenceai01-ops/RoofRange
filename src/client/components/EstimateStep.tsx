import { useEffect, useState } from 'react';

interface EstimateData {
  footprint_sqft: number;
  pitchLabel: string;
  pitchDegrees: number;
  stories: number;
  material: string;
  condition: string;
  polygons_json: string;
}

interface EstimateStepProps {
  data: EstimateData;
  onNext: (data: { price_range_low: number; price_range_high: number; roof_surface_sqft: number }) => void;
  onBack: () => void;
}

// Pitch multiplier table
const PITCH_MULTIPLIERS: Record<string, number> = {
  flat: 1.05,
  low: 1.15,
  moderate: 1.25,
  steep: 1.45,
};

// Material display names
const MATERIAL_NAMES: Record<string, string> = {
  asphalt: 'Asphalt Shingle',
  metal: 'Metal',
  tile: 'Tile/Clay',
  flat: 'Flat/Membrane',
  unsure: 'Not sure',
};

// Condition display names
const CONDITION_NAMES: Record<string, string> = {
  curious: 'Just curious',
  leak: 'Have a leak',
  quotes: 'Getting quotes',
  insurance: 'Insurance claim',
};

// Default pricing if API call fails
const DEFAULT_PRICING: Record<string, { low: number; mid: number; high: number }> = {
  asphalt: { low: 350, mid: 450, high: 550 },
  metal: { low: 600, mid: 750, high: 900 },
  tile: { low: 700, mid: 900, high: 1100 },
  flat: { low: 400, mid: 525, high: 650 },
};

export default function EstimateStep({ data, onNext, onBack }: EstimateStepProps) {
  const [pricing, setPricing] = useState<{ low: number; mid: number; high: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);

  // Calculate roof surface area with pitch multiplier
  const pitchKey = data.pitchLabel.toLowerCase();
  const multiplier = PITCH_MULTIPLIERS[pitchKey] || 1.054;
  const roofSurfaceSqft = Math.round(data.footprint_sqft * multiplier);

  // Simple stories multiplier (more stories = more complex, higher price)
  const storiesMultiplier = 1 + (data.stories - 1) * 0.15;

  // Load pricing from API
  useEffect(() => {
    async function loadPricing() {
      try {
        // Get material pricing from the demo company
        const res = await fetch('/api/config/demo');
        const config = await res.json();
        if (config.pricing) {
          const materialPricing = config.pricing.find(
            (p: any) => p.material === data.material
          );
          if (materialPricing) {
            setPricing({
              low: Number(materialPricing.price_low),
              mid: Number(materialPricing.price_mid),
              high: Number(materialPricing.price_high),
            });
          } else {
            // Fallback to default price for the material
            const mat = data.material === 'unsure' ? 'asphalt' : data.material;
            setPricing(DEFAULT_PRICING[mat] || DEFAULT_PRICING.asphalt);
          }
        }
      } catch {
        // Fallback pricing
        const mat = data.material === 'unsure' ? 'asphalt' : data.material;
        setPricing(DEFAULT_PRICING[mat] || DEFAULT_PRICING.asphalt);
      }
      setLoading(false);
    }
    loadPricing();
  }, [data.material]);

  const handleGetQuote = () => {
    if (!pricing) return;
    const low = Math.round(roofSurfaceSqft / 100 * pricing.low * storiesMultiplier);
    const high = Math.round(roofSurfaceSqft / 100 * pricing.high * storiesMultiplier);
    onNext({
      price_range_low: low,
      price_range_high: high,
      roof_surface_sqft: roofSurfaceSqft,
    });
  };

  if (loading) {
    return (
      <div className="step-container">
        <div className="step-card">
          <div className="loading-spinner">⏳</div>
          <p className="loading-text">Calculating your estimate...</p>
        </div>
      </div>
    );
  }

  if (!pricing) {
    return (
      <div className="step-container">
        <div className="step-card">
          <p>Unable to load pricing data. Please try again.</p>
          <button className="btn-secondary" onClick={onBack}>Back</button>
        </div>
      </div>
    );
  }

  const priceLow = Math.round(roofSurfaceSqft / 100 * pricing.low * storiesMultiplier);
  const priceMid = Math.round(roofSurfaceSqft / 100 * pricing.mid * storiesMultiplier);
  const priceHigh = Math.round(roofSurfaceSqft / 100 * pricing.high * storiesMultiplier);

  return (
    <div className="step-container">
      <div className="step-card estimate-card">
        <div className="step-icon">💰</div>
        <h2 className="step-title">Your Roof Estimate</h2>

        {/* Summary badge */}
        <div className="estimate-summary-badge">
          <span className="estimate-label">Estimated Range</span>
          <span className="estimate-range">${priceLow.toLocaleString()} – ${priceHigh.toLocaleString()}</span>
          <span className="estimate-mid">Typical: ~${priceMid.toLocaleString()}</span>
        </div>

        {/* Detail breakdown */}
        <div className="estimate-details">
          <div className="detail-row">
            <span className="detail-label">Footprint area</span>
            <span className="detail-value">{Math.round(data.footprint_sqft).toLocaleString()} sq ft</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Roof pitch</span>
            <span className="detail-value">{data.pitchLabel} ({data.pitchDegrees}/12)</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Pitch multiplier</span>
            <span className="detail-value">×{multiplier.toFixed(3)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Roof surface</span>
            <span className="detail-value">{roofSurfaceSqft.toLocaleString()} sq ft</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Stories</span>
            <span className="detail-value">{data.stories} {data.stories === 1 ? 'story' : 'stories'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Material</span>
            <span className="detail-value">{MATERIAL_NAMES[data.material] || data.material}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Situation</span>
            <span className="detail-value">{CONDITION_NAMES[data.condition] || data.condition}</span>
          </div>
          <div className="detail-row detail-highlight">
            <span className="detail-label">Price per sq ft</span>
            <span className="detail-value">${pricing.low}–${pricing.high} /sq</span>
          </div>
        </div>

        {/* Price breakdown cards */}
        <div className="price-cards">
          <div className="price-card low">
            <span className="price-card-label">Low</span>
            <span className="price-card-value">${priceLow.toLocaleString()}</span>
          </div>
          <div className="price-card mid">
            <span className="price-card-label">Typical</span>
            <span className="price-card-value">${priceMid.toLocaleString()}</span>
          </div>
          <div className="price-card high">
            <span className="price-card-label">High</span>
            <span className="price-card-value">${priceHigh.toLocaleString()}</span>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="disclaimer-box">
          <strong>⚠️ Rough Estimate</strong>
          <p>
            This is a ballpark range based on the information you provided.
            Final pricing requires an on-site inspection by a licensed
            roofing professional. Actual costs may vary based on local
            labor rates, underlayment, flashing, and other factors.
          </p>
        </div>

        <div className="step-actions">
          <button className="btn-secondary" onClick={onBack}>Edit Details</button>
          <button className="btn-primary" onClick={handleGetQuote}>
            Get My Free Quote →
          </button>
        </div>
      </div>
    </div>
  );
}