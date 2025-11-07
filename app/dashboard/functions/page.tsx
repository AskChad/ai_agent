'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input } from '@/components/ui';

// Mock data - will be replaced with API calls
const mockFunctions = [
  {
    id: '1',
    name: 'get_contact_details',
    description: 'Retrieve contact information from GoHighLevel',
    handler_type: 'internal',
    is_enabled: true,
    call_count: 145,
    success_rate: 98,
    avg_execution_time: 250,
  },
  {
    id: '2',
    name: 'create_opportunity',
    description: 'Create a new opportunity in the pipeline',
    handler_type: 'internal',
    is_enabled: true,
    call_count: 89,
    success_rate: 95,
    avg_execution_time: 320,
  },
  {
    id: '3',
    name: 'send_ghl_message',
    description: 'Send SMS, Email, or WhatsApp message via GHL',
    handler_type: 'internal',
    is_enabled: true,
    call_count: 234,
    success_rate: 99,
    avg_execution_time: 180,
  },
  {
    id: '4',
    name: 'check_inventory',
    description: 'Check product inventory via webhook',
    handler_type: 'webhook',
    is_enabled: true,
    call_count: 42,
    success_rate: 92,
    avg_execution_time: 450,
  },
  {
    id: '5',
    name: 'get_weather',
    description: 'Get weather information from external API',
    handler_type: 'api',
    is_enabled: false,
    call_count: 0,
    success_rate: 0,
    avg_execution_time: 0,
  },
  {
    id: '6',
    name: 'lookup_customer_orders',
    description: 'Query customer orders from database',
    handler_type: 'database',
    is_enabled: true,
    call_count: 67,
    success_rate: 100,
    avg_execution_time: 120,
  },
];

export default function FunctionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredFunctions = mockFunctions.filter((func) => {
    const matchesSearch = func.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         func.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || func.handler_type === filterType;
    return matchesSearch && matchesType;
  });

  const getHandlerBadgeColor = (type: string) => {
    switch (type) {
      case 'internal': return 'info';
      case 'webhook': return 'warning';
      case 'api': return 'success';
      case 'database': return 'default';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Functions</h1>
          <p className="text-gray-900 mt-1">Manage AI function calling capabilities</p>
        </div>
        <Link href="/dashboard/functions/create">
          <Button>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Function
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search functions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterType === 'all' ? 'primary' : 'ghost'}
                onClick={() => setFilterType('all')}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={filterType === 'internal' ? 'primary' : 'ghost'}
                onClick={() => setFilterType('internal')}
                size="sm"
              >
                Internal
              </Button>
              <Button
                variant={filterType === 'webhook' ? 'primary' : 'ghost'}
                onClick={() => setFilterType('webhook')}
                size="sm"
              >
                Webhook
              </Button>
              <Button
                variant={filterType === 'api' ? 'primary' : 'ghost'}
                onClick={() => setFilterType('api')}
                size="sm"
              >
                API
              </Button>
              <Button
                variant={filterType === 'database' ? 'primary' : 'ghost'}
                onClick={() => setFilterType('database')}
                size="sm"
              >
                Database
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-900">Total Functions</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{mockFunctions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-900">Active</p>
            <p className="text-2xl font-bold text-green-900 mt-1">
              {mockFunctions.filter(f => f.is_enabled).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-900">Total Calls</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {mockFunctions.reduce((sum, f) => sum + f.call_count, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-900">Avg Success Rate</p>
            <p className="text-2xl font-bold text-green-900 mt-1">
              {Math.round(mockFunctions.reduce((sum, f) => sum + f.success_rate, 0) / mockFunctions.length)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Functions List */}
      <div className="space-y-4">
        {filteredFunctions.map((func) => (
          <Card key={func.id} hover>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{func.name}</h3>
                    <Badge variant={getHandlerBadgeColor(func.handler_type)}>
                      {func.handler_type}
                    </Badge>
                    <Badge variant={func.is_enabled ? 'success' : 'default'}>
                      {func.is_enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <p className="text-gray-900 mb-4">{func.description}</p>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <p className="text-xs text-gray-900 uppercase">Calls</p>
                      <p className="text-lg font-semibold text-gray-900">{func.call_count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-900 uppercase">Success Rate</p>
                      <p className="text-lg font-semibold text-gray-900">{func.success_rate}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-900 uppercase">Avg Time</p>
                      <p className="text-lg font-semibold text-gray-900">{func.avg_execution_time}ms</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link href={`/dashboard/functions/${func.id}/test`}>
                    <Button variant="outline" size="sm">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Test
                    </Button>
                  </Link>
                  <Link href={`/dashboard/functions/${func.id}/edit`}>
                    <Button variant="ghost" size="sm">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </Button>
                  </Link>
                  <Link href={`/dashboard/functions/${func.id}/logs`}>
                    <Button variant="ghost" size="sm">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Logs
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredFunctions.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-900 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No functions found</h3>
            <p className="text-gray-900 mb-4">Try adjusting your search or filters</p>
            <Link href="/dashboard/functions/create">
              <Button>Create your first function</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
