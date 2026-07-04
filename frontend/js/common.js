function isValidEmail(email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

function isValidPassword(password) {
  const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,20}$/;
  return passwordPattern.test(password);
}

function formatCount(count) {
  if (!count) return "0";
  if (count >= 1000) return `${Math.floor(count / 1000)}k`;
  return String(count);
}

function formatDateTime(dateTime) {
  if (!dateTime) return "";
  return dateTime.replace("T", " ").slice(0, 19);
}

function clearLoginStorage() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("userId");
  localStorage.removeItem("loginUserId");
}

document.addEventListener("DOMContentLoaded", () => {
  const profileMenu = document.querySelector(".profile-menu");
  const profileLink = document.querySelector(".profile-link");
  const headerProfileImage = document.querySelector("#header-profile-image");
  const logoutButton = document.querySelector("#logout-button");
  const backButton = document.querySelector(".back-button");

  async function loadHeaderProfileImage() {
    if (!headerProfileImage || !getAccessToken() || !getLoginUserId()) return;

    try {
      const response = await authFetch(`${API_BASE_URL}/users/${getLoginUserId()}`);
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.message || "프로필 이미지를 불러오지 못했습니다.");
      }

      headerProfileImage.src = resolveImageUrl(result.data.profileImage, DEFAULT_PROFILE_IMAGE);
    } catch (error) {
      console.warn("header profile image request failed:", error.message);
    }
  }

  if (profileMenu && profileLink) {
    profileLink.addEventListener("click", (event) => {
      event.preventDefault();

      const isOpen = profileMenu.classList.toggle("is-open");
      profileLink.setAttribute("aria-expanded", String(isOpen));
    });

    document.addEventListener("click", (event) => {
      if (profileMenu.contains(event.target)) return;

      profileMenu.classList.remove("is-open");
      profileLink.setAttribute("aria-expanded", "false");
    });
  }

  if (backButton) {
    backButton.addEventListener("click", () => {
      const fallbackHref = backButton.dataset.backFallback || "./post-list.html";

      if (history.length > 1) {
        history.back();
        return;
      }

      window.location.href = fallbackHref;
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", async (event) => {
      event.preventDefault();

      const confirmed = confirm("로그아웃 하시겠습니까?");
      if (!confirmed) return;

      try {
        await authFetch(`${API_BASE_URL}/users/logout`, {
          method: "POST",
        });
      } catch (error) {
        console.warn("logout request failed:", error.message);
      } finally {
        clearLoginStorage();
        window.location.href = "./login.html";
      }
    });
  }

  loadHeaderProfileImage();
});
