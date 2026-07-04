package com.ktb.community.domain.user.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor
@Table(name = "users")
public class User {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "userId")
    private Long userId;

    @Column(name = "email", nullable = false, length = 255, unique = true)
    private String email;

    @Column(name = "password", nullable = false, length = 255)
    private String password;

    @Column(name = "nickname", nullable = false, length = 255, unique = true)
    private String nickname;

    @Column(name = "profileImage", length = 500)
    private String profileImage;

    @Column(name = "deleted", nullable = false)
    private boolean deleted = false;

    @Column(name = "deletedAt")
    private LocalDateTime deletedAt;

    @Column(name = "createdAt", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updatedAt", nullable = false)
    private LocalDateTime updatedAt;

    @Enumerated(EnumType.STRING)
    private UserRole role;

    public User(String email, String password, String nickname, String profileImage) {
        this.email = email;
        this.password = password;
        this.nickname = nickname;
        this.profileImage = profileImage;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        this.role = UserRole.ROLE_USER;
    }

    /* 나중에 관리자 권환 관련 서비스 로직이 생긴다면 일반 유저에게 관리자 권한을 부여하기 위해 사용될 수 있음.
    public void userToAdmin() {
        this.role = UserRole.ROLE_ADMIN;
    }
     */


    public void update(String nickname, String profileImage) {
        this.nickname = nickname;
        this.profileImage = profileImage;
        this.updatedAt = LocalDateTime.now();
    }

    public void updatePassword(String newPassword) {
        this.password = newPassword;
        this.updatedAt = LocalDateTime.now();
    }

    public void delete() {

        this.email = "deleted-user" + this.userId + "@email.com";
        this.password = "deleted-user-" + this.userId;
        this.nickname = "알 수 없음";
        this.profileImage = null;
        this.deleted = true;
        this.deletedAt = LocalDateTime.now();
    }

}
