from api import models
from rest_framework.authentication import BaseAuthentication
from rest_framework import exceptions



class GeneralAuthentication(BaseAuthentication):
    """通用认证组件,针对用户是否登录宽松的接口"""

    def authenticate(self, request):

        auth_header = request.META.get('HTTP_AUTHORIZATION','')
        prefix, token = auth_header.split()
        if not token:
            return None
        user_obj = models.UserInfo.objects.filter(token=token).first()
        if not user_obj:
            return None

        return user_obj, token



class UserAuthentication(BaseAuthentication):
    """针对用户必须登录的接口"""

    def authenticate(self, request):

        auth_header = request.META.get('HTTP_AUTHORIZATION','')
        prefix, token = auth_header.split()
        if not token:
            raise exceptions.AuthenticationFailed()
        user_obj = models.UserInfo.objects.filter(token=token).first()
        if not user_obj:
            raise exceptions.AuthenticationFailed()

        return user_obj, token

