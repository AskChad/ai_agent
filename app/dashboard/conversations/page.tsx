'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input } from '@/components/ui';

// Mock data
const mockConversations = [
  {
    id: '1',
    contact_name: 'John Doe',
    contact_email: 'john@example.com',
    last_message: 'Thanks for the information!',
    last_message_time: '2024-11-04T10:30:00Z',
    message_count: 12,
    status: 'active',
    unread_count: 2,
  },
  {
    id: '2',
    contact_name: 'Jane Smith',
    contact_email: 'jane@example.com',
    last_message: 'Can you help me with my order?',
    last_message_time: '2024-11-04T09:15:00Z',
    message_count: 8,
    status: 'active',
    unread_count: 1,
  },
  {
    id: '3',
    contact_name: 'Bob Johnson',
    contact_email: 'bob@example.com',
    last_message: 'Perfect, that resolved my issue.',
    last_message_time: '2024-11-03T16:45:00Z',
    message_count: 5,
    status: 'resolved',
    unread_count: 0,
  },
  {
    id: '4',
    contact_name: 'Alice Williams',
    contact_email: 'alice@example.com',
    last_message: 'When will my appointment be?',
    last_message_time: '2024-11-03T14:20:00Z',
    message_count: 15,
    status: 'active',
    unread_count: 3,
  },
];

export default function ConversationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredConversations = mockConversations.filter((conv) => {
    const matchesSearch =
      conv.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.contact_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.last_message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || conv.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Conversations</h1>
          <p className="text-gray-900 mt-1">View and manage customer conversations</p>
        </div>
        <Button>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Conversation
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-900">Total Conversations</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{mockConversations.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-900">Active</p>
            <p className="text-2xl font-bold text-green-900 mt-1">
              {mockConversations.filter((c) => c.status === 'active').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-900">Total Messages</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {mockConversations.reduce((sum, c) => sum + c.message_count, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-900">Unread</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">
              {mockConversations.reduce((sum, c) => sum + c.unread_count, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'primary' : 'ghost'}
                onClick={() => setFilterStatus('all')}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={filterStatus === 'active' ? 'primary' : 'ghost'}
                onClick={() => setFilterStatus('active')}
                size="sm"
              >
                Active
              </Button>
              <Button
                variant={filterStatus === 'resolved' ? 'primary' : 'ghost'}
                onClick={() => setFilterStatus('resolved')}
                size="sm"
              >
                Resolved
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversations List */}
      <div className="space-y-3">
        {filteredConversations.map((conversation) => (
          <Link key={conversation.id} href={`/dashboard/conversations/${conversation.id}`}>
            <Card hover>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {conversation.contact_name.charAt(0)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{conversation.contact_name}</h3>
                        <Badge variant={conversation.status === 'active' ? 'success' : 'default'} size="sm">
                          {conversation.status}
                        </Badge>
                        {conversation.unread_count > 0 && (
                          <Badge variant="info" size="sm">
                            {conversation.unread_count} new
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-900 mb-1">{conversation.contact_email}</p>
                      <p className="text-sm text-gray-900 truncate">{conversation.last_message}</p>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="text-right ml-4 flex-shrink-0">
                    <p className="text-sm text-gray-900">{formatTime(conversation.last_message_time)}</p>
                    <p className="text-xs text-gray-900 mt-1">{conversation.message_count} messages</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filteredConversations.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-900 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations found</h3>
            <p className="text-gray-900">Try adjusting your search or filters</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
