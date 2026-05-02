let currentUser = null;
let currentAnsweringQuestionId = null;

window.onload = async () => {
    initTheme();
    await fetchUserData();
    
    // Load feed if on an active space route
    const path = window.location.pathname;
    const feedRoutes = ["home.html", "/", "/home", "/philosophy", "/psychology", "/technology", "/science", "/business"];
    if (feedRoutes.some(route => path.includes(route) || path === route)) {
        await loadQuestions();
    }
};

function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    const themeToggle = document.getElementById("themeToggle");
    if (themeToggle) {
        themeToggle.checked = savedTheme === "dark";
        themeToggle.onchange = (e) => setTheme(e.target.checked ? "dark" : "light");
    }
}

function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
}

async function fetchUserData() {
    try {
        const response = await fetch("/api/user/me");
        if (response.ok) {
            currentUser = await response.json();
            
            // Render Nav and Mini Profile
            const navAvatar = renderAvatarHtml(currentUser);
            const trigger = document.getElementById("profileTrigger");
            if (trigger) trigger.innerHTML = navAvatar;

            // Set View Profile Link
            const profileLink = document.getElementById("viewProfileLink");
            if (profileLink) profileLink.href = `profile.html?id=${currentUser._id}`;

            const mini = document.getElementById("miniProfileContainer");
            if (mini) {
                const miniAvatar = renderAvatarHtml(currentUser, "mini");
                mini.innerHTML = miniAvatar;
                mini.onclick = () => window.location.href = `profile.html?id=${currentUser._id}`;
                mini.style.cursor = "pointer";
            }

            // Populate dropdown
            document.getElementById("dropdownUserName").innerText = currentUser.name || "User";
            document.getElementById("dropdownUserEmail").innerText = currentUser.email || "";
            
            // Render Bio and Interests in Dropdown
            renderProfileDetails(currentUser);
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
    }
}

function renderAvatarHtml(user, sizeClass = "") {
    const name = user?.name || "User";
    const initial = name.charAt(0).toUpperCase();
    const isDefault = !user?.profilePic || user.profilePic.includes("default-avatar.png");

    if (isDefault) {
        return `<div class="avatar-letter">${initial}</div>`;
    } else {
        return `<img src="${user.profilePic}" alt="${name}">`;
    }
}

function renderProfileDetails(user) {
    const dropdown = document.getElementById("profileDropdown");
    
    // Remove existing detail sections if any
    const existingDetails = dropdown.querySelectorAll(".dropdown-user-details");
    existingDetails.forEach(el => el.remove());

    const detailsDiv = document.createElement("div");
    detailsDiv.className = "dropdown-user-details";
    detailsDiv.style.padding = "0 16px 12px 16px";
    detailsDiv.style.fontSize = "13px";

    if (user.bio) {
        const bioP = document.createElement("p");
        bioP.className = "user-bio-text";
        bioP.style.color = "var(--text-main)";
        bioP.style.fontStyle = "italic";
        bioP.style.marginBottom = "8px";
        bioP.innerText = user.bio;
        detailsDiv.appendChild(bioP);
    }

    if (user.interests && user.interests.length > 0) {
        const interestsDiv = document.createElement("div");
        interestsDiv.className = "user-interests-list";
        
        user.interests.forEach(interest => {
            const span = document.createElement("span");
            span.className = "interest-tag";
            span.innerText = interest;
            interestsDiv.appendChild(span);
        });
        detailsDiv.appendChild(interestsDiv);
    }

    // Insert after the header
    const header = dropdown.querySelector(".dropdown-header");
    header.after(detailsDiv);
}

// --- Question Flow ---

function openAskModal() {
    document.getElementById("askModal").style.display = "block";
}

function closeAskModal() {
    document.getElementById("askModal").style.display = "none";
    resetAskModal();
}

function handleMediaSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    const container = document.getElementById("mediaPreviewContainer");
    const imgPreview = document.getElementById("imagePreview");
    const videoPreview = document.getElementById("videoPreview");

    reader.onload = (e) => {
        container.classList.remove("hidden");
        if (file.type.startsWith("image/")) {
            imgPreview.src = e.target.result;
            imgPreview.classList.remove("hidden");
            videoPreview.classList.add("hidden");
        } else if (file.type.startsWith("video/")) {
            videoPreview.src = e.target.result;
            videoPreview.classList.remove("hidden");
            imgPreview.classList.add("hidden");
        }
    };
    reader.readAsDataURL(file);
}

function removeMedia() {
    document.getElementById("mediaInput").value = "";
    document.getElementById("mediaPreviewContainer").classList.add("hidden");
}

function resetAskModal() {
    document.getElementById("questionContent").value = "";
    removeMedia();
}

async function submitQuestion(btnElement) {
    const content = document.getElementById("questionContent").value;
    const mediaInput = document.getElementById("mediaInput");
    
    if (!content.trim() && !mediaInput.files[0]) {
        alert("Please enter some content or select media.");
        return;
    }

    // Disable button and show loading state
    const originalText = btnElement.innerText;
    btnElement.disabled = true;
    btnElement.innerText = "Uploading...";

    const formData = new FormData();
    formData.append("content", content);
    if (mediaInput.files[0]) {
        formData.append("media", mediaInput.files[0]);
    }

    // Auto-assign space based on route
    const path = window.location.pathname;
    if (path.includes("philosophy")) formData.append("spaces", "Philosophy");
    else if (path.includes("psychology")) formData.append("spaces", "Psychology");
    else if (path.includes("technology")) formData.append("spaces", "Technology");
    else if (path.includes("science")) formData.append("spaces", "Science");
    else if (path.includes("business")) formData.append("spaces", "Business");
    else formData.append("spaces", "General");

    try {
        const response = await fetch("/api/questions", {
            method: "POST",
            body: formData
        });

        if (response.ok) {
            closeAskModal();
            loadQuestions(); // Reload feed
        } else {
            alert("Failed to post question.");
        }
    } catch (error) {
        console.error("Posting error:", error);
    } finally {
        btnElement.disabled = false;
        btnElement.innerText = originalText;
    }
}

// --- Feed Logic ---

async function loadQuestions() {
    const feed = document.getElementById("feedContent");
    try {
        // Fetch questions depending on space
        const path = window.location.pathname;
        let url = "/api/questions";
        if (path.includes("philosophy")) url += "?space=Philosophy";
        else if (path.includes("psychology")) url += "?space=Psychology";
        else if (path.includes("technology")) url += "?space=Technology";
        else if (path.includes("science")) url += "?space=Science";
        else if (path.includes("business")) url += "?space=Business";

        const response = await fetch(url);
        const questions = await response.json();

        if (questions.length === 0) {
            feed.innerHTML = `
                <div class="loading-state">
                    <p>No questions yet. Be the first to ask!</p>
                </div>
            `;
            return;
        }

        feed.innerHTML = "";
        questions.forEach(q => {
            const card = createQuestionCard(q);
            feed.appendChild(card);
        });
    } catch (error) {
        feed.innerHTML = "<p>Error loading feed.</p>";
    }
}

function createQuestionCard(q) {
    const card = document.createElement("div");
    card.className = "question-card";
    
    const mediaHtml = q.mediaUrl ? `
        <div class="media-container">
            ${q.mediaType === 'image' ? `<img src="${q.mediaUrl}" onerror="this.parentElement.style.display='none'">` : `<video src="${q.mediaUrl}" controls onerror="this.parentElement.style.display='none'"></video>`}
        </div>
    ` : "";

    const hasLiked = currentUser && q.upvotes && q.upvotes.includes(currentUser._id);
    const hasDisliked = currentUser && q.downvotes && q.downvotes.includes(currentUser._id);

    // Escape content to safely pass to functions
    const safeContentForShare = encodeURIComponent(q.content);
    const safeContentForAnswer = q.content.substring(0, 30).replace(/'/g, "\\'").replace(/"/g, '&quot;');

    const isAuthor = currentUser && q.user?._id === currentUser._id;
    const deleteBtnHtml = isAuthor ? `
        <button class="delete-post-btn" onclick="deleteQuestion('${q._id}')" title="Delete Post">
            <i class="fas fa-trash-alt"></i>
        </button>
    ` : "";

    card.innerHTML = `
        ${deleteBtnHtml}
        <div class="card-header">
            <div class="avatar-container mini" onclick="window.location.href='profile.html?id=${q.user?._id}'">
                ${renderAvatarHtml(q.user, "mini")}
            </div>
            <div class="user-info">
                <h4 onclick="window.location.href='profile.html?id=${q.user?._id}'" style="cursor:pointer">${q.user?.name || 'Anonymous'}</h4>
                <span>Posted in ${q.spaces} • ${new Date(q.createdAt).toLocaleDateString()}</span>
            </div>
        </div>
        <div class="card-content">
            <p>${q.content}</p>
            ${mediaHtml}
        </div>
        <div class="card-stats">
            <div class="stat-left">
                <div class="btn-upvote-group">
                    <button class="btn-vote" onclick="toggleLike('${q._id}')" style="${hasLiked ? 'color: var(--primary-color)' : ''}">
                         <i class="${hasLiked ? 'fas' : 'far'} fa-thumbs-up"></i> Like • ${q.upvotes?.length || 0}
                    </button>
                    <button class="btn-vote" onclick="toggleDislike('${q._id}')" style="${hasDisliked ? 'color: #ff5252' : ''}">
                         <i class="${hasDisliked ? 'fas' : 'far'} fa-thumbs-down"></i> Dislike • ${q.downvotes?.length || 0}
                    </button>
                </div>
            </div>
            <div class="stat-right">
                <div class="stat-item" onclick="openAnswerModal('${q._id}', '${safeContentForAnswer}...')">
                    <i class="far fa-comment"></i> Answer
                </div>
                <div class="stat-item" onclick="shareQuestion(decodeURIComponent('${safeContentForShare}'))">
                    <i class="fas fa-share"></i> Share
                </div>
            </div>
        </div>
        <div class="answers-section" id="answers-${q._id}">
             <button class="btn-show-answers" onclick="loadAnswers('${q._id}')">View Answers</button>
        </div>
    `;
    return card;
}

// Global functions for Like / Dislike / Share
async function toggleLike(questionId) {
    if (!currentUser) return alert("Please log in to like a question.");
    try {
        const response = await fetch(`/api/questions/${questionId}/like`, { method: "POST" });
        if (response.ok) loadQuestions();
    } catch (e) {
        console.error("Error liking:", e);
    }
}

async function toggleDislike(questionId) {
    if (!currentUser) return alert("Please log in to dislike a question.");
    try {
        const response = await fetch(`/api/questions/${questionId}/dislike`, { method: "POST" });
        if (response.ok) loadQuestions();
    } catch (e) {
        console.error("Error disliking:", e);
    }
}

function shareQuestion(content) {
    if (navigator.share) {
        navigator.share({
            title: 'MindForum Question',
            text: content,
            url: window.location.href
        }).catch(console.error);
    } else {
        alert("Share feature is not supported in this browser. Try copying the URL.");
    }
}

async function deleteQuestion(questionId) {
    if (!confirm("Are you sure you want to delete this post? This action cannot be undone and will delete all associated answers.")) {
        return;
    }

    try {
        const response = await fetch(`/api/questions/${questionId}`, {
            method: "DELETE"
        });

        if (response.ok) {
            // Check if we are on profile page or home page
            if (typeof initProfile === 'function') {
                // On profile page
                const urlParams = new URLSearchParams(window.location.search);
                const userId = urlParams.get('id');
                await fetchActivityStats(userId);
                loadTabContent(currentTab);
            } else {
                // On home page
                loadQuestions();
            }
        } else {
            const data = await response.json();
            alert(data.message || "Failed to delete question.");
        }
    } catch (error) {
        console.error("Delete error:", error);
        alert("An error occurred while deleting the question.");
    }
}

// --- Answer Flow ---

function openAnswerModal(questionId, snippet) {
    currentAnsweringQuestionId = questionId;
    document.getElementById("answeringTo").innerText = `Answering: "${snippet}"`;
    document.getElementById("answerModal").style.display = "block";
}

function closeAnswerModal() {
    document.getElementById("answerModal").style.display = "none";
    resetAnswerModal();
}

function handleAnswerMediaSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    const container = document.getElementById("answerMediaPreviewContainer");
    const imgPreview = document.getElementById("answerImagePreview");
    const videoPreview = document.getElementById("answerVideoPreview");

    reader.onload = (e) => {
        container.classList.remove("hidden");
        if (file.type.startsWith("image/")) {
            imgPreview.src = e.target.result;
            imgPreview.classList.remove("hidden");
            videoPreview.classList.add("hidden");
        } else if (file.type.startsWith("video/")) {
            videoPreview.src = e.target.result;
            videoPreview.classList.remove("hidden");
            imgPreview.classList.add("hidden");
        }
    };
    reader.readAsDataURL(file);
}

function removeAnswerMedia() {
    document.getElementById("answerMediaInput").value = "";
    document.getElementById("answerMediaPreviewContainer").classList.add("hidden");
}

function resetAnswerModal() {
    document.getElementById("answerContent").value = "";
    removeAnswerMedia();
}

async function submitAnswer(btnElement) {
    const content = document.getElementById("answerContent").value;
    const mediaInput = document.getElementById("answerMediaInput");

    if (!content.trim() && !mediaInput.files[0]) {
        alert("Please enter an answer.");
        return;
    }

    // Disable button and show loading state
    const originalText = btnElement.innerText;
    btnElement.disabled = true;
    btnElement.innerText = "Uploading...";

    const formData = new FormData();
    formData.append("content", content);
    if (mediaInput.files[0]) {
        formData.append("media", mediaInput.files[0]);
    }

    try {
        const response = await fetch(`/api/questions/${currentAnsweringQuestionId}/answers`, {
            method: "POST",
            body: formData
        });

        if (response.ok) {
            closeAnswerModal();
            loadAnswers(currentAnsweringQuestionId);
        } else {
            alert("Failed to post answer.");
        }
    } catch (error) {
        console.error("Answering error:", error);
    } finally {
        btnElement.disabled = false;
        btnElement.innerText = originalText;
    }
}

async function loadAnswers(questionId) {
    const container = document.getElementById(`answers-${questionId}`);
    try {
        const response = await fetch(`/api/questions/${questionId}/answers`);
        const answers = await response.json();

        if (answers.length === 0) {
            container.innerHTML = `<p style="font-size: 12px; color: #888; padding: 10px;">No answers yet.</p>`;
            return;
        }

        container.innerHTML = "";
        answers.forEach(a => {
            const div = document.createElement("div");
            div.className = "answer-card";
            const mediaHtml = a.mediaUrl ? `
                <div class="media-container" style="margin-top: 8px;">
                     ${a.mediaType === 'image' ? `<img src="${a.mediaUrl}" style="max-height: 200px;" onerror="this.parentElement.style.display='none'">` : `<video src="${a.mediaUrl}" controls style="max-height: 200px;" onerror="this.parentElement.style.display='none'"></video>`}
                </div>
            ` : "";

            div.innerHTML = `
                <div class="answer-header">
                    <div class="avatar-container small">
                        ${renderAvatarHtml(a.user, "small")}
                    </div>
                    <strong>${a.user?.name || 'Anonymous'}</strong>
                </div>
                <div class="answer-content">
                    <p>${a.content}</p>
                    ${mediaHtml}
                </div>
            `;
            container.appendChild(div);
        });
    } catch (error) {
        container.innerHTML = `<p>Error loading answers.</p>`;
    }
}

// --- Profile & Misc ---

async function uploadPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("profilePic", file);

    // Provide visual feedback
    const uploadTextSpan = document.querySelector('div[onclick="triggerProfileUpload()"] span');
    let originalText = "Upload Profile";
    if (uploadTextSpan) {
        originalText = uploadTextSpan.innerText;
        uploadTextSpan.innerText = "Uploading...";
    }

    try {
        const response = await fetch("/api/user/upload-profile-pic", {
            method: "POST",
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            currentUser.profilePic = data.profilePic;
            
            // Refresh avatars
            document.getElementById("profileTrigger").innerHTML = renderAvatarHtml(currentUser);
            const mini = document.getElementById("miniProfileContainer");
            if (mini) mini.innerHTML = renderAvatarHtml(currentUser, "mini");
            
            // Refresh large profile image if on profile page
            const large = document.getElementById("profileLargeImgContainer");
            if (large) large.innerHTML = renderAvatarHtml(currentUser);
            
            alert("Profile picture updated!");
        } else {
            alert("Profile upload failed.");
        }
    } catch (error) {
        console.error("Upload error:", error);
    } finally {
        if (uploadTextSpan) {
            uploadTextSpan.innerText = originalText;
        }
    }
}

document.getElementById("profileTrigger").onclick = (e) => {
    e.stopPropagation();
    document.getElementById("profileDropdown").classList.toggle("active");
};

// Close dropdown when clicking outside
window.onclick = (e) => {
    const dropdown = document.getElementById("profileDropdown");
    if (dropdown && dropdown.classList.contains("active") && !dropdown.contains(e.target)) {
        dropdown.classList.remove("active");
    }
};

function triggerProfileUpload() {
    document.getElementById("profileInput").click();
    document.getElementById("profileDropdown").classList.remove("active");
}

function logout() {
    window.location.href = "/logout";
}

// --- Edit Profile Logic ---

function openEditProfileModal() {
    if (!currentUser) return;
    document.getElementById("editBio").value = currentUser.bio || "";
    document.getElementById("editInterests").value = (currentUser.interests || []).join(", ");
    document.getElementById("editProfileModal").style.display = "block";
    document.getElementById("profileDropdown").classList.remove("active");
}

function closeEditProfileModal() {
    document.getElementById("editProfileModal").style.display = "none";
}

async function updateProfile() {
    const bio = document.getElementById("editBio").value;
    const interests = document.getElementById("editInterests").value;

    try {
        const response = await fetch("/api/user/profile", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ bio, interests })
        });

        if (response.ok) {
            currentUser = await response.json();
            renderProfileDetails(currentUser);
            closeEditProfileModal();
            alert("Profile updated!");
        } else {
            alert("Failed to update profile.");
        }
    } catch (error) {
        console.error("Update error:", error);
    }
}

// --- Notification Polling & Desktop Alerts ---

async function checkNotifications() {
    try {
        const response = await fetch('/api/notifications');
        if (!response.ok) return;
        const notifications = await response.json();
        
        const unread = notifications.filter(n => !n.isRead);
        const notifDot = document.getElementById('notifDot');
        
        if (unread.length > 0) {
            if (notifDot) notifDot.classList.remove('hidden');
            
            // Handle browser notifications for unseen items
            const forBrowser = unread.filter(n => !n.isBrowserNotified);
            if (forBrowser.length > 0) {
                for (const notif of forBrowser) {
                    showBrowserNotification(notif);
                }
                
                // Mark as browser-notified
                await fetch('/api/notifications/browser-notified', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: forBrowser.map(n => n._id) })
                });
            }
        } else {
            if (notifDot) notifDot.classList.add('hidden');
        }
    } catch (err) {
        console.error('Error checking notifications:', err);
    }
}

function showBrowserNotification(notif) {
    if (!("Notification" in window)) return;
    
    if (Notification.permission === "granted") {
        const options = {
            body: notif.message,
            icon: notif.sender.profilePic || "/uploads/default-avatar.png",
            badge: "/favicon.ico"
        };
        
        const n = new Notification("MindForum", options);
        n.onclick = () => {
            window.focus();
            window.location.href = 'notifications.html';
        };
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission();
    }
}

// Start polling
if (typeof auth !== 'undefined' || document.cookie.includes('token')) {
    setInterval(checkNotifications, 30000); // Every 30 seconds
    checkNotifications(); // Initial check
}

// Request permission on first interaction
document.addEventListener('click', () => {
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }
}, { once: true });