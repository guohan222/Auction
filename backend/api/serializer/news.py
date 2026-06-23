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
        viewer_record = models.ViewerRecord.objects.filter(news=obj).all()
        context = {
            'queryset': viewer_record.count(),
            'result': [model_to_dict(item.user,fields=['id','nickname','avatar']) for item in viewer_record],
        }
        return context

    def get_comment(self, obj):
        # 获取所有一级评论
        first_comment = models.CommentRecord.objects.filter(news=obj,depth=1).order_by('-id')[0:10].values(
            'id',
            'content',
            'user__nickname',
            'user__avatar',
            'create_date',
            'depth',
            'favor_count'
        )
        first_comment_id_list = [item['id'] for item in first_comment]

        # 获取所有一级评论下的最新二级评论

        # [{reply_id:1,max_id:9},{reply_id:2,max_id:4},]
        result = models.CommentRecord.objects.filter(news=obj,depth=2,reply_id__in=first_comment_id_list).values('reply_id').annotate(max_id=Max('id'))
        hot_second_id_list = [item['max_id'] for item in result]
        hot_second_comment = models.CommentRecord.objects.filter(id__in=hot_second_id_list).values(
            'id',
            'content',
            'user__nickname',
            'user__avatar',
            'create_date',
            'reply_id',
            'reply__user__nickname',
            'depth',
            'favor_count'
        )


        comment_tree = {
            item['id']:{**item,'create_date':item['create_date'].strftime("%Y-%m-%d"),'children':[]}
            for item in first_comment
        }
        for item in hot_second_comment:
            item['create_date'] = item['create_date'].strftime("%Y-%m-%d")
            comment_tree[item['reply_id']]['children'].append(item)

        return comment_tree.values()




class ListCommentSerializer(serializers.ModelSerializer):
    create_date = serializers.DateTimeField(format='%Y-%m-%d')
    user__nickname = serializers.CharField(source='user.nickname')
    user__avatar = serializers.CharField(source='user.avatar')
    # allow_null=True 序列化时如果是一级评论（没有reply）不加这个则None.xx直接报错
    # 加上这个代表序列化时如果发现他为空跳过，则不再去点出其属性，避免AttributeError报错
    reply_id = serializers.IntegerField(source='reply.id',allow_null=True)
    reply__user__nickname = serializers.CharField(source='reply.user.nickname',allow_null=True)
    class Meta:
        model = models.CommentRecord
        exclude = ('root','news','user','reply')



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

























