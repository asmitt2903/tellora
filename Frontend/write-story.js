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

// Manual Story Publication
const storyForm = document.getElementById("storyForm");
if (storyForm) {
    storyForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const publishBtn = document.getElementById("publishBtn");
        publishBtn.disabled = true;
        publishBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Publishing...';

        try {
            const formData = new FormData();
            formData.append("title", document.getElementById("titleInput").value);
            formData.append("genre", document.getElementById("genreSelect").value);
            formData.append("description", document.getElementById("descriptionInput").value);
            formData.append("content", document.getElementById("contentInput").value);
            
            const coverFile = document.getElementById("coverImageInput").files[0];
            if (coverFile) {
                formData.append("coverImage", coverFile);
            }

            const response = await fetch("/api/stories", {
                method: "POST",
                body: formData
            });

            if (response.ok) {
                const story = await response.json();
                window.location.href = `read-story.html?id=${story._id}`;
            } else {
                const err = await response.json();
                alert(err.message || "Failed to publish story.");
            }
        } catch (error) {
            console.error(error);
            alert("An error occurred while publishing.");
        } finally {
            publishBtn.disabled = false;
            publishBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publish Story';
        }
    });
}
