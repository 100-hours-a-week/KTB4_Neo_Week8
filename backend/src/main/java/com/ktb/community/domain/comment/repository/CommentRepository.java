package com.ktb.community.domain.comment.repository;

import com.ktb.community.domain.comment.entity.Comment;
import com.ktb.community.domain.post.entity.Post;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    List<Comment> findByPostAndParentCommentIsNull(Post post);

    List<Comment> findByParentCommentAndDeletedFalse(Comment parentComment);

}
