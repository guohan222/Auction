from api import models
from rest_framework.authentication import BaseAuthentication
from rest_framework import exceptions


def _parse_token(request):
    """从 Authorization header 中提取 token，解析失败返回 None"""
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth_header or ' ' not in auth_header:
        return None
    parts = auth_header.split()
    if len(parts) < 2:
        return None
    return parts[1]


class GeneralAuthentication(BaseAuthentication):
    """通用认证组件,针对用户是否登录宽松的接口"""

    def authenticate(self, request):
        token = _parse_token(request)
        if not token:
            return None
        user_obj = models.UserInfo.objects.filter(token=token).first()
        if not user_obj:
            return None
        return user_obj, token


class UserAuthentication(BaseAuthentication):
    """针对用户必须登录的接口"""

    def authenticate(self, request):
        token = _parse_token(request)
        if not token:
            raise exceptions.NotAuthenticated(
                detail='未登录，请先登录',
                code='authentication_required'
            )
        user_obj = models.UserInfo.objects.filter(token=token).first()
        if not user_obj:
            raise exceptions.NotAuthenticated(
                detail='登录已过期，请重新登录',
                code='token_invalid'
            )
        return user_obj, token

