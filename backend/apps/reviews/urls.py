"""Routes for Guest reviews."""

from rest_framework.routers import DefaultRouter

from apps.reviews import views

app_name = "reviews"

router = DefaultRouter()
router.register("", views.ReviewViewSet, basename="reviews")

urlpatterns = router.urls
