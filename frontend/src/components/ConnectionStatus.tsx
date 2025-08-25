import React from 'react';
import { Circle } from 'lucide-react';
import type { ConnectionStatus as ConnectionStatusType } from '../types/chat';

interface ConnectionStatusProps {
    status: ConnectionStatusType;
}

/**
 * Displays the current connection status with visual indicator
 */
const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status }) => {
    const { isConnected, connectionError } = status;

    return (
        <div>
            {/* Connection Status Indicator */}
            <div className="flex items-center gap-2">
                <Circle className={`w-3 h-3 ${isConnected ? 'fill-green-500 text-green-500' : 'fill-red-500 text-red-500'}`} />
                <span className="text-xs text-gray-600">
                    {isConnected ? 'Connected' : 'Disconnected'}
                </span>
            </div>

            {/* Connection Error Display */}
            {connectionError && (
                <div className="text-xs text-red-600 mt-2">{connectionError}</div>
            )}
        </div>
    );
};

export default ConnectionStatus;