import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, ArrowLeft, Check, CheckCheck, User, MessageSquare, Trash2, Edit2, MoreVertical, CheckCircle2, Reply, Pin, Copy, Forward, CheckSquare, Maximize2, Minimize2, Bot, Sparkles, Loader, RotateCcw, Mic, StopCircle, Paperclip } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import './chat.css';

// Build absolute URL for media files from VITE_API_URL
const getMediaUrl = (path: string | null | undefined) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const base = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/')
    .replace(/\/api\/?$/, '');
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
};

// Types
interface Contact {
  id: number;
  name: string;
  is_admin: boolean;
  role_subtitle: string;
  last_seen: string | null;
  last_message: string | null;
  last_message_date: string | null;
  unread_count: number;
}

interface Message {
  id: number;
  sender_id: number;
  recipient_id: number;
  content: string;
  audio_file?: string | null;
  image_file?: string | null;
  is_read: boolean;
  is_edited?: boolean;
  can_edit?: boolean;
  can_delete_for_all?: boolean;
  is_pinned?: boolean;
  reply_to_id?: number | null;
  reply_to_content?: string | null;
  forwarded_from_name?: string | null;
  created_at: string;
  read_at: string | null;
}

const cyrillicToLatinMap: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z',
  'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
  'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
  'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
};

const latinToCyrillicMap: Record<string, string> = {
  'a': 'а', 'b': 'б', 'v': 'в', 'g': 'г', 'd': 'д', 'e': 'е', 'z': 'з', 'i': 'и', 'y': 'й', 'k': 'к',
  'l': 'л', 'm': 'м', 'n': 'н', 'o': 'о', 'p': 'п', 'r': 'р', 's': 'с', 't': 'т', 'u': 'у', 'f': 'ф',
  'h': 'х', 'c': 'к', 'w': 'в', 'x': 'кс', 'j': 'дж', 'q': 'к'
};

const getSearchVariants = (q: string): string[] => {
  const cyr2lat = q.split('').map(char => cyrillicToLatinMap[char] || char).join('');

  let lat2cyr = q;
  const multiChar = { 'yo': 'ё', 'zh': 'ж', 'ts': 'ц', 'ch': 'ч', 'shch': 'щ', 'sh': 'ш', 'yu': 'ю', 'ya': 'я' };
  for (const [k, v] of Object.entries(multiChar)) {
    lat2cyr = lat2cyr.split(k).join(v);
  }
  lat2cyr = lat2cyr.split('').map(char => latinToCyrillicMap[char] || char).join('');

  return [q, cyr2lat, lat2cyr];
};

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'chats' | 'teachers' | 'students' | 'ai'>('chats');

  // AI Chat state
  interface AIMessage { role: 'user' | 'assistant'; content: string; created_at?: string; }
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInitialized, setAiInitialized] = useState(false);
  const aiEndRef = useRef<HTMLDivElement>(null);

  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Image attachment state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  // Quick suggestions
  const SUGGESTIONS = [
    'Салом', 'Салом алейкум', 'Хорошо', 'Спасибо', 'Понятно', 'Ок', 'Отлично',
    'Я скоро буду', 'Да', 'Нет', 'Хошош', 'Мейлен', 'Ташаккур', 'Бозор', 'Фаҳмидай',
    'Бошлайди', 'Подождите', 'Сейчас', 'Приду позже', 'Знаю', 'Пожалуйста',
    'Конечно', 'Разумею', 'Ничего', 'Щасли', 'Марҳамат'
  ];

  const filteredSuggestions = useCallback(() => {
    if (!inputText.trim() || inputText.length < 1) return [];
    const q = inputText.toLowerCase();
    return SUGGESTIONS.filter(s => s.toLowerCase().startsWith(q) && s.toLowerCase() !== q).slice(0, 8);
  }, [inputText]);

  const fetchAiHistory = async () => {
    try {
      const res = await api.get('/ai/chat/');
      setAiMessages(res.data.messages || []);
      setAiInitialized(true);
    } catch (error) {
      console.error('Failed to fetch AI history', error);
    }
  };

  const sendAiMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim() || aiLoading) return;

    const userMsg = aiInput.trim();
    setAiInput('');
    setAiMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setAiLoading(true);

    try {
      const res = await api.post('/ai/chat/', { message: userMsg });
      setAiMessages(prev => [...prev, { role: 'assistant', content: res.data.reply || res.data.message }]);
    } catch (error) {
      console.error('Failed to send AI message', error);
      setAiMessages(prev => [...prev, { role: 'assistant', content: 'Извините, произошла ошибка. Пожалуйста, попробуйте позже.' }]);
    } finally {
      setAiLoading(false);
    }
  };

  const clearAiHistory = async () => {
    if (!window.confirm('Очистить историю ИИ чата?')) return;
    try {
      await api.delete('/ai/chat/');
      setAiMessages([]);
    } catch (error) {
      console.error('Failed to clear AI history', error);
    }
  };
  const [dropdownMessageId, setDropdownMessageId] = useState<number | null>(null);
  const [showClearChatModal, setShowClearChatModal] = useState(false);
  const [clearForAll, setClearForAll] = useState(false);

  const [replyingMessage, setReplyingMessage] = useState<Message | null>(null);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<number>>(new Set());
  const [isDesktopMode, setIsDesktopMode] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchContacts = async () => {
    try {
      const res = await api.get('/chat/contacts/');
      setContacts(res.data);
    } catch (error) {
      console.error('Failed to fetch contacts', error);
    }
  };

  const fetchMessages = async (userId: number) => {
    try {
      const res = await api.get(`/chat/messages/${userId}/`);
      setMessages(res.data);
      // Optional: scroll to bottom if new message arrived
    } catch (error) {
      console.error('Failed to fetch messages', error);
    }
  };

  const markAsRead = async (userId: number) => {
    try {
      await api.post(`/chat/read/${userId}/`);
      fetchContacts(); // Update unread counts
    } catch (error) {
      console.error('Failed to mark read', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'ai' && !aiInitialized && isOpen) {
      fetchAiHistory();
    }
  }, [activeTab, aiInitialized, isOpen]);

  useEffect(() => {
    if (activeTab === 'ai' && aiEndRef.current) {
      aiEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages, activeTab]);

  // Initial load and polling
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    // Always fetch contacts periodically to update last seen and recent messages
    const poll = async () => {
      fetchContacts();
      if (activeContact) {
        await fetchMessages(activeContact.id);
      }
    };

    if (localStorage.getItem('access_token')) {
      poll();
      interval = setInterval(poll, 5000); // Poll every 5s
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeContact]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }

    // Mark as read if receiving new messages
    if (activeContact && isOpen) {
      const unreadIncoming = messages.some(m => !m.is_read && m.sender_id === activeContact.id);
      if (unreadIncoming) {
        markAsRead(activeContact.id);
      }
    }
  }, [messages, isOpen, activeContact]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (dropdownMessageId) {
          setDropdownMessageId(null);
        } else if (forwardModalOpen) {
          setForwardModalOpen(false); setForwardingMessage(null);
        } else if (showClearChatModal) {
          setShowClearChatModal(false); setClearForAll(false);
        } else if (isSelectMode) {
          setIsSelectMode(false); setSelectedMessages(new Set());
        } else if (replyingMessage || editingMessageId) {
          setReplyingMessage(null); setEditingMessageId(null); setInputText('');
        } else if (activeContact) {
          setActiveContact(null);
        } else if (isOpen) {
          handleClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dropdownMessageId, forwardModalOpen, showClearChatModal, isSelectMode, replyingMessage, editingMessageId, activeContact, isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setIsClosing(false);
    fetchContacts();
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setActiveContact(null);
    }, 300); // Matches animation duration
  };

  const handleSelectContact = async (contact: Contact) => {
    setActiveContact(contact);
    setIsLoading(true);
    await fetchMessages(contact.id);
    if (contact.unread_count > 0) {
      await markAsRead(contact.id);
    }
    setIsLoading(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedImage) || !activeContact || isSending) return;

    setIsSending(true);
    try {
      const tempText = inputText;

      if (editingMessageId) {
        const res = await api.put(`/chat/message/${editingMessageId}/`, { content: tempText });
        setMessages(prev => prev.map(m => m.id === editingMessageId ? { ...m, content: res.data.content, is_edited: true } : m));
        setEditingMessageId(null);
        setInputText('');
      } else {
        const formData = new FormData();
        formData.append('content', tempText);
        if (replyingMessage) formData.append('reply_to_id', String(replyingMessage.id));
        if (selectedImage) formData.append('image_file', selectedImage);
        const res = await api.post(`/chat/messages/${activeContact.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setMessages(prev => [...prev, res.data]);
        setInputText('');
        setReplyingMessage(null);
        removeSelectedImage();
        fetchContacts();
      }
    } catch (error) {
      console.error('Failed to send/edit message', error);
      toast.error('Ошибка при отправке сообщения');
    } finally {
      setIsSending(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Файл слишком большой (макс. 10МБ)");
        return;
      }
      setSelectedImage(file);
      setPreviewImage(URL.createObjectURL(file));
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image/') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          if (file.size > 10 * 1024 * 1024) {
            toast.error("Файл слишком большой (макс. 10МБ)");
            return;
          }
          setSelectedImage(file);
          setPreviewImage(URL.createObjectURL(file));
          if (imageInputRef.current) imageInputRef.current.value = '';
          e.preventDefault(); // Prevent pasting file path into text input if any
        }
        break;
      }
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    if (previewImage) URL.revokeObjectURL(previewImage);
    setPreviewImage(null);
  };

  const sendVoiceMessage = async (audioBlob: Blob) => {
    if (!activeContact) return;
    const formData = new FormData();
    formData.append('content', '');
    formData.append('audio_file', audioBlob, 'voice.webm');
    try {
      const res = await api.post(`/chat/messages/${activeContact.id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessages(prev => [...prev, res.data]);
      fetchContacts();
    } catch (error) {
      console.error('Failed to send voice message', error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        sendVoiceMessage(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } catch {
      toast.error('Нет доступа к микрофону. Разрешите доступ в настройках браузера.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setRecordingSeconds(0);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
    }
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setRecordingSeconds(0);
    audioChunksRef.current = [];
  };

  const formatRecordingTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const handleEditMessage = (msg: Message) => {
    setEditingMessageId(msg.id);
    setReplyingMessage(null);
    setInputText(msg.content);
    setDropdownMessageId(null);
  };

  const handleReplyMessage = (msg: Message) => {
    setReplyingMessage(msg);
    setEditingMessageId(null);
    setDropdownMessageId(null);
    // focus input would be nice (can do later)
  };

  const handleCopyText = (content: string) => {
    navigator.clipboard.writeText(content);
    setDropdownMessageId(null);
  };

  const handlePinMessage = async (msg: Message) => {
    try {
      const res = await api.post(`/chat/pin/${msg.id}/`);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_pinned: res.data.is_pinned } : m));
      setDropdownMessageId(null);
    } catch (error) {
      console.error('Failed to pin message', error);
    }
  };

  const handleForwardClick = (msg: Message) => {
    setForwardingMessage(msg);
    setForwardModalOpen(true);
    setDropdownMessageId(null);
  };

  const submitForward = async (contact_id: number) => {
    if (!forwardingMessage) return;
    try {
      await api.post(`/chat/messages/${contact_id}/`, {
        content: forwardingMessage.content,
        forwarded_from_id: forwardingMessage.sender_id
      });
      fetchContacts();
      const targetContact = contacts.find(c => c.id === contact_id);
      toast.success(`Сообщение переслано ${targetContact ? targetContact.name : ''}`);
      if (activeContact && contact_id === activeContact.id) {
        fetchMessages(activeContact.id);
      }
    } catch (e) {
      console.error(e);
      toast.error('Ошибка при пересылке');
    }
    setForwardModalOpen(false);
    setForwardingMessage(null);
  };

  const handleSelectMessageClick = (msg: Message) => {
    setIsSelectMode(true);
    setSelectedMessages(new Set([msg.id]));
    setDropdownMessageId(null);
  };

  const toggleSelect = (id: number) => {
    setSelectedMessages(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const handleBulkDelete = async () => {
    for (const id of selectedMessages) {
      await api.delete(`/chat/message/${id}/?for_all=false`);
    }
    setMessages(prev => prev.filter(m => !selectedMessages.has(m.id)));
    setIsSelectMode(false);
    setSelectedMessages(new Set());
  };

  const handleDeleteMessage = async (msgId: number, forAll: boolean) => {
    try {
      await api.delete(`/chat/message/${msgId}/?for_all=${forAll}`);
      setMessages(prev => prev.filter(m => m.id !== msgId));
      fetchContacts();
      setDropdownMessageId(null);
    } catch (error) {
      console.error('Failed to delete message', error);
    }
  };

  const handleClearChatSubmit = async () => {
    if (!activeContact) return;
    try {
      await api.delete(`/chat/history/${activeContact.id}/?for_all=${clearForAll}`);
      setMessages([]);
      setShowClearChatModal(false);
      setClearForAll(false);
      fetchContacts();
    } catch (error) {
      console.error('Failed to clear chat', error);
    }
  };

  const formatTime = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatLastSeen = (dateString: string | null) => {
    if (!dateString) return 'Был(а) давно';
    const d = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 2) return 'Онлайн';
    if (diffMins < 60) return `Был(а) ${diffMins} мин назад`;

    // Same day?
    if (d.toDateString() === now.toDateString()) {
      return `Был(а) сегодня в ${formatTime(dateString)}`;
    }
    return `Был(а) ${d.toLocaleDateString()} в ${formatTime(dateString)}`;
  };

  const isOnline = (dateString: string | null) => {
    if (!dateString) return false;
    const diffMs = new Date().getTime() - new Date(dateString).getTime();
    return diffMs < 120000; // < 2 mins
  };

  const totalUnread = contacts.reduce((sum, c) => sum + c.unread_count, 0);

  const filteredContacts = React.useMemo(() => {
    let result = contacts;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const variants = getSearchVariants(q);

      result = result.filter(c => {
        const name = c.name.toLowerCase();
        const role = c.role_subtitle ? c.role_subtitle.toLowerCase() : '';
        return variants.some(v => name.includes(v) || role.includes(v));
      });
    } else {
      if (activeTab === 'chats') {
        result = result.filter(c => c.last_message !== null);
      } else if (activeTab === 'teachers') {
        result = result.filter(c => c.role_subtitle === 'Учитель' || c.role_subtitle === 'Администратор' || c.role_subtitle === 'Сотрудник');
      } else if (activeTab === 'students') {
        result = result.filter(c => c.role_subtitle.startsWith('Ученик'));
      }
    }

    return result;
  }, [contacts, activeTab, searchQuery]);

  // Return out if not logged in
  if (!localStorage.getItem('access_token')) return null;

  const pinnedMessage = messages.slice().reverse().find(m => m.is_pinned);

  // Global wrapper click to close context menu
  const handleClickOutsideContextMenu = () => {
    if (dropdownMessageId) {
      setDropdownMessageId(null);
    }
  };

  return (
    <div className="chat-widget-container" onClick={handleClickOutsideContextMenu}>
      {!isOpen ? (
        <button className="chat-fab" onClick={handleOpen}>
          <MessageCircle size={30} />
          {totalUnread > 0 && (
            <div className="chat-badge">{totalUnread}</div>
          )}
        </button>
      ) : (
        <div className={`chat-window ${isClosing ? 'closing' : ''} ${isDesktopMode ? 'desktop-mode' : ''}`}>
          {/* ===== SIDEBAR HEADER (always visible left column in desktop) ===== */}

          {/* Header */}
          <div className="chat-header">
            {isSelectMode ? (
              <div className="chat-header-info">
                <button className="chat-back-btn" onClick={() => { setIsSelectMode(false); setSelectedMessages(new Set()) }}>
                  <X size={18} />
                </button>
                <div className="chat-header-title">
                  <h3>Выбрано: {selectedMessages.size}</h3>
                </div>
              </div>
            ) : activeContact && !isDesktopMode ? (
              <div className="chat-header-info">
                <button className="chat-back-btn" onClick={() => setActiveContact(null)}>
                  <ArrowLeft size={18} />
                </button>
                <div className="chat-header-title">
                  <h3>{activeContact.name}</h3>
                  <span>{formatLastSeen(activeContact.last_seen)}</span>
                </div>
              </div>
            ) : (
              <div className="chat-header-title">
                <h3>Сообщения</h3>
                <span>{contacts.length} контактов</span>
              </div>
            )}

            <div className="chat-header-actions">
              {isSelectMode ? (
                <button className="chat-close-btn" style={{ color: '#EF4444' }} onClick={handleBulkDelete}>
                  <Trash2 size={18} />
                </button>
              ) : (
                <>
                  {activeContact && !isDesktopMode && (
                    <button className="chat-close-btn" title="Удалить чат" onClick={() => setShowClearChatModal(true)} style={{ marginRight: '8px' }}>
                      <Trash2 size={18} />
                    </button>
                  )}
                  <button className="chat-close-btn" title={isDesktopMode ? 'Свернуть' : 'Расширить'} onClick={() => setIsDesktopMode(v => !v)} style={{ marginRight: '6px' }}>
                    {isDesktopMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                  </button>
                  <button className="chat-close-btn" onClick={handleClose}>
                    <X size={20} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Contacts sidebar - always visible in desktop mode, shows when no active contact in widget mode */}
          {(isDesktopMode || !activeContact) ? (
            <div className={isDesktopMode ? 'chat-contacts-panel' : 'chat-contacts-container'}>
              {activeTab !== 'ai' && (
                <div className="chat-search-container">
                  <div className="chat-search-bar">
                    <input
                      type="text"
                      placeholder="Поиск..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button className="chat-search-clear" onClick={() => setSearchQuery('')}>
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              )}
              <div className="chat-tabs">
                <button
                  className={`chat-tab ${activeTab === 'chats' ? 'active' : ''}`}
                  onClick={() => setActiveTab('chats')}
                >
                  Чаты
                </button>
                <button
                  className={`chat-tab ${activeTab === 'teachers' ? 'active' : ''}`}
                  onClick={() => setActiveTab('teachers')}
                >
                  Учителя
                </button>
                <button
                  className={`chat-tab ${activeTab === 'students' ? 'active' : ''}`}
                  onClick={() => setActiveTab('students')}
                >
                  Ученики
                </button>
                <button
                  className={`chat-tab ${activeTab === 'ai' ? 'active' : ''}`}
                  onClick={() => setActiveTab('ai')}
                >
                  <Bot size={16} style={{ marginRight: 4, display: 'inline', verticalAlign: 'text-bottom' }} /> ИИ
                </button>
              </div>

              {activeTab === 'ai' ? (
                <div className="ai-chat-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, overflow: 'hidden' }}>
                  <div className="chat-messages ai-messages" style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {aiMessages.length === 0 ? (
                      <div className="chat-empty">
                        <Sparkles size={48} color="#3B82F6" />
                        <p>Чем я могу вам помочь?</p>
                      </div>
                    ) : (
                      aiMessages.map((msg, idx) => (
                        <div key={idx} className={`message-bubble ${msg.role === 'user' ? 'message-out' : 'message-in'}`}>
                          {msg.role === 'assistant' && <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, color: '#3B82F6', fontSize: 12, fontWeight: 600 }}><Bot size={14} /> ИИ-Помощник</div>}
                          <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                        </div>
                      ))
                    )}
                    {aiLoading && (
                      <div className="message-bubble message-in" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6B7280', fontStyle: 'italic' }}>
                        <Loader size={16} className="loader-pulse" />
                        <span>ИИ печатает...</span>
                      </div>
                    )}
                    <div ref={aiEndRef} />
                  </div>
                  <div style={{ padding: '8px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'var(--bg-primary)' }}>
                    <button onClick={clearAiHistory} title="Очистить историю" style={{ padding: '8px', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <RotateCcw size={18} />
                    </button>
                    <form onSubmit={sendAiMessage} style={{ display: 'flex', flex: 1, gap: '8px' }}>
                      <input
                        type="text"
                        value={aiInput}
                        onChange={e => setAiInput(e.target.value)}
                        placeholder="Спросить ИИ..."
                        className="chat-input"
                        style={{ flex: 1 }}
                        disabled={aiLoading}
                      />
                      <button type="submit" className="chat-send-btn" disabled={!aiInput.trim() || aiLoading}>
                        <Send size={18} />
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="chat-contacts">
                  {filteredContacts.length === 0 ? (
                    <div className="chat-empty">
                      <User size={48} />
                      <p>{activeTab === 'chats' ? 'У вас пока нет чатов' : 'Нет доступных контактов'}</p>
                    </div>
                  ) : (
                    filteredContacts.map(c => (
                      <div key={c.id} className="contact-item" onClick={() => handleSelectContact(c)}>
                        <div className="contact-avatar">
                          {c.name.charAt(0).toUpperCase()}
                          {isOnline(c.last_seen) && <div className="contact-online-dot"></div>}
                        </div>
                        <div className="contact-info">
                          <div className="contact-header-row">
                            <span className="contact-name">{c.name}</span>
                            {c.last_message_date && (
                              <span className="contact-time">{formatTime(c.last_message_date)}</span>
                            )}
                          </div>
                          {c.role_subtitle && (
                            <div className="contact-role-subtitle">
                              {c.role_subtitle}
                            </div>
                          )}
                          <div className="contact-message-row">
                            <span className="contact-last-message">
                              {c.last_message || 'Нет сообщений'}
                            </span>
                            {c.unread_count > 0 && (
                              <span className="contact-unread">{c.unread_count}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : !isDesktopMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              {/* Messages */}
              <div className="chat-messages">
                {pinnedMessage && (
                  <div className="chat-pinned-message">
                    <div className="pinned-bar"></div>
                    <div className="pinned-info">
                      <span>Закреплённое сообщение</span>
                      <p>{pinnedMessage.content}</p>
                    </div>
                  </div>
                )}
                {isLoading ? (
                  <div className="chat-loader">
                    <MessageCircle size={32} className="loader-pulse" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="chat-empty">
                    <MessageSquare size={48} />
                    <p>Напишите первое сообщение</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isIncoming = msg.sender_id === activeContact!.id;
                    return (
                      <div key={msg.id} className="message-wrapper">
                        {isSelectMode && (
                          <div className="message-select-box" onClick={() => toggleSelect(msg.id)}>
                            <input type="checkbox" readOnly checked={selectedMessages.has(msg.id)} />
                          </div>
                        )}
                        <div className={`message-bubble ${isIncoming ? 'message-in' : 'message-out'}`}>
                          {msg.forwarded_from_name && (
                            <div className="message-forwarded">
                              <Forward size={12} /> Переслано от: {msg.forwarded_from_name}
                            </div>
                          )}
                          {msg.reply_to_content && (
                            <div className="message-quoted">
                              <div className="quoted-bar"></div>
                              <p>{msg.reply_to_content}</p>
                            </div>
                          )}
                          {msg.image_file ? (
                            <div className="chat-image-container">
                              <img src={getMediaUrl(msg.image_file)} alt="attachment" className="chat-message-image" onClick={() => setFullScreenImage(getMediaUrl(msg.image_file))} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = '<div class="chat-file-deleted"><X size={16}/> Файл удалён</div>'; }} />
                              {msg.content && <span className="image-caption">{msg.content}</span>}
                            </div>
                          ) : msg.audio_file ? (
                            <div className="voice-message-player">
                              <Mic size={14} className="voice-icon" />
                              <audio controls src={getMediaUrl(msg.audio_file)} className="voice-audio" />
                            </div>
                          ) : (
                            <span>{msg.content}</span>
                          )}
                          <div className="message-footer">
                            {msg.is_edited && <span className="message-edited">(изменено)</span>}
                            {formatTime(msg.created_at)}
                            {!isIncoming && (
                              <span className="read-ticks">
                                {msg.is_read ? <CheckCheck size={14} /> : <Check size={14} />}
                              </span>
                            )}
                          </div>
                          <button className="msg-dropdown-btn" onClick={(e) => { e.stopPropagation(); setDropdownMessageId(dropdownMessageId === msg.id ? null : msg.id); }}>
                            <MoreVertical size={16} />
                          </button>
                          {dropdownMessageId === msg.id && (
                            <div className="msg-dropdown-menu tg-style">
                              <button onClick={() => handleReplyMessage(msg)}><Reply size={16} /> Ответить</button>
                              {msg.can_edit && <button onClick={() => handleEditMessage(msg)}><Edit2 size={16} /> Изменить</button>}
                              <button onClick={() => handlePinMessage(msg)}><Pin size={16} /> {msg.is_pinned ? 'Открепить' : 'Закрепить'}</button>
                              <button onClick={() => handleCopyText(msg.content)}><Copy size={16} /> Копировать текст</button>
                              <button onClick={() => handleForwardClick(msg)}><Forward size={16} /> Переслать</button>
                              <button onClick={() => handleSelectMessageClick(msg)}><CheckSquare size={16} /> Выделить</button>
                              <hr className="dropdown-divider" />
                              <button onClick={() => handleDeleteMessage(msg.id, false)}><Trash2 size={16} /> Удалить у меня</button>
                              {msg.can_delete_for_all && (
                                <button onClick={() => handleDeleteMessage(msg.id, true)} className="text-red-500"><Trash2 size={16} color="#EF4444" /> Удалить у обоих</button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              {replyingMessage && (
                <div className="chat-reply-header">
                  <Reply size={18} className="accent-icon" />
                  <div className="reply-content">
                    <span>Ответ</span>
                    <p>{replyingMessage.content}</p>
                  </div>
                  <button onClick={() => setReplyingMessage(null)}><X size={16} /></button>
                </div>
              )}
              {editingMessageId && (
                <div className="chat-edit-header">
                  <Edit2 size={18} className="accent-icon" />
                  <div className="reply-content">
                    <span>Изменение сообщения</span>
                    <p>{messages.find(m => m.id === editingMessageId)?.content}</p>
                  </div>
                  <button onClick={() => { setEditingMessageId(null); setInputText(''); }}><X size={16} /></button>
                </div>
              )}
              {!isSelectMode && (
                <div className="chat-input-wrapper">
                  {previewImage && (
                    <div className="image-preview-container">
                      <img src={previewImage} alt="Preview" className="image-preview" />
                      <button type="button" className="image-preview-remove" onClick={removeSelectedImage}>
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    ref={imageInputRef}
                    style={{ display: 'none' }}
                    onChange={handleImageSelect}
                  />
                  {filteredSuggestions().length > 0 && (
                    <div className="suggestions-bar">
                      {filteredSuggestions().map((s, i) => (
                        <button key={i} className="suggestion-chip" onClick={() => setInputText(s)} type="button">{s}</button>
                      ))}
                    </div>
                  )}
                  {isRecording ? (
                    <div className="recording-bar">
                      <button type="button" className="rec-cancel-btn" onClick={cancelRecording}><X size={18} /></button>
                      <span className="recording-indicator"><span className="rec-dot" /> {formatRecordingTime(recordingSeconds)}</span>
                      <button type="button" className="chat-send-btn" onClick={stopRecording}><StopCircle size={18} /></button>
                    </div>
                  ) : (
                    <form className={`chat-input-area ${(editingMessageId || replyingMessage) ? 'attached-mode' : ''}`} onSubmit={handleSendMessage}>
                      <button type="button" className="chat-attach-btn" onClick={() => imageInputRef.current?.click()}>
                        <Paperclip size={20} />
                      </button>
                      <input type="text" className="chat-input" placeholder="Написать сообщение..." value={inputText} onChange={e => setInputText(e.target.value)} onPaste={handlePaste} />
                      {(!inputText.trim() && !selectedImage) ? (
                        <button type="button" className="chat-mic-btn" onClick={startRecording} disabled={isSending}><Mic size={20} /></button>
                      ) : (
                        <button type="submit" className={`chat-send-btn ${editingMessageId ? 'edit-btn' : ''}`} disabled={isSending}>
                          {isSending ? <Loader size={18} className="loader-pulse" /> : editingMessageId ? <CheckCircle2 size={18} /> : <Send size={18} />}
                        </button>
                      )}
                    </form>
                  )}
                </div>
              )}
            </div>
          ) : null}

          {/* Desktop mode: messages panel */}
          {isDesktopMode && activeContact && (
            <div className="chat-main-panel">
              {/* Desktop chat header - Telegram style */}
              <div className="desktop-chat-topbar">
                <div className="desktop-chat-topbar-info">
                  <div className="dct-avatar">
                    {activeContact.name.charAt(0).toUpperCase()}
                    {isOnline(activeContact.last_seen) && <span className="dct-online-dot"></span>}
                  </div>
                  <div className="dct-meta">
                    <h4>{activeContact.name}</h4>
                    <span>{activeContact.role_subtitle || 'Пользователь'} &nbsp;·&nbsp; {formatLastSeen(activeContact.last_seen)}</span>
                  </div>
                </div>
                <div className="desktop-chat-topbar-actions">
                  {activeContact && (
                    <button className="dct-action-btn" title="Удалить историю" onClick={() => setShowClearChatModal(true)}>
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>

              <div className="chat-messages">
                {pinnedMessage && (
                  <div className="chat-pinned-message">
                    <div className="pinned-bar"></div>
                    <div className="pinned-info">
                      <span>Закреплённое сообщение</span>
                      <p>{pinnedMessage.content}</p>
                    </div>
                  </div>
                )}
                {isLoading ? (
                  <div className="chat-loader"><MessageCircle size={32} className="loader-pulse" /></div>
                ) : messages.length === 0 ? (
                  <div className="chat-empty"><MessageSquare size={48} /><p>Напишите первое сообщение</p></div>
                ) : (
                  messages.map(msg => {
                    const isIncoming = msg.sender_id === activeContact.id;
                    return (
                      <div key={msg.id} className="message-wrapper">
                        {isSelectMode && (
                          <div className="message-select-box" onClick={() => toggleSelect(msg.id)}>
                            <input type="checkbox" readOnly checked={selectedMessages.has(msg.id)} />
                          </div>
                        )}
                        <div className={`message-bubble ${isIncoming ? 'message-in' : 'message-out'}`}>
                          {msg.forwarded_from_name && <div className="message-forwarded"><Forward size={12} /> Переслано от: {msg.forwarded_from_name}</div>}
                          {msg.reply_to_content && <div className="message-quoted"><div className="quoted-bar"></div><p>{msg.reply_to_content}</p></div>}
                          {msg.image_file ? (
                            <div className="chat-image-container">
                              <img src={getMediaUrl(msg.image_file)} alt="attachment" className="chat-message-image" onClick={() => setFullScreenImage(getMediaUrl(msg.image_file))} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = '<div class="chat-file-deleted"><X size={16} style="display:inline;vertical-align:middle;margin-right:4px;"/> Файл удалён</div>'; }} />
                              {msg.content && <span className="image-caption">{msg.content}</span>}
                            </div>
                          ) : msg.audio_file ? (
                            <div className="voice-message-player">
                              <Mic size={14} className="voice-icon" />
                              <audio controls src={getMediaUrl(msg.audio_file)} className="voice-audio" />
                            </div>
                          ) : (
                            <span>{msg.content}</span>
                          )}
                          <div className="message-footer">
                            {msg.is_edited && <span className="message-edited">(изменено)</span>}
                            {formatTime(msg.created_at)}
                            {!isIncoming && <span className="read-ticks">{msg.is_read ? <CheckCheck size={14} /> : <Check size={14} />}</span>}
                          </div>
                          <button className="msg-dropdown-btn" onClick={(e) => { e.stopPropagation(); setDropdownMessageId(dropdownMessageId === msg.id ? null : msg.id); }}>
                            <MoreVertical size={16} />
                          </button>
                          {dropdownMessageId === msg.id && (
                            <div className="msg-dropdown-menu tg-style">
                              <button onClick={() => handleReplyMessage(msg)}><Reply size={16} /> Ответить</button>
                              {msg.can_edit && <button onClick={() => handleEditMessage(msg)}><Edit2 size={16} /> Изменить</button>}
                              <button onClick={() => handlePinMessage(msg)}><Pin size={16} /> {msg.is_pinned ? 'Открепить' : 'Закрепить'}</button>
                              <button onClick={() => handleCopyText(msg.content)}><Copy size={16} /> Копировать текст</button>
                              <button onClick={() => handleForwardClick(msg)}><Forward size={16} /> Переслать</button>
                              <button onClick={() => handleSelectMessageClick(msg)}><CheckSquare size={16} /> Выделить</button>
                              <hr className="dropdown-divider" />
                              <button onClick={() => handleDeleteMessage(msg.id, false)}><Trash2 size={16} /> Удалить у меня</button>
                              {msg.can_delete_for_all && (
                                <button onClick={() => handleDeleteMessage(msg.id, true)} className="text-red-500"><Trash2 size={16} color="#EF4444" /> Удалить у обоих</button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              {replyingMessage && (
                <div className="chat-reply-header">
                  <Reply size={18} className="accent-icon" />
                  <div className="reply-content"><span>Ответ</span><p>{replyingMessage.content}</p></div>
                  <button onClick={() => setReplyingMessage(null)}><X size={16} /></button>
                </div>
              )}
              {editingMessageId && (
                <div className="chat-edit-header">
                  <Edit2 size={18} className="accent-icon" />
                  <div className="reply-content"><span>Изменение сообщения</span><p>{messages.find(m => m.id === editingMessageId)?.content}</p></div>
                  <button onClick={() => { setEditingMessageId(null); setInputText(''); }}><X size={16} /></button>
                </div>
              )}
              {!isSelectMode && (
                <div className="chat-input-wrapper">
                  {previewImage && (
                    <div className="image-preview-container">
                      <img src={previewImage} alt="Preview" className="image-preview" />
                      <button type="button" className="image-preview-remove" onClick={removeSelectedImage}>
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    ref={imageInputRef}
                    style={{ display: 'none' }}
                    onChange={handleImageSelect}
                  />
                  {filteredSuggestions().length > 0 && (
                    <div className="suggestions-bar">
                      {filteredSuggestions().map((s, i) => (
                        <button key={i} className="suggestion-chip" onClick={() => setInputText(s)} type="button">{s}</button>
                      ))}
                    </div>
                  )}
                  {isRecording ? (
                    <div className="recording-bar">
                      <button type="button" className="rec-cancel-btn" onClick={cancelRecording}><X size={18} /></button>
                      <span className="recording-indicator"><span className="rec-dot" /> {formatRecordingTime(recordingSeconds)}</span>
                      <button type="button" className="chat-send-btn" onClick={stopRecording}><StopCircle size={18} /></button>
                    </div>
                  ) : (
                    <form className={`chat-input-area ${(editingMessageId || replyingMessage) ? 'attached-mode' : ''}`} onSubmit={handleSendMessage}>
                      <button type="button" className="chat-attach-btn" onClick={() => imageInputRef.current?.click()}>
                        <Paperclip size={20} />
                      </button>
                      <input type="text" className="chat-input" placeholder="Написать сообщение..." value={inputText} onChange={e => setInputText(e.target.value)} onPaste={handlePaste} />
                      {(!inputText.trim() && !selectedImage) ? (
                        <button type="button" className="chat-mic-btn" onClick={startRecording} disabled={isSending}><Mic size={20} /></button>
                      ) : (
                        <button type="submit" className={`chat-send-btn ${editingMessageId ? 'edit-btn' : ''}`} disabled={isSending}>
                          {isSending ? <Loader size={18} className="loader-pulse" /> : editingMessageId ? <CheckCircle2 size={18} /> : <Send size={18} />}
                        </button>
                      )}
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Desktop mode: show placeholder when no convo selected */}
          {isDesktopMode && !activeContact && (
            <div className="chat-main-panel">
              <div className="desktop-chat-empty">
                <MessageCircle size={64} />
                <h3>Выберите чат</h3>
                <p>Нажмите на контакт слева, чтобы начать переписку</p>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Delete Chat Modal */}
      {showClearChatModal && activeContact && (
        <div className="chat-modal-overlay">
          <div className="chat-modal">
            <h3>Удалить историю с {activeContact.name}?</h3>
            <p>Вы уверены, что хотите удалить переписку?</p>
            <label className="chat-checkbox-label">
              <input
                type="checkbox"
                checked={clearForAll}
                onChange={(e) => setClearForAll(e.target.checked)}
              />
              <span>Удалить также для {activeContact.name}</span>
            </label>
            <div className="chat-modal-actions">
              <button className="chat-modal-cancel" onClick={() => { setShowClearChatModal(false); setClearForAll(false) }}>
                Отмена
              </button>
              <button className="chat-modal-delete" onClick={handleClearChatSubmit}>
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forward Modal */}
      {forwardModalOpen && (
        <div className="chat-modal-overlay">
          <div className="chat-modal">
            <h3>Переслать сообщение</h3>
            <div className="forward-contacts-list">
              {contacts.map(c => (
                <div key={c.id} className="forward-contact-item" onClick={() => submitForward(c.id)}>
                  <div className="contact-avatar">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="contact-name">{c.name}</span>
                </div>
              ))}
            </div>
            <div className="chat-modal-actions mt-4">
              <button className="chat-modal-cancel" onClick={() => { setForwardModalOpen(false); setForwardingMessage(null) }}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Fullscreen Image Modal */}
      {fullScreenImage && (
        <div className="chat-fullscreen-modal" onClick={() => setFullScreenImage(null)}>
          <button className="chat-fullscreen-close" onClick={() => setFullScreenImage(null)}>
            <X size={24} />
          </button>
          <img src={fullScreenImage} alt="Fullscreen" className="chat-fullscreen-img" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};
