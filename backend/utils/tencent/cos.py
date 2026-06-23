
from qcloud_cos import CosConfig
from qcloud_cos import CosS3Client
from qcloud_cos.cos_exception import CosServiceError

import datetime
import random
from django.conf import settings


# 创建桶
def create_bucket(bucket, region='ap-guangzhou'):
    """
    创建桶
    :param bucket: 桶名
    :param region: 区域
    :return:
    """
    config = CosConfig(Region=region, SecretId=settings.TENCENT_COS_ID, SecretKey=settings.TENCENT_COS_KEY)
    client = CosS3Client(config)
    client.create_bucket(
        Bucket=bucket,
        ACL='public-read'  # private私有读写   public-read    public-read-write
    )

    # 为桶设置跨域访问规则
    cors_config = {
        'CORSRule': [
            {
                'AllowedOrigin': '*',
                'AllowedMethod': ['GET', 'PUT', 'HEAD', 'POST', 'DELETE'],
                'AllowedHeader': "*",
                'ExposeHeader': "*",
                'MaxAgeSeconds': 500
            }
        ]
    }

    client.put_bucket_cors(
        Bucket=bucket,
        CORSConfiguration=cors_config
    )











# 上传文件
def upload_file(bucket, region, file_obj, key):
    """
    上传文件
    :param bucket: 桶名
    :param region: 区域
    :param file_obj: 文件对象
    :param key: cos中的文件名
    :return:
    """
    config = CosConfig(Region=region, SecretId=settings.TENCENT_COS_ID, SecretKey=settings.TENCENT_COS_KEY)
    client = CosS3Client(config)
    client.upload_file_from_buffer(
        Bucket=bucket,
        Body=file_obj,  # 待上传的文件对象
        Key=key,  # 上传到桶之后的文件名
    )

    return f'https://{bucket}.cos.{region}.myqcloud.com/{key}'










# 获取凭证
def credential(bucket='xcx-1412810729', region='ap-guangzhou', key=None):
    """ 获取cos上传临时凭证 """
    from sts.sts import Sts

    config = {
        # 临时密钥有效时长，单位是秒
        'duration_seconds': 1800,
        # 固定密钥 id
        'secret_id': settings.TENCENT_COS_ID,
        # 固定密钥 key
        'secret_key': settings.TENCENT_COS_KEY,
        # 换成你的 bucket
        'bucket': 'xcx-1412810729',
        # 换成 bucket 所在地区
        'region': 'ap-guangzhou',
        # 这里改成允许的路径前缀
        'allow_prefix': '*',
        # 密钥的权限列表
        'allow_actions': [
            # 简单上传
            "cos:PutObject",
            "cos:PostObject",
            # 分块上传
            "cos:InitiateMultipartUpload",
            "cos:ListMultipartUploads",
            "cos:ListParts",
            "cos:UploadPart",
            "cos:CompleteMultipartUpload",
        ],
    }

    sts = Sts(config)
    response = sts.get_credential()
    credential_dic = dict(response)
    credential_info = credential_dic.get("credentials")

    credential_data = {
        "bucket": config.get("bucket"),
        "region": config.get("region"),
        # "key": key,
        "startTime": credential_dic.get("startTime"),
        "expiredTime": credential_dic.get("expiredTime"),
        "requestId": credential_dic.get("requestId"),
        "expiration": credential_dic.get("expiration"),
        "credentials": {
            "tmpSecretId": credential_info.get("tmpSecretId"),
            "tmpSecretKey": credential_info.get("tmpSecretKey"),
            "sessionToken": credential_info.get("sessionToken"),
        },
    }

    return credential_data




# 删除文件
def del_file(bucket, region, key):
    config = CosConfig(Region=region, SecretId=settings.TENCENT_COS_ID, SecretKey=settings.TENCENT_COS_KEY)
    client = CosS3Client(config)

    client.delete_object(
        Bucket=bucket,
        Key=key
    )










# 删除多个文件
def del_file_list(bucket, region, key_list):
    """
    :param key_list:
    [{
        'Key1':xxx

    },{
        'Key2':xxx
    },]
    """
    config = CosConfig(Region=region, SecretId=settings.TENCENT_COS_ID, SecretKey=settings.TENCENT_COS_KEY)
    client = CosS3Client(config)
    objects = key_list
    client.delete_objects(
        Bucket=bucket,
        Delete={
            'Object': objects
        }
    )






# 检查文件是否存在
def check_file(bucket, region, key):
    config = CosConfig(Region=region, SecretId=settings.TENCENT_COS_ID, SecretKey=settings.TENCENT_COS_KEY)
    client = CosS3Client(config)

    data = client.head_object(
        Bucket=bucket,
        Key=key
    )

    return data




# 删除桶
def delete_bucket(bucket, region):
    """
    删除桶中所有文件
    删除桶中所有碎片
    删除桶
    """
    config = CosConfig(Region=region, SecretId=settings.TENCENT_COS_ID, SecretKey=settings.TENCENT_COS_KEY)
    client = CosS3Client(config)

    try:
        # 找到文件&删除
        while True:
            part_objs = client.list_objects(bucket)
            """
            {
                'Name': '17340563297-1775050064-1412810729', 
                'EncodingType': 'url', 
                ...
                'IsTruncated': 'false', 
                'Contents':[
                    {
                        'Key':xxx,
                        'ETag':xxx,
                        ...
                    },
                ]
            """
            print(f'删除项目：删除桶中文件时part_objs={part_objs}')

            # 判断是否已删除完毕
            contents = part_objs.get('Contents')
            if not contents:
                break

            # 批量删除
            objects = [{'Key':item['Key']} for item in contents]
            client.delete_objects(
                Bucket=bucket,
                Delete={
                    'Object': objects
                }
            )

            # 判断part_objs是不是被截断的，因为part_objs是获取部分，如果是被截断的就代表后面还有，如果不是则代表桶里面没有文件了
            if part_objs['IsTruncated'] == 'false':
                break

        # 找到碎片文件&删除
        while True:
            part_uploads = client.list_multipart_uploads(bucket)
            uploads = part_uploads.get('Upload')
            if not uploads:
                break
            for item in uploads:
                client.abort_multipart_upload(bucket, item['Key'], item['UploadId'])
            if part_uploads['IsTruncated'] == "false":
                break

        # 删除桶
        client.delete_bucket(bucket)
    except CosServiceError as e:
        pass