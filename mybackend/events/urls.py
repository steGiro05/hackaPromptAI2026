from django.urls import path
from events.views import (
    EventListCreateView,
    EventRetrieveUpdateDestroyView,
    PreferenceSubmitView,
    BestMatchView,
)

urlpatterns = [
    path('api/events/', EventListCreateView.as_view(), name='event-list-create'),
    path('api/events/<uuid:pk>/', EventRetrieveUpdateDestroyView.as_view(), name='event-detail'),
    path('api/events/<uuid:event_pk>/preferences/',
         PreferenceSubmitView.as_view(),
         name='preference-submit'),
    path('api/events/<uuid:event_pk>/best_match/',
         BestMatchView.as_view(),
         name='event-best-match'),
]