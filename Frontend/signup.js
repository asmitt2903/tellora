const form = document.getElementById("signupForm");

const BASE_URL = window.location.hostname.includes("localhost")
  ? "http://localhost:3000"
  : "https://mindforum-a-question-platform.onrender.com"; 

form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (password !== confirmPassword) {
    alert("Passwords do not match");
    return;
  }
  try {
    const response = await fetch(`${BASE_URL}/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
    });

    const result = await response.text();

    if (response.ok) {
      alert("Signup successful ✅");

      // 🔥 redirect to home
      window.location.href = "/home";

    } else {
      alert("Error: " + result);
    }

  } catch (error) {
    console.error(error);
    alert("Server error ❌");
  }
});
