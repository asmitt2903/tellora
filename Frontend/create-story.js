document.addEventListener("DOMContentLoaded", async () => {
    // Fetch user profile for navbar
    try {
        const res = await fetch("/api/user/me");
        if (res.ok) {
            const user = await res.json();
            const avatarContainer = document.getElementById("profileTrigger");
            if (user.profilePic) {
                avatarContainer.innerHTML = `<img src="${user.profilePic}" style="width:36px;height:36px;border-radius:50%">`;
            } else {
                avatarContainer.innerHTML = `<div style="width:36px;height:36px;border-radius:50%;background:var(--primary-color);color:white;display:flex;align-items:center;justify-content:center;">${user.name.charAt(0)}</div>`;
            }
        } else {
            window.location.href = "login.html";
        }
    } catch (e) {
        window.location.href = "login.html";
    }
});

// --- AI Submission ---
window.generateAISubmission = async function() {
    const prompt = document.getElementById("aiPromptInput").value;
    const genre = document.getElementById("aiGenreSelect").value;
    
    if (!prompt) return alert("Please describe your story first.");

    const generateBtn = document.getElementById("generateBtn");
    const preview = document.getElementById("aiResultPreview");
    
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<i class="fas fa-robot fa-spin"></i> Generating with AI...';
    preview.style.display = 'none';

    try {
        const response = await fetch("/api/stories/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, genre })
        });

        if (response.ok) {
            const data = await response.json();
            // Show preview briefly before redirect
            preview.style.display = 'block';
            document.getElementById("resultTitle").innerText = data.story.title;
            document.getElementById("resultContent").innerText = data.chapter.content.substring(0, 300) + "...";
            
            setTimeout(() => {
                window.location.href = `read-story.html?id=${data.story._id}`;
            }, 3000);
        } else {
            const err = await response.json();
            alert(err.message || "AI generation failed.");
        }
    } catch (error) {
        console.error(error);
        alert("An error occurred while generating.");
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-sparkles"></i> Generate & Publish Story';
    }
};
