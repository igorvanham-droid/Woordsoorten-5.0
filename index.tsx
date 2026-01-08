import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types & Interfaces ---
enum WordType {
  LIDWOORD = 'Lidwoord',
  BIJVOEGLIJK_NAAMWOORD = 'Bijvoeglijk naamwoord',
  ZELFSTANDIG_NAAMWOORD = 'Zelfstandig naamwoord',
  WERKWOORD = 'Werkwoord',
  VOORZETSEL = 'Voorzetsel',
}

type WordData = {
  word: string;
  type: WordType;
};

type SentenceData = {
  words: WordData[];
};

type UserSelections = {
  [index: number]: WordType | undefined;
};

enum GameState {
  LOADING,
  PLAYING,
  CHECKED,
  COMPLETED,
  ERROR,
}

// --- Constants & Config ---
const WORD_TYPE_CONFIG: { [key in WordType]: { color: string; bgColor: string; borderColor: string; abbreviation: string; } } = {
  [WordType.LIDWOORD]: {
    color: 'text-amber-800',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-400',
    abbreviation: 'LW',
  },
  [WordType.BIJVOEGLIJK_NAAMWOORD]: {
    color: 'text-blue-800',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-400',
    abbreviation: 'BN',
  },
  [WordType.ZELFSTANDIG_NAAMWOORD]: {
    color: 'text-emerald-800',
    bgColor: 'bg-emerald-100',
    borderColor: 'border-emerald-400',
    abbreviation: 'ZN',
  },
  [WordType.WERKWOORD]: {
    color: 'text-rose-800',
    bgColor: 'bg-rose-100',
    borderColor: 'border-rose-400',
    abbreviation: 'WW',
  },
  [WordType.VOORZETSEL]: {
    color: 'text-fuchsia-800',
    bgColor: 'bg-fuchsia-100',
    borderColor: 'border-fuchsia-400',
    abbreviation: 'VZ',
  },
};

const GEMINI_SYSTEM_PROMPT = `
Je bent een behulpzame assistent die eenvoudige Nederlandse zinnen genereert voor kinderen (groep 5/6).
Genereer een zin die ALLEEN de volgende woordsoorten bevat:
- Lidwoord
- Bijvoeglijk naamwoord
- Zelfstandig naamwoord
- Werkwoord
- Voorzetsel

De zin moet grammaticaal correct zijn.
Lever een JSON-object met een array 'words'. Elk item heeft 'word' (string) en 'type' (enum: "Lidwoord", "Bijvoeglijk naamwoord", "Zelfstandig naamwoord", "Werkwoord", "Voorzetsel").
Minstens 6 woorden.
`;

// --- Services ---
const generateSentence = async (): Promise<SentenceData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      words: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            type: {
              type: Type.STRING,
              enum: Object.values(WordType),
            },
          },
          required: ['word', 'type'],
        },
      },
    },
    required: ['words'],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Maak een leuke zin voor een kind om woordsoorten te oefenen.",
      config: {
        systemInstruction: GEMINI_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const text = response.text || "{}";
    return JSON.parse(text) as SentenceData;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Kon geen nieuwe zin maken. Probeer het nog eens!");
  }
};

// --- Sub-components ---

const Confetti: React.FC = () => {
  const pieces = useMemo(() => {
    const arr = [];
    const colors = ['#fde047', '#86efac', '#fca5a5', '#93c5fd', '#c4b5fd'];
    for (let i = 0; i < 100; i++) {
      arr.push({
        id: i,
        style: {
          left: `${Math.random() * 100}vw`,
          top: `${Math.random() * -20}vh`,
          width: `${Math.random() * 8 + 4}px`,
          height: `${Math.random() * 8 + 4}px`,
          backgroundColor: colors[Math.floor(Math.random() * colors.length)],
          transform: `rotate(${Math.random() * 360}deg)`,
          animation: `fall ${Math.random() * 2 + 3}s linear forwards`,
          animationDelay: `${Math.random() * 2}s`
        },
      });
    }
    return arr;
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map(p => <div key={p.id} className="absolute" style={p.style}></div>)}
    </div>
  );
};

const Flower: React.FC<{ style: React.CSSProperties; color: string }> = ({ style, color }) => (
  <div className="absolute bottom-0 w-20 h-40 transform-origin-bottom" style={{ ...style, animation: 'grow 1s ease-out forwards' }}>
    <svg viewBox="0 0 100 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
      <path d="M 50 200 L 50 60" stroke="#4ade80" strokeWidth="4" fill="none" />
      <path d="M 50 150 C 30 140, 30 120, 50 110" fill="#4ade80" />
      <path d="M 50 130 C 70 120, 70 100, 50 90" fill="#4ade80" />
      <g transform="translate(50, 60)">
        {[0, 60, 120, 180, 240, 300].map(deg => (
          <circle key={deg} cx="0" cy="-20" r="12" fill={color} transform={`rotate(${deg})`} />
        ))}
        <circle cx="0" cy="0" r="12" fill="#fef08a" stroke="white" strokeWidth="2" />
      </g>
    </svg>
  </div>
);

// --- Main App Component ---

const App: React.FC = () => {
  const [sentenceData, setSentenceData] = useState<SentenceData | null>(null);
  const [userSelections, setUserSelections] = useState<UserSelections>({});
  const [selectedWordType, setSelectedWordType] = useState<WordType | null>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.LOADING);
  const [error, setError] = useState<string | null>(null);
  const [mistakeCount, setMistakeCount] = useState<Map<number, number>>(new Map());
  const [lockedWords, setLockedWords] = useState<Set<number>>(new Set());
  const [flowers, setFlowers] = useState<{ id: number; style: React.CSSProperties; color: string }[]>([]);

  const fetchNewSentence = useCallback(async () => {
    setGameState(GameState.LOADING);
    setFlowers([]);
    try {
      const data = await generateSentence();
      setSentenceData(data);
      setUserSelections({});
      setSelectedWordType(null);
      setError(null);
      setMistakeCount(new Map());
      setLockedWords(new Set());
      setGameState(GameState.PLAYING);
    } catch (err: any) {
      setError(err.message);
      setGameState(GameState.ERROR);
    }
  }, []);

  useEffect(() => {
    fetchNewSentence();
  }, [fetchNewSentence]);

  // Add flowers on win
  useEffect(() => {
    if (gameState === GameState.COMPLETED) {
      const colors = ['#f87171', '#fb923c', '#facc15', '#a78bfa', '#60a5fa', '#f472b6'];
      const newFlowers = Array.from({ length: 8 }).map((_, i) => ({
        id: Date.now() + i,
        style: { left: `${(i * 12) + 5}%`, animationDelay: `${i * 0.1}s` },
        color: colors[Math.floor(Math.random() * colors.length)]
      }));
      setFlowers(newFlowers);
    }
  }, [gameState]);

  const handleWordClick = (index: number) => {
    if (gameState !== GameState.PLAYING || lockedWords.has(index)) return;
    if (!selectedWordType) return;
    setUserSelections(prev => ({ ...prev, [index]: selectedWordType }));
  };

  const checkAnswers = () => {
    if (!sentenceData) return;
    const newMistakes = new Map(mistakeCount);
    const newLocked = new Set(lockedWords);
    let allCorrect = true;

    sentenceData.words.forEach((w, i) => {
      if (userSelections[i] === w.type) {
        newLocked.add(i);
      } else {
        allCorrect = false;
        newMistakes.set(i, (newMistakes.get(i) || 0) + 1);
      }
    });

    setMistakeCount(newMistakes);
    setLockedWords(newLocked);
    setGameState(allCorrect ? GameState.COMPLETED : GameState.CHECKED);
  };

  const isAllFilled = useMemo(() => {
    if (!sentenceData) return false;
    return sentenceData.words.every((_, i) => userSelections[i] !== undefined);
  }, [sentenceData, userSelections]);

  const beigeColor = "#F5F5DC";

  return (
    <div className="min-h-screen bg-sky-50 bg-gradient-to-b from-sky-50 to-blue-200 flex flex-col items-center py-12 px-4 relative overflow-hidden font-sans">
      {gameState === GameState.COMPLETED && <Confetti />}
      
      {/* Background Decorations */}
      <div className="absolute bottom-0 left-0 w-full flex justify-around pointer-events-none opacity-80">
        {flowers.map(f => <Flower key={f.id} style={f.style} color={f.color} />)}
      </div>

      <div className="w-full max-w-5xl z-10">
        <header className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-black mb-4 drop-shadow-md" style={{ color: beigeColor }}>
            Woordsoorten Oefenen
          </h1>
          <p className="text-xl md:text-2xl font-bold drop-shadow-sm opacity-90" style={{ color: beigeColor }}>
            Klik op een woordsoort en kies daarna het juiste woord in de zin!
          </p>
        </header>

        <main className="flex flex-col items-center">
          {gameState === GameState.LOADING && (
            <div className="bg-white/80 backdrop-blur p-12 rounded-3xl shadow-xl flex flex-col items-center">
              <div className="w-16 h-16 border-8 border-blue-400 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-blue-600 font-black text-xl">De zin wordt gemaakt...</p>
            </div>
          )}

          {gameState === GameState.ERROR && (
            <div className="bg-white p-8 rounded-3xl shadow-xl text-center border-4 border-rose-200">
              <p className="text-rose-500 font-bold text-xl mb-6">{error}</p>
              <button onClick={fetchNewSentence} className="px-8 py-3 bg-blue-500 text-white rounded-full font-black hover:bg-blue-600 transition-all shadow-lg active:scale-95">
                Probeer het opnieuw
              </button>
            </div>
          )}

          {(gameState === GameState.PLAYING || gameState === GameState.CHECKED || gameState === GameState.COMPLETED) && sentenceData && (
            <div className="w-full flex flex-col items-center">
              
              {/* Sentence Display */}
              <div className="flex flex-wrap justify-center gap-4 md:gap-6 p-8 md:p-12 bg-white/90 backdrop-blur-md rounded-[2.5rem] shadow-2xl border-4 border-white mb-10 w-full min-h-[14rem] items-center">
                {sentenceData.words.map((w, i) => {
                  const selection = userSelections[i];
                  const config = selection ? WORD_TYPE_CONFIG[selection] : null;
                  const isLocked = lockedWords.has(i);
                  const isChecking = gameState === GameState.CHECKED && !isLocked;
                  const showHint = (mistakeCount.get(i) || 0) >= 2 && !isLocked;

                  return (
                    <div key={i} className="flex flex-col items-center">
                      <button
                        onClick={() => handleWordClick(i)}
                        disabled={gameState !== GameState.PLAYING || isLocked}
                        className={`
                          relative group transition-all duration-300 px-5 py-3 rounded-2xl border-b-4 text-2xl font-black
                          ${config ? `${config.bgColor} ${config.color} ${config.borderColor}` : 'bg-gray-50 text-gray-800 border-gray-200 hover:bg-white hover:border-blue-300'}
                          ${isLocked ? 'scale-95 border-emerald-500 ring-2 ring-emerald-200 cursor-default' : 'hover:scale-105 active:scale-95 cursor-pointer'}
                          ${isChecking ? 'ring-4 ring-rose-400 border-rose-500 animate-shake' : ''}
                        `}
                      >
                        {w.word}
                        {config && (
                          <span className="absolute -top-3 -right-2 bg-white px-2 py-0.5 rounded-full text-[10px] shadow-sm border font-black uppercase tracking-tighter">
                            {config.abbreviation}
                          </span>
                        )}
                        {isLocked && (
                          <div className="absolute -top-3 -right-2 bg-emerald-500 text-white p-1 rounded-full shadow-lg">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path></svg>
                          </div>
                        )}
                      </button>
                      
                      {showHint && (
                        <div className="mt-3 text-xs font-black text-rose-500 animate-bounce bg-white/50 px-3 py-1 rounded-full">
                          Tip: {WORD_TYPE_CONFIG[w.type].abbreviation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Word Type Selector */}
              <div className="flex flex-wrap justify-center gap-3 mb-10 p-4 bg-white/40 rounded-3xl backdrop-blur-sm">
                {Object.entries(WORD_TYPE_CONFIG).map(([type, config]) => (
                  <button
                    key={type}
                    onClick={() => setSelectedWordType(type === selectedWordType ? null : (type as WordType))}
                    disabled={gameState !== GameState.PLAYING}
                    className={`
                      flex items-center gap-3 px-5 py-3 rounded-full border-2 font-black transition-all shadow-md
                      ${config.color} ${config.bgColor} ${config.borderColor}
                      ${gameState !== GameState.PLAYING ? 'opacity-50 grayscale' : 'hover:scale-105 active:scale-95'}
                      ${selectedWordType === type ? 'ring-4 ring-blue-400 ring-offset-2 scale-110' : ''}
                    `}
                  >
                    <span className="bg-white/60 w-8 h-8 flex items-center justify-center rounded-full text-xs">{config.abbreviation}</span>
                    <span className="hidden sm:inline">{type}</span>
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                {gameState === GameState.PLAYING && (
                  <button
                    onClick={checkAnswers}
                    disabled={!isAllFilled}
                    className={`
                      px-12 py-5 rounded-full text-2xl font-black text-white shadow-xl transition-all
                      ${isAllFilled ? 'bg-green-500 hover:bg-green-600 hover:shadow-2xl hover:-translate-y-1 active:scale-95' : 'bg-gray-400 cursor-not-allowed'}
                    `}
                  >
                    Controleren!
                  </button>
                )}
                {gameState === GameState.CHECKED && (
                  <button
                    onClick={() => setGameState(GameState.PLAYING)}
                    className="px-12 py-5 bg-orange-500 hover:bg-orange-600 text-white text-2xl font-black rounded-full shadow-xl hover:shadow-2xl transition-all active:scale-95"
                  >
                    Nog een keer proberen
                  </button>
                )}
                {gameState === GameState.COMPLETED && (
                  <button
                    onClick={fetchNewSentence}
                    className="px-12 py-5 bg-purple-600 hover:bg-purple-700 text-white text-2xl font-black rounded-full shadow-2xl hover:scale-105 transition-all animate-pulse"
                  >
                    Super gedaan! Volgende zin?
                  </button>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

// --- Render ---
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><App /></React.StrictMode>);
