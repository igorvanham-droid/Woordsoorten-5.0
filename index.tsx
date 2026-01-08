
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
    color: 'text-yellow-800',
    bgColor: 'bg-yellow-200',
    borderColor: 'border-yellow-500',
    abbreviation: 'LW',
  },
  [WordType.BIJVOEGLIJK_NAAMWOORD]: {
    color: 'text-blue-800',
    bgColor: 'bg-blue-200',
    borderColor: 'border-blue-500',
    abbreviation: 'BN',
  },
  [WordType.ZELFSTANDIG_NAAMWOORD]: {
    color: 'text-green-800',
    bgColor: 'bg-green-200',
    borderColor: 'border-green-500',
    abbreviation: 'ZN',
  },
  [WordType.WERKWOORD]: {
    color: 'text-red-800',
    bgColor: 'bg-red-200',
    borderColor: 'border-red-500',
    abbreviation: 'WW',
  },
  [WordType.VOORZETSEL]: {
    color: 'text-purple-800',
    bgColor: 'bg-purple-200',
    borderColor: 'border-purple-500',
    abbreviation: 'VZ',
  },
};

const GEMINI_SYSTEM_PROMPT = `
Je bent een behulpzame assistent die is ontworpen om eenvoudige Nederlandse zinnen te genereren voor kinderen die woordsoorten leren.
Je taak is om een zin te maken die ALLEEN de volgende woordsoorten bevat:
- Lidwoord
- Bijvoeglijk naamwoord
- Zelfstandig naamwoord
- Werkwoord
- Voorzetsel

De zin moet grammaticaal correct en gemakkelijk te begrijpen zijn voor een kind van 8-10 jaar.
Genereer een JSON-object dat een array van woorden bevat. Elk object in de array moet het woord en het correcte type hebben.
De toegestane types zijn exact: "Lidwoord", "Bijvoeglijk naamwoord", "Zelfstandig naamwoord", "Werkwoord", "Voorzetsel".
Gebruik GEEN andere woordsoorten. De zin moet minstens 5 woorden lang zijn. Zorg ervoor dat de zin zinvol is.
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
    // Fixed: Using gemini-3-flash-preview for text tasks as per guidelines
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Genereer een nieuwe zin voor kinderen.",
      config: {
        systemInstruction: GEMINI_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    return JSON.parse(response.text) as SentenceData;
  } catch (error) {
    console.error("Error generating sentence:", error);
    throw new Error("Kon geen zin genereren.");
  }
};

// --- Components ---

const Confetti: React.FC = () => {
  const pieces = useMemo(() => {
    const arr = [];
    const colors = ['#fde047', '#86efac', '#fca5a5', '#93c5fd', '#c4b5fd'];
    for (let i = 0; i < 150; i++) {
      arr.push({
        id: i,
        style: {
          left: `${Math.random() * 100}vw`,
          top: `${Math.random() * -50}vh`,
          width: `${Math.random() * 10 + 5}px`,
          height: `${Math.random() * 10 + 5}px`,
          backgroundColor: colors[Math.floor(Math.random() * colors.length)],
          transform: `rotate(${Math.random() * 360}deg)`,
          animation: `fall ${Math.random() * 2 + 3}s ${Math.random() * 2}s linear forwards`,
        },
      });
    }
    return arr;
  }, []);

  return (
    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-50">
      <style>{`@keyframes fall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(120vh) rotate(720deg); opacity: 0; } }`}</style>
      {pieces.map(p => <div key={p.id} className="absolute" style={p.style}></div>)}
    </div>
  );
};

const Flower: React.FC<{ style: React.CSSProperties; color: string }> = ({ style, color }) => (
  <>
    <style>{`@keyframes grow { from { transform: scaleY(0); } to { transform: scaleY(1); } } .flower-container { position: absolute; bottom: -10px; width: 80px; height: 160px; transform-origin: bottom; animation: grow 1.5s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards; }`}</style>
    <div className="flower-container" style={style}>
      <svg viewBox="0 0 100 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
        <path d="M 50 200 L 50 50" stroke="#4ade80" strokeWidth="5" />
        <path d="M 50 140 C 30 130, 30 100, 50 90" fill="#4ade80" />
        <path d="M 50 120 C 70 110, 70 80, 50 70" fill="#4ade80" />
        <g transform="translate(50, 50) scale(1.1)">
          {[0, 60, 120, 180, 240, 300].map(deg => (
            <circle key={deg} cx="0" cy="-18" r="9" fill={color} transform={`rotate(${deg})`} />
          ))}
        </g>
        <circle cx="50" cy="50" r="9" fill="#fde047" stroke="white" strokeWidth="1" />
      </svg>
    </div>
  </>
);

const Word: React.FC<{ 
  wordData: WordData; 
  userSelection?: WordType; 
  onClick: () => void; 
  result: 'correct' | 'incorrect' | 'unanswered'; 
  disabled: boolean; 
  hintAbbreviation?: string; 
}> = ({ wordData, userSelection, onClick, result, disabled, hintAbbreviation }) => {
  const config = userSelection ? WORD_TYPE_CONFIG[userSelection] : null;
  const classes = [
    'p-3', 'rounded-xl', 'transition-all', 'duration-200', 'border-2', 'min-w-[6rem]', 'text-center', 'shadow-sm',
    disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-105',
    config ? config.bgColor : 'bg-white',
    result === 'correct' ? 'border-green-500' : result === 'incorrect' ? 'border-red-500' : (config ? config.borderColor : 'border-gray-200')
  ];

  return (
    <div className="flex flex-col items-center min-h-[7rem]">
      <div className={classes.join(' ')} onClick={!disabled ? onClick : undefined}>
        <span className={`font-bold text-xl ${config ? config.color : 'text-gray-800'}`}>{wordData.word}</span>
        {config && <div className="text-[10px] font-black mt-1 uppercase tracking-tighter opacity-80">{config.abbreviation}</div>}
      </div>
      {hintAbbreviation && (
        <div className="mt-2 text-xs font-bold text-gray-600 bg-white/80 px-2 py-1 rounded-full shadow-sm border border-gray-100">
          Tip: <span className="text-blue-600">{hintAbbreviation}</span>
        </div>
      )}
    </div>
  );
};

const LegendItem: React.FC<{ 
  type: WordType; 
  config: typeof WORD_TYPE_CONFIG[WordType]; 
  onClick: () => void; 
  disabled: boolean; 
  isSelected: boolean; 
}> = ({ type, config, onClick, disabled, isSelected }) => (
  <button 
    onClick={onClick} 
    disabled={disabled} 
    className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 font-bold transition-all shadow-md ${config.color} ${config.bgColor} ${config.borderColor} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'} ${isSelected ? 'ring-4 ring-blue-300 ring-offset-2' : ''}`}
  >
    <span className="bg-white/50 rounded-full px-2 py-0.5 text-[10px]">{config.abbreviation}</span>
    <span className="text-sm">{type}</span>
  </button>
);

// --- Main App ---

const App: React.FC = () => {
  const [sentenceData, setSentenceData] = useState<SentenceData | null>(null);
  const [userSelections, setUserSelections] = useState<UserSelections>({});
  const [selectedWordType, setSelectedWordType] = useState<WordType | null>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.LOADING);
  const [error, setError] = useState<string | null>(null);
  const [mistakeCount, setMistakeCount] = useState<Map<number, number>>(new Map());
  const [lockedWords, setLockedWords] = useState<Set<number>>(new Set());
  const [flowers, setFlowers] = useState<{ id: number; style: React.CSSProperties; color: string }[]>([]);

  const fetchSentence = useCallback(async () => {
    setGameState(GameState.LOADING);
    try {
      const data = await generateSentence();
      setSentenceData(data);
      setUserSelections({});
      setSelectedWordType(null);
      setError(null);
      setMistakeCount(new Map());
      setLockedWords(new Set());
      setGameState(GameState.PLAYING);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fout bij het laden.');
      setGameState(GameState.ERROR);
    }
  }, []);

  useEffect(() => { fetchSentence(); }, [fetchSentence]);

  useEffect(() => {
    if (gameState === GameState.COMPLETED) {
      const colors = ['#f87171', '#fb923c', '#facc15', '#a78bfa', '#60a5fa'];
      setFlowers(prev => [...prev, {
        id: Date.now(),
        style: { left: `${Math.random() * 85 + 5}%`, animationDelay: `${Math.random() * 0.5}s` },
        color: colors[Math.floor(Math.random() * colors.length)]
      }]);
    }
  }, [gameState]);

  const handleWordClick = (index: number) => {
    if (selectedWordType && gameState === GameState.PLAYING && !lockedWords.has(index)) {
      setUserSelections(prev => ({ ...prev, [index]: selectedWordType }));
    }
  };

  const checkAnswers = () => {
    if (!sentenceData) return;
    // Fixed: Explicitly typing newMistakes to avoid "unknown" operator error
    const newMistakes = new Map<number, number>(mistakeCount);
    const newLocked = new Set(lockedWords);
    let allOk = true;

    sentenceData.words.forEach((w, i) => {
      if (userSelections[i] === w.type) {
        newLocked.add(i);
      } else {
        allOk = false;
        // Fixed: Use nullish coalescing and ensured numeric type for incrementing
        const currentCount = newMistakes.get(i) ?? 0;
        newMistakes.set(i, currentCount + 1);
      }
    });

    setMistakeCount(newMistakes);
    setLockedWords(newLocked);
    setGameState(allOk ? GameState.COMPLETED : GameState.CHECKED);
  };

  return (
    <div className="bg-gradient-to-b from-blue-100 to-blue-300 min-h-screen flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      {gameState === GameState.COMPLETED && <Confetti />}
      <div className="absolute bottom-0 left-0 w-full h-full pointer-events-none z-10">
        {flowers.map(f => <Flower key={f.id} style={f.style} color={f.color} />)}
      </div>

      <div className="w-full max-w-5xl mx-auto relative z-20">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-black text-[#F5F5DC] drop-shadow-lg mb-4">Woordsoorten Oefenen</h1>
          <p className="text-xl text-[#F5F5DC] font-bold drop-shadow-md">Kies een woordsoort en klik daarna op het juiste woord!</p>
        </header>

        <main className="flex flex-col items-center">
          {gameState === GameState.LOADING && <div className="text-white text-2xl font-bold animate-pulse">Zin aan het voorbereiden...</div>}
          
          {gameState === GameState.ERROR && (
            <div className="bg-white p-8 rounded-3xl shadow-2xl text-center">
              <p className="text-red-500 text-xl font-bold mb-6">{error}</p>
              <button onClick={fetchSentence} className="px-8 py-3 bg-blue-500 text-white rounded-full font-bold hover:bg-blue-600 transition-all">Opnieuw proberen</button>
            </div>
          )}

          {(gameState === GameState.PLAYING || gameState === GameState.CHECKED || gameState === GameState.COMPLETED) && sentenceData && (
            <>
              <div className="flex flex-wrap justify-center items-start gap-6 p-10 bg-white/90 backdrop-blur-sm rounded-[3rem] shadow-2xl border-4 border-white mb-10 w-full">
                {sentenceData.words.map((w, i) => {
                  const isLocked = lockedWords.has(i);
                  let res: 'correct' | 'incorrect' | 'unanswered' = isLocked ? 'correct' : 'unanswered';
                  if (gameState === GameState.CHECKED && !isLocked) res = 'incorrect';
                  
                  return (
                    <Word 
                      key={i} 
                      wordData={w} 
                      userSelection={userSelections[i]} 
                      onClick={() => handleWordClick(i)} 
                      result={res} 
                      disabled={gameState !== GameState.PLAYING || isLocked} 
                      hintAbbreviation={(res === 'incorrect' && (mistakeCount.get(i) || 0) >= 2) ? WORD_TYPE_CONFIG[w.type].abbreviation : undefined}
                    />
                  );
                })}
              </div>

              <div className="flex flex-wrap justify-center gap-4 mb-12">
                {Object.entries(WORD_TYPE_CONFIG).map(([type, config]) => (
                  <LegendItem 
                    key={type} 
                    type={type as WordType} 
                    config={config} 
                    onClick={() => setSelectedWordType(type === selectedWordType ? null : (type as WordType))} 
                    disabled={gameState !== GameState.PLAYING} 
                    isSelected={selectedWordType === type} 
                  />
                ))}
              </div>

              <div className="flex gap-4">
                {gameState === GameState.PLAYING && (
                  <button 
                    onClick={checkAnswers} 
                    disabled={Object.keys(userSelections).length !== sentenceData.words.length} 
                    className="px-12 py-4 bg-green-500 text-white text-2xl font-black rounded-full shadow-xl hover:bg-green-600 disabled:bg-gray-300 disabled:scale-100 transition-all active:scale-95"
                  >
                    Controleren!
                  </button>
                )}
                {gameState === GameState.CHECKED && (
                  <button onClick={() => setGameState(GameState.PLAYING)} className="px-12 py-4 bg-orange-400 text-white text-2xl font-black rounded-full shadow-xl hover:bg-orange-500 transition-all">Verbeteren</button>
                )}
                {gameState === GameState.COMPLETED && (
                  <button onClick={fetchSentence} className="px-12 py-5 bg-purple-600 text-white text-3xl font-black rounded-full shadow-2xl hover:bg-purple-700 animate-bounce transition-all">Nieuwe zin!</button>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

// --- Render ---
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><App /></React.StrictMode>);
