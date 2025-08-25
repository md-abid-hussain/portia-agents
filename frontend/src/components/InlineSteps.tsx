import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Clock } from 'lucide-react';
import type { StepData } from '../types/chat';
import MarkdownMessage from './MarkdownMessage';

interface InlineStepsProps {
  steps: StepData[];
}

const InlineSteps: React.FC<InlineStepsProps> = ({ steps }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!steps || steps.length === 0) return null;

  const getTaskDescription = (stepData: StepData) => {
    if (stepData.step && typeof stepData.step === 'object' && stepData.step.task) {
      return stepData.step.task;
    }
    if (typeof stepData.step === 'string') {
      try {
        const parsed = JSON.parse(stepData.step);
        return parsed.task || stepData.step;
      } catch {
        return stepData.step.substring(0, 80) + (stepData.step.length > 80 ? '...' : '');
      }
    }
    return 'Step executed';
  };

  const formatOutput = (output: any) => {
    if (!output) return null;
    
    if (typeof output === 'string') {
      return output;
    }
    
    if (typeof output === 'object') {
      // Handle common output formats
      if (output.content) return output.content;
      if (output.result) return output.result;
      if (output.text) return output.text;
      if (output.answer) return output.answer;
      
      // For complex objects, show formatted JSON
      return JSON.stringify(output, null, 2);
    }
    
    return String(output);
  };

  return (
    <div 
      className="mt-4 p-4 rounded-2xl ghibli-card"
      style={{ 
        backgroundColor: 'var(--ghibli-soft-gray)',
        border: '1px solid var(--ghibli-sage)'
      }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 transition-colors w-full text-left p-2 rounded-xl ghibli-card-hover"
        style={{ color: 'var(--ghibli-forest)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--ghibli-warm-white)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        <Clock className="w-5 h-5" style={{ color: 'var(--ghibli-sage)' }} />
        <span className="text-sm font-semibold ghibli-heading">
          {steps.length} execution step{steps.length > 1 ? 's' : ''} completed
        </span>
      </button>
      
      {isExpanded && (
        <div 
          className="mt-4 space-y-4 pt-4"
          style={{ borderTop: '1px solid var(--ghibli-sage)' }}
        >
          {steps.map((stepData, index) => {
            const taskDescription = getTaskDescription(stepData);
            const output = formatOutput(stepData.output);
            
            return (
              <div 
                key={stepData.id || index} 
                className="p-4 rounded-xl space-y-3"
                style={{ 
                  backgroundColor: 'var(--ghibli-warm-white)',
                  border: '1px solid var(--ghibli-sage)'
                }}
              >
                {/* Step Header */}
                <div className="text-sm">
                  <span className="font-bold ghibli-heading" style={{ color: 'var(--ghibli-forest)' }}>
                    Step {index + 1}:
                  </span>{' '}
                  <span style={{ color: 'var(--ghibli-warm-brown)' }}>{taskDescription}</span>
                </div>
                
                {/* Step Output */}
                {output && (
                  <div 
                    className="p-3 rounded-lg text-sm"
                    style={{ 
                      backgroundColor: 'var(--ghibli-cream)',
                      border: '1px solid var(--ghibli-muted-green)'
                    }}
                  >
                    <div className="font-medium mb-2 ghibli-heading" style={{ color: 'var(--ghibli-forest)' }}>
                      Output:
                    </div>
                    <div style={{ color: 'var(--ghibli-warm-brown)' }}>
                      {output.includes('\n') || output.length > 200 ? (
                        <MarkdownMessage content={output} />
                      ) : (
                        <span className="whitespace-pre-wrap">{output}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InlineSteps;