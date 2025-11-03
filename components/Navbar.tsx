import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

export type View = 'b2b-dashboard' | 'reception' | 'phlebotomy' | 'lab' | 'approver' | 'admin';

interface NavbarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  allowedViews: View[];
}

const NavButton: React.FC<{
  label: string;
  viewName: View;
  currentView: View;
  onClick: (view: View) => void;
}> = ({ label, viewName, currentView, onClick }) => {
  const isActive = currentView === viewName;
  return (
    <button
      onClick={() => onClick(viewName)}
      className={`px-2 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
        isActive
          ? 'bg-green-600 text-white'
          : 'text-gray-600 hover:bg-green-50 hover:text-gray-900'
      }`}
    >
      {label}
    </button>
  );
};


export const Navbar: React.FC<NavbarProps> = ({ currentView, setCurrentView, allowedViews }) => {
  const { logout } = useAuth();
  
  const viewLabels: Record<View, string> = {
      'b2b-dashboard': 'Dashboard',
      reception: 'Reception',
      phlebotomy: 'Phlebotomy',
      lab: 'Lab',
      approver: 'Approver',
      admin: 'Admin'
  };

  return (
    <nav className="flex items-center gap-0.5 justify-end overflow-x-auto overflow-y-hidden flex-shrink-0">
      {allowedViews.map(view => (
          <NavButton
            key={view}
            label={viewLabels[view]}
            viewName={view}
            currentView={currentView}
            onClick={setCurrentView}
          />
      ))}
      <button
        onClick={logout}
        className="px-2 py-1.5 rounded text-xs font-medium text-red-600 hover:bg-red-50 whitespace-nowrap flex-shrink-0"
      >
        Logout
      </button>
    </nav>
  );
};
