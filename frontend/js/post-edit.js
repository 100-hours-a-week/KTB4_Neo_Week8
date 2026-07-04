const postEditForm = document.querySelector("#post-edit-form");
const titleInput = document.querySelector("#title");
const bodyInput = document.querySelector("#post-body");
const imageInput = document.querySelector("#post-image");
const imageFileName = document.querySelector("#post-image-file-name");
const helperText = document.querySelector("#post-helper");
const submitButton = document.querySelector("#post-submit-button");

const params = new URLSearchParams(window.location.search);
const postId = params.get("postId");

let currentPostImage = "";
let isImageUploading = false;

if (postEditForm) {
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

  async function loadPostForEdit() {
    try {
      const response = await authFetch(`${API_BASE_URL}/posts/${postId}`);
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.message || "게시글 정보를 불러오지 못했습니다.");
      }

      const { post } = result.data;
      titleInput.value = post.title || "";
      bodyInput.value = post.postBody || "";
      currentPostImage = post.postImage || "";
      imageFileName.textContent = currentPostImage ? "기존 파일 유지" : "파일을 선택해주세요.";

      resetHelperText();
      updateButtonState();
    } catch (error) {
      console.error("게시글 불러오기 실패:", error);
      helperText.textContent = `* ${error.message}`;
      window.location.href = "./post-list.html";
    }
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

    if (!file) {
      imageFileName.textContent = currentPostImage ? "기존 파일 유지" : "파일을 선택해주세요.";
      resetHelperText();
      updateButtonState();
      return;
    }

    imageFileName.textContent = file.name;
    helperText.textContent = "* 이미지를 업로드하는 중입니다.";
    isImageUploading = true;
    updateButtonState();

    try {
      currentPostImage = await uploadImageFile(file);
      resetHelperText();
    } catch (error) {
      imageInput.value = "";
      imageFileName.textContent = currentPostImage ? "기존 파일 유지" : "파일을 선택해주세요.";
      console.error("이미지 업로드 실패:", error);
      helperText.textContent = `* ${error.message}`;
    } finally {
      isImageUploading = false;
      updateButtonState();
    }
  });

  postEditForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!hasRequiredValues()) {
      helperText.textContent = requiredMessage;
      return;
    }

    submitButton.disabled = true;

    try {
      const response = await authFetch(`${API_BASE_URL}/posts/${postId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: titleInput.value.trim(),
          postBody: bodyInput.value.trim(),
          postImage: currentPostImage,
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.message || "게시글 수정에 실패했습니다.");
      }

      window.location.href = `./post-detail.html?postId=${postId}`;
    } catch (error) {
      console.error("게시글 수정 실패:", error);
      helperText.textContent = `* ${error.message}`;
      updateButtonState();
    }
  });

  resetHelperText();
  updateButtonState();
  loadPostForEdit();
}
