import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  SquaresFour, Robot, TreeStructure, Play, Shield, HandPalm,
  CurrencyDollar, Plug, List, SignOut, CaretLeft, RocketLaunch, BookOpen
} from '@phosphor-icons/react';

const NAV = [
  { to: '/', icon: SquaresFour, label: 'Dashboard', end: true },
  { to: '/agents', icon: Robot, label: 'Agents' },
  { to: '/workflows', icon: TreeStructure, label: 'Workflows' },
  { to: '/runs', icon: Play, label: 'Runs' },
  { to: '/policies', icon: Shield, label: 'Policies' },
  { to: '/hitl', icon: HandPalm, label: 'HITL Queue' },
  { to: '/costs', icon: CurrencyDollar, label: 'Costs' },
  { to: '/integrations', icon: Plug, label: 'Integrations' },
  { to: '/quickstart', icon: BookOpen, label: 'Quickstart' },
  { to: '/onboarding', icon: RocketLaunch, label: 'Setup Wizard' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const pageTitle = (() => {
    if (location.pathname === '/onboarding') return 'Setup Wizard';
    if (location.pathname === '/quickstart') return 'Quickstart';
    return NAV.find(n => n.end ? location.pathname === n.to : location.pathname.startsWith(n.to))?.label || 'Stratum';
  })();

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <aside className={`${collapsed ? 'w-16' : 'w-56'} border-r border-[#E2E8F0] flex flex-col transition-all duration-150 shrink-0`}>
        <div className={`h-14 flex items-center border-b border-[#E2E8F0] ${collapsed ? 'justify-center px-2' : 'px-4'}`}>
          {!collapsed && <span className="font-heading font-black text-lg tracking-tight">STRATUM</span>}
          <button onClick={() => setCollapsed(!collapsed)}
            className={`${collapsed ? '' : 'ml-auto'} p-1 text-slate-400 hover:text-slate-700 transition-colors`}
            data-testid="sidebar-toggle">
            {collapsed ? <List size={20} weight="bold" /> : <CaretLeft size={18} weight="bold" />}
          </button>
        </div>

        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 mx-2 mb-0.5 px-2 py-2 text-sm font-medium transition-colors
                ${isActive ? 'bg-[#002FA7] text-white' : 'text-slate-600 hover:bg-[#F1F5F9]'}
                ${collapsed ? 'justify-center' : ''}`
              }
              data-testid={`nav-${label.toLowerCase().replace(/\s/g, '-')}`}>
              <Icon size={20} weight="bold" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className={`border-t border-[#E2E8F0] p-3 ${collapsed ? 'flex justify-center' : ''}`}>
          {!collapsed && (
            <div className="mb-2">
              <p className="text-xs font-semibold text-slate-700 truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          )}
          <button onClick={logout} className="flex items-center gap-2 text-sm text-slate-500 hover:text-red-600 transition-colors" data-testid="logout-btn">
            <SignOut size={18} weight="bold" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-[#E2E8F0] flex items-center px-6 shrink-0">
          <h1 className="font-heading font-bold text-lg">{pageTitle}</h1>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-xs uppercase tracking-wider font-bold text-[#002FA7]">v0.2</span>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
