import { useState, useRef, useEffect } from 'react';
import { GOOGLE_MAPS_API_KEY } from '../config';

interface AddressStepProps {
  mapsReady: boolean;
  onNext: (data: {
    address: string;
    lat: number;
    lng: number;
  }) => void;
}

// Fallback suggestions when Google Places isn't available
const FALLBACK_SUGGESTIONS = [
  '123 Main Street, Springfield',
  '456 Oak Avenue, Portland',
  '789 Pine Road, Seattle',
];

export default function AddressStep({ mapsReady, onNext }: AddressStepProps) {
  const [query, setQuery] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<{
    address: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const apiKeyMissing = GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY';

  // Initialize Google Places Autocomplete when Maps API is ready
  useEffect(() => {
    if (!mapsReady || !inputRef.current || autocompleteRef.current) return;
    // Small delay to ensure DOM is ready for the widget
    const timer = setTimeout(() => {
      try {
        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current!, {
          types: ['address'],
          componentRestrictions: { country: 'us' },
        });
        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current!.getPlace();
          if (place.formatted_address && place.geometry?.location) {
            const addr = place.formatted_address;
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            setQuery(addr);
            setSelectedAddress({ address: addr, lat, lng });
          }
        });
      } catch (e) {
        console.warn('Google Places init failed:', e);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [mapsReady]);

  // Fallback: simulate address lookup for demo / when API key is missing
  const handleFallbackSelect = (addr: string) => {
    setQuery(addr);
    const hash = addr.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const lat = 39.5 + (hash % 100) / 1000;
    const lng = -98.0 + (hash % 100) / 800;
    setSelectedAddress({ address: addr, lat, lng });
  };

  // Filter fallback suggestions
  const filteredFallback = FALLBACK_SUGGESTIONS.filter(
    (s) => s.toLowerCase().includes(query.toLowerCase()) && query.length > 0
  );

  const handleContinue = () => {
    if (!selectedAddress) {
      setError('Please select an address from the suggestions');
      return;
    }
    onNext(selectedAddress);
  };

  return (
    <div className="step-container">
      <div className="step-card">
        <div className="step-icon">📍</div>
        <h2 className="step-title">Where is your property?</h2>
        <p className="step-subtitle">
          Enter your address to get started with a satellite view of your roof.
        </p>

        <div className="input-group">
          <label htmlFor="address-input" className="input-label">
            Property Address
          </label>
          <input
            ref={inputRef}
            id="address-input"
            type="text"
            className="address-input"
            placeholder="Start typing your address..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedAddress(null);
              setError('');
            }}
            autoFocus
            autoComplete="off"
          />
          {apiKeyMissing && query.length > 0 && (
            <p className="note-text">
              ⚠️ Google Maps API key not configured. Using demo address suggestions.
            </p>
          )}

          {/* Show fallback suggestions when maps isn't ready yet or API key is missing */}
          {(!mapsReady || apiKeyMissing) && filteredFallback.length > 0 && (
            <ul className="suggestions-list">
              {filteredFallback.map((s) => (
                <li
                  key={s}
                  className="suggestion-item"
                  onClick={() => handleFallbackSelect(s)}
                >
                  <span className="suggestion-icon">📍</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          )}

          {error && <p className="error-text">{error}</p>}
        </div>

        {selectedAddress && (
          <div className="selected-address-badge">
            <span>✓</span> {selectedAddress.address}
          </div>
        )}

        <button
          className="btn-primary"
          onClick={handleContinue}
          disabled={!selectedAddress}
        >
          Continue
        </button>
      </div>
    </div>
  );
}