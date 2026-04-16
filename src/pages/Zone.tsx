import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  PlusCircle,
  Activity,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  X,
  ArrowLeft,
  Send,
  User,
  ShareIcon,
  MoreHorizontal,
  Pencil,
  Trash2,
  MessageCircleOff,
  MessageCircle,
  Reply,
  Check,
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { apiFetch, type ZoneComment, type ZoneThread } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

type ThreadPost = {
  id: string;
  title: string;
  detailedIntelligence: string;
  commentsDisabled: boolean;
  author: {
    id: string;
    name: string;
  };
  timestamp: Date;
};

type CommentItem = {
  id: string;
  threadId: string;
  userId: string;
  parentCommentId: string | null;
  user: string;
  text: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeThread(thread: ZoneThread): ThreadPost {
  return {
    id: thread.id ?? thread.thread_id ?? '',
    title: thread.title,
    detailedIntelligence: thread.detailed_intelligence,
    commentsDisabled: Boolean(thread.comments_disabled),
    author: {
      id: thread.author?.id ?? thread.thread_user_id ?? '',
      name: thread.author?.name ?? 'Unknown agent',
    },
    timestamp: new Date(thread.created_at),
  };
}

function normalizeComment(comment: ZoneComment): CommentItem {
  return {
    id: comment.id ?? comment.comment_id ?? '',
    threadId: comment.thread_id,
    userId: comment.user?.id ?? comment.user_id,
    parentCommentId: comment.parent_comment_id,
    user: comment.user?.name ?? 'Unknown agent',
    text: comment.comment,
    isDeleted: Boolean(comment.is_deleted),
    createdAt: new Date(comment.created_at),
    updatedAt: new Date(comment.updated_at ?? comment.created_at),
  };
}

function relativeTime(value: Date) {
  return formatDistanceToNow(value, { addSuffix: true });
}

function ThreadView({
  post,
  onBack,
}: {
  post: ThreadPost;
  onBack: () => void;
}) {
  const { user } = useAuthStore();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

  const currentUserId = user?.id ?? '';
  useEffect(() => {
    let ignore = false;

    const fetchComments = async () => {
      setIsLoadingComments(true);

      try {
        const data = await apiFetch<{ comments: ZoneComment[] }>(`/thread/${post.id}/comments`);
        if (!ignore) {
          setComments(data.comments.map(normalizeComment));
        }
      } catch (error) {
        if (!ignore) {
          toast.error(error instanceof Error ? error.message : 'Could not load comments.');
        }
      } finally {
        if (!ignore) {
          setIsLoadingComments(false);
        }
      }
    };

    void fetchComments();

    return () => {
      ignore = true;
    };
  }, [post.id]);

  const commentsByParent = useMemo(() => {
    const map = new Map<string | null, CommentItem[]>();

    for (const comment of comments) {
      const parentId = comment.parentCommentId ?? null;
      map.set(parentId, [...(map.get(parentId) ?? []), comment]);
    }

    return map;
  }, [comments]);

  const addComment = async (text: string, parentCommentId: string | null = null) => {
    const normalizedText = text.trim();
    if (!normalizedText) return;

    setActiveCommentId(parentCommentId ?? 'root');

    try {
      const data = await apiFetch<{ comment: ZoneComment }>(`/thread/${post.id}/comment`, {
        method: 'POST',
        body: JSON.stringify({
          comment: normalizedText,
          parentCommentId,
        }),
      });

      setComments((current) => [...current, normalizeComment(data.comment)]);
      setCommentText('');
      setReplyText('');
      setReplyTargetId(null);
      toast.success(parentCommentId ? 'Reply posted.' : 'Comment posted.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not post comment.');
    } finally {
      setActiveCommentId(null);
    }
  };

  const updateComment = async (commentId: string) => {
    const normalizedText = editText.trim();
    if (!normalizedText) return;

    setActiveCommentId(commentId);

    try {
      const data = await apiFetch<{ comment: ZoneComment }>(`/thread/${post.id}/comment/${commentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ comment: normalizedText }),
      });

      const updatedComment = normalizeComment(data.comment);
      setComments((current) =>
        current.map((comment) => (comment.id === commentId ? updatedComment : comment)),
      );
      setEditingCommentId(null);
      setEditText('');
      toast.success('Comment updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update comment.');
    } finally {
      setActiveCommentId(null);
    }
  };

  const deleteComment = async (commentId: string) => {
    setActiveCommentId(commentId);

    try {
      const data = await apiFetch<{ comment: ZoneComment }>(`/thread/${post.id}/comment/${commentId}`, {
        method: 'DELETE',
      });

      const deletedComment = normalizeComment(data.comment);
      setComments((current) =>
        current.map((comment) => (comment.id === commentId ? deletedComment : comment)),
      );
      toast.success('Comment deleted.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete comment.');
    } finally {
      setActiveCommentId(null);
    }
  };

  const startEditing = (comment: CommentItem) => {
    setEditingCommentId(comment.id);
    setEditText(comment.text);
    setReplyTargetId(null);
  };

  const renderComment = (comment: CommentItem, depth = 0): JSX.Element => {
    const children = commentsByParent.get(comment.id) ?? [];
    const canEdit = !comment.isDeleted && comment.userId === currentUserId;
    const canDelete = !comment.isDeleted && comment.userId === currentUserId;
    const wasEdited =
      !comment.isDeleted && comment.updatedAt.getTime() - comment.createdAt.getTime() > 1000;

    return (
      <div key={comment.id} className={cn(depth > 0 && 'ml-5 border-l border-primary/10 pl-4')}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex gap-4"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-border/50 bg-secondary/30">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>

          <Card className="glass flex-1 border-border/40 bg-secondary/10">
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between gap-2 text-[10px]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold uppercase tracking-tighter text-primary">
                    {comment.isDeleted ? 'Deleted comment' : comment.user}
                  </span>
                  <span className="text-muted-foreground italic">{relativeTime(comment.createdAt)}</span>
                  {wasEdited && <span className="text-muted-foreground">edited</span>}
                </div>
                <div className="flex items-center gap-1">
                  {!post.commentsDisabled && !comment.isDeleted && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
                      onClick={() => {
                        setReplyTargetId(comment.id);
                        setReplyText('');
                        setEditingCommentId(null);
                      }}
                    >
                      <Reply className="h-3.5 w-3.5" />
                      Reply
                    </Button>
                  )}
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-primary"
                      onClick={() => startEditing(comment)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteComment(comment.id)}
                      disabled={activeCommentId === comment.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {editingCommentId === comment.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editText}
                    onChange={(event) => setEditText(event.target.value)}
                    className="min-h-[76px] border-border/40 bg-secondary/20"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingCommentId(null);
                        setEditText('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="cyber"
                      size="sm"
                      onClick={() => updateComment(comment.id)}
                      disabled={activeCommentId === comment.id || !editText.trim()}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <p className={cn('text-sm leading-relaxed text-foreground/90', comment.isDeleted && 'italic text-muted-foreground')}>
                  {comment.isDeleted ? 'This comment was deleted.' : comment.text}
                </p>
              )}

              {replyTargetId === comment.id && !post.commentsDisabled && (
                <div className="mt-4 flex gap-2">
                  <Input
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void addComment(replyText, comment.id);
                    }}
                    placeholder={`Reply to ${comment.user}`}
                    className="h-9 border-border/40 bg-secondary/20"
                  />
                  <Button
                    variant="cyber"
                    size="sm"
                    onClick={() => addComment(replyText, comment.id)}
                    disabled={activeCommentId === comment.id || !replyText.trim()}
                  >
                    Send
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {children.map((child) => renderComment(child, depth + 1))}
      </div>
    );
  };

  const rootComments = commentsByParent.get(null) ?? [];

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-2 p-0 text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Feed
      </Button>

      <Card className="glass border-primary/30 bg-card/40">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <CardTitle className="font-display text-2xl uppercase tracking-tight">{post.title}</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {post.commentsDisabled && (
                <div className="flex items-center gap-1 rounded border border-warning/30 bg-warning/10 px-2 py-1 text-[10px] font-bold text-warning">
                  <Lock className="h-3 w-3" />
                  Comments limited
                </div>
              )}
              <div className="rounded border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
                {post.author.name}
              </div>
            </div>
          </div>
          <CardDescription className="mt-2 text-foreground/80">{post.detailedIntelligence}</CardDescription>
        </CardHeader>
      </Card>

      <div className="space-y-4 border-l border-primary/20 pl-4">
        <h3 className="mb-6 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Assembly Discussion
        </h3>

        {isLoadingComments && (
          <div className="rounded-lg border border-border/40 bg-secondary/20 p-4 text-sm text-muted-foreground">
            Loading comments...
          </div>
        )}

        {!isLoadingComments && rootComments.length === 0 && (
          <div className="rounded-lg border border-border/40 bg-secondary/20 p-4 text-sm text-muted-foreground">
            No comments yet.
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {rootComments.map((comment) => renderComment(comment))}
        </AnimatePresence>

        {post.commentsDisabled ? (
          <div className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/10 p-3 text-sm text-warning">
            <MessageCircleOff className="h-4 w-4" />
            Comments are limited by the thread author.
          </div>
        ) : (
          <div className="sticky bottom-4 mt-8 flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/30 bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="relative flex-1">
              <Input
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void addComment(commentText);
                }}
                placeholder="Write a comment..."
                className="glass h-10 border-border/40 bg-secondary/20 pr-12"
              />
              <Button
                onClick={() => addComment(commentText)}
                variant="ghost"
                size="icon"
                disabled={activeCommentId === 'root' || !commentText.trim()}
                className="absolute right-1 top-1 h-8 w-8 text-primary hover:bg-primary/20"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function PostCard({
  post,
  currentUserId,
  onOpenComments,
  onEdit,
  onDelete,
  onToggleComments,
}: {
  post: ThreadPost;
  currentUserId: string;
  onOpenComments: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleComments: () => void;
}) {
  const [votes, setVotes] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [voteType, setVoteType] = useState<'like' | 'dislike' | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const isAuthor = currentUserId === post.author.id;

  const refreshCounts = async () => {
    const [voteData, commentData] = await Promise.all([
      apiFetch<{ totalScore: number; currentUserVote: 'like' | 'dislike' | null }>(
        `/thread/${post.id}/votes/count`,
      ),
      apiFetch<{ count: number }>(`/thread/${post.id}/comments/count`),
    ]);

    setVotes(voteData.totalScore);
    setVoteType(voteData.currentUserVote);
    setCommentCount(commentData.count);
  };

  useEffect(() => {
    let ignore = false;

    const loadCounts = async () => {
      try {
        const [voteData, commentData] = await Promise.all([
          apiFetch<{ totalScore: number; currentUserVote: 'like' | 'dislike' | null }>(
            `/thread/${post.id}/votes/count`,
          ),
          apiFetch<{ count: number }>(`/thread/${post.id}/comments/count`),
        ]);

        if (!ignore) {
          setVotes(voteData.totalScore);
          setVoteType(voteData.currentUserVote);
          setCommentCount(commentData.count);
        }
      } catch {
        if (!ignore) {
          setVotes(0);
          setCommentCount(0);
        }
      }
    };

    void loadCounts();

    return () => {
      ignore = true;
    };
  }, [post.id]);

  const handleVote = async (type: 'like' | 'dislike') => {
    setIsVoting(true);

    try {
      const data = await apiFetch<{
        totalScore: number;
        currentUserVote: 'like' | 'dislike' | null;
      }>(`/thread/${post.id}/thread-likes`, {
        method: 'POST',
        body: JSON.stringify({ likeType: type }),
      });

      setVotes(data.totalScore);
      setVoteType(data.currentUserVote);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update vote.');
    } finally {
      setIsVoting(false);
    }
  };

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?thread=${post.id}`;

    navigator.clipboard
      .writeText(shareUrl)
      .then(() => toast.success('Link copied successfully.'))
      .catch(() => toast.error('Failed to copy link.'));
  };

  return (
    <Card className="glass overflow-hidden border-border/50 bg-card/60 transition-all hover:border-primary/30">
      <div className="flex">
        <div className="flex w-16 flex-col items-center gap-1 border-r border-border/40 bg-secondary/20 p-4">
          <button
            onClick={() => handleVote('like')}
            disabled={isVoting}
            className={cn('transition-colors hover:text-success', voteType === 'like' && 'text-success')}
          >
            <ThumbsUp className="h-4 w-4" />
          </button>
          <span className="text-sm font-bold">{votes}</span>
          <button
            onClick={() => handleVote('dislike')}
            disabled={isVoting}
            className={cn('transition-colors hover:text-destructive', voteType === 'dislike' && 'text-destructive')}
          >
            <ThumbsDown className="h-4 w-4" />
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <CardHeader className="p-4 pb-2">
            <div className="mb-1 flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                <span className="font-bold text-primary">{post.author.name}</span>
                <span>•</span>
                <span>{relativeTime(post.timestamp)}</span>
                {post.commentsDisabled && (
                  <>
                    <span>•</span>
                    <span className="text-warning">comments limited</span>
                  </>
                )}
              </div>
              {isAuthor && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass border-border/60 bg-popover">
                    <DropdownMenuItem onClick={onToggleComments} className="gap-2">
                      {post.commentsDisabled ? (
                        <MessageCircle className="h-4 w-4" />
                      ) : (
                        <MessageCircleOff className="h-4 w-4" />
                      )}
                      {post.commentsDisabled ? 'Enable comments' : 'Limit comments'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onEdit} className="gap-2">
                      <Pencil className="h-4 w-4" />
                      Edit thread
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onDelete} className="gap-2 text-destructive focus:text-destructive">
                      <Trash2 className="h-4 w-4" />
                      Delete thread
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <CardTitle className="font-display text-lg font-bold leading-tight">{post.title}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="line-clamp-2 text-sm text-foreground/70">{post.detailedIntelligence}</p>
          </CardContent>
          <CardFooter className="flex items-center justify-between p-4 pt-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void refreshCounts();
                onOpenComments();
              }}
              className="h-8 gap-2 px-0 text-xs text-muted-foreground hover:text-primary"
            >
              <MessageSquare className="h-4 w-4" /> {commentCount} Comments
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyLink}
              className="h-8 gap-2 px-0 text-xs text-muted-foreground hover:text-primary"
            >
              <ShareIcon className="h-4 w-4" /> Share
            </Button>
          </CardFooter>
        </div>
      </div>
    </Card>
  );
}

export default function Zone() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<ThreadPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [threadTitle, setThreadTitle] = useState('');
  const [threadDetails, setThreadDetails] = useState('');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isSavingThread, setIsSavingThread] = useState(false);
  const { user } = useAuthStore();

  const selectedPost = posts.find((post) => post.id === selectedPostId);
  const currentUserId = user?.id ?? '';

  useEffect(() => {
    let ignore = false;

    const fetchThreads = async () => {
      setIsLoading(true);

      try {
        const data = await apiFetch<{ threads: ZoneThread[] }>('/created-threads');
        const normalized = data.threads.map(normalizeThread);

        if (!ignore) {
          setPosts(normalized);
        }
      } catch (error) {
        if (!ignore) {
          toast.error(error instanceof Error ? error.message : 'Failed to get threads.');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    void fetchThreads();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const threadId = searchParams.get('thread');
    if (threadId && posts.some((post) => post.id === threadId)) {
      setSelectedPostId(threadId);
    }
  }, [posts, searchParams]);

  const openCreateThread = () => {
    setEditorMode('create');
    setEditingPostId(null);
    setThreadTitle('');
    setThreadDetails('');
  };

  const openEditThread = (post: ThreadPost) => {
    setEditorMode('edit');
    setEditingPostId(post.id);
    setThreadTitle(post.title);
    setThreadDetails(post.detailedIntelligence);
  };

  const closeEditor = () => {
    setEditorMode(null);
    setEditingPostId(null);
    setThreadTitle('');
    setThreadDetails('');
  };

  const saveThread = async () => {
    const normalizedTitle = threadTitle.trim();
    const normalizedDetails = threadDetails.trim();

    if (!normalizedTitle || !normalizedDetails) {
      toast.error('Title and details are required.');
      return;
    }

    setIsSavingThread(true);

    try {
      if (editorMode === 'edit' && editingPostId) {
        const data = await apiFetch<{ thread: ZoneThread }>(`/thread/${editingPostId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: normalizedTitle,
            detailedIntelligence: normalizedDetails,
          }),
        });
        const updatedPost = normalizeThread(data.thread);

        setPosts((current) =>
          current.map((post) => (post.id === updatedPost.id ? updatedPost : post)),
        );
        toast.success('Thread updated.');
      } else {
        const data = await apiFetch<{ thread: ZoneThread }>('/thread', {
          method: 'POST',
          body: JSON.stringify({
            title: normalizedTitle,
            detailedIntelligence: normalizedDetails,
          }),
        });

        setPosts((current) => [normalizeThread(data.thread), ...current]);
        toast.success('Created zone discussion.');
      }

      closeEditor();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save thread.');
    } finally {
      setIsSavingThread(false);
    }
  };

  const toggleComments = async (post: ThreadPost) => {
    try {
      const data = await apiFetch<{ thread: ZoneThread }>(`/thread/${post.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          commentsDisabled: !post.commentsDisabled,
        }),
      });
      const updatedPost = normalizeThread(data.thread);

      setPosts((current) =>
        current.map((item) => (item.id === updatedPost.id ? updatedPost : item)),
      );
      toast.success(updatedPost.commentsDisabled ? 'Comments limited.' : 'Comments enabled.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update comments setting.');
    }
  };

  const deleteThread = async (post: ThreadPost) => {
    try {
      await apiFetch<{ message: string }>(`/thread/${post.id}`, {
        method: 'DELETE',
      });

      setPosts((current) => current.filter((item) => item.id !== post.id));
      if (selectedPostId === post.id) {
        setSelectedPostId(null);
        setSearchParams({});
      }
      toast.success('Thread deleted.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete thread.');
    }
  };

  const openThread = (threadId: string) => {
    setSelectedPostId(threadId);
    setSearchParams({ thread: threadId });
  };

  const closeThread = () => {
    setSelectedPostId(null);
    setSearchParams({});
  };

  return (
    <div className="container relative mx-auto min-h-screen px-4 py-8 grid-bg">
      <AnimatePresence>
        {editorMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-lg">
              <Card className="glass relative border-primary/50 shadow-[0_0_20px_rgba(0,255,255,0.1)]">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2"
                  onClick={closeEditor}
                >
                  <X className="h-4 w-4" />
                </Button>
                <CardHeader>
                  <CardTitle className="font-display text-xl text-primary text-glow">
                    {editorMode === 'edit' ? 'Edit Discussion' : 'Create New Discussion'}
                  </CardTitle>
                  <CardDescription className="text-xs italic">
                    Broadcast intelligence to the OSA assembly.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Topic Title</label>
                    <Input
                      value={threadTitle}
                      onChange={(event) => setThreadTitle(event.target.value)}
                      placeholder="e.g., What is social engineering"
                      className="glass h-9 border-primary/20 bg-secondary/10"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">
                      Detailed Intelligence
                    </label>
                    <Textarea
                      value={threadDetails}
                      onChange={(event) => setThreadDetails(event.target.value)}
                      className="min-h-[110px] border-primary/20 bg-secondary/10"
                      placeholder="Describe the findings..."
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={closeEditor}>Cancel</Button>
                  <Button
                    variant="cyber"
                    className="h-9 px-6 font-bold uppercase tracking-wider"
                    onClick={saveThread}
                    disabled={isSavingThread}
                  >
                    {isSavingThread ? 'Saving...' : editorMode === 'edit' ? 'Save Thread' : 'Broadcast Thread'}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">
            OSA <span className="text-primary text-glow">Zone</span>
          </h1>
          <p className="mt-1 text-sm italic text-muted-foreground">
            Assembly consensus and community discussions.
          </p>
        </div>
        {!selectedPostId && (
          <Button variant="cyber" size="lg" onClick={openCreateThread} className="gap-2">
            <PlusCircle className="h-5 w-5" /> Create Thread
          </Button>
        )}
      </div>

      <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {selectedPost ? (
            <ThreadView post={selectedPost} onBack={closeThread} />
          ) : (
            <div className="space-y-4">
              {isLoading && (
                <div className="glass rounded-xl p-5 text-sm text-muted-foreground">
                  Loading zone discussions...
                </div>
              )}
              {!isLoading && posts.length === 0 && (
                <div className="glass rounded-xl p-5 text-sm text-muted-foreground">
                  No discussions yet.
                </div>
              )}
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={currentUserId}
                  onOpenComments={() => openThread(post.id)}
                  onEdit={() => openEditThread(post)}
                  onDelete={() => deleteThread(post)}
                  onToggleComments={() => toggleComments(post)}
                />
              ))}
            </div>
          )}
        </div>

        {!selectedPostId && (
          <div className="space-y-6">
            <Card className="glass border-primary/20 bg-secondary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="h-5 w-5 text-primary" /> What is OSA ZONE?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-xs text-foreground/70">
                  <li className="flex gap-2"><span>•</span> Zone is a space for connecting community thoughts to raise awareness.</li>
                  <li className="flex gap-2"><span>•</span> Thread authors can limit comments when a discussion needs to cool down.</li>
                  <li className="flex gap-2"><span>•</span> Replies keep context under the comment they belong to.</li>
                  <li className="flex gap-2"><span>•</span> Let's shape the community together.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
