import { useState } from 'react';

interface QuestionsData {
  pitchLabel: string;
  pitchDegrees: number;
  stories: number;
  material: string;
  condition: string;
}

interface QuestionsStepProps {
  onNext: (data: QuestionsData) => void;
  onBack: () => void;
}

// Pitch icon SVGs as inline data URIs for simplicity
const PITCH_SVGS = {
  flat: `<svg viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg">
    <line x1="5" y1="25" x2="55" y2="22" stroke="#64748b" stroke-width="3" stroke-linecap="round"/>
    <polygon points="5,25 15,25 15,10 5,25" fill="#3b82f6" opacity="0.3"/>
    <text x="30" y="15" text-anchor="middle" font-size="9" fill="#64748b">0/12</text>
  </svg>`,
  low: `<svg viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg">
    <line x1="5" y1="25" x2="55" y2="15" stroke="#64748b" stroke-width="3" stroke-linecap="round"/>
    <polygon points="5,25 15,25 15,21 5,25" fill="#3b82f6" opacity="0.3"/>
    <text x="30" y="12" text-anchor="middle" font-size="9" fill="#64748b">3/12</text>
  </svg>`,
  moderate: `<svg viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg">
    <line x1="5" y1="25" x2="55" y2="8" stroke="#64748b" stroke-width="3" stroke-linecap="round"/>
    <polygon points="5,25 15,25 15,19 5,25" fill="#3b82f6" opacity="0.3"/>
    <text x="30" y="9" text-anchor="middle" font-size="9" fill="#64748b">6/12</text>
  </svg>`,
  steep: `<svg viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg">
    <line x1="5" y1="25" x2="55" y2="2" stroke="#64748b" stroke-width="3" stroke-linecap="round"/>
    <polygon points="5,25 15,25 15,17 5,25" fill="#3b82f6" opacity="0.3"/>
    <text x="30" y="6" text-anchor="middle" font-size="9" fill="#64748b">10/12</text>
  </svg>`,
};

// Pitch options with visual reference descriptions
const PITCH_OPTIONS = [
  {
    label: 'Flat',
    degrees: 2,
    multiplier: 1.05,
    svg: PITCH_SVGS.flat,
    description: '0-2/12 pitch, barely any angle',
  },
  {
    label: 'Low',
    degrees: 5,
    multiplier: 1.15,
    svg: PITCH_SVGS.low,
    description: '3-5/12 pitch, gentle slope',
  },
  {
    label: 'Moderate',
    degrees: 9,
    multiplier: 1.25,
    svg: PITCH_SVGS.moderate,
    description: '6-9/12 pitch, most common',
  },
  {
    label: 'Steep',
    degrees: 12,
    multiplier: 1.45,
    svg: PITCH_SVGS.steep,
    description: '10+/12 pitch, steep angle',
  },
];

const STORIES_OPTIONS = [1, 2, 3];

const MATERIAL_OPTIONS = [
  { value: 'asphalt', label: 'Asphalt Shingle', emoji: '🟦' },
  { value: 'metal', label: 'Metal', emoji: '⬜' },
  { value: 'tile', label: 'Tile/Clay', emoji: '🟥' },
  { value: 'flat', label: 'Flat/Membrane', emoji: '⬛' },
  { value: 'unsure', label: 'Not sure', emoji: '❓' },
];

const CONDITION_OPTIONS = [
  { value: 'curious', label: 'Just curious', emoji: '🤔' },
  { value: 'leak', label: 'Have a leak', emoji: '💧' },
  { value: 'quotes', label: 'Getting quotes', emoji: '💰' },
  { value: 'insurance', label: 'Insurance claim', emoji: '📋' },
];

export default function QuestionsStep({ onNext, onBack }: QuestionsStepProps) {
  const [pitchLabel, setPitchLabel] = useState('');
  const [pitchDegrees, setPitchDegrees] = useState(0);
  const [pitchMultiplier, setPitchMultiplier] = useState(1);
  const [stories, setStories] = useState(0);
  const [material, setMaterial] = useState('');
  const [condition, setCondition] = useState('');

  const handlePitchSelect = (opt: typeof PITCH_OPTIONS[0]) => {
    setPitchLabel(opt.label);
    setPitchDegrees(opt.degrees);
    setPitchMultiplier(opt.multiplier);
  };

  const canContinue = pitchLabel && stories > 0 && material && condition;

  const handleContinue = () => {
    if (!canContinue) return;
    onNext({
      pitchLabel,
      pitchDegrees,
      stories,
      material,
      condition,
    });
  };

  return (
    <div className="step-container">
      <div className="step-card">
        <div className="step-icon">📋</div>
        <h2 className="step-title">Tell Us About Your Roof</h2>
        <p className="step-subtitle">
          Quick questions to calculate your estimate. Tap to select.
        </p>

        {/* Roof Pitch */}
        <div className="question-section">
          <h3 className="question-label">Roof Pitch (Slope)</h3>
          <div className="option-grid pitch-grid">
            {PITCH_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                className={`option-btn pitch-btn ${pitchLabel === opt.label ? 'selected' : ''}`}
                onClick={() => handlePitchSelect(opt)}
              >
                <span className="pitch-svg" dangerouslySetInnerHTML={{ __html: opt.svg }} />
                <span className="pitch-label">{opt.label}</span>
                <span className="pitch-desc">{opt.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Number of Stories */}
        <div className="question-section">
          <h3 className="question-label">How Many Stories?</h3>
          <div className="option-row">
            {STORIES_OPTIONS.map((n) => (
              <button
                key={n}
                className={`option-btn story-btn ${stories === n ? 'selected' : ''}`}
                onClick={() => setStories(n)}
              >
                <span className="story-number">{n}</span>
                <span className="story-label">{n === 1 ? 'Story' : 'Stories'}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Material */}
        <div className="question-section">
          <h3 className="question-label">Current Roof Material</h3>
          <div className="option-grid material-grid">
            {MATERIAL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`option-btn material-btn ${material === opt.value ? 'selected' : ''}`}
                onClick={() => setMaterial(opt.value)}
              >
                <span className="material-emoji">{opt.emoji}</span>
                <span className="material-label">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Condition */}
        <div className="question-section">
          <h3 className="question-label">What's Your Situation?</h3>
          <div className="option-grid condition-grid">
            {CONDITION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`option-btn condition-btn ${condition === opt.value ? 'selected' : ''}`}
                onClick={() => setCondition(opt.value)}
              >
                <span className="condition-emoji">{opt.emoji}</span>
                <span className="condition-label">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="step-actions">
          <button className="btn-secondary" onClick={onBack}>Back</button>
          <button className="btn-primary" onClick={handleContinue} disabled={!canContinue}>
            Calculate Estimate
          </button>
        </div>
      </div>
    </div>
  );
}