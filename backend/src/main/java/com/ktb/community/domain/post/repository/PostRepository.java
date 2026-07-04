package com.ktb.community.domain.post.repository;

import com.ktb.community.domain.post.entity.Post;
import com.ktb.community.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {

    List<Post> findByDeletedFalse();

    long countByUserAndCreatedAtAfter(User user, LocalDateTime time);
}
