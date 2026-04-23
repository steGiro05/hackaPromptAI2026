from django.contrib import admin
from .models import Event, EventOption, Participant, Availability


#
# Inlines
#


class EventOptionInline(admin.TabularInline):
    """
    Edit time‐slot/duration options right on the Event page.
    """
    model = EventOption
    extra = 1
    fields = ('start', 'end', 'order')
    ordering = ('order', 'start')


class ParticipantInline(admin.TabularInline):
    """
    Invite/manage participants directly on the Event page.
    """
    model = Participant
    extra = 1
    readonly_fields = ('invited_at', 'token')
    fields = ('name', 'email', 'user', 'invited_at', 'token')
    show_change_link = True


class AvailabilityInline(admin.TabularInline):
    """
    See and tweak a participant’s votes on each slot.
    Used on the Participant admin page.
    """
    model = Availability
    extra = 1
    readonly_fields = ('updated_at',)
    fields = ('option', 'status', 'updated_at')
    ordering = ('option__start',)


#
# ModelAdmins
#


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    """
    Admin view for your core Event.
    Inline its slots and invited participants.
    """
    list_display = (
        'title',
        'event_type',
        'created_by',
        'created_at',
        'deadline',
        'is_open',
    )
    list_filter = ('event_type', 'created_by', 'created_at')
    search_fields = ('title', 'description',)
    readonly_fields = ('created_at',)
    inlines = (EventOptionInline, ParticipantInline)

    def is_open(self, obj):
        return obj.is_open
    is_open.boolean = True
    is_open.short_description = 'Voting Open?'


@admin.register(EventOption)
class EventOptionAdmin(admin.ModelAdmin):
    """
    If you ever need to inspect/edit time‐slots outside of the Event page.
    """
    list_display = ('event', 'start', 'end', 'order')
    list_filter = ('event',)
    search_fields = ('event__title',)
    raw_id_fields = ('event',)
    ordering = ('event', 'order')


@admin.register(Participant)
class ParticipantAdmin(admin.ModelAdmin):
    """
    Manage a single participant and their availabilities.
    """
    list_display = ('name', 'email', 'event', 'user', 'invited_at', 'token')
    list_filter = ('event', 'invited_at')
    search_fields = ('name', 'email')
    raw_id_fields = ('event', 'user')
    readonly_fields = ('invited_at', 'token')
    inlines = (AvailabilityInline,)


@admin.register(Availability)
class AvailabilityAdmin(admin.ModelAdmin):
    """
    A standalone view for all availability‐votes across all participants/events.
    """
    list_display = ('participant', 'option', 'status', 'updated_at')
    list_filter = ('status', 'updated_at')
    search_fields = ('participant__name', 'participant__email')
    raw_id_fields = ('participant', 'option')
    ordering = ('option__event', 'option__start')
