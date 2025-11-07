'use client';

import React, { useState, KeyboardEvent } from 'react';
import { Button } from '@/components/ui';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  isLoading = false,
  placeholder = 'Type your message...',
}) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && !isLoading) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <div className="flex gap-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={isLoading}
          rows={1}
          className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-3 text-black placeholder:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-900"
          style={{ minHeight: '52px', maxHeight: '150px' }}
        />
        <Button
          onClick={handleSend}
          disabled={!message.trim() || isLoading}
          isLoading={isLoading}
          className="self-end"
        >
          {isLoading ? (
            'Sending...'
          ) : (
            <>
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Send
            </>
          )}
        </Button>
      </div>
      <p className="text-xs text-gray-900 mt-2">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
};
