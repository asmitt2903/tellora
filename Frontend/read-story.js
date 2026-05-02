document.addEventListener("DOMContentLoaded", async () => {
    // Fetch user profile for navbar
    try {
        const res = await fetch("/api/user/me");
        if (res.ok) {
            const user = await res.json();
            if (user.profilePic) {
                document.getElementById("navAvatar").src = user.profilePic;
            }
        }
    } catch (e) {}

    const urlParams = new URLSearchParams(window.location.search);
    const storyId = urlParams.get('id');

    if (!storyId) {
        document.getElementById("storyContainer").innerHTML = "<h2>Story not found</h2>";
        return;
    }

    loadStory(storyId);
});

async function loadStory(id) {
    const container = document.getElementById("storyContainer");
    try {
        const [storyRes, chaptersRes] = await Promise.all([
            fetch(`/api/stories/${id}`),
            fetch(`/api/stories/${id}/chapters`)
        ]);

        if (storyRes.ok && chaptersRes.ok) {
            const story = await storyRes.json();
            const chapters = await chaptersRes.json();

            let html = `
                <h1 class="story-title">${story.title}</h1>
                <div class="story-meta">
                    <div class="story-author">
                        <img src="${story.author.profilePic || '/uploads/default-avatar.png'}">
                        ${story.author.name}
                    </div>
                    <span><i class="fas fa-tag"></i> ${story.genre}</span>
                    <span><i class="fas fa-eye"></i> ${story.views} views</span>
                </div>
                <div class="story-description" style="font-style: italic; color: var(--text-light); margin-bottom: 30px;">
                    ${story.description}
                </div>
            `;

            chapters.forEach(chapter => {
                html += `
                    <div class="chapter">
                        <h2 class="chapter-title">${chapter.title}</h2>
                        <div class="chapter-content">${chapter.content}</div>
                    </div>
                `;
            });

            container.innerHTML = html;
        } else {
            container.innerHTML = "<h2>Failed to load story details.</h2>";
        }
    } catch (error) {
        console.error(error);
        container.innerHTML = "<h2>Error loading story.</h2>";
    }
}
