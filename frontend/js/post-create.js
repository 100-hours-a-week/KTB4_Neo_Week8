const postCreateForm = document.querySelector("#post-create-form");
const titleInput = document.querySelector("#title");
const bodyInput = document.querySelector("#post-body");
const imageInput = document.querySelector("#post-image");
const imageFileName = document.querySelector("#post-image-file-name");
const helperText = document.querySelector("#post-helper");
const submitButton = document.querySelector("#post-submit-button");

let postImageUrl = "";
let isImageUploading = false;

if (postCreateForm) {
  requireLogin();

  const defaultHelperText = "* helper text";
  const requiredMessage = "* 제목, 내용을 모두 작성해주세요.";

  function hasRequiredValues() {
    return titleInput.value.trim() && bodyInput.value.trim();
  }

  function updateButtonState() {
    submitButton.disabled = !hasRequiredValues() || isImageUploading;
  }

  function resetHelperText() {
    helperText.textContent = defaultHelperText;
  }

  titleInput.addEventListener("input", () => {
    if (titleInput.value.length > 26) {
      titleInput.value = titleInput.value.slice(0, 26);
    }

    resetHelperText();
    updateButtonState();
  });

  bodyInput.addEventListener("input", () => {
    resetHelperText();
    updateButtonState();
  });

  imageInput.addEventListener("change", async () => {
    const file = imageInput.files[0];
    imageFileName.textContent = file ? file.name : "파일을 선택해주세요.";
    postImageUrl = "";

    if (!file) {
      resetHelperText();
      updateButtonState();
      return;
    }

    helperText.textContent = "* 이미지를 업로드하는 중입니다.";
    isImageUploading = true;
    updateButtonState();

    try {
      postImageUrl = await uploadImageFile(file);
      resetHelperText();
    } catch (error) {
      imageInput.value = "";
      imageFileName.textContent = "파일을 선택해주세요.";
      helperText.textContent = `* ${error.message}`;
    } finally {
      isImageUploading = false;
      updateButtonState();
    }
  });

  postCreateForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!hasRequiredValues()) {
      helperText.textContent = requiredMessage;
      return;
    }

    submitButton.disabled = true;

    try {
      const response = await authFetch(`${API_BASE_URL}/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: titleInput.value.trim(),
          postBody: bodyInput.value.trim(),
          postImage: postImageUrl,
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.message || "게시글 생성에 실패했습니다.");
      }

      window.location.href = "./post-list.html";
    } catch (error) {
      console.error("게시글 생성 실패:", error);
      helperText.textContent = `* ${error.message}`;
      updateButtonState();
    }
  });

  resetHelperText();
  updateButtonState();
}
