const writeButton = document.querySelector(".write-button");
const postsContainer = document.querySelector("#posts");

function truncateTitle(title) {
  if (!title) return "";
  if (title.length <= 26) return title;
  return title.slice(0, 26);
}

function renderPosts(posts) {
  if (!postsContainer) return;

  postsContainer.innerHTML = "";

  if (!posts.length) {
    postsContainer.innerHTML = `<p class="helper-text">* 등록된 게시글이 없습니다.</p>`;
    return;
  }

  posts.forEach((post) => {
    const article = document.createElement("article");
    article.className = "post-card";

    article.innerHTML = `
      <a class="post-card-link" href="./post-detail.html?postId=${post.postId}">
        <div class="post-card-content">
          <h2 class="post-card-title"></h2>
          <div class="post-card-meta-row">
            <span>좋아요 ${formatCount(post.likes)}</span>
            <span>댓글 ${formatCount(post.comments)}</span>
            <span>조회수 ${formatCount(post.views)}</span>
            <span class="post-card-date">${formatDateTime(post.createdAt)}</span>
          </div>
        </div>
        <div class="post-card-author">
          <img class="author-profile-image" src="${resolveImageUrl(post.profileImage, DEFAULT_PROFILE_IMAGE)}" alt="작성자 프로필" />
          <span></span>
        </div>
      </a>
    `;

    const titleElement = article.querySelector(".post-card-title");
    const nicknameElement = article.querySelector(".post-card-author span");

    titleElement.textContent = truncateTitle(post.title);
    titleElement.title = post.title || "";
    nicknameElement.textContent = post.nickname || "알 수 없음";

    postsContainer.append(article);
  });
}

async function loadPosts() {
  if (!postsContainer) return;

  try {
    const response = await authFetch(`${API_BASE_URL}/posts`);
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(result?.message || "게시글을 불러오는 중 오류가 발생했습니다.");
    }

    renderPosts(result.data || []);
  } catch (error) {
    console.error("게시글 목록 불러오기 실패:", error);
    postsContainer.innerHTML = `<p class="helper-text">* ${error.message}</p>`;
  }
}

writeButton?.addEventListener("click", (event) => {
  event.preventDefault();
  requireLogin();
  window.location.href = "./post-create.html";
});

loadPosts();
