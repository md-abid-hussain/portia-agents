import React from 'react';
import { Settings, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import type { ToolsState } from '../types/chat';

interface ToolsPanelProps {
    toolsState: ToolsState;
    onToggleTool: (tool: string) => void;
    onSelectAllTools: () => void;
    onClearAllTools: () => void;
}

/**
 * Panel for selecting and managing available tools
 */
const ToolsPanel: React.FC<ToolsPanelProps> = ({
    toolsState,
    onToggleTool,
    onSelectAllTools,
    onClearAllTools
}) => {
    const { availableTools, selectedTools } = toolsState;

    return (
        <div className="flex-1 p-4">
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Tools ({selectedTools.length}/{availableTools.length})
                    </CardTitle>

                    {/* Tool Selection Controls */}
                    <div className="flex gap-2">
                        <Button 
                            onClick={onSelectAllTools} 
                            variant="outline" 
                            size="sm" 
                            className="text-xs flex-1"
                        >
                            Select All
                        </Button>
                        <Button 
                            onClick={onClearAllTools} 
                            variant="outline" 
                            size="sm" 
                            className="text-xs flex-1"
                        >
                            Clear All
                        </Button>
                    </div>
                </CardHeader>

                {/* Tools List */}
                <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                    {availableTools.length === 0 ? (
                        <div className="text-sm text-gray-500 text-center py-4">
                            Loading tools...
                        </div>
                    ) : (
                        availableTools.map(tool => (
                            <div key={tool} className="flex items-center space-x-3">
                                <Checkbox
                                    id={tool}
                                    checked={selectedTools.includes(tool)}
                                    onCheckedChange={() => onToggleTool(tool)}
                                />
                                <label
                                    htmlFor={tool}
                                    className="text-sm font-medium leading-none cursor-pointer flex-1"
                                >
                                    {tool}
                                </label>
                                {/* Selection Indicator */}
                                {selectedTools.includes(tool) && (
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                )}
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ToolsPanel;