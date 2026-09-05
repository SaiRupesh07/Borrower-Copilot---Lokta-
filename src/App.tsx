import { useMemo, useState } from 'react';
import type { BorrowerProfileDraft } from './domain/borrower';
import { Landing } from './components/onboarding/Landing';
import { PrivacyNotice } from './components/onboarding/PrivacyNotice';
import { QuestionFlow } from './components/questions/QuestionFlow';
import { ResultsScreen } from './components/results/ResultsScreen';
import { NegotiationCard } from './components/negotiation/NegotiationCard';
import { buildProfileFromDraft } from './utils/buildProfile';
import { calculateBorrowerAssessment } from './rules';

type Screen = 'landing' | 'privacy' | 'questions' | 'results' | 'card';

function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [draft, setDraft] = useState<BorrowerProfileDraft>({ existingEmis: [] });

  const profile = useMemo(() => buildProfileFromDraft(draft), [draft]);
  const assessment = useMemo(() => calculateBorrowerAssessment(profile), [profile]);

  function startOver() {
    setDraft({ existingEmis: [] });
    setScreen('landing');
  }

  return (
    <div className="bc-app">
      {screen === 'landing' && <Landing onStart={() => setScreen('privacy')} />}

      {screen === 'privacy' && <PrivacyNotice onContinue={() => setScreen('questions')} />}

      {screen === 'questions' && (
        <QuestionFlow
          draft={draft}
          setDraft={setDraft}
          onComplete={() => setScreen('results')}
          onExit={() => setScreen('privacy')}
          onStartOver={startOver}
        />
      )}

      {screen === 'results' && (
        <ResultsScreen
          profile={profile}
          assessment={assessment}
          onBack={() => setScreen('questions')}
          onStartOver={startOver}
          onViewCard={() => setScreen('card')}
        />
      )}

      {screen === 'card' && (
        <NegotiationCard
          profile={profile}
          assessment={assessment}
          onBack={() => setScreen('results')}
          onStartOver={startOver}
        />
      )}
    </div>
  );
}

export default App;
