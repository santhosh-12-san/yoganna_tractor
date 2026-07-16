from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

class DashboardConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add(
            "dashboard_updates",
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            "dashboard_updates",
            self.channel_name
        )

    async def dashboard_update(self, event):
        await self.send_json(event["content"])


def broadcast_dashboard_update(message_type="DATA_UPDATED", data=None):
    """
    Helper function to broadcast dashboard updates to all connected clients.
    """
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            "dashboard_updates",
            {
                "type": "dashboard_update",
                "content": {
                    "type": message_type,
                    "data": data or {}
                }
            }
        )
