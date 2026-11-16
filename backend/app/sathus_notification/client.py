import httpx
from typing import Dict, Any, Optional, List

class SathusNotificationClient:
    """Official Python Client for Sathus Notification Platform."""

    def __init__(self, api_key: str, base_url: str = "http://localhost:8000"):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.headers = {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json"
        }

    def send(
        self,
        channel: str,
        template_code: Optional[str] = None,
        recipient_phone: Optional[str] = None,
        recipient_email: Optional[str] = None,
        recipient_name: Optional[str] = None,
        variables: Optional[Dict[str, Any]] = None,
        custom_body: Optional[str] = None,
        custom_subject: Optional[str] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
        idempotency_key: Optional[str] = None,
        fallback_channel: Optional[str] = None,
        timeout: float = 10.0
    ) -> Dict[str, Any]:
        """Submits a synchronous notification request to the platform."""
        url = f"{self.base_url}/api/v1/notifications/send"
        payload = {
            "channel": channel,
            "template_code": template_code,
            "recipient": {
                "phone": recipient_phone,
                "email": recipient_email,
                "name": recipient_name
            },
            "variables": variables or {},
            "custom_body": custom_body,
            "custom_subject": custom_subject,
            "attachments": attachments or [],
            "idempotency_key": idempotency_key,
            "fallback_channel": fallback_channel
        }

        with httpx.Client(timeout=timeout) as client:
            resp = client.post(url, json=payload, headers=self.headers)
            resp.raise_for_status()
            return resp.json()

    async def send_async(
        self,
        channel: str,
        template_code: Optional[str] = None,
        recipient_phone: Optional[str] = None,
        recipient_email: Optional[str] = None,
        recipient_name: Optional[str] = None,
        variables: Optional[Dict[str, Any]] = None,
        custom_body: Optional[str] = None,
        custom_subject: Optional[str] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
        idempotency_key: Optional[str] = None,
        fallback_channel: Optional[str] = None,
        timeout: float = 10.0
    ) -> Dict[str, Any]:
        """Submits an asynchronous notification request to the platform."""
        url = f"{self.base_url}/api/v1/notifications/send"
        payload = {
            "channel": channel,
            "template_code": template_code,
            "recipient": {
                "phone": recipient_phone,
                "email": recipient_email,
                "name": recipient_name
            },
            "variables": variables or {},
            "custom_body": custom_body,
            "custom_subject": custom_subject,
            "attachments": attachments or [],
            "idempotency_key": idempotency_key,
            "fallback_channel": fallback_channel
        }

        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(url, json=payload, headers=self.headers)
            resp.raise_for_status()
            return resp.json()

    def send_event(
        self,
        event_type: str,
        recipient_email: Optional[str] = None,
        recipient_phone: Optional[str] = None,
        recipient_name: Optional[str] = None,
        event_category: str = "FINANCIAL",
        channel: Optional[str] = None,
        title: Optional[str] = None,
        message: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
        idempotency_key: Optional[str] = None,
        fallback_channel: Optional[str] = None,
        timeout: float = 10.0
    ) -> Dict[str, Any]:
        """Publishes a business event synchronously to the platform."""
        url = f"{self.base_url}/api/v1/notifications/events"
        payload = {
            "event_type": event_type,
            "event_category": event_category,
            "channel": channel,
            "recipient": {
                "email": recipient_email,
                "phone": recipient_phone,
                "name": recipient_name
            },
            "title": title,
            "message": message,
            "data": data or {},
            "attachments": attachments or [],
            "idempotency_key": idempotency_key,
            "fallback_channel": fallback_channel
        }

        with httpx.Client(timeout=timeout) as client:
            resp = client.post(url, json=payload, headers=self.headers)
            resp.raise_for_status()
            return resp.json()

    async def send_event_async(
        self,
        event_type: str,
        recipient_email: Optional[str] = None,
        recipient_phone: Optional[str] = None,
        recipient_name: Optional[str] = None,
        event_category: str = "FINANCIAL",
        channel: Optional[str] = None,
        title: Optional[str] = None,
        message: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
        idempotency_key: Optional[str] = None,
        fallback_channel: Optional[str] = None,
        timeout: float = 10.0
    ) -> Dict[str, Any]:
        """Publishes a business event asynchronously to the platform."""
        url = f"{self.base_url}/api/v1/notifications/events"
        payload = {
            "event_type": event_type,
            "event_category": event_category,
            "channel": channel,
            "recipient": {
                "email": recipient_email,
                "phone": recipient_phone,
                "name": recipient_name
            },
            "title": title,
            "message": message,
            "data": data or {},
            "attachments": attachments or [],
            "idempotency_key": idempotency_key,
            "fallback_channel": fallback_channel
        }

        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(url, json=payload, headers=self.headers)
            resp.raise_for_status()
            return resp.json()

    def get_status(self, notification_id: str) -> Dict[str, Any]:
        """Queries delivery status for a specific notification."""
        url = f"{self.base_url}/api/v1/notifications/{notification_id}/status"
        with httpx.Client() as client:
            resp = client.get(url, headers=self.headers)
            resp.raise_for_status()
            return resp.json()

    async def get_status_async(self, notification_id: str) -> Dict[str, Any]:
        """Queries delivery status for a specific notification asynchronously."""
        url = f"{self.base_url}/api/v1/notifications/{notification_id}/status"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=self.headers)
            resp.raise_for_status()
            return resp.json()
