"""Serializers for registration, the current user, and JWT issuance."""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.accounts.models import GuestProfile

User = get_user_model()


class RoleTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Puts the role into the access token.

    The frontend needs to know whether to render the console without a second
    round trip. The claim is convenience for the *client* only — every endpoint
    still re-reads the role from the database, because a claim is a snapshot of
    whatever was true when the token was minted, and a demoted staff member
    would otherwise keep their access until the token expired.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["name"] = user.get_full_name() or user.username
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["role"] = self.user.role
        data["must_change_password"] = False
        return data


class GuestProfileSerializer(serializers.ModelSerializer):
    """Guest-facing. `internal_notes` is absent by design — see the model."""

    is_vip = serializers.BooleanField(read_only=True)

    class Meta:
        model = GuestProfile
        fields = (
            "vip_tier",
            "is_vip",
            "nationality",
            "date_of_birth",
            "dietary_notes",
            "accessibility_notes",
            "marketing_opt_in",
        )
        # A guest cannot promote themselves to Platinum.
        read_only_fields = ("vip_tier", "is_vip")


class StaffGuestProfileSerializer(GuestProfileSerializer):
    """Console-facing: adds the staff-only fields."""

    class Meta(GuestProfileSerializer.Meta):
        fields = (*GuestProfileSerializer.Meta.fields, "internal_notes")
        read_only_fields = ("is_vip",)


class UserSerializer(serializers.ModelSerializer):
    """The `/auth/me/` payload."""

    guest_profile = GuestProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "preferred_language",
            "role",
            "guest_profile",
        )
        # `role` is read-only here on purpose: privilege escalation via a PATCH
        # to your own profile is the oldest trick there is.
        read_only_fields = ("id", "role", "guest_profile")


class RegisterSerializer(serializers.ModelSerializer):
    """Public registration. Always creates a GUEST."""

    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    password_confirm = serializers.CharField(write_only=True, style={"input_type": "password"})

    class Meta:
        model = User
        fields = (
            "username",
            "email",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
            "phone_number",
            "preferred_language",
        )

    def validate_email(self, value: str) -> str:
        value = value.lower().strip()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_password(self, value: str) -> str:
        # Django's configured validators — length, commonness, numeric-only,
        # similarity to the username.
        validate_password(value)
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "The two passwords differ."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        password = validated_data.pop("password")

        # `role` is never read from the request body. Even if a caller posts
        # `"role": "admin"`, it is not in `fields`, so it cannot arrive here.
        user = User(**validated_data, role=User.Role.GUEST)
        user.set_password(password)
        user.save()

        # Every guest gets a profile up front, so downstream code can rely on
        # `user.guest_profile` existing rather than guarding every access.
        GuestProfile.objects.create(user=user)
        return user


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_current_password(self, value: str) -> str:
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate_new_password(self, value: str) -> str:
        validate_password(value, self.context["request"].user)
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user
