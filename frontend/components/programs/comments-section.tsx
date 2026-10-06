'use client';

import { useState } from 'react';
import { Send, Loader2, Trash2, Reply } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  useComments,
  useCreateComment,
  useDeleteComment,
} from '@/lib/hooks/useSocial';
import { useAuth } from '@/lib/auth-context';
import type { Comment } from '@/types';

interface CommentsSectionProps {
  /**
   * ID of either a recording (default) or a live event. Discriminate
   * via the `kind` prop. The backend exposes `/recordings/:id/comments`
   * and `/live-events/:id/comments` with the same shape.
   */
  targetId: string;
  kind?: 'recording' | 'liveEvent';
}

export function CommentsSection({ targetId, kind = 'recording' }: CommentsSectionProps) {
  const { isAuthenticated, user } = useAuth();
  const { data, isLoading } = useComments(
    targetId,
    1,
    20,
    kind,
  );
  const effectiveData = data ?? { data: [], meta: { total: 0 } };
  const create = useCreateComment(targetId, kind);
  const remove = useDeleteComment(targetId);

  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    await create.mutateAsync({
      content: draft.trim(),
      parentId: replyTo?.id,
    });
    setDraft('');
    setReplyTo(null);
  };

  const comments = effectiveData?.data ?? [];
  const total = effectiveData?.meta?.total ?? 0;
  const supportComposer = true;

  return (
    <Card className="p-6 glass-card">
      <h3 className="text-lg font-bold text-white mb-4">
        Bình luận ({total})
      </h3>

      {/* Composer */}
      {isAuthenticated && supportComposer ? (
        <form onSubmit={handleSubmit} className="mb-6">
          {replyTo && (
            <div className="flex items-center justify-between p-2 mb-2 rounded bg-dark-800 text-xs text-dark-300">
              <span>
                Đang trả lời <b>{replyTo.user?.fullName || 'người dùng'}</b>
              </span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-dark-400 hover:text-white"
                aria-label="Hủy trả lời"
              >
                ×
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Viết bình luận của bạn..."
              className="flex-1 bg-dark-900/50 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white placeholder-dark-500 focus:border-primary-500 focus:outline-none resize-none"
              rows={2}
              maxLength={1000}
            />
            <Button
              type="submit"
              size="icon"
              disabled={create.isPending || !draft.trim()}
              aria-label="Gửi bình luận"
            >
              {create.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </form>
      ) : !isAuthenticated ? (
        <p className="text-sm text-dark-400 mb-6">Đăng nhập để bình luận.</p>
      ) : (
        <p className="text-sm text-dark-400 mb-6">
          Bình luận cho chương trình trực tiếp sẽ sớm có mặt.
        </p>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-dark-400 text-center py-6">
          Chưa có bình luận nào. Hãy là người đầu tiên!
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              currentUser={user}
              onReply={(c) => setReplyTo(c)}
              onDelete={(id) => remove.mutate(id)}
              isDeleting={remove.isPending}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function CommentItem({
  comment,
  currentUser,
  onReply,
  onDelete,
  isDeleting,
}: {
  comment: Comment;
  currentUser: { id: string; role: string } | null;
  onReply: (c: Comment) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const canDelete =
    !!currentUser &&
    (currentUser.id === comment.userId || currentUser.role === 'ADMIN');

  return (
    <div className="p-3 rounded-lg bg-dark-900/50 border border-dark-700">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-medium text-white flex-shrink-0">
          {(comment.user?.fullName || '?')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="font-medium text-white">
              {comment.user?.fullName || 'Người dùng'}
            </span>
            <span className="text-xs text-dark-500">
              {formatDistanceToNow(parseISO(comment.createdAt), {
                addSuffix: true,
                locale: vi,
              })}
            </span>
            {comment.isEdited && (
              <span className="text-xs text-dark-500">(đã chỉnh sửa)</span>
            )}
          </div>
          <p className="text-sm text-dark-200 mt-1 whitespace-pre-wrap break-words">
            {comment.content}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-dark-400">
            <button
              onClick={() => onReply(comment)}
              className="flex items-center gap-1 hover:text-primary-400"
            >
              <Reply className="w-3 h-3" />
              Trả lời
            </button>
            {canDelete && (
              <button
                onClick={() => onDelete(comment.id)}
                disabled={isDeleting}
                className="flex items-center gap-1 hover:text-red-400 disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3" />
                Xóa
              </button>
            )}
          </div>

          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-3 pl-4 border-l-2 border-dark-700">
              {comment.replies.map((r) => (
                <CommentItem
                  key={r.id}
                  comment={r}
                  currentUser={currentUser}
                  onReply={onReply}
                  onDelete={onDelete}
                  isDeleting={isDeleting}
                />
              ))}
              {comment._count &&
                comment._count.replies > comment.replies.length && (
                  <p className="text-xs text-dark-500 italic">
                    + {comment._count.replies - comment.replies.length} phản hồi
                    khác
                  </p>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
