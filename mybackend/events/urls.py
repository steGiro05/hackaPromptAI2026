from django.urls import path
from events.views import (
    EventListCreateView,
    EventRetrieveUpdateDestroyView,
    PreferenceSubmitView,
    BestMatchView,
)

urlpatterns = [
    path('', EventListCreateView.as_view(), name='event-list-create'),
    path('<uuid:pk>/', EventRetrieveUpdateDestroyView.as_view(), name='event-detail'),
    path('<uuid:event_pk>/preferences/', PreferenceSubmitView.as_view(), name='preference-submit'),
    path('<uuid:event_pk>/best_match/', BestMatchView.as_view(), name='event-best-match'),
]