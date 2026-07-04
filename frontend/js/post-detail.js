const editButton = document.querySelector("#edit-button");
const deleteButton = document.querySelector("#delete-button");
const postOwnerActions = document.querySelector("#post-owner-actions");
const reportButton = document.querySelector("#report-button");
const likeButton = document.querySelector("#like-button");
const likeCountElement = document.querySelector("#like-count");
const viewCountElement = document.querySelector("#view-count");
const commentCountElement = document.querySelector("#comment-count");

const postTitle = document.querySelector("#post-title");
const postBody = document.querySelector("#post-body");
const postImage = document.querySelector("#post-image");
const postCreatedAt = document.querySelector("#post-created-at");
const authorProfileImage = document.querySelector("#author-profile-image");
const authorNickname = document.querySelector("#author-nickname");

const commentForm = document.querySelector("#comment-form");
const commentInput = document.querySelector("#comment-input");
const commentSubmitButton = document.querySelector("#comment-submit-button");
const commentList = document.querySelector("#comment-list");

const confirmModal = document.querySelector("#confirm-modal");
const confirmModalTitle = document.querySelector("#confirm-modal-title");
const confirmModalMessage = document.querySelector("#confirm-modal-message");
const modalCancelButton = document.querySelector("#modal-cancel-button");
const modalConfirmButton = document.querySelector("#modal-confirm-button");

const reportModal = document.querySelector("#report-modal");
const reportForm = document.querySelector("#report-form");
const reportTypeGroup = document.querySelector("#report-type-group");
const reportReasonInput = document.querySelector("#report-reason");
const reportHelper = document.querySelector("#report-helper");
const reportCancelButton = document.querySelector("#report-cancel-button");
const reportSubmitButton = document.querySelector("#report-submit-button");

const params = new URLSearchParams(window.location.search);
const postId = params.get("postId") || "1";

let isLiked = false;
let likeCount = 0;
let editingTarget = null;
let replyingTarget = null;
let lastFocusedElement = null;
let modalResolve = null;
let reportTypeLoadErrorMessage = "";

requireLogin();

if (postOwnerActions) {
  postOwnerActions.style.display = "none";
}

function isCurrentUser(userId) {
  return String(userId) === String(getLoginUserId());
}

function updateCommentCount() {
  if (!commentCountElement || !commentList) return;

  const commentTotal = commentList.querySelectorAll(".comment-item, .reply-item").length;
  commentCountElement.textContent = formatCount(commentTotal);
}

function updateCommentSubmitState() {
  if (!commentSubmitButton || !commentInput) return;

  const hasCommentBody = commentInput.value.trim().length > 0;
  commentSubmitButton.disabled = !hasCommentBody;
  commentSubmitButton.textContent = editingTarget
    ? editingTarget.submitText
    : replyingTarget
      ? "대댓글 등록"
      : "댓글 등록";
}

async function fetchReportTypes() {
  const response = await authFetch(`${API_BASE_URL}/reports/types`);
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.message || "신고 유형을 불러오지 못했습니다.");
  }

  const data = result?.data ?? result;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data.reportTypes)) return data.reportTypes;
  if (Array.isArray(data.types)) return data.types;

  return [];
}

function normalizeReportType(type) {
  if (typeof type === "string") {
    return { value: type, label: type };
  }

  return {
    value: type.value || type.name || type.code || type.reportType,
    label: type.label || type.description || type.name || type.value || type.code || type.reportType,
  };
}

function setReportSubmitDisabled(disabled) {
  if (reportSubmitButton) reportSubmitButton.disabled = disabled;
}

async function loadReportTypes() {
  if (!reportTypeGroup) return;

  const legend = reportTypeGroup.querySelector("legend");
  reportTypeGroup.replaceChildren();
  if (legend) reportTypeGroup.append(legend);

  reportTypeLoadErrorMessage = "";
  setReportSubmitDisabled(true);

  try {
    const reportTypes = await fetchReportTypes();
    let renderedTypeCount = 0;

    reportTypes.map(normalizeReportType).forEach((type) => {
      if (!type.value) return;

      const label = document.createElement("label");
      const input = document.createElement("input");

      input.type = "radio";
      input.name = "reportType";
      input.value = type.value;

      label.append(input, ` ${type.label}`);
      reportTypeGroup.append(label);
      renderedTypeCount += 1;
    });

    setReportSubmitDisabled(renderedTypeCount === 0);
    if (renderedTypeCount === 0 && reportHelper) {
      reportTypeLoadErrorMessage = "신고 유형을 불러오지 못했습니다.";
      reportHelper.textContent = "* 신고 유형을 불러오지 못했습니다.";
    }
  } catch (error) {
    reportTypeLoadErrorMessage = error.message;
    setReportSubmitDisabled(true);
    if (reportHelper) reportHelper.textContent = `* ${error.message}`;
  }
}

function resetCommentForm() {
  editingTarget = null;
  replyingTarget = null;
  commentInput.value = "";
  commentInput.placeholder = "댓글을 남겨주세요.";
  updateCommentSubmitState();
}

function closeConfirmModal(result) {
  if (!confirmModal) return;

  confirmModal.hidden = true;
  document.body.classList.remove("modal-open");
  lastFocusedElement?.focus();

  if (modalResolve) {
    modalResolve(result);
    modalResolve = null;
  }
}

function openConfirmModal({ title, message }) {
  if (!confirmModal || !confirmModalTitle || !confirmModalMessage) {
    return Promise.resolve(window.confirm(title));
  }

  lastFocusedElement = document.activeElement;
  confirmModalTitle.textContent = title;
  confirmModalMessage.textContent = message;
  confirmModal.hidden = false;
  document.body.classList.add("modal-open");
  modalCancelButton?.focus();

  return new Promise((resolve) => {
    modalResolve = resolve;
  });
}

function resetReportForm() {
  reportForm?.reset();
  if (!reportHelper) return;

  const hasReportTypeOptions = Boolean(reportTypeGroup?.querySelector("input[name='reportType']"));
  reportHelper.textContent = hasReportTypeOptions
    ? "* 신고 유형을 선택해주세요."
    : `* ${reportTypeLoadErrorMessage || "신고 유형을 불러오는 중입니다."}`;
}

function openReportModal() {
  if (!reportModal) return;

  lastFocusedElement = document.activeElement;
  resetReportForm();
  reportModal.hidden = false;
  document.body.classList.add("modal-open");
  reportTypeGroup?.querySelector("input[name='reportType']")?.focus();
}

function closeReportModal() {
  if (!reportModal) return;

  reportModal.hidden = true;
  document.body.classList.remove("modal-open");
  lastFocusedElement?.focus();
}

function getDirectChildElement(parent, selector) {
  return Array.from(parent.children).find((child) => child.matches(selector));
}

function createCommentActionButtons(comment, isReply = false) {
  const actions = document.createElement("div");
  actions.className = isReply ? "reply-actions" : "comment-actions";

  if (!isReply && !comment.deleted) {
    const replyButton = document.createElement("button");
    replyButton.className = "outline-button reply-create-button";
    replyButton.type = "button";
    replyButton.textContent = "답글";
    actions.append(replyButton);
  }

  if (isCurrentUser(comment.userId) && !comment.deleted) {
    const editButtonElement = document.createElement("button");
    editButtonElement.className = isReply
      ? "outline-button reply-edit-button"
      : "outline-button comment-edit-button";
    editButtonElement.type = "button";
    editButtonElement.textContent = "수정";

    const deleteButtonElement = document.createElement("button");
    deleteButtonElement.className = isReply
      ? "outline-button reply-delete-button"
      : "outline-button comment-delete-button";
    deleteButtonElement.type = "button";
    deleteButtonElement.textContent = "삭제";

    actions.append(editButtonElement, deleteButtonElement);
  }

  return actions.childElementCount ? actions : null;
}

function createReplyItemFromApi(reply) {
  const replyItem = document.createElement("article");
  replyItem.className = "reply-item";
  replyItem.dataset.commentId = reply.commentId;

  replyItem.innerHTML = `
    <div class="reply-top">
      <img class="reply-avatar" src="${resolveImageUrl(reply.profileImage, DEFAULT_PROFILE_IMAGE)}" alt="대댓글 작성자 프로필" />
      <strong class="reply-author"></strong>
      <span class="reply-date">${formatDateTime(reply.createdAt)}</span>
    </div>
    <p class="reply-body"></p>
  `;

  replyItem.querySelector(".reply-author").textContent = reply.nickname;
  replyItem.querySelector(".reply-body").textContent = reply.deleted
    ? "삭제된 댓글입니다."
    : reply.commentBody;

  const actions = createCommentActionButtons(reply, true);
  if (actions) replyItem.querySelector(".reply-top").append(actions);

  return replyItem;
}

function createCommentItemFromApi(comment) {
  const commentItem = document.createElement("article");
  commentItem.className = "comment-item";
  commentItem.dataset.commentId = comment.commentId;

  commentItem.innerHTML = `
    <div class="comment-top">
      <img class="comment-avatar" src="${resolveImageUrl(comment.profileImage, DEFAULT_PROFILE_IMAGE)}" alt="댓글 작성자 프로필" />
      <strong class="comment-author"></strong>
      <span class="comment-date">${formatDateTime(comment.createdAt)}</span>
    </div>
    <p class="comment-body"></p>
    <div class="reply-list" aria-label="대댓글 목록"></div>
  `;

  commentItem.querySelector(".comment-author").textContent = comment.nickname;
  commentItem.querySelector(".comment-body").textContent = comment.deleted
    ? "삭제된 댓글입니다."
    : comment.commentBody;

  const actions = createCommentActionButtons(comment, false);
  if (actions) commentItem.querySelector(".comment-top").append(actions);

  const replyList = commentItem.querySelector(".reply-list");
  (comment.replies || []).forEach((reply) => {
    replyList.append(createReplyItemFromApi(reply));
  });

  return commentItem;
}

function startEditing({ item, bodyElement, label, submitText }) {
  if (!item || !bodyElement || !commentInput) return;

  replyingTarget = null;
  editingTarget = {
    item,
    bodyElement,
    label,
    submitText,
    commentId: item.dataset.commentId,
  };

  commentInput.value = bodyElement.textContent.trim();
  commentInput.placeholder = `${label}을 수정해주세요.`;
  commentInput.focus();
  updateCommentSubmitState();
}

function startReplying(commentItem) {
  if (!commentItem || !commentInput) return;

  editingTarget = null;
  replyingTarget = {
    item: commentItem,
    parentCommentId: commentItem.dataset.commentId,
    replyList: commentItem.querySelector(".reply-list"),
  };

  commentInput.value = "";
  commentInput.placeholder = "대댓글을 남겨주세요.";
  commentInput.focus();
  updateCommentSubmitState();
}

async function loadPostDetail() {
  const response = await authFetch(`${API_BASE_URL}/posts/${postId}`);
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.message || "게시글을 불러오지 못했습니다.");
  }

  const { post, author, meta } = result.data;

  postTitle.textContent = post.title;
  postBody.textContent = post.postBody;
  postCreatedAt.textContent = formatDateTime(post.createdAt);
  postImage.src = resolveImageUrl(post.postImage, DEFAULT_POST_IMAGE);
  authorNickname.textContent = author.nickname;
  authorProfileImage.src = resolveImageUrl(author.profileImage, DEFAULT_PROFILE_IMAGE);

  if (postOwnerActions) {
    postOwnerActions.style.display = isCurrentUser(author.userId) ? "flex" : "none";
  }

  likeCount = meta.likes;
  isLiked = meta.liked;
  likeCountElement.textContent = formatCount(meta.likes);
  viewCountElement.textContent = formatCount(meta.views);
  commentCountElement.textContent = formatCount(meta.comments);
  likeButton.classList.toggle("is-active", isLiked);
}

async function loadComments() {
  commentList.innerHTML = "";
  const response = await authFetch(`${API_BASE_URL}/posts/${postId}/comments`);
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.message || "댓글을 불러오지 못했습니다.");
  }

  result.data.forEach((comment) => {
    commentList.append(createCommentItemFromApi(comment));
  });

  updateCommentCount();
}

editButton?.addEventListener("click", () => {
  window.location.href = `./post-edit.html?postId=${postId}`;
});

deleteButton?.addEventListener("click", async () => {
  const confirmed = await openConfirmModal({
    title: "게시글을 삭제하시겠습니까?",
    message: "삭제한 내용은 복구할 수 없습니다.",
  });

  if (!confirmed) return;

  try {
    const response = await authFetch(`${API_BASE_URL}/posts/${postId}`, {
      method: "DELETE",
    });
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(result?.message || "게시글 삭제에 실패했습니다.");
    }

    window.location.href = "./post-list.html";
  } catch (error) {
    alert(error.message);
  }
});

reportButton?.addEventListener("click", openReportModal);
reportCancelButton?.addEventListener("click", closeReportModal);

reportForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const checkedType = reportForm.querySelector("input[name='reportType']:checked");

  if (!checkedType) {
    reportHelper.textContent = "* 신고 유형을 선택해주세요.";
    reportTypeGroup?.querySelector("input[name='reportType']")?.focus();
    return;
  }

  try {
    const response = await authFetch(`${API_BASE_URL}/posts/${postId}/reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reportType: checkedType.value,
        reason: reportReasonInput.value.trim(),
      }),
    });
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(result?.message || "신고 접수에 실패했습니다.");
    }

    closeReportModal();
    alert(result.message || "신고가 접수되었습니다.");
  } catch (error) {
    reportHelper.textContent = `* ${error.message}`;
  }
});

reportTypeGroup?.addEventListener("change", (event) => {
  if (event.target.matches("input[name='reportType']")) {
    reportHelper.textContent = "* 상세 사유를 입력하면 신고 처리에 도움이 됩니다.";
  }
});

likeButton?.addEventListener("click", async () => {
  try {
    const response = await authFetch(`${API_BASE_URL}/posts/${postId}/likes`, {
      method: isLiked ? "DELETE" : "POST",
    });
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(result?.message || "좋아요 처리에 실패했습니다.");
    }

    isLiked = result.data.liked;
    likeCount = result.data.likes;
    likeButton.classList.toggle("is-active", isLiked);
    likeCountElement.textContent = formatCount(likeCount);
  } catch (error) {
    alert(error.message);
  }
});

commentInput?.addEventListener("input", updateCommentSubmitState);

commentForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const commentBody = commentInput.value.trim();

  if (!commentBody) {
    commentInput.focus();
    return;
  }

  try {
    if (editingTarget) {
      const response = await authFetch(`${API_BASE_URL}/comments/${editingTarget.commentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ commentBody }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.message || "댓글 수정에 실패했습니다.");
      }

      editingTarget.bodyElement.textContent = commentBody;
    } else if (replyingTarget) {
      const response = await authFetch(`${API_BASE_URL}/comments/${replyingTarget.parentCommentId}/replies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ commentBody }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.message || "대댓글 등록에 실패했습니다.");
      }

      replyingTarget.replyList.append(createReplyItemFromApi(result.data));
    } else {
      const response = await authFetch(`${API_BASE_URL}/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ commentBody }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.message || "댓글 등록에 실패했습니다.");
      }

      commentList.prepend(createCommentItemFromApi({ ...result.data, replies: [] }));
    }

    resetCommentForm();
    updateCommentCount();
  } catch (error) {
    alert(error.message);
  }
});

commentList?.addEventListener("click", async (event) => {
  const replyCreateButton = event.target.closest(".reply-create-button");
  const commentEditButton = event.target.closest(".comment-edit-button");
  const commentDeleteButton = event.target.closest(".comment-delete-button");
  const replyEditButton = event.target.closest(".reply-edit-button");
  const replyDeleteButton = event.target.closest(".reply-delete-button");

  if (replyCreateButton) {
    startReplying(replyCreateButton.closest(".comment-item"));
  }

  if (commentEditButton) {
    const commentItem = commentEditButton.closest(".comment-item");
    const commentBody = commentItem ? getDirectChildElement(commentItem, ".comment-body") : null;

    startEditing({
      item: commentItem,
      bodyElement: commentBody,
      label: "댓글",
      submitText: "댓글 수정",
    });
  }

  if (replyEditButton) {
    const replyItem = replyEditButton.closest(".reply-item");
    const replyBody = replyItem?.querySelector(".reply-body");

    startEditing({
      item: replyItem,
      bodyElement: replyBody,
      label: "대댓글",
      submitText: "대댓글 수정",
    });
  }

  if (commentDeleteButton || replyDeleteButton) {
    const targetItem = commentDeleteButton
      ? commentDeleteButton.closest(".comment-item")
      : replyDeleteButton.closest(".reply-item");

    const confirmed = await openConfirmModal({
      title: commentDeleteButton ? "댓글을 삭제하시겠습니까?" : "대댓글을 삭제하시겠습니까?",
      message: "삭제한 내용은 복구할 수 없습니다.",
    });

    if (!confirmed || !targetItem) return;

    try {
      const response = await authFetch(`${API_BASE_URL}/comments/${targetItem.dataset.commentId}`, {
        method: "DELETE",
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.message || "댓글 삭제에 실패했습니다.");
      }

      if (editingTarget && (editingTarget.item === targetItem || targetItem.contains(editingTarget.item))) {
        resetCommentForm();
      }

      targetItem.remove();
      updateCommentCount();
    } catch (error) {
      alert(error.message);
    }
  }
});

modalCancelButton?.addEventListener("click", () => closeConfirmModal(false));
modalConfirmButton?.addEventListener("click", () => closeConfirmModal(true));

document.addEventListener("keydown", (event) => {
  if (confirmModal && !confirmModal.hidden && event.key === "Escape") {
    closeConfirmModal(false);
  }

  if (reportModal && !reportModal.hidden && event.key === "Escape") {
    closeReportModal();
  }
});

reportModal?.addEventListener("click", (event) => {
  if (event.target === reportModal) {
    closeReportModal();
  }
});

updateCommentSubmitState();
loadReportTypes();
loadPostDetail().catch((error) => alert(error.message));
loadComments().catch((error) => console.warn(error.message));
