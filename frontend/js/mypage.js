
const mypageForm = document.querySelector("#mypage-form");
const emailElement = document.querySelector("#email");
const nicknameInput = document.querySelector("#nickname");
const profileImageInput = document.querySelector("#profile-image");
const profilePreview = document.querySelector("#profile-preview");
const helperText = document.querySelector("#mypage-helper");
const deleteUserButton = document.querySelector("#delete-user-button");
const bottomUpdateButton = document.querySelector("#bottom-update-button");
const toast = document.querySelector("#toast");
const withdrawModal = document.querySelector("#withdraw-modal");
const withdrawCancelButton = document.querySelector("#withdraw-cancel-button");
const withdrawConfirmButton = document.querySelector("#withdraw-confirm-button");

const defaultHelperText = "* helper text";
let toastTimer = null;
let currentProfileImage = "";
let isProfileUploading = false;

requireLogin();

function getNicknameError() {
  const nickname = nicknameInput.value.trim();

  if (!nickname) return "* 닉네임을 입력해주세요.";
  if (nickname.length > 10) return "* 닉네임은 최대 10자 까지 작성 가능합니다.";
  return "";
}

function updateHelper(message = "") {
  helperText.textContent = message || defaultHelperText;
}

function showToast(onDone) {
  if (!toast) return;

  clearTimeout(toastTimer);
  toast.hidden = false;
  toast.classList.add("is-visible");

  toastTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
    toast.hidden = true;
    if (typeof onDone === "function") {
      onDone();
    }
  }, 2000);
}

function openWithdrawModal() {
  if (!withdrawModal) return;

  withdrawModal.hidden = false;
  document.body.classList.add("modal-open");
  withdrawCancelButton?.focus();
}

function closeWithdrawModal() {
  if (!withdrawModal) return;

  withdrawModal.hidden = true;
  document.body.classList.remove("modal-open");
  deleteUserButton?.focus();
}

async function loadMyPage() {
  const userId = getLoginUserId();

  try {
    const response = await authFetch(`${API_BASE_URL}/users/${userId}`);
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(result?.message || "회원 정보를 불러오지 못했습니다.");
    }

    const user = result.data;

    emailElement.textContent = user.email;
    nicknameInput.value = user.nickname;
    nicknameInput.defaultValue = user.nickname;
    currentProfileImage = user.profileImage || "";
    profilePreview.src = resolveImageUrl(currentProfileImage, DEFAULT_PROFILE_IMAGE);
  } catch (error) {
    updateHelper(`* ${error.message}`);
  }
}

async function handleUpdate() {
  const nicknameError = getNicknameError();

  if (nicknameError || isProfileUploading) {
    updateHelper(isProfileUploading ? "* 프로필 사진 업로드가 끝난 뒤 다시 시도해주세요." : nicknameError);
    nicknameInput.focus();
    return;
  }

  try {
    const response = await authFetch(`${API_BASE_URL}/users/${getLoginUserId()}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nickname: nicknameInput.value.trim(),
        profileImage: currentProfileImage,
      }),
    });
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(result?.message || "회원 정보 수정에 실패했습니다.");
    }

    nicknameInput.defaultValue = nicknameInput.value.trim();
    updateHelper();
    showToast(() => {
      window.location.href = "./post-list.html";
    });
  } catch (error) {
    updateHelper(`* ${error.message}`);
  }
}

nicknameInput.addEventListener("input", () => {
  updateHelper();
});

nicknameInput.addEventListener("blur", () => {
  updateHelper(getNicknameError());
});

profileImageInput.addEventListener("change", async () => {
  const file = profileImageInput.files[0];

  if (!file) return;

  profilePreview.src = URL.createObjectURL(file);
  updateHelper("* 프로필 사진을 업로드하는 중입니다.");
  isProfileUploading = true;

  try {
    currentProfileImage = await uploadImageFile(file);
    profilePreview.src = resolveImageUrl(currentProfileImage, DEFAULT_PROFILE_IMAGE);
    updateHelper();
  } catch (error) {
    profilePreview.src = resolveImageUrl(currentProfileImage, DEFAULT_PROFILE_IMAGE);
    updateHelper(`* ${error.message}`);
  } finally {
    isProfileUploading = false;
  }
});

if (mypageForm) {
  mypageForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handleUpdate();
  });
}

if (bottomUpdateButton) {
  bottomUpdateButton.addEventListener("click", handleUpdate);
}

if (deleteUserButton) {
  deleteUserButton.addEventListener("click", openWithdrawModal);
}

if (withdrawCancelButton) {
  withdrawCancelButton.addEventListener("click", closeWithdrawModal);
}

if (withdrawConfirmButton) {
  withdrawConfirmButton.addEventListener("click", async () => {
    try {
      await authFetch(`${API_BASE_URL}/users/${getLoginUserId()}`, {
        method: "DELETE",
      });
    } finally {
      clearLoginStorage();
      window.location.href = "./login.html";
    }
  });
}

if (withdrawModal) {
  withdrawModal.addEventListener("click", (event) => {
    if (event.target === withdrawModal) closeWithdrawModal();
  });

  document.addEventListener("keydown", (event) => {
    if (!withdrawModal.hidden && event.key === "Escape") {
      closeWithdrawModal();
    }
  });
}

loadMyPage();
