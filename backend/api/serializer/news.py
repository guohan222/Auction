from datetime import datetime

from api import models
from django.db.models import F
from rest_framework import serializers
from django.forms import model_to_dict
from django.db.models import Max




############################################### 创建展示动态 ##################################################

class CreateNewsDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.NewsDetail
        exclude = ('news',)


class CreateNewsSerializer(serializers.ModelSerializer):
    imageList = CreateNewsDetailSerializer(many=True)

    class Meta:
        model = models.News
        exclude = ('user', 'viewer_count', 'comment_count', 'favor_count')

    def create(self, validated_data):
        # 先将前端传来的数据中image_list剔除,以便创建新的news
        image_list = validated_data.pop('imageList')
        # 创建news（在调用save时传过来了user）
        news_obj = models.News.objects.create(**validated_data)

        # 批量创建newsdetail
        models.NewsDetail.objects.bulk_create([models.NewsDetail(**item, news=news_obj) for item in image_list])

        # 给这个新创建的news对象挂上image_list，便于请求完毕后展示给前端看（符合restfull规范）
        news_obj.imageList = image_list

        # 判断这个news有没有关联话题，如果有则话题关注度加一
        if news_obj.topic:
            # 数据库层面原子自增，避免并发冲突
            news_obj.topic.count = F("count") + 1
            news_obj.topic.save(update_fields=["count"])
        return news_obj


class ListNewsSerializer(serializers.ModelSerializer):
    topic = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()

    class Meta:
        model = models.News
        exclude = ('address',)

    def get_topic(self, obj):
        if obj.topic:
            return model_to_dict(obj.topic, fields=['id', 'title'])
        return None

    def get_user(self, obj):
        if obj.user:
            return model_to_dict(obj.user, fields=['id', 'nickname', 'avatar'])
        return None



class TopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Topic
        fields = '__all__'






############################################## 动态详细 #################################################


class RetrieveNewsDetailSerializer(serializers.ModelSerializer):
    topic = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()
    imageList = serializers.SerializerMethodField()
    create_date = serializers.DateTimeField(format='%Y-%m-%d')
    viewer = serializers.SerializerMethodField()
    comment = serializers.SerializerMethodField()
    is_favor = serializers.SerializerMethodField()

    class Meta:
        model = models.News
        exclude = ('cover',)

    def get_topic(self, obj):
        return model_to_dict(obj.topic,fields=['id','title'])

    def get_user(self, obj):
        return model_to_dict(obj.user,fields=['id','nickname', 'avatar'])

    def get_imageList(self, obj):
        return [model_to_dict(news_detail_obj,fields=['id','cos_path']) for news_detail_obj in models.NewsDetail.objects.filter(news=obj)]

    def get_viewer(self, obj):
        # 按用户去重，同一用户多次浏览只展示一次
        viewer_user_ids = models.ViewerRecord.objects.filter(news=obj).values_list('user_id', flat=True).distinct()
        viewer_users = models.UserInfo.objects.filter(id__in=list(viewer_user_ids))
        context = {
            'queryset': viewer_users.count(),
            'result': [model_to_dict(u, fields=['id', 'nickname', 'avatar']) for u in viewer_users],
        }
        return context

    def get_comment(self, obj):
        user = self.context['request'].user

        # 获取所有一级评论
        first_comment = models.CommentRecord.objects.filter(news=obj, depth=1).order_by('-id')[0:10]
        first_comment_id_list = [item.id for item in first_comment]

        # 获取所有一级评论下的最新二级评论
        result = models.CommentRecord.objects.filter(news=obj, depth=2, reply_id__in=first_comment_id_list).values('reply_id').annotate(max_id=Max('id'))
        hot_second_id_list = [item['max_id'] for item in result]
        hot_second_comment = models.CommentRecord.objects.filter(id__in=hot_second_id_list)

        # 当前用户点过赞的评论 id 集合
        all_comment_ids = set(first_comment_id_list) | set(hot_second_id_list)
        favor_ids = set()
        if user:
            favor_ids = set(models.CommentFavorRecord.objects.filter(
                comment_id__in=all_comment_ids, user=user
            ).values_list('comment_id', flat=True))

        def _build_comment(comment):
            return {
                'id': comment.id,
                'content': comment.content,
                'user__nickname': comment.user.nickname,
                'user__avatar': comment.user.avatar or '',
                'create_date': comment.create_date.strftime("%Y-%m-%d"),
                'depth': comment.depth,
                'favor_count': comment.favor_count,
                'is_favor': comment.id in favor_ids,
                'reply_id': comment.reply_id,
            }

        comment_tree = {}
        for item in first_comment:
            comment_tree[item.id] = {**_build_comment(item), 'children': []}

        for item in hot_second_comment:
            if item.reply_id in comment_tree:
                comment_tree[item.reply_id]['children'].append(_build_comment(item))

        return comment_tree.values()


    def get_is_favor(self, obj):
        user_obj = self.context['request'].user
        if not user_obj:
            return False
        exists = models.NewsFavorRecord.objects.filter(news=obj,user=user_obj).exists()
        return exists




class ListCommentSerializer(serializers.ModelSerializer):
    create_date = serializers.DateTimeField(format='%Y-%m-%d')
    user__nickname = serializers.CharField(source='user.nickname')
    user__avatar = serializers.CharField(source='user.avatar')
    # allow_null=True 序列化时如果是一级评论（没有reply）不加这个则None.xx直接报错
    # 加上这个代表序列化时如果发现他为空跳过，则不再去点出其属性，避免AttributeError报错
    reply_id = serializers.IntegerField(source='reply.id', allow_null=True)
    reply__user__nickname = serializers.CharField(source='reply.user.nickname', allow_null=True)
    is_favor = serializers.SerializerMethodField()

    class Meta:
        model = models.CommentRecord
        exclude = ('root', 'news', 'user', )

    def get_is_favor(self, obj):
        user = self.context['request'].user
        if not user:
            return False
        return models.CommentFavorRecord.objects.filter(comment=obj, user=user).exists()



class CreateCommentSerializer(serializers.ModelSerializer):
    create_date = serializers.DateTimeField(format='%Y-%m-%d',read_only=True)
    user__nickname = serializers.CharField(source='user.nickname',read_only=True)
    user__avatar = serializers.CharField(source='user.avatar',read_only=True)
    reply_id = serializers.IntegerField(source='reply.id',read_only=True)
    reply__user__nickname = serializers.CharField(source='reply.user.nickname',read_only=True)

    class Meta:
        model = models.CommentRecord
        exclude = ('user','favor_count')


    def create(self, validated_data):
        news_obj = validated_data.get('news')
        print(news_obj.id)
        from django.db.models import F
        obj = models.News.objects.filter(id=news_obj.id).update(comment_count=F('comment_count')+1)
        print('haha',obj)
        return models.CommentRecord.objects.create(**validated_data)




class FavorModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.NewsFavorRecord
        fields = ['news']


class CommentFavorModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.CommentFavorRecord
        fields = ['comment']


















