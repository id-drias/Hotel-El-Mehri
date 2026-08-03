"""Authentication endpoints.

The refresh token travels in an httpOnly cookie, never in the JSON body. That
is the whole point: an XSS on the frontend can read anything JavaScript can
reach, so a refresh token in `localStorage` is a permanent account compromise,
while a 30-minute access token is a bounded one.
"""

from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.accounts.serializers import (
    PasswordChangeSerializer,
    RegisterSerializer,
    UserSerializer,
)
from apps.audit.models import AuditLog, client_ip, record


def _set_refresh_cookie(response: Response, refresh: str) -> Response:
    response.set_cookie(
        settings.REFRESH_COOKIE_NAME,
        refresh,
        httponly=True,
        secure=settings.REFRESH_COOKIE_SECURE,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        path="/api/v1/auth/",
    )
    return response


class RegisterView(generics.CreateAPIView):
    """Public registration. Creates a GUEST and nothing else."""

    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        refresh["role"] = user.role

        response = Response(
            {"user": UserSerializer(user).data, "access": str(refresh.access_token)},
            status=status.HTTP_201_CREATED,
        )
        return _set_refresh_cookie(response, str(refresh))


class LoginView(TokenObtainPairView):
    """Returns the access token in the body, refresh in an httpOnly cookie."""

    permission_classes = [AllowAny]
    throttle_scope = "auth"

    def post(self, request, *args, **kwargs):
        try:
            response = super().post(request, *args, **kwargs)
        except AuthenticationFailed:
            # Logged with the IP because a burst of these from one address is
            # the signal a credential-stuffing attempt actually leaves. The
            # username is recorded; the password never is.
            self._record_failure(request)
            raise

        refresh = response.data.pop("refresh", None)
        if refresh:
            _set_refresh_cookie(response, refresh)
        return response

    def _record_failure(self, request) -> None:
        username = str(request.data.get("username", ""))[:150]
        User = get_user_model()
        # `target` needs an instance; fall back to a detached one so the entry
        # is still written when the username does not exist at all.
        user = User.objects.filter(username=username).first() or User(username=username)
        record(
            action=AuditLog.Action.AUTH_LOGIN_FAILED,
            target=user,
            actor=None,
            changes={"username": username},
            ip_address=client_ip(request),
        )


class CookieTokenRefreshView(TokenRefreshView):
    """Reads the refresh token from the cookie when the body omits it."""

    permission_classes = [AllowAny]
    throttle_scope = "auth"

    def post(self, request, *args, **kwargs):
        if "refresh" not in request.data:
            cookie = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
            if not cookie:
                return Response(
                    {"detail": "No refresh token provided."}, status=status.HTTP_401_UNAUTHORIZED
                )
            request.data["refresh"] = cookie

        response = super().post(request, *args, **kwargs)

        # ROTATE_REFRESH_TOKENS is on, so a fresh refresh comes back each time
        # and the cookie has to be replaced or the next call replays a
        # blacklisted token.
        rotated = response.data.pop("refresh", None)
        if rotated:
            _set_refresh_cookie(response, rotated)
        return response


class LogoutView(APIView):
    """Blacklists the refresh token and clears the cookie."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        cookie = request.COOKIES.get(settings.REFRESH_COOKIE_NAME) or request.data.get("refresh")

        if cookie:
            try:
                RefreshToken(cookie).blacklist()
            except TokenError:
                # Already expired or already blacklisted. Logging out is
                # idempotent — reporting an error here helps nobody.
                pass

        response = Response(status=status.HTTP_204_NO_CONTENT)
        response.delete_cookie(settings.REFRESH_COOKIE_NAME, path="/api/v1/auth/")
        return response


class MeView(generics.RetrieveUpdateAPIView):
    """The caller's own account. Never anybody else's."""

    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "auth"

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
