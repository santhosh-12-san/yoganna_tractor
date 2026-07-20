import os
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

try:
    from twilio.rest import Client
    TWILIO_AVAILABLE = True
except ImportError:
    Client = None
    TWILIO_AVAILABLE = False

def send_notification(phone_number, message, mode='sms'):
    """
    Sends a notification via Twilio (SMS or WhatsApp).
    If credentials are missing, falls back to logging the message to a file.
    """
    account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', '')
    auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', '')
    from_sms = getattr(settings, 'TWILIO_FROM_SMS', '')
    from_whatsapp = getattr(settings, 'TWILIO_FROM_WHATSAPP', '')

    # Standardize phone number format for international deliveries (needs +91 for India)
    formatted_phone = phone_number
    if not formatted_phone.startswith('+'):
        if len(formatted_phone) == 10:
            formatted_phone = f"+91{formatted_phone}"
        else:
            formatted_phone = f"+{formatted_phone}"

    if TWILIO_AVAILABLE and account_sid and auth_token:
        try:
            client = Client(account_sid, auth_token)
            if mode == 'whatsapp':
                client.messages.create(
                    body=message,
                    from_=f"whatsapp:{from_whatsapp}",
                    to=f"whatsapp:{formatted_phone}"
                )
                logger.info(f"WhatsApp sent successfully to {formatted_phone}")
            else:
                client.messages.create(
                    body=message,
                    from_=from_sms,
                    to=formatted_phone
                )
                logger.info(f"SMS sent successfully to {formatted_phone}")
            return True
        except Exception as e:
            logger.error(f"Failed to send notification via Twilio: {str(e)}")
            # Fall back to logging
    
    # Mock fallback logging
    log_msg = f"=== [NOTIFICATION OVER-{mode.upper()}] ===\nTo: {formatted_phone}\nMessage: {message}\n====================================\n"
    print(log_msg)
    
    # Save to a log file for local review
    log_file_path = os.path.join(settings.BASE_DIR, 'notifications.log')
    try:
        with open(log_file_path, 'a', encoding='utf-8') as f:
            f.write(log_msg)
    except Exception as e:
        logger.error(f"Failed to write notification to log file: {str(e)}")
        
    return False
