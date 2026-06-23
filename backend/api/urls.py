from api.views import auth,news
from django.urls import path


urlpatterns = [
    path('login/', auth.LoginView.as_view()),
    path('message/', auth.MessageView.as_view()),
    path('credential/', auth.CredentialView.as_view()),


    path('news/', news.NewView.as_view()),
    path('topic/', news.TopicView.as_view()),

    path('news/<int:pk>', news.NewsDetailView.as_view()),
    path('comment/', news.CommentView.as_view()),

]
