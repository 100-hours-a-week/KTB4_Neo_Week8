const passwordEditForm = document.querySelector("#password-edit-form");

const curPasswordInput = document.querySelector("#current-password");
const passwordInput = document.querySelector("#password");
const passwordCheckInput = document.querySelector("#password-check");

const editButton = document.querySelector("#edit-button");
const toast = document.querySelector("#toast");

const curPasswordHelper = document.querySelector("#current-password-helper");
const passwordHelper = document.querySelector("#password-helper");
const passwordCheckHelper = document.querySelector("#password-check-helper");

const defaultHelperText = "* helper text";
let toastTimer = null;

function getCurPasswordError() {
    if (!curPasswordInput.value.trim()) return "* 비밀번호를 입력해주세요.";
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
    const password = passwordInput.value.trim();
    const passwordCheck = passwordCheckInput.value.trim();

    if (!passwordCheck) return "* 비밀번호를 한번 더 입력해주세요.";
    if (password !== passwordCheck) return "* 비밀번호와 다릅니다.";
    return "";
}

function getErrors() {
    return {
        curPassword: getCurPasswordError(),
        password: getPasswordError(),
        passwordCheck: getPasswordCheckError(),
    };
}

function setHelperText(helperText, message) {
    helperText.textContent = message || defaultHelperText;
}

function updateButtonState() {
    const errors = getErrors();
    editButton.disabled = Object.values(errors).some(Boolean);
}

function showFieldError(field) {
    const errors = getErrors();
    const helpers = {
        curPassword: curPasswordHelper,
        password: passwordHelper,
        passwordCheck: passwordCheckHelper,
    };

    setHelperText(helpers[field], errors[field]);
    updateButtonState();
}

function showAllErrors() {
    const errors = getErrors();

    setHelperText(curPasswordHelper, errors.curPassword);
    setHelperText(passwordHelper, errors.password);
    setHelperText(passwordCheckHelper, errors.passwordCheck);
    updateButtonState();

    return errors;
}

function showToast(onDone) {
  if (!toast) {
    if (typeof onDone === "function") {
      onDone();
    }
    return;
  }

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

requireLogin();
updateButtonState();

curPasswordInput.addEventListener("input", updateButtonState);

passwordInput.addEventListener("input", () => {
    updateButtonState();
    if (passwordCheckInput.value) showFieldError("passwordCheck");
});

passwordCheckInput.addEventListener("input", updateButtonState);

curPasswordInput.addEventListener("blur", () => {
    showFieldError("curPassword");
});

passwordInput.addEventListener("blur", () => {
    showFieldError("password");
});

passwordCheckInput.addEventListener("blur", () => {
    showFieldError("passwordCheck");
});

passwordEditForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const errors = showAllErrors();

    if (Object.values(errors).some(Boolean)) {
        return;
    }

    editButton.disabled = true;

    try {
        const userId = getLoginUserId();

        const response = await authFetch(`${API_BASE_URL}/users/${userId}/password`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                curPassword: curPasswordInput.value.trim(),
                password: passwordInput.value.trim(),
                passwordCheck: passwordCheckInput.value.trim(),
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || "비밀번호 수정에 실패했습니다.");
        }

        showToast(() => {
            clearLoginStorage();
            window.location.href = "./login.html";
        });
    } catch (error) {
        passwordHelper.textContent = `* ${error.message}`;
        updateButtonState();
    }
});
