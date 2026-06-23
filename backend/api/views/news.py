from api import models

from django.db.models import F
from rest_framework.generics import CreateAPIView, ListAPIView,RetrieveAPIView

from utils.auth import GeneralAuthentication,UserAuthentication
from utils.pageination import MyLimitOffsetPagination
from utils.filters import PullDownRefreshFilter,ReachButtonFilter,CommentFilter,NewsFilter
from api.serializer.news import CreateNewsSerializer,ListNewsSerializer,TopicSerializer,RetrieveNewsDetailSerializer,ListCommentSerializer,CreateCommentSerializer








############################################### 创建展示动态 ##################################################
class NewView(CreateAPIView, ListAPIView):
    """
    发布动态
    """
    queryset = models.News.objects.all().order_by('-id')
    pagination_class = MyLimitOffsetPagination
    filter_backends = [PullDownRefreshFilter,ReachButtonFilter]

    def perform_create(self, serializer):
        # 序列化器执行save前会执行create方法   BaseSerializer -> save -> self.create(validated_data)
        # 则可以修改这个create方法,定制一些操作：创建news后再去创建newsdetail。（如果不写序列化器只会保存该对应的数据）
        news_obj = serializer.save(user_id=2)

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ListNewsSerializer
        if self.request.method == 'POST':
            return CreateNewsSerializer



class TopicView( ListAPIView):
    queryset = models.Topic.objects.all()
    serializer_class = TopicSerializer
    filter_backends = [PullDownRefreshFilter,ReachButtonFilter]
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
        viewer_record_obj, flag = models.ViewerRecord.objects.get_or_create(news=news_obj,user=request.user)
        # flag为False则代表该用户访问过
        if not flag:
            return response
        # 没有访问过，则此次应该将该动态的访问次数加一
        models.News.objects.filter(id=news_obj.id).update(viewer_count=F('viewer_count')+1)
        return response












class CommentView(CreateAPIView,ListAPIView):
    """
    查看,发布评论
    """
    queryset = models.CommentRecord.objects.all()
    serializer_class = ListCommentSerializer
    pagination_class = MyLimitOffsetPagination

    # 排查bug点一
    filter_backends = [CommentFilter,NewsFilter,ReachButtonFilter]



    def get_authenticators(self):
        """
        争对不同接口对用户是否登录的力度返回不同认证类：重写源码执行过程：dispatch -》initialize_request -》 get_authenticators
        :return:
        """
        if self.request.method == 'GET':
            return [GeneralAuthentication(),]
        if self.request.method == 'POST':
            return [UserAuthentication(),]

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ListCommentSerializer
        if self.request.method == 'POST':
            return CreateCommentSerializer



    def perform_create(self, serializer):
        serializer.save(user_id=2)






