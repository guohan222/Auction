import base

from api import models


for i in range(1,37):
    news_obj = models.News.objects.create(
        cover = 'https://xcx-1412810729.cos.ap-guangzhou.myqcloud.com/1782016357947_7NmoahsjBDwL2adfd93adb300b860f32e18f61542e36.png',
        content = f'还有{i}天放假',
        topic_id = 1,
        user_id=1,
    )

    models.NewsDetail.objects.create(
        key = '1782016357947_7NmoahsjBDwL2adfd93adb300b860f32e18f61542e36.png',
        cos_path='https://xcx-1412810729.cos.ap-guangzhou.myqcloud.com/1782016357947_7NmoahsjBDwL2adfd93adb300b860f32e18f61542e36.png',
        news=news_obj,
    )


    models.NewsDetail.objects.create(
        key = '	1782034007896_SAkdaVh8JWhhbd15dd0a80a1e66ca5fa335b35f0970b.png',
        cos_path='https://xcx-1412810729.cos.ap-guangzhou.myqcloud.com/1782034007896_SAkdaVh8JWhhbd15dd0a80a1e66ca5fa335b35f0970b.png',
        news=news_obj,
    )
