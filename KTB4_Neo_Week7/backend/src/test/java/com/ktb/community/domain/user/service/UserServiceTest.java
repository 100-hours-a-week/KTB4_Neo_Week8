package com.ktb.community.domain.user.service;

import com.ktb.community.domain.user.dto.LoginRequestDto;
import com.ktb.community.domain.user.dto.LoginResponseDto;
import com.ktb.community.domain.user.dto.SignUpRequestDto;
import com.ktb.community.domain.user.dto.SignUpResponseDto;
import com.ktb.community.domain.user.entity.RefreshToken;
import com.ktb.community.domain.user.entity.User;
import com.ktb.community.domain.user.repository.RefreshTokenRepository;
import com.ktb.community.domain.user.repository.UserRepository;
import com.ktb.community.global.exception.ApiException;
import com.ktb.community.global.exception.ErrorCode;
import com.ktb.community.security.jwt.JwtTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @InjectMocks
    private UserService userService;

    @Nested
    @DisplayName("회원가입")
    class Signup {

        @Test
        @DisplayName("회원가입 성공 시 비밀번호를 암호화하고 유저를 저장한다")
        void signup_success() {
            // given
            SignUpRequestDto request = signUpRequest(
                    "test@example.com",
                    "Password123!",
                    "Password123!",
                    "neo",
                    "/profile.png"
            );

            given(userRepository.existsByEmail("test@example.com")).willReturn(false);
            given(userRepository.existsByNickname("neo")).willReturn(false);
            given(passwordEncoder.encode("Password123!")).willReturn("encoded-password");
            given(userRepository.save(any(User.class))).willAnswer(invocation -> {
                User savedUser = invocation.getArgument(0); // save 메소드에 전달된 첫 인자를 저장하기 위해서 꺼낸다.
                ReflectionTestUtils.setField(savedUser, "userId", 1L);
                return savedUser;
            });

            // when
            SignUpResponseDto response = userService.signup(request);

            // then
            assertThat(response.getUserId()).isEqualTo(1L);

            verify(userRepository).save(argThat(user ->
                    user.getEmail().equals("test@example.com")
                            && user.getPassword().equals("encoded-password")
                            && user.getNickname().equals("neo")
                            && user.getProfileImage().equals("/profile.png")
                            && !user.isDeleted()
            ));
        }

        @Test
        @DisplayName("이메일이 중복되면 회원가입에 실패한다")
        void signup_duplicateEmail_throwsAlreadyExists() {
            // given
            SignUpRequestDto request = signUpRequest(
                    "test@example.com",
                    "Password123!",
                    "Password123!",
                    "neo",
                    null
            );

            given(userRepository.existsByEmail("test@example.com")).willReturn(true);

            // when & then
            assertThatThrownBy(() -> userService.signup(request))
                    .isInstanceOf(ApiException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.USER_ALREADY_EXISTS);

            verify(userRepository, never()).save(any(User.class));  // 이메일이 중복되어 회원가입 실패이므로, 어떤 User 객체를 받았었더라도 save()가 절대 호출되면 안됨.
        }

        @Test
        @DisplayName("닉네임이 중복되면 회원가입에 실패한다")
        void signup_duplicateNickname_throwsAlreadyExists() {
            // given
            SignUpRequestDto request = signUpRequest(
                    "test@example.com",
                    "Password123!",
                    "Password123!",
                    "neo",
                    null
            );

            given(userRepository.existsByEmail("test@example.com")).willReturn(false);
            given(userRepository.existsByNickname("neo")).willReturn(true);

            // when & then
            assertThatThrownBy(() -> userService.signup(request))
                    .isInstanceOf(ApiException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.USER_ALREADY_EXISTS);

            verify(userRepository, never()).save(any(User.class));
        }

        @Test
        @DisplayName("비밀번호 확인이 일치하지 않으면 회원가입에 실패한다")
        void signup_passwordMismatch_throwsPasswordMismatch() {
            // given
            SignUpRequestDto request = signUpRequest(
                    "test@example.com",
                    "Password123!",
                    "Different123!",
                    "neo",
                    null
            );

            given(userRepository.existsByEmail("test@example.com")).willReturn(false);
            given(userRepository.existsByNickname("neo")).willReturn(false);

            // when & then
            assertThatThrownBy(() -> userService.signup(request))
                    .isInstanceOf(ApiException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.PASSWORD_MISMATCH);

            verify(passwordEncoder, never()).encode(any());
            verify(userRepository, never()).save(any(User.class));
        }
    }

    @Nested
    @DisplayName("로그인")
    class Login {

        @Test
        @DisplayName("로그인 성공 시 accessToken과 refreshToken을 발급하고 refreshToken을 저장한다")
        void login_success() {
            // given
            LoginRequestDto request = loginRequest("test@example.com", "Password123!");
            User user = user(1L, "test@example.com", "encoded-password", "neo", "/profile.png");

            given(userRepository.findByEmail("test@example.com")).willReturn(Optional.of(user));
            given(passwordEncoder.matches("Password123!", "encoded-password")).willReturn(true);
            given(jwtTokenProvider.createAccessToken(user)).willReturn("access-token");
            given(jwtTokenProvider.createRefreshToken(user)).willReturn("refresh-token");
            given(refreshTokenRepository.findByUser(user)).willReturn(Optional.empty());

            // when
            LoginResponseDto response = userService.login(request);

            // then
            assertThat(response.getUserId()).isEqualTo(1L);
            assertThat(response.getAccessToken()).isEqualTo("access-token");
            assertThat(response.getRefreshToken()).isEqualTo("refresh-token");

            verify(refreshTokenRepository).save(argThat(refreshToken ->
                    refreshToken.getUser().equals(user)
                            && refreshToken.getToken().equals("refresh-token")
                            && !refreshToken.isExpired()
            ));
        }

        @Test
        @DisplayName("존재하지 않는 이메일이면 로그인에 실패한다")
        void login_emailNotFound_throwsUserNotFound() {
            // given
            LoginRequestDto request = loginRequest("test@example.com", "Password123!");

            given(userRepository.findByEmail("test@example.com")).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> userService.login(request))
                    .isInstanceOf(ApiException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.USER_NOT_FOUND);

            verify(passwordEncoder, never()).matches(any(), any());
            verify(jwtTokenProvider, never()).createAccessToken(any());
            verify(refreshTokenRepository, never()).save(any(RefreshToken.class));
        }

        @Test
        @DisplayName("비밀번호가 일치하지 않으면 로그인에 실패한다")
        void login_wrongPassword_throwsUserNotFound() {
            // given
            LoginRequestDto request = loginRequest("test@example.com", "WrongPassword!");
            User user = user(1L, "test@example.com", "encoded-password", "neo", "/profile.png");

            given(userRepository.findByEmail("test@example.com")).willReturn(Optional.of(user));
            given(passwordEncoder.matches("WrongPassword!", "encoded-password")).willReturn(false);

            // when & then
            assertThatThrownBy(() -> userService.login(request))
                    .isInstanceOf(ApiException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.USER_NOT_FOUND);

            verify(jwtTokenProvider, never()).createAccessToken(any());
            verify(refreshTokenRepository, never()).save(any(RefreshToken.class));
        }

        @Test
        @DisplayName("기존 refreshToken이 있으면 새로 저장하지 않고 갱신한다")
        void login_existingRefreshToken_updatesToken() {
            // given
            LoginRequestDto request = loginRequest("test@example.com", "Password123!");
            User user = user(1L, "test@example.com", "encoded-password", "neo", "/profile.png");
            RefreshToken existingRefreshToken = new RefreshToken(
                    user,
                    "old-refresh-token",
                    LocalDateTime.now().plusDays(7)
            );

            given(userRepository.findByEmail("test@example.com")).willReturn(Optional.of(user));
            given(passwordEncoder.matches("Password123!", "encoded-password")).willReturn(true);
            given(jwtTokenProvider.createAccessToken(user)).willReturn("access-token");
            given(jwtTokenProvider.createRefreshToken(user)).willReturn("new-refresh-token");
            given(refreshTokenRepository.findByUser(user)).willReturn(Optional.of(existingRefreshToken));

            // when
            LoginResponseDto response = userService.login(request);

            // then
            assertThat(response.getRefreshToken()).isEqualTo("new-refresh-token");
            assertThat(existingRefreshToken.getToken()).isEqualTo("new-refresh-token");
            assertThat(existingRefreshToken.isExpired()).isFalse();

            verify(refreshTokenRepository, never()).save(any(RefreshToken.class));
        }
    }

    @Nested
    @DisplayName("회원 탈퇴")
    class DeleteUser {

        @Test
        @DisplayName("회원 탈퇴 성공 시 유저를 soft delete 하고 개인정보를 마스킹한다")
        void deleteUser_success() {
            // given
            User user = user(1L, "test@example.com", "encoded-password", "neo", "/profile.png");

            given(userRepository.findByEmail("test@example.com")).willReturn(Optional.of(user));

            // when
            userService.deleteUser("test@example.com", 1L);

            // then
            assertThat(user.isDeleted()).isTrue();
            assertThat(user.getEmail()).isEqualTo("deleted-user1@email.com");
            assertThat(user.getPassword()).isEqualTo("deleted-user-1");
            assertThat(user.getNickname()).isEqualTo("알 수 없음");
            assertThat(user.getProfileImage()).isNull();
            assertThat(user.getDeletedAt()).isNotNull();
        }

        @Test
        @DisplayName("본인이 아니면 회원 탈퇴에 실패한다")
        void deleteUser_notOwner_throwsDeniedAccess() {
            // given
            User user = user(1L, "test@example.com", "encoded-password", "neo", "/profile.png");

            given(userRepository.findByEmail("test@example.com")).willReturn(Optional.of(user));

            // when & then
            assertThatThrownBy(() -> userService.deleteUser("test@example.com", 2L))
                    .isInstanceOf(ApiException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.DENIED_ACCESS);

            assertThat(user.isDeleted()).isFalse();
        }

        @Test
        @DisplayName("이미 삭제된 유저면 회원 탈퇴에 실패한다")
        void deleteUser_deletedUser_throwsUnauthorizedUser() {
            // given
            User user = user(1L, "test@example.com", "encoded-password", "neo", "/profile.png");
            user.delete();

            given(userRepository.findByEmail("test@example.com")).willReturn(Optional.of(user));

            // when & then
            assertThatThrownBy(() -> userService.deleteUser("test@example.com", 1L))
                    .isInstanceOf(ApiException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.UNAUTHORIZED_USER);
        }
    }

    private SignUpRequestDto signUpRequest(
            String email,
            String password,
            String passwordCheck,
            String nickname,
            String profileImage
    ) {
        SignUpRequestDto request = new SignUpRequestDto();
        ReflectionTestUtils.setField(request, "email", email);
        ReflectionTestUtils.setField(request, "password", password);
        ReflectionTestUtils.setField(request, "passwordCheck", passwordCheck);
        ReflectionTestUtils.setField(request, "nickname", nickname);
        ReflectionTestUtils.setField(request, "profileImage", profileImage);
        return request;
    }

    private LoginRequestDto loginRequest(String email, String password) {
        LoginRequestDto request = new LoginRequestDto();
        ReflectionTestUtils.setField(request, "email", email);
        ReflectionTestUtils.setField(request, "password", password);
        return request;
    }

    private User user(
            Long userId,
            String email,
            String password,
            String nickname,
            String profileImage
    ) {
        User user = new User(email, password, nickname, profileImage);
        ReflectionTestUtils.setField(user, "userId", userId);
        return user;
    }
}