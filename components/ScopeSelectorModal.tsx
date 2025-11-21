'use client';

import { useState, useMemo } from 'react';
import { GHL_SCOPES, getScopesByCategory, COMMON_SCOPE_SETS } from '@/lib/constants/ghl-scopes';

interface ScopeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentScopes: string;
  onSave: (scopes: string) => void;
}

export default function ScopeSelectorModal({
  isOpen,
  onClose,
  currentScopes,
  onSave,
}: ScopeSelectorModalProps) {
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(
    new Set(currentScopes.split(' ').filter(Boolean))
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['Contacts', 'Locations', 'Opportunities'])
  );
  const [includeSaasMode, setIncludeSaasMode] = useState(false);

  const scopesByCategory = useMemo(() => getScopesByCategory(), []);

  const filteredScopesByCategory = useMemo(() => {
    if (!searchTerm) return scopesByCategory;

    const filtered: typeof scopesByCategory = {};
    Object.entries(scopesByCategory).forEach(([category, scopes]) => {
      const matchingScopes = scopes.filter(
        (scope) =>
          scope.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          scope.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          scope.value.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (matchingScopes.length > 0) {
        filtered[category] = matchingScopes;
      }
    });
    return filtered;
  }, [scopesByCategory, searchTerm]);

  const toggleScope = (scopeValue: string) => {
    const newSelected = new Set(selectedScopes);
    if (newSelected.has(scopeValue)) {
      newSelected.delete(scopeValue);
    } else {
      newSelected.add(scopeValue);
    }
    setSelectedScopes(newSelected);
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const selectAll = () => {
    const scopesToSelect = includeSaasMode
      ? GHL_SCOPES
      : GHL_SCOPES.filter((s) => !s.requiresApproval);
    setSelectedScopes(new Set(scopesToSelect.map((s) => s.value)));
  };

  const deselectAll = () => {
    setSelectedScopes(new Set());
  };

  const applyPreset = (preset: keyof typeof COMMON_SCOPE_SETS) => {
    const scopes = COMMON_SCOPE_SETS[preset].scopes.split(' ');
    setSelectedScopes(new Set(scopes));
  };

  const handleSave = () => {
    const scopesString = Array.from(selectedScopes).join(' ');
    onSave(scopesString);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Select OAuth Scopes</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Search */}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search scopes..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Quick Actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={selectAll}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Select All
            </button>
            <button
              onClick={deselectAll}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Deselect All
            </button>
            <div className="border-l border-gray-300 mx-2"></div>
            <label className="flex items-center gap-2 px-3 py-1 bg-yellow-50 border border-yellow-300 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={includeSaasMode}
                onChange={(e) => setIncludeSaasMode(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Include SaaS Mode</span>
            </label>
            <div className="border-l border-gray-300 mx-2"></div>
            <span className="text-sm text-gray-600 self-center">Presets:</span>
            {Object.entries(COMMON_SCOPE_SETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => applyPreset(key as keyof typeof COMMON_SCOPE_SETS)}
                className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
              >
                {preset.name}
              </button>
            ))}
          </div>

          {/* Selected Count */}
          <div className="mt-3 text-sm text-gray-600">
            Selected: {selectedScopes.size} / {GHL_SCOPES.length} scopes
            {selectedScopes.size > 0 && (
              <span className="ml-2">
                ({Array.from(selectedScopes).filter(v => GHL_SCOPES.find(s => s.value === v && !s.requiresApproval)).length} standard, {' '}
                {Array.from(selectedScopes).filter(v => GHL_SCOPES.find(s => s.value === v && s.requiresApproval)).length} restricted)
              </span>
            )}
          </div>
        </div>

        {/* Scope List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {Object.entries(filteredScopesByCategory).map(([category, scopes]) => (
            <div key={category} className="mb-4">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between py-2 px-3 bg-gray-100 rounded hover:bg-gray-200"
              >
                <span className="font-semibold text-gray-900">{category}</span>
                <span className="text-gray-600">
                  {expandedCategories.has(category) ? '▼' : '▶'}
                </span>
              </button>

              {/* Category Scopes */}
              {expandedCategories.has(category) && (
                <div className="mt-2 space-y-2">
                  {scopes.map((scope) => (
                    <label
                      key={scope.value}
                      className="flex items-start gap-3 p-3 rounded border border-gray-200 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedScopes.has(scope.value)}
                        onChange={() => toggleScope(scope.value)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 block">{scope.label}</span>
                          {scope.requiresApproval && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300 rounded">
                              {scope.approvalType}
                            </span>
                          )}
                        </div>
                        <div className="block text-sm text-gray-600 break-words">{scope.description}</div>
                        <div className="block text-xs text-gray-400 font-mono mt-1 break-all">{scope.value}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Apply Selected Scopes
          </button>
        </div>
      </div>
    </div>
  );
}
