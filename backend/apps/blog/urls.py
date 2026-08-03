"""Routes for News & events."""

from rest_framework.routers import DefaultRouter

from apps.blog import views

app_name = "blog"

router = DefaultRouter()
router.register("", views.ArticleViewSet, basename="blog")

urlpatterns = router.urls
