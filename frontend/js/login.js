const loginForm = document.querySelector("#login-form");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const loginHelper = document.querySelector("#login-helper");
const loginButton = document.querySelector("#login-button");

let isLoginFailed = false;

if (loginForm) {
  function getErrorMessage() {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email) return "* 이메일을 입력해주세요.";
    if (!isValidEmail(email)) return "* 올바른 이메일 주소 형식을 입력해주세요. (예: example@adapterz.kr)";
    if (!password) return "* 비밀번호를 입력해주세요.";
    if (!isValidPassword(password)) {
      return "* 비밀번호는 8자 이상, 20자 이하이며, 대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다.";
    }
    if (isLoginFailed) return "* 아이디 또는 비밀번호를 확인해주세요.";

    return "";
  }

  function updateButtonState() {
    loginButton.disabled = Boolean(getErrorMessage());
  }

  function showHelperText() {
    loginHelper.textContent = getErrorMessage() || "* helper text";
    updateButtonState();
  }

  emailInput.addEventListener("input", () => {
    isLoginFailed = false;
    updateButtonState();
  });
  passwordInput.addEventListener("input", () => {
    isLoginFailed = false;
    updateButtonState();
  });
  emailInput.addEventListener("blur", showHelperText);
  passwordInput.addEventListener("blur", showHelperText);

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const errorMessage = getErrorMessage();

    if (errorMessage) {
      loginHelper.textContent = errorMessage;
      return;
    }

    loginButton.disabled = true;
    loginHelper.textContent = "* helper text";

    try {
      const response = await fetch(`${API_BASE_URL}/users/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailInput.value.trim(),
          password: passwordInput.value.trim(),
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        isLoginFailed = true;
        throw new Error(result?.message || "아이디 또는 비밀번호를 확인해주세요.");
      }

      localStorage.setItem("accessToken", result.data?.accessToken || result.accessToken);
      localStorage.setItem("userId", result.data?.userId || result.userId);

      window.location.href = "./post-list.html";
    } catch (error) {
      loginHelper.textContent = `* ${error.message}`;
      updateButtonState();
    }
  });

  updateButtonState();
}
