package com.ktb.community.domain.draft.entity;

import com.ktb.community.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor
@Table(name = "drafts")
public class Draft {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "draftId")
    private Long draftId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "userId", nullable = false)
    private User user;

    @Column(name = "title", length = 255)
    private String title;

    @Column(name = "postBody", columnDefinition = "TEXT")
    private String postBody;

    @Column(name = "postImage", length = 500)
    private String postImage;

    @Column(name = "published", nullable = false)
    private boolean published = false;

    @Column(name = "updatedAt", nullable = false)
    private LocalDateTime updatedAt;

    public Draft(User user, String title, String postBody, String postImage) {
        this.user = user;
        this.title = title;
        this.postBody = postBody;
        this.postImage = postImage;
        this.updatedAt = LocalDateTime.now();
    }

    public void autosave(String title, String postBody, String postImage) {
        this.title = title;
        this.postBody = postBody;
        this.postImage = postImage;
        this.updatedAt = LocalDateTime.now();
    }

    public void publish() {
        this.published = true;
        this.updatedAt = LocalDateTime.now();
    }

}
