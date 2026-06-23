from django.db import models


# Create your models here.


class UserInfo(models.Model):
    phone = models.CharField(verbose_name='手机号', max_length=11, unique=True)
    # token = models.CharField(verbose_name='用户Token', max_length=64, unique=True)
    token = models.CharField(verbose_name='用户Token', max_length=64, null=True,blank=True)
    nickname = models.CharField(verbose_name='昵称', max_length=64)
    avatar = models.CharField(verbose_name='头像', max_length=64)






############################################################ 动态 ######################################################

class Topic(models.Model):
    """
    话题表
    """
    title = models.CharField(verbose_name='话题', max_length=64)
    count = models.PositiveIntegerField(verbose_name='关注度', default=0)


class News(models.Model):
    """
    动态
    """
    cover = models.CharField(verbose_name='封面', max_length=128)
    content = models.CharField(verbose_name='内容', max_length=225)
    topic = models.ForeignKey(verbose_name='话题', to=Topic, null=True, blank=True, on_delete=models.CASCADE)
    address = models.CharField(verbose_name='位置', max_length=128, null=True, blank=True)

    user = models.ForeignKey(verbose_name='发布者', to=UserInfo, related_name='news', on_delete=models.CASCADE)
    create_date = models.DateTimeField(verbose_name='创建时间', auto_now_add=True)

    favor_count = models.PositiveIntegerField(verbose_name='点赞数', default=0)
    viewer_count = models.PositiveIntegerField(verbose_name='浏览数', default=0)
    comment_count = models.PositiveIntegerField(verbose_name='评论数', default=0)


class NewsDetail(models.Model):
    """
    动态详细
    """
    key = models.CharField(verbose_name='腾讯对象存储中的文件名', max_length=128,
                           help_text="用于以后在腾讯对象存储中删除")
    cos_path = models.CharField(verbose_name='腾讯对象存储中图片路径', max_length=128)
    news = models.ForeignKey(verbose_name='动态',to=News, on_delete=models.CASCADE)


class ViewerRecord(models.Model):
    """
    浏览记录
    """
    news = models.ForeignKey(verbose_name='动态',to=News, on_delete=models.CASCADE)
    user = models.ForeignKey(verbose_name='用户',to=UserInfo, on_delete=models.CASCADE)


class NewsFavorRecord(models.Model):
    """
    动态赞记录表
    """
    news = models.ForeignKey(verbose_name='动态', to='News',on_delete=models.CASCADE)
    user = models.ForeignKey(verbose_name='点赞用户', to='UserInfo',on_delete=models.CASCADE)


class CommentRecord(models.Model):
    """
    评论记录表
    """
    news = models.ForeignKey(verbose_name='动态', to='News',on_delete=models.CASCADE)

    content = models.CharField(verbose_name='评论内容', max_length=255)
    user = models.ForeignKey(verbose_name='评论者', to='UserInfo',on_delete=models.CASCADE)
    favor_count = models.PositiveIntegerField(verbose_name='赞数', default=0)
    create_date = models.DateTimeField(verbose_name='评论时间', auto_now_add=True)


    reply = models.ForeignKey(verbose_name='回复', to='self', null=True, blank=True,on_delete=models.CASCADE,related_name='replys')
    depth = models.PositiveIntegerField(verbose_name='评论层级', default=1)
    root = models.ForeignKey(verbose_name='根评论',to='self', null=True, blank=True,on_delete=models.CASCADE,related_name='roots')


class CommentFavorRecord(models.Model):
    """
    评论赞记录
    """
    comment = models.ForeignKey(verbose_name='动态', to='CommentRecord',on_delete=models.CASCADE)
    user = models.ForeignKey(verbose_name='点赞用户', to='UserInfo',on_delete=models.CASCADE)