from api import models

from django.db.models import F
from rest_framework import status
from rest_framework.response import Response
from rest_framework.generics import CreateAPIView, ListAPIView, RetrieveAPIView

from utils.auth import GeneralAuthentication, UserAuthentication
from utils.pageination import MyLimitOffsetPagination
from utils.filters import PullDownRefreshFilter, ReachButtonFilter, CommentFilter, NewsFilter
from api.serializer.news import CreateNewsSerializer, ListNewsSerializer, TopicSerializer, RetrieveNewsDetailSerializer, \
    ListCommentSerializer, CreateCommentSerializer, FavorModelSerializer, CommentFavorModelSerializer


############################################### 创建展示动态 ##################################################
class NewView(CreateAPIView, ListAPIView):
    """
    发布动态
    """
    queryset = models.News.objects.all().order_by('-id')
    pagination_class = MyLimitOffsetPagination
    filter_backends = [PullDownRefreshFilter, ReachButtonFilter]

    def get_authenticators(self):
        """GET 宽松认证，POST 必须登录"""
        if self.request.method == 'GET':
            return [GeneralAuthentication()]
        if self.request.method == 'POST':
            return [UserAuthentication()]

    def perform_create(self, serializer):
        # 使用已认证用户创建动态
        news_obj = serializer.save(user_id=self.request.user.id)

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ListNewsSerializer
        if self.request.method == 'POST':
            return CreateNewsSerializer


class TopicView(ListAPIView):
    queryset = models.Topic.objects.all()
    serializer_class = TopicSerializer
    filter_backends = [PullDownRefreshFilter, ReachButtonFilter]
    pagination_class = MyLimitOffsetPagination


############################################## 动态详细 #################################################
class NewsDetailView(RetrieveAPIView):
    """
    查看详细动态
    """
    queryset = models.News.objects.all()
    serializer_class = RetrieveNewsDetailSerializer

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)

        # self.get_object()获取新闻对象，没有会报错，会在dispatch中进行捕获，这里不用担心
        news_obj = self.get_object()

        # 判断用户是否登录
        if not request.user:
            return response

        # 判断该用户是否曾经访问过该动态，没有则创建一条访问记录
        viewer_record_obj, flag = models.ViewerRecord.objects.get_or_create(news=news_obj, user=request.user)
        # flag为False则代表该用户访问过
        if not flag:
            return response
        # 没有访问过，则此次应该将该动态的访问次数加一
        models.News.objects.filter(id=news_obj.id).update(viewer_count=F('viewer_count') + 1)
        return response


class CommentView(CreateAPIView, ListAPIView):
    """
    查看,发布评论
    """
    queryset = models.CommentRecord.objects.all()
    serializer_class = ListCommentSerializer
    pagination_class = MyLimitOffsetPagination

    # 排查bug点一
    filter_backends = [CommentFilter, NewsFilter, ReachButtonFilter]

    def get_authenticators(self):
        """
        争对不同接口对用户是否登录的力度返回不同认证类：重写源码执行过程：dispatch -》initialize_request -》 get_authenticators
        :return:
        """
        if self.request.method == 'GET':
            return [GeneralAuthentication(), ]
        if self.request.method == 'POST':
            return [UserAuthentication(), ]

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ListCommentSerializer
        if self.request.method == 'POST':
            return CreateCommentSerializer

    def perform_create(self, serializer):
        serializer.save(user_id=self.request.user.id)


class FavorView(CreateAPIView):
    """新闻点赞"""
    authentication_classes = [UserAuthentication, ]
    serializer_class = FavorModelSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        news_obj = serializer.validated_data['news']
        # 判断当前用户是否点过赞
        record_obj, flag = models.NewsFavorRecord.objects.get_or_create(news=news_obj, user=request.user)
        if not flag:
            # 表示用户取消点赞
            record_obj.delete()
            # 同步 denormalized 计数
            models.News.objects.filter(id=news_obj.id).update(favor_count=F('favor_count') - 1)
            # 刷新对象以获取最新计数
            news_obj.refresh_from_db()
            return Response({
                "msg": "取消点赞成功",
                "is_favor": False,
                "favor_count": news_obj.favor_count
            }, status=status.HTTP_200_OK)
        # 点赞成功，同步计数
        models.News.objects.filter(id=news_obj.id).update(favor_count=F('favor_count') + 1)
        news_obj.refresh_from_db()
        return Response({
            "msg": "点赞成功",
            "is_favor": True,
            "favor_count": news_obj.favor_count
        }, status=status.HTTP_201_CREATED)


class CommentFavorView(CreateAPIView):
    """评论点赞"""
    authentication_classes = [UserAuthentication, ]
    serializer_class = CommentFavorModelSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment_obj = serializer.validated_data['comment']
        # 判断当前用户是否点过赞
        record_obj, flag = models.CommentFavorRecord.objects.get_or_create(comment=comment_obj, user=request.user)
        if not flag:
            # 表示用户取消点赞
            record_obj.delete()
            # 同步 denormalized 计数
            models.CommentRecord.objects.filter(id=comment_obj.id).update(favor_count=F('favor_count') - 1)
            comment_obj.refresh_from_db()
            return Response({
                "msg": "取消点赞成功",
                "is_favor": False,
                "favor_count": comment_obj.favor_count
            }, status=status.HTTP_200_OK)
        # 点赞成功，同步计数
        models.CommentRecord.objects.filter(id=comment_obj.id).update(favor_count=F('favor_count') + 1)
        comment_obj.refresh_from_db()
        return Response({
            "msg": "点赞成功",
            "is_favor": True,
            "favor_count": comment_obj.favor_count
        }, status=status.HTTP_201_CREATED)
