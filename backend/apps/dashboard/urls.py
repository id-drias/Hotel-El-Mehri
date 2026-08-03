"""Routes for the admin console API.

Everything here sits under /api/v1/admin/ and requires a console role. Keeping
the privileged routes in one namespace means a reverse proxy or WAF can apply a
blanket rule to the prefix, without enumerating endpoints.
"""

from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.dashboard import admin_views

app_name = "dashboard"

router = DefaultRouter()
router.register("reservations", admin_views.AdminReservationViewSet, basename="admin-reservations")
router.register("rooms", admin_views.RoomInventoryViewSet, basename="admin-rooms")
router.register("units", admin_views.RoomUnitViewSet, basename="admin-units")
router.register("concierge", admin_views.ConciergeRequestViewSet, basename="admin-concierge")
router.register("experiences", admin_views.ExperienceBookingViewSet, basename="admin-experiences")
router.register("audit", admin_views.AuditLogViewSet, basename="admin-audit")

urlpatterns = [
    path("analytics/overview/", admin_views.ExecutiveStatsAPIView.as_view(), name="stats"),
    path("analytics/occupancy/", admin_views.OccupancySeriesAPIView.as_view(), name="occupancy"),
    *router.urls,
]
