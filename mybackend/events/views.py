from django.shortcuts import render
from django.shortcuts import get_object_or_404

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Event, Participant
from .serializers import (
    EventSerializer,
    ParticipantPreferenceSerializer,
    EventOptionSerializer,
)


#
# Custom permission to let only the creator of an Event change it
#
class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Object‑level permission to only allow creators of an object to edit it.
    Assumes the model instance has a 'created_by' attribute.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True
        # Write permissions are only allowed to the owner of the event.
        return obj.created_by == request.user


#
# 1) EVENT CRUD
#
class EventListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/events/        → list all events owned by request.user
    POST /api/events/        → create a new event (with nested options)
    """
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only show events the user created
        return Event.objects.filter(created_by=self.request.user)

    def perform_create(self, serializer):
        # Hook to set created_by = request.user
        serializer.save(created_by=self.request.user)


class EventRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/events/{pk}/   → retrieve event + nested options + best_option
    PUT    /api/events/{pk}/   → update title/description/deadline & options
    DELETE /api/events/{pk}/   → delete event
    """
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [
        permissions.IsAuthenticatedOrReadOnly,
        IsOwnerOrReadOnly
    ]


#
# 2) SUBMITTING PARTICIPANT PREFERENCES
#
class PreferenceSubmitView(generics.CreateAPIView):
    """
    POST /api/events/{event_pk}/preferences/
      {
        "name": "Alice",
        "email": "alice@example.com",
        "availabilities": [
          {"option": "<uuid‑of‑timeslot1>", "status": "AVAILABLE"},
          {"option": "<uuid‑of‑timeslot2>", "status": "MAYBE"},
           ...
        ]
      }
    Creates a Participant + all their Availability votes at once.
    """
    serializer_class = ParticipantPreferenceSerializer
    permission_classes = [permissions.AllowAny]  # guests can vote too

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        # Pass the Event object into the serializer (used in .create())
        ctx['event'] = get_object_or_404(Event, pk=self.kwargs['event_pk'])
        return ctx


#
# 3) OPTIONAL: ADD A “BEST MATCH” ENDPOINT
#
class BestMatchView(APIView):
    """
    GET /api/events/{event_pk}/best_match/
    Returns the single EventOption that has the most AVAILABLE votes
    (tiebreaker is most MAYBE votes).
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, event_pk):
        event = get_object_or_404(Event, pk=event_pk)
        best = event.find_best_option()
        if not best:
            return Response(
                {"detail": "No options or votes available."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = EventOptionSerializer(best, context={'request': request})
        return Response(serializer.data)

