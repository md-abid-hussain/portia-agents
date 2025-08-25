import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Chat from './pages/Chat';
import ResearchAgent from './pages/ResearchAgent';
import DocsAgent from './pages/DocsAgent';

function AppRoutes() {
  const location = useLocation();

  // Determine the base route (chat or research) to maintain component instance
  const baseRoute = location.pathname.startsWith('/chat') ? 'chat' :
    location.pathname.startsWith('/research') ? 'research' :
      location.pathname;

  return (
    <Routes key={baseRoute}>
      <Route path="/" element={<Home />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/chat/:sessionId" element={<Chat />} />
      <Route path="/research" element={<ResearchAgent />} />
      <Route path="/research/:sessionId" element={<ResearchAgent />} />
      <Route path="/docs" element={<DocsAgent />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <Layout>
        <AppRoutes />
      </Layout>
    </Router>
  );
}

export default App;
