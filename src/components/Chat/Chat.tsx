import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./Chat.css";

interface ChatMessage {
  role: string;
  content: string;
  timestamp: number;
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Listen for chat messages from backend
    const unlisten = listen<ChatMessage>("chat-message", (event) => {
      setMessages((prev) => [...prev, event.payload]);
    });

    return () => {
      unlisten.then((u) => u());
    };
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput("");
    setIsLoading(true);

    try {
      await invoke("send_message", { message: userMessage });
    } catch (error) {
      console.error("Failed to send message:", error);
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: `Error: ${error}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">
            <p className="text-lg mb-2">VFX Bidding AI Assistant</p>
            <p className="text-sm">Ask me anything about VFX bidding...</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-2xl rounded-lg px-4 py-2 ${
                  msg.role === "user"
                    ? "bg-primary-600 text-white"
                    : msg.role === "system"
                    ? "bg-red-600 text-white"
                    : "bg-gray-700 text-gray-100"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(msg.timestamp * 1000).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 rounded-lg px-4 py-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message... (Press Enter to send)"
            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white resize-none focus:outline-none focus:border-primary-500"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
