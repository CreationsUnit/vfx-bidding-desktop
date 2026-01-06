import { useState, useEffect, useRef } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useBidStore } from '../../stores/bidStore';
import { chatService } from '../../services/tauri';

/**
 * Chat Window Component
 * Provides conversational AI interface for VFX bidding assistance
 */
export default function ChatWindow() {
  const messages = useChatStore((state) => state.messages);
  const isLoading = useChatStore((state) => state.isLoading);
  const addMessage = useChatStore((state) => state.addMessage);
  const setLoading = useChatStore((state) => state.setLoading);
  const currentScript = useBidStore((state) => state.currentScript);

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for incoming chat messages from backend
  useEffect(() => {
    const unlisten = chatService.onChatMessage((message) => {
      addMessage({
        role: message.role as 'user' | 'assistant' | 'system',
        content: message.content,
        timestamp: message.timestamp,
      });
      setLoading(false);
    });

    return () => {
      unlisten.then((u) => u());
    };
  }, [addMessage, setLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    // Add user message to store
    addMessage({
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    });

    try {
      await chatService.sendMessage(userMessage);
    } catch (error) {
      console.error('Failed to send message:', error);
      addMessage({
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
        timestamp: Date.now(),
      });
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleExampleClick = (example: string) => {
    setInput(example);
    textareaRef.current?.focus();
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            {/* Empty State */}
            <div className="mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">VFX Bidding AI Assistant</h2>
              <p className="text-gray-400 mb-6">
                {!currentScript
                  ? 'Load a script to start chatting about VFX shots and pricing'
                  : 'Ask me anything about your VFX bid...'}
              </p>
            </div>

            {/* Example Prompts */}
            <div className="grid grid-cols-2 gap-3 max-w-2xl">
              {!currentScript ? (
                <>
                  <button
                    onClick={() => handleExampleClick('Help me load a script file')}
                    className="p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-500 rounded-xl text-left transition-all"
                  >
                    <p className="text-sm text-gray-300">Help me load a script file</p>
                  </button>
                  <button
                    onClick={() => handleExampleClick('What file formats are supported?')}
                    className="p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-500 rounded-xl text-left transition-all"
                  >
                    <p className="text-sm text-gray-300">What file formats are supported?</p>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleExampleClick('Analyze the script and list all VFX shots')}
                    className="p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-500 rounded-xl text-left transition-all"
                  >
                    <p className="text-sm text-gray-300">Analyze the script and list all VFX shots</p>
                  </button>
                  <button
                    onClick={() => handleExampleClick('What is the estimated budget for Scene 8?')}
                    className="p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-500 rounded-xl text-left transition-all"
                  >
                    <p className="text-sm text-gray-300">What is the estimated budget for Scene 8?</p>
                  </button>
                  <button
                    onClick={() => handleExampleClick('Break down the complexity of the spaceship crash shot')}
                    className="p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-500 rounded-xl text-left transition-all"
                  >
                    <p className="text-sm text-gray-300">Break down the complexity of the spaceship crash</p>
                  </button>
                  <button
                    onClick={() => handleExampleClick('Generate the final bid document')}
                    className="p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-500 rounded-xl text-left transition-all"
                  >
                    <p className="text-sm text-gray-300">Generate the final bid document</p>
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex gap-3 max-w-3xl ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    msg.role === 'user'
                      ? 'bg-blue-600'
                      : msg.role === 'system'
                      ? 'bg-red-600'
                      : 'bg-gradient-to-br from-purple-500 to-pink-500'
                  }`}>
                    {msg.role === 'user' ? (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    ) : msg.role === 'system' ? (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    )}
                  </div>

                  {/* Message Content */}
                  <div className={`flex-1 rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : msg.role === 'system'
                      ? 'bg-red-600/90 text-white'
                      : 'bg-gray-800 text-gray-100 border border-gray-700'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    <p className={`text-xs mt-2 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-500'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="bg-gray-800 rounded-2xl px-4 py-3 border border-gray-700">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-700 p-4 bg-gray-800">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={
                !currentScript
                  ? "Load a script first, then ask me anything... (Press Enter to send)"
                  : "Ask me anything about your VFX bid... (Press Enter to send)"
              }
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              rows={2}
              disabled={isLoading}
            />
            {/* Character count */}
            <div className="absolute bottom-2 right-2 text-xs text-gray-500">
              {input.length} / 2000
            </div>
          </div>
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl font-medium transition-all duration-200 flex items-center gap-2 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 disabled:shadow-none"
          >
            {isLoading ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Sending...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
