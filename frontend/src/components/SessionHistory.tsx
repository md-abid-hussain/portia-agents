import { Link } from 'react-router-dom';
import { getSessions } from '../utils/sessionStorage';

const SessionHistory = ({ type }: { type: 'chat' | 'research'}) => {
  const sessions = getSessions().filter((s: any) => s.type === type);

  return (
    <div className="p-4 border-t">
      <h3 className="text-sm font-medium mb-2">Recent Sessions</h3>
      {sessions.slice(0, 5).map((session: any) => (
        <Link
          key={session.id}
          to={`/${type}/${session.id}`}
          className="block p-2 text-xs hover:bg-gray-100 rounded truncate"
        >
          {session.query} - {session.date}
        </Link>
      ))}
    </div>
  );
};

export default SessionHistory