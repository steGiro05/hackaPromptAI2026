from django.utils import timezone
from rest_framework import serializers

from .models import (
    Event,
    EventOption,
    Participant,
    Availability,
)


#
# 1) SERIALIZERS FOR THE CORE MODELS
#


class EventOptionSerializer(serializers.ModelSerializer):
    """
    Serializer for a single proposed time‐slot/duration block (EventOption).
    Used both as a nested write in EventSerializer.create
    and as a standalone representation on reads.
    """
    id = serializers.UUIDField(read_only=True)

    class Meta:
        model = EventOption
        fields = ('id', 'start', 'end')
        # you could add 'order' here if you care about preserving creation order


class AvailabilitySerializer(serializers.ModelSerializer):
    """
    Serializer for one Availability record (a single participant's vote on one EventOption).
    Used nested inside ParticipantPreferenceSerializer.
    """
    option = serializers.PrimaryKeyRelatedField(
        queryset=EventOption.objects.all()
    )
    status = serializers.ChoiceField(choices=Availability.Status.choices)

    class Meta:
        model = Availability
        fields = ('option', 'status')


class ParticipantSerializer(serializers.ModelSerializer):
    """
    Simple serializer for Participant.
    You may not expose token publicly, but it's here for completeness.
    """
    class Meta:
        model = Participant
        fields = ('id', 'name', 'email', 'invited_at', 'token')
        read_only_fields = ('id', 'invited_at', 'token')


#
# 2) NESTED CREATE FOR EVENT + OPTIONS
#


class EventSerializer(serializers.ModelSerializer):
    """
    Serializer for Event.  Supports nested creation of EventOption slots.
    Also includes a read‐only best_option field (your 'best match').
    """
    id = serializers.UUIDField(read_only=True)
    created_by = serializers.PrimaryKeyRelatedField(
        read_only=True,
        help_text="Automatically set to the current user (in the view)."
    )
    created_at = serializers.DateTimeField(read_only=True)
    # Accept a list of slots on create
    options = EventOptionSerializer(many=True)
    # Expose if voting is still open
    is_open = serializers.BooleanField(read_only=True)
    # Include the best‐option summary if you want
    best_option = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = (
            'id',
            'title',
            'description',
            'event_type',
            'deadline',
            'created_by',
            'created_at',
            'is_open',
            'options',
            'best_option',
        )

    def validate_deadline(self, value):
        """
        Make sure deadline (if provided) isn't in the past.
        """
        if value and value < timezone.now():
            raise serializers.ValidationError("deadline cannot be in the past")
        return value

    def create(self, validated_data):
        """
        Override create() to pop off the nested 'options' list,
        create the Event, then bulk‐create the EventOption rows.
        """
        options_data = validated_data.pop('options', [])

        # Expect the view to pass request.user in the context
        user = self.context['request'].user
        event = Event.objects.create(created_by=user, **validated_data)

        # Now create each EventOption
        for slot in options_data:
            EventOption.objects.create(event=event, **slot)

        return event

    # ✅ ADD THIS METHOD
    def update(self, instance, validated_data):
        """
        Override update() to handle nested 'options' list.
        Strategy: Replace all options with the new ones.
        """
        options_data = validated_data.pop('options', None)

        # Update Event fields
        instance.title = validated_data.get('title', instance.title)
        instance.description = validated_data.get('description', instance.description)
        instance.event_type = validated_data.get('event_type', instance.event_type)
        instance.deadline = validated_data.get('deadline', instance.deadline)
        instance.save()

        # Update options if provided
        if options_data is not None:
            # Delete existing options and create new ones
            instance.options.all().delete()
            
            for slot in options_data:
                EventOption.objects.create(event=instance, **slot)

        return instance

    def get_best_option(self, obj):
        """
        Returns the best‐matching EventOption (if any) as nested JSON.
        """
        best = obj.find_best_option()
        if not best:
            return None
        return EventOptionSerializer(best).data

#
# 3) COLLECTING A SINGLE PARTICIPANT'S PREFERENCES AT ONCE
#


class ParticipantPreferenceSerializer(serializers.Serializer):
    """
    This non‐ModelSerializer lets us:
      - accept name/email for a Participant
      - accept a list of {option, status}
      - create the Participant + all their Availability votes in one shot
    """
    name = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    availabilities = AvailabilitySerializer(many=True, allow_empty=False)

    def validate_availabilities(self, value):
        """
        Optionally enforce that the participant votes on every slot,
        or at least one, etc.
        """
        if not value:
            raise serializers.ValidationError("Must supply at least one availability")
        return value

    def create(self, validated_data):
        """
        Create the Participant, then their Availability rows,
        all tied back to the Event passed in via context.
        """
        event = self.context.get('event')
        if event is None:
            raise serializers.ValidationError("Event must be provided in serializer context")

        # Create the Participant record (auto‐generates token, invited_at, etc.)
        participant = Participant.objects.create(
            event=event,
            name=validated_data['name'],
            email=validated_data['email']
        )

        # Create each Availability for this participant
        for avail in validated_data['availabilities']:
            Availability.objects.create(
                participant=participant,
                option=avail['option'],
                status=avail['status']
            )

        return participant