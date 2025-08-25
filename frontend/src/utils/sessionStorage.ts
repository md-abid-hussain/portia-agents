// utils/sessionStorage.ts
export const saveSession = (id: string, query: string, type: string) => {
    const sessions = JSON.parse(localStorage.getItem('sessions') || '[]');
    sessions.unshift({ id, query, type, date: new Date().toLocaleDateString() });
    localStorage.setItem('sessions', JSON.stringify(sessions.slice(0, 20))); // Keep last 20
  };
  
  export const getSessions = () => {
    return JSON.parse(localStorage.getItem('sessions') || '[]');
  };