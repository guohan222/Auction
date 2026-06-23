import base


from api import models


instance = models.News.objects.filter(id=75).first()

models.ViewerRecord.objects.create(news=instance,user_id=1)
models.ViewerRecord.objects.create(news=instance,user_id=2)
models.ViewerRecord.objects.create(news=instance,user_id=3)
models.ViewerRecord.objects.create(news=instance,user_id=4)
models.ViewerRecord.objects.create(news=instance,user_id=5)