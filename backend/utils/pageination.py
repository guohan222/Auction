from rest_framework.response import Response
from rest_framework.pagination import LimitOffsetPagination

class MyLimitOffsetPagination(LimitOffsetPagination):
    """自定义分页"""
    default_limit = 10
    max_limit = 20
    limit_query_param = 'limit'
    offset_query_param = 'offset'

    def get_paginated_response(self, data):
        return Response({
            'results': data
        })