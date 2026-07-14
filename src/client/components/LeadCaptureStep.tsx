import { useState, useRef } from 'react';

interface LeadCaptureStepProps {
  onSubmit: (data: { name: string; phone: string; email: string }) => Promise<void>;
  submitting: boolean;
  submitError: string;
  priceLow: number;
  priceHigh: number;
}

export default function LeadCaptureStep({ onSubmit, submitting, submitError, priceLow, priceHigh }: LeadCaptureStepProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!phone.trim() && !email.trim()) {
      newErrors.phone = 'Phone or email is required';
      newErrors.email = 'Phone or email is required';
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email';
    }

    if (phone.trim() && !/^[\d\s\-().+]{7,}$/.test(phone.trim())) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
    });

    if (!submitError) {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="step-container">
        <div className="step-card success-card">
          <div className="success-icon">✅</div>
          <h2 className="step-title">You're All Set!</h2>
          <p className="step-subtitle">
            Thank you, {name}! Your estimate has been saved.
          </p>
          <div className="estimate-sent-badge">
            <span>📧</span>
            <span>Estimate range: <strong>${priceLow.toLocaleString()} – ${priceHigh.toLocaleString()}</strong></span>
          </div>
          <p className="note-text">
            A roofing professional will reach out soon to schedule an on-site inspection
            for a precise quote.
          </p>
          <div className="disclaimer-box">
            <p>This is a rough estimate. Final price requires on-site inspection.</p>
          </div>
          <button
            className="btn-primary"
            onClick={() => window.location.reload()}
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="step-container">
      <div className="step-card">
        <div className="step-icon">📬</div>
        <h2 className="step-title">Get Your Estimate</h2>
        <p className="step-subtitle">
          Enter your details to receive your estimate and be connected with a
          local roofing professional.
        </p>

        {/* Price reminder */}
        <div className="price-reminder">
          <span className="price-reminder-label">Your estimate:</span>
          <span className="price-reminder-value">
            ${priceLow.toLocaleString()} – ${priceHigh.toLocaleString()}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="lead-form">
          <div className="form-group">
            <label htmlFor="name" className="form-label">Your Name *</label>
            <input
              ref={nameRef}
              id="name"
              type="text"
              className={`form-input ${errors.name ? 'input-error' : ''}`}
              placeholder="Jane Smith"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
              }}
              autoFocus
              autoComplete="name"
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="phone" className="form-label">Phone Number</label>
            <input
              id="phone"
              type="tel"
              className={`form-input ${errors.phone ? 'input-error' : ''}`}
              placeholder="(555) 123-4567"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
              }}
              autoComplete="tel"
            />
            {errors.phone && <span className="error-text">{errors.phone}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">Email Address</label>
            <input
              id="email"
              type="email"
              className={`form-input ${errors.email ? 'input-error' : ''}`}
              placeholder="jane@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
              }}
              autoComplete="email"
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          {submitError && (
            <div className="error-text form-error">{submitError}</div>
          )}

          <div className="form-note">
            We'll share your info with a local roofing pro who can provide a
            precise on-site quote. No spam, no obligation.
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Sending...' : 'Send My Estimate →'}
          </button>
        </form>
      </div>
    </div>
  );
}