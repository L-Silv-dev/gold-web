import { useState, useEffect, useRef } from 'react';
import { useUserContext } from '../contexts/UserContext';

export default function useStudySession() {
  const [isStudying, setIsStudying] = useState(false);
  const [currentSubject, setCurrentSubject] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const intervalRef = useRef(null);
  const { registerSubjectTime } = useUserContext();

  // Iniciar sessão de estudo
  const startStudySession = (subjectName) => {
    setIsStudying(true);
    setCurrentSubject(subjectName);
    setSessionStartTime(Date.now());
    setSessionDuration(0);
    
    // Iniciar contador de tempo
    intervalRef.current = setInterval(() => {
      setSessionDuration(prev => prev + 1);
    }, 1000); // Atualizar a cada segundo
  };

  // Parar sessão de estudo
  const stopStudySession = async () => {
    if (isStudying && currentSubject) {
      // Calcular tempo total em minutos
      const totalMinutes = Math.floor(sessionDuration / 60);
      
      if (totalMinutes > 0) {
        // Registrar tempo gasto na matéria
        await registerSubjectTime(currentSubject, totalMinutes);
      }
      
      // Limpar estado
      setIsStudying(false);
      setCurrentSubject(null);
      setSessionStartTime(null);
      setSessionDuration(0);
      
      // Parar contador
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  };

  // Formatar tempo de sessão
  const formatSessionTime = () => {
    const minutes = Math.floor(sessionDuration / 60);
    const seconds = sessionDuration % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Limpar intervalo quando componente for desmontado
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isStudying,
    currentSubject,
    sessionDuration,
    formatSessionTime,
    startStudySession,
    stopStudySession,
  };
} 