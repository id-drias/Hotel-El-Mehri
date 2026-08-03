"""Routes for Contact messages."""

from rest_framework.routers import DefaultRouter

from apps.contact import views

app_name = "contact"

router = DefaultRouter()
router.register("", views.ContactMessageViewSet, basename="contact")

urlpatterns = router.urls
