let profileUser = null;
let currentTab = 'answers';

document.addEventListener('DOMContentLoaded', () => {
    initProfile();
});

async function initProfile() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');

    if (!userId) {
        alert("User ID missing in URL");
        window.location.href = 'home.html';
        return;
    }

    await fetchProfileData(userId);
    await fetchActivityStats(userId);
    loadTabContent('answers');
}

async function fetchProfileData(userId) {
    try {
        const response = await fetch(`/api/user/public/${userId}`);
        if (!response.ok) throw new Error("User not found");
        
        profileUser = await response.json();
        renderProfileHeader(profileUser);
        renderCredentials(profileUser.credentials);
        renderActiveSpaces(profileUser.interests);
        
        // Impact Score is now handled by fetchActivityStats

    } catch (error) {
        console.error("Error:", error);
        document.querySelector(".profile-main-container").innerHTML = `<div class="loading-state"><p>User not found.</p></div>`;
    }
}

async function fetchActivityStats(userId) {
    try {
        const response = await fetch(`/api/user/stats/${userId}`);
        const stats = await response.json();
        
        // Update Header Stats
        const countAnswersEl = document.getElementById("countAnswers");
        const countQuestionsEl = document.getElementById("countQuestions");
        const countFollowersEl = document.getElementById("countFollowers");
        const countFollowingEl = document.getElementById("countFollowing");

        if (countAnswersEl) countAnswersEl.innerText = formatStatNumber(stats.answers);
        if (countQuestionsEl) countQuestionsEl.innerText = formatStatNumber(stats.questions);
        if (countFollowersEl) countFollowersEl.innerText = formatStatNumber(stats.followersCount);
        if (countFollowingEl) countFollowingEl.innerText = formatStatNumber(stats.followingCount);
        
        // Update Tab Counts
        const tabCountAnswersEl = document.getElementById("tabCountAnswers");
        const tabCountQuestionsEl = document.getElementById("tabCountQuestions");

        if (tabCountAnswersEl) tabCountAnswersEl.innerText = formatStatNumber(stats.answers);
        if (tabCountQuestionsEl) tabCountQuestionsEl.innerText = formatStatNumber(stats.questions);

        // Display Real Impact Score (Reach)
        const reach = stats.totalReach || 0;
        const impactScoreEl = document.getElementById("impactScore");
        if (impactScoreEl) {
            impactScoreEl.innerText = formatStatNumber(reach);
        }
        
        const impactDescEl = document.getElementById("impactDescription");
        if (impactDescEl) {
            const userName = profileUser ? profileUser.name.split(' ')[0] : 'Your';
            impactDescEl.innerText = `${userName}'s answers have reached ${formatStatNumber(reach)} people this year, helping bridge the gap between academia and public discourse.`;
        }
    } catch (error) {
        console.error("Stats fetch error:", error);
    }
}

function formatStatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num;
}

async function renderProfileHeader(user) {
    const container = document.getElementById("profileLargeImgContainer");
    const profileName = document.getElementById("profileName");
    const profileTitle = document.getElementById("profileTitle");
    const profileBioText = document.getElementById("profileBioText");
    const countFollowers = document.getElementById("countFollowers");
    const countFollowing = document.getElementById("countFollowing");
    const verifiedBadge = document.getElementById("verifiedBadge");

    if (container) {
        // Use global renderAvatarHtml from home.js if available
        container.innerHTML = renderAvatarHtml(user) + (verifiedBadge ? verifiedBadge.outerHTML : '');
        // Restore reference if needed since we might have overwritten it
        const newVerifiedBadge = container.querySelector("#verifiedBadge");
        if (user.isVerified && newVerifiedBadge) {
            newVerifiedBadge.style.display = "flex";
        }
    }

    if (profileName) profileName.innerText = user.name;
    if (profileTitle) profileTitle.innerText = user.title || "Explorer";
    if (profileBioText) profileBioText.innerText = user.bio || "No bio yet.";
    if (countFollowers) countFollowers.innerText = formatStatNumber(user.followers ? user.followers.length : 0);
    if (countFollowing) countFollowing.innerText = formatStatNumber(user.following ? user.following.length : 0);

    // Wait for currentUser from home.js to be available
    const loggedInUser = await waitForCurrentUser();
    const followBtn = document.getElementById("followBtn");
    const contactBtn = document.getElementById("contactBtn");
    const editProfileBtn = document.getElementById("editProfileBtn");
    
    if (loggedInUser && loggedInUser._id === user._id) {
        if (editProfileBtn) editProfileBtn.style.display = "block";
        if (followBtn) followBtn.style.display = "none";
        if (contactBtn) contactBtn.style.display = "none";
    } else {
        if (editProfileBtn) editProfileBtn.style.display = "none";
        if (followBtn) followBtn.style.display = "block";
        if (contactBtn) {
            contactBtn.style.display = "block";
            contactBtn.onclick = () => window.location.href = `messages.html?userId=${user._id}`;
        }
        updateFollowUI(user);
    }
}

async function waitForCurrentUser() {
    return new Promise((resolve) => {
        let attempts = 0;
        const check = setInterval(() => {
            if (typeof currentUser !== 'undefined' && currentUser) {
                clearInterval(check);
                resolve(currentUser);
            }
            if (attempts++ > 50) { // 5 seconds max
                clearInterval(check);
                resolve(null);
            }
        }, 100);
    });
}

function updateFollowUI(user) {
    if (typeof currentUser === 'undefined') return;
    const isFollowing = user.followers.some(f => f._id === currentUser._id || f === currentUser._id);
    const btn = document.getElementById("followBtn");
    
    if (!btn) return;

    if (isFollowing) {
        btn.innerText = "Following";
        btn.classList.add("btn-secondary");
        btn.classList.remove("btn-primary");
    } else {
        btn.innerText = "Follow";
        btn.classList.add("btn-primary");
        btn.classList.remove("btn-secondary");
    }

    btn.onclick = () => toggleFollow(user._id);
}

async function toggleFollow(userId) {
    try {
        const btn = document.getElementById("followBtn");
        btn.disabled = true;

        const response = await fetch(`/api/user/follow/${userId}`, { method: 'POST' });
        const result = await response.json();

        if (response.ok) {
            document.getElementById("countFollowers").innerText = formatStatNumber(result.followersCount);
            // Update UI state
            if (result.isFollowing) {
                btn.innerText = "Following";
                btn.classList.add("btn-secondary");
                btn.classList.remove("btn-primary");
            } else {
                btn.innerText = "Follow";
                btn.classList.add("btn-primary");
                btn.classList.remove("btn-secondary");
            }
        }
        btn.disabled = false;
    } catch (error) {
        console.error("Follow error:", error);
    }
}

function switchTab(tab, event) {
    currentTab = tab;
    // Update UI
    document.querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    loadTabContent(tab);
}

async function loadTabContent(tab) {
    const feed = document.getElementById("tabContentFeed");
    feed.innerHTML = `<div class="loading-state"><i class="fas fa-circle-notch fa-spin"></i></div>`;

    try {
        if (tab === 'answers') {
            const response = await fetch(`/api/user/${profileUser._id}/answers`);
            const userAnswers = await response.json();
            renderUserAnswers(userAnswers, feed);
        } else if (tab === 'questions') {
            const response = await fetch(`/api/user/${profileUser._id}/questions`);
            const userQuestions = await response.json();
            renderUserQuestions(userQuestions, feed);
        } else if (tab === 'posts') {
            const [qRes, aRes] = await Promise.all([
                fetch(`/api/user/${profileUser._id}/questions`),
                fetch(`/api/user/${profileUser._id}/answers`)
            ]);
            const questions = await qRes.json();
            const answers = await aRes.json();
            
            // Combine and sort by date
            const combined = [
                ...questions.map(q => ({ ...q, type: 'question' })),
                ...answers.map(a => ({ ...a, type: 'answer' }))
            ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            if (combined.length === 0) {
                feed.innerHTML = `<div class="loading-state"><p>No activity yet.</p></div>`;
            } else {
                feed.innerHTML = "";
                combined.forEach(item => {
                    if (item.type === 'question') {
                        feed.appendChild(createQuestionCard(item));
                    } else {
                        renderSingleAnswer(item, feed);
                    }
                });
            }
        } else if (tab === 'followers' || tab === 'following') {
            const list = tab === 'followers' ? profileUser.followers : profileUser.following;
            
            if (!list || list.length === 0) {
                feed.innerHTML = `<div class="loading-state"><p>No ${tab} yet.</p></div>`;
            } else {
                feed.innerHTML = `<div class="followers-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; padding: 16px;"></div>`;
                const grid = feed.querySelector(".followers-grid");
                list.forEach(person => {
                    const card = document.createElement("div");
                    card.className = "follower-item-card";
                    card.style.cssText = "background: var(--bg-card); padding: 16px; border-radius: 12px; border: 1px solid var(--border-color); display: flex; align-items: center; gap: 12px; cursor: pointer; transition: all 0.2s;";
                    card.onclick = () => window.location.href = `profile.html?id=${person._id}`;
                    
                    card.innerHTML = `
                        <div class="avatar-container mini">
                            ${renderAvatarHtml(person, "mini")}
                        </div>
                        <div class="follower-info">
                            <h4 style="margin: 0; font-size: 14px;">${person.name}</h4>
                            <span style="font-size: 11px; color: var(--text-muted);">View Profile</span>
                        </div>
                    `;
                    grid.appendChild(card);
                });
            }
        } else {
            feed.innerHTML = `<div class="loading-state"><p>No ${tab} to show yet.</p></div>`;
        }
    } catch (error) {
        feed.innerHTML = `<div class="loading-state"><p>Error loading content.</p></div>`;
        console.error("Tab load error:", error);
    }
}

function renderUserAnswers(answers, container) {
    if (answers.length === 0) {
        container.innerHTML = `<div class="loading-state"><p>No answers to show yet.</p></div>`;
    } else {
        container.innerHTML = "";
        answers.forEach(a => renderSingleAnswer(a, container));
    }
}

function renderSingleAnswer(a, container) {
    const card = document.createElement("div");
    card.className = "question-card answer-card-profile animate-fade-in";
    
    const category = a.question?.tags?.[0] || "General";
    const mediaHtml = a.mediaUrl ? `
        <div class="media-container" style="margin-top: 16px; border-radius: 12px; overflow: hidden;">
            ${a.mediaType === 'image' ? `<img src="${a.mediaUrl}" style="width:100%; display:block;">` : `<video src="${a.mediaUrl}" controls style="width:100%; display:block;"></video>`}
        </div>
    ` : "";

    const questionTitle = a.question?.content ? a.question.content : "Untitled Question";

    card.innerHTML = `
        <div class="card-meta">
            <span class="category-tag">${category.toUpperCase()}</span>
            <span class="status-date">Answered ${new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>
        <h3>${questionTitle}</h3>
        <div class="card-content">
            <div class="card-content-text">
                ${a.content.length > 300 ? a.content.substring(0, 300) + "..." : a.content}
            </div>
            ${mediaHtml}
        </div>
        <div class="card-footer-pill">
            <div class="stat-pill">
                <i class="fas fa-arrow-up"></i>
                <span>${formatStatNumber(a.upvotes?.length || 0)}</span>
            </div>
            <div class="stat-pill">
                <i class="far fa-comment"></i>
                <span>${a.comments?.length || 0}</span>
            </div>
            <div class="share-btn-round" title="Share" onclick="shareQuestion('${encodeURIComponent(a.content)}')">
                <i class="fas fa-share-alt"></i>
            </div>
        </div>
    `;
    container.appendChild(card);
}

function renderUserQuestions(questions, container) {
    if (questions.length === 0) {
        container.innerHTML = `<div class="loading-state"><p>No questions posted yet.</p></div>`;
    } else {
        container.innerHTML = "";
        questions.forEach(q => {
            container.appendChild(createQuestionCard(q));
        });
    }
}

function renderCredentials(creds) {
    const list = document.getElementById("credentialsList");
    if (!creds || creds.length === 0) return;

    list.innerHTML = "";
    creds.forEach(c => {
        const div = document.createElement("div");
        div.className = "credential-item";
        div.innerHTML = `
            <i class="${c.icon || 'fas fa-graduation-cap'}"></i>
            <div class="cred-text">
                <h4>${c.title}</h4>
                <p>${c.subtitle}</p>
            </div>
        `;
        list.appendChild(div);
    });
}

function renderActiveSpaces(interests) {
    const list = document.getElementById("activeSpacesList");
    if (!interests || interests.length === 0) return;

    list.innerHTML = "";
    interests.forEach(interest => {
        const span = document.createElement("span");
        span.className = "interest-tag";
        span.innerText = interest;
        list.appendChild(span);
    });
}
