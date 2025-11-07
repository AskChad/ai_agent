'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Message } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Card } from '@/components/ui';

interface ChatInterfaceProps {
  conversationId?: string;
  initialMessages?: Message[];
  onSendMessage?: (message: string) => Promise<void>;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  conversationId,
  initialMessages = [],
  onSendMessage,
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      if (onSendMessage) {
        await onSendMessage(content);
      } else {
        // Mock AI response for demo
        setTimeout(() => {
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'This is a demo response. Connect to your AI backend to get real responses.',
            timestamp: new Date().toISOString(),
            function_calls: [
              {
                name: 'get_contact_details',
                status: 'success',
                result: { name: 'John Doe', email: 'john@example.com' },
              },
            ],
          };
          setMessages((prev) => [...prev, aiMessage]);
          setIsLoading(false);
        }, 1000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Start a conversation</h3>
              <p className="text-gray-900 max-w-md">
                Send a message to begin chatting with the AI agent. It can help you with customer inquiries,
                data lookups, and more using configured functions.
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}

        {/* Typing Indicator */}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg px-4 py-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span className="text-sm text-gray-900">AI is thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};
