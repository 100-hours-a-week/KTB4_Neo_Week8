const signupForm = document.querySelector("#signup-form");
const backButton = document.querySelector("#back-button");
const profileImageInput = document.querySelector("#profile-image");
const profilePreview = document.querySelector("#profile-preview");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const passwordCheckInput = document.querySelector("#password-check");
const nicknameInput = document.querySelector("#nickname");
const signupButton = document.querySelector("#signup-button");

const helpers = {
  profile: document.querySelector("#profile-helper"),
  email: document.querySelector("#email-helper"),
  password: document.querySelector("#password-helper"),
  passwordCheck: document.querySelector("#password-check-helper"),
  nickname: document.querySelector("#nickname-helper"),
};

let profileImageUrl = "";
let isProfileUploading = false;

if (signupForm) {
  const defaultHelperText = "* helper text";

  function setHelper(helper, message) {
    helper.textContent = message || defaultHelperText;
  }

  function getProfileError() {
    if (!profileImageInput.files.length) return "* 프로필 사진을 추가해주세요.";
    return "";
  }

  function getEmailError() {
    const email = emailInput.value.trim();

    if (!email) return "* 이메일을 입력해주세요.";
    if (!isValidEmail(email)) return "* 올바른 이메일 주소 형식을 입력해주세요. (예: example@example.com)";
    return "";
  }

  function getPasswordError() {
    const password = passwordInput.value.trim();

    if (!password) return "* 비밀번호를 입력해주세요.";
    if (!isValidPassword(password)) {
      return "* 비밀번호는 8자 이상, 20자 이하이며, 대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다.";
    }

    return "";
  }

  function getPasswordCheckError() {
    const passwordCheck = passwordCheckInput.value.trim();

    if (!passwordCheck) return "* 비밀번호를 한번 더 입력해주세요.";
    if (passwordInput.value.trim() !== passwordCheck) return "* 비밀번호와 다릅니다.";
    return "";
  }

  function getNicknameError() {
    const nickname = nicknameInput.value.trim();

    if (!nickname) return "* 닉네임을 입력해주세요.";
    if (/\s/.test(nickname)) return "* 띄어쓰기를 없애주세요.";
    if (nickname.length > 10) return "* 닉네임은 최대 10자까지 작성 가능합니다.";
    return "";
  }

  function getErrors() {
    return {
      profile: getProfileError(),
      email: getEmailError(),
      password: getPasswordError(),
      passwordCheck: getPasswordCheckError(),
      nickname: getNicknameError(),
    };
  }

  function updateButtonState() {
    const errors = getErrors();
    signupButton.disabled = Object.values(errors).some(Boolean) || isProfileUploading;
  }

  function showFieldHelperText(field) {
    const errors = getErrors();
    setHelper(helpers[field], errors[field]);
    updateButtonState();
  }

  function showAllHelperText() {
    const errors = getErrors();

    for (const field in errors) {
      setHelper(helpers[field], errors[field]);
    }

    updateButtonState();
    return errors;
  }

  profileImageInput.addEventListener("change", async () => {
    const file = profileImageInput.files[0];
    profileImageUrl = "";

    if (!file) {
      profilePreview.style.backgroundImage = "";
      profilePreview.classList.remove("has-image");
      profilePreview.textContent = "+";
      showFieldHelperText("profile");
      return;
    }

    profilePreview.style.backgroundImage = `url("${URL.createObjectURL(file)}")`;
    profilePreview.classList.add("has-image");
    profilePreview.textContent = "";
    helpers.profile.textContent = "* 프로필 사진을 업로드하는 중입니다.";
    isProfileUploading = true;
    updateButtonState();

    try {
      profileImageUrl = await uploadImageFile(file);
      helpers.profile.textContent = defaultHelperText;
    } catch (error) {
      profilePreview.style.backgroundImage = "";
      profilePreview.classList.remove("has-image");
      profilePreview.textContent = "+";
      helpers.profile.textContent = `* ${error.message}`;
    } finally {
      isProfileUploading = false;
      updateButtonState();
    }
  });

  emailInput.addEventListener("input", updateButtonState());
  passwordInput.addEventListener("input", updateButtonState());
  passwordCheckInput.addEventListener("input", updateButtonState());
  nicknameInput.addEventListener("input", updateButtonState());

  emailInput.addEventListener("blur", () => showFieldHelperText("email"));
  passwordInput.addEventListener("blur", () => showFieldHelperText("password"));
  passwordCheckInput.addEventListener("blur", () => showFieldHelperText("passwordCheck"));
  nicknameInput.addEventListener("blur", () => showFieldHelperText("nickname"));

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const errors = showAllHelperText();

    if (Object.values(errors).some(Boolean)) {
      return;
    }

    signupButton.disabled = true;

    try {
      const response = await fetch(`${API_BASE_URL}/users/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailInput.value.trim(),
          password: passwordInput.value.trim(),
          passwordCheck: passwordCheckInput.value.trim(),
          nickname: nicknameInput.value.trim(),
          profileImage: profileImageUrl,
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.message || "회원가입에 실패했습니다.");
      }

      window.location.href = "./login.html";
    } catch (error) {
      helpers.email.textContent = `* ${error.message}`;
      updateButtonState();
    }
  });

  backButton?.addEventListener("click", () => {
    window.location.href = "./login.html";
  });

  updateButtonState();
}
