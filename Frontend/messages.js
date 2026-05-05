// ============================================================
// Tellora — Messages (Fully Standalone, Real-time Socket.IO)
// ============================================================

let socket;
let currentUser   = null;
let currentChatId = null;
let currentChatRecipient = null;
let chats         = [];
let messagesList  = [];

// ── INIT ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {

    // Apply saved theme
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);

    // 1. Fetch logged-in user
    try {
        const res = await fetch('/api/user/me');
        if (!res.ok) { window.location.href = '/login'; return; }
        currentUser = await res.json();
    } catch (e) {
        window.location.href = '/login';
        return;
    }

    // Render nav avatar
    const navEl = document.getElementById('navAvatarContainer');
    if (navEl) navEl.innerHTML = renderAvatarHtml(currentUser);

    // Poll notifications badge
    checkNotificationBadge();
    setInterval(checkNotificationBadge, 30000);

    // 2. Socket.IO
    socket = io();

    socket.on('connect', () => {
        if (currentChatId) socket.emit('joinChat', currentChatId);
    });

    socket.on('receiveMessage', (message) => {
        // If message belongs to the open chat, render it
        if (currentChatId && message.chatId === currentChatId) {
            // Avoid duplicate from optimistic render
            const existing = document.querySelector(`[data-msg-id="${message._id}"]`);
            if (!existing) {
                appendMessageToUI(message);
                scrollToBottom();
            }
        }
        updateChatInSidebar(message);
    });

    // 3. Load conversations
    await fetchChats();

    // 4. Auto-open chat if ?userId= is in URL (coming from a profile page)
    const params = new URLSearchParams(window.location.search);
    const targetUserId = params.get('userId');
    if (targetUserId && targetUserId !== currentUser._id) {
        await initiateOrOpenChat(targetUserId);
    }

    // 5. Event bindings
    document.getElementById('sendMessageBtn').addEventListener('click', sendChatMessage);
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); sendChatMessage(); }
    });

    document.getElementById('newChatBtn').addEventListener('click', openNewChatModal);
    document.getElementById('startChatBtn').addEventListener('click', openNewChatModal);

    document.getElementById('userSearchInput').addEventListener('input', debounce(searchUsers, 350));
    document.getElementById('chatSearchInput').addEventListener('input', (e) => {
        renderChatSidebar(e.target.value.trim());
    });

    document.getElementById('newChatModal').addEventListener('click', (e) => {
        if (e.target.id === 'newChatModal') closeNewChatModal();
    });
});

// ── HELPERS ────────────────────────────────────────────────
function renderAvatarHtml(user) {
    const name    = user?.name || 'U';
    const initial = name.charAt(0).toUpperCase();
    const hasPhoto = user?.profilePic && user.profilePic !== '' && !user.profilePic.includes('default-avatar.png');
    if (hasPhoto) {
        return `<img src="${user.profilePic}" alt="${esc(name)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    }
    return `<div class="avatar-letter">${initial}</div>`;
}

function esc(str = '') {
    return String(str).replace(/[&<>"']/g, t => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[t]));
}

function fmtTime(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDateLabel(iso) {
    if (!iso) return 'Today';
    const d   = new Date(iso);
    const now = new Date();
    const yest = new Date(now); yest.setDate(now.getDate() - 1);
    if (d.toDateString() === now.toDateString())  return 'Today';
    if (d.toDateString() === yest.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function scrollToBottom() {
    const feed = document.getElementById('chatHistoryFeed');
    if (feed) setTimeout(() => { feed.scrollTop = feed.scrollHeight; }, 60);
}

// ── NOTIFICATION BADGE ─────────────────────────────────────
async function checkNotificationBadge() {
    try {
        const res  = await fetch('/api/notifications');
        if (!res.ok) return;
        const data = await res.json();
        const dot  = document.getElementById('notifDot');
        if (!dot) return;
        const hasUnread = data.some(n => !n.isRead);
        dot.classList.toggle('hidden', !hasUnread);
    } catch (_) {}
}

// ── FETCH & RENDER SIDEBAR ─────────────────────────────────
async function fetchChats() {
    try {
        const res = await fetch('/api/chat');
        if (!res.ok) throw new Error();
        chats = await res.json();
        renderChatSidebar();
    } catch (err) {
        document.getElementById('chatListContainer').innerHTML =
            `<div class="empty-msg"><i class="fas fa-exclamation-triangle"></i> Could not load chats.</div>`;
    }
}

function renderChatSidebar(filter = '') {
    const container = document.getElementById('chatListContainer');
    const lc = filter.toLowerCase();

    const visible = filter
        ? chats.filter(c => {
            const r = c.participants?.find(p => p._id !== currentUser._id);
            return r?.name?.toLowerCase().includes(lc);
          })
        : chats;

    if (visible.length === 0) {
        container.innerHTML = `
            <div class="empty-msg">
                <i class="fas fa-comment-slash"></i>
                <span>${filter ? 'No matching conversations.' : 'No conversations yet.'}</span>
                ${!filter ? '<small>Hit the ✏️ button to start one!</small>' : ''}
            </div>`;
        return;
    }

    container.innerHTML = '';
    visible.forEach(chat => {
        const recipient = chat.participants?.find(p => p._id !== currentUser._id);
        if (!recipient) return;

        let snippet = 'Say hello! 👋';
        let timeStr = '';
        if (chat.lastMessage) {
            snippet = chat.lastMessage.text || '';
            if (snippet.length > 42) snippet = snippet.slice(0, 42) + '…';
            timeStr = fmtTime(chat.lastMessage.createdAt);
        }

        const isActive = currentChatId === chat._id;
        const item = document.createElement('div');
        item.className = `chat-item${isActive ? ' active-chat' : ''}`;
        item.id = `chat-sidebar-item-${chat._id}`;
        item.onclick = () => openChat(chat._id, recipient);
        item.innerHTML = `
            <div class="chat-item-avatar">
                <div class="avatar-container">${renderAvatarHtml(recipient)}</div>
                <span class="status-dot"></span>
            </div>
            <div class="chat-item-content">
                <div class="chat-item-top">
                    <h4>${esc(recipient.name)}</h4>
                    <span class="chat-item-time">${timeStr}</span>
                </div>
                <div class="chat-item-snippet">${esc(snippet)}</div>
            </div>`;
        container.appendChild(item);
    });
}

function updateChatInSidebar(message) {
    const idx = chats.findIndex(c => c._id === message.chatId);
    if (idx !== -1) {
        chats[idx].lastMessage = message;
        chats[idx].updatedAt   = message.createdAt || new Date().toISOString();
        chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    } else {
        fetchChats(); return;
    }
    renderChatSidebar(document.getElementById('chatSearchInput').value.trim());
}

// ── OPEN CHAT ──────────────────────────────────────────────
async function openChat(chatId, recipient) {
    currentChatId        = chatId;
    currentChatRecipient = recipient;

    socket.emit('joinChat', chatId);

    // Toggle UI panels
    document.getElementById('noChatState').classList.add('hidden');
    document.getElementById('chatContent').classList.remove('hidden');

    // Update active highlight
    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active-chat'));
    const activeEl = document.getElementById(`chat-sidebar-item-${chatId}`);
    if (activeEl) activeEl.classList.add('active-chat');

    // Render header
    document.getElementById('chatHeaderInfo').innerHTML = `
        <div class="avatar-container chat-header-avatar">${renderAvatarHtml(recipient)}</div>
        <div class="chat-header-details">
            <h3>${esc(recipient.name)}</h3>
            <span class="active-status"><i class="fas fa-circle"></i> Active now</span>
        </div>`;

    // Load messages
    const feed = document.getElementById('chatHistoryFeed');
    feed.innerHTML = `<div class="loading-state"><i class="fas fa-circle-notch fa-spin"></i> Loading messages...</div>`;

    try {
        const res = await fetch(`/api/chat/${chatId}/messages`);
        messagesList = await res.json();
        renderMessageHistory();
    } catch (_) {
        feed.innerHTML = `<div class="empty-msg">Failed to load messages.</div>`;
    }

    document.getElementById('messageInput').focus();
}

// ── RENDER MESSAGES ────────────────────────────────────────
function renderMessageHistory() {
    const feed = document.getElementById('chatHistoryFeed');
    feed.innerHTML = '';

    if (messagesList.length === 0) {
        feed.innerHTML = `
            <div class="empty-chat-state">
                <div class="avatar-container" style="width:64px;height:64px;margin:0 auto 12px;">
                    ${renderAvatarHtml(currentChatRecipient)}
                </div>
                <h4>${esc(currentChatRecipient?.name || 'User')}</h4>
                <p>No messages yet. Be the first to say hi! 👋</p>
            </div>`;
        return;
    }

    let lastDateStr = null;
    messagesList.forEach(msg => {
        const dateStr = new Date(msg.createdAt).toDateString();
        if (dateStr !== lastDateStr) {
            const divider = document.createElement('div');
            divider.className = 'date-divider';
            divider.innerHTML = `<span>${fmtDateLabel(msg.createdAt)}</span>`;
            feed.appendChild(divider);
            lastDateStr = dateStr;
        }
        appendMessageToUI(msg, feed);
    });

    scrollToBottom();
}

function appendMessageToUI(msg, container) {
    if (!container) container = document.getElementById('chatHistoryFeed');

    const senderId = msg.sender?._id || msg.sender;
    const isMine   = senderId === currentUser._id;
    const senderUser = isMine ? currentUser : (currentChatRecipient || msg.sender);

    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${isMine ? 'yours' : 'theirs'}`;
    if (msg._id) wrapper.setAttribute('data-msg-id', msg._id);

    const avatarHtml = !isMine ? `
        <div class="msg-avatar avatar-container" title="${esc(senderUser?.name || '')}">
            ${renderAvatarHtml(senderUser)}
        </div>` : '';

    wrapper.innerHTML = `
        ${avatarHtml}
        <div class="msg-bubble-group">
            <div class="msg-bubble">${esc(msg.text || '')}</div>
            <div class="msg-meta">
                <span class="msg-time">${fmtTime(msg.createdAt)}</span>
                ${isMine ? '<i class="fas fa-check-double msg-check"></i>' : ''}
            </div>
        </div>`;

    container.appendChild(wrapper);
}

// ── SEND MESSAGE ───────────────────────────────────────────
function sendChatMessage() {
    const input = document.getElementById('messageInput');
    const text  = input.value.trim();
    if (!text || !currentChatId) return;

    // Optimistic render
    const tempMsg = {
        chatId:    currentChatId,
        sender:    { _id: currentUser._id, name: currentUser.name, profilePic: currentUser.profilePic },
        text,
        createdAt: new Date().toISOString()
    };
    appendMessageToUI(tempMsg);
    scrollToBottom();

    // Clear input
    input.value = '';

    // Emit via Socket.IO (server saves to DB and broadcasts back)
    socket.emit('sendMessage', {
        chatId:   currentChatId,
        senderId: currentUser._id,
        text
    });
}

// ── INITIATE CHAT ──────────────────────────────────────────
async function initiateOrOpenChat(recipientId) {
    try {
        const res = await fetch('/api/chat/initiate', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ recipientId })
        });
        if (!res.ok) throw new Error();
        const chat = await res.json();
        await fetchChats();
        const found = chats.find(c => c._id === chat._id);
        if (found) {
            const r = found.participants.find(p => p._id !== currentUser._id);
            if (r) openChat(found._id, r);
        }
    } catch (err) {
        console.error('initiateOrOpenChat:', err);
    }
}

// ── NEW CHAT MODAL ─────────────────────────────────────────
function openNewChatModal() {
    document.getElementById('newChatModal').style.display = 'flex';
    document.getElementById('userSearchInput').value = '';
    document.getElementById('userSearchResults').innerHTML = '<p class="search-hint">Type at least 2 characters...</p>';
    setTimeout(() => document.getElementById('userSearchInput').focus(), 100);
}

function closeNewChatModal() {
    document.getElementById('newChatModal').style.display = 'none';
}

async function searchUsers() {
    const q       = document.getElementById('userSearchInput').value.trim();
    const resultsEl = document.getElementById('userSearchResults');

    if (q.length < 2) {
        resultsEl.innerHTML = '<p class="search-hint">Type at least 2 characters...</p>';
        return;
    }

    resultsEl.innerHTML = '<div class="loading-state"><i class="fas fa-circle-notch fa-spin"></i> Searching...</div>';

    try {
        const res   = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
        const users = await res.json();

        if (!Array.isArray(users) || users.length === 0) {
            resultsEl.innerHTML = '<p class="search-hint">No users found.</p>';
            return;
        }

        resultsEl.innerHTML = '';
        users.forEach(user => {
            const item = document.createElement('div');
            item.className = 'user-result-item';
            item.innerHTML = `
                <div class="avatar-container" style="width:44px;height:44px;flex-shrink:0;">
                    ${renderAvatarHtml(user)}
                </div>
                <div class="user-result-info">
                    <strong>${esc(user.name)}</strong>
                    <span>${esc(user.title || 'Member')}</span>
                </div>
                <button class="btn-msg-user" onclick="startChatWithUser('${user._id}')">
                    <i class="fas fa-paper-plane"></i> Message
                </button>`;
            resultsEl.appendChild(item);
        });
    } catch (_) {
        resultsEl.innerHTML = '<p class="search-hint">Search failed. Try again.</p>';
    }
}

async function startChatWithUser(userId) {
    closeNewChatModal();
    await initiateOrOpenChat(userId);
}

// ── VIEW PROFILE ───────────────────────────────────────────
function viewChatProfile() {
    if (currentChatRecipient?._id) {
        window.location.href = `/profile?id=${currentChatRecipient._id}`;
    }
}
