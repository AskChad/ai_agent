'use client';

import { Card, CardHeader, CardTitle, CardContent, Select, Button } from '@/components/ui';
import { useState } from 'react';

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('7d');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-900 mt-1">Monitor your AI agent performance and usage</p>
        </div>
        <div className="flex gap-3">
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            options={[
              { value: '24h', label: 'Last 24 hours' },
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: '90d', label: 'Last 90 days' },
            ]}
          />
          <Button variant="outline">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-900">Total Messages</p>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">12,458</p>
            <div className="flex items-center mt-2">
              <span className="text-sm text-green-900 font-medium">+12.5%</span>
              <span className="text-sm text-gray-900 ml-2">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-900">Function Calls</p>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">3,842</p>
            <div className="flex items-center mt-2">
              <span className="text-sm text-green-900 font-medium">+8.2%</span>
              <span className="text-sm text-gray-900 ml-2">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-900">Avg Response Time</p>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">1.2s</p>
            <div className="flex items-center mt-2">
              <span className="text-sm text-green-900 font-medium">-0.3s</span>
              <span className="text-sm text-gray-900 ml-2">improvement</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-900">Success Rate</p>
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">97.8%</p>
            <div className="flex items-center mt-2">
              <span className="text-sm text-green-900 font-medium">+2.1%</span>
              <span className="text-sm text-gray-900 ml-2">vs last period</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Message Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-gray-900">
              Chart visualization (integrate with Recharts)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Function Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'get_contact_details', count: 1245, percentage: 32 },
                { name: 'send_ghl_message', count: 987, percentage: 26 },
                { name: 'create_opportunity', count: 654, percentage: 17 },
                { name: 'update_contact_tag', count: 456, percentage: 12 },
                { name: 'check_inventory', count: 500, percentage: 13 },
              ].map((func, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{func.name}</span>
                    <span className="text-sm text-gray-900">{func.count} calls</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${func.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Functions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-900">Function</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-900">Calls</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-900">Success Rate</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-900">Avg Time</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-900">Trend</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'get_contact_details', calls: 1245, success: 99.2, time: 245, trend: 'up' },
                  { name: 'send_ghl_message', calls: 987, success: 98.5, time: 180, trend: 'up' },
                  { name: 'create_opportunity', calls: 654, success: 96.8, time: 320, trend: 'down' },
                  { name: 'update_contact_tag', calls: 456, success: 100, time: 150, trend: 'up' },
                  { name: 'check_inventory', calls: 500, success: 94.2, time: 450, trend: 'down' },
                ].map((func, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{func.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">{func.calls.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">{func.success}%</td>
                    <td className="py-3 px-4 text-sm text-gray-900">{func.time}ms</td>
                    <td className="py-3 px-4">
                      {func.trend === 'up' ? (
                        <span className="text-green-900 flex items-center text-sm">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                          </svg>
                          Trending up
                        </span>
                      ) : (
                        <span className="text-red-900 flex items-center text-sm">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                          Trending down
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Cost Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Token Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-900">OpenAI</span>
                  <span className="text-sm font-medium text-gray-900">245,678 tokens</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-900">Anthropic</span>
                  <span className="text-sm font-medium text-gray-900">82,345 tokens</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: '25%' }}></div>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-900">Estimated Cost</span>
                  <span className="text-lg font-bold text-gray-900">$124.50</span>
                </div>
                <p className="text-xs text-gray-900 mt-1">For the selected period</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center text-gray-900">
              Time series chart showing active conversations
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
