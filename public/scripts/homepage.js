function logoutUser() {
  fetch("/api/users/logout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin", // Important for including session cookies
  })
    .then((response) => {
      if (response.ok) {
        window.location.href = "/";
      } else {
        alert("Logout failed.");
      }
    })
    .catch((error) => {
      console.error("Error logging out:", error);
    });
}

document.addEventListener("DOMContentLoaded", function () {
  const links = document.querySelectorAll(".navigation a");
  const currentLocation = window.location.pathname;

  links.forEach((link) => {
    if (link.getAttribute("href") === currentLocation) {
      link.closest("li").classList.add("active");
    } else {
      link.closest("li").classList.remove("active");
    }
  });
});
