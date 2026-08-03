"""Routes for Photo gallery."""

from rest_framework.routers import DefaultRouter

from apps.gallery import views

app_name = "gallery"

router = DefaultRouter()
router.register("", views.GalleryViewSet, basename="gallery")

urlpatterns = router.urls
