package com.ktb.community.domain.comment.service;

import com.ktb.community.domain.comment.dto.CommentListResponseDto;
import com.ktb.community.domain.comment.dto.CommentRequestDto;
import com.ktb.community.domain.comment.dto.CommentResponseDto;
import com.ktb.community.domain.comment.dto.CommentUpdateResponseDto;
import com.ktb.community.domain.comment.entity.Comment;
import com.ktb.community.domain.post.entity.Post;
import com.ktb.community.domain.user.entity.User;
import com.ktb.community.global.exception.ApiException;
import com.ktb.community.global.exception.ErrorCode;
import com.ktb.community.domain.comment.repository.CommentRepository;
import com.ktb.community.domain.post.repository.PostRepository;
import com.ktb.community.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;

    public CommentResponseDto createComment(String email, Long postId, CommentRequestDto request) {
        User user = getActiveUser(email);
        Post post = getActivePost(postId);

        Comment comment = new Comment(
                post,
                user,
                null,
                request.getCommentBody()
        );

        Comment savedComment = commentRepository.save(comment);
        post.increaseComments();

        return toCommentResponse(savedComment);
    }

    public CommentResponseDto createReply(String email, Long parentCommentId, CommentRequestDto request) {
        User user = getActiveUser(email);

        Comment parentComment = commentRepository.findById(parentCommentId)
                .orElseThrow(() -> new ApiException(ErrorCode.PARENT_COMMENT_NOT_FOUND));

        Post post = parentComment.getPost();

        if (post.isDeleted()) {
            throw new ApiException(ErrorCode.POST_NOT_FOUND);
        }

        if(parentComment.isDeleted()) {
            throw new ApiException(ErrorCode.ALREADY_DELETED);
        }

        if (parentComment.getParentComment() != null) {
            throw new ApiException(ErrorCode.REPLY_DEPTH_EXCEEDED);
        }

        Comment reply = new Comment(
                post,
                user,
                parentComment,
                request.getCommentBody()
        );

        Comment savedReply = commentRepository.save(reply);
        post.increaseComments();

        return toCommentResponse(savedReply);
    }

    @Transactional(readOnly = true)
    public List<CommentListResponseDto> getCommentsList(Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ApiException(ErrorCode.POST_NOT_FOUND));

        if (post.isDeleted()) {
            throw new ApiException(ErrorCode.POST_NOT_FOUND);
        }

        return commentRepository.findByPostAndParentCommentIsNull(post)
                .stream()
                .map(parentComment -> {
                    List<CommentListResponseDto.ReplyResponseDto> replies =
                            commentRepository.findByParentCommentAndDeletedFalse(parentComment)
                                    .stream()
                                    .map(reply -> new CommentListResponseDto.ReplyResponseDto(
                                            reply.getCommentId(),
                                            reply.getUser().getUserId(),
                                            reply.getUser().getNickname(),
                                            reply.getUser().getProfileImage(),
                                            reply.getCommentBody(),
                                            reply.isDeleted(),
                                            reply.getCreatedAt()
                                    ))
                                    .toList();

                    if(parentComment.isDeleted() && replies.isEmpty()) {
                        return null;
                    }

                    return new CommentListResponseDto(parentComment, replies);
                })
                .filter(Objects::nonNull)
                .toList();
    }

    public CommentUpdateResponseDto updateComment(String email, Long commentId, CommentRequestDto request) {
        User user = getActiveUser(email);
        Comment comment = getComment(commentId);

        validateCommentOwner(user, comment);

        if (comment.isDeleted()) {
            throw new ApiException(ErrorCode.ALREADY_DELETED);
        }

        comment.update(request.getCommentBody());

        return new CommentUpdateResponseDto(
                comment.getCommentId(),
                comment.getUpdatedAt(),
                true
        );
    }

    public void deleteComment(String email, Long commentId) {
        User user = getActiveUser(email);
        Comment comment = getComment(commentId);

        validateCommentOwner(user, comment);

        if (comment.isDeleted()) {
            throw new ApiException(ErrorCode.ALREADY_DELETED);
        }

        comment.delete();

        // "삭제된 댓글입니다" 껍데기 댓글은 comments에 카운팅하지 않음으로 조건 없이 모든 댓글 삭제 시 감소
        comment.getPost().decreaseComments();
    }

    private Comment getComment(Long commentId) {
        return commentRepository.findById(commentId)
                .orElseThrow(() -> new ApiException(ErrorCode.COMMENT_NOT_FOUND));
    }

    private Post getActivePost(Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ApiException(ErrorCode.POST_NOT_FOUND));

        if (post.isDeleted()) {
            throw new ApiException(ErrorCode.POST_NOT_FOUND);
        }

        return post;
    }

    private void validateCommentOwner(User user, Comment comment) {
        if (!comment.getUser().getUserId().equals(user.getUserId())) {
            throw new ApiException(ErrorCode.DENIED_ACCESS);
        }
    }

    private User getActiveUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED_USER));

        if (user.isDeleted()) {
            throw new ApiException(ErrorCode.UNAUTHORIZED_USER);
        }

        return user;
    }

    private CommentResponseDto toCommentResponse(Comment comment) {
        return new CommentResponseDto(
                comment.getCommentId(),
                comment.getParentComment() != null ? comment.getParentComment().getCommentId() : null,
                comment.getUser().getUserId(),
                comment.getUser().getNickname(),
                comment.getUser().getProfileImage(),
                comment.getCommentBody(),
                comment.getCreatedAt()
        );
    }
}
