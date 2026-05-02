let currentChatId = null;

document.addEventListener("DOMContentLoaded", async () => {
    // currentUser is already fetched by home.js
    await loadHistory();
});

async function loadHistory() {
    try {
        const response = await fetch("/api/ai/history");
        const chats = await response.json();
    } catch (err) {
        console.error("Error loading history:", err);
    }
}

// Handle Enter Key
document.getElementById("aiInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

async function sendMessage() {
    console.log("Send mission initiated...");
    const input = document.getElementById("aiInput");
    const prompt = input.value.trim();
    if (!prompt) return;

    console.log("Processing prompt:", prompt);

    // Clear and reset textarea
    input.value = "";
    input.style.height = "auto";

    // Add User Message to UI
    appendMessage("user", prompt);
    
    // Add Loading State for AI
    const loadingId = appendLoadingMessage();

    try {
        const response = await fetch("/api/ai/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, chatId: currentChatId })
        });

        const data = await response.json();
        removeLoadingMessage(loadingId);

        if (response.ok) {
            currentChatId = data.chatId;
            appendMessage("bot", data.response);
        } else {
            console.error("Server Error:", data);
            appendMessage("bot", `I'm sorry, I'm having trouble connecting: ${data.message || "Unknown error"}`);
        }
    } catch (error) {
        removeLoadingMessage(loadingId);
        appendMessage("bot", "An unexpected error occurred.");
    }
}

function appendMessage(role, content) {
    const chatMessages = document.getElementById("chatMessages");
    
    // Remove welcome message if it exists
    const welcome = document.querySelector(".welcome-message");
    if (welcome) welcome.remove();

    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${role} animate-fade-in`;

    const avatarHtml = role === "bot" 
        ? `<div class="bot-avatar"><i class="fas fa-brain"></i></div>`
        : `<img src="${currentUser?.profilePic || '/uploads/default-avatar.png'}" class="user-avatar">`;

    msgDiv.innerHTML = `
        ${avatarHtml}
        <div class="msg-content">${formatContent(content)}</div>
    `;

    chatMessages.appendChild(msgDiv);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

function appendLoadingMessage() {
    const id = "loading-" + Date.now();
    const chatMessages = document.getElementById("chatMessages");
    const msgDiv = document.createElement("div");
    msgDiv.id = id;
    msgDiv.className = "message bot animate-fade-in";
    msgDiv.innerHTML = `
        <div class="bot-avatar"><i class="fas fa-brain"></i></div>
        <div class="msg-content">Thinking...</div>
    `;
    chatMessages.appendChild(msgDiv);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    return id;
}

function removeLoadingMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function formatContent(text) {
    // Simple markdown-to-html conversion for newlines and bold
    return text
        .replace(/\n/g, "<br>")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>");
}

function autoExpand(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
}

function startNewChat() {
    currentChatId = null;
    document.getElementById("chatMessages").innerHTML = `
        <div class="welcome-message">
            <div class="bot-avatar large">
                <i class="fas fa-brain"></i>
            </div>
            <h1>How can I assist your intelligence today?</h1>
            <p>I can analyze recent forum discussions, draft summaries, or help you deep-dive into specific case studies.</p>
        </div>
    `;
}

function draftWithAI() {
    const input = document.getElementById("aiInput");
    input.value = "Draft a comprehensive summary of recent discussions in the Ethics Space regarding transparency.";
    input.focus();
    autoExpand(input);
}
