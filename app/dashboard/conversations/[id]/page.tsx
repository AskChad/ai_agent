'use client';

import { ChatInterface } from '@/components/chat/ChatInterface';
import { Message } from '@/components/chat/ChatMessage';
import { Card, CardContent, Badge, Button } from '@/components/ui';
import { useRouter } from 'next/navigation';

// Mock data for demo
const mockMessages: Message[] = [
  {
    id: '1',
    role: 'user',
    content: 'Hi, I need help with my order',
    timestamp: '2024-11-04T10:00:00Z',
  },
  {
    id: '2',
    role: 'assistant',
    content: "I'd be happy to help you with your order. Let me look up your information.",
    timestamp: '2024-11-04T10:00:05Z',
    function_calls: [
      {
        name: 'get_contact_details',
        status: 'success',
        result: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
        },
      },
    ],
  },
  {
    id: '3',
    role: 'assistant',
    content: 'I found your account, John. How can I help you with your order today?',
    timestamp: '2024-11-04T10:00:10Z',
  },
  {
    id: '4',
    role: 'user',
    content: 'I want to know the status of order #12345',
    timestamp: '2024-11-04T10:01:00Z',
  },
  {
    id: '5',
    role: 'assistant',
    content: 'Let me check that order for you.',
    timestamp: '2024-11-04T10:01:05Z',
    function_calls: [
      {
        name: 'lookup_customer_orders',
        status: 'success',
        result: {
          order_id: '12345',
          status: 'shipped',
          tracking: 'TRACK123456',
          est_delivery: '2024-11-06',
        },
      },
    ],
  },
];

export default function ConversationDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-6">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="border-b border-gray-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Button>
              <div>
                <h2 className="font-semibold text-gray-900">John Doe</h2>
                <p className="text-sm text-gray-900">john@example.com</p>
              </div>
              <Badge variant="success" size="sm">Active</Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
                Options
              </Button>
            </div>
          </div>

          {/* Chat Interface */}
          <div className="flex-1 overflow-hidden">
            <ChatInterface
              conversationId={params.id}
              initialMessages={mockMessages}
            />
          </div>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="lg:w-80 space-y-4">
        {/* Contact Info */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Contact Information</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-900 uppercase">Name</p>
                <p className="text-sm font-medium text-gray-900">John Doe</p>
              </div>
              <div>
                <p className="text-xs text-gray-900 uppercase">Email</p>
                <p className="text-sm font-medium text-gray-900">john@example.com</p>
              </div>
              <div>
                <p className="text-xs text-gray-900 uppercase">Phone</p>
                <p className="text-sm font-medium text-gray-900">+1 (555) 123-4567</p>
              </div>
              <div>
                <p className="text-xs text-gray-900 uppercase">Tags</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge size="sm">Customer</Badge>
                  <Badge size="sm" variant="info">VIP</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conversation Stats */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-900">Total Messages</span>
                <span className="text-sm font-medium text-gray-900">12</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-900">Duration</span>
                <span className="text-sm font-medium text-gray-900">2h 15m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-900">Functions Called</span>
                <span className="text-sm font-medium text-gray-900">5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-900">Started</span>
                <span className="text-sm font-medium text-gray-900">2h ago</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Conversation
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                Add Note
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Mark as Resolved
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
