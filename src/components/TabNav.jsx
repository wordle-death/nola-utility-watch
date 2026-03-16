export default function TabNav({ tabs, activeTab, onTabChange }) {
  return (
    <nav className="sticky top-0 z-10 bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 sm:flex-none px-6 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
