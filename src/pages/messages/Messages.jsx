import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import {
  getInboxAPI, getSentAPI, getMessageAPI, sendMessageAPI,
  markMessageReadAPI, markAllMessagesReadAPI, deleteMessageAPI,
  getMessageUnreadCountAPI, getMessageUsersAPI
} from '../../api/axios';
import {
  FiInbox, FiSend, FiPlus, FiTrash2, FiX, FiMail,
  FiCornerUpLeft, FiCheckCircle, FiChevronLeft
} from 'react-icons/fi';

const Messages = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState('inbox');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [showCompose, setShowCompose] = useState(false);
  const [users, setUsers] = useState([]);
  const [composeForm, setComposeForm] = useState({ recipientId: '', subject: '', body: '' });
  const [replyTo, setReplyTo] = useState(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = tab === 'inbox'
        ? await getInboxAPI({ limit: 50 })
        : await getSentAPI({ limit: 50 });
      setMessages(data.messages || []);
    } catch (err) {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  const fetchUnread = async () => {
    try {
      const { data } = await getMessageUnreadCountAPI();
      setUnreadCount(data.count);
    } catch (err) { /* ignore */ }
  };

  useEffect(() => {
    fetchMessages();
    fetchUnread();
  }, [fetchMessages]);

  const openCompose = async (replyMsg = null) => {
    try {
      const { data } = await getMessageUsersAPI();
      setUsers(data);
    } catch (err) {
      toast.error('Failed to load users');
      return;
    }

    if (replyMsg) {
      setReplyTo(replyMsg);
      const senderId = replyMsg.sender?._id || replyMsg.sender;
      setComposeForm({
        recipientId: senderId,
        subject: replyMsg.subject.startsWith('Re: ') ? replyMsg.subject : `Re: ${replyMsg.subject}`,
        body: ''
      });
    } else {
      setReplyTo(null);
      setComposeForm({ recipientId: '', subject: '', body: '' });
    }
    setShowCompose(true);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    try {
      await sendMessageAPI({
        ...composeForm,
        parentMessage: replyTo?._id
      });
      toast.success('Message sent');
      setShowCompose(false);
      setComposeForm({ recipientId: '', subject: '', body: '' });
      setReplyTo(null);
      if (tab === 'sent') fetchMessages();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send');
    }
  };

  const openMessage = async (msg) => {
    try {
      const { data } = await getMessageAPI(msg._id);
      setSelectedMsg(data);
      if (tab === 'inbox' && !msg.read) {
        fetchUnread();
        setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, read: true } : m));
      }
    } catch (err) {
      toast.error('Failed to load message');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteMessageAPI(id);
      toast.success('Message deleted');
      setSelectedMsg(null);
      fetchMessages();
      fetchUnread();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllMessagesReadAPI();
      toast.success('All messages marked as read');
      fetchMessages();
      fetchUnread();
    } catch (err) {
      toast.error('Failed');
    }
  };

  const formatDate = (d) => {
    const date = new Date(d);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <button
          onClick={() => openCompose()}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm"
        >
          <FiPlus /> Compose
        </button>
      </div>

      <div className="flex gap-4 h-[calc(100vh-12rem)]">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 bg-white rounded-xl shadow-sm border flex flex-col">
          <div className="p-3 space-y-1">
            <button
              onClick={() => { setTab('inbox'); setSelectedMsg(null); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                tab === 'inbox' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2"><FiInbox size={16} /> Inbox</span>
              {unreadCount > 0 && (
                <span className="bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </button>
            <button
              onClick={() => { setTab('sent'); setSelectedMsg(null); }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                tab === 'sent' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FiSend size={16} /> Sent
            </button>
          </div>
          {tab === 'inbox' && unreadCount > 0 && (
            <div className="px-3 pb-3">
              <button onClick={handleMarkAllRead} className="w-full text-xs text-primary-600 hover:text-primary-700 flex items-center justify-center gap-1 py-1.5 border border-primary-200 rounded-lg hover:bg-primary-50">
                <FiCheckCircle size={12} /> Mark all read
              </button>
            </div>
          )}
        </div>

        {/* Message List + Detail */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border flex overflow-hidden">
          {/* List */}
          <div className={`${selectedMsg ? 'hidden md:block md:w-2/5' : 'w-full'} border-r overflow-y-auto`}>
            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <FiMail className="mx-auto text-3xl text-gray-300 mb-2" />
                <p className="text-gray-500 text-sm">No messages</p>
              </div>
            ) : (
              <div className="divide-y">
                {messages.map(msg => {
                  const otherUser = tab === 'inbox' ? msg.sender : msg.recipient;
                  const isUnread = tab === 'inbox' && !msg.read;
                  return (
                    <div
                      key={msg._id}
                      onClick={() => openMessage(msg)}
                      className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedMsg?._id === msg._id ? 'bg-primary-50' : ''
                      } ${isUnread ? 'bg-blue-50/50' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-sm ${isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                          {otherUser?.name || 'Unknown'}
                        </span>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{formatDate(msg.createdAt)}</span>
                      </div>
                      <div className={`text-sm truncate ${isUnread ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                        {msg.subject}
                      </div>
                      <div className="text-xs text-gray-400 truncate mt-0.5">{msg.body?.substring(0, 60)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail */}
          {selectedMsg ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                <button
                  onClick={() => setSelectedMsg(null)}
                  className="md:hidden p-1.5 text-gray-500 hover:text-gray-700"
                >
                  <FiChevronLeft size={18} />
                </button>
                <h3 className="font-semibold text-gray-900 truncate flex-1 mx-2">{selectedMsg.subject}</h3>
                <div className="flex gap-1">
                  {tab === 'inbox' && (
                    <button onClick={() => openCompose(selectedMsg)} className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded" title="Reply">
                      <FiCornerUpLeft size={16} />
                    </button>
                  )}
                  <button onClick={() => handleDelete(selectedMsg._id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded" title="Delete">
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-primary-700">
                      {(selectedMsg.sender?.name || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{selectedMsg.sender?.name}</div>
                    <div className="text-xs text-gray-500">
                      To: {selectedMsg.recipient?.name} • {new Date(selectedMsg.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                  {selectedMsg.body}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 hidden md:flex items-center justify-center text-gray-400">
              <div className="text-center">
                <FiMail className="mx-auto text-4xl mb-2" />
                <p className="text-sm">Select a message to read</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-xl">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="font-bold text-gray-900">{replyTo ? 'Reply' : 'New Message'}</h2>
              <button onClick={() => { setShowCompose(false); setReplyTo(null); }} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
            </div>
            <form onSubmit={handleSend} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To *</label>
                <select
                  required
                  value={composeForm.recipientId}
                  onChange={e => setComposeForm(f => ({ ...f, recipientId: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select recipient</option>
                  {users.map(u => (
                    <option key={u._id} value={u._id}>{u.name} ({u.role?.replace('_', ' ')}) — {u.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <input
                  required
                  value={composeForm.subject}
                  onChange={e => setComposeForm(f => ({ ...f, subject: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                <textarea
                  required
                  value={composeForm.body}
                  onChange={e => setComposeForm(f => ({ ...f, body: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  rows={6}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setShowCompose(false); setReplyTo(null); }} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">
                  <FiSend size={14} /> Send
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
