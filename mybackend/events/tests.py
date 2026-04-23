from django.test import TestCase

from types import SimpleNamespace
from django.utils import timezone
from django.contrib.auth import get_user_model

from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from .models import Event, EventOption, Participant, Availability
from .serializers import EventSerializer, ParticipantPreferenceSerializer
from rest_framework.exceptions import ValidationError

User = get_user_model()


#
# 1) MODEL TESTS
#
class EventModelTest(TestCase):
    def setUp(self):
        # create a user and an event with two options
        self.user = User.objects.create_user(username='user1', password='pass1')
        now = timezone.now()
        self.event = Event.objects.create(
            title='Test Event',
            description='An event for testing',
            event_type=Event.EventType.TIMESLOT,
            created_by=self.user,
            deadline=now + timezone.timedelta(days=1),
        )
        # two options
        self.opt1 = EventOption.objects.create(
            event=self.event,
            start=now,
            end=now + timezone.timedelta(hours=1),
            order=0
        )
        self.opt2 = EventOption.objects.create(
            event=self.event,
            start=now + timezone.timedelta(days=1),
            end=now + timezone.timedelta(days=1, hours=1),
            order=1
        )
        # two participants vote
        p1 = Participant.objects.create(event=self.event, name='Alice', email='alice@example.com')
        p2 = Participant.objects.create(event=self.event, name='Bob',   email='bob@example.com')
        # p1: AVAILABLE on opt1, MAYBE on opt2
        Availability.objects.create(participant=p1, option=self.opt1, status=Availability.Status.AVAILABLE)
        Availability.objects.create(participant=p1, option=self.opt2, status=Availability.Status.MAYBE)
        # p2: AVAILABLE on both
        Availability.objects.create(participant=p2, option=self.opt1, status=Availability.Status.AVAILABLE)
        Availability.objects.create(participant=p2, option=self.opt2, status=Availability.Status.AVAILABLE)

    def test_find_best_option(self):
        """
        opt1 has 2 AVAILABLE votes, opt2 has only 1 AVAILABLE → best is opt1
        """
        best = self.event.find_best_option()
        self.assertEqual(best, self.opt1)

    def test_get_participation_summary(self):
        """
        Ensure get_participation_summary returns correct counts for each option.
        """
        summary = self.event.get_participation_summary()

        # opt1: 2 available, 0 maybe, 0 unavailable
        self.assertEqual(summary[self.opt1.id]['available'], 2)
        self.assertEqual(summary[self.opt1.id]['maybe'], 0)
        self.assertEqual(summary[self.opt1.id]['unavailable'], 0)

        # opt2: 1 available, 1 maybe, 0 unavailable
        self.assertEqual(summary[self.opt2.id]['available'], 1)
        self.assertEqual(summary[self.opt2.id]['maybe'], 1)
        self.assertEqual(summary[self.opt2.id]['unavailable'], 0)

    def test_is_open_property(self):
        """
        The event is open if deadline in future, closed if deadline passed.
        """
        self.assertTrue(self.event.is_open)

        # push deadline into the past
        self.event.deadline = timezone.now() - timezone.timedelta(hours=1)
        self.event.save()
        self.assertFalse(self.event.is_open)


#
# 2) SERIALIZER TESTS
#
class EventSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='owner', password='pass2')

    def test_event_serializer_creates_nested_options(self):
        """
        Test that EventSerializer can create an Event with nested EventOption list.
        """
        now = timezone.now()
        data = {
            'title': 'API Created Event',
            'description': 'With nested slots',
            'event_type': Event.EventType.TIMESLOT,
            'deadline': (now + timezone.timedelta(days=2)).isoformat(),
            'options': [
                {'start': now.isoformat(), 'end': (now + timezone.timedelta(hours=1)).isoformat()},
                {'start': (now + timezone.timedelta(days=1)).isoformat(),
                 'end': (now + timezone.timedelta(days=1, hours=1)).isoformat()},
            ],
        }
        # build a fake "request" object so serializer.create() can get .user
        fake_request = SimpleNamespace(user=self.user)
        serializer = EventSerializer(data=data, context={'request': fake_request})
        self.assertTrue(serializer.is_valid(), serializer.errors)

        event = serializer.save()
        # basic fields
        self.assertEqual(event.title, data['title'])
        self.assertEqual(event.created_by, self.user)
        # two options created
        self.assertEqual(event.options.count(), 2)


class ParticipantPreferenceSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='owner2', password='pass3')
        now = timezone.now()
        self.event = Event.objects.create(
            title='Pref Event',
            description='Collect preferences',
            event_type=Event.EventType.TIMESLOT,
            created_by=self.user,
            deadline=now + timezone.timedelta(days=3),
        )
        # one option to vote on
        self.option = EventOption.objects.create(
            event=self.event,
            start=now,
            end=now + timezone.timedelta(hours=2),
            order=0
        )

    def test_participant_preference_create(self):
        """
        Ensure ParticipantPreferenceSerializer creates Participant + Availability rows.
        """
        data = {
            'name': 'Charlie',
            'email': 'charlie@example.com',
            'availabilities': [
                {'option': str(self.option.id), 'status': Availability.Status.AVAILABLE}
            ]
        }
        serializer = ParticipantPreferenceSerializer(data=data, context={'event': self.event})
        self.assertTrue(serializer.is_valid(), serializer.errors)

        participant = serializer.save()
        # did it attach to the event?
        self.assertEqual(participant.event, self.event)
        self.assertEqual(participant.name, 'Charlie')
        self.assertEqual(participant.email, 'charlie@example.com')

        # check that one Availability record was created
        avails = Availability.objects.filter(participant=participant)
        self.assertEqual(avails.count(), 1)
        self.assertEqual(avails.first().option, self.option)
        self.assertEqual(avails.first().status, Availability.Status.AVAILABLE)


#
# 3) API / VIEW TESTS
#
class EventAPITest(APITestCase):
    def setUp(self):
        # create & authenticate a user
        self.user = User.objects.create_user(username='apiuser', password='apipass')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.base_url = '/api/events/'

    def test_list_and_create_event(self):
        """
        POST an Event with nested options, then GET a list to confirm it shows up.
        """
        now = timezone.now()
        payload = {
            'title': 'My API Event',
            'description': 'testing POST',
            'event_type': Event.EventType.TIMESLOT,
            'deadline': (now + timezone.timedelta(days=1)).isoformat(),
            'options': [
                {'start': now.isoformat(), 'end': (now + timezone.timedelta(hours=1)).isoformat()},
                {'start': (now + timezone.timedelta(days=1)).isoformat(),
                 'end': (now + timezone.timedelta(days=1, hours=1)).isoformat()},
            ],
        }

        # CREATE
        resp = self.client.post(self.base_url, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Event.objects.count(), 1)
        ev = Event.objects.first()
        self.assertEqual(ev.title, payload['title'])
        self.assertEqual(ev.options.count(), 2)

        # LIST
        resp = self.client.get(self.base_url, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)

    def test_retrieve_update_delete_event(self):
        """
        Test GET / PUT (patch) / DELETE on /api/events/{pk}/
        """
        now = timezone.now()
        event = Event.objects.create(
            title='DetailEvent',
            description='desc',
            event_type=Event.EventType.TIMESLOT,
            created_by=self.user,
            deadline=now + timezone.timedelta(days=1),
        )
        EventOption.objects.create(event=event,
                                   start=now,
                                   end=now + timezone.timedelta(hours=2),
                                   order=0)

        url = f"{self.base_url}{event.id}/"

        # RETRIEVE
        resp = self.client.get(url, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['title'], 'DetailEvent')

        # PARTIAL UPDATE
        resp = self.client.patch(url, {'description': 'newdesc'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        event.refresh_from_db()
        self.assertEqual(event.description, 'newdesc')

        # DELETE
        resp = self.client.delete(url, format='json')
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Event.objects.filter(pk=event.id).exists())

    def test_preference_submit_and_best_match(self):
        """
        POST two participants' preferences, then GET best_match.
        """
        now = timezone.now()
        event = Event.objects.create(
            title='PrefAPI',
            description='pref desc',
            event_type=Event.EventType.TIMESLOT,
            created_by=self.user,
            deadline=now + timezone.timedelta(days=1),
        )
        opt1 = EventOption.objects.create(
            event=event,
            start=now,
            end=now + timezone.timedelta(hours=1),
            order=0
        )
        opt2 = EventOption.objects.create(
            event=event,
            start=now + timezone.timedelta(days=1),
            end=now + timezone.timedelta(days=1, hours=1),
            order=1
        )

        pref_url = f"{self.base_url}{event.id}/preferences/"

        # Alice votes
        alice = {
            'name': 'Alice',
            'email': 'alice@test.com',
            'availabilities': [
                {'option': opt1.id, 'status': Availability.Status.AVAILABLE},
                {'option': opt2.id, 'status': Availability.Status.UNAVAILABLE},
            ]
        }
        r1 = self.client.post(pref_url, alice, format='json')
        self.assertEqual(r1.status_code, status.HTTP_201_CREATED)

        # Bob votes
        bob = {
            'name': 'Bob',
            'email': 'bob@test.com',
            'availabilities': [
                {'option': opt1.id, 'status': Availability.Status.AVAILABLE},
                {'option': opt2.id, 'status': Availability.Status.MAYBE},
            ]
        }
        r2 = self.client.post(pref_url, bob, format='json')
        self.assertEqual(r2.status_code, status.HTTP_201_CREATED)

        # Now GET best_match
        best_url = f"{self.base_url}{event.id}/best_match/"
        r3 = self.client.get(best_url, format='json')
        self.assertEqual(r3.status_code, status.HTTP_200_OK)
        # opt1 should be best (2 AVAILABLE vs. opt2's 1 AVAILABLE)
        self.assertEqual(r3.data['id'], str(opt1.id))

class EventSerializerValidationTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='owner3', password='pass4')

    def test_deadline_cannot_be_past(self):
        past = timezone.now() - timezone.timedelta(days=1)
        payload = {
            'title': 'Past Deadline Event',
            'description': 'Should fail',
            'event_type': Event.EventType.TIMESLOT,
            'deadline': past.isoformat(),
            'options': [
                {'start': past.isoformat(), 'end': (past + timezone.timedelta(hours=1)).isoformat()}
            ],
        }
        serializer = EventSerializer(data=payload, context={'request': SimpleNamespace(user=self.user)})
        self.assertFalse(serializer.is_valid())
        self.assertIn('deadline', serializer.errors)

    def test_option_end_must_be_after_start(self):
        now = timezone.now()
        payload = {
            'title': 'Bad slot event',
            'description': 'End before start',
            'event_type': Event.EventType.TIMESLOT,
            'deadline': (now + timezone.timedelta(days=1)).isoformat(),
            'options': [
                {'start': now.isoformat(), 'end': (now - timezone.timedelta(hours=1)).isoformat()},
            ],
        }
        serializer = EventSerializer(data=payload, context={'request': SimpleNamespace(user=self.user)})
        self.assertFalse(serializer.is_valid())
        # Option serializer might not catch it automatically unless you add a validator.
        # We can assert the serializer errors include options.*.end or call custom validator.


class ParticipantPreferenceEdgeCases(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='owner4', password='pass5')
        self.event = Event.objects.create(
            title='Participants Test',
            description='Edge cases',
            event_type=Event.EventType.TIMESLOT,
            created_by=self.user,
            deadline=timezone.now() + timezone.timedelta(days=2),
        )
        now = timezone.now()
        self.option = EventOption.objects.create(
            event=self.event,
            start=now,
            end=now + timezone.timedelta(hours=1),
            order=0
        )

    def test_missing_availabilities(self):
        data = {
            'name': 'Derek',
            'email': 'derek@example.com',
            'availabilities': []
        }
        serializer = ParticipantPreferenceSerializer(data=data, context={'event': self.event})
        self.assertFalse(serializer.is_valid())
        self.assertIn('availabilities', serializer.errors)

    def test_duplicate_email_for_event(self):
        Participant.objects.create(event=self.event, name='Jane', email='jane@example.com')
        data = {
            'name': 'Jane Duplicate',
            'email': 'jane@example.com',
            'availabilities': [
                {'option': self.option, 'status': Availability.Status.AVAILABLE}
            ]
        }
        serializer = ParticipantPreferenceSerializer(data=data, context={'event': self.event})
        self.assertFalse(serializer.is_valid())
        # Check if the uniqueness constraint raises on save
        with self.assertRaises(Exception):
            serializer.save()


class EventAPIPermissionEdgeCases(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username='owner_api', password='pass6')
        self.other = User.objects.create_user(username='other', password='pass7')
        now = timezone.now()
        self.event = Event.objects.create(
            title='Owner Event',
            description='Owned event',
            event_type=Event.EventType.TIMESLOT,
            created_by=self.owner,
            deadline=now + timezone.timedelta(days=1),
        )
        self.client = APIClient()

    def test_other_user_cannot_delete_event(self):
        self.client.force_authenticate(user=self.other)
        url = f"/api/events/{self.event.id}/"
        resp = self.client.delete(url)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Event.objects.filter(id=self.event.id).exists())


class BestMatchEdgeCases(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='owner5', password='pass8')
        self.event = Event.objects.create(
            title='Best Match Tests',
            description='Edge cases',
            event_type=Event.EventType.TIMESLOT,
            created_by=self.user,
            deadline=timezone.now() + timezone.timedelta(days=1),
        )
        now = timezone.now()
        self.opt1 = EventOption.objects.create(
            event=self.event,
            start=now,
            end=now + timezone.timedelta(hours=1),
            order=0
        )
        self.opt2 = EventOption.objects.create(
            event=self.event,
            start=now + timezone.timedelta(days=1),
            end=now + timezone.timedelta(days=1, hours=1),
            order=1
        )

    def test_best_match_with_tie_uses_maybe(self):
        alice = Participant.objects.create(event=self.event, name='Alice', email='alice2@test.com')
        bob = Participant.objects.create(event=self.event, name='Bob', email='bob2@test.com')
        Availability.objects.create(participant=alice, option=self.opt1, status=Availability.Status.AVAILABLE)
        Availability.objects.create(participant=alice, option=self.opt2, status=Availability.Status.MAYBE)
        Availability.objects.create(participant=bob, option=self.opt1, status=Availability.Status.AVAILABLE)
        Availability.objects.create(participant=bob, option=self.opt2, status=Availability.Status.AVAILABLE)

        best = self.event.find_best_option()
        self.assertEqual(best, self.opt1)  # opt1 has 2 AVAILABLE, opt2 has 1 AVAILABLE + 1 MAYBE

    def test_best_match_with_no_options(self):
        empty_event = Event.objects.create(
            title='Empty Event',
            description='No options yet',
            event_type=Event.EventType.DURATION,
            created_by=self.user,
        )
        self.assertIsNone(empty_event.find_best_option())
