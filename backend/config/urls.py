"""Root URL configuration.

Public content lives under /api/v1/. The active language is resolved from the
Accept-Language header (LocaleMiddleware), so the Next.js frontend just
forwards the locale of the current route.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

api_v1 = [
    path("auth/", include("apps.accounts.urls")),
    # Everything under /admin/ requires a console role. Kept in one prefix so
    # infrastructure can guard it as a block.
    path("admin/", include("apps.dashboard.urls")),
    path("rooms/", include("apps.rooms.urls")),
    path("gallery/", include("apps.gallery.urls")),
    path("services/", include("apps.services.urls")),
    path("reservations/", include("apps.reservations.urls")),
    path("reviews/", include("apps.reviews.urls")),
    path("blog/", include("apps.blog.urls")),
    path("contact/", include("apps.contact.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include((api_v1, "api"), namespace="v1")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
