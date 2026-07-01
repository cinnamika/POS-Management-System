import {
  ShoppingCart,
  History,
  LogOut,
  PackageSearch,
  BarChart3,
  ExternalLink,
} from 'lucide-react';

import logoSrc from '../assets/OpistockLogo.png';
import { MODULE_URLS } from '../config';

export default function Sidebar({ currentPage, setCurrentPage, currentUser, setCurrentUser }) {
  const menus = [
    {
      id: 'transaction',
      name: 'Point of Sale',
      icon: ShoppingCart
    },
    {
      id: 'history',
      name: 'Transaction History',
      icon: History
    }
  ];

  return (
    <aside className="w-72 bg-white border-r border-gray-100 flex flex-col justify-between min-h-screen shadow-sm">
      
      {/* Logo Section */}
      <div>
        <div className="px-6 py-8 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <img
              src={logoSrc}
              alt="OpiStock"
              className="h-16 object-contain"
            />
            <div>
              <h1
                className="text-xl font-bold leading-none"
                style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.16)' }}
              >
                <span className="text-[#5e35b1]">Opi</span>
                <span className="ml-1 inline-flex items-center rounded-full bg-[#5e35b1] px-3 py-1 text-sm text-white">
                  Stock
                </span>
              </h1>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          <p className="text-xs uppercase font-bold tracking-wider text-gray-400 px-3 mb-3">
            Main Menu
          </p>

          {menus.map((menu) => {
            const Icon = menu.icon;

            const isActive =
              currentPage === menu.id ||
              (menu.id === 'transaction' &&
                ['payment', 'receipt'].includes(currentPage)) ||
              (menu.id === 'history' &&
                currentPage === 'details');

            return (
              <button
                key={menu.id}
                onClick={() => setCurrentPage(menu.id)}
                className={`
                  w-full flex items-center gap-4 px-4 py-3 rounded-xl
                  transition-all duration-200 font-medium text-sm
                  ${
                    isActive
                      ? 'bg-[#ede7f6] text-[#5e35b1]'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-[#5e35b1]'
                  }
                `}
              >
                <Icon size={20} className={isActive ? 'text-[#5e35b1]' : 'text-gray-500'} />
                <span>{menu.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Integrated Modules */}
      <nav className="p-4">
        <p className="text-xs uppercase font-bold tracking-wider text-gray-400 px-3 mb-3">
          Integrated
        </p>
        {MODULE_URLS.INVENTORY ? (
          <a
            href={MODULE_URLS.INVENTORY}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm text-gray-600 hover:bg-gray-50 hover:text-[#5e35b1] group"
          >
            <PackageSearch size={20} className="text-gray-500 group-hover:text-[#5e35b1]" />
            <span className="flex-1">Inventory Hub</span>
            <ExternalLink size={14} className="text-gray-400" />
          </a>
        ) : (
          <div className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm text-gray-400 opacity-50 cursor-not-allowed">
            <PackageSearch size={20} />
            <span>Inventory Hub</span>
          </div>
        )}
        {MODULE_URLS.DASHBOARD ? (
          <a
            href={MODULE_URLS.DASHBOARD}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm text-gray-600 hover:bg-gray-50 hover:text-[#5e35b1] group"
          >
            <BarChart3 size={20} className="text-gray-500 group-hover:text-[#5e35b1]" />
            <span className="flex-1">Dashboard</span>
            <ExternalLink size={14} className="text-gray-400" />
          </a>
        ) : (
          <div className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm text-gray-400 opacity-50 cursor-not-allowed">
            <BarChart3 size={20} />
            <span>Dashboard</span>
          </div>
        )}
      </nav>

      {/* User Section */}
      <div className="p-5 border-t border-gray-100 bg-gray-50/50">
        <div className="mb-4 px-2">
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
            Logged in as
          </p>
          <p className="text-gray-800 font-semibold text-sm mt-0.5">
            {currentUser?.firstName || 'Employee'}
          </p>
          <p className="text-xs text-gray-500">
            {currentUser?.employeeId || 'No employee ID'}
          </p>
        </div>

        <button
          onClick={() => {
            setCurrentUser(null);
            setCurrentPage('login');
            if (typeof window !== 'undefined') {
              window.sessionStorage.removeItem('opi-pos-session');
            }
          }}
          className="
            w-full flex items-center gap-3
            px-4 py-2.5 rounded-xl text-sm font-medium
            text-red-600 hover:bg-red-50
            transition-all duration-200
          "
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}
