import base

from api import models

first_1 = models.CommentRecord.objects.create(
    news_id=75,
    content='1',
    user_id=1,
)

first_1_1 = models.CommentRecord.objects.create(
    news_id=75,
    content='1_1',
    reply=first_1,
    user_id = 1,
    depth=2,
    root=first_1,
)



first_1_2 = models.CommentRecord.objects.create(
    news_id=75,
    content='1_2',
    reply=first_1,
    user_id=1,
    depth=2,
    root=first_1,
)

first_1_1_1 = models.CommentRecord.objects.create(
    news_id=75,
    content='1',
    reply=first_1_1,
    user_id=1,
    depth=3,
    root=first_1,
)


first_2 = models.CommentRecord.objects.create(
    news_id=75,
    content='2',
    user_id=1,
)