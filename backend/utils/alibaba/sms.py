import json
import random
from typing import List
from django.conf import settings

from alibabacloud_dypnsapi20170525.client import Client as Dypnsapi20170525Client
from alibabacloud_credentials.client import Client as CredentialClient
from alibabacloud_tea_openapi import models as open_api_models
from alibabacloud_dypnsapi20170525 import models as dypnsapi_20170525_models
from alibabacloud_tea_util import models as util_models
from alibabacloud_tea_util.client import Client as UtilClient


class Sample:
    def __init__(self, sign_name: str = '速通互联验证码', template_code: str = '100001'):
        self.client = self.create_client()
        self.sign_name = sign_name
        self.template_code = template_code

    @staticmethod
    def create_client() -> Dypnsapi20170525Client:
        """
        使用凭据初始化账号Client
        @return: Client
        @throws Exception
        """
        config = open_api_models.Config(
            access_key_id=settings.ALIYUN_ACCESS_KEY_ID,
            access_key_secret=settings.ALIYUN_ACCESS_KEY_SECRET,
            endpoint="dypnsapi.aliyuncs.com"
        )
        return Dypnsapi20170525Client(config)

    @staticmethod
    def gen_code() -> str:
        """生成6位随机数字验证码"""
        return ''.join(random.choices('0123456789', k=6))

    def send_code(self, phone: str, code: str, expire_min: int = 1):
        """
        发送验证码
        :param phone: 接收手机号
        :param expire_min: 有效期分钟
        :return: 阿里云返回结果
        """
        send_sms_verify_code_request = dypnsapi_20170525_models.SendSmsVerifyCodeRequest(
            phone_number = phone,
            sign_name=self.sign_name,
            template_code=self.template_code,
            template_param=json.dumps({"code":code,"min":str(expire_min)})
        )
        runtime = util_models.RuntimeOptions()
        try:
            resp = self.client.send_sms_verify_code_with_options(send_sms_verify_code_request, runtime)
            print(json.dumps(resp, default=str, indent=2))
            if resp.body.code == 'OK' and resp.body.success == True:
                return True

        except Exception as error:
            print(error.message)
            print(error.data.get("Recommend"))

    def verify_code(self, phone: str, user_input_code: str):
        """校验短信验证码"""
        check_sms_verify_code_request = dypnsapi_20170525_models.CheckSmsVerifyCodeRequest(
            phone_number=phone,
            verify_code=user_input_code
        )
        runtime = util_models.RuntimeOptions()
        try:
            resp = self.client.check_sms_verify_code_with_options(check_sms_verify_code_request, runtime)
            print(json.dumps(resp, default=str, indent=2))
        except Exception as error:
            print(error.message)
            print(error.data.get("Recommend"))

alibaba_sms = Sample()
