import React from 'react';
import { Badge } from '@/components/ui';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  function_calls?: Array<{
    name: string;
    status: 'pending' | 'success' | 'error';
    result?: any;
  }>;
}

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-gray-100 text-gray-900 text-xs px-4 py-2 rounded-full">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex max-w-[70%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isUser ? 'ml-3' : 'mr-3'}`}>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isUser ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            {isUser ? (
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            )}
          </div>
        </div>

        {/* Message Content */}
        <div className="flex flex-col">
          <div
            className={`rounded-lg px-4 py-2 ${
              isUser
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>

          {/* Function Calls */}
          {message.function_calls && message.function_calls.length > 0 && (
            <div className={`mt-2 space-y-2 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
              {message.function_calls.map((call, index) => (
                <div
                  key={index}
                  className="bg-white border border-gray-200 rounded-lg p-3 text-sm max-w-full"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <span className="font-mono text-gray-900">{call.name}</span>
                    <Badge
                      variant={
                        call.status === 'success' ? 'success' :
                        call.status === 'error' ? 'danger' : 'warning'
                      }
                      size="sm"
                    >
                      {call.status}
                    </Badge>
                  </div>
                  {call.result && (
                    <pre className="text-xs text-gray-900 mt-2 overflow-x-auto">
                      {JSON.stringify(call.result, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Timestamp */}
          <span className={`text-xs text-gray-900 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
};
