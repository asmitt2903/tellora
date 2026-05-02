let allNotifications = [];

document.addEventListener("DOMContentLoaded", () => {
    initNotifications();
});

async function initNotifications() {
    await fetchNotifications();
    setupFilters();
}

async function fetchNotifications() {
    const list = document.getElementById("notificationsList");
    try {
        const response = await fetch("/api/notifications");
        allNotifications = await response.json();
        
        renderNotifications(allNotifications);
    } catch (err) {
        console.error("Error fetching notifications:", err);
        list.innerHTML = `<div class="loading-state">Error loading notifications.</div>`;
    }
}

function renderNotifications(notifications) {
    const list = document.getElementById("notificationsList");
    if (notifications.length === 0) {
        list.innerHTML = `<div class="loading-state">No notifications to show here.</div>`;
        return;
    }

    list.innerHTML = "";
    notifications.forEach(notif => {
        const card = createNotificationCard(notif);
        list.appendChild(card);
    });
}

function createNotificationCard(notif) {
    const card = document.createElement("div");
    card.className = `notif-card ${notif.isRead ? "" : "unread animate-fade-in"}`;
    card.onclick = () => handleNotifClick(notif);

    let iconType = notif.type === 'answer' ? 'answer' : (notif.type === 'upvote' ? 'upvote' : 'follow');
    let iconClass = notif.type === 'answer' ? 'fa-comment-alt' : (notif.type === 'upvote' ? 'fa-thumbs-up' : 'fa-user-plus');
    if (notif.type === 'message') {
        iconType = 'message';
        iconClass = 'fa-envelope';
    }
    
    const timeAgo = formatTimeAgo(new Date(notif.createdAt));

    // Simple snippet logic
    let snippet = "";
    if (notif.type === 'answer') {
        snippet = `<div class="notif-snippet">"Thinking about your point..."</div>`;
    } else if (notif.type === 'message') {
        snippet = `
            <div id="quickReplyBox-${notif._id}" class="quick-reply-box" style="display:none; margin-top: 12px; margin-bottom: 8px;">
                <div style="display: flex; gap: 8px;">
                    <input type="text" id="quickReplyInput-${notif._id}" placeholder="Type your reply here..." style="flex:1; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 20px; outline:none;" onclick="event.stopPropagation()" onkeypress="if(event.key === 'Enter') { event.stopPropagation(); sendQuickReply('${notif.chatId || notif.chatId?._id}', '${notif._id}'); }">
                    <button style="background: var(--primary-color); color: white; border: none; padding: 0 16px; border-radius: 20px; cursor: pointer; font-weight: bold;" onclick="event.stopPropagation(); sendQuickReply('${notif.chatId || notif.chatId?._id}', '${notif._id}')">Send</button>
                </div>
            </div>
        `;
    }

    card.innerHTML = `
        <div class="notif-icon-circle ${iconType}">
            <i class="fas ${iconClass}"></i>
        </div>
        <div class="notif-content">
            <div class="notif-card-header">
                <div class="sender-info" style="display:flex; align-items:center; gap:8px;">
                    <img src="${notif.sender.profilePic || '/uploads/default-avatar.png'}" style="width:24px; height:24px; border-radius:50%;">
                    <strong style="font-size:14px;">${notif.sender.name}</strong>
                </div>
                <span class="notif-time">${timeAgo}</span>
            </div>
            <p class="notif-message">${notif.message}</p>
            ${snippet}
            <div class="notif-actions">
                ${getActionButtons(notif)}
            </div>
        </div>
    `;

    return card;
}

function getActionButtons(notif) {
    if (notif.type === 'answer') {
        return `
            <button class="btn-notif primary">Reply Now</button>
            <button class="btn-notif outline">View Thread</button>
        `;
    } else if (notif.type === 'follow') {
        return `<button class="btn-notif primary">Follow Back</button>`;
    } else if (notif.type === 'upvote') {
        return `<button class="btn-notif outline">View Post</button>`;
    } else if (notif.type === 'message') {
        return `
            <button class="btn-notif primary" onclick="event.stopPropagation(); toggleQuickReply('${notif._id}')">Quick Reply</button>
            <button class="btn-notif outline" onclick="event.stopPropagation(); window.location.href='messages.html?userId=${notif.sender._id || notif.sender}'">Open Chat</button>
        `;
    }
    return '';
}

async function handleNotifClick(notif) {
    if (!notif.isRead) {
        await fetch(`/api/notifications/${notif._id}/read`, { method: "PATCH" });
        notif.isRead = true;
        // Refresh UI locally
        renderNotifications(allNotifications);
    }
    
    if (notif.questionId) {
        window.location.href = `home.html`; 
    }
}

async function markAllAsRead() {
    try {
        await fetch("/api/notifications/read-all", { method: "PATCH" });
        allNotifications.forEach(n => n.isRead = true);
        renderNotifications(allNotifications);
        
        // Update home badge if visible
        const notifDot = document.getElementById('notifDot');
        if (notifDot) notifDot.classList.add('hidden');
    } catch (err) {
        console.error("Error marking all as read:", err);
    }
}

function setupFilters() {
    const filters = document.querySelectorAll(".filter-btn");
    filters.forEach(btn => {
        btn.onclick = () => {
            filters.forEach(f => f.classList.remove("active"));
            btn.classList.add("active");
            
            const filterType = btn.getAttribute("data-filter");
            if (filterType === "all") {
                renderNotifications(allNotifications);
            } else if (filterType === "upvotes") {
                const filtered = allNotifications.filter(n => n.type === "upvote");
                renderNotifications(filtered);
            } else if (filterType === "mentions") {
                const filtered = allNotifications.filter(n => n.type === "mention");
                renderNotifications(filtered);
            }
        };
    });
}

function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "Y AGO";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "MO AGO";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "D AGO";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "H AGO";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "M AGO";
    return "JUST NOW";
}

function toggleQuickReply(notifId) {
    const box = document.getElementById(`quickReplyBox-${notifId}`);
    if (box) {
        box.style.display = box.style.display === "none" ? "block" : "none";
        if (box.style.display === "block") {
            document.getElementById(`quickReplyInput-${notifId}`).focus();
        }
    }
}

async function sendQuickReply(chatId, notifId) {
    const input = document.getElementById(`quickReplyInput-${notifId}`);
    const text = input.value.trim();
    if (!text) return;

    input.disabled = true;
    try {
        const res = await fetch(`/api/chat/${chatId}/messages/reply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        if (res.ok) {
            input.value = "";
            const box = document.getElementById(`quickReplyBox-${notifId}`);
            box.innerHTML = `<span style="color: #2e7d32; font-weight: 500; font-size: 13px;"><i class="fas fa-check-circle"></i> Message Sent!</span>`;
            setTimeout(() => {
                box.style.display = "none";
            }, 3000);
            
            // Mark notification as read
            const notif = allNotifications.find(n => n._id === notifId);
            if (notif && !notif.isRead) {
                await fetch(`/api/notifications/${notifId}/read`, { method: "PATCH" });
                notif.isRead = true;
                const card = box.closest('.notif-card');
                if (card) card.classList.remove('unread');
            }
        } else {
            alert("Failed to send reply. Please try again.");
            input.disabled = false;
        }
    } catch (err) {
        console.error("Quick reply error:", err);
        input.disabled = false;
    }
}

