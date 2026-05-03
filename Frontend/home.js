let currentUser = null;
let currentAnsweringQuestionId = null;

window.onload = async () => {
    initTheme();
    await fetchUserData();
    
    // Load feed if on an active space route
    const path = window.location.pathname;
    const feedRoutes = ["home.html", "/", "/home", "/philosophy", "/psychology", "/technology", "/science", "/business"];
    if (feedRoutes.some(route => path.includes(route) || path === route)) {
        await loadStories();
        await loadSidebarData();
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

            // Set My Library Links in Navigation
            document.querySelectorAll('a[href="profile.html"]').forEach(link => {
                link.href = `profile.html?id=${currentUser._id}`;
            });

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

async function loadStories() {
    const feed = document.getElementById("feedContent");
    try {
        const urlParams = new URLSearchParams(window.location.search);
        let genre = urlParams.get('genre');
        
        // Auto-detect genre from pathname if not in query param
        const path = window.location.pathname;
        if (!genre) {
            if (path.includes("philosophy")) genre = "Philosophy";
            else if (path.includes("psychology")) genre = "Psychology";
            else if (path.includes("technology")) genre = "Technology";
            else if (path.includes("science")) genre = "Science";
            else if (path.includes("business")) genre = "Business";
        }

        let url = "/api/stories";
        if (genre) {
            url += `?genre=${encodeURIComponent(genre)}`;
        }

        const response = await fetch(url);
        const stories = await response.json();

        if (stories.length === 0) {
            feed.innerHTML = `
                <div class="loading-state">
                    <p>No stories yet. Be the first to publish!</p>
                </div>
            `;
            return;
        }

        feed.innerHTML = "";
        stories.forEach(s => {
            const card = createStoryCard(s);
            feed.appendChild(card);
        });
    } catch (error) {
        feed.innerHTML = "<p>Error loading feed.</p>";
    }
}

async function loadSidebarData() {
    try {
        const response = await fetch("/api/stories");
        const allStories = await response.json();
        
        // Count stories by genre and author
        const genreCounts = {};
        const authorCounts = {};
        
        allStories.forEach(s => {
            // Genre count
            genreCounts[s.genre] = (genreCounts[s.genre] || 0) + 1;
            
            // Author count
            const authorId = s.author?._id;
            if (authorId) {
                if (!authorCounts[authorId]) {
                    authorCounts[authorId] = {
                        name: s.author.name,
                        profilePic: s.author.profilePic,
                        count: 0
                    };
                }
                authorCounts[authorId].count++;
            }
        });

        // Populate Top Authors
        const topAuthorsList = document.getElementById("topAuthorsList");
        if (topAuthorsList) {
            if (Object.keys(authorCounts).length === 0) {
                topAuthorsList.innerHTML = "<li style='padding:10px; color:var(--text-light)'>No authors yet</li>";
            } else {
                topAuthorsList.innerHTML = Object.entries(authorCounts)
                    .sort((a, b) => b[1].count - a[1].count)
                    .slice(0, 5)
                    .map(([id, info]) => `
                        <li onclick="window.location.href='profile.html?id=${id}'" style="cursor:pointer">
                            <div class="avatar-container mini" style="margin-right: 10px; flex-shrink: 0;">
                                <img src="${info.profilePic || '/uploads/default-avatar.png'}" style="width:30px;height:30px;border-radius:50%; object-fit:cover;">
                            </div>
                            <div class="topic-info">
                                <strong style="font-size:14px;">${info.name}</strong>
                                <span>${info.count} stories shared</span>
                            </div>
                        </li>
                    `).join("");
            }
        }

        // Populate Trending Genres
        const genreList = document.getElementById("trendingGenresList");
        if (genreList) {
            if (Object.keys(genreCounts).length === 0) {
                genreList.innerHTML = "<li style='padding:10px; color:var(--text-light)'>No trends yet</li>";
            } else {
                genreList.innerHTML = Object.entries(genreCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([genre, count]) => `
                        <li onclick="window.location.href='home.html?genre=${encodeURIComponent(genre)}'" style="cursor:pointer">
                            <div class="topic-info">
                                <strong>${genre}</strong>
                                <span>${count} stories published</span>
                            </div>
                        </li>
                    `).join("");
            }
        }

        // Populate Community Stats
        const statsList = document.getElementById("communityStatsList");
        if (statsList) {
            const totalViews = allStories.reduce((acc, s) => acc + (s.views || 0), 0);
            statsList.innerHTML = `
                <li><i class="fas fa-book" style="color:var(--primary-color)"></i> ${allStories.length} Stories Shared</li>
                <li><i class="fas fa-eye" style="color:var(--primary-color)"></i> ${totalViews.toLocaleString()} Total Reads</li>
                <li><i class="fas fa-users" style="color:var(--primary-color)"></i> Community Authors</li>
            `;
        }
    } catch (err) {
        console.error("Sidebar load error:", err);
    }
}

function createStoryCard(s) {
    const card = document.createElement("div");
    card.className = "question-card"; // Reusing class for styling
    
    const mediaHtml = s.coverImage ? `
        <div class="media-container">
            <img src="${s.coverImage}" onerror="this.parentElement.style.display='none'">
        </div>
    ` : "";

    const hasLiked = currentUser && s.likes?.includes(currentUser._id);
    const hasDisliked = currentUser && s.dislikes?.includes(currentUser._id);
    const isAuthor = currentUser && s.author?._id === currentUser._id;
    const deleteBtnHtml = isAuthor ? `
        <button class="delete-post-btn" onclick="deleteStory('${s._id}')" title="Delete Story">
            <i class="fas fa-trash-alt"></i>
        </button>
    ` : "";

    card.innerHTML = `
        ${deleteBtnHtml}
        <div class="card-header">
            <div class="avatar-container mini" onclick="window.location.href='profile.html?id=${s.author?._id}'">
                ${renderAvatarHtml(s.author, "mini")}
            </div>
            <div class="user-info">
                <h4 onclick="window.location.href='profile.html?id=${s.author?._id}'" style="cursor:pointer">${s.author?.name || 'Anonymous'}</h4>
                <span>Genre: ${s.genre} • ${new Date(s.createdAt).toLocaleDateString()}</span>
            </div>
        </div>
        <div class="card-content">
            <h3 style="margin-bottom: 10px;">${s.title}</h3>
            <p>${s.description}</p>
            ${mediaHtml}
        </div>
        <div class="card-stats">
            <div class="stat-left">
                <div class="btn-upvote-group">
                    <button class="btn-vote" onclick="likeStory('${s._id}', this)" style="color: ${hasLiked ? 'var(--primary-color)' : 'inherit'}">
                        <i class="${hasLiked ? 'fas' : 'far'} fa-thumbs-up"></i> <span class="like-count">${s.likes?.length || 0}</span>
                    </button>
                    <button class="btn-vote" onclick="dislikeStory('${s._id}', this)" style="color: ${hasDisliked ? 'var(--primary-color)' : 'inherit'}">
                        <i class="${hasDisliked ? 'fas' : 'far'} fa-thumbs-down"></i> <span class="dislike-count">${s.dislikes?.length || 0}</span>
                    </button>
                </div>
                <div class="stat-badge" style="margin-left: 10px;">
                     <i class="far fa-eye"></i> ${s.views || 0}
                </div>
            </div>
            <div class="stat-right">
                <div class="stat-item" onclick="window.location.href='read-story.html?id=${s._id}'" style="color: var(--primary-color); font-weight: bold;">
                    <i class="fas fa-book-open"></i> Read Story
                </div>
            </div>
        </div>
    `;
    return card;
}

async function likeStory(storyId, btn) {
    if (!currentUser) return alert("Please login to like stories.");
    try {
        const response = await fetch(`/api/stories/${storyId}/like`, { method: "POST" });
        if (response.ok) {
            const data = await response.json();
            const card = btn.closest(".question-card");
            
            // Update Counts
            card.querySelector(".like-count").innerText = data.likes;
            card.querySelector(".dislike-count").innerText = data.dislikes;
            
            // Update Buttons
            const likeBtn = card.querySelector("button[onclick*='likeStory']");
            const dislikeBtn = card.querySelector("button[onclick*='dislikeStory']");
            
            likeBtn.style.color = data.isLiked ? 'var(--primary-color)' : 'inherit';
            likeBtn.querySelector("i").className = data.isLiked ? 'fas fa-thumbs-up' : 'far fa-thumbs-up';
            
            dislikeBtn.style.color = data.isDisliked ? 'var(--primary-color)' : 'inherit';
            dislikeBtn.querySelector("i").className = data.isDisliked ? 'fas fa-thumbs-down' : 'far fa-thumbs-down';
        } else {
            const errorText = await response.text();
            console.error("Like error response:", errorText);
            alert("Server error. If this persists, please restart the server.");
        }
    } catch (e) {
        console.error(e);
        alert("Network error or server unavailable.");
    }
}

async function dislikeStory(storyId, btn) {
    if (!currentUser) return alert("Please login to dislike stories.");
    try {
        const response = await fetch(`/api/stories/${storyId}/dislike`, { method: "POST" });
        if (response.ok) {
            const data = await response.json();
            const card = btn.closest(".question-card");
            
            // Update Counts
            card.querySelector(".like-count").innerText = data.likes;
            card.querySelector(".dislike-count").innerText = data.dislikes;
            
            // Update Buttons
            const likeBtn = card.querySelector("button[onclick*='likeStory']");
            const dislikeBtn = card.querySelector("button[onclick*='dislikeStory']");
            
            likeBtn.style.color = data.isLiked ? 'var(--primary-color)' : 'inherit';
            likeBtn.querySelector("i").className = data.isLiked ? 'fas fa-thumbs-up' : 'far fa-thumbs-up';
            
            dislikeBtn.style.color = data.isDisliked ? 'var(--primary-color)' : 'inherit';
            dislikeBtn.querySelector("i").className = data.isDisliked ? 'fas fa-thumbs-down' : 'far fa-thumbs-down';
        } else {
            const errorText = await response.text();
            console.error("Dislike error response:", errorText);
            alert("Server error. If this persists, please restart the server.");
        }
    } catch (e) {
        console.error(e);
        alert("Network error or server unavailable.");
    }
}

async function deleteStory(storyId) {
    if (!confirm("Are you sure you want to delete this story?")) return;
    try {
        const response = await fetch(`/api/stories/${storyId}`, { method: "DELETE" });
        if (response.ok) {
            loadStories();
        } else {
            alert("Failed to delete story (or endpoint not implemented).");
        }
    } catch (e) {
        console.error(e);
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
            
            // If on profile page and viewing self, update profileUser too
            if (typeof profileUser !== 'undefined' && profileUser && profileUser._id === currentUser._id) {
                profileUser.profilePic = data.profilePic;
            }
            
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
    const input = document.getElementById("profileUploadInput");
    if (input) {
        input.click();
        document.getElementById("profileDropdown").classList.remove("active");
    }
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