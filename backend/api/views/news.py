from api import models

from rest_framework.generics import CreateAPIView, ListAPIView,RetrieveAPIView

from utils.pageination import MyLimitOffsetPagination
from utils.filters import PullDownRefreshFilter,ReachButtonFilter,CommentFilter,NewsFilter
from api.serializer.news import CreateNewsSerializer,ListNewsSerializer,TopicSerializer,RetrieveNewsDetailSerializer,ListCommentSerializer,CreateCommentSerializer








############################################### 创建展示动态 ##################################################
class NewView(CreateAPIView, ListAPIView):
    """
    发布动态
    """
    queryset = models.News.objects.all()
    pagination_class = MyLimitOffsetPagination
    filter_backends = [PullDownRefreshFilter,ReachButtonFilter]

    def perform_create(self, serializer):
        # 序列化器执行save前会执行create方法   BaseSerializer -> save -> self.create(validated_data)
        # 则可以修改这个create方法,定制一些操作：创建news后再去创建newsdetail。（如果不写序列化器只会保存该对应的数据）
        news_obj = serializer.save(user_id=1)

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




class CommentView(CreateAPIView,ListAPIView):
    """
    查看评论
    """
    queryset = models.CommentRecord.objects.all()
    serializer_class = ListCommentSerializer
    pagination_class = MyLimitOffsetPagination

    # bug
    filter_backends = [CommentFilter,NewsFilter,ReachButtonFilter]



    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ListCommentSerializer
        if self.request.method == 'POST':
            return CreateCommentSerializer



    def perform_create(self, serializer):
        serializer.save(user_id=2)






