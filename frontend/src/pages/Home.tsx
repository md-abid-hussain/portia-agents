import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Search, ArrowRight, Book } from 'lucide-react';

const Home: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full ghibli-theme p-8" style={{ backgroundColor: 'var(--ghibli-cream)' }}>
      <div className="max-w-6xl mx-auto text-center">
        {/* Header */}
        <div className="mb-20">
          <h1 className="text-6xl font-light ghibli-heading mb-6 tracking-tight ghibli-float" style={{ color: 'var(--ghibli-forest)' }}>
            PortiaAgents
          </h1>
          <p className="text-xl font-light mb-4" style={{ color: 'var(--ghibli-warm-brown)' }}>
            AI Agents powered by PortiaAI SDK
          </p>
          <p className="text-base opacity-80 max-w-2xl mx-auto" style={{ color: 'var(--ghibli-warm-brown)' }}>
            Choose the perfect AI agent for your task - from casual conversations to deep research and documentation assistance
          </p>
        </div>

        {/* Agent Cards */}
        <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-20">
          {/* Chat Agent */}
          <Link
            to="/chat"
            className="group block p-8 ghibli-card ghibli-card-hover transition-all duration-300 rounded-3xl h-full"
            style={{ backgroundColor: 'var(--ghibli-warm-white)' }}
          >
            <div className="ghibli-pulse mb-6">
              <MessageSquare className="w-14 h-14 mx-auto" style={{ color: 'var(--ghibli-sage)' }} />
            </div>
            <h3 className="text-2xl font-medium ghibli-heading mb-4" style={{ color: 'var(--ghibli-forest)' }}>
              Chat Agent
            </h3>
            <p className="text-base leading-relaxed mb-6 min-h-[3rem]" style={{ color: 'var(--ghibli-warm-brown)' }}>
              Interactive conversations with customizable tools and real-time streaming responses
            </p>
            <div className="flex items-center justify-center group-hover:translate-x-2 transition-transform mt-auto" style={{ color: 'var(--ghibli-sage)' }}>
              <span className="text-base font-medium">Start Chat</span>
              <ArrowRight className="w-5 h-5 ml-3" />
            </div>
          </Link>

          {/* Research Agent */}
          <Link
            to="/research"
            className="group block p-8 ghibli-card ghibli-card-hover transition-all duration-300 rounded-3xl h-full"
            style={{ backgroundColor: 'var(--ghibli-warm-white)' }}
          >
            <div className="ghibli-pulse mb-6">
              <Search className="w-14 h-14 mx-auto" style={{ color: 'var(--ghibli-sage)' }} />
            </div>
            <h3 className="text-2xl font-medium ghibli-heading mb-4" style={{ color: 'var(--ghibli-forest)' }}>
              Research Agent
            </h3>
            <p className="text-base leading-relaxed mb-6 min-h-[3rem]" style={{ color: 'var(--ghibli-warm-brown)' }}>
              Advanced research capabilities with web search, data mapping, and extraction tools
            </p>
            <div className="flex items-center justify-center group-hover:translate-x-2 transition-transform mt-auto" style={{ color: 'var(--ghibli-sage)' }}>
              <span className="text-base font-medium">Start Research</span>
              <ArrowRight className="w-5 h-5 ml-3" />
            </div>
          </Link>

          {/* Documentation Assistant */}
          <Link
            to="/docs"
            className="group block p-8 ghibli-card ghibli-card-hover transition-all duration-300 rounded-3xl h-full"
            style={{ backgroundColor: 'var(--ghibli-warm-white)' }}
          >
            <div className="ghibli-pulse mb-6">
              <Book className="w-14 h-14 mx-auto" style={{ color: 'var(--ghibli-sage)' }} />
            </div>
            <h3 className="text-2xl font-medium ghibli-heading mb-4" style={{ color: 'var(--ghibli-forest)' }}>
              Documentation Assistant
            </h3>
            <p className="text-base leading-relaxed mb-6 min-h-[3rem]" style={{ color: 'var(--ghibli-warm-brown)' }}>
              Get instant answers from your documentation with intelligent search and contextual insights
            </p>
            <div className="flex items-center justify-center group-hover:translate-x-2 transition-transform mt-auto" style={{ color: 'var(--ghibli-sage)' }}>
              <span className="text-base font-medium">Explore Docs</span>
              <ArrowRight className="w-5 h-5 ml-3" />
            </div>
          </Link>
        </div>

        {/* Features */}
        <div className="pt-8" style={{ borderTop: '1px solid var(--ghibli-sage)' }}>
          <h4 className="text-lg font-medium mb-6 ghibli-heading" style={{ color: 'var(--ghibli-forest)' }}>
            Powered by Advanced AI
          </h4>
          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium" style={{ color: 'var(--ghibli-warm-brown)' }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--ghibli-sage)' }}></div>
              <span>Real-time Streaming</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--ghibli-sage)' }}></div>
              <span>Intelligent Tool Selection</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--ghibli-sage)' }}></div>
              <span>Advanced Research</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--ghibli-sage)' }}></div>
              <span>Markdown Support</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;