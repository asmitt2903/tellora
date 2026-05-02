let currentUser = null;
let currentGenre = null;
let storiesData = [];

window.onload = async () => {
    initTheme();
    await fetchUserData();
    setupProfileDropdown();
    
    // Load stories if on a story page
    const path = window.location.pathname;
    const storyRoutes = ["home.html", "/", "/home", "adventure.html", "mystery.html", "romance.html", "fantasy.html", "scifi.html", "horror.html", "thriller.html", "historical.html"];
    if (storyRoutes.some(route => path.includes(route) || path === route)) {
        await loadStories();
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
            
            // Render Nav Avatar
            const navAvatar = renderAvatarHtml(currentUser);
            const trigger = document.getElementById("profileTrigger");
            if (trigger) trigger.innerHTML = navAvatar;

            // Set View Profile Link
            const profileLink = document.getElementById("viewProfileLink");
            if (profileLink) profileLink.href = `profile.html?id=${currentUser._id}`;

            // Populate dropdown
            document.getElementById("dropdownUserName").innerText = currentUser.name || "User";
            if (document.getElementById("dropdownUserEmail")) {
                document.getElementById("dropdownUserEmail").innerText = currentUser.email || "";
            }

            // Mini Profile Widget (if on home page)
            const mini = document.getElementById("miniProfileContainer");
            if (mini) {
                const miniAvatar = renderAvatarHtml(currentUser, "mini");
                mini.innerHTML = miniAvatar;
                mini.onclick = () => window.location.href = `profile.html?id=${currentUser._id}`;
                mini.style.cursor = "pointer";
            }
        } else {
            // Redirect to login if not authenticated
            window.location.href = "login.html";
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
        window.location.href = "login.html";
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

function setupProfileDropdown() {
    const profileTrigger = document.getElementById("profileTrigger");
    const profileDropdown = document.getElementById("profileDropdown");
    
    if (profileTrigger && profileDropdown) {
        profileTrigger.onclick = (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle("visible");
        };
        
        document.onclick = (e) => {
            if (!profileTrigger.contains(e.target) && !profileDropdown.contains(e.target)) {
                profileDropdown.classList.remove("visible");
            }
        };
    }
}

// --- Story Publication Flow ---

function openPublishModal() {
    const modal = document.getElementById("publishModal");
    if (modal) {
        modal.classList.remove("hidden");
    }
}

function closePublishModal() {
    const modal = document.getElementById("publishModal");
    if (modal) {
        modal.classList.add("hidden");
    }
    resetPublishModal();
}

function resetPublishModal() {
    document.getElementById("storyTitle").value = "";
    document.getElementById("storyGenre").value = "";
    document.getElementById("storyDescription").value = "";
    document.getElementById("storyTags").value = "";
    document.getElementById("storyContent").value = "";
}

async function handlePublishStory(event) {
    event.preventDefault();
    
    const title = document.getElementById("storyTitle").value.trim();
    const genre = document.getElementById("storyGenre").value;
    const description = document.getElementById("storyDescription").value.trim();
    const tags = document.getElementById("storyTags").value.split(",").map(tag => tag.trim()).filter(tag => tag);
    const content = document.getElementById("storyContent").value.trim();
    
    if (!title || !content || !genre) {
        alert("Please fill in all required fields.");
        return;
    }

    try {
        const response = await fetch("/api/stories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title,
                genre,
                description,
                tags,
                content,
                status: "draft"
            })
        });

        if (response.ok) {
            alert("Story saved as draft!");
            closePublishModal();
            await loadStories();
        } else {
            alert("Error saving story.");
        }
    } catch (error) {
        console.error("Error publishing story:", error);
        alert("Error publishing story.");
    }
}

async function publishStoryDirect() {
    const title = document.getElementById("storyTitle").value.trim();
    const genre = document.getElementById("storyGenre").value;
    const description = document.getElementById("storyDescription").value.trim();
    const tags = document.getElementById("storyTags").value.split(",").map(tag => tag.trim()).filter(tag => tag);
    const content = document.getElementById("storyContent").value.trim();
    
    if (!title || !content || !genre) {
        alert("Please fill in all required fields.");
        return;
    }

    try {
        const response = await fetch("/api/stories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title,
                genre,
                description,
                tags,
                content,
                status: "published"
            })
        });

        if (response.ok) {
            alert("Story published!");
            closePublishModal();
            await loadStories();
        } else {
            alert("Error publishing story.");
        }
    } catch (error) {
        console.error("Error publishing story:", error);
        alert("Error publishing story.");
    }
}

// --- Load and Display Stories ---

async function loadStories() {
    try {
        let url = "/api/stories";
        
        // Filter by genre if on genre page
        if (currentGenre) {
            url += `?genre=${encodeURIComponent(currentGenre)}`;
        }
        
        const response = await fetch(url);
        if (response.ok) {
            storiesData = await response.json();
            displayStories(storiesData);
        }
    } catch (error) {
        console.error("Error loading stories:", error);
    }
}

function displayStories(stories) {
    const feedContainer = document.getElementById("storiesFeed") || 
                         document.getElementById("adventureStories") ||
                         document.getElementById("mysteryStories") ||
                         document.getElementById("romanceStories") ||
                         document.getElementById("fantasyStories") ||
                         document.getElementById("scifiStories") ||
                         document.getElementById("horrorStories") ||
                         document.getElementById("thrillerStories") ||
                         document.getElementById("historicalStories");
    
    if (!feedContainer) return;

    if (stories.length === 0) {
        feedContainer.innerHTML = `<p class="no-stories">No stories found. Start creating one!</p>`;
        return;
    }

    feedContainer.innerHTML = stories.map(story => `
        <div class="story-card">
            <div class="story-header">
                <div class="author-info">
                    <div class="author-avatar">${story.author?.name?.charAt(0).toUpperCase() || 'A'}</div>
                    <div class="author-details">
                        <h4 class="author-name">${story.author?.name || 'Anonymous'}</h4>
                        <span class="story-date">${new Date(story.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
                <span class="genre-badge">${story.genre}</span>
            </div>
            
            <div class="story-content">
                <h3 class="story-title" onclick="window.location.href='story-detail.html?id=${story._id}'">${story.title}</h3>
                <p class="story-description">${story.description || story.content.substring(0, 150) + '...'}</p>
            </div>
            
            <div class="story-meta">
                <span class="meta-item">
                    <i class="fas fa-eye"></i> ${story.views || 0} views
                </span>
                <span class="meta-item">
                    <i class="fas fa-heart"></i> ${story.likes?.length || 0} likes
                </span>
                <span class="meta-item">
                    <i class="fas fa-star"></i> ${(story.averageRating || 0).toFixed(1)} (${story.totalReviews || 0} reviews)
                </span>
                <span class="meta-item reading-time">
                    <i class="fas fa-clock"></i> ${story.readingTime || 5} min read
                </span>
            </div>
            
            <div class="story-tags">
                ${story.tags?.map(tag => `<span class="tag">#${tag}</span>`).join('') || ''}
            </div>
            
            <div class="story-actions">
                <button class="btn-action" onclick="likeStory('${story._id}')">
                    <i class="fas fa-heart"></i> Like
                </button>
                <button class="btn-action" onclick="window.location.href='story-detail.html?id=${story._id}'">
                    <i class="fas fa-book-open"></i> Read More
                </button>
                <button class="btn-action" onclick="addToBookmarks('${story._id}')">
                    <i class="fas fa-bookmark"></i> Save
                </button>
            </div>
        </div>
    `).join('');
}

// --- Story Interactions ---

async function likeStory(storyId) {
    try {
        const response = await fetch(`/api/stories/${storyId}/like`, {
            method: "POST"
        });
        
        if (response.ok) {
            await loadStories();
        } else {
            alert("Error liking story.");
        }
    } catch (error) {
        console.error("Error liking story:", error);
    }
}

async function addToBookmarks(storyId) {
    try {
        const response = await fetch(`/api/stories/${storyId}/bookmark`, {
            method: "POST"
        });
        
        if (response.ok) {
            alert("Story added to bookmarks!");
        } else {
            alert("Error saving story.");
        }
    } catch (error) {
        console.error("Error bookmarking story:", error);
    }
}

// --- Review Flow ---

async function submitReview(storyId, rating, reviewText) {
    try {
        const response = await fetch(`/api/stories/${storyId}/reviews`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                rating: parseInt(rating),
                title: "Story Review",
                content: reviewText
            })
        });

        if (response.ok) {
            alert("Review submitted!");
            // Reload story details
            window.location.reload();
        } else {
            alert("Error submitting review.");
        }
    } catch (error) {
        console.error("Error submitting review:", error);
    }
}

// --- Logout ---

function logout() {
    localStorage.removeItem("token");
    sessionStorage.removeItem("user");
    window.location.href = "login.html";
}

// --- Search and Filter ---

function handleSearchInput(searchTerm) {
    if (!searchTerm.trim()) {
        displayStories(storiesData);
        return;
    }

    const filtered = storiesData.filter(story =>
        story.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        story.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        story.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    displayStories(filtered);
}

function applySortFilter(sortValue) {
    let sorted = [...storiesData];

    switch(sortValue) {
        case "recent":
            sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case "trending":
            sorted.sort((a, b) => (b.views || 0) - (a.views || 0));
            break;
        case "rating":
            sorted.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
            break;
        case "views":
            sorted.sort((a, b) => (b.views || 0) - (a.views || 0));
            break;
        case "completed":
            sorted = sorted.filter(s => s.isCompleted === true);
            break;
    }

    displayStories(sorted);
}

// Event listeners for sort filter (if it exists)
const sortFilter = document.getElementById("sortFilter");
if (sortFilter) {
    sortFilter.addEventListener("change", (e) => applySortFilter(e.target.value));
}
