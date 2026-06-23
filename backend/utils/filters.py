from rest_framework.filters import BaseFilterBackend



class PullDownRefreshFilter(BaseFilterBackend):
    """下拉刷新"""
    def filter_queryset(self, request, queryset, view):
        max_id = request.query_params.get('max_id')
        if not max_id:
            return queryset
        return queryset.filter(id__gt=max_id).order_by('-id')


class ReachButtonFilter(BaseFilterBackend):
    """上拉刷新"""
    def filter_queryset(self, request, queryset, view):
        min_id = request.query_params.get('min_id')
        if not min_id:
            return queryset
        return queryset.filter(id__lt=min_id).order_by('-id')




class CommentFilter(BaseFilterBackend):
    """
    查某条根评论的所有子评论（按 root 过滤）
    """
    def filter_queryset(self, request, queryset, view):
        comment_id = request.query_params.get('comment_id')
        if not comment_id:
            return queryset
            # 验证 comment_id 必须是有效数字
        if not comment_id.isdigit():
            return queryset
        return queryset.filter(root_id=comment_id)


class NewsFilter(BaseFilterBackend):
    def filter_queryset(self, request, queryset, view):
        news_id = request.query_params.get('news_id')
        if not news_id:
            return queryset
        # 如果同时提供了 comment_id（获取子评论），则不强制 depth=1
        comment_id = request.query_params.get('comment_id')
        if comment_id:
            return queryset.filter(news_id=news_id)

        # 默认只获取根评论
        return queryset.filter(news_id=news_id, depth=1)



