"""Routes for Restaurants, wellness & events."""

from rest_framework.routers import DefaultRouter

from apps.services import views

app_name = "services"

router = DefaultRouter()
router.register("", views.ServiceViewSet, basename="services")

urlpatterns = router.urls
