// app/components/LiveChat.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { db } from '@/app/firebase/config';
// FIX 1: Import the 'Timestamp' type from Firestore
import { collection, addDoc, query, orderBy, onSnapshot, where, serverTimestamp, Timestamp } from 'firebase/firestore';
import { SendHorizontal, Crown, Shield, User, MessageCircle } from 'lucide-react';

// Interface for a single chat message from Firestore
interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  isCreator?: boolean;
  isAdmin?: boolean;
  // FIX 2: Use the imported 'Timestamp' type. It can be null initially.
  timestamp: Timestamp | null; 
}

// Props for the LiveChat component
interface LiveChatProps {
  streamId: string; // The unique ID for the stream (e.g., the stream key)
  creatorId: string; // The UID of the person streaming
}

export default function LiveChat({ streamId, creatorId }: LiveChatProps) {
  const { user, isSuperAdmin } = useAuth(); 
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!streamId) return;

    const messagesCollectionRef = collection(db, `livestreams/${streamId}/messages`);
    const q = query(
      messagesCollectionRef, 
      where("status", "==", "approved"), 
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as ChatMessage[];
      setMessages(fetchedMessages);
    });

    return () => unsubscribe();
  }, [streamId]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !streamId) return;

    const messagesCollectionRef = collection(db, `livestreams/${streamId}/messages`);
    
    await addDoc(messagesCollectionRef, {
      text: newMessage,
      authorId: user.uid,
      authorName: user.displayName || 'Anonymous',
      isCreator: user.uid === creatorId,
      isAdmin: isSuperAdmin,
      timestamp: serverTimestamp(),
      status: 'pending',
    });

    setNewMessage('');
  };
  
  // FIX 3: Type the 'timestamp' parameter correctly.
  const formatTimestamp = (timestamp: Timestamp | null) => {
    if (!timestamp) return ''; // This check correctly handles the 'null' case
    return new Date(timestamp.seconds * 1000).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="w-full lg:max-w-sm h-[70vh] flex flex-col bg-gradient-to-b from-gray-900 to-emerald-950/30 border border-emerald-900 rounded-2xl shadow-2xl shadow-emerald-900/20">
      {/* --- Rest of your JSX is unchanged --- */}
      <div className="flex items-center justify-center gap-2 p-4 border-b border-emerald-800/50">
        <MessageCircle className="w-5 h-5 text-emerald-500" />
        <h2 className="text-lg font-bold text-center text-white">Live Chat</h2>
      </div>
      <div 
        ref={chatContainerRef} 
        className="flex-grow p-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-700 scrollbar-track-gray-950"
      >
        {messages.map((msg) => {
          const isCurrentUser = user?.uid === msg.authorId;
          return (
            <div 
              key={msg.id} 
              className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${isCurrentUser ? 'bg-green-800/40 border border-green-700/30' : 'border border-transparent'}`}
            >
              <div className="w-8 h-8 flex-shrink-0 rounded-full bg-emerald-900/50 flex items-center justify-center mt-1">
                <User className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-400">
                    {msg.authorName}
                  </span>
                  {msg.isAdmin && <Shield className="w-4 h-4 text-red-500"><title>Admin</title></Shield>}
                  {msg.isCreator && <Crown className="w-4 h-4 text-emerald-400"><title>Creator</title></Crown>}
                </div>
                <p className="text-gray-200 break-words">{msg.text}</p>
                <span className="text-xs text-gray-500">{formatTimestamp(msg.timestamp)}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-4 border-t border-emerald-800/50 bg-gray-950/30">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Send a message..."
            className="flex-grow bg-gray-800 text-white px-4 py-2 rounded-full border border-emerald-800/60 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            disabled={!user}
          />
          <button
            type="submit"
            className="bg-emerald-600 text-white p-3 rounded-full hover:bg-emerald-500 disabled:bg-gray-700 disabled:cursor-not-allowed transition-all duration-200"
            disabled={!newMessage.trim() || !user}
          >
            <SendHorizontal className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}