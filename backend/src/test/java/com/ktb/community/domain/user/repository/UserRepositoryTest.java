package com.ktb.community.domain.user.repository;

import com.ktb.community.domain.user.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
public class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("회원 가입 성공 시, 해당 유저 정보가 DB에 저장된다.")
    void signupUser_restoreUserInfo() {
        // given
        User user = new User(
            "test@example.com",
            "encoded-password",
            "neo",
            "profile-image"
        );

        // when
        User savedUser = userRepository.save(user);

        // then
        assertThat(savedUser.getUserId()).isNotNull();

        Optional<User> foundUser =  userRepository.findById(savedUser.getUserId());

        assertThat(foundUser.isPresent()).isTrue();
        assertThat(foundUser.get().getEmail()).isEqualTo("test@example.com");
        assertThat(foundUser.get().getPassword()).isEqualTo("encoded-password");
        assertThat(foundUser.get().getNickname()).isEqualTo("neo");
        assertThat(foundUser.get().getProfileImage()).isEqualTo("profile-image");
    }

    @Test
    @DisplayName("저장된 이메일로 유저 정보 조회할 수 있다.")
    void findByEmail_returnsMatchingUser() {
        // given
        User user1 = new User(
                "neo@example.com",
                "neo-encoded-password",
                "neo",
                "neo-profile-image"
        );

        User user2 = new User (
                "ryan@example.com",
                "ryan-encoded-password",
                "ryan",
                "ryan-profile-iamge"
        );

        userRepository.save(user1);
        userRepository.save(user2);

        // when
        Optional<User> foundUser = userRepository.findByEmail("ryan@example.com");

        // then
        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getEmail()).isEqualTo("ryan@example.com");
        assertThat(foundUser.get().getNickname()).isEqualTo("ryan");
        assertThat(foundUser.get().getUserId()).isEqualTo(user2.getUserId());
    }

    @Test
    @DisplayName("이메일은 유니크해야 한다")
    void save_duplicateEmail_throwsDataIntegrityViolationException() {
        // given
        User user1 = new User(
                "test@example.com",
                "encoded-password-1",
                "neo1",
                "/profile1.png"
        );

        User user2 = new User(
                "test@example.com",
                "encoded-password-2",
                "neo2",
                "/profile2.png"
        );

        userRepository.save(user1);

        // when & then
        assertThatThrownBy(() -> userRepository.save(user2))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("저장된 이메일이면 true를 반환한다")
    void existsByEmail_existingEmail_returnsTrue() {
        // given
        userRepository.save(new User(
                "test@example.com",
                "encoded-password",
                "neo",
                "/profile.png"
        ));

        // when & then
        assertThat(userRepository.existsByEmail("test@example.com")).isTrue();
        assertThat(userRepository.existsByEmail("none@example.com")).isFalse();
    }

    @Test
    @DisplayName("저장된 닉네임이면 true를 반환한다")
    void existsByNickname_existingNickname_returnsTrue() {
        // given
        userRepository.save(new User(
                "test@example.com",
                "encoded-password",
                "neo",
                "/profile.png"
        ));

        // when & then
        assertThat(userRepository.existsByNickname("neo")).isTrue();
        assertThat(userRepository.existsByNickname("unknown")).isFalse();
    }

}
