// Client-side JS for messages
let socket;
let currentChatId = null;
let currentChatRecipient = null; // Store recipient details
let profileUser = null; // The logged in user
let chats = []; // Stores all active chats
let messagesList = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Wait for currentUser
    try {
        profileUser = await waitForCurrentUserMessages();
        if (!profileUser) {
            window.location.href = 'login.html';
            return;
        }

        // Set Nav Profile Link & Header Avatar
        document.getElementById('navProfileLink').href = `profile.html?id=${profileUser._id}`;
        const headerAvatar = document.getElementById("headerAvatarContainer");
        if(headerAvatar) headerAvatar.innerHTML = renderAvatarHtml(profileUser, "mini");

        // 2. Initialize WebSockets
        socket = io();

        socket.on("receiveMessage", (message) => {
            // Check if this message belongs to the current active chat
            if (currentChatId === message.chatId) {
                messagesList.push(message);
                appendMessageToUI(message);
                scrollToBottom();
            }
            
            // Also update the sidebar to bring chat to top and update snippet
            updateChatInSidebar(message);
        });

        // 3. Load UI
        await fetchChats();

        // 4. Check if we need to initiate a new chat based on URL
        const urlParams = new URLSearchParams(window.location.search);
        const urlUserId = urlParams.get('userId');
        
        if (urlUserId) {
            await initiateOrOpenChat(urlUserId);
        }

        // Send Msg Binding
        document.getElementById("sendMessageBtn").onclick = sendChatMessage;
        document.getElementById("messageInput").addEventListener("keypress", (e) => {
            if (e.key === "Enter") sendChatMessage();
        });

    } catch (error) {
        console.error("Initialization error:", error);
    }
});

async function waitForCurrentUserMessages() {
    return new Promise((resolve) => {
        let attempts = 0;
        const check = setInterval(async () => {
             // In home.js, currentUser gets populated by fetchCurrentUser
            // Let's call fetch explicitly to be safe if home.js loaded late
            try {
                const res = await fetch("/api/user/me");
                if (res.ok) {
                    const data = await res.json();
                    clearInterval(check);
                    resolve(data);
                } else {
                    throw new Error("Not logged in");
                }
            } catch(e) {
                if(attempts++ > 10) { clearInterval(check); resolve(null); }
            }
        }, 500);
    });
}

// REST Calls
async function fetchChats() {
    try {
        const res = await fetch('/api/chat');
        chats = await res.json();
        renderChatSidebar();
    } catch (err) {
        console.error("Error fetching chats", err);
    }
}

async function initiateOrOpenChat(recipientId) {
    if (recipientId === profileUser._id) return; // Cant chat yourself
    
    try {
        const res = await fetch('/api/chat/initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipientId })
        });
        
        const chat = await res.json();
        
        // Wait briefly for chats list to be updated
        await fetchChats();

        // Find the populated recipient 
        const selectedChat = chats.find(c => c._id === chat._id);
        if (selectedChat) {
            const recipient = selectedChat.participants.find(p => p._id !== profileUser._id);
            openChat(chat._id, recipient);
        }
    } catch(err) {
        console.error("Failed to initiate chat", err);
    }
}

// UI Renderings
function renderChatSidebar() {
    const listContainer = document.getElementById("chatListContainer");
    
    if (chats.length === 0) {
        listContainer.innerHTML = `<div class="loading-state">No conversations yet.</div>`;
        return;
    }

    listContainer.innerHTML = "";
    
    chats.forEach(chat => {
        // Find other person
        const recipient = chat.participants.find(p => p._id !== profileUser._id);
        if (!recipient) return; // Should not happen

        let snippet = chat.lastMessage ? chat.lastMessage.text : "Say hello!";
        let timeStr = "";
        if (chat.lastMessage) {
            const d = new Date(chat.lastMessage.createdAt);
            timeStr = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }

        const chatItem = document.createElement("div");
        chatItem.className = `chat-item ${currentChatId === chat._id ? 'active-chat' : ''}`;
        chatItem.id = `chat-sidebar-item-${chat._id}`;
        chatItem.onclick = () => openChat(chat._id, recipient);

        chatItem.innerHTML = `
            <div class="chat-item-avatar">
                <div class="avatar-container mini">
                    ${renderAvatarHtml(recipient, "mini")}
                </div>
                <div class="status-dot"></div>
            </div>
            <div class="chat-item-content">
                <div class="chat-item-top">
                    <h4>${recipient.name}</h4>
                    <span class="chat-item-time">${timeStr}</span>
                </div>
                <div class="chat-item-msg">${snippet.substring(0,35)}${snippet.length > 35 ? '...' : ''}</div>
            </div>
        `;
        listContainer.appendChild(chatItem);
    });
}

function updateChatInSidebar(message) {
    const chatIndex = chats.findIndex(c => c._id === message.chatId);
    if(chatIndex !== -1) {
        chats[chatIndex].lastMessage = message;
        chats[chatIndex].updatedAt = message.createdAt;
        // Sort to top
        chats.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    } else {
        // New chat altogether, refetch completely
        fetchChats();
        return;
    }
    renderChatSidebar();
}

async function openChat(chatId, recipient) {
    currentChatId = chatId;
    currentChatRecipient = recipient;
    
    // Join Socket Room
    socket.emit("joinChat", chatId);
    
    // UI states
    document.getElementById("noChatState").classList.add("hidden");
    document.getElementById("chatContent").classList.remove("hidden");
    
    // Update sidebar active state
    renderChatSidebar();

    // Render Contact Header
    const headerInfo = document.getElementById("chatHeaderInfo");
    headerInfo.innerHTML = `
        <div class="avatar-container" style="border: 2px solid var(--chat-red)">
            ${renderAvatarHtml(recipient)}
        </div>
        <div class="chat-header-details">
            <h3>${recipient.name}</h3>
            <span class="active-status">Active Now</span>
        </div>
    `;

    // Fetch Message History
    try {
        const res = await fetch(`/api/chat/${chatId}/messages`);
        messagesList = await res.json();
        renderMessageHistory();
    } catch(err) {
        console.error("Failed fetching messages");
    }
}

function renderMessageHistory() {
    const feed = document.getElementById("chatHistoryFeed");
    feed.innerHTML = `
        <div class="date-divider">
            <span>Today</span>
        </div>
    `;

    messagesList.forEach(m => {
        appendMessageToUI(m, feed);
    });
    
    scrollToBottom();
}

function appendMessageToUI(msg, container = null) {
    if (!container) container = document.getElementById("chatHistoryFeed");
    const isMine = msg.sender._id === profileUser._id || msg.sender === profileUser._id;
    const timeStr = new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    const wrapper = document.createElement("div");
    wrapper.className = `message-wrapper ${isMine ? 'yours' : 'theirs'}`;

    let avatarHtml = "";
    if (!isMine) {
        avatarHtml = `
            <div class="msg-avatar avatar-container small" onclick="window.location.href='profile.html?id=${msg.sender._id || msg.sender}'" style="cursor:pointer">
                ${renderAvatarHtml(msg.sender, "small")}
            </div>
        `;
    }

    const checkIcon = isMine ? `<i class="fas fa-check-double"></i>` : '';

    wrapper.innerHTML = `
        ${avatarHtml}
        <div class="msg-bubble-group">
            <div class="msg-bubble">
                ${escapeHTML(msg.text)}
            </div>
            <div class="msg-time">${timeStr} ${checkIcon}</div>
        </div>
    `;
    
    container.appendChild(wrapper);
}

function sendChatMessage() {
    const input = document.getElementById("messageInput");
    const text = input.value.trim();
    if (!text || !currentChatId) return;

    // Emit Socket
    socket.emit("sendMessage", {
        chatId: currentChatId,
        senderId: profileUser._id,
        text: text
    });

    input.value = "";
}

function scrollToBottom() {
    const feed = document.getElementById("chatHistoryFeed");
    feed.scrollTop = feed.scrollHeight;
}

function viewChatProfile() {
    if(currentChatRecipient) {
        window.location.href = `profile.html?id=${currentChatRecipient._id}`;
    }
}

// Utility to escape html
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
