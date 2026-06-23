import  base
from api.models import UserInfo

for i in range(20):
    UserInfo.objects.create(
        phone=f'12345678{i}',
        nickname=f'大卫—{i}',
        avatar='https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4nibH0KlMECNjjGxQUq24ZEaGT4poC6icRiccVGKSyXwibcPq4BWmiaIGuG1icwxaQX6grC9VemZoJ8rg/132'
    )