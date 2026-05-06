import { useState, useEffect, useCallback } from 'react';

const SpeechRecognition = typeof window !== 'undefined' && 
  ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

export const useVoiceToText = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lang, setLang] = useState('en-IN'); // Default: English (India)
  const [recognition, setRecognition] = useState<any>(null);

  // Initialize or Re-initialize when language changes
  useEffect(() => {
    if (!SpeechRecognition) return;
    
    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = false;
    
    // Set current language ('en-IN' or 'hi-IN')
    recognitionInstance.lang = lang;

    recognitionInstance.onstart = () => setIsListening(true);
    recognitionInstance.onend = () => setIsListening(false);
    
    recognitionInstance.onresult = (event: any) => {
      const currentTranscript = event.results[0][0].transcript;
      setTranscript(currentTranscript);
    };

    setRecognition(recognitionInstance);
  }, [lang]); // Re-run if language toggles

  const startListening = useCallback(() => {
    if (recognition) recognition.start();
  }, [recognition]);

  const stopListening = useCallback(() => {
    if (recognition) recognition.stop();
  }, [recognition]);

  return { 
    isListening, 
    transcript, 
    lang, 
    setLang, // Expose this to switch between 'en-IN' and 'hi-IN'
    startListening, 
    stopListening 
  };
};
