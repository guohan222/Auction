import base

from api import models

models.Topic.objects.create(title='秋招',count=999)
models.Topic.objects.create(title='实习',count=666)
models.Topic.objects.create(title='春运',count=100000)