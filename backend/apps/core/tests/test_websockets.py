from django.test import TestCase
from channels.testing import WebsocketCommunicator
from backend.asgi import application

class WebSocketTestCase(TestCase):
    async def test_dashboard_websocket(self):
        # Test connecting to the dashboard websocket endpoint
        communicator = WebsocketCommunicator(application, "ws/dashboard/")
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)
        await communicator.disconnect()
