import uuid


from api import models
from rest_framework.views import APIView
from rest_framework.response import Response
from django_redis import get_redis_connection


from utils.alibaba.sms import alibaba_sms
from utils.tencent.cos import credential
from api.serializer.account import MessageSerializer,LoginSerializer





class MessageView(APIView):
    def get(self, request,*args,**kwargs):

        # 1. 手机格式校验，并获取
        ser = MessageSerializer(data=request.query_params)
        if not ser.is_valid():
            return Response({'status':False,'message':'手机号格式错误'})
        phone = ser.validated_data.get('phone')

        # 2. 生成验证码
        code = alibaba_sms.gen_code()
        print(code)

        # 3. 短信发送至手机
        # res = alibaba_sms.send_code(phone,code)
        # if not res:
        #     return Response({'status':False,'message':'短信发送失败'})

        # 4. 设置短信有效期
        conn = get_redis_connection('default')
        conn.set(phone,code,ex=60)

        return Response({'status':True,'message':'短信发送成功'})





class LoginView(APIView):
    def post(self, request,*args,**kwargs):
        ser = LoginSerializer(data=request.data)
        if not ser.is_valid():
            return Response({'status':False,'message':'验证码错误'})
        phone = ser.validated_data.get('phone')
        # flag表示是否为新创建的，True表示是新创建的
        user_obj, flag = models.UserInfo.objects.get_or_create(phone=phone)
        user_obj.token = str(uuid.uuid4())
        user_obj.save()
        return Response({'status':True,'data':{'token':user_obj.token,'phone':phone}})





class CredentialView(APIView):
    def get(self,request,*args,**kwargs):
        return Response(credential())
















