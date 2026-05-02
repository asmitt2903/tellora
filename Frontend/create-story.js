document.addEventListener("DOMContentLoaded", async () => {
    // Fetch user profile for navbar
    try {
        const res = await fetch("/api/user/me");
        if (res.ok) {
            const user = await res.json();
            if (user.profilePic) {
                document.getElementById("navAvatar").src = user.profilePic;
            }
        } else {
            window.location.href = "login.html";
        }
    } catch (e) {
        window.location.href = "login.html";
    }
});

async function generateStory() {
    const prompt = document.getElementById("promptInput").value.trim();
    const genre = document.getElementById("genreSelect").value;
    const btn = document.getElementById("generateBtn");

    if (!prompt) return alert("Please enter a prompt!");

    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Generating...`;

    try {
        const response = await fetch("/api/stories/generate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ prompt, genre })
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById("resultContainer").style.display = "block";
            document.getElementById("resultTitle").innerText = data.story.title;
            document.getElementById("resultGenre").innerText = `Genre: ${data.story.genre}`;
            document.getElementById("resultContent").innerText = data.chapter.content;
            
            // clear form
            document.getElementById("promptInput").value = "";
        } else {
            alert("Failed to generate story.");
        }
    } catch (error) {
        console.error(error);
        alert("An error occurred while generating.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-bolt"></i> Generate Story`;
    }
}
