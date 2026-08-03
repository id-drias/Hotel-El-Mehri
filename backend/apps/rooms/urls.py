"""Routes for Rooms & suites."""

from rest_framework.routers import DefaultRouter

from apps.rooms import views

app_name = "rooms"

router = DefaultRouter()
router.register("", views.RoomViewSet, basename="rooms")

urlpatterns = router.urls
