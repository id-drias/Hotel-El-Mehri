"""Routes for Reservation requests."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.reservations import views

app_name = "reservations"

router = DefaultRouter()
router.register("", views.ReservationViewSet, basename="reservations")

urlpatterns = [
    # Declared before the router so `availability/` is not swallowed by the
    # detail route, whose `reference` lookup would otherwise match it.
    path("availability/", views.AvailabilityView.as_view(), name="availability"),
    *router.urls,
]
