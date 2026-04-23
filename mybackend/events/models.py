from django.db import models
import uuid
from django.conf import settings
from django.utils import timezone
from django.db.models import Count, Q


class Event(models.Model):
    """
    An event created by a user.  Participants will vote on one or more EventOptions.
    """
    class EventType(models.TextChoices):
        DURATION = 'DURATION', 'Duration'
        TIMESLOT = 'TIMESLOT', 'Time Slot'

    id = models.UUIDField(primary_key=True,
                          default=uuid.uuid4,
                          editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    event_type = models.CharField(
        max_length=10,
        choices=EventType.choices,
        help_text="Choose 'Duration' (one continuous block) or 'Time Slot' (multiple date/time options)."
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='created_events',
        on_delete=models.CASCADE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    # Optional: cut‐off time for voting
    deadline = models.DateTimeField(
        blank=True,
        null=True,
        help_text="After this date/time no more votes are accepted."
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @property
    def is_open(self):
        """True if voting is still open (no deadline or now < deadline)."""
        return self.deadline is None or timezone.now() < self.deadline

    def get_participation_summary(self):
        """
        Returns a dict mapping each option.id → { 'available': x, 'maybe': y, 'unavailable': z }
        """
        summary = {}
        for opt in self.options.all():
            counts = opt.availabilities.aggregate(
                available=Count('id', filter=Q(status=Availability.Status.AVAILABLE)),
                maybe=Count('id',     filter=Q(status=Availability.Status.MAYBE)),
                unavailable=Count('id', filter=Q(status=Availability.Status.UNAVAILABLE)),
            )
            summary[opt.id] = counts
        return summary

    def find_best_option(self):
        """
        Annotates each option with available_count, maybe_count and returns
        the one with the highest available_count (tie broken by maybe_count).
        """
        qs = self.options.annotate(
            available_count=Count('availabilities',
                                  filter=Q(availabilities__status=Availability.Status.AVAILABLE)),
            maybe_count=Count('availabilities',
                              filter=Q(availabilities__status=Availability.Status.MAYBE)),
        ).order_by('-available_count', '-maybe_count')
        return qs.first()


class EventOption(models.Model):
    """
    A single possible timeslot (or duration block) for an Event.
    """
    event = models.ForeignKey(
        Event,
        related_name='options',
        on_delete=models.CASCADE
    )
    start = models.DateTimeField()
    end = models.DateTimeField()
    # Optional display‐order field if you want to preserve the order they were created
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'start']
        unique_together = ('event', 'start', 'end')

    def __str__(self):
        return f"{self.event.title}: {self.start.isoformat()} → {self.end.isoformat()}"


class Participant(models.Model):
    """
    A person (registered user or external) invited to vote on an Event.
    """
    event = models.ForeignKey(
        Event,
        related_name='participants',
        on_delete=models.CASCADE
    )
    # If they’re a registered Django user, link them.  If not, they can still vote via token/email.
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
        related_name='participations'
    )
    name = models.CharField(
        max_length=100,
        help_text="Display name (for external participants)."
    )
    email = models.EmailField(
        help_text="Email address (required even for registered users)."
    )
    # If they’re not registered, we send them a unique link containing this token
    token = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True
    )
    invited_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('event', 'email')
        ordering = ['invited_at']

    def __str__(self):
        return self.name or self.email


class Availability(models.Model):
    """
    Stores one participant’s vote/status for a single EventOption.
    """
    class Status(models.TextChoices):
        UNAVAILABLE = 'UNAVAILABLE', 'Unavailable'
        MAYBE       = 'MAYBE',       'Maybe'
        AVAILABLE   = 'AVAILABLE',   'Available'

    participant = models.ForeignKey(
        Participant,
        related_name='availabilities',
        on_delete=models.CASCADE
    )
    option = models.ForeignKey(
        EventOption,
        related_name='availabilities',
        on_delete=models.CASCADE
    )
    status = models.CharField(
        max_length=11,
        choices=Status.choices,
        default=Status.MAYBE,
        help_text="Available / Maybe / Unavailable"
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('participant', 'option')

    def __str__(self):
        return f"{self.participant}: {self.option.start} → {self.get_status_display()}"