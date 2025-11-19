'use client';

import { useState, useEffect } from 'react';
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import { getChannelDisplayName, getChannelIcon } from '@/lib/ghl/channels';

interface OAuthScope {
  id: string;
  description: string;
  category: string;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [ghlConnected, setGhlConnected] = useState(false);
  const [ghlLocation, setGhlLocation] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // OAuth scope selection
  const [showScopeSelector, setShowScopeSelector] = useState(false);
  const [availableScopes, setAvailableScopes] = useState<Record<string, string>>({});
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [useDefaultScopes, setUseDefaultScopes] = useState(true);

  useEffect(() => {
    // Check URL params for OAuth callback messages
    const params = new URLSearchParams(window.location.search);

    if (params.get('ghl_connected') === 'true') {
      setMessage({ type: 'success', text: 'Successfully connected to GoHighLevel!' });
      setGhlConnected(true);
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard/settings');
    }

    if (params.get('ghl_error')) {
      const error = params.get('ghl_error');
      setMessage({ type: 'error', text: `Failed to connect: ${error}` });
      window.history.replaceState({}, '', '/dashboard/settings');
    }

    // Check URL for multi-location success
    if (params.get('locations')) {
      const locationCount = params.get('locations');
      setMessage({
        type: 'success',
        text: `Successfully connected to GoHighLevel! ${locationCount} location(s) configured.`
      });
      setGhlConnected(true);
      window.history.replaceState({}, '', '/dashboard/settings');
    }

    // Check current GHL connection status
    checkGHLStatus();

    // Load available OAuth scopes
    loadAvailableScopes();
  }, []);

  const loadAvailableScopes = async () => {
    try {
      const response = await fetch('/api/ghl/scopes');
      if (response.ok) {
        const data = await response.json();
        setAvailableScopes(data.scopes || {});
        setSelectedScopes(data.defaultScopes || []);
      }
    } catch (error) {
      console.error('Failed to load OAuth scopes:', error);
    }
  };

  const checkGHLStatus = async () => {
    try {
      const response = await fetch('/api/ghl/status');
      if (response.ok) {
        const data = await response.json();
        setGhlConnected(data.connected);
        setGhlLocation(data.locationId || null);
      }
    } catch (error) {
      console.error('Failed to check GHL status:', error);
    }
  };

  const handleConnectGHL = async () => {
    setLoading(true);
    setMessage(null);

    try {
      // Determine which scopes to request
      const scopesToRequest = useDefaultScopes ? undefined : selectedScopes;

      const response = await fetch('/api/ghl/oauth/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scopes: scopesToRequest }),
      });
      const data = await response.json();

      if (data.authUrl) {
        // Redirect to GHL authorization page
        window.location.href = data.authUrl;
      } else {
        setMessage({ type: 'error', text: 'Failed to get authorization URL' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to initiate OAuth flow' });
    } finally {
      setLoading(false);
    }
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes(prev =>
      prev.includes(scope)
        ? prev.filter(s => s !== scope)
        : [...prev, scope]
    );
  };

  const handleDisconnectGHL = async () => {
    if (!confirm('Are you sure you want to disconnect GoHighLevel? This will stop message synchronization.')) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/ghl/disconnect', { method: 'POST' });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Successfully disconnected from GoHighLevel' });
        setGhlConnected(false);
        setGhlLocation(null);
      } else {
        setMessage({ type: 'error', text: 'Failed to disconnect' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to disconnect from GoHighLevel' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-900">Manage your AI Chat Agent configuration and integrations</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'
        }`}>
          {message.text}
        </div>
      )}

      {/* GoHighLevel Integration */}
      <Card>
        <CardHeader>
          <CardTitle>GoHighLevel Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">Marketplace App Connection</h3>
                  {ghlConnected ? (
                    <Badge variant="success">Connected</Badge>
                  ) : (
                    <Badge variant="default">Not Connected</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-900 mb-4">
                  Connect your GoHighLevel account to enable bi-directional messaging across all channels:
                  SMS, Email, WhatsApp, Facebook, Instagram, and Google Business.
                </p>

                {ghlLocation && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-900">
                      <strong>Location ID:</strong> {ghlLocation}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-900">Supported Channels:</h4>
                  <div className="flex flex-wrap gap-2">
                    {['SMS', 'Email', 'WhatsApp', 'GMB', 'FB', 'Instagram'].map((channel) => (
                      <div
                        key={channel}
                        className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-900 font-medium"
                      >
                        <span>{getChannelIcon(channel)}</span>
                        <span>{getChannelDisplayName(channel)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* OAuth Scope Selection */}
            {!ghlConnected && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-sm text-gray-900">OAuth Permissions</h4>
                  <button
                    onClick={() => setShowScopeSelector(!showScopeSelector)}
                    className="text-sm text-blue-900 hover:underline font-medium"
                  >
                    {showScopeSelector ? 'Hide' : 'Customize Permissions'}
                  </button>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useDefaultScopes}
                      onChange={(e) => setUseDefaultScopes(e.target.checked)}
                      className="w-4 h-4 text-blue-900 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900">
                      Use recommended permissions (messaging, contacts, location info)
                    </span>
                  </label>

                  {showScopeSelector && !useDefaultScopes && (
                    <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                      <p className="text-xs text-gray-900 mb-3">
                        Select which permissions to request. More permissions give your AI agent more capabilities.
                      </p>
                      {Object.entries(availableScopes).map(([scope, description]) => (
                        <label
                          key={scope}
                          className="flex items-start gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedScopes.includes(scope)}
                            onChange={() => toggleScope(scope)}
                            className="w-4 h-4 text-blue-900 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{scope}</div>
                            <div className="text-xs text-gray-900">{description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  {!useDefaultScopes && (
                    <div className="mt-2 text-xs text-gray-900">
                      <strong>Selected:</strong> {selectedScopes.length} permission(s)
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              {!ghlConnected ? (
                <Button
                  onClick={handleConnectGHL}
                  isLoading={loading}
                  variant="primary"
                >
                  Connect to GoHighLevel
                </Button>
              ) : (
                <>
                  <Button
                    onClick={checkGHLStatus}
                    variant="secondary"
                    isLoading={loading}
                  >
                    Refresh Status
                  </Button>
                  <Button
                    onClick={handleDisconnectGHL}
                    variant="danger"
                    isLoading={loading}
                  >
                    Disconnect
                  </Button>
                </>
              )}
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-sm text-gray-900 mb-2">Setup Instructions:</h4>
              <ol className="text-sm text-gray-900 space-y-2 list-decimal list-inside">
                <li>Create a marketplace app at <a href="https://marketplace.gohighlevel.com" target="_blank" rel="noopener noreferrer" className="text-blue-900 hover:underline">marketplace.gohighlevel.com</a></li>
                <li>Configure OAuth with redirect URI: <code className="bg-white px-2 py-1 rounded text-xs text-gray-900">{process.env.NEXT_PUBLIC_APP_URL}/api/ghl/oauth/callback</code></li>
                <li>Add required scopes: conversations.readonly, conversations.write, conversations/message.readonly, conversations/message.write</li>
                <li>Create a Conversation Provider in your marketplace app</li>
                <li>Set the webhook delivery URL to: <code className="bg-white px-2 py-1 rounded text-xs text-gray-900">{process.env.NEXT_PUBLIC_APP_URL}/api/ghl/webhooks/outbound-message</code></li>
                <li>Add your Client ID, Secret, and Provider ID to the .env.local file</li>
                <li>Click &quot;Connect to GoHighLevel&quot; above to complete authorization</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>AI Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Default AI Provider
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="openai">OpenAI (GPT-4)</option>
                <option value="anthropic">Anthropic (Claude)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Context Window (messages)
              </label>
              <input
                type="number"
                defaultValue={60}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black placeholder:text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Enable Function Calling
              </label>
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-blue-900 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>

            <Button variant="primary">Save AI Settings</Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Account Name
              </label>
              <input
                type="text"
                placeholder="My Company"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black placeholder:text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Time Zone
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
              </select>
            </div>

            <Button variant="primary">Save Account Settings</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
